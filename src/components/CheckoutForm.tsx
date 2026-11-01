"use client";

import Link from "next/link";
import { useState } from "react";
import { deliveryOptions } from "@/lib/delivery";
import { naira, protectionFee } from "@/lib/money";
import type { Listing } from "@/lib/types";
import { ListingPic } from "./ListingPic";
import { toast } from "./Toaster";

export function CheckoutForm({ item, bulky }: { item: Listing; bulky: boolean }) {
  const options = deliveryOptions(bulky, item.city, item.area);
  const [choice, setChoice] = useState(options[0].key);
  const [method, setMethod] = useState("card");
  const delivery = options.find((o) => o.key === choice)!.kobo;
  const fee = protectionFee(item.price_kobo);
  const total = item.price_kobo + fee + delivery;

  return (
    <div className="panel">
      <div className="shead">
        <strong>Checkout</strong>
        <Link href={`/item/${item.id}`} className="x" aria-label="Back to item">×</Link>
      </div>

      <div className="note warm">
        <b>Preview only.</b> Payments aren&apos;t switched on yet, so you won&apos;t be charged. This shows how checkout will work.
      </div>

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
            <input type="radio" name="method" checked={method === k} onChange={() => setMethod(k)} />
            <span>{l}<small>{d}</small></span>
          </label>
        ))}
      </fieldset>

      <button className="btn block" onClick={() => toast("Payments are coming soon. Nothing was charged.")}>
        Pay {naira(total)} securely
      </button>
      <p className="sample">
        Payments by Paystack. The seller is paid only after you confirm delivery, or 2 days after it arrives with no
        problem reported.
      </p>
    </div>
  );
}
