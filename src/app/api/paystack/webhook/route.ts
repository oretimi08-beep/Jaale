import { NextResponse, type NextRequest } from "next/server";
import { confirmPayment, findOrderIdByReference, markRefund } from "@/lib/order-service";
import { validSignature } from "@/lib/paystack";
import { markTransfer } from "@/lib/payout-service";

// Paystack calls this address when a payment or refund happens.
// We check the signature, then re-check the payment with Paystack before trusting it.
export async function POST(request: NextRequest) {
  const raw = await request.text();
  if (!validSignature(raw, request.headers.get("x-paystack-signature"))) {
    return NextResponse.json({ error: "bad signature" }, { status: 401 });
  }
  const event = JSON.parse(raw) as { event: string; data: { reference?: string; transaction_reference?: string; reason?: string } };

  if (event.event === "charge.success" && event.data.reference) {
    const orderId = await findOrderIdByReference(event.data.reference);
    if (orderId) await confirmPayment(orderId);
  }
  if (event.event === "refund.processed" || event.event === "refund.failed") {
    const ref = event.data.transaction_reference;
    if (ref) await markRefund(ref, event.event === "refund.processed" ? "processed" : "failed");
  }
  if ((event.event === "transfer.success" || event.event === "transfer.failed" || event.event === "transfer.reversed") && event.data.reference) {
    await markTransfer(event.data.reference, event.event.split(".")[1] as "success" | "failed" | "reversed", event.data.reason);
  }
  return NextResponse.json({ received: true });
}
