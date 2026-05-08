-- Run this once in Supabase SQL Editor (Dashboard → SQL Editor → New query)
-- This sets up an audit_log table + triggers on all 5 tables.

-- 1. Audit log table
create table if not exists audit_log (
  id     bigint generated always as identity primary key,
  ts     timestamptz default now() not null,
  op     text        not null,   -- INSERT | UPDATE | DELETE
  tbl    text        not null,   -- table name
  rec_id uuid,                   -- id of the affected row
  before jsonb,                  -- row state before change (null for INSERT)
  after  jsonb                   -- row state after change  (null for DELETE)
);

-- 2. RLS: app can read but not tamper with the log directly
alter table audit_log enable row level security;
create policy "anon read audit_log"
  on audit_log for select using (true);

-- 3. Trigger function (SECURITY DEFINER so it bypasses RLS and can always insert)
create or replace function fn_audit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into audit_log(op, tbl, rec_id, before, after)
  values (
    TG_OP,
    TG_TABLE_NAME,
    coalesce(NEW.id, OLD.id),
    case when TG_OP != 'INSERT' then to_jsonb(OLD) end,
    case when TG_OP != 'DELETE' then to_jsonb(NEW)  end
  );
  return coalesce(NEW, OLD);
end;
$$;

-- 4. Attach to every table
create trigger audit_borrowers
  after insert or update or delete on borrowers
  for each row execute function fn_audit();

create trigger audit_payments
  after insert or update or delete on payments
  for each row execute function fn_audit();

create trigger audit_chits
  after insert or update or delete on chits
  for each row execute function fn_audit();

create trigger audit_chit_members
  after insert or update or delete on chit_members
  for each row execute function fn_audit();

create trigger audit_chit_payments
  after insert or update or delete on chit_payments
  for each row execute function fn_audit();
