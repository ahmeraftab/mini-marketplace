-- 02 Security: helper, privileges, row-level security.
--
-- Model: clients (anon / authenticated) can only READ tables, and RLS decides
-- which rows. Every write goes through a function in migration 03.

-- is_admin() is security definer so it can read profiles without recursing
-- through profiles' own RLS policy.
create function public.is_admin() returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.role = 'admin'
  );
$$;

-- ------------------------------------------------------------ privileges --

revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;

-- public catalog: readable by everyone (RLS filters rows)
grant select on
  public.categories, public.sellers, public.products, public.product_colours,
  public.product_images, public.option_groups, public.option_values,
  public.product_addons
to anon, authenticated;

-- private tables: signed-in users only (RLS filters rows)
grant select on
  public.profiles, public.orders, public.order_items, public.order_status_events
to authenticated;

-- the single direct write: a user may rename themselves
grant update (full_name) on public.profiles to authenticated;

-- future tables must not silently become writable from the browser
alter default privileges in schema public revoke all on tables from anon, authenticated;
alter default privileges in schema public revoke all on sequences from anon, authenticated;
alter default privileges in schema public revoke execute on functions from public, anon, authenticated;

-- -------------------------------------------------------------------- RLS --

alter table public.profiles            enable row level security;
alter table public.sellers             enable row level security;
alter table public.categories          enable row level security;
alter table public.products            enable row level security;
alter table public.product_colours     enable row level security;
alter table public.product_images      enable row level security;
alter table public.option_groups       enable row level security;
alter table public.option_values       enable row level security;
alter table public.product_addons      enable row level security;
alter table public.orders              enable row level security;
alter table public.order_items         enable row level security;
alter table public.order_status_events enable row level security;
alter table public.ai_usage            enable row level security;
-- ai_usage has no policies: only the service role (which bypasses RLS) can use it.

-- profiles
create policy profiles_select on public.profiles for select
  using (id = (select auth.uid()) or public.is_admin());
create policy profiles_update_own on public.profiles for update
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- sellers: approved shops are public; a seller sees their own; admin sees all
create policy sellers_select on public.sellers for select
  using (status = 'approved' or id = (select auth.uid()) or public.is_admin());

-- categories
create policy categories_select on public.categories for select using (true);

-- products: public only when the listing AND its seller are approved
create policy products_select on public.products for select
  using (
    (
      status = 'approved'
      and exists (
        select 1 from public.sellers s
        where s.id = products.seller_id and s.status = 'approved'
      )
    )
    or seller_id = (select auth.uid())
    or public.is_admin()
  );

-- children inherit visibility from the parent product's policy
create policy product_colours_select on public.product_colours for select
  using (exists (select 1 from public.products p where p.id = product_colours.product_id));
create policy product_images_select on public.product_images for select
  using (exists (select 1 from public.products p where p.id = product_images.product_id));
create policy option_groups_select on public.option_groups for select
  using (exists (select 1 from public.products p where p.id = option_groups.product_id));
create policy product_addons_select on public.product_addons for select
  using (exists (select 1 from public.products p where p.id = product_addons.product_id));
create policy option_values_select on public.option_values for select
  using (exists (select 1 from public.option_groups g where g.id = option_values.group_id));

-- orders: the buyer, the seller the order belongs to, and admin
create policy orders_select on public.orders for select
  using (
    buyer_id = (select auth.uid())
    or seller_id = (select auth.uid())
    or public.is_admin()
  );
create policy order_items_select on public.order_items for select
  using (exists (select 1 from public.orders o where o.id = order_items.order_id));
create policy order_status_events_select on public.order_status_events for select
  using (exists (select 1 from public.orders o where o.id = order_status_events.order_id));

-- RLS helper must be callable by the roles whose policies use it
grant execute on function public.is_admin() to anon, authenticated;
