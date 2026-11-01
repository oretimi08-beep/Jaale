import { NextResponse, type NextRequest } from "next/server";
import { autoRelease } from "@/lib/order-service";

// Runs once a day (see vercel.json): pays sellers whose buyers didn't report a problem within 2 days.
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorised" }, { status: 401 });
  }
  const released = await autoRelease();
  return NextResponse.json({ released });
}
