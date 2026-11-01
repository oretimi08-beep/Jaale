"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/** A sideways-scrolling row with ‹ › arrows instead of a scrollbar. Arrows only show when there's more to see. */
export function ScrollRail({ className = "", label, children }: { className?: string; label: string; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  const update = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 10);
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 10);
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const t = setTimeout(update, 0);
    el.addEventListener("scroll", update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => {
      clearTimeout(t);
      el.removeEventListener("scroll", update);
      ro.disconnect();
    };
  }, [update]);

  function go(dir: -1 | 1) {
    const el = ref.current;
    if (el) el.scrollBy({ left: dir * Math.max(el.clientWidth * 0.8, 200), behavior: "smooth" });
  }

  return (
    <div className="rail-wrap">
      {canLeft && (
        <button type="button" className="rail-arrow left" aria-label={`Scroll ${label} left`} onClick={() => go(-1)}>
          ‹
        </button>
      )}
      <div ref={ref} className={`rail ${className}`} role="region" aria-label={label} tabIndex={0}>
        {children}
      </div>
      {canRight && (
        <button type="button" className="rail-arrow right" aria-label={`Scroll ${label} right`} onClick={() => go(1)}>
          ›
        </button>
      )}
    </div>
  );
}
