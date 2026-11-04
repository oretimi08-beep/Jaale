import { describe, expect, it } from "vitest";
import { canAttempt, explainTransferError, fromTransferStatus, MAX_PAYOUT_ATTEMPTS, transferReference } from "./payouts";

const id = "b164cec4-34ea-4520-8693-406762da63c6";

describe("payout references", () => {
  it("is different for every attempt, so one attempt can't pay twice", () => {
    expect(transferReference(id, 1)).not.toBe(transferReference(id, 2));
    expect(transferReference(id, 1)).toBe(transferReference(id, 1));
  });
  it("fits Paystack's rules (lowercase letters, numbers and dashes, 16–50 characters)", () => {
    const ref = transferReference(id, 5);
    expect(ref).toMatch(/^[a-z0-9-]{16,50}$/);
  });
});

describe("when to send", () => {
  it("sends new and failed payouts", () => {
    expect(canAttempt({ status: "pending", attempts: 0 })).toBe(true);
    expect(canAttempt({ status: "failed", attempts: 2 })).toBe(true);
  });
  it("never resends money that is on its way or already paid", () => {
    expect(canAttempt({ status: "processing", attempts: 1 })).toBe(false);
    expect(canAttempt({ status: "paid", attempts: 1 })).toBe(false);
  });
  it("stops after too many tries so a person can look", () => {
    expect(canAttempt({ status: "failed", attempts: MAX_PAYOUT_ATTEMPTS })).toBe(false);
  });
});

describe("Paystack transfer results", () => {
  it.each([
    ["success", "paid"],
    ["failed", "failed"],
    ["reversed", "failed"],
    ["pending", "processing"],
    ["otp", "processing"],
  ])("%s → %s", (paystack, ours) => expect(fromTransferStatus(paystack)).toBe(ours));

  it("explains the starter-business block in plain words", () => {
    expect(explainTransferError("You cannot initiate third party payouts as a starter business")).toMatch(/registered business/);
  });
});
