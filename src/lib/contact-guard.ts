// Spots messages that try to take payment or contact outside Jaale.
// We don't block them, but both people see a warning, and the message is flagged for our team.

const PHRASES = [
  /pay\s*(me|you)?\s*direct(ly)?/i,
  /(send|transfer|pay)\s+(it\s+|the\s+money\s+)?(in)?to\s+my\s+(account|acct|bank|opay|palmpay|kuda|moniepoint)/i,
  /\b(acct|account)\s*(no|num|number|details)\b/i,
  /\boutside\s+(the\s+)?(app|jaale)\b/i,
  /\boff\s+(the\s+)?app\b/i,
  /\b(whats\s?app|watsapp|telegram|signal)\b/i,
  /\b(call|text|ring)\s+me\b/i,
  /\bmy\s+(number|line|digits)\b/i,
  /\b(dm|inbox)\s+me\b/i,
  /\b(opay|palmpay|moniepoint|kuda)\b/i,
];

const EMAIL = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i;

/** Joins digits that people split up ("0803 123 4567", "0-8-0-3…", "o8o3") so they can't dodge the check. */
function digitRuns(text: string): string[] {
  const normalised = text
    .replace(/(?<=\d|\s|^)[oO](?=\d|\s)/g, "0")
    .replace(/[\s().\-_/]+/g, "");
  return normalised.match(/\+?\d{7,}/g) ?? [];
}

export type GuardResult = { flagged: boolean; reasons: string[] };

export function checkMessage(text: string): GuardResult {
  const reasons = new Set<string>();
  for (const run of digitRuns(text)) {
    const d = run.replace(/^\+/, "");
    if (/^(234|0)?[789][01]\d{8}$/.test(d)) reasons.add("phone number");
    else if (d.length >= 10) reasons.add("account number");
  }
  if (EMAIL.test(text)) reasons.add("email address");
  if (PHRASES.some((re) => re.test(text))) reasons.add("off-app payment or contact");
  return { flagged: reasons.size > 0, reasons: [...reasons] };
}

export const GUARD_WARNING =
  "This message may include contact or payment details. Payments made outside Jaale aren't protected, and you can't get a refund. Keep chats and payments in the app.";
