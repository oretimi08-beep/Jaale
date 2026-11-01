"use client";

import { useActionState, useState } from "react";
import { submitReview } from "@/app/actions/reviews";
import { Message, Submit } from "./AuthForms";

export function ReviewForm({ orderId, tags, placeholder }: { orderId: string; tags: string[]; placeholder: string }) {
  const [state, action, pending] = useActionState(submitReview.bind(null, orderId), undefined);
  const [stars, setStars] = useState(0);
  const [picked, setPicked] = useState<string[]>([]);

  return (
    <form action={action} style={{ display: "grid", gap: 14 }}>
      <Message state={state} />
      <input type="hidden" name="stars" value={stars} />
      {picked.map((t) => (
        <input key={t} type="hidden" name="tags" value={t} />
      ))}
      <div role="radiogroup" aria-label="Stars" style={{ display: "flex", gap: 6 }}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={n <= stars}
            aria-label={`${n} star${n > 1 ? "s" : ""}`}
            onClick={() => setStars(n)}
            style={{ border: 0, background: "none", fontSize: 38, lineHeight: 1, padding: 2, color: n <= stars ? "var(--accent)" : "var(--line)" }}
          >
            ★
          </button>
        ))}
      </div>
      <div className="tags">
        {tags.map((t) => {
          const on = picked.includes(t);
          return (
            <button
              key={t}
              type="button"
              className="tag"
              aria-pressed={on}
              onClick={() => setPicked((p) => (on ? p.filter((x) => x !== t) : [...p, t]))}
              style={on ? { background: "var(--primary)", color: "var(--on-primary)", borderColor: "var(--primary)" } : undefined}
            >
              {t}
            </button>
          );
        })}
      </div>
      <label className="f">
        Review <span className="hint">Optional</span>
        <textarea name="comment" rows={3} maxLength={500} placeholder={placeholder} />
      </label>
      <Submit pending={pending}>Post review</Submit>
    </form>
  );
}
