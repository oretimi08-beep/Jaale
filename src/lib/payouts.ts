// Rules for paying sellers. Kept free of database code so they can be tested on their own.

export type PayoutStatus = "pending" | "processing" | "paid" | "failed";

export const MAX_PAYOUT_ATTEMPTS = 5;

/**
 * Each attempt gets its own reference. Paystack refuses a reference it has seen before,
 * so the same attempt can never pay a seller twice.
 */
export function transferReference(payoutId: string, attempt: number): string {
  return `jaale-payout-${payoutId.replace(/-/g, "").slice(0, 24)}-${attempt}`;
}

/** Whether we should try sending this payout now. */
export function canAttempt(p: { status: PayoutStatus; attempts: number }): boolean {
  return (p.status === "pending" || p.status === "failed") && p.attempts < MAX_PAYOUT_ATTEMPTS;
}

/** Turns Paystack's error into a plain explanation for the admin page. */
export function explainTransferError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("starter business"))
    return "Paystack only allows automatic payouts for registered businesses. Upgrade your Paystack account, or pay by hand.";
  if (m.includes("balance") && (m.includes("not enough") || m.includes("insufficient")))
    return "Your Paystack balance is too low to send this payout. It will be retried.";
  if (m.includes("otp")) return "Paystack is asking for an OTP. Turn off OTP for transfers in Paystack's settings.";
  if (m.includes("recipient") || m.includes("account")) return `Paystack couldn't use the seller's bank account: ${message}`;
  return message;
}

/** Maps a Paystack transfer status to ours. */
export function fromTransferStatus(status: string): PayoutStatus {
  if (status === "success") return "paid";
  if (status === "failed" || status === "reversed" || status === "abandoned" || status === "rejected") return "failed";
  return "processing"; // pending, received, otp, queued…
}
