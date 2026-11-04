"use client";

import { useActionState, useState } from "react";
import { savePayoutAccount } from "@/app/actions/payout";
import type { Bank } from "@/lib/paystack";
import { Message, Submit } from "./AuthForms";
import { BRAND } from "@/lib/config";

export function PayoutForm({ banks, hasAccount }: { banks: Bank[]; hasAccount: boolean }) {
  const [state, action, pending] = useActionState(savePayoutAccount, undefined);
  const [open, setOpen] = useState(!hasAccount);
  const f = state?.fields ?? {};

  if (!open && !state?.error) {
    return (
      <>
        {state?.ok && <Message state={state} />}
        <button type="button" className="btn ghost" onClick={() => setOpen(true)}>
          Change bank account
        </button>
      </>
    );
  }

  return (
    <form action={action} style={{ display: "grid", gap: 14 }} key={state?.ok ? "saved" : "form"}>
      <Message state={state} />
      <label className="f">
        Bank
        <select name="bank" required defaultValue={f.bank ?? ""}>
          <option value="" disabled>
            Choose your bank
          </option>
          {banks.map((b) => (
            <option key={b.code} value={b.code}>
              {b.name}
            </option>
          ))}
        </select>
      </label>
      <label className="f">
        Account number <span className="hint">Your 10-digit NUBAN. It must be in your own name.</span>
        <input name="account" inputMode="numeric" maxLength={10} required placeholder="0123456789" defaultValue={f.account} autoComplete="off" />
      </label>
      <label className="f">
        Your {BRAND.name} password <span className="hint">So nobody else can change where your money goes.</span>
        <input name="password" type="password" required autoComplete="current-password" />
      </label>
      <Submit pending={pending}>Check and save account</Submit>
      {hasAccount && (
        <button type="button" className="link" style={{ justifySelf: "start" }} onClick={() => setOpen(false)}>
          Keep my current account
        </button>
      )}
    </form>
  );
}
