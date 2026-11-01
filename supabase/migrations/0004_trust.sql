-- Trust: two-way double-blind reviews, in-app chat with offers, bans, and tighter profile rules.

-- ---------- profiles: people may only edit their own public details ----------
alter table public.profiles add column if not exists banned_at timestamptz;
alter table public.profiles add column if not exists banned_reason text;
revoke insert, update on public.profiles from anon, authenticated;
grant insert (id, full_name, username, avatar_url, city, goal, terms_accepted_at) on public.profiles to authenticated;
grant update (full_name, username, avatar_url, city, bio, goal) on public.profiles to authenticated;

-- ---------- reviews ----------
create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete restrict,
  reviewer_id uuid not null references public.profiles (id) on delete cascade,
  reviewee_id uuid not null references public.profiles (id) on delete cascade,
  role text not null check (role in ('buyer_rates_seller', 'seller_rates_buyer')),
  stars smallint not null check (stars between 1 and 5),
  tags text[] not null default '{}',
  comment text check (char_length(comment) <= 500),
  visible_at timestamptz not null,
  created_at timestamptz not null default now(),
  unique (order_id, reviewer_id)
);
create index if not exists reviews_reviewee_idx on public.reviews (reviewee_id, visible_at desc);
alter table public.reviews enable row level security;
-- Double-blind: a review is hidden from everyone but its author until it becomes visible.
drop policy if exists "see visible reviews or your own" on public.reviews;
create policy "see visible reviews or your own" on public.reviews for select
  using (visible_at <= now() or reviewer_id = auth.uid());

-- Averages count only reviews that are visible. Runs with full access on purpose, filtered here.
create or replace view public.profile_ratings as
select
  p.id,
  round(avg(r.stars) filter (where r.role = 'buyer_rates_seller'), 1)::float as seller_avg,
  (count(r.id) filter (where r.role = 'buyer_rates_seller'))::int as seller_count,
  round(avg(r.stars) filter (where r.role = 'seller_rates_buyer'), 1)::float as buyer_avg,
  (count(r.id) filter (where r.role = 'seller_rates_buyer'))::int as buyer_count
from public.profiles p
left join public.reviews r on r.reviewee_id = p.id and r.visible_at <= now()
group by p.id;
grant select on public.profile_ratings to anon, authenticated;

-- ---------- conversations and messages ----------
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings (id) on delete cascade,
  buyer_id uuid not null references public.profiles (id) on delete cascade,
  seller_id uuid not null references public.profiles (id) on delete cascade,
  last_message_at timestamptz not null default now(),
  buyer_read_at timestamptz not null default now(),
  seller_read_at timestamptz not null default 'epoch',
  created_at timestamptz not null default now(),
  unique (listing_id, buyer_id),
  check (buyer_id <> seller_id)
);
create index if not exists conversations_buyer_idx on public.conversations (buyer_id, last_message_at desc);
create index if not exists conversations_seller_idx on public.conversations (seller_id, last_message_at desc);
alter table public.conversations enable row level security;
drop policy if exists "see your conversations" on public.conversations;
create policy "see your conversations" on public.conversations for select
  using (buyer_id = auth.uid() or seller_id = auth.uid());

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  body text not null default '' check (char_length(body) <= 1000),
  flagged boolean not null default false,
  offer_kobo integer check (offer_kobo is null or offer_kobo > 0),
  offer_status text check (offer_status in ('pending', 'accepted', 'declined', 'withdrawn')),
  created_at timestamptz not null default now(),
  check ((offer_kobo is null) = (offer_status is null))
);
create index if not exists messages_conversation_idx on public.messages (conversation_id, created_at);
alter table public.messages enable row level security;
drop policy if exists "see messages in your conversations" on public.messages;
create policy "see messages in your conversations" on public.messages for select
  using (exists (select 1 from public.conversations c where c.id = conversation_id and (c.buyer_id = auth.uid() or c.seller_id = auth.uid())));
