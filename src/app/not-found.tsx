import Link from "next/link";

export default function NotFound() {
  return (
    <main className="wrap">
      <div className="panel" style={{ textAlign: "center" }}>
        <h2>We couldn&apos;t find that</h2>
        <p className="muted" style={{ margin: 0 }}>It may have been sold, removed, or the link is wrong.</p>
        <Link href="/" className="btn" style={{ justifySelf: "center" }}>Back to shopping</Link>
      </div>
    </main>
  );
}
