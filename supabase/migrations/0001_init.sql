-- Jaale database: accounts, follows, listings, photos, saves.
-- Every table has Row Level Security so people can only change their own things.

create extension if not exists pg_trgm;

-- ---------- helpers ----------
create or replace function public.set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ---------- profiles ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null check (char_length(full_name) between 2 and 60),
  username text not null check (username ~ '^[a-z0-9_.]{3,20}$'),
  avatar_url text,
  city text not null,
  bio text check (char_length(bio) <= 300),
  goal text not null default 'buy_and_sell' check (goal in ('buy_and_sell', 'mostly_buy')),
  verified_bank boolean not null default false,
  is_demo boolean not null default false,
  terms_accepted_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists profiles_username_key on public.profiles (lower(username));
drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
drop policy if exists "profiles are public" on public.profiles;
create policy "profiles are public" on public.profiles for select using (true);
drop policy if exists "create own profile" on public.profiles;
create policy "create own profile" on public.profiles for insert with check (id = auth.uid());
drop policy if exists "update own profile" on public.profiles;
create policy "update own profile" on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());

-- Private details only the owner can see (phone stays out of public profiles).
create table if not exists public.profile_private (
  id uuid primary key references public.profiles (id) on delete cascade,
  phone text check (phone is null or phone ~ '^\+234[0-9]{10}$'),
  updated_at timestamptz not null default now()
);
alter table public.profile_private enable row level security;
drop policy if exists "own private details" on public.profile_private;
create policy "own private details" on public.profile_private for all
  using (id = auth.uid()) with check (id = auth.uid());

-- ---------- follows ----------
create table if not exists public.follows (
  follower_id uuid not null references public.profiles (id) on delete cascade,
  following_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  check (follower_id <> following_id)
);
create index if not exists follows_following_idx on public.follows (following_id);
alter table public.follows enable row level security;
drop policy if exists "follows are public" on public.follows;
create policy "follows are public" on public.follows for select using (true);
drop policy if exists "follow as yourself" on public.follows;
create policy "follow as yourself" on public.follows for insert with check (follower_id = auth.uid());
drop policy if exists "unfollow as yourself" on public.follows;
create policy "unfollow as yourself" on public.follows for delete using (follower_id = auth.uid());

-- ---------- listings ----------
create table if not exists public.listings (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.profiles (id) on delete cascade,
  title text not null check (char_length(title) between 3 and 80),
  description text check (char_length(description) <= 2000),
  department text not null check (department in ('women', 'men', 'kids', 'home', 'appliances')),
  category text not null,
  brand text check (char_length(brand) <= 40),
  size text check (char_length(size) <= 30),
  dimensions text check (char_length(dimensions) <= 40),
  condition text not null check (condition in ('new_with_tags', 'pre_owned')),
  tested_working boolean not null default false,
  price_kobo integer not null check (price_kobo >= 50000),
  was_price_kobo integer check (was_price_kobo is null or was_price_kobo > 0),
  city text not null,
  area text check (char_length(area) <= 40),
  status text not null default 'active' check (status in ('active', 'reserved', 'sold', 'removed')),
  is_auction boolean not null default false,
  auction_ends_at timestamptz,
  save_count integer not null default 0,
  discount_pct integer generated always as (
    case when was_price_kobo > price_kobo then ((was_price_kobo - price_kobo) * 100 / was_price_kobo) else 0 end
  ) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists listings_seller_idx on public.listings (seller_id, created_at desc);
create index if not exists listings_browse_idx on public.listings (status, department, category, created_at desc);
create index if not exists listings_title_trgm on public.listings using gin (title gin_trgm_ops);
drop trigger if exists listings_updated_at on public.listings;
create trigger listings_updated_at before update on public.listings
  for each row execute function public.set_updated_at();

alter table public.listings enable row level security;
drop policy if exists "see live listings or your own" on public.listings;
create policy "see live listings or your own" on public.listings for select
  using (status <> 'removed' or seller_id = auth.uid());
drop policy if exists "sell as yourself" on public.listings;
create policy "sell as yourself" on public.listings for insert with check (seller_id = auth.uid());
drop policy if exists "edit your listings" on public.listings;
create policy "edit your listings" on public.listings for update
  using (seller_id = auth.uid()) with check (seller_id = auth.uid());
drop policy if exists "delete your listings" on public.listings;
create policy "delete your listings" on public.listings for delete using (seller_id = auth.uid());

-- Sellers must not be able to fake their own save counts.
create or replace function public.protect_save_count() returns trigger
language plpgsql as $$
begin
  if current_setting('jaale.internal', true) is distinct from 'on' then
    new.save_count = old.save_count;
  end if;
  return new;
end $$;
drop trigger if exists listings_protect_save_count on public.listings;
create trigger listings_protect_save_count before update on public.listings
  for each row execute function public.protect_save_count();

-- ---------- listing photos ----------
create table if not exists public.listing_photos (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings (id) on delete cascade,
  url text not null,
  path text not null,
  position smallint not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists listing_photos_listing_idx on public.listing_photos (listing_id, position);
alter table public.listing_photos enable row level security;
drop policy if exists "photos are public" on public.listing_photos;
create policy "photos are public" on public.listing_photos for select using (true);
drop policy if exists "manage photos of your listings" on public.listing_photos;
create policy "manage photos of your listings" on public.listing_photos for all
  using (exists (select 1 from public.listings l where l.id = listing_id and l.seller_id = auth.uid()))
  with check (exists (select 1 from public.listings l where l.id = listing_id and l.seller_id = auth.uid()));

-- ---------- saves (hearts) ----------
create table if not exists public.saves (
  user_id uuid not null references public.profiles (id) on delete cascade,
  listing_id uuid not null references public.listings (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, listing_id)
);
create index if not exists saves_listing_idx on public.saves (listing_id);
alter table public.saves enable row level security;
drop policy if exists "see your saves" on public.saves;
create policy "see your saves" on public.saves for select using (user_id = auth.uid());
drop policy if exists "save as yourself" on public.saves;
create policy "save as yourself" on public.saves for insert with check (user_id = auth.uid());
drop policy if exists "unsave as yourself" on public.saves;
create policy "unsave as yourself" on public.saves for delete using (user_id = auth.uid());

create or replace function public.bump_save_count() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform set_config('jaale.internal', 'on', true);
  if tg_op = 'INSERT' then
    update public.listings set save_count = save_count + 1 where id = new.listing_id;
  elsif tg_op = 'DELETE' then
    update public.listings set save_count = greatest(save_count - 1, 0) where id = old.listing_id;
  end if;
  perform set_config('jaale.internal', 'off', true);
  return null;
end $$;
drop trigger if exists saves_count on public.saves;
create trigger saves_count after insert or delete on public.saves
  for each row execute function public.bump_save_count();

-- ---------- profile stats (counts shown on profiles and store rows) ----------
create or replace view public.profile_stats with (security_invoker = true) as
select
  p.id,
  (select count(*) from public.follows f where f.following_id = p.id)::int as follower_count,
  (select count(*) from public.follows f where f.follower_id = p.id)::int as following_count,
  (select count(*) from public.listings l where l.seller_id = p.id and l.status in ('active', 'reserved'))::int as listing_count
from public.profiles p;

-- ---------- photo storage ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('listing-photos', 'listing-photos', true, 5242880, array['image/jpeg', 'image/png', 'image/webp']),
  ('avatars', 'avatars', true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = excluded.public,
  file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

-- Files live in a folder named after the user's id; only that user can write there.
drop policy if exists "jaale upload own files" on storage.objects;
create policy "jaale upload own files" on storage.objects for insert to authenticated
  with check (bucket_id in ('listing-photos', 'avatars') and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "jaale update own files" on storage.objects;
create policy "jaale update own files" on storage.objects for update to authenticated
  using (bucket_id in ('listing-photos', 'avatars') and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "jaale delete own files" on storage.objects;
create policy "jaale delete own files" on storage.objects for delete to authenticated
  using (bucket_id in ('listing-photos', 'avatars') and (storage.foldername(name))[1] = auth.uid()::text);
