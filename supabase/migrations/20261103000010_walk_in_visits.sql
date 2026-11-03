-- Walk-ins are staff-recorded visits, separate from member accounts and POS sales.
create table public.walk_in_visits (
  id uuid primary key default gen_random_uuid(),
  full_name text not null check (char_length(btrim(full_name)) between 1 and 150),
  visit_date date not null,
  amount_centavos bigint not null check (amount_centavos between 0 and 9007199254740991),
  payment_method text check (payment_method is null or char_length(btrim(payment_method)) between 1 and 64),
  paid_at timestamptz,
  paid_by uuid references auth.users(id),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  check ((paid_at is null and paid_by is null and payment_method is null) or
         (paid_at is not null and paid_by is not null and payment_method is not null))
);

create index walk_in_visits_date_idx on public.walk_in_visits (visit_date desc, id);
alter table public.walk_in_visits enable row level security;
revoke all on public.walk_in_visits from public, anon, authenticated;
grant select on public.walk_in_visits to authenticated;
create policy staff_read_walk_ins on public.walk_in_visits for select to authenticated
  using ((select kmax_private.is_active_staff()));

create function kmax_private.create_walk_in_visit(
  p_idempotency_key uuid, p_full_name text, p_visit_date date,
  p_amount_centavos bigint, p_paid boolean, p_payment_method text default null
) returns uuid language plpgsql security definer set search_path = ''
as $$
declare v_actor uuid := auth.uid(); v_id uuid; v_new boolean; v_method text := nullif(btrim(p_payment_method), '');
begin
  if not kmax_private.is_active_staff() then raise exception 'Staff access required' using errcode = '42501'; end if;
  if p_idempotency_key is null or p_full_name is null or char_length(btrim(p_full_name)) not between 1 and 150
    or p_visit_date is null or p_amount_centavos is null or p_amount_centavos not between 0 and 9007199254740991
    or p_paid is null or (p_paid and (v_method is null or char_length(v_method) > 64))
    or (not p_paid and v_method is not null) then
    raise exception 'Provide a name, visit date, amount and valid payment details';
  end if;
  select c.result_id, c.is_new into v_id, v_new from kmax_private.claim_request(
    'create_walk_in', p_idempotency_key, jsonb_build_object('name', btrim(p_full_name), 'date', p_visit_date,
      'amount', p_amount_centavos, 'paid', p_paid, 'method', v_method), gen_random_uuid()) c;
  if not v_new then return v_id; end if;
  insert into public.walk_in_visits(id, full_name, visit_date, amount_centavos, payment_method, paid_at, paid_by, created_by)
    values (v_id, btrim(p_full_name), p_visit_date, p_amount_centavos, v_method,
      case when p_paid then now() else null end, case when p_paid then v_actor else null end, v_actor);
  return v_id;
end;
$$;

create function kmax_private.pay_walk_in_visit(p_idempotency_key uuid, p_visit_id uuid, p_payment_method text)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare v_actor uuid := auth.uid(); v_id uuid; v_new boolean; v_method text := nullif(btrim(p_payment_method), '');
begin
  if not kmax_private.is_active_staff() then raise exception 'Staff access required' using errcode = '42501'; end if;
  if p_idempotency_key is null or p_visit_id is null or v_method is null or char_length(v_method) > 64 then
    raise exception 'Provide a visit and payment method';
  end if;
  select c.result_id, c.is_new into v_id, v_new from kmax_private.claim_request(
    'pay_walk_in', p_idempotency_key, jsonb_build_object('visit', p_visit_id, 'method', v_method), p_visit_id) c;
  if not v_new then return v_id; end if;
  update public.walk_in_visits set payment_method = v_method, paid_at = now(), paid_by = v_actor
    where id = p_visit_id and paid_at is null;
  if not found then raise exception 'Visit is unavailable or already paid'; end if;
  return p_visit_id;
end;
$$;

revoke all on function kmax_private.create_walk_in_visit(uuid, text, date, bigint, boolean, text) from public, anon, authenticated;
revoke all on function kmax_private.pay_walk_in_visit(uuid, uuid, text) from public, anon, authenticated;
grant execute on function kmax_private.create_walk_in_visit(uuid, text, date, bigint, boolean, text) to authenticated;
grant execute on function kmax_private.pay_walk_in_visit(uuid, uuid, text) to authenticated;

create function public.create_walk_in_visit(
  p_idempotency_key uuid, p_full_name text, p_visit_date date,
  p_amount_centavos bigint, p_paid boolean, p_payment_method text default null
) returns uuid language sql security invoker set search_path = ''
as $$ select kmax_private.create_walk_in_visit(p_idempotency_key, p_full_name, p_visit_date, p_amount_centavos, p_paid, p_payment_method); $$;
create function public.pay_walk_in_visit(p_idempotency_key uuid, p_visit_id uuid, p_payment_method text)
returns uuid language sql security invoker set search_path = ''
as $$ select kmax_private.pay_walk_in_visit(p_idempotency_key, p_visit_id, p_payment_method); $$;
revoke all on function public.create_walk_in_visit(uuid, text, date, bigint, boolean, text) from public, anon, authenticated;
revoke all on function public.pay_walk_in_visit(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.create_walk_in_visit(uuid, text, date, bigint, boolean, text) to authenticated;
grant execute on function public.pay_walk_in_visit(uuid, uuid, text) to authenticated;
