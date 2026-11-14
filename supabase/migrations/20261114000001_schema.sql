-- 01 Schema: enums, tables, indexes.
-- All money columns are integer PENCE (never floats, never text).
-- Every foreign key has an index. `position` columns keep seller-entered order.

create type public.user_role      as enum ('buyer', 'seller', 'admin');
create type public.seller_status  as enum ('pending', 'approved', 'hidden');
create type public.listing_status as enum ('draft', 'pending', 'approved', 'hidden');
create type public.order_status   as enum ('new', 'confirmed', 'shipped', 'delivered');

-- ---------------------------------------------------------------- people --

create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  role        public.user_role not null default 'buyer',
  full_name   text not null default '' check (char_length(full_name) <= 120),
  email       text not null default '',
  created_at  timestamptz not null default now()
);

create table public.sellers (
  id           uuid primary key references public.profiles (id) on delete cascade,
  shop_name    text not null check (char_length(shop_name) between 2 and 80),
  status       public.seller_status not null default 'pending',
  reviewed_at  timestamptz,
  reviewed_by  uuid references public.profiles (id) on delete set null,
  created_at   timestamptz not null default now()
);
create index sellers_reviewed_by_idx on public.sellers (reviewed_by);
create index sellers_status_idx on public.sellers (status);

-- --------------------------------------------------------------- catalog --

create table public.categories (
  id         uuid primary key default gen_random_uuid(),
  parent_id  uuid references public.categories (id) on delete restrict,
  name       text not null check (char_length(name) between 1 and 80),
  slug       text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  position   integer not null default 0
);
create index categories_parent_idx on public.categories (parent_id);

create table public.products (
  id                      uuid primary key default gen_random_uuid(),
  seller_id               uuid not null references public.sellers (id) on delete cascade,
  category_id             uuid not null references public.categories (id) on delete restrict,
  title                   text not null check (char_length(title) between 3 and 140),
  slug                    text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  description             text not null default '' check (char_length(description) <= 4000),
  base_price_pence        integer not null check (base_price_pence between 0 and 100000000),
  compare_at_price_pence  integer check (compare_at_price_pence between 0 and 100000000),
  status                  public.listing_status not null default 'draft',
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  constraint products_compare_at_above_base
    check (compare_at_price_pence is null or compare_at_price_pence > base_price_pence)
);
create index products_seller_idx on public.products (seller_id);
create index products_category_idx on public.products (category_id);
create index products_status_idx on public.products (status);

create table public.product_colours (
  id          uuid primary key default gen_random_uuid(),
  product_id  uuid not null references public.products (id) on delete cascade,
  name        text not null check (char_length(name) between 1 and 60),
  hex         text not null check (hex ~ '^#[0-9A-Fa-f]{6}$'),
  title       text not null check (char_length(title) between 3 and 140),
  position    integer not null default 0,
  unique (product_id, name)
);
create index product_colours_product_idx on public.product_colours (product_id);

create table public.product_images (
  id            uuid primary key default gen_random_uuid(),
  product_id    uuid not null references public.products (id) on delete cascade,
  -- null = shared by every colour
  colour_id     uuid references public.product_colours (id) on delete cascade,
  storage_path  text not null check (char_length(storage_path) between 3 and 300),
  alt           text not null default '' check (char_length(alt) <= 200),
  width         integer check (width > 0),
  height        integer check (height > 0),
  position      integer not null default 0
);
create index product_images_product_idx on public.product_images (product_id);
create index product_images_colour_idx on public.product_images (colour_id);

-- Option groups (Size, Storage, Headboard, Base ...). Entered by the seller;
-- nothing about them is hard-coded in the buyer pages. Every group is
-- single-choice and required.
create table public.option_groups (
  id             uuid primary key default gen_random_uuid(),
  product_id     uuid not null references public.products (id) on delete cascade,
  name           text not null check (char_length(name) between 1 and 40),
  position       integer not null default 0,
  is_filterable  boolean not null default false,
  unique (product_id, name)
);
create index option_groups_product_idx on public.option_groups (product_id);

create table public.option_values (
  id                 uuid primary key default gen_random_uuid(),
  group_id           uuid not null references public.option_groups (id) on delete cascade,
  label              text not null check (char_length(label) between 1 and 80),
  price_delta_pence  integer not null default 0 check (price_delta_pence between 0 and 100000000),
  position           integer not null default 0,
  is_default         boolean not null default false,
  unique (group_id, label)
);
create index option_values_group_idx on public.option_values (group_id);
-- at most one default value per group
create unique index option_values_one_default_idx
  on public.option_values (group_id) where is_default;

create table public.product_addons (
  id           uuid primary key default gen_random_uuid(),
  product_id   uuid not null references public.products (id) on delete cascade,
  label        text not null check (char_length(label) between 1 and 80),
  price_pence  integer not null check (price_pence between 0 and 100000000),
  position     integer not null default 0,
  unique (product_id, label)
);
create index product_addons_product_idx on public.product_addons (product_id);

-- ---------------------------------------------------------------- orders --

create sequence public.order_number_seq start with 10001;

create table public.orders (
  id               uuid primary key default gen_random_uuid(),
  order_number     text not null unique
                   default ('MM-' || nextval('public.order_number_seq')::text),
  checkout_id      uuid not null,
  buyer_id         uuid not null references public.profiles (id) on delete cascade,
  seller_id        uuid not null references public.sellers (id) on delete restrict,
  status           public.order_status not null default 'new',
  subtotal_pence   integer not null check (subtotal_pence >= 0),
  total_pence      integer not null check (total_pence >= 0),
  shipping_name      text not null check (char_length(shipping_name) between 1 and 120),
  shipping_phone     text not null check (char_length(shipping_phone) between 1 and 40),
  shipping_line1     text not null check (char_length(shipping_line1) between 1 and 160),
  shipping_line2     text not null default '' check (char_length(shipping_line2) <= 160),
  shipping_city      text not null check (char_length(shipping_city) between 1 and 80),
  shipping_postcode  text not null check (char_length(shipping_postcode) between 1 and 20),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  -- makes checkout idempotent: the same checkout can never create a seller's order twice
  unique (checkout_id, seller_id)
);
create index orders_buyer_idx on public.orders (buyer_id, created_at desc);
create index orders_seller_idx on public.orders (seller_id, created_at desc);

-- Snapshots: editing or deleting a listing later never changes a past order.
create table public.order_items (
  id                uuid primary key default gen_random_uuid(),
  order_id          uuid not null references public.orders (id) on delete cascade,
  product_id        uuid references public.products (id) on delete set null,
  title             text not null,
  colour_name       text not null,
  colour_hex        text not null default '#CCCCCC',
  image_path        text,
  -- [{ "group": "Size", "value": "King 5FT", "price_delta_pence": 12500 }]
  options           jsonb not null default '[]'::jsonb,
  -- [{ "label": "Professional Assembly", "price_pence": 3999 }]
  addons            jsonb not null default '[]'::jsonb,
  unit_price_pence  integer not null check (unit_price_pence >= 0),
  quantity          integer not null check (quantity between 1 and 10),
  line_total_pence  integer not null check (line_total_pence >= 0),
  position          integer not null default 0
);
create index order_items_order_idx on public.order_items (order_id);
create index order_items_product_idx on public.order_items (product_id);

create table public.order_status_events (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid not null references public.orders (id) on delete cascade,
  status      public.order_status not null,
  changed_by  uuid references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now()
);
create index order_status_events_order_idx on public.order_status_events (order_id, created_at);
create index order_status_events_changed_by_idx on public.order_status_events (changed_by);

-- Rate limit for the AI endpoint. Service role only.
create table public.ai_usage (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references auth.users (id) on delete cascade,
  created_at  timestamptz not null default now()
);
create index ai_usage_user_idx on public.ai_usage (user_id, created_at desc);

-- ------------------------------------------------------------- triggers --

create function public.set_updated_at() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger products_set_updated_at before update on public.products
  for each row execute function public.set_updated_at();
create trigger orders_set_updated_at before update on public.orders
  for each row execute function public.set_updated_at();
