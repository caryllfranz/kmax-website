-- Staff can see attendance totals without downloading attendee names.
create function public.group_class_attendance_counts(p_session_ids uuid[])
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare v_counts jsonb; v_expected integer; v_found integer;
begin
  if not kmax_private.is_active_staff() then
    raise exception 'Staff access required' using errcode = '42501';
  end if;
  if p_session_ids is null or cardinality(p_session_ids) > 500 or array_position(p_session_ids, null) is not null then
    raise exception 'Provide at most 500 class IDs';
  end if;
  select count(distinct session_id) into v_expected from unnest(p_session_ids) as requested(session_id);
  select count(*), coalesce(jsonb_object_agg(classes.id::text, classes.attendee_count), '{}'::jsonb)
    into v_found, v_counts
  from (
    select s.id, count(a.id) as attendee_count
    from public.schedule_entries s
    left join public.group_class_attendance a on a.session_id = s.id and a.removed_at is null
    where s.id = any(p_session_ids) and s.category = 'group_class' and s.status <> 'cancelled'
    group by s.id
  ) classes;
  if v_found <> v_expected then
    raise exception 'One or more group classes are unavailable';
  end if;
  return v_counts;
end;
$$;
revoke all on function public.group_class_attendance_counts(uuid[]) from public, anon, authenticated;
grant execute on function public.group_class_attendance_counts(uuid[]) to authenticated;
