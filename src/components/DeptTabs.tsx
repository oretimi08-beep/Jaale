"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { DEPARTMENTS } from "@/lib/catalog";

const TABS = [{ key: "all", label: "All" }, { key: "following", label: "Following" }, ...DEPARTMENTS];

export function DeptTabs() {
  const pathname = usePathname();
  const params = useSearchParams();
  const current = pathname === "/" ? params.get("dept") ?? "all" : null;

  return (
    <nav className="wrap depts" aria-label="Departments">
      {TABS.map((t) => (
        <Link
          key={t.key}
          href={t.key === "all" ? "/" : `/?dept=${t.key}`}
          className="dept"
          aria-current={current === t.key ? "page" : undefined}
        >
          {t.label}
          {"isNew" in t && t.isNew && <span className="new">NEW</span>}
        </Link>
      ))}
    </nav>
  );
}
