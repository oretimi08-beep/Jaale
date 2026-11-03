-- Where each seller wants to be paid. Private: only the owner can read it, and only our server can write it
-- (after checking the account with Paystack and matching the name to the seller's profile).

create table if not exists public.payout_accounts (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  bank_code text not null,
  bank_name text not null,
  account_number text not null check (account_number ~ '^[0-9]{10}$'),
  account_name text not null,
  paystack_recipient_code text,
  verified_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.payout_accounts enable row level security;
drop policy if exists "see your own payout account" on public.payout_accounts;
create policy "see your own payout account" on public.payout_accounts for select using (user_id = auth.uid());
revoke insert, update, delete on public.payout_accounts from anon, authenticated;
