import { describe, expect, it } from "vitest";
import { checkMessage } from "./contact-guard";

describe("chat safety check", () => {
  it.each([
    ["Call me on 08031234567", "phone number"],
    ["my line is 0803 123 4567", "phone number"],
    ["+234 803-123-4567", "phone number"],
    ["o8o3 123 4567", "phone number"],
    ["Send to 0123456789 GTBank", "account number"],
    ["pay me directly and I'll knock off 2k", "off-app payment or contact"],
    ["transfer to my account abeg", "off-app payment or contact"],
    ["Let's talk on WhatsApp", "off-app payment or contact"],
    ["my Opay is fine", "off-app payment or contact"],
    ["email me tolu@gmail.com", "email address"],
  ])("flags %j", (text, reason) => {
    const r = checkMessage(text);
    expect(r.flagged).toBe(true);
    expect(r.reasons).toContain(reason);
  });

  it.each([
    "Is it still available?",
    "Can you do ₦12,000?",
    "What size is it? UK 12 or 14?",
    "I can pick up in Yaba on Saturday",
    "Dimensions are 210 × 90 cm",
    "Bought it in 2023 for 45000",
  ])("leaves normal messages alone: %j", (text) => {
    expect(checkMessage(text).flagged).toBe(false);
  });
});
