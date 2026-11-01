-- Orders, payouts and disputes.
-- Only our server (with the service key) can change orders, so nobody can mark their own order as paid.
-- Buyers and sellers can read their own orders.

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  number bigint generated always as identity (start with 20001),
  listing_id uuid not null references public.listings (id) on delete restrict,
  buyer_id uuid not null references public.profiles (id) on delete restrict,
  seller_id uuid not null references public.profiles (id) on delete restrict,
  listing_title text not null,
  listing_photo_url text,
  item_kobo integer not null check (item_kobo > 0),
  protection_fee_kobo integer not null check (protection_fee_kobo >= 0),
  delivery_kobo integer not null check (delivery_kobo >= 0),
  total_kobo integer not null check (total_kobo = item_kobo + protection_fee_kobo + delivery_kobo),
  delivery_method text not null,
  delivery_label text not null,
  delivery_address text,
  delivery_phone text,
  status text not null default 'pending_payment' check (status in
    ('pending_payment', 'paid_held', 'shipped', 'delivered', 'completed', 'disputed', 'refunded', 'cancelled')),
  paystack_reference text not null unique,
  paid_at timestamptz,
  shipped_at timestamptz,
  delivered_at timestamptz,
  release_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  refund_status text check (refund_status in ('pending', 'processed', 'failed')),
  refund_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (buyer_id <> seller_id)
);
create index if not exists orders_buyer_idx on public.orders (buyer_id, created_at desc);
create index if not exists orders_seller_idx on public.orders (seller_id, created_at desc);
create index if not exists orders_release_idx on public.orders (release_at) where status = 'delivered';
drop trigger if exists orders_updated_at on public.orders;
create trigger orders_updated_at before update on public.orders
  for each row execute function public.set_updated_at();

alter table public.orders enable row level security;
drop policy if exists "see your orders" on public.orders;
create policy "see your orders" on public.orders for select
  using (buyer_id = auth.uid() or seller_id = auth.uid());

-- Money owed to sellers. Actual bank transfers come later (Paystack Transfers).
create table if not exists public.payouts (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.orders (id) on delete restrict,
  seller_id uuid not null references public.profiles (id) on delete restrict,
  amount_kobo integer not null check (amount_kobo > 0),
  status text not null default 'pending' check (status in ('pending', 'paid', 'failed')),
  paystack_transfer_code text,
  created_at timestamptz not null default now()
);
alter table public.payouts enable row level security;
drop policy if exists "see your payouts" on public.payouts;
create policy "see your payouts" on public.payouts for select using (seller_id = auth.uid());

create table if not exists public.disputes (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.orders (id) on delete restrict,
  opened_by uuid not null references public.profiles (id),
  reason text not null,
  details text check (char_length(details) <= 1000),
  status text not null default 'open' check (status in ('open', 'resolved_refund', 'resolved_release')),
  resolution text,
  created_at timestamptz not null default now()
);
alter table public.disputes enable row level security;
drop policy if exists "see disputes on your orders" on public.disputes;
create policy "see disputes on your orders" on public.disputes for select
  using (exists (select 1 from public.orders o where o.id = order_id and (o.buyer_id = auth.uid() or o.seller_id = auth.uid())));

-- Marks an order paid and the item sold in one step, so two buyers can never both get the same item.
-- Returns: 'paid', 'already' (seen before), 'amount_mismatch', or 'conflict' (item went to someone else; refund needed).
create or replace function public.mark_order_paid(p_order uuid, p_amount integer)
returns text language plpgsql security definer set search_path = public as $$
declare
  o public.orders;
  l_status text;
begin
  select * into o from public.orders where id = p_order for update;
  if not found then return 'missing'; end if;
  if o.status <> 'pending_payment' then return 'already'; end if;
  if p_amount <> o.total_kobo then return 'amount_mismatch'; end if;

  select status into l_status from public.listings where id = o.listing_id for update;
  if l_status is distinct from 'active' and l_status is distinct from 'reserved' then
    update public.orders set status = 'refunded', paid_at = now(), refund_status = 'pending',
      refund_reason = 'Someone else bought this item first.' where id = p_order;
    return 'conflict';
  end if;

  update public.orders set status = 'paid_held', paid_at = now() where id = p_order;
  update public.listings set status = 'sold' where id = o.listing_id;
  -- Any other unpaid orders for the same item can no longer go through.
  update public.orders set status = 'cancelled', cancelled_at = now()
    where listing_id = o.listing_id and id <> p_order and status = 'pending_payment';
  return 'paid';
end $$;
revoke all on function public.mark_order_paid(uuid, integer) from public, anon, authenticated;
