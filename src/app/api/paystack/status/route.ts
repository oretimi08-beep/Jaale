import { NextResponse } from "next/server";

// Says whether payments are set up correctly, without ever revealing the key.
export async function GET() {
  const key = process.env.PAYSTACK_SECRET_KEY?.trim() ?? "";
  const mode = key.startsWith("sk_test_") ? "test" : key.startsWith("sk_live_") ? "live" : key ? "unrecognised" : "missing";
  let keyAccepted: boolean | null = null;
  if (mode === "test" || mode === "live") {
    // A made-up reference: a valid key gets "not found", a bad key gets "invalid key".
    const res = await fetch("https://api.paystack.co/transaction/verify/jaale-status-check", {
      headers: { Authorization: `Bearer ${key}` },
      cache: "no-store",
    });
    keyAccepted = res.status !== 401;
  }
  return NextResponse.json({
    mode,
    keyAccepted,
    liveEnabled: process.env.PAYSTACK_LIVE_ENABLED === "yes",
    serverKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    cron: !!process.env.CRON_SECRET,
  });
}
