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

create table if not exists public.members (
  id uuid primary key default gen_random_uuid(),
  registration_number integer not null unique check (registration_number between 1 and 220),
  full_name text not null check (length(trim(full_name)) > 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.ledger_entries (
  id uuid primary key default gen_random_uuid(),
  entry_type text not null check (entry_type in ('monthly', 'event', 'expense')),
  amount numeric(12, 2) not null check (amount > 0),
  member_id uuid references public.members (id) on delete restrict,
  period_month date,
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

create unique index if not exists ledger_one_monthly_payment_per_member
  on public.ledger_entries (member_id, period_month)
  where entry_type = 'monthly';

create index if not exists ledger_entries_date_idx
  on public.ledger_entries (entry_date desc);

create index if not exists ledger_entries_month_idx
  on public.ledger_entries (period_month)
  where entry_type = 'monthly';

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

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  registration_text text;
  registration_number_value integer;
begin
  registration_text := new.raw_user_meta_data ->> 'registration_number';
  if registration_text is null or registration_text !~ '^[0-9]{1,3}$' then
    raise exception 'Enter a registration number between 1 and 220';
  end if;
  registration_number_value := registration_text::integer;
  if registration_number_value not between 1 and 220 then
    raise exception 'Enter a registration number between 1 and 220';
  end if;

  insert into public.profiles (id, email, registration_number, role)
  values (new.id, coalesce(new.email, ''), registration_number_value, 'pending')
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;

create or replace function public.validate_profile_approval()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if old.role = 'pending' and new.role = 'viewer' and not exists (
    select 1
    from public.members
    where registration_number = new.registration_number
      and is_active
  ) then
    raise exception 'Add an active member with registration number % before approving this account.',
      coalesce(new.registration_number::text, '(missing)')
      using errcode = '23514';
  end if;
  return new;
end;
$$;

drop trigger if exists validate_profile_approval on public.profiles;
create trigger validate_profile_approval
  before update of role on public.profiles
  for each row execute procedure public.validate_profile_approval();

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.members enable row level security;
alter table public.ledger_entries enable row level security;

drop policy if exists "Users can read their own profile and admins can read all" on public.profiles;
create policy "Users can read their own profile and admins can read all"
  on public.profiles for select to authenticated
  using (id = (select auth.uid()) or (select public.is_admin()));

drop policy if exists "Admins can update profiles" on public.profiles;
create policy "Admins can update profiles"
  on public.profiles for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

drop policy if exists "Authenticated users can read members" on public.members;
drop policy if exists "Admins can read members" on public.members;
create policy "Admins can read members"
  on public.members for select to authenticated
  using ((select public.is_admin()));

drop policy if exists "Admins can add members" on public.members;
create policy "Admins can add members"
  on public.members for insert to authenticated
  with check ((select public.is_admin()));

drop policy if exists "Admins can update members" on public.members;
create policy "Admins can update members"
  on public.members for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

drop policy if exists "Authenticated users can read fund entries" on public.ledger_entries;
drop policy if exists "Admins can read fund entries" on public.ledger_entries;
create policy "Admins can read fund entries"
  on public.ledger_entries for select to authenticated
  using ((select public.is_admin()));

drop policy if exists "Admins can add fund entries" on public.ledger_entries;
create policy "Admins can add fund entries"
  on public.ledger_entries for insert to authenticated
  with check ((select public.is_admin()) and created_by = (select auth.uid()));

drop policy if exists "Admins can delete fund entries" on public.ledger_entries;
create policy "Admins can delete fund entries"
  on public.ledger_entries for delete to authenticated
  using ((select public.is_admin()));

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

grant usage on schema public to authenticated;
grant select, update on public.profiles to authenticated;
grant select, insert, update on public.members to authenticated;
grant select, insert, delete on public.ledger_entries to authenticated;
revoke all on function public.is_admin() from public, anon;
revoke all on function public.is_member() from public, anon;
revoke all on function public.get_fund_overview(date) from public, anon;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_member() to authenticated;
grant execute on function public.get_fund_overview(date) to authenticated;
