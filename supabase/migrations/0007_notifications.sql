-- Phone notifications (web push).
-- Each phone or browser that turns notifications on gets one row in push_subscriptions.
-- notification_settings holds which kinds of alerts a person wants (all on by default).
-- Only the server reads and writes these tables, so nobody gets direct access.

create table if not exists public.push_subscriptions (
  endpoint text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  p256dh text not null,
  auth text not null,
  device text,
  created_at timestamptz not null default now(),
  last_sent_at timestamptz
);
create index if not exists push_subscriptions_user on public.push_subscriptions (user_id);
alter table public.push_subscriptions enable row level security;
revoke all on public.push_subscriptions from anon, authenticated;

create table if not exists public.notification_settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  offers boolean not null default true,
  messages boolean not null default true,
  orders boolean not null default true,
  updated_at timestamptz not null default now()
);
alter table public.notification_settings enable row level security;
revoke all on public.notification_settings from anon, authenticated;
