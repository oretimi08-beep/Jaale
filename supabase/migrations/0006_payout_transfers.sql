-- Automatic payouts through Paystack Transfers.
-- pending    = not sent yet (no bank account, transfers unavailable, or waiting to retry)
-- processing = sent to Paystack, waiting for the bank to confirm
-- paid       = money arrived (Paystack confirmed, or marked paid by hand)
-- failed     = Paystack couldn't deliver it; it will be retried
alter table public.payouts drop constraint if exists payouts_status_check;
alter table public.payouts add constraint payouts_status_check check (status in ('pending', 'processing', 'paid', 'failed'));
alter table public.payouts add column if not exists attempts integer not null default 0;
alter table public.payouts add column if not exists transfer_reference text unique;
alter table public.payouts add column if not exists last_error text;
alter table public.payouts add column if not exists sent_at timestamptz;
alter table public.payouts add column if not exists paid_at timestamptz;
alter table public.payouts add column if not exists paid_by text check (paid_by in ('paystack', 'manual'));
create index if not exists payouts_status_idx on public.payouts (status, created_at);
