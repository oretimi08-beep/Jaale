import { NextResponse, type NextRequest } from "next/server";
import { autoRelease } from "@/lib/order-service";
import { sendDuePayouts } from "@/lib/payout-service";

// Runs once a day (see vercel.json): releases orders whose 2 days are up, then sends any waiting payouts.
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorised" }, { status: 401 });
  }
  const released = await autoRelease();
  const payouts = await sendDuePayouts(); // retry anything that couldn't be sent yet
  return NextResponse.json({ released, payouts });
}
