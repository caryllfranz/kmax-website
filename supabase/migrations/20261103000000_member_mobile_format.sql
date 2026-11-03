-- Existing records are preserved. New and updated records must use a valid format.
-- Review and correct any legacy records before validating this constraint.
alter table public.members
  add constraint members_mobile_format_check
  check (
    mobile ~ '^[0-9+(). -]+$'
    and length(regexp_replace(mobile, '[^0-9]', '', 'g')) between 7 and 15
  ) not valid;
