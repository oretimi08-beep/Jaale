"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { startCheckout } from "@/app/actions/orders";
import { deliveryOptions } from "@/lib/delivery";
import { naira, protectionFee } from "@/lib/money";
import type { Listing } from "@/lib/types";
import { Message, Submit } from "./AuthForms";
import { ListingPic } from "./ListingPic";

const PICKUP = new Set(["self_pickup", "pickup_point"]);

export function CheckoutForm({
  item,
  bulky,
  testMode,
  ready,
  defaultPhone,
}: {
  item: Listing;
  bulky: boolean;
  testMode: boolean;
  ready: boolean;
  defaultPhone: string;
}) {
  const [state, action, pending] = useActionState(startCheckout.bind(null, item.id), undefined);
  const f = state?.fields ?? {};
  const options = deliveryOptions(bulky, item.city, item.area);
  const [choice, setChoice] = useState(f.delivery ?? options[0].key);
  const [method, setMethod] = useState(f.method ?? "card");
  const delivery = options.find((o) => o.key === choice)!.kobo;
  const fee = protectionFee(item.price_kobo);
  const total = item.price_kobo + fee + delivery;

  return (
    <form action={action} className="panel">
      <div className="shead">
        <strong>Checkout</strong>
        <Link href={`/item/${item.id}`} className="x" aria-label="Back to item">×</Link>
      </div>

      {!ready ? (
        <div className="note warm">
          <b>Payments aren&apos;t switched on yet.</b> You can look around, but you can&apos;t pay just now.
        </div>
      ) : testMode ? (
        <div className="note warm">
          <b>Test mode.</b> No real money moves. On the Paystack page, use the test card 4084 0840 8408 4081, any future
          date, CVV 408.
        </div>
      ) : null}
      <Message state={state} />

      <div className="seller">
        <ListingPic listing={item} style={{ width: 64, aspectRatio: "1/1", borderRadius: 10, flex: "none" }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <b>{item.title}</b>
          <small>
            {item.seller.full_name} · {item.area ? `${item.area}, ` : ""}
            {item.city}
          </small>
        </div>
      </div>

      <fieldset>
        <legend>Delivery</legend>
        {options.map((o) => (
          <label key={o.key} className="opt">
            <input type="radio" name="delivery" value={o.key} checked={choice === o.key} onChange={() => setChoice(o.key)} />
            <span>
              {o.label}
              <small>{o.detail}</small>
            </span>
            <b className="num">{o.kobo ? naira(o.kobo) : "Free"}</b>
          </label>
        ))}
      </fieldset>

      {!PICKUP.has(choice) && (
        <label className="f">
          Delivery address
          <textarea name="address" rows={2} required placeholder="House number, street, area, city" defaultValue={f.address} />
        </label>
      )}
      <label className="f">
        Phone number <span className="hint">Only shared with the seller and the rider for this order.</span>
        <div className="phone">
          <span>🇳🇬 +234</span>
          <input name="phone" inputMode="tel" required placeholder="803 123 4567" defaultValue={f.phone ?? defaultPhone} />
        </div>
      </label>

      <div className="lines">
        <div className="line"><span>Item</span><span className="num">{naira(item.price_kobo)}</span></div>
        <div className="line">
          <span>Buyer protection<br /><small>₦300 + 5%, covers refunds</small></span>
          <span className="num">{naira(fee)}</span>
        </div>
        <div className="line"><span>Delivery</span><span className="num">{delivery ? naira(delivery) : "Free"}</span></div>
        <div className="line total"><span>You pay</span><span className="num">{naira(total)}</span></div>
      </div>

      <fieldset>
        <legend>Pay with</legend>
        {[
          ["card", "Card", "Visa, Mastercard, Verve"],
          ["transfer", "Bank transfer", "Pay into a one-time account number"],
          ["ussd", "USSD", "Dial a code from any bank"],
        ].map(([k, l, d]) => (
          <label key={k} className="opt">
            <input type="radio" name="method" value={k} checked={method === k} onChange={() => setMethod(k)} />
            <span>{l}<small>{d}</small></span>
          </label>
        ))}
      </fieldset>

      {ready ? (
        <Submit pending={pending}>Pay {naira(total)} securely</Submit>
      ) : (
        <button className="btn block" type="button" disabled>Pay {naira(total)} securely</button>
      )}
      <p className="sample">
        Payments by Paystack. We hold your money and the seller is paid only after you confirm the item is fine, or 2
        days after it arrives with no problem reported.
      </p>
    </form>
  );
}
