// Review rules shared by the rating screen and the server.
export const BLIND_DAYS = 7;
export const SELLER_TAGS = ["As described", "Fast delivery", "Well packed", "Friendly", "Good value"];
export const BUYER_TAGS = ["Paid quickly", "Friendly", "Good communication", "Easy collection"];

export function starText(stars: number) {
  return "★".repeat(stars) + "☆".repeat(5 - stars);
}
