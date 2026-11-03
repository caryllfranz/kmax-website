-- Run only in a disposable database with no public.members table.
-- This exercises the actual migration, including its NOT VALID behavior.
\set ON_ERROR_STOP on
begin;
create table public.members (id integer primary key, mobile text not null);
insert into public.members values (1, 'legacy-invalid');
\ir ../migrations/20261103000000_member_mobile_format.sql

do $$
declare value text; next_id integer := 2;
begin
  foreach value in array array['1234567', '123456789012345', '+63 (912) 345-6789', '09 123.456.789'] loop
    insert into public.members values (next_id, value);
    next_id := next_id + 1;
  end loop;
  foreach value in array array['123456', '1234567890123456', 'abc1234567', '', '+++++++'] loop
    begin
      insert into public.members values (next_id, value);
      raise exception 'Invalid number accepted: %', value;
    exception when check_violation then null;
    end;
  end loop;
  begin
    update public.members set mobile = 'bad' where id = 2;
    raise exception 'Invalid mobile update accepted';
  exception when check_violation then null;
  end;
  if not exists (select 1 from public.members where id = 1 and mobile = 'legacy-invalid') then
    raise exception 'Legacy row was altered';
  end if;
end $$;
rollback;
