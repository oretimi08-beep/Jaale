"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

export function SortSelect({ value }: { value: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  return (
    <select
      aria-label="Sort"
      className="tag"
      value={value}
      onChange={(e) => {
        const next = new URLSearchParams(params);
        if (e.target.value === "new") next.delete("sort");
        else next.set("sort", e.target.value);
        next.delete("n");
        const qs = next.toString();
        router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
      }}
    >
      <option value="new">Newest</option>
      <option value="low">Price: low to high</option>
      <option value="high">Price: high to low</option>
      <option value="deal">Biggest discount</option>
    </select>
  );
}
