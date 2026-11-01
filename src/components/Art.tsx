import type { IconKey } from "@/lib/catalog";

// Simple drawings for each category, used when a listing has no photo
// and for the category buttons. Ported from the design prototype.
const SHAPES: Record<IconKey, (c: string) => React.ReactNode> = {
  top: (c) => <path d="M32 14 14 26l8 18 10-5v47h36V39l10 5 8-18-18-12c-3 7-10 11-18 11s-15-4-18-11z" fill={c} />,
  dress: (c) => <path d="M38 8h24l-2 18 6 8-4 10 18 46H20l18-46-4-10 6-8z" fill={c} />,
  jeans: (c) => <path d="M28 8h44l6 84H56L50 40l-6 52H22z" fill={c} />,
  shoe: (c) => (
    <>
      <path d="M8 58c0-10 4-22 8-26 6 6 16 8 24 4l20 12c10 6 22 6 30 10 4 2 4 12 0 14H12c-3 0-4-6-4-14z" fill={c} />
      <path d="M8 72h86" stroke="rgba(0,0,0,.2)" strokeWidth="5" />
    </>
  ),
  heel: (c) => <path d="M10 70c14-2 26-14 34-30 4-8 12-10 18-4l24 26c4 4 4 10-2 10H60c-6 0-10-4-14-8L30 78H22v10h-6V76c-4 0-6-3-6-6z" fill={c} />,
  bag: (c) => (
    <>
      <path d="M36 34c0-12 6-18 14-18s14 6 14 18" fill="none" stroke={c} strokeWidth="6" />
      <rect x="18" y="32" width="64" height="54" rx="10" fill={c} />
    </>
  ),
  agbada: (c) => (
    <>
      <path d="M40 10h20l4 8 30 14-6 40-18-6v34H30V66l-18 6-6-40 30-14z" fill={c} />
      <path d="M44 18l6 20 6-20" fill="none" stroke="rgba(255,255,255,.5)" strokeWidth="3" />
    </>
  ),
  swim: (c) => <path d="M30 10h8l4 22h16l4-22h8l-4 30c-2 8 6 16 10 22-8 10-20 16-26 26-6-10-18-16-26-26 4-6 12-14 10-22z" fill={c} />,
  kids: (c) => (
    <>
      <path d="M36 22 22 30l6 14 8-4v34h28V40l8 4 6-14-14-8c-2 5-7 8-14 8s-12-3-14-8z" fill={c} />
      <circle cx="50" cy="56" r="6" fill="rgba(255,255,255,.55)" />
    </>
  ),
  sofa: (c) => (
    <>
      <rect x="20" y="30" width="60" height="26" rx="6" fill={c} />
      <rect x="8" y="44" width="84" height="26" rx="8" fill={c} />
      <rect x="8" y="44" width="84" height="26" rx="8" fill="rgba(0,0,0,.12)" />
      <rect x="18" y="52" width="64" height="12" rx="4" fill={c} />
      <path d="M16 70v10M84 70v10" stroke={c} strokeWidth="5" />
    </>
  ),
  chair: (c) => (
    <>
      <rect x="30" y="12" width="40" height="42" rx="8" fill={c} />
      <rect x="24" y="50" width="52" height="14" rx="5" fill={c} />
      <rect x="24" y="50" width="52" height="14" rx="5" fill="rgba(0,0,0,.14)" />
      <path d="M30 64l-4 26M70 64l4 26" stroke={c} strokeWidth="5" />
    </>
  ),
  table: (c) => (
    <>
      <rect x="10" y="38" width="80" height="10" rx="3" fill={c} />
      <path d="M20 48v40M80 48v40M30 48v30M70 48v30" stroke={c} strokeWidth="6" />
    </>
  ),
  bed: (c) => (
    <>
      <rect x="10" y="22" width="12" height="62" rx="3" fill={c} />
      <rect x="18" y="50" width="74" height="22" rx="4" fill={c} />
      <rect x="26" y="40" width="22" height="12" rx="5" fill={c} opacity=".7" />
      <path d="M88 72v12" stroke={c} strokeWidth="6" />
    </>
  ),
  lamp: (c) => (
    <>
      <path d="M34 12h32l12 30H22z" fill={c} />
      <path d="M50 42v40" stroke={c} strokeWidth="5" />
      <rect x="34" y="82" width="32" height="8" rx="4" fill={c} />
    </>
  ),
  fridge: (c) => (
    <>
      <rect x="26" y="6" width="48" height="88" rx="8" fill={c} />
      <path d="M26 38h48" stroke="rgba(0,0,0,.18)" strokeWidth="3" />
      <path d="M66 16v14M66 46v20" stroke="rgba(255,255,255,.7)" strokeWidth="4" strokeLinecap="round" />
    </>
  ),
  micro: (c) => (
    <>
      <rect x="8" y="26" width="84" height="50" rx="7" fill={c} />
      <rect x="16" y="34" width="50" height="34" rx="4" fill="rgba(0,0,0,.25)" />
      <circle cx="79" cy="42" r="4" fill="rgba(255,255,255,.7)" />
      <circle cx="79" cy="56" r="4" fill="rgba(255,255,255,.7)" />
    </>
  ),
  blender: (c) => (
    <>
      <path d="M32 10h36l-6 50H38z" fill={c} opacity=".55" />
      <rect x="30" y="60" width="40" height="30" rx="6" fill={c} />
      <circle cx="50" cy="75" r="5" fill="rgba(255,255,255,.7)" />
    </>
  ),
  fan: (c) => (
    <>
      <circle cx="50" cy="36" r="28" fill="none" stroke={c} strokeWidth="4" />
      <path d="M50 36c-4-14 0-22 6-20s4 12-6 20zM50 36c14-2 20 4 16 9s-12 0-16-9zM50 36c-8 10-18 10-18 4s8-8 18-4z" fill={c} />
      <path d="M50 64v20" stroke={c} strokeWidth="5" />
      <rect x="34" y="84" width="32" height="7" rx="3" fill={c} />
    </>
  ),
  tv: (c) => (
    <>
      <rect x="6" y="16" width="88" height="54" rx="5" fill={c} />
      <rect x="11" y="21" width="78" height="44" rx="2" fill="rgba(255,255,255,.18)" />
      <path d="M36 84l14-14 14 14" stroke={c} strokeWidth="5" fill="none" />
    </>
  ),
  gen: (c) => (
    <>
      <rect x="12" y="30" width="76" height="46" rx="6" fill={c} />
      <rect x="20" y="38" width="30" height="18" rx="3" fill="rgba(255,255,255,.35)" />
      <path d="M12 30l10-12h56l10 12M20 76v10M80 76v10" stroke={c} strokeWidth="5" fill="none" />
      <circle cx="70" cy="56" r="7" fill="rgba(0,0,0,.25)" />
    </>
  ),
};

export function Art({ icon, color, className }: { icon: IconKey; color: string; className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden="true">
      {SHAPES[icon](color)}
    </svg>
  );
}
