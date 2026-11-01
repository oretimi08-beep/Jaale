"use client";

import Link from "next/link";
import { useTransition } from "react";
import { deleteListing, setListingStatus } from "@/app/actions/listings";
import type { ListingStatus } from "@/lib/types";
import { toast } from "./Toaster";

const MESSAGES = { active: "Back on sale.", reserved: "Marked as reserved.", sold: "Marked as sold." };

export function OwnerControls({ id, status }: { id: string; status: ListingStatus }) {
  const [pending, start] = useTransition();

  function setStatus(next: "active" | "reserved" | "sold") {
    start(async () => {
      const res = await setListingStatus(id, next);
      toast(res.error ?? MESSAGES[next]);
    });
  }

  function remove() {
    if (!confirm("Remove this listing for good? Its photos will be deleted too. This can't be undone.")) return;
    start(async () => {
      const res = await deleteListing(id);
      if (res?.error) toast(res.error);
    });
  }

  return (
    <div className="owner-bar">
      <strong>This is your listing</strong>
      <Link href={`/item/${id}/edit`} className="btn sm">Edit</Link>
      {status !== "sold" && (
        <button className="btn ghost sm" disabled={pending} onClick={() => setStatus("sold")}>Mark as sold</button>
      )}
      {status === "active" && (
        <button className="btn ghost sm" disabled={pending} onClick={() => setStatus("reserved")}>Mark reserved</button>
      )}
      {status !== "active" && (
        <button className="btn ghost sm" disabled={pending} onClick={() => setStatus("active")}>Put back on sale</button>
      )}
      <button className="btn danger sm" disabled={pending} onClick={remove}>Remove</button>
    </div>
  );
}
