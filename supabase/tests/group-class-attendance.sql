-- Isolated local test database only. Do not run against a shared project.
\set ON_ERROR_STOP on
begin;
insert into auth.users(id) values ('a0000000-0000-0000-0000-000000000001'), ('a0000000-0000-0000-0000-000000000002') on conflict do nothing;
insert into public.staff_profiles(user_id, display_name, role, active) values
  ('a0000000-0000-0000-0000-000000000001', 'Test Staff', 'admin', true),
  ('a0000000-0000-0000-0000-000000000002', 'Inactive Staff', 'staff', false) on conflict do nothing;
insert into public.schedule_entries(id, title, category, starts_at, status, created_by, updated_by) values
  ('a1000000-0000-0000-0000-000000000001', 'Class', 'group_class', '2027-01-01 10:00+08', 'draft', 'a0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001'),
  ('a1000000-0000-0000-0000-000000000002', 'Coaching', 'coaching', '2027-01-01 11:00+08', 'draft', 'a0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001'),
  ('a1000000-0000-0000-0000-000000000003', 'Cancelled', 'group_class', '2027-01-01 12:00+08', 'cancelled', 'a0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001');
set local role anon;
do $$ begin
  begin perform count(*) from public.group_class_attendance; raise exception 'Anonymous read allowed'; exception when insufficient_privilege then null; end;
  begin perform public.add_group_class_attendee('a2000000-0000-0000-0000-000000000001','a1000000-0000-0000-0000-000000000001','Anon'); raise exception 'Anonymous write allowed'; exception when insufficient_privilege then null; end;
end $$;
reset role;
select set_config('request.jwt.claim.sub', 'a0000000-0000-0000-0000-000000000001', true);
set local role authenticated;
do $$
declare v_attendee uuid; v_retry uuid;
begin
  begin insert into public.group_class_attendance(id, session_id, full_name, created_by) values (gen_random_uuid(), 'a1000000-0000-0000-0000-000000000001', 'Bypass', auth.uid()); raise exception 'Direct insert allowed'; exception when insufficient_privilege then null; end;
  v_attendee := public.add_group_class_attendee('a2000000-0000-0000-0000-000000000002','a1000000-0000-0000-0000-000000000001','Sample Attendee');
  v_retry := public.add_group_class_attendee('a2000000-0000-0000-0000-000000000002','a1000000-0000-0000-0000-000000000001','Sample Attendee');
  if v_attendee <> v_retry or (select count(*) from public.group_class_attendance where session_id='a1000000-0000-0000-0000-000000000001' and removed_at is null) <> 1 then raise exception 'Add retry duplicated attendance'; end if;
  begin perform public.add_group_class_attendee('a2000000-0000-0000-0000-000000000002','a1000000-0000-0000-0000-000000000001','Different'); raise exception 'Changed retry allowed'; exception when raise_exception then if sqlerrm <> 'Idempotency key already used for another request' then raise; end if; end;
  begin perform public.add_group_class_attendee('a2000000-0000-0000-0000-000000000003','a1000000-0000-0000-0000-000000000002','Coaching attendee'); raise exception 'Coaching assignment allowed'; exception when raise_exception then if sqlerrm <> 'Choose a group class that is not cancelled' then raise; end if; end;
  begin perform public.add_group_class_attendee('a2000000-0000-0000-0000-000000000004','a1000000-0000-0000-0000-000000000003','Cancelled attendee'); raise exception 'Cancelled class allowed'; exception when raise_exception then if sqlerrm <> 'Choose a group class that is not cancelled' then raise; end if; end;
  begin update public.schedule_entries set category='coaching' where id='a1000000-0000-0000-0000-000000000001'; raise exception 'Class with attendance changed category'; exception when raise_exception then if sqlerrm <> 'A class with attendance history cannot change category' then raise; end if; end;
  begin update public.group_class_attendance set full_name='Bypass' where id=v_attendee; raise exception 'Direct edit allowed'; exception when insufficient_privilege then null; end;
  v_retry := public.remove_group_class_attendee('a2000000-0000-0000-0000-000000000005',v_attendee);
  if v_retry <> v_attendee or (select removed_by from public.group_class_attendance where id=v_attendee) <> auth.uid() then raise exception 'Removal failed or actor missing'; end if;
  v_retry := public.remove_group_class_attendee('a2000000-0000-0000-0000-000000000005',v_attendee);
  if v_retry <> v_attendee then raise exception 'Removal retry failed'; end if;
  if (select count(*) from public.group_class_attendance where session_id='a1000000-0000-0000-0000-000000000001' and removed_at is null) <> 0 then raise exception 'Removed attendance counted'; end if;
end $$;
reset role;
select set_config('request.jwt.claim.sub', 'a0000000-0000-0000-0000-000000000002', true);
set local role authenticated;
do $$ begin
  if (select count(*) from public.group_class_attendance) <> 0 then raise exception 'Inactive staff can read'; end if;
  begin perform public.add_group_class_attendee('a2000000-0000-0000-0000-000000000006','a1000000-0000-0000-0000-000000000001','Inactive'); raise exception 'Inactive staff can add'; exception when insufficient_privilege then null; end;
end $$;
reset role;
rollback;
select 'Group class attendance authorization, retries, category and removal passed' as result;
