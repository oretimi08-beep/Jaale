"use client";

import { useState } from "react";
import type { Listing } from "@/lib/types";
import { ListingPic } from "./ListingPic";

export function Gallery({ listing }: { listing: Pick<Listing, "id" | "title" | "category" | "photos"> }) {
  const [i, setI] = useState(0);
  return (
    <div className="gallery">
      <ListingPic listing={listing} index={i} />
      {listing.photos.length > 1 && (
        <div className="thumbs">
          {listing.photos.map((p, n) => (
            <button key={p.path} aria-label={`Photo ${n + 1}`} aria-current={n === i} onClick={() => setI(n)}>
              <img src={p.url} alt="" loading="lazy" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
