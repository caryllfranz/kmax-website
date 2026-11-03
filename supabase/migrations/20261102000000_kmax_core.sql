-- KMAX staff-only operational foundation. Business rules remain subject to owner approval.
-- No member authentication, bookings, attendee lists, refunds, or payment integration.

create schema if not exists kmax_private;
revoke all on schema kmax_private from public, anon, authenticated;
grant usage on schema kmax_private to authenticated;

create table public.staff_profiles (
  user_id uuid primary key references auth.users(id),
  display_name text not null check (char_length(btrim(display_name)) between 1 and 120),
  role text not null check (role in ('admin', 'staff')),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- The profile allowlist is deliberately provisioned by a trusted administrator.
create function kmax_private.is_active_staff()
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.staff_profiles
    where user_id = (select auth.uid()) and active
  );
$$;
revoke all on function kmax_private.is_active_staff() from public, anon, authenticated;
grant execute on function kmax_private.is_active_staff() to authenticated;

create table public.members (
  id uuid primary key default gen_random_uuid(),
  full_name text not null check (char_length(btrim(full_name)) between 1 and 150),
  mobile text not null check (char_length(btrim(mobile)) between 1 and 32),
  archived boolean not null default false,
  created_by uuid not null default auth.uid() references auth.users(id),
  updated_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index members_mobile_idx on public.members (mobile);
create index members_name_idx on public.members (lower(full_name));

-- Renewals are new rows. Existing terms are immutable through the Data API.
create table public.membership_terms (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id),
  plan_name text check (plan_name is null or char_length(btrim(plan_name)) between 1 and 120),
  starts_on date not null,
  ends_on date not null check (ends_on >= starts_on),
  amount_paid_centavos bigint check (amount_paid_centavos between 0 and 9007199254740991),
  payment_method text check (payment_method is null or char_length(btrim(payment_method)) between 1 and 64),
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now()
);
create index membership_terms_member_end_idx on public.membership_terms (member_id, ends_on desc);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 150),
  sku text unique check (sku is null or char_length(btrim(sku)) between 1 and 64),
  price_centavos bigint not null check (price_centavos between 0 and 9007199254740991),
  stock_on_hand integer not null default 0 check (stock_on_hand >= 0),
  active boolean not null default true,
  created_by uuid not null default auth.uid() references auth.users(id),
  updated_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Only completed sales can commit: checkout and inventory changes are one transaction.
create table public.sales (
  id uuid primary key default gen_random_uuid(),
  idempotency_key uuid not null,
  request_items jsonb not null,
  payment_method text not null check (char_length(btrim(payment_method)) between 1 and 64),
  total_centavos bigint not null default 0 check (total_centavos between 0 and 9007199254740991),
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  unique (idempotency_key)
);
create index sales_created_at_idx on public.sales (created_at desc);

create table public.sale_items (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references public.sales(id),
  product_id uuid not null references public.products(id),
  product_name text not null,
  quantity integer not null check (quantity > 0),
  unit_price_centavos bigint not null check (unit_price_centavos between 0 and 9007199254740991),
  line_total_centavos bigint not null check (line_total_centavos between 0 and 9007199254740991),
  unique (sale_id, product_id)
);

create table public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id),
  quantity_change integer not null check (quantity_change <> 0),
  reason text not null check (char_length(btrim(reason)) between 1 and 500),
  sale_id uuid references public.sales(id),
  adjustment_key uuid,
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  unique (sale_id, product_id),
  unique (adjustment_key)
);
create index stock_movements_product_time_idx on public.stock_movements (product_id, created_at desc);

create table public.schedule_entries (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(btrim(title)) between 1 and 150),
  category text not null check (category in ('group_class', 'taekwondo', 'coaching')),
  description text,
  coach_name text,
  starts_at timestamptz not null,
  ends_at timestamptz check (ends_at is null or ends_at > starts_at),
  status text not null default 'draft' check (status in ('draft', 'published', 'cancelled')),
  created_by uuid not null default auth.uid() references auth.users(id),
  updated_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index schedule_entries_starts_at_idx on public.schedule_entries (starts_at);

-- Retry keys are globally unique; hashes avoid duplicating names or mobile numbers.
create table kmax_private.idempotency_requests (
  created_by uuid not null references auth.users(id),
  idempotency_key uuid not null,
  operation text not null,
  request_hash text not null,
  result_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (idempotency_key)
);
revoke all on kmax_private.idempotency_requests from public, anon, authenticated;

create function kmax_private.stamp_update()
returns trigger language plpgsql set search_path = ''
as $$
begin
  new.updated_at := now();
  new.updated_by := auth.uid();
  return new;
end;
$$;
revoke all on function kmax_private.stamp_update() from public, anon, authenticated;
create trigger members_stamp_update before update on public.members
  for each row execute function kmax_private.stamp_update();
create trigger products_stamp_update before update on public.products
  for each row execute function kmax_private.stamp_update();
create trigger schedule_entries_stamp_update before update on public.schedule_entries
  for each row execute function kmax_private.stamp_update();

alter table public.staff_profiles enable row level security;
alter table public.members enable row level security;
alter table public.membership_terms enable row level security;
alter table public.products enable row level security;
alter table public.sales enable row level security;
alter table public.sale_items enable row level security;
alter table public.stock_movements enable row level security;
alter table public.schedule_entries enable row level security;

revoke all on public.staff_profiles, public.members, public.membership_terms,
  public.products, public.sales, public.sale_items, public.stock_movements,
  public.schedule_entries from public, anon, authenticated;

grant select on public.staff_profiles, public.members, public.membership_terms,
  public.products, public.sales, public.sale_items, public.stock_movements,
  public.schedule_entries to authenticated;
grant update (full_name, mobile, archived) on public.members to authenticated;
grant update (name, sku, price_centavos, active) on public.products to authenticated;
grant update (title, category, description, coach_name, starts_at, ends_at, status)
  on public.schedule_entries to authenticated;
grant select (id, title, category, description, coach_name, starts_at, ends_at, status)
  on public.schedule_entries to anon;

create policy staff_read_own_profile on public.staff_profiles for select to authenticated
  using (user_id = (select auth.uid()) and active);
create policy staff_manage_members on public.members for all to authenticated
  using ((select kmax_private.is_active_staff())) with check ((select kmax_private.is_active_staff()));
create policy staff_read_terms on public.membership_terms for select to authenticated
  using ((select kmax_private.is_active_staff()));
create policy staff_manage_products on public.products for all to authenticated
  using ((select kmax_private.is_active_staff())) with check ((select kmax_private.is_active_staff()));
create policy staff_read_sales on public.sales for select to authenticated
  using ((select kmax_private.is_active_staff()));
create policy staff_read_sale_items on public.sale_items for select to authenticated
  using ((select kmax_private.is_active_staff()));
create policy staff_read_movements on public.stock_movements for select to authenticated
  using ((select kmax_private.is_active_staff()));
create policy public_read_published_schedule on public.schedule_entries for select to anon
  using (status = 'published');
create policy staff_manage_schedule on public.schedule_entries for all to authenticated
  using ((select kmax_private.is_active_staff())) with check ((select kmax_private.is_active_staff()));

-- Private definer functions are not exposed by PostgREST and always check the caller.
create function kmax_private.claim_request(p_operation text, p_key uuid, p_payload jsonb, p_result_id uuid)
returns table(result_id uuid, is_new boolean) language plpgsql set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_hash text;
  v_existing kmax_private.idempotency_requests%rowtype;
begin
  if p_key is null then raise exception 'An idempotency key is required'; end if;
  v_hash := pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(p_payload::text, 'UTF8')), 'hex');
  insert into kmax_private.idempotency_requests(created_by, idempotency_key, operation, request_hash, result_id)
    values (v_actor, p_key, p_operation, v_hash, p_result_id)
    on conflict (idempotency_key) do nothing returning * into v_existing;
  if found then return query select p_result_id, true; return; end if;
  select * into v_existing from kmax_private.idempotency_requests where idempotency_key = p_key;
  if v_existing.created_by <> v_actor or v_existing.operation <> p_operation or v_existing.request_hash <> v_hash then
    raise exception 'Idempotency key already used for another request';
  end if;
  return query select v_existing.result_id, false;
end;
$$;
revoke all on function kmax_private.claim_request(text, uuid, jsonb, uuid) from public, anon, authenticated;

create function kmax_private.create_member_with_term(
  p_idempotency_key uuid, p_full_name text, p_mobile text, p_starts_on date, p_ends_on date,
  p_plan_name text default null, p_amount_paid_centavos bigint default null, p_payment_method text default null
) returns uuid language plpgsql security definer set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_member_id uuid;
  v_new boolean;
begin
  if not kmax_private.is_active_staff() then raise exception 'Staff access required' using errcode = '42501'; end if;
  if p_idempotency_key is null or p_full_name is null or char_length(btrim(p_full_name)) not between 1 and 150
    or p_mobile is null or char_length(btrim(p_mobile)) not between 1 and 32
    or p_starts_on is null or p_ends_on is null or p_ends_on < p_starts_on then
    raise exception 'Provide a name, mobile number and valid membership dates';
  end if;
  select c.result_id, c.is_new into v_member_id, v_new from kmax_private.claim_request(
    'create_member', p_idempotency_key, jsonb_build_object('name', btrim(p_full_name), 'mobile', btrim(p_mobile),
      'start', p_starts_on, 'end', p_ends_on, 'plan', nullif(btrim(p_plan_name), ''),
      'amount', p_amount_paid_centavos, 'payment', nullif(btrim(p_payment_method), '')), gen_random_uuid()) c;
  if not v_new then return v_member_id; end if;
  insert into public.members(id, full_name, mobile, created_by, updated_by)
    values (v_member_id, btrim(p_full_name), btrim(p_mobile), v_actor, v_actor);
  insert into public.membership_terms(member_id, plan_name, starts_on, ends_on, amount_paid_centavos, payment_method, created_by)
    values (v_member_id, nullif(btrim(p_plan_name), ''), p_starts_on, p_ends_on,
      p_amount_paid_centavos, nullif(btrim(p_payment_method), ''), v_actor);
  return v_member_id;
end;
$$;

create function kmax_private.append_membership_term(
  p_idempotency_key uuid, p_member_id uuid, p_starts_on date, p_ends_on date,
  p_plan_name text default null, p_amount_paid_centavos bigint default null, p_payment_method text default null
) returns uuid language plpgsql security definer set search_path = ''
as $$
declare v_actor uuid := auth.uid(); v_term_id uuid; v_new boolean;
begin
  if not kmax_private.is_active_staff() then raise exception 'Staff access required' using errcode = '42501'; end if;
  if p_idempotency_key is null or p_member_id is null or p_starts_on is null or p_ends_on is null or p_ends_on < p_starts_on then
    raise exception 'Provide a member and valid membership dates';
  end if;
  select c.result_id, c.is_new into v_term_id, v_new from kmax_private.claim_request(
    'append_term', p_idempotency_key, jsonb_build_object('member', p_member_id, 'start', p_starts_on, 'end', p_ends_on,
      'plan', nullif(btrim(p_plan_name), ''), 'amount', p_amount_paid_centavos,
      'payment', nullif(btrim(p_payment_method), '')), gen_random_uuid()) c;
  if not v_new then return v_term_id; end if;
  insert into public.membership_terms(id, member_id, plan_name, starts_on, ends_on, amount_paid_centavos, payment_method, created_by)
    values (v_term_id, p_member_id, nullif(btrim(p_plan_name), ''), p_starts_on, p_ends_on,
      p_amount_paid_centavos, nullif(btrim(p_payment_method), ''), v_actor);
  return v_term_id;
end;
$$;

create function kmax_private.create_product_with_stock(
  p_idempotency_key uuid, p_name text, p_price_centavos bigint, p_initial_stock integer, p_sku text default null
) returns uuid language plpgsql security definer set search_path = ''
as $$
declare v_actor uuid := auth.uid(); v_product_id uuid; v_new boolean;
begin
  if not kmax_private.is_active_staff() then raise exception 'Staff access required' using errcode = '42501'; end if;
  if p_idempotency_key is null or p_name is null or char_length(btrim(p_name)) not between 1 and 150
    or p_price_centavos is null or p_price_centavos not between 0 and 9007199254740991
    or p_initial_stock is null or p_initial_stock < 0 then
    raise exception 'Provide a name, valid price and non-negative opening stock';
  end if;
  select c.result_id, c.is_new into v_product_id, v_new from kmax_private.claim_request(
    'create_product', p_idempotency_key, jsonb_build_object('name', btrim(p_name), 'price', p_price_centavos,
      'stock', p_initial_stock, 'sku', nullif(btrim(p_sku), '')), gen_random_uuid()) c;
  if not v_new then return v_product_id; end if;
  insert into public.products(id, name, sku, price_centavos, stock_on_hand, created_by, updated_by)
    values (v_product_id, btrim(p_name), nullif(btrim(p_sku), ''), p_price_centavos, p_initial_stock, v_actor, v_actor);
  if p_initial_stock > 0 then
    insert into public.stock_movements(product_id, quantity_change, reason, created_by)
      values (v_product_id, p_initial_stock, 'Opening stock', v_actor);
  end if;
  return v_product_id;
end;
$$;

create function kmax_private.create_schedule_entry(
  p_idempotency_key uuid, p_title text, p_category text, p_starts_at timestamptz,
  p_ends_at timestamptz default null, p_description text default null, p_coach_name text default null
) returns uuid language plpgsql security definer set search_path = ''
as $$
declare v_actor uuid := auth.uid(); v_entry_id uuid; v_new boolean;
begin
  if not kmax_private.is_active_staff() then raise exception 'Staff access required' using errcode = '42501'; end if;
  if p_idempotency_key is null or p_title is null or char_length(btrim(p_title)) not between 1 and 150
    or p_category not in ('group_class', 'taekwondo', 'coaching') or p_category is null
    or p_starts_at is null or (p_ends_at is not null and p_ends_at <= p_starts_at) then
    raise exception 'Provide a title, valid category and start time';
  end if;
  select c.result_id, c.is_new into v_entry_id, v_new from kmax_private.claim_request(
    'create_schedule', p_idempotency_key, jsonb_build_object('title', btrim(p_title), 'category', p_category,
      'start', p_starts_at, 'end', p_ends_at, 'description', nullif(btrim(p_description), ''),
      'coach', nullif(btrim(p_coach_name), '')), gen_random_uuid()) c;
  if not v_new then return v_entry_id; end if;
  insert into public.schedule_entries(id, title, category, starts_at, ends_at, description, coach_name, created_by, updated_by)
    values (v_entry_id, btrim(p_title), p_category, p_starts_at, p_ends_at,
      nullif(btrim(p_description), ''), nullif(btrim(p_coach_name), ''), v_actor, v_actor);
  return v_entry_id;
end;
$$;

create function kmax_private.record_stock_adjustment(
  p_product_id uuid, p_quantity_change integer, p_reason text, p_idempotency_key uuid
) returns uuid language plpgsql security definer set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_stock integer;
  v_movement_id uuid;
  v_new boolean;
begin
  if not kmax_private.is_active_staff() then raise exception 'Staff access required' using errcode = '42501'; end if;
  if p_product_id is null or p_idempotency_key is null or p_quantity_change is null or p_quantity_change = 0
    or p_reason is null or char_length(btrim(p_reason)) not between 1 and 500 then
    raise exception 'Provide a product, non-zero quantity, reason and idempotency key';
  end if;
  select c.result_id, c.is_new into v_movement_id, v_new from kmax_private.claim_request(
    'adjust_stock', p_idempotency_key, jsonb_build_object('product', p_product_id,
      'quantity', p_quantity_change, 'reason', btrim(p_reason)), gen_random_uuid()) c;
  if not v_new then return v_movement_id; end if;
  select stock_on_hand into v_stock from public.products where id = p_product_id for update;
  if not found then raise exception 'Product not found'; end if;
  if v_stock::bigint + p_quantity_change < 0 then raise exception 'Insufficient stock'; end if;
  update public.products set stock_on_hand = stock_on_hand + p_quantity_change where id = p_product_id;
  insert into public.stock_movements(id, product_id, quantity_change, reason, adjustment_key, created_by)
    values (v_movement_id, p_product_id, p_quantity_change, btrim(p_reason), p_idempotency_key, v_actor);
  return v_movement_id;
end;
$$;

create function kmax_private.complete_sale(p_idempotency_key uuid, p_payment_method text, p_items jsonb)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_sale_id uuid;
  v_item record;
  v_product public.products%rowtype;
  v_total bigint := 0;
  v_line_total numeric;
  v_count bigint;
  v_distinct bigint;
  v_valid boolean;
  v_new boolean;
begin
  if not kmax_private.is_active_staff() then raise exception 'Staff access required' using errcode = '42501'; end if;
  if p_idempotency_key is null or p_payment_method is null
    or char_length(btrim(p_payment_method)) not between 1 and 64
    or p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Provide a payment method, items and an idempotency key';
  end if;
  select count(*), count(distinct item.product_id), bool_and(item.product_id is not null and item.quantity is not null
    and item.quantity > 0 and item.expected_unit_price_centavos is not null
    and item.expected_unit_price_centavos between 0 and 9007199254740991)
    into v_count, v_distinct, v_valid
    from jsonb_to_recordset(p_items) as item(product_id uuid, quantity integer, expected_unit_price_centavos bigint);
  if v_count <> v_distinct or v_valid is distinct from true then
    raise exception 'Each item must have a unique product, positive quantity and expected price';
  end if;

  select c.result_id, c.is_new into v_sale_id, v_new from kmax_private.claim_request(
    'complete_sale', p_idempotency_key, jsonb_build_object('payment', btrim(p_payment_method), 'items', p_items), gen_random_uuid()) c;
  if not v_new then return v_sale_id; end if;
  insert into public.sales(id, idempotency_key, request_items, payment_method, created_by)
    values (v_sale_id, p_idempotency_key, p_items, btrim(p_payment_method), v_actor);

  -- All checkouts lock products in the same order to avoid deadlocks.
  for v_item in select item.product_id, item.quantity, item.expected_unit_price_centavos
    from jsonb_to_recordset(p_items) as item(product_id uuid, quantity integer, expected_unit_price_centavos bigint) order by item.product_id
  loop
    select * into v_product from public.products where id = v_item.product_id for update;
    if not found or not v_product.active then raise exception 'Product unavailable'; end if;
    if v_product.price_centavos <> v_item.expected_unit_price_centavos then raise exception 'Product price changed; refresh the cart'; end if;
    if v_product.stock_on_hand < v_item.quantity then raise exception 'Insufficient stock'; end if;
    v_line_total := v_product.price_centavos::numeric * v_item.quantity;
    if v_line_total > 9007199254740991 - v_total then raise exception 'Sale total exceeds supported limit'; end if;
    v_total := v_total + v_line_total::bigint;
    update public.products set stock_on_hand = stock_on_hand - v_item.quantity where id = v_product.id;
    insert into public.sale_items(sale_id, product_id, product_name, quantity, unit_price_centavos, line_total_centavos)
      values (v_sale_id, v_product.id, v_product.name, v_item.quantity, v_product.price_centavos, v_line_total::bigint);
    insert into public.stock_movements(product_id, quantity_change, reason, sale_id, created_by)
      values (v_product.id, -v_item.quantity, 'Counter sale', v_sale_id, v_actor);
  end loop;
  update public.sales set total_centavos = v_total where id = v_sale_id;
  return v_sale_id;
end;
$$;

revoke all on function kmax_private.create_member_with_term(uuid, text, text, date, date, text, bigint, text) from public, anon, authenticated;
revoke all on function kmax_private.append_membership_term(uuid, uuid, date, date, text, bigint, text) from public, anon, authenticated;
revoke all on function kmax_private.create_product_with_stock(uuid, text, bigint, integer, text) from public, anon, authenticated;
revoke all on function kmax_private.create_schedule_entry(uuid, text, text, timestamptz, timestamptz, text, text) from public, anon, authenticated;
revoke all on function kmax_private.record_stock_adjustment(uuid, integer, text, uuid) from public, anon, authenticated;
revoke all on function kmax_private.complete_sale(uuid, text, jsonb) from public, anon, authenticated;
grant execute on function kmax_private.create_member_with_term(uuid, text, text, date, date, text, bigint, text) to authenticated;
grant execute on function kmax_private.append_membership_term(uuid, uuid, date, date, text, bigint, text) to authenticated;
grant execute on function kmax_private.create_product_with_stock(uuid, text, bigint, integer, text) to authenticated;
grant execute on function kmax_private.create_schedule_entry(uuid, text, text, timestamptz, timestamptz, text, text) to authenticated;
grant execute on function kmax_private.record_stock_adjustment(uuid, integer, text, uuid) to authenticated;
grant execute on function kmax_private.complete_sale(uuid, text, jsonb) to authenticated;

-- Invoker wrappers expose only these checked operations to the Data API.
create function public.create_member_with_term(
  p_idempotency_key uuid, p_full_name text, p_mobile text, p_starts_on date, p_ends_on date,
  p_plan_name text default null, p_amount_paid_centavos bigint default null, p_payment_method text default null
) returns uuid language sql security invoker set search_path = ''
as $$ select kmax_private.create_member_with_term(p_idempotency_key, p_full_name, p_mobile, p_starts_on, p_ends_on, p_plan_name, p_amount_paid_centavos, p_payment_method); $$;
create function public.append_membership_term(
  p_idempotency_key uuid, p_member_id uuid, p_starts_on date, p_ends_on date,
  p_plan_name text default null, p_amount_paid_centavos bigint default null, p_payment_method text default null
) returns uuid language sql security invoker set search_path = ''
as $$ select kmax_private.append_membership_term(p_idempotency_key, p_member_id, p_starts_on, p_ends_on, p_plan_name, p_amount_paid_centavos, p_payment_method); $$;
create function public.create_product_with_stock(
  p_idempotency_key uuid, p_name text, p_price_centavos bigint, p_initial_stock integer, p_sku text default null
) returns uuid language sql security invoker set search_path = ''
as $$ select kmax_private.create_product_with_stock(p_idempotency_key, p_name, p_price_centavos, p_initial_stock, p_sku); $$;
create function public.create_schedule_entry(
  p_idempotency_key uuid, p_title text, p_category text, p_starts_at timestamptz,
  p_ends_at timestamptz default null, p_description text default null, p_coach_name text default null
) returns uuid language sql security invoker set search_path = ''
as $$ select kmax_private.create_schedule_entry(p_idempotency_key, p_title, p_category, p_starts_at, p_ends_at, p_description, p_coach_name); $$;
create function public.record_stock_adjustment(
  p_product_id uuid, p_quantity_change integer, p_reason text, p_idempotency_key uuid
) returns uuid language sql security invoker set search_path = ''
as $$ select kmax_private.record_stock_adjustment(p_product_id, p_quantity_change, p_reason, p_idempotency_key); $$;
create function public.complete_sale(p_idempotency_key uuid, p_payment_method text, p_items jsonb)
returns uuid language sql security invoker set search_path = ''
as $$ select kmax_private.complete_sale(p_idempotency_key, p_payment_method, p_items); $$;
revoke all on function public.create_member_with_term(uuid, text, text, date, date, text, bigint, text) from public, anon, authenticated;
revoke all on function public.append_membership_term(uuid, uuid, date, date, text, bigint, text) from public, anon, authenticated;
revoke all on function public.create_product_with_stock(uuid, text, bigint, integer, text) from public, anon, authenticated;
revoke all on function public.create_schedule_entry(uuid, text, text, timestamptz, timestamptz, text, text) from public, anon, authenticated;
revoke all on function public.record_stock_adjustment(uuid, integer, text, uuid) from public, anon, authenticated;
revoke all on function public.complete_sale(uuid, text, jsonb) from public, anon, authenticated;
grant execute on function public.create_member_with_term(uuid, text, text, date, date, text, bigint, text) to authenticated;
grant execute on function public.append_membership_term(uuid, uuid, date, date, text, bigint, text) to authenticated;
grant execute on function public.create_product_with_stock(uuid, text, bigint, integer, text) to authenticated;
grant execute on function public.create_schedule_entry(uuid, text, text, timestamptz, timestamptz, text, text) to authenticated;
grant execute on function public.record_stock_adjustment(uuid, integer, text, uuid) to authenticated;
grant execute on function public.complete_sale(uuid, text, jsonb) to authenticated;
