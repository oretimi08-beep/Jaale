"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { orderAction } from "@/app/actions/orders";
import type { OrderStatus } from "@/lib/orders";
import { toast } from "./Toaster";

const REASONS = ["Not as described", "Damaged", "Doesn't work", "Not received", "Wrong item", "Other"];

export function OrderActions({
  orderId,
  status,
  role,
  pickup,
}: {
  orderId: string;
  status: OrderStatus;
  role: "buyer" | "seller";
  pickup: boolean;
}) {
  const [pending, start] = useTransition();
  const [reporting, setReporting] = useState(false);
  const [reason, setReason] = useState(REASONS[0]);
  const [details, setDetails] = useState("");
  const router = useRouter();

  function run(action: Parameters<typeof orderAction>[1], done: string, extra?: { reason?: string; details?: string }) {
    start(async () => {
      const res = await orderAction(orderId, action, extra);
      toast(res.error ?? done);
      if (!res.error) {
        setReporting(false);
        router.refresh();
      }
    });
  }

  if (role === "seller") {
    if (status === "paid_held")
      return (
        <div style={{ display: "grid", gap: 10 }}>
          <button className="btn block" disabled={pending} onClick={() => run("ship", pickup ? "Buyer told it's ready." : "Marked as sent.")}>
            {pickup ? "It's ready for collection" : "I've sent it"}
          </button>
          <button
            className="btn danger"
            disabled={pending}
            onClick={() => window.confirm("Cancel this order? The buyer gets a full refund and your item goes back on sale.") && run("cancel", "Order cancelled. The buyer is being refunded.")}
          >
            I can&apos;t sell it after all
          </button>
        </div>
      );
    if (status === "shipped")
      return (
        <button className="btn block" disabled={pending} onClick={() => run("deliver", "Marked as delivered. The buyer has 2 days to check it.")}>
          {pickup ? "Buyer has collected it" : "It's been delivered"}
        </button>
      );
    return null;
  }

  if (status === "shipped" || status === "delivered") {
    if (reporting)
      return (
        <div className="lines" style={{ gap: 12 }}>
          <b>What&apos;s wrong?</b>
          <div className="tags">
            {REASONS.map((r) => (
              <button key={r} type="button" className="tag tg" aria-pressed={reason === r} onClick={() => setReason(r)}
                style={reason === r ? { background: "var(--primary)", color: "var(--on-primary)", borderColor: "var(--primary)" } : undefined}>
                {r}
              </button>
            ))}
          </div>
          <label className="f">
            Tell us more <span className="hint">Optional. Photos can be sent to our team when they contact you.</span>
            <textarea rows={3} maxLength={1000} value={details} onChange={(e) => setDetails(e.target.value)} />
          </label>
          <div className="two">
            <button className="btn ghost" type="button" onClick={() => setReporting(false)}>Back</button>
            <button className="btn danger" disabled={pending} onClick={() => run("report", "Payout frozen. Our team will reply within 48 hours.", { reason, details })}>
              Report problem
            </button>
          </div>
        </div>
      );
    return (
      <div className="two">
        <button className="btn ghost" disabled={pending} onClick={() => setReporting(true)}>Report a problem</button>
        <button
          className="btn"
          disabled={pending}
          onClick={() => window.confirm("Confirm the item arrived and is as described? The seller will be paid.") && run("confirm", "Thanks! The seller has been paid.")}
        >
          Item received, all good
        </button>
      </div>
    );
  }
  if (status === "pending_payment")
    return (
      <button className="btn ghost block" disabled={pending} onClick={() => run("cancel", "Order cancelled.")}>
        Cancel this unpaid order
      </button>
    );
  return null;
}
