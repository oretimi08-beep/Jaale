import { Art } from "./Art";
import { artColours, getCategory } from "@/lib/catalog";
import type { Listing } from "@/lib/types";

/** The listing's cover photo, or a category drawing when there is no photo. */
export function ListingPic({
  listing,
  index = 0,
  className = "pic",
  children,
  style,
}: {
  listing: Pick<Listing, "id" | "title" | "category" | "photos">;
  index?: number;
  className?: string;
  children?: React.ReactNode;
  style?: React.CSSProperties;
}) {
  const photo = listing.photos[index];
  const [bg, ink] = artColours(listing.id);
  const icon = getCategory(listing.category)?.icon ?? "bag";
  return (
    <div className={className} style={{ background: photo ? undefined : bg, ...style }}>
      {photo ? (
        <img src={photo.url} alt={listing.title} loading="lazy" decoding="async" />
      ) : (
        <Art icon={icon} color={ink} className="art" />
      )}
      {children}
    </div>
  );
}
