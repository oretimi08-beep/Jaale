"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { makeOffer, respondToOffer, sendMessage } from "@/app/actions/messages";
import { checkMessage, GUARD_WARNING } from "@/lib/contact-guard";
import { naira, nairaInputToKobo } from "@/lib/money";
import { toast } from "./Toaster";

export type ChatMessage = {
  id: string;
  sender_id: string;
  body: string;
  flagged: boolean;
  offer_kobo: number | null;
  offer_status: "pending" | "accepted" | "declined" | "withdrawn" | null;
  created_at: string;
};

const STATUS: Record<string, string> = { accepted: "Accepted", declined: "Declined", withdrawn: "Withdrawn", pending: "Waiting for a reply" };

export function Chat({
  conversationId,
  me,
  role,
  messages,
  askingKobo,
  canOffer,
  startWithOffer,
}: {
  conversationId: string;
  me: string;
  role: "buyer" | "seller";
  messages: ChatMessage[];
  askingKobo: number;
  canOffer: boolean;
  startWithOffer: boolean;
}) {
  const [text, setText] = useState("");
  const [offering, setOffering] = useState(startWithOffer && canOffer);
  const [amount, setAmount] = useState("");
  const [pending, start] = useTransition();
  const router = useRouter();
  const end = useRef<HTMLDivElement>(null);
  const warn = text.length > 5 && checkMessage(text).flagged;

  // New messages arrive by checking every few seconds while the chat is open.
  useEffect(() => {
    const t = setInterval(() => router.refresh(), 5000);
    return () => clearInterval(t);
  }, [router]);
  useEffect(() => {
    end.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  function send() {
    const body = text;
    start(async () => {
      const res = await sendMessage(conversationId, body);
      if (res.error) return toast(res.error);
      setText("");
      router.refresh();
    });
  }
  function offer() {
    start(async () => {
      const res = await makeOffer(conversationId, amount);
      if (res.error) return toast(res.error);
      setAmount("");
      setOffering(false);
      toast(role === "buyer" ? "Offer sent." : "Counter-offer sent.");
      router.refresh();
    });
  }
  function answer(id: string, a: "accepted" | "declined" | "withdrawn") {
    start(async () => {
      const res = await respondToOffer(id, a);
      if (res.error) return toast(res.error);
      toast(a === "accepted" ? "Offer accepted." : a === "declined" ? "Offer declined." : "Offer withdrawn.");
      router.refresh();
    });
  }

  const preview = nairaInputToKobo(amount);
  const off = preview && askingKobo ? Math.round((1 - preview / askingKobo) * 100) : 0;

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={{ display: "grid", gap: 8, maxHeight: "55vh", overflowY: "auto", padding: "4px 2px" }}>
        {messages.length === 0 && (
          <p className="sample" style={{ textAlign: "center", padding: "20px 0" }}>
            Say hello, ask a question, or make an offer.
          </p>
        )}
        {messages.map((m) => {
          const mine = m.sender_id === me;
          const bubble: React.CSSProperties = {
            justifySelf: mine ? "end" : "start",
            maxWidth: "85%",
            background: mine ? "var(--primary)" : "var(--bg)",
            color: mine ? "var(--on-primary)" : "var(--fg)",
            border: mine ? "0" : "1px solid var(--line)",
            borderRadius: 16,
            padding: "8px 12px",
          };
          if (m.offer_kobo) {
            return (
              <div key={m.id} style={{ ...bubble, background: "var(--primary-soft)", color: "var(--fg)", border: "1px solid var(--line)", display: "grid", gap: 6 }}>
                <small className="muted">{mine ? "You offered" : role === "seller" ? "Buyer offered" : "Seller offered"}</small>
                <b className="num" style={{ fontSize: 20 }}>{naira(m.offer_kobo)}</b>
                <small className="muted">{STATUS[m.offer_status ?? "pending"]}</small>
                {m.offer_status === "pending" && !mine && (
                  <div style={{ display: "flex", gap: 6 }}>
                    <button className="btn sm" disabled={pending} onClick={() => answer(m.id, "accepted")}>Accept</button>
                    <button className="btn ghost sm" disabled={pending} onClick={() => answer(m.id, "declined")}>Decline</button>
                  </div>
                )}
                {m.offer_status === "pending" && mine && (
                  <button className="link" style={{ justifySelf: "start", fontSize: 13 }} disabled={pending} onClick={() => answer(m.id, "withdrawn")}>
                    Withdraw
                  </button>
                )}
              </div>
            );
          }
          return (
            <div key={m.id} style={{ display: "grid", gap: 4, justifyItems: mine ? "end" : "start" }}>
              <div style={bubble}>{m.body}</div>
              {m.flagged && (
                <small style={{ color: "var(--danger)", maxWidth: "85%", fontSize: 12 }}>⚠ {GUARD_WARNING}</small>
              )}
            </div>
          );
        })}
        <div ref={end} />
      </div>

      {offering ? (
        <div className="lines" style={{ gap: 10 }}>
          <b>{role === "buyer" ? "Your offer" : "Counter-offer"}</b>
          <label className="f">
            Price (₦) <span className="hint">Asking price {naira(askingKobo)}. Offers start from half the price.</span>
            <input inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder={String(Math.round((askingKobo * 0.85) / 100))} autoFocus />
          </label>
          {off > 0 && off < 100 && <small className="muted">{off}% below the asking price</small>}
          <div className="two">
            <button className="btn ghost" onClick={() => setOffering(false)}>Cancel</button>
            <button className="btn" disabled={pending || !preview} onClick={offer}>Send offer</button>
          </div>
        </div>
      ) : (
        <>
          {warn && <div className="note err" style={{ fontSize: 13 }}><b>Careful.</b> {GUARD_WARNING}</div>}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (text.trim()) send();
            }}
            style={{ display: "flex", gap: 8 }}
          >
            <input
              className="search"
              style={{ flex: 1, padding: "10px 14px" }}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Write a message…"
              maxLength={1000}
              aria-label="Message"
            />
            <button className="btn" disabled={pending || !text.trim()}>Send</button>
          </form>
          {canOffer && (
            <button className="btn ghost" onClick={() => setOffering(true)}>
              {role === "buyer" ? "Make an offer" : "Send a counter-offer"}
            </button>
          )}
        </>
      )}
    </div>
  );
}
