import { FEES } from "./config";

/** Turn kobo into a display string like ₦12,500. */
export function naira(kobo: number): string {
  return "₦" + Math.round(kobo / 100).toLocaleString("en-NG");
}

/** Buyer protection fee in kobo, rounded to the nearest naira. */
export function protectionFee(itemKobo: number): number {
  const raw = FEES.protectionFlatKobo + (itemKobo * FEES.protectionPercent) / 100;
  return Math.round(raw / 100) * 100;
}

export function totalWithProtection(itemKobo: number): number {
  return itemKobo + protectionFee(itemKobo);
}

/** Percentage off, e.g. 42 for 42% off. 0 when there is no old price. */
export function discountPercent(priceKobo: number, wasKobo: number | null): number {
  if (!wasKobo || wasKobo <= priceKobo) return 0;
  return Math.round((1 - priceKobo / wasKobo) * 100);
}

/** Read a naira amount typed by a person ("15,000") into kobo. */
export function nairaInputToKobo(value: string): number {
  const n = Number(String(value).replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
}
