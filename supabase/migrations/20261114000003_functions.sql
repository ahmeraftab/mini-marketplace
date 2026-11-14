-- 03 Functions: the ONLY write paths, plus search and facets.
--
-- Conventions
--   * security definer functions set search_path = '' and schema-qualify everything.
--   * Errors are raised as 'CODE: human message' so the app can show them.
--   * Execute rights are revoked from everyone and granted back one by one at the bottom.

-- ------------------------------------------------------------- new users --

-- Runs when someone signs up. The role is read from sign-up metadata but ONLY
-- 'seller' is honoured; anything else (including 'admin') becomes 'buyer', so
-- nobody can sign themselves up as an admin.
create function public.handle_new_user() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_meta  jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_role  public.user_role;
  v_name  text;
  v_shop  text;
begin
  v_role := case when v_meta->>'role' = 'seller' then 'seller'::public.user_role
                 else 'buyer'::public.user_role end;
  v_name := left(btrim(coalesce(v_meta->>'full_name', '')), 120);

  insert into public.profiles (id, role, full_name, email)
  values (new.id, v_role, v_name, coalesce(new.email, ''));

  if v_role = 'seller' then
    v_shop := left(btrim(coalesce(nullif(v_meta->>'shop_name', ''), nullif(v_name, ''), '')), 80);
    if char_length(v_shop) < 2 then
      v_shop := 'Shop ' || left(new.id::text, 6);
    end if;
    insert into public.sellers (id, shop_name) values (new.id, v_shop);
  end if;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ------------------------------------------------------------------ misc --

create function public.slugify(p_text text) returns text
language sql
immutable
set search_path = ''
as $$
  select trim(both '-' from left(
    trim(both '-' from regexp_replace(lower(coalesce(p_text, '')), '[^a-z0-9]+', '-', 'g')),
    80));
$$;

-- ---------------------------------------------------------- save_product --

-- Create or update a listing and ALL its children (colours, images, option
-- groups and values, add-ons) in one transaction.
--
-- Children are replaced rather than diffed: it is atomic, it cannot be tricked
-- into touching another product's rows (a clashing id just fails the primary
-- key and rolls everything back), and it avoids transient uniqueness clashes
-- when options are renamed or reordered. Ids are chosen by the browser and kept,
-- so basket lines keep pointing at the same options after an edit.
--
-- Payload (jsonb):
--   { id?, category_id, description, base_price_pence, compare_at_price_pence?,
--     submit,                        -- true = send for approval, false = keep as draft
--     colours: [{id, name, hex, title}],          -- first one is the main colour
--     images:  [{id, colour_id?, storage_path, alt, width, height}],
--     groups:  [{id, name, is_filterable, values: [{id, label, price_delta_pence, is_default}]}],
--     addons:  [{id, label, price_pence}] }
create function public.save_product(p_payload jsonb) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid             uuid := (select auth.uid());
  v_seller_status   public.seller_status;
  v_id              uuid;
  v_owner           uuid;
  v_existing_status public.listing_status;
  v_status          public.listing_status;
  v_title           text;
  v_slug            text;
  v_base            integer;
  v_compare         integer;
  v_category        uuid;
  v_description     text;
  v_submit          boolean;
  v_colours         jsonb;
  v_images          jsonb;
  v_groups          jsonb;
  v_addons          jsonb;
  v_el              jsonb;
  v_val             jsonb;
  v_ord             integer;
  v_ord2            integer;
  v_colour_ids      uuid[] := '{}';
  v_names           text[];
  v_labels          text[];
  v_group_names     text[] := '{}';
  v_defaults        integer;
  v_text            text;
  v_colour_ref      uuid;
begin
  if v_uid is null then
    raise exception 'NOT_SIGNED_IN: sign in first' using errcode = '28000';
  end if;

  select s.status into v_seller_status from public.sellers s where s.id = v_uid;
  if not found then
    raise exception 'FORBIDDEN: only seller accounts can save listings' using errcode = '42501';
  end if;
  if v_seller_status = 'hidden' then
    raise exception 'FORBIDDEN: your shop has been hidden by an administrator' using errcode = '42501';
  end if;

  if p_payload is null or jsonb_typeof(p_payload) <> 'object' then
    raise exception 'VALIDATION: the listing data is not valid';
  end if;

  v_id          := coalesce(nullif(p_payload->>'id', '')::uuid, gen_random_uuid());
  v_colours     := coalesce(p_payload->'colours', '[]'::jsonb);
  v_images      := coalesce(p_payload->'images',  '[]'::jsonb);
  v_groups      := coalesce(p_payload->'groups',  '[]'::jsonb);
  v_addons      := coalesce(p_payload->'addons',  '[]'::jsonb);
  v_description := coalesce(p_payload->>'description', '');
  v_submit      := coalesce((p_payload->>'submit')::boolean, false);
  v_category    := nullif(p_payload->>'category_id', '')::uuid;
  v_base        := (p_payload->>'base_price_pence')::integer;
  v_compare     := nullif(p_payload->>'compare_at_price_pence', '')::integer;

  if jsonb_typeof(v_colours) <> 'array' or jsonb_typeof(v_images) <> 'array'
     or jsonb_typeof(v_groups) <> 'array' or jsonb_typeof(v_addons) <> 'array' then
    raise exception 'VALIDATION: the listing data is not valid';
  end if;

  -- scalar fields
  if v_category is null or not exists (select 1 from public.categories c where c.id = v_category) then
    raise exception 'VALIDATION: choose a category';
  end if;
  if v_base is null or v_base < 0 or v_base > 100000000 then
    raise exception 'VALIDATION: the base price must be between £0.00 and £1,000,000.00';
  end if;
  if v_compare is not null and (v_compare <= v_base or v_compare > 100000000) then
    raise exception 'VALIDATION: the compare-at price must be higher than the base price';
  end if;
  if char_length(v_description) > 4000 then
    raise exception 'VALIDATION: the description is too long (4000 characters at most)';
  end if;

  -- collection sizes
  if jsonb_array_length(v_colours) < 1 or jsonb_array_length(v_colours) > 20 then
    raise exception 'VALIDATION: add between 1 and 20 colours';
  end if;
  if jsonb_array_length(v_groups) > 10 then
    raise exception 'VALIDATION: at most 10 option groups';
  end if;
  if jsonb_array_length(v_addons) > 10 then
    raise exception 'VALIDATION: at most 10 add-ons';
  end if;
  if jsonb_array_length(v_images) > 40 then
    raise exception 'VALIDATION: at most 40 photos';
  end if;
  if v_submit and jsonb_array_length(v_images) = 0 then
    raise exception 'VALIDATION: add at least one photo before sending for approval';
  end if;

  -- colours
  v_names := '{}';
  for v_el in select e.elem from jsonb_array_elements(v_colours) as e(elem) loop
    v_text := btrim(coalesce(v_el->>'name', ''));
    if char_length(v_text) not between 1 and 60 then
      raise exception 'VALIDATION: each colour needs a name (60 characters at most)';
    end if;
    if lower(v_text) = any (v_names) then
      raise exception 'VALIDATION: the colour "%" is listed twice', v_text;
    end if;
    v_names := v_names || lower(v_text);
    if coalesce(v_el->>'hex', '') !~ '^#[0-9A-Fa-f]{6}$' then
      raise exception 'VALIDATION: colour "%" needs a hex value like #E8DFCF', v_text;
    end if;
    if char_length(btrim(coalesce(v_el->>'title', ''))) not between 3 and 140 then
      raise exception 'VALIDATION: colour "%" needs a title of 3 to 140 characters', v_text;
    end if;
    if v_el->>'id' is null then
      raise exception 'VALIDATION: the listing data is not valid';
    end if;
    v_colour_ids := v_colour_ids || (v_el->>'id')::uuid;
  end loop;
  v_title := btrim(v_colours->0->>'title');

  -- option groups and values
  for v_el in select e.elem from jsonb_array_elements(v_groups) as e(elem) loop
    v_text := btrim(coalesce(v_el->>'name', ''));
    if char_length(v_text) not between 1 and 40 then
      raise exception 'VALIDATION: each option group needs a name (40 characters at most)';
    end if;
    if lower(v_text) = any (v_group_names) then
      raise exception 'VALIDATION: the option group "%" is listed twice', v_text;
    end if;
    v_group_names := v_group_names || lower(v_text);
    if v_el->>'id' is null or jsonb_typeof(v_el->'values') <> 'array' then
      raise exception 'VALIDATION: the listing data is not valid';
    end if;
    if jsonb_array_length(v_el->'values') < 1 or jsonb_array_length(v_el->'values') > 30 then
      raise exception 'VALIDATION: option group "%" needs between 1 and 30 choices', v_text;
    end if;
    v_labels := '{}';
    v_defaults := 0;
    for v_val in select e2.elem from jsonb_array_elements(v_el->'values') as e2(elem) loop
      if char_length(btrim(coalesce(v_val->>'label', ''))) not between 1 and 80 then
        raise exception 'VALIDATION: each choice in "%" needs a label (80 characters at most)', v_text;
      end if;
      if lower(btrim(v_val->>'label')) = any (v_labels) then
        raise exception 'VALIDATION: "%" is listed twice in "%"', btrim(v_val->>'label'), v_text;
      end if;
      v_labels := v_labels || lower(btrim(v_val->>'label'));
      if (v_val->>'price_delta_pence') is null
         or (v_val->>'price_delta_pence')::integer < 0
         or (v_val->>'price_delta_pence')::integer > 100000000 then
        raise exception 'VALIDATION: the extra price for "%" must be zero or more', btrim(v_val->>'label');
      end if;
      if v_val->>'id' is null then
        raise exception 'VALIDATION: the listing data is not valid';
      end if;
      if coalesce((v_val->>'is_default')::boolean, false) then
        v_defaults := v_defaults + 1;
      end if;
    end loop;
    if v_defaults > 1 then
      raise exception 'VALIDATION: option group "%" has more than one default', v_text;
    end if;
  end loop;

  -- add-ons
  v_names := '{}';
  for v_el in select e.elem from jsonb_array_elements(v_addons) as e(elem) loop
    v_text := btrim(coalesce(v_el->>'label', ''));
    if char_length(v_text) not between 1 and 80 then
      raise exception 'VALIDATION: each add-on needs a label (80 characters at most)';
    end if;
    if lower(v_text) = any (v_names) then
      raise exception 'VALIDATION: the add-on "%" is listed twice', v_text;
    end if;
    v_names := v_names || lower(v_text);
    if (v_el->>'price_pence') is null
       or (v_el->>'price_pence')::integer < 0
       or (v_el->>'price_pence')::integer > 100000000 then
      raise exception 'VALIDATION: the price of add-on "%" must be zero or more', v_text;
    end if;
    if v_el->>'id' is null then
      raise exception 'VALIDATION: the listing data is not valid';
    end if;
  end loop;

  -- images: may only point into the caller's own storage folder
  for v_el in select e.elem from jsonb_array_elements(v_images) as e(elem) loop
    v_text := v_el->>'storage_path';
    if v_text is null or position((v_uid::text || '/') in v_text) <> 1 or v_text like '%..%' then
      raise exception 'VALIDATION: a photo is not stored in your own folder';
    end if;
    v_colour_ref := nullif(v_el->>'colour_id', '')::uuid;
    if v_colour_ref is not null and not (v_colour_ref = any (v_colour_ids)) then
      raise exception 'VALIDATION: a photo is assigned to a colour that does not exist';
    end if;
    if v_el->>'id' is null then
      raise exception 'VALIDATION: the listing data is not valid';
    end if;
  end loop;

  -- the product row
  select p.seller_id, p.status into v_owner, v_existing_status
  from public.products p where p.id = v_id for update;

  if found then
    if v_owner <> v_uid then
      raise exception 'FORBIDDEN: this listing belongs to another seller' using errcode = '42501';
    end if;
    -- a seller may only move between draft and pending; approved/hidden are the admin's call
    if v_existing_status in ('approved', 'hidden') then
      v_status := v_existing_status;
    elsif v_submit then
      v_status := 'pending';
    else
      v_status := 'draft';
    end if;

    update public.products set
      category_id            = v_category,
      title                  = v_title,
      description            = v_description,
      base_price_pence       = v_base,
      compare_at_price_pence = v_compare,
      status                 = v_status
    where id = v_id;

    delete from public.product_images where product_id = v_id;
    delete from public.product_colours where product_id = v_id;
    delete from public.option_groups where product_id = v_id;   -- cascades to option_values
    delete from public.product_addons where product_id = v_id;
  else
    v_status := case when v_submit then 'pending'::public.listing_status
                     else 'draft'::public.listing_status end;
    v_slug := public.slugify(v_title);
    if v_slug = '' then v_slug := 'product'; end if;
    if exists (select 1 from public.products p where p.slug = v_slug) then
      v_slug := left(v_slug, 70) || '-' || left(replace(v_id::text, '-', ''), 6);
    end if;

    insert into public.products
      (id, seller_id, category_id, title, slug, description,
       base_price_pence, compare_at_price_pence, status)
    values
      (v_id, v_uid, v_category, v_title, v_slug, v_description,
       v_base, v_compare, v_status);
  end if;

  -- children
  for v_el, v_ord in
    select e.elem, (e.ord - 1)::integer
    from jsonb_array_elements(v_colours) with ordinality as e(elem, ord)
  loop
    insert into public.product_colours (id, product_id, name, hex, title, position)
    values ((v_el->>'id')::uuid, v_id, btrim(v_el->>'name'), v_el->>'hex',
            btrim(v_el->>'title'), v_ord);
  end loop;

  for v_el, v_ord in
    select e.elem, (e.ord - 1)::integer
    from jsonb_array_elements(v_images) with ordinality as e(elem, ord)
  loop
    insert into public.product_images
      (id, product_id, colour_id, storage_path, alt, width, height, position)
    values
      ((v_el->>'id')::uuid, v_id, nullif(v_el->>'colour_id', '')::uuid,
       v_el->>'storage_path', left(coalesce(v_el->>'alt', ''), 200),
       nullif(v_el->>'width', '')::integer, nullif(v_el->>'height', '')::integer, v_ord);
  end loop;

  for v_el, v_ord in
    select e.elem, (e.ord - 1)::integer
    from jsonb_array_elements(v_groups) with ordinality as e(elem, ord)
  loop
    insert into public.option_groups (id, product_id, name, position, is_filterable)
    values ((v_el->>'id')::uuid, v_id, btrim(v_el->>'name'), v_ord,
            coalesce((v_el->>'is_filterable')::boolean, false));

    for v_val, v_ord2 in
      select e2.elem, (e2.ord - 1)::integer
      from jsonb_array_elements(v_el->'values') with ordinality as e2(elem, ord)
    loop
      insert into public.option_values
        (id, group_id, label, price_delta_pence, position, is_default)
      values
        ((v_val->>'id')::uuid, (v_el->>'id')::uuid, btrim(v_val->>'label'),
         (v_val->>'price_delta_pence')::integer, v_ord2,
         coalesce((v_val->>'is_default')::boolean, false));
    end loop;
  end loop;

  for v_el, v_ord in
    select e.elem, (e.ord - 1)::integer
    from jsonb_array_elements(v_addons) with ordinality as e(elem, ord)
  loop
    insert into public.product_addons (id, product_id, label, price_pence, position)
    values ((v_el->>'id')::uuid, v_id, btrim(v_el->>'label'),
            (v_el->>'price_pence')::integer, v_ord);
  end loop;

  return v_id;
end;
$$;

create function public.delete_product(p_id uuid) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid   uuid := (select auth.uid());
  v_owner uuid;
begin
  if v_uid is null then
    raise exception 'NOT_SIGNED_IN: sign in first' using errcode = '28000';
  end if;
  select p.seller_id into v_owner from public.products p where p.id = p_id;
  if not found then
    raise exception 'NOT_FOUND: that listing no longer exists';
  end if;
  if v_owner <> v_uid and not public.is_admin() then
    raise exception 'FORBIDDEN: you cannot delete this listing' using errcode = '42501';
  end if;
  -- past orders keep their snapshots (order_items.product_id becomes null)
  delete from public.products where id = p_id;
end;
$$;

-- ----------------------------------------------------------- create_orders --

-- Called ONLY by the checkout server action (service role), after it has
-- recomputed every price from the database. One order per seller. Idempotent:
-- calling again with the same checkout_id returns the orders already created.
--
-- Payload: { checkout_id, shipping: {name, phone, line1, line2, city, postcode},
--            lines: [{ product_id, seller_id, title, colour_name, colour_hex, image_path,
--                      options:[{group,value,price_delta_pence}], addons:[{label,price_pence}],
--                      unit_price_pence, quantity, line_total_pence }] }
create function public.create_orders(p_buyer_id uuid, p_payload jsonb) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_checkout   uuid := nullif(p_payload->>'checkout_id', '')::uuid;
  v_ship       jsonb := p_payload->'shipping';
  v_lines      jsonb := p_payload->'lines';
  v_existing   jsonb;
  v_seller     uuid;
  v_order_id   uuid;
  v_number     text;
  v_line       jsonb;
  v_pos        integer;
  v_subtotal   bigint;
  v_result     jsonb := '[]'::jsonb;
begin
  if p_buyer_id is null or v_checkout is null then
    raise exception 'VALIDATION: missing buyer or checkout id';
  end if;
  if not exists (select 1 from public.profiles p where p.id = p_buyer_id) then
    raise exception 'VALIDATION: unknown buyer';
  end if;
  if v_ship is null or jsonb_typeof(v_ship) <> 'object' then
    raise exception 'VALIDATION: missing delivery details';
  end if;
  if v_lines is null or jsonb_typeof(v_lines) <> 'array'
     or jsonb_array_length(v_lines) < 1 or jsonb_array_length(v_lines) > 50 then
    raise exception 'VALIDATION: the basket must have between 1 and 50 lines';
  end if;

  -- serialise concurrent submissions of the same checkout
  perform pg_advisory_xact_lock(hashtextextended(v_checkout::text, 0));

  select coalesce(jsonb_agg(jsonb_build_object(
           'id', o.id, 'order_number', o.order_number,
           'seller_id', o.seller_id, 'total_pence', o.total_pence)
         order by o.created_at, o.order_number), '[]'::jsonb)
    into v_existing
  from public.orders o
  where o.checkout_id = v_checkout and o.buyer_id = p_buyer_id;
  if jsonb_array_length(v_existing) > 0 then
    return v_existing;
  end if;

  -- validate every line before writing anything
  for v_line in select e.elem from jsonb_array_elements(v_lines) as e(elem) loop
    if (v_line->>'quantity')::integer not between 1 and 10 then
      raise exception 'VALIDATION: quantity must be between 1 and 10';
    end if;
    if (v_line->>'unit_price_pence')::integer * (v_line->>'quantity')::integer
       <> (v_line->>'line_total_pence')::integer then
      raise exception 'VALIDATION: a line total does not match its unit price';
    end if;
    if not exists (
      select 1 from public.sellers s
      where s.id = (v_line->>'seller_id')::uuid and s.status = 'approved'
    ) then
      raise exception 'ITEM_UNAVAILABLE: "%" is no longer available', v_line->>'title';
    end if;
  end loop;

  for v_seller in
    select distinct (e.elem->>'seller_id')::uuid
    from jsonb_array_elements(v_lines) as e(elem)
    order by 1
  loop
    select coalesce(sum((e.elem->>'line_total_pence')::bigint), 0) into v_subtotal
    from jsonb_array_elements(v_lines) as e(elem)
    where (e.elem->>'seller_id')::uuid = v_seller;
    if v_subtotal > 2000000000 then
      raise exception 'VALIDATION: order total is too large';
    end if;

    insert into public.orders
      (checkout_id, buyer_id, seller_id, subtotal_pence, total_pence,
       shipping_name, shipping_phone, shipping_line1, shipping_line2,
       shipping_city, shipping_postcode)
    values
      (v_checkout, p_buyer_id, v_seller, v_subtotal::integer, v_subtotal::integer,
       btrim(coalesce(v_ship->>'name', '')), btrim(coalesce(v_ship->>'phone', '')),
       btrim(coalesce(v_ship->>'line1', '')), btrim(coalesce(v_ship->>'line2', '')),
       btrim(coalesce(v_ship->>'city', '')), btrim(coalesce(v_ship->>'postcode', '')))
    returning id, order_number into v_order_id, v_number;

    insert into public.order_status_events (order_id, status, changed_by)
    values (v_order_id, 'new', p_buyer_id);

    v_pos := 0;
    for v_line in
      select e.elem from jsonb_array_elements(v_lines) as e(elem)
      where (e.elem->>'seller_id')::uuid = v_seller
    loop
      insert into public.order_items
        (order_id, product_id, title, colour_name, colour_hex, image_path,
         options, addons, unit_price_pence, quantity, line_total_pence, position)
      values
        (v_order_id, nullif(v_line->>'product_id', '')::uuid, v_line->>'title',
         v_line->>'colour_name', coalesce(v_line->>'colour_hex', '#CCCCCC'),
         nullif(v_line->>'image_path', ''),
         coalesce(v_line->'options', '[]'::jsonb), coalesce(v_line->'addons', '[]'::jsonb),
         (v_line->>'unit_price_pence')::integer, (v_line->>'quantity')::integer,
         (v_line->>'line_total_pence')::integer, v_pos);
      v_pos := v_pos + 1;
    end loop;

    v_result := v_result || jsonb_build_object(
      'id', v_order_id, 'order_number', v_number,
      'seller_id', v_seller, 'total_pence', v_subtotal::integer);
  end loop;

  return v_result;
end;
$$;

-- --------------------------------------------------------- order status --

create function public.set_order_status(p_order_id uuid, p_status public.order_status) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid     uuid := (select auth.uid());
  v_seller  uuid;
  v_current public.order_status;
begin
  if v_uid is null then
    raise exception 'NOT_SIGNED_IN: sign in first' using errcode = '28000';
  end if;

  select o.seller_id, o.status into v_seller, v_current
  from public.orders o where o.id = p_order_id for update;
  if not found then
    raise exception 'NOT_FOUND: that order does not exist';
  end if;
  if v_seller <> v_uid and not public.is_admin() then
    raise exception 'FORBIDDEN: only the seller of this order can change its status'
      using errcode = '42501';
  end if;
  if v_current = p_status then
    return;
  end if;

  update public.orders set status = p_status where id = p_order_id;
  insert into public.order_status_events (order_id, status, changed_by)
  values (p_order_id, p_status, v_uid);
end;
$$;

-- ----------------------------------------------------------------- admin --

create function public.admin_set_seller_status(p_seller_id uuid, p_status public.seller_status) returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null or not public.is_admin() then
    raise exception 'FORBIDDEN: administrators only' using errcode = '42501';
  end if;
  update public.sellers
     set status = p_status, reviewed_at = now(), reviewed_by = (select auth.uid())
   where id = p_seller_id;
  if not found then
    raise exception 'NOT_FOUND: that seller does not exist';
  end if;
end;
$$;

create function public.admin_set_listing_status(p_product_id uuid, p_status public.listing_status) returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null or not public.is_admin() then
    raise exception 'FORBIDDEN: administrators only' using errcode = '42501';
  end if;
  if p_status = 'draft' then
    raise exception 'VALIDATION: a listing cannot be moved back to draft by an administrator';
  end if;
  update public.products set status = p_status where id = p_product_id;
  if not found then
    raise exception 'NOT_FOUND: that listing does not exist';
  end if;
end;
$$;

-- ---------------------------------------------------------------- search --

-- Ids of publicly visible listings matching the filters. security invoker, so
-- RLS still applies; the explicit status checks keep a seller's own drafts out
-- of the shop even when that seller is the one searching.
create function public.search_products(
  p_q          text    default null,
  p_category   uuid    default null,
  p_colours    text[]  default null,
  p_sizes      text[]  default null,
  p_min_pence  integer default null,
  p_max_pence  integer default null
) returns table (id uuid)
language sql
stable
security invoker
set search_path = ''
as $$
  select p.id
  from public.products p
  join public.sellers s on s.id = p.seller_id
  join public.categories cat on cat.id = p.category_id
  cross join (
    select case when nullif(btrim(coalesce(p_q, '')), '') is null then null
                else '%' || replace(replace(replace(btrim(p_q), '\', '\\'), '%', '\%'), '_', '\_') || '%'
           end as pat
  ) q
  where p.status = 'approved'
    and s.status = 'approved'
    and (
      q.pat is null
      or p.title ilike q.pat
      or p.description ilike q.pat
      or s.shop_name ilike q.pat
      or cat.name ilike q.pat
      or exists (
        select 1 from public.product_colours c
        where c.product_id = p.id and (c.name ilike q.pat or c.title ilike q.pat)
      )
    )
    and (
      p_category is null
      or p.category_id = p_category
      or cat.parent_id = p_category
    )
    and (
      p_colours is null or cardinality(p_colours) = 0
      or exists (
        select 1 from public.product_colours c
        where c.product_id = p.id and c.name = any (p_colours)
      )
    )
    and (
      p_sizes is null or cardinality(p_sizes) = 0
      or exists (
        select 1
        from public.option_groups g
        join public.option_values v on v.group_id = g.id
        where g.product_id = p.id and g.is_filterable and v.label = any (p_sizes)
      )
    )
    and (p_min_pence is null or p.base_price_pence >= p_min_pence)
    and (p_max_pence is null or p.base_price_pence <= p_max_pence)
  order by p.created_at desc, p.id
  limit 200;
$$;

-- Everything the filter panel needs, built from the data so nothing is hard-coded.
create function public.catalog_facets() returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  with visible as (
    select p.id, p.base_price_pence
    from public.products p
    join public.sellers s on s.id = p.seller_id
    where p.status = 'approved' and s.status = 'approved'
  )
  select jsonb_build_object(
    'categories', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', c.id, 'name', c.name, 'slug', c.slug, 'parent_id', c.parent_id)
             order by c.position, c.name)
      from public.categories c), '[]'::jsonb),
    'colours', coalesce((
      select jsonb_agg(jsonb_build_object('name', x.name, 'hex', x.hex) order by x.name)
      from (
        select distinct on (lower(c.name)) c.name, c.hex
        from public.product_colours c
        join visible v on v.id = c.product_id
        order by lower(c.name), c.position
      ) x), '[]'::jsonb),
    'sizes', coalesce((
      select jsonb_agg(z.label order by z.cheapest, z.label)
      from (
        select ov.label, min(ov.price_delta_pence) as cheapest
        from public.option_groups g
        join public.option_values ov on ov.group_id = g.id
        join visible v on v.id = g.product_id
        where g.is_filterable
        group by ov.label
      ) z), '[]'::jsonb),
    'min_pence', (select min(base_price_pence) from visible),
    'max_pence', (select max(base_price_pence) from visible)
  );
$$;

-- ------------------------------------------------------------- execute rights --

revoke all on all functions in schema public from public, anon, authenticated;

grant execute on function public.is_admin() to anon, authenticated;
grant execute on function public.save_product(jsonb) to authenticated;
grant execute on function public.delete_product(uuid) to authenticated;
grant execute on function public.set_order_status(uuid, public.order_status) to authenticated;
grant execute on function public.admin_set_seller_status(uuid, public.seller_status) to authenticated;
grant execute on function public.admin_set_listing_status(uuid, public.listing_status) to authenticated;
grant execute on function public.search_products(text, uuid, text[], text[], integer, integer) to anon, authenticated;
grant execute on function public.catalog_facets() to anon, authenticated;
grant execute on function public.create_orders(uuid, jsonb) to service_role;
