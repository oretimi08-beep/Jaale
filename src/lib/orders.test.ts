import { describe, expect, it } from "vitest";
import { naira, protectionFee } from "./money";
import { nextStatus, paymentMatches, quote, refundKobo, releaseTime, sellerPayoutKobo } from "./orders";

const N = (n: number) => n * 100; // naira → kobo

describe("buyer protection fee: ₦300 + 5%", () => {
  it("matches the worked examples", () => {
    expect(protectionFee(N(14_500))).toBe(N(1_025)); // 300 + 725
    expect(protectionFee(N(240_000))).toBe(N(12_300)); // 300 + 12,000
    expect(protectionFee(N(500))).toBe(N(325)); // cheapest allowed item
  });
  it("rounds to whole naira", () => {
    expect(protectionFee(N(7_510))).toBe(N(676)); // 300 + 375.5 → 676
    expect(protectionFee(N(7_510)) % 100).toBe(0);
  });
});

describe("order totals", () => {
  it("adds item, protection and delivery", () => {
    expect(quote(N(14_500), N(2_500))).toEqual({
      itemKobo: N(14_500),
      protectionKobo: N(1_025),
      deliveryKobo: N(2_500),
      totalKobo: N(18_025),
    });
    expect(naira(quote(N(14_500), N(2_500)).totalKobo)).toBe("₦18,025");
  });
  it("allows free delivery (self pickup)", () => {
    expect(quote(N(185_000), 0).totalKobo).toBe(N(185_000 + 9_550));
  });
  it("rejects nonsense amounts", () => {
    expect(() => quote(0, 0)).toThrow();
    expect(() => quote(-5, 0)).toThrow();
    expect(() => quote(100.5, 0)).toThrow();
    expect(() => quote(N(1000), -1)).toThrow();
  });
  it("seller keeps 100% of the item price", () => {
    expect(sellerPayoutKobo({ item_kobo: N(14_500) })).toBe(N(14_500));
  });
  it("a refund returns everything the buyer paid", () => {
    expect(refundKobo({ total_kobo: N(18_025) })).toBe(N(18_025));
  });
});

describe("release timing", () => {
  it("is exactly 2 days after delivery", () => {
    const delivered = new Date("2026-11-01T10:00:00Z");
    expect(releaseTime(delivered).toISOString()).toBe("2026-11-03T10:00:00.000Z");
  });
  it("auto-release waits until the 2 days are up", () => {
    const order = { status: "delivered" as const, release_at: "2026-11-03T10:00:00Z" };
    expect(nextStatus(order, "auto_release", "system", new Date("2026-11-03T09:59:59Z")).ok).toBe(false);
    expect(nextStatus(order, "auto_release", "system", new Date("2026-11-03T10:00:00Z"))).toEqual({ ok: true, status: "completed" });
  });
  it("buyer can report a problem inside the window but not after", () => {
    const order = { status: "delivered" as const, release_at: "2026-11-03T10:00:00Z" };
    expect(nextStatus(order, "report", "buyer", new Date("2026-11-02T10:00:00Z"))).toEqual({ ok: true, status: "disputed" });
    expect(nextStatus(order, "report", "buyer", new Date("2026-11-04T10:00:00Z")).ok).toBe(false);
  });
});

describe("who can do what", () => {
  const paid = { status: "paid_held" as const, release_at: null };
  const shipped = { status: "shipped" as const, release_at: null };
  it("only the seller ships and marks delivered", () => {
    expect(nextStatus(paid, "ship", "seller")).toEqual({ ok: true, status: "shipped" });
    expect(nextStatus(paid, "ship", "buyer").ok).toBe(false);
    expect(nextStatus(shipped, "deliver", "seller")).toEqual({ ok: true, status: "delivered" });
    expect(nextStatus(shipped, "deliver", "buyer").ok).toBe(false);
  });
  it("only the buyer confirms or reports", () => {
    expect(nextStatus(shipped, "confirm", "buyer")).toEqual({ ok: true, status: "completed" });
    expect(nextStatus(shipped, "confirm", "seller").ok).toBe(false);
    expect(nextStatus(shipped, "report", "seller").ok).toBe(false);
  });
  it("can't confirm before it's sent", () => {
    expect(nextStatus(paid, "confirm", "buyer").ok).toBe(false);
  });
  it("money can't be released twice", () => {
    const done = { status: "completed" as const, release_at: "2026-11-03T10:00:00Z" };
    expect(nextStatus(done, "auto_release", "system", new Date("2030-01-01")).ok).toBe(false);
    expect(nextStatus(done, "confirm", "buyer").ok).toBe(false);
  });
  it("a disputed order stays frozen until our team decides", () => {
    const disputed = { status: "disputed" as const, release_at: "2026-11-03T10:00:00Z" };
    expect(nextStatus(disputed, "auto_release", "system", new Date("2030-01-01")).ok).toBe(false);
    expect(nextStatus(disputed, "confirm", "buyer").ok).toBe(false);
  });
});

describe("refund paths", () => {
  it("seller cancelling a paid order refunds the buyer", () => {
    expect(nextStatus({ status: "paid_held", release_at: null }, "cancel", "seller")).toEqual({ ok: true, status: "refunded" });
  });
  it("buyer can abandon an unpaid order, but not cancel a paid one", () => {
    expect(nextStatus({ status: "pending_payment", release_at: null }, "cancel", "buyer")).toEqual({ ok: true, status: "cancelled" });
    expect(nextStatus({ status: "paid_held", release_at: null }, "cancel", "buyer").ok).toBe(false);
  });
  it("can't cancel once it has been sent", () => {
    expect(nextStatus({ status: "shipped", release_at: null }, "cancel", "seller").ok).toBe(false);
  });
});

describe("checking a Paystack payment", () => {
  const order = { total_kobo: N(18_025), paystack_reference: "JAALE-abc" };
  const good = { status: "success", amount: N(18_025), currency: "NGN", reference: "JAALE-abc" };
  it("accepts the exact payment", () => expect(paymentMatches(order, good)).toEqual({ ok: true }));
  it("rejects a short payment", () => expect(paymentMatches(order, { ...good, amount: N(18_000) }).ok).toBe(false));
  it("rejects a failed payment", () => expect(paymentMatches(order, { ...good, status: "failed" }).ok).toBe(false));
  it("rejects another currency", () => expect(paymentMatches(order, { ...good, currency: "USD" }).ok).toBe(false));
  it("rejects someone else's payment", () => expect(paymentMatches(order, { ...good, reference: "JAALE-xyz" }).ok).toBe(false));
});
