import Link from "next/link";
import { discountPercent, naira, totalWithProtection } from "@/lib/money";
import type { Listing } from "@/lib/types";
import { ListingPic } from "./ListingPic";
import { SaveButton } from "./SaveButton";

export function ItemCard({ item, saved }: { item: Listing; saved: boolean }) {
  const off = discountPercent(item.price_kobo, item.was_price_kobo);
  const href = `/item/${item.id}`;
  return (
    <div className="card">
      <ListingPic listing={item}>
        <Link href={href} aria-label={item.title} style={{ position: "absolute", inset: 0 }} />
        <div className="badges">
          {item.status !== "active" && <span className="bd status">{item.status === "sold" ? "SOLD" : "RESERVED"}</span>}
          {off > 0 && <span className="bd off">-{off}%</span>}
          {item.is_auction && <span className="bd auc">AUCTION</span>}
          {item.condition === "new_with_tags" ? <span className="bd newt">NEW</span> : <span className="bd">PRE-OWNED</span>}
        </div>
        <SaveButton listingId={item.id} title={item.title} initialSaved={saved} initialCount={item.save_count} />
      </ListingPic>
      <Link href={href} className="meta">
        <span className="t">{item.title}</span>
        <span className="p num">
          {naira(item.price_kobo)}
          {item.was_price_kobo ? <s>{naira(item.was_price_kobo)}</s> : null}
        </span>
        <small>
          {item.seller.full_name}
          {item.seller.verified_bank && <span className="tick" title="Verified seller">✓</span>} · {item.area ? `${item.area}, ` : ""}
          {item.city}
        </small>
        <span className="safe">✓ {naira(totalWithProtection(item.price_kobo))} incl. protection</span>
      </Link>
    </div>
  );
}
