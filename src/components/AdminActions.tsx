"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { adminMarkPayoutPaid, adminRemoveListing, adminResolveDispute, adminSendPayout, adminSetBan } from "@/app/actions/admin";
import { toast } from "./Toaster";
import { BRAND } from "@/lib/config";

function useRun() {
  const [pending, start] = useTransition();
  const router = useRouter();
  const run = (fn: () => Promise<{ ok?: boolean; error?: string }>, done: string) =>
    start(async () => {
      const res = await fn();
      toast(res.error ?? done);
      router.refresh();
    });
  return { pending, run };
}

export function DisputeDecision({ orderId, refundLabel, releaseLabel }: { orderId: string; refundLabel: string; releaseLabel: string }) {
  const { pending, run } = useRun();
  const [note, setNote] = useState("");
  return (
    <div style={{ display: "grid", gap: 8 }}>
      <input className="search" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note for the record (what you decided and why)" />
      <div className="two">
        <button className="btn danger sm" disabled={pending} onClick={() => confirm(`${refundLabel}?`) && run(() => adminResolveDispute(orderId, "refund", note), "Buyer is being refunded.")}>
          {refundLabel}
        </button>
        <button className="btn sm" disabled={pending} onClick={() => confirm(`${releaseLabel}?`) && run(() => adminResolveDispute(orderId, "release", note), "Released to the seller.")}>
          {releaseLabel}
        </button>
      </div>
    </div>
  );
}

export function PayoutPaidButton({ payoutId }: { payoutId: string }) {
  const { pending, run } = useRun();
  return (
    <button className="btn ghost sm" disabled={pending} onClick={() => confirm("Mark this payout as paid by hand? Only do this after you've sent the money yourself.") && run(() => adminMarkPayoutPaid(payoutId), "Marked as paid.")}>
      Mark paid by hand
    </button>
  );
}

export function SendPayoutButton({ payoutId }: { payoutId: string }) {
  const { pending, run } = useRun();
  return (
    <button className="btn sm" disabled={pending} onClick={() => run(() => adminSendPayout(payoutId), "Sent to Paystack.")}>
      {pending ? "Sending…" : "Send now"}
    </button>
  );
}

export function BanButton({ profileId, banned, name }: { profileId: string; banned: boolean; name: string }) {
  const { pending, run } = useRun();
  return banned ? (
    <button className="btn ghost sm" disabled={pending} onClick={() => run(() => adminSetBan(profileId, false, ""), `${name} can use ${BRAND.name} again.`)}>
      Unsuspend
    </button>
  ) : (
    <button
      className="btn danger sm"
      disabled={pending}
      onClick={() => {
        const reason = prompt(`Suspend ${name}? Their items come off sale. Reason (shown to our team only):`);
        if (reason !== null) run(() => adminSetBan(profileId, true, reason), `${name} is suspended.`);
      }}
    >
      Suspend
    </button>
  );
}

export function RemoveListingButton({ listingId }: { listingId: string }) {
  const { pending, run } = useRun();
  return (
    <button className="btn danger sm" disabled={pending} onClick={() => confirm("Take this listing down?") && run(() => adminRemoveListing(listingId), "Listing taken down.")}>
      Take down
    </button>
  );
}
