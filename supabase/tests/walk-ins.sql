-- Run only against a disposable database with the core and walk-in migrations applied.
\set ON_ERROR_STOP on
begin;
insert into auth.users(id) values ('91000000-0000-0000-0000-000000000001'), ('91000000-0000-0000-0000-000000000002');
insert into public.staff_profiles(user_id, display_name, role, active)
  values ('91000000-0000-0000-0000-000000000001', 'Test Staff', 'staff', true),
         ('91000000-0000-0000-0000-000000000002', 'Disabled Staff', 'staff', false);
set local role anon;
do $$ begin
  begin perform count(*) from public.walk_in_visits; raise exception 'Anonymous walk-in read allowed'; exception when insufficient_privilege then null; end;
  begin perform public.create_walk_in_visit(gen_random_uuid(), 'Sample', '2027-01-01', 10000, false, null); raise exception 'Anonymous write allowed'; exception when insufficient_privilege then null; end;
end $$;
reset role;
select set_config('request.jwt.claim.sub', '91000000-0000-0000-0000-000000000001', true);
set local role authenticated;
do $$
declare v_visit uuid; v_retry uuid; v_paid uuid; v_immediate uuid;
begin
  begin insert into public.walk_in_visits(full_name, visit_date, amount_centavos, created_by)
    values ('Bypass', '2027-01-01', 1, auth.uid()); raise exception 'Direct insert allowed'; exception when insufficient_privilege then null; end;
  v_visit := public.create_walk_in_visit('92000000-0000-0000-0000-000000000001', 'Sample Visitor', '2027-01-01', 10000, false, null);
  v_retry := public.create_walk_in_visit('92000000-0000-0000-0000-000000000001', 'Sample Visitor', '2027-01-01', 10000, false, null);
  if v_visit <> v_retry or (select count(*) from public.walk_in_visits where id = v_visit and paid_at is null) <> 1 then raise exception 'Unpaid visit retry failed'; end if;
  begin perform public.create_walk_in_visit('92000000-0000-0000-0000-000000000001', 'Different', '2027-01-01', 10000, false, null); raise exception 'Changed retry allowed'; exception when raise_exception then if sqlerrm <> 'Idempotency key already used for another request' then raise; end if; end;
  begin perform public.create_walk_in_visit(gen_random_uuid(), 'Invalid', '2027-01-01', -1, false, null); raise exception 'Negative amount allowed'; exception when raise_exception then if sqlerrm <> 'Provide a name, visit date, amount and valid payment details' then raise; end if; end;
  begin perform public.create_walk_in_visit(gen_random_uuid(), 'Invalid', '2027-01-01', 10000, true, null); raise exception 'Paid without method allowed'; exception when raise_exception then if sqlerrm <> 'Provide a name, visit date, amount and valid payment details' then raise; end if; end;
  begin perform public.create_walk_in_visit(gen_random_uuid(), 'Invalid', '2027-01-01', 9007199254740992, false, null); raise exception 'Unsafe amount allowed'; exception when raise_exception then if sqlerrm <> 'Provide a name, visit date, amount and valid payment details' then raise; end if; end;
  v_immediate := public.create_walk_in_visit('92000000-0000-0000-0000-000000000003', 'Sample Paid', '2027-01-01', 10000, true, 'Cash');
  if (select count(*) from public.walk_in_visits where id = v_immediate and payment_method = 'Cash' and paid_by = auth.uid() and paid_at is not null) <> 1 then raise exception 'Paid creation failed'; end if;
  v_paid := public.pay_walk_in_visit('92000000-0000-0000-0000-000000000002', v_visit, 'Cash');
  v_retry := public.pay_walk_in_visit('92000000-0000-0000-0000-000000000002', v_visit, 'Cash');
  if v_paid <> v_retry or (select count(*) from public.walk_in_visits where id = v_visit and payment_method = 'Cash' and paid_by = auth.uid() and paid_at is not null) <> 1 then raise exception 'Payment retry failed'; end if;
  begin perform public.pay_walk_in_visit(gen_random_uuid(), v_visit, 'Cash'); raise exception 'Duplicate payment allowed'; exception when raise_exception then if sqlerrm <> 'Visit is unavailable or already paid' then raise; end if; end;
  begin update public.walk_in_visits set amount_centavos = 0 where id = v_visit; raise exception 'Direct change allowed'; exception when insufficient_privilege then null; end;
end $$;
reset role;
select set_config('request.jwt.claim.sub', '91000000-0000-0000-0000-000000000002', true);
set local role authenticated;
do $$ begin
  if (select count(*) from public.walk_in_visits) <> 0 then raise exception 'Disabled staff can read visits'; end if;
  begin perform public.create_walk_in_visit(gen_random_uuid(), 'Disabled', '2027-01-01', 10000, false, null); raise exception 'Disabled staff write allowed'; exception when insufficient_privilege then null; end;
end $$;
rollback;
select 'Walk-in authorization, validation, immutability, and retry tests passed' as result;
