import "server-only";
import { createAdminClient } from "./supabase/admin";
import { naira } from "./money";
import { canAttempt, explainTransferError, fromTransferStatus, transferReference, type PayoutStatus } from "./payouts";
import { createRecipient, initiateTransfer, paystackReady, verifyTransfer } from "./paystack";
import { orderNote } from "./notifications";
import { notify } from "./push";

// Sends sellers their money through Paystack Transfers.
// Every change is conditional on the payout still being in the state we read, so two
// runs at once (a page view and the daily job, say) can never send the same payout twice.

type PayoutRow = {
  id: string;
  order_id: string;
  seller_id: string;
  amount_kobo: number;
  status: PayoutStatus;
  attempts: number;
  transfer_reference: string | null;
  last_error: string | null;
};

const db = () => createAdminClient();

async function note(id: string, changes: Partial<PayoutRow> & Record<string, unknown>, whenStatus?: PayoutStatus) {
  let q = db().from("payouts").update(changes).eq("id", id);
  if (whenStatus) q = q.eq("status", whenStatus);
  return q.select("id");
}

/** Marks a payout paid (only once) and tells the seller. */
async function setPaid(column: "id" | "transfer_reference", value: string, paidBy: "paystack" | "manual" = "paystack") {
  const { data } = await db()
    .from("payouts")
    .update({ status: "paid", paid_at: new Date().toISOString(), paid_by: paidBy, last_error: null })
    .eq(column, value)
    .neq("status", "paid")
    .select("id");
  await announcePaid((data ?? []).map((r) => r.id as string));
  return !!data?.length;
}

/** Lets each seller know their money reached the bank. */
export async function announcePaid(payoutIds: string[]) {
  for (const id of payoutIds) {
    const { data } = await db().from("payouts").select("seller_id, amount_kobo, order_id, orders(listing_title)").eq("id", id).maybeSingle();
    if (!data) continue;
    const order = data.orders as unknown as { listing_title: string } | null;
    notify(data.seller_id as string, orderNote("paid_out", { item: order?.listing_title ?? "your item", kobo: data.amount_kobo as number, orderId: data.order_id as string }));
  }
}

/** If an earlier attempt reached Paystack, find out how it ended before sending again. */
async function syncLastAttempt(p: PayoutRow): Promise<"paid" | "processing" | "retry"> {
  if (!p.transfer_reference) return "retry";
  try {
    const t = await verifyTransfer(p.transfer_reference);
    const status = fromTransferStatus(t.status);
    if (status === "paid") {
      await setPaid("id", p.id);
      return "paid";
    }
    if (status === "processing") {
      await note(p.id, { status: "processing" });
      return "processing";
    }
    return "retry";
  } catch {
    return "retry"; // Paystack has no record of it, so it was never sent
  }
}

/** Tries to send one payout now. Safe to call as often as you like. Returns a short result for the admin page. */
export async function sendPayout(payoutId: string): Promise<{ status: PayoutStatus; message?: string }> {
  const { data } = await db().from("payouts").select("*").eq("id", payoutId).maybeSingle();
  const p = data as PayoutRow | null;
  if (!p) return { status: "failed", message: "Payout not found." };
  if (!canAttempt(p)) return { status: p.status, message: p.status === "failed" ? "Too many failed tries. Pay this one by hand." : undefined };
  if (!paystackReady()) return { status: p.status, message: "Payments aren't set up." };

  const last = await syncLastAttempt(p);
  if (last !== "retry") return { status: last === "paid" ? "paid" : "processing" };

  // Where to send it.
  const { data: account } = await db().from("payout_accounts").select("*").eq("user_id", p.seller_id).maybeSingle();
  if (!account) {
    await note(p.id, { last_error: "The seller hasn't added a bank account yet. It will send once they do." });
    return { status: p.status, message: "Waiting for the seller's bank details." };
  }
  let recipient = account.paystack_recipient_code as string | null;
  if (!recipient) {
    try {
      recipient = (await createRecipient(account.account_name, account.account_number, account.bank_code)).recipient_code;
      await db().from("payout_accounts").update({ paystack_recipient_code: recipient }).eq("user_id", p.seller_id);
    } catch (e) {
      const msg = explainTransferError(e instanceof Error ? e.message : String(e));
      await note(p.id, { last_error: msg });
      return { status: p.status, message: msg };
    }
  }

  // Claim this attempt, so nothing else sends it at the same time.
  const attempt = p.attempts + 1;
  const reference = transferReference(p.id, attempt);
  const { data: claimed } = await note(
    p.id,
    { status: "processing", attempts: attempt, transfer_reference: reference, sent_at: new Date().toISOString(), last_error: null },
    p.status,
  );
  if (!claimed?.length) return { status: "processing" };

  const { data: order } = await db().from("orders").select("number, listing_title").eq("id", p.order_id).maybeSingle();
  try {
    const t = await initiateTransfer({
      amountKobo: p.amount_kobo,
      recipient,
      reference,
      reason: `Jaale order #${order?.number ?? ""}: ${order?.listing_title ?? "item"}`.slice(0, 100),
    });
    const status = fromTransferStatus(t.status);
    if (status === "paid") await setPaid("id", p.id);
    else if (status === "failed") await note(p.id, { status: "failed", last_error: `Paystack: ${t.status}` });
    else if (t.status === "otp") await note(p.id, { last_error: explainTransferError("otp") });
    return { status, message: status === "processing" ? `${naira(p.amount_kobo)} sent to Paystack.` : undefined };
  } catch (e) {
    // Paystack refused it, so no money left. Put it back in the queue with the reason.
    const msg = explainTransferError(e instanceof Error ? e.message : String(e));
    await note(p.id, { status: "pending", last_error: msg });
    return { status: "pending", message: msg };
  }
}

/** Sends everything waiting, and checks on anything sent more than an hour ago. For the daily job. */
export async function sendDuePayouts(sellerId?: string): Promise<{ tried: number; paid: number }> {
  let q = db().from("payouts").select("id, status, sent_at").in("status", ["pending", "failed", "processing"]).limit(100);
  if (sellerId) q = q.eq("seller_id", sellerId);
  const { data } = await q;
  const hourAgo = Date.now() - 3600_000;
  let tried = 0;
  let paid = 0;
  for (const p of data ?? []) {
    if (p.status === "processing") {
      if (!p.sent_at || new Date(p.sent_at).getTime() > hourAgo) continue;
      const { data: full } = await db().from("payouts").select("*").eq("id", p.id).single();
      if ((await syncLastAttempt(full as PayoutRow)) === "paid") paid++;
      continue;
    }
    tried++;
    if ((await sendPayout(p.id)).status === "paid") paid++;
  }
  return { tried, paid };
}

/** Records Paystack's final word on a transfer (from the webhook). */
export async function markTransfer(reference: string, outcome: "success" | "failed" | "reversed", reason?: string) {
  const status = fromTransferStatus(outcome);
  if (status === "paid") {
    await setPaid("transfer_reference", reference);
    return;
  }
  await db()
    .from("payouts")
    .update({ status: "failed", last_error: `Paystack ${outcome} the transfer${reason ? `: ${reason}` : ""}. It will be retried.` })
    .eq("transfer_reference", reference)
    .neq("status", "paid");
}
