"use server";

import { revalidatePath } from "next/cache";
import { activeViewer, BANNED_MESSAGE } from "@/lib/data";
import { maskAccount, namesMatch } from "@/lib/bank";
import { createRecipient, listBanks, paystackReady, resolveAccount } from "@/lib/paystack";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { FormState } from "@/lib/safe-next";

/** Saves where a seller gets paid, after checking the account with Paystack and matching the name. */
export async function savePayoutAccount(_: FormState, form: FormData): Promise<FormState> {
  const { viewer, error } = await activeViewer();
  if (error) return { error: error === "banned" ? BANNED_MESSAGE : "Please sign in again." };
  const fields = { bank: String(form.get("bank") ?? ""), account: String(form.get("account") ?? "") };
  const account = fields.account.replace(/\D/g, "");
  const password = String(form.get("password") ?? "");

  if (!paystackReady()) return { error: "Bank details can't be checked right now. Please try again later.", fields };
  if (!/^\d{10}$/.test(account)) return { error: "Account numbers are 10 digits (your NUBAN).", fields };
  const banks = await listBanks();
  const bank = banks.find((b) => b.code === fields.bank);
  if (!bank) return { error: "Choose your bank from the list.", fields };

  // Changing where money goes is sensitive, so confirm it's really you.
  if (!viewer.email) return { error: "Please sign in again.", fields };
  const supabase = await createClient();
  const check = await supabase.auth.signInWithPassword({ email: viewer.email, password });
  if (check.error) return { error: "Your password isn't right.", fields };

  let accountName: string;
  try {
    accountName = (await resolveAccount(account, bank.code)).account_name;
  } catch {
    return { error: `We couldn't find that account at ${bank.name}. Check the number and bank, and try again.`, fields };
  }
  if (!namesMatch(viewer.profile.full_name, accountName)) {
    return {
      error: `This account is in the name "${accountName}", which doesn't match your profile name "${viewer.profile.full_name}". Use an account in your own name, or update your full name in Settings to match your bank.`,
      fields,
    };
  }

  let recipient: string | null = null;
  try {
    recipient = (await createRecipient(accountName, account, bank.code)).recipient_code;
  } catch (e) {
    console.error("paystack recipient", e); // payouts can still be sent by hand
  }

  const admin = createAdminClient();
  const { error: saveError } = await admin.from("payout_accounts").upsert({
    user_id: viewer.userId,
    bank_code: bank.code,
    bank_name: bank.name,
    account_number: account,
    account_name: accountName,
    paystack_recipient_code: recipient,
    verified_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });
  if (saveError) return { error: "We couldn't save your bank details. Please try again.", fields };
  await admin.from("profiles").update({ verified_bank: true }).eq("id", viewer.userId);

  revalidatePath("/", "layout");
  return { ok: `Saved. You'll be paid into ${bank.name} ${maskAccount(account)} (${accountName}).` };
}
