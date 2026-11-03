-- Staff-maintained attendance, not a booking or public class registration.
create table public.group_class_attendance (
  id uuid primary key,
  session_id uuid not null references public.schedule_entries(id),
  full_name text not null check (char_length(btrim(full_name)) between 1 and 150),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  removed_by uuid references auth.users(id),
  removed_at timestamptz,
  check ((removed_by is null) = (removed_at is null))
);
create index group_class_attendance_session_idx
  on public.group_class_attendance (session_id, id) where removed_at is null;
alter table public.group_class_attendance enable row level security;
revoke all on public.group_class_attendance from public, anon, authenticated;
grant select on public.group_class_attendance to authenticated;
create policy staff_read_group_class_attendance on public.group_class_attendance
  for select to authenticated using ((select kmax_private.is_active_staff()));

-- Prevent a class with attendance history from being changed into coaching.
create function kmax_private.guard_attendance_category()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.category <> 'group_class' and old.category = 'group_class'
    and exists (select 1 from public.group_class_attendance where session_id = old.id) then
    raise exception 'A class with attendance history cannot change category';
  end if;
  return new;
end;
$$;
revoke all on function kmax_private.guard_attendance_category() from public, anon, authenticated;
create trigger schedule_entries_guard_attendance_category before update of category on public.schedule_entries
  for each row execute function kmax_private.guard_attendance_category();

create function kmax_private.add_group_class_attendee(p_idempotency_key uuid, p_session_id uuid, p_full_name text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid; v_new boolean; v_category text; v_status text;
begin
  if not kmax_private.is_active_staff() then raise exception 'Staff access required' using errcode = '42501'; end if;
  if p_idempotency_key is null or p_session_id is null or p_full_name is null
    or char_length(btrim(p_full_name)) not between 1 and 150 then
    raise exception 'Provide a class and attendee name';
  end if;
  select c.result_id, c.is_new into v_id, v_new from kmax_private.claim_request(
    'add_group_class_attendee', p_idempotency_key,
    jsonb_build_object('session', p_session_id, 'name', btrim(p_full_name)), gen_random_uuid()) c;
  if not v_new then return v_id; end if;
  select category, status into v_category, v_status from public.schedule_entries where id = p_session_id for update;
  if not found or v_category <> 'group_class' or v_status = 'cancelled' then
    raise exception 'Choose a group class that is not cancelled';
  end if;
  insert into public.group_class_attendance (id, session_id, full_name, created_by)
    values (v_id, p_session_id, btrim(p_full_name), auth.uid());
  return v_id;
end;
$$;

create function kmax_private.remove_group_class_attendee(p_idempotency_key uuid, p_attendance_id uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid; v_new boolean;
begin
  if not kmax_private.is_active_staff() then raise exception 'Staff access required' using errcode = '42501'; end if;
  if p_idempotency_key is null or p_attendance_id is null then raise exception 'Provide an attendance record'; end if;
  select c.result_id, c.is_new into v_id, v_new from kmax_private.claim_request(
    'remove_group_class_attendee', p_idempotency_key, jsonb_build_object('attendance', p_attendance_id), p_attendance_id) c;
  if not v_new then return v_id; end if;
  update public.group_class_attendance set removed_at = now(), removed_by = auth.uid()
    where id = p_attendance_id and removed_at is null;
  if not found then raise exception 'Attendance record not found or already removed'; end if;
  return v_id;
end;
$$;

revoke all on function kmax_private.add_group_class_attendee(uuid, uuid, text),
  kmax_private.remove_group_class_attendee(uuid, uuid) from public, anon, authenticated;
grant execute on function kmax_private.add_group_class_attendee(uuid, uuid, text),
  kmax_private.remove_group_class_attendee(uuid, uuid) to authenticated;

create function public.add_group_class_attendee(p_idempotency_key uuid, p_session_id uuid, p_full_name text)
returns uuid language sql security invoker set search_path = ''
as $$ select kmax_private.add_group_class_attendee(p_idempotency_key, p_session_id, p_full_name); $$;
create function public.remove_group_class_attendee(p_idempotency_key uuid, p_attendance_id uuid)
returns uuid language sql security invoker set search_path = ''
as $$ select kmax_private.remove_group_class_attendee(p_idempotency_key, p_attendance_id); $$;
revoke all on function public.add_group_class_attendee(uuid, uuid, text),
  public.remove_group_class_attendee(uuid, uuid) from public, anon, authenticated;
grant execute on function public.add_group_class_attendee(uuid, uuid, text),
  public.remove_group_class_attendee(uuid, uuid) to authenticated;
