-- Run only against a disposable database with the core, attendance, and count migrations.
\set ON_ERROR_STOP on
begin;
insert into auth.users(id) values ('93000000-0000-4000-8000-000000000001'), ('93000000-0000-4000-8000-000000000002');
insert into public.staff_profiles(user_id, display_name, role, active) values
  ('93000000-0000-4000-8000-000000000001', 'Test Staff', 'staff', true),
  ('93000000-0000-4000-8000-000000000002', 'Inactive Staff', 'staff', false);
set local role anon;
do $$ begin
  begin perform public.group_class_attendance_counts('{}'::uuid[]); raise exception 'Anonymous count allowed';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
select set_config('request.jwt.claim.sub', '93000000-0000-4000-8000-000000000001', true);
set local role authenticated;
do $$
declare v_first uuid; v_empty uuid; v_coaching uuid; v_attendee uuid; v_counts jsonb;
begin
  v_first := public.create_schedule_entry(gen_random_uuid(), 'Test group', 'group_class', '2027-01-01 10:00+08');
  v_empty := public.create_schedule_entry(gen_random_uuid(), 'Empty group', 'group_class', '2027-01-01 12:00+08');
  v_coaching := public.create_schedule_entry(gen_random_uuid(), 'Coaching', 'coaching', '2027-01-01 14:00+08');
  v_attendee := public.add_group_class_attendee(gen_random_uuid(), v_first, 'Test Person One');
  perform public.add_group_class_attendee(gen_random_uuid(), v_first, 'Test Person Two');
  v_counts := public.group_class_attendance_counts(array[v_first, v_empty, v_first]);
  if v_counts <> jsonb_build_object(v_first::text, 2, v_empty::text, 0) then raise exception 'Wrong or non-aggregated attendance counts'; end if;
  perform public.remove_group_class_attendee(gen_random_uuid(), v_attendee);
  if public.group_class_attendance_counts(array[v_first])->>v_first::text <> '1' then raise exception 'Removed attendee counted'; end if;
  begin perform public.group_class_attendance_counts(array[v_coaching]); raise exception 'Coaching count allowed';
  exception when raise_exception then if sqlerrm <> 'One or more group classes are unavailable' then raise; end if; end;
  begin perform public.group_class_attendance_counts(array_fill(v_first, array[501])); raise exception 'Unbounded request allowed';
  exception when raise_exception then if sqlerrm <> 'Provide at most 500 class IDs' then raise; end if; end;
  if public.group_class_attendance_counts('{}'::uuid[]) <> '{}'::jsonb then raise exception 'Empty request failed'; end if;
end $$;
reset role;
select set_config('request.jwt.claim.sub', '93000000-0000-4000-8000-000000000002', true);
set local role authenticated;
do $$ begin
  begin perform public.group_class_attendance_counts('{}'::uuid[]); raise exception 'Inactive staff count allowed';
  exception when insufficient_privilege then null; end;
end $$;
rollback;
