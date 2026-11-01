import { avatarColour } from "@/lib/catalog";

export function Avatar({
  name,
  url,
  size,
  className = "",
  seed,
}: {
  name: string;
  url?: string | null;
  size?: number;
  className?: string;
  seed?: string;
}) {
  const style: React.CSSProperties = { background: avatarColour(seed ?? name) };
  if (size) Object.assign(style, { width: size, height: size, fontSize: Math.round(size * 0.4) });
  return (
    <span className={`av ${className}`} style={style} aria-hidden="true">
      {url ? <img src={url} alt="" /> : (name.trim()[0] ?? "?").toUpperCase()}
    </span>
  );
}
