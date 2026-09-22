create extension if not exists "pgcrypto";

create table if not exists public.store_products (
  id uuid primary key default gen_random_uuid(),

  name text not null,
  slug text not null unique,
  description text,

  sku text unique,
  upc text,

  product_type text not null default 'other',
  set_name text,
  language text not null default 'English',
  distributor text,

  price numeric(10,2) not null check (price >= 0),
  compare_at_price numeric(10,2),
  cost numeric(10,2),

  inventory_quantity integer not null default 0
    check (inventory_quantity >= 0),

  max_per_customer integer,

  status text not null default 'draft'
    check (
      status in (
        'draft',
        'active',
        'sold_out',
        'archived'
      )
    ),

  is_preorder boolean not null default false,
  release_date date,
  preorder_closes_at timestamptz,

  featured boolean not null default false,

  image_url text,
  image_urls text[] not null default '{}',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists store_products_status_idx
  on public.store_products(status);

create index if not exists store_products_product_type_idx
  on public.store_products(product_type);

create index if not exists store_products_set_name_idx
  on public.store_products(set_name);

create index if not exists store_products_preorder_idx
  on public.store_products(is_preorder);

create index if not exists store_products_release_date_idx
  on public.store_products(release_date);

alter table public.store_products enable row level security;

drop policy if exists "Published store products are readable"
on public.store_products;

create policy "Published store products are readable"
on public.store_products
for select
to authenticated
using (
  status in ('active', 'sold_out')
);

-- IMPORTANT:
-- Product creation/edit/delete will go through your existing
-- server-side admin API + service role/admin guard.
-- Customers never receive direct INSERT/UPDATE/DELETE access.

create or replace function public.set_store_product_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists store_products_updated_at
on public.store_products;

create trigger store_products_updated_at
before update on public.store_products
for each row
execute function public.set_store_product_updated_at();