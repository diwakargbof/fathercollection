-- Siva Reddy's Ledger — Supabase schema
-- Run this once: Supabase Dashboard → SQL Editor → New query → paste → Run

create extension if not exists "pgcrypto";

-- Loans / Borrowers
create table if not exists borrowers (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  phone           text,
  amount_given    numeric not null,
  total_to_repay  numeric not null,
  daily_amount    numeric not null default 0,
  start_date      date not null default current_date,
  status          text not null default 'active', -- active | completed | paused
  notes           text,
  created_at      timestamptz default now()
);

create table if not exists payments (
  id           uuid primary key default gen_random_uuid(),
  borrower_id  uuid not null references borrowers(id) on delete cascade,
  date         date not null default current_date,
  amount       numeric not null,
  note         text,
  created_at   timestamptz default now()
);

create index if not exists idx_payments_borrower on payments(borrower_id);
create index if not exists idx_payments_date     on payments(date);

-- Chit Fund
create table if not exists chits (
  id               uuid primary key default gen_random_uuid(),
  name             text not null,
  monthly_amount   numeric not null,
  num_months       int not null default 20,
  start_year_month text not null,   -- 'YYYY-MM'
  status           text not null default 'active',
  created_at       timestamptz default now()
);

create table if not exists chit_members (
  id                uuid primary key default gen_random_uuid(),
  chit_id           uuid not null references chits(id) on delete cascade,
  name              text not null,
  phone             text,
  payout_month      int not null check (payout_month between 1 and 40),
  payout_amount     numeric not null,
  payout_paid       boolean not null default false,
  payout_paid_date  date,
  notes             text,
  created_at        timestamptz default now()
);

create index if not exists idx_members_chit on chit_members(chit_id);

create table if not exists chit_payments (
  id          uuid primary key default gen_random_uuid(),
  chit_id     uuid not null references chits(id) on delete cascade,
  member_id   uuid not null references chit_members(id) on delete cascade,
  month       int not null check (month between 1 and 40),
  paid        boolean not null default false,
  amount      numeric,
  date        date,
  note        text,
  created_at  timestamptz default now(),
  unique (member_id, month)
);

create index if not exists idx_chit_payments_chit  on chit_payments(chit_id);
create index if not exists idx_chit_payments_month on chit_payments(month);

-- Row Level Security — anon key gets full access (personal app, no auth)
alter table borrowers    enable row level security;
alter table payments     enable row level security;
alter table chits        enable row level security;
alter table chit_members enable row level security;
alter table chit_payments enable row level security;

drop policy if exists "anon all" on borrowers;
drop policy if exists "anon all" on payments;
drop policy if exists "anon all" on chits;
drop policy if exists "anon all" on chit_members;
drop policy if exists "anon all" on chit_payments;

create policy "anon all" on borrowers     for all using (true) with check (true);
create policy "anon all" on payments      for all using (true) with check (true);
create policy "anon all" on chits         for all using (true) with check (true);
create policy "anon all" on chit_members  for all using (true) with check (true);
create policy "anon all" on chit_payments for all using (true) with check (true);
