-- ==============================================================================
-- BATCHFUND DATABASE SCHEMA
-- Shared university-batch fund tracker for monthly contributions, event collections,
-- member records, and expenses.
-- ==============================================================================

-- 1. PROFILES TABLE
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  registration_number integer check (registration_number between 1 and 220),
  role text not null default 'pending' check (role in ('admin', 'viewer', 'pending')),
  created_at timestamptz not null default now()
);

alter table public.profiles add column if not exists registration_number integer check (registration_number between 1 and 220);
alter table public.profiles alter column role set default 'pending';

create unique index if not exists profiles_approved_registration_number_idx
  on public.profiles (registration_number)
  where registration_number is not null and role in ('admin', 'viewer');

-- 2. MEMBERS TABLE
create table if not exists public.members (
  id uuid primary key default gen_random_uuid(),
  registration_number integer not null unique check (registration_number between 1 and 220),
  full_name text not null check (length(trim(full_name)) > 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- 3. EVENTS TABLE (for batch events, collections, and expenses)
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(trim(title)) > 0),
  description text,
  event_date date not null default current_date,
  target_amount numeric(12, 2) not null default 0 check (target_amount >= 0),
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now()
);

-- 4. LEDGER ENTRIES TABLE
create table if not exists public.ledger_entries (
  id uuid primary key default gen_random_uuid(),
  entry_type text not null check (entry_type in ('monthly', 'event', 'expense')),
  amount numeric(12, 2) not null check (amount > 0),
  member_id uuid references public.members (id) on delete restrict,
  period_month date,
  event_id uuid references public.events (id) on delete set null,
  event_name text,
  notes text,
  entry_date date not null default current_date,
  created_by uuid not null references auth.users (id),
  created_at timestamptz not null default now(),
  constraint ledger_monthly_period check (
    (entry_type = 'monthly' and member_id is not null and period_month is not null
      and period_month = date_trunc('month', period_month)::date)
    or (entry_type <> 'monthly' and period_month is null)
  ),
  constraint ledger_description check (
    (entry_type = 'monthly' and event_name is null)
    or (entry_type in ('event', 'expense') and length(trim(event_name)) > 0)
  )
);

alter table public.ledger_entries add column if not exists event_id uuid references public.events (id) on delete set null;

create unique index if not exists ledger_one_monthly_payment_per_member
  on public.ledger_entries (member_id, period_month)
  where entry_type = 'monthly';

create index if not exists ledger_entries_date_idx
  on public.ledger_entries (entry_date desc);

create index if not exists ledger_entries_month_idx
  on public.ledger_entries (period_month)
  where entry_type = 'monthly';

create index if not exists ledger_entries_event_idx
  on public.ledger_entries (event_id);

-- 5. HELPER FUNCTIONS
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and role = 'admin'
  );
$$;

create or replace function public.is_member()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and role in ('admin', 'viewer')
  );
$$;

-- 6. AUTOMATED TRIGGER FOR NEW USER REGISTRATION
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reg integer;
  v_full_name text;
  v_role text;
  v_admin_count integer;
begin
  -- Extract user metadata supplied during sign up
  v_reg := nullif(new.raw_user_meta_data->>'registration_number', '')::integer;
  v_full_name := trim(coalesce(new.raw_user_meta_data->>'full_name', ''));

  -- The very first user to sign up automatically becomes administrator
  select count(*) into v_admin_count from public.profiles where role = 'admin';
  if v_admin_count = 0 then
    v_role := 'admin';
  else
    v_role := 'pending';
  end if;

  insert into public.profiles (id, email, registration_number, role)
  values (new.id, coalesce(new.email, ''), v_reg, v_role)
  on conflict (id) do update set
    email = excluded.email,
    registration_number = coalesce(public.profiles.registration_number, excluded.registration_number);

  -- If registration number and name were provided, insert member into directory if not already there
  if v_reg is not null and v_full_name is not null and length(v_full_name) > 0 then
    insert into public.members (registration_number, full_name, is_active)
    values (v_reg, v_full_name, true)
    on conflict (registration_number) do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 7. ROW LEVEL SECURITY
alter table public.profiles enable row level security;
alter table public.members enable row level security;
alter table public.events enable row level security;
alter table public.ledger_entries enable row level security;

-- PROFILES POLICIES
drop policy if exists "Users can read their own profile and admins can read all" on public.profiles;
create policy "Users can read their own profile and admins can read all"
  on public.profiles for select to authenticated
  using (id = (select auth.uid()) or (select public.is_admin()));

drop policy if exists "Admins can update profiles" on public.profiles;
create policy "Admins can update profiles"
  on public.profiles for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

drop policy if exists "Admins can delete profiles" on public.profiles;
create policy "Admins can delete profiles"
  on public.profiles for delete to authenticated
  using ((select public.is_admin()));

-- MEMBERS POLICIES
-- Normal users can read their own member row; admins can read all members
drop policy if exists "Authenticated users can read members" on public.members;
drop policy if exists "Admins can read members" on public.members;
drop policy if exists "Users can read own member profile and admins can read all" on public.members;
create policy "Users can read own member profile and admins can read all"
  on public.members for select to authenticated
  using (
    (select public.is_admin())
    or registration_number = (
      select registration_number from public.profiles where id = (select auth.uid())
    )
  );

drop policy if exists "Admins can add members" on public.members;
create policy "Admins can add members"
  on public.members for insert to authenticated
  with check ((select public.is_admin()));

drop policy if exists "Admins can update members" on public.members;
create policy "Admins can update members"
  on public.members for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- EVENTS POLICIES
drop policy if exists "Authenticated users can read events" on public.events;
create policy "Authenticated users can read events"
  on public.events for select to authenticated
  using (true);

drop policy if exists "Admins can insert events" on public.events;
create policy "Admins can insert events"
  on public.events for insert to authenticated
  with check ((select public.is_admin()));

drop policy if exists "Admins can update events" on public.events;
create policy "Admins can update events"
  on public.events for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

drop policy if exists "Admins can delete events" on public.events;
create policy "Admins can delete events"
  on public.events for delete to authenticated
  using ((select public.is_admin()));

-- LEDGER POLICIES
-- Normal users only see their own monthly payments and all event collections/expenses.
-- Admins see all ledger entries (including other members' payments).
drop policy if exists "Authenticated users can read fund entries" on public.ledger_entries;
drop policy if exists "Admins can read fund entries" on public.ledger_entries;
drop policy if exists "Authenticated users can read their own monthly entries and all events/expenses, admins can read all" on public.ledger_entries;
create policy "Authenticated users can read their own monthly entries and all events/expenses, admins can read all"
  on public.ledger_entries for select to authenticated
  using (
    (select public.is_admin())
    or entry_type in ('event', 'expense')
    or (
      entry_type = 'monthly'
      and member_id in (
        select m.id from public.members m
        join public.profiles p on p.registration_number = m.registration_number
        where p.id = (select auth.uid())
      )
    )
  );

drop policy if exists "Admins can add fund entries" on public.ledger_entries;
create policy "Admins can add fund entries"
  on public.ledger_entries for insert to authenticated
  with check ((select public.is_admin()) and created_by = (select auth.uid()));

drop policy if exists "Admins can delete fund entries" on public.ledger_entries;
create policy "Admins can delete fund entries"
  on public.ledger_entries for delete to authenticated
  using ((select public.is_admin()));

-- 8. OVERVIEW SUMMARY RPC (Used for aggregate batch statistics)
create or replace function public.get_fund_overview(p_month date)
returns table (
  active_members integer,
  monthly_total numeric,
  event_total numeric,
  monthly_paid_members integer,
  total_contributions numeric,
  total_events numeric,
  total_expenses numeric,
  balance numeric
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_member() then
    raise exception 'Fund access requires an approved member account'
      using errcode = '42501';
  end if;

  return query
  select
    (select count(*)::integer from public.members where is_active),
    coalesce(sum(e.amount) filter (
      where e.entry_type = 'monthly'
        and e.period_month = date_trunc('month', p_month)::date
    ), 0),
    coalesce(sum(e.amount) filter (
      where e.entry_type = 'event'
        and date_trunc('month', e.entry_date)::date = date_trunc('month', p_month)::date
    ), 0),
    (count(distinct e.member_id) filter (
      where e.entry_type = 'monthly'
        and e.period_month = date_trunc('month', p_month)::date
    ))::integer,
    coalesce(sum(e.amount) filter (where e.entry_type = 'monthly'), 0),
    coalesce(sum(e.amount) filter (where e.entry_type = 'event'), 0),
    coalesce(sum(e.amount) filter (where e.entry_type = 'expense'), 0),
    coalesce(sum(e.amount) filter (where e.entry_type <> 'expense'), 0)
      - coalesce(sum(e.amount) filter (where e.entry_type = 'expense'), 0)
  from public.ledger_entries e;
end;
$$;

-- 9. PERMISSIONS
grant usage on schema public to authenticated;
grant select, update, delete on public.profiles to authenticated;
grant select, insert, update on public.members to authenticated;
grant select, insert, update, delete on public.events to authenticated;
grant select, insert, delete on public.ledger_entries to authenticated;
revoke all on function public.is_admin() from public, anon;
revoke all on function public.is_member() from public, anon;
revoke all on function public.get_fund_overview(date) from public, anon;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_member() to authenticated;
grant execute on function public.get_fund_overview(date) to authenticated;
