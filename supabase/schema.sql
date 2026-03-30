-- Run this in Supabase SQL Editor (or via migrations).
-- Idempotent: safe to re-run (drops/recreates RLS policies by name; tables use IF NOT EXISTS).

create extension if not exists "pgcrypto";

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  amount numeric(12, 2) not null check (amount > 0),
  category text not null,
  spent_at timestamptz not null default now(),
  note text,
  created_at timestamptz not null default now()
);

-- Migrate legacy column name `date` (reserved word) → spent_at
drop index if exists public.expenses_user_id_date_idx;
do $migrate_expenses_spent_at$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'expenses'
      and column_name = 'date'
  ) then
    alter table public.expenses rename column date to spent_at;
  end if;
end;
$migrate_expenses_spent_at$;

create index if not exists expenses_user_id_spent_at_idx
  on public.expenses (user_id, spent_at desc);

alter table public.expenses enable row level security;

drop policy if exists "expenses_select_own" on public.expenses;
drop policy if exists "expenses_insert_own" on public.expenses;
drop policy if exists "expenses_update_own" on public.expenses;
drop policy if exists "expenses_delete_own" on public.expenses;
drop policy if exists "expenses_select_household" on public.expenses;
drop policy if exists "expenses_insert_household" on public.expenses;
drop policy if exists "expenses_update_household" on public.expenses;
drop policy if exists "expenses_delete_household" on public.expenses;

create policy "expenses_select_own"
  on public.expenses
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "expenses_insert_own"
  on public.expenses
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "expenses_update_own"
  on public.expenses
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "expenses_delete_own"
  on public.expenses
  for delete
  to authenticated
  using (auth.uid() = user_id);

create table if not exists public.monthly_limits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  month_key text not null check (month_key ~ '^\d{4}-\d{2}$'),
  limit_amount numeric(12, 2) not null check (limit_amount > 0),
  created_at timestamptz not null default now(),
  unique (user_id, month_key)
);

create index if not exists monthly_limits_user_month_idx
  on public.monthly_limits (user_id, month_key);

alter table public.monthly_limits enable row level security;

drop policy if exists "monthly_limits_select_own" on public.monthly_limits;
drop policy if exists "monthly_limits_insert_own" on public.monthly_limits;
drop policy if exists "monthly_limits_update_own" on public.monthly_limits;
drop policy if exists "monthly_limits_delete_own" on public.monthly_limits;

create policy "monthly_limits_select_own"
  on public.monthly_limits
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "monthly_limits_insert_own"
  on public.monthly_limits
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "monthly_limits_update_own"
  on public.monthly_limits
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "monthly_limits_delete_own"
  on public.monthly_limits
  for delete
  to authenticated
  using (auth.uid() = user_id);

create table if not exists public.user_categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (length(trim(name)) between 2 and 40),
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

create index if not exists user_categories_user_id_idx
  on public.user_categories (user_id);

alter table public.user_categories enable row level security;

drop policy if exists "user_categories_select_own" on public.user_categories;
drop policy if exists "user_categories_insert_own" on public.user_categories;
drop policy if exists "user_categories_update_own" on public.user_categories;
drop policy if exists "user_categories_delete_own" on public.user_categories;

create policy "user_categories_select_own"
  on public.user_categories
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "user_categories_insert_own"
  on public.user_categories
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "user_categories_update_own"
  on public.user_categories
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "user_categories_delete_own"
  on public.user_categories
  for delete
  to authenticated
  using (auth.uid() = user_id);

create table if not exists public.category_limits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  category_name text not null check (length(trim(category_name)) between 2 and 40),
  limit_amount numeric(12, 2) not null check (limit_amount > 0),
  created_at timestamptz not null default now(),
  unique (user_id, category_name)
);

create index if not exists category_limits_user_id_idx
  on public.category_limits (user_id);

alter table public.category_limits enable row level security;

drop policy if exists "category_limits_select_own" on public.category_limits;
drop policy if exists "category_limits_insert_own" on public.category_limits;
drop policy if exists "category_limits_update_own" on public.category_limits;
drop policy if exists "category_limits_delete_own" on public.category_limits;

create policy "category_limits_select_own"
  on public.category_limits
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "category_limits_insert_own"
  on public.category_limits
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "category_limits_update_own"
  on public.category_limits
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "category_limits_delete_own"
  on public.category_limits
  for delete
  to authenticated
  using (auth.uid() = user_id);

-- Optional display name + avatar URL for navbar / greeting (edited in Settings → Profile).
create table if not exists public.user_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  display_name text check (display_name is null or length(trim(display_name)) between 1 and 80),
  avatar_url text check (avatar_url is null or length(avatar_url) between 8 and 2048),
  updated_at timestamptz not null default now()
);

alter table public.user_profiles enable row level security;

drop policy if exists "user_profiles_select_own" on public.user_profiles;
drop policy if exists "user_profiles_insert_own" on public.user_profiles;
drop policy if exists "user_profiles_update_own" on public.user_profiles;
drop policy if exists "user_profiles_select_household_peers" on public.user_profiles;

create policy "user_profiles_select_own"
  on public.user_profiles
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "user_profiles_insert_own"
  on public.user_profiles
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "user_profiles_update_own"
  on public.user_profiles
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Default monthly budget (used when no row exists in monthly_limits for that month).
alter table public.user_profiles add column if not exists default_monthly_limit numeric(12, 2)
  check (default_monthly_limit is null or default_monthly_limit > 0);

-- Public bucket for profile photos (upload via app; paths are `{user_id}/{filename}`).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,
  2097152,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']::text[]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "avatars_public_read" on storage.objects;
drop policy if exists "avatars_insert_own" on storage.objects;
drop policy if exists "avatars_update_own" on storage.objects;
drop policy if exists "avatars_delete_own" on storage.objects;

create policy "avatars_public_read"
  on storage.objects
  for select
  to public
  using (bucket_id = 'avatars');

create policy "avatars_insert_own"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and split_part(name, '/', 1) = auth.uid()::text
  );

create policy "avatars_update_own"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'avatars'
    and split_part(name, '/', 1) = auth.uid()::text
  )
  with check (
    bucket_id = 'avatars'
    and split_part(name, '/', 1) = auth.uid()::text
  );

create policy "avatars_delete_own"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'avatars'
    and split_part(name, '/', 1) = auth.uid()::text
  );

-- Accounts: starting balance minus linked expenses = current balance (computed in app). kind is always 'account'.
create table if not exists public.user_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 64),
  kind text not null default 'account' check (kind in ('account', 'cash', 'bank')),
  opening_balance numeric(12, 2) not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists user_accounts_user_id_idx
  on public.user_accounts (user_id);

alter table public.user_accounts enable row level security;

drop policy if exists "user_accounts_select_own" on public.user_accounts;
drop policy if exists "user_accounts_insert_own" on public.user_accounts;
drop policy if exists "user_accounts_update_own" on public.user_accounts;
drop policy if exists "user_accounts_delete_own" on public.user_accounts;
drop policy if exists "user_accounts_select_household_peers" on public.user_accounts;

create policy "user_accounts_select_own"
  on public.user_accounts
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "user_accounts_insert_own"
  on public.user_accounts
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "user_accounts_update_own"
  on public.user_accounts
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "user_accounts_delete_own"
  on public.user_accounts
  for delete
  to authenticated
  using (auth.uid() = user_id);

alter table public.expenses
  add column if not exists account_id uuid references public.user_accounts (id) on delete set null;

-- Replace older ON DELETE RESTRICT FK with SET NULL (safe to re-run).
alter table public.expenses drop constraint if exists expenses_account_id_fkey;
alter table public.expenses
  add constraint expenses_account_id_fkey
  foreign key (account_id) references public.user_accounts (id) on delete set null;

create index if not exists expenses_account_id_idx
  on public.expenses (account_id)
  where account_id is not null;

alter table public.expenses
  add column if not exists spend_source text not null default 'budget'
  check (spend_source in ('budget', 'savings'));

create index if not exists expenses_user_spend_source_idx
  on public.expenses (user_id, spend_source);

-- Idempotent month closes for budget → savings rollover
create table if not exists public.savings_month_closure (
  user_id uuid not null references auth.users (id) on delete cascade,
  month_key text not null check (month_key ~ '^\d{4}-\d{2}$'),
  rollover_amount numeric(12, 2) not null default 0 check (rollover_amount >= 0),
  created_at timestamptz not null default now(),
  primary key (user_id, month_key)
);

alter table public.savings_month_closure enable row level security;

drop policy if exists "savings_month_closure_select_own" on public.savings_month_closure;
drop policy if exists "savings_month_closure_insert_own" on public.savings_month_closure;

create policy "savings_month_closure_select_own"
  on public.savings_month_closure
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "savings_month_closure_insert_own"
  on public.savings_month_closure
  for insert
  to authenticated
  with check (auth.uid() = user_id);

-- Savings history: rollovers (positive) and spends from savings (negative amounts)
create table if not exists public.savings_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  entry_type text not null check (entry_type in ('monthly_rollover', 'spend_from_savings')),
  amount numeric(12, 2) not null,
  source_month text check (source_month is null or source_month ~ '^\d{4}-\d{2}$'),
  period_month text not null check (period_month ~ '^\d{4}-\d{2}$'),
  expense_id uuid references public.expenses (id) on delete cascade,
  note text,
  created_at timestamptz not null default now()
);

create index if not exists savings_ledger_user_created_idx
  on public.savings_ledger (user_id, created_at desc);

create unique index if not exists savings_ledger_rollover_month_unique
  on public.savings_ledger (user_id, period_month)
  where entry_type = 'monthly_rollover';

create unique index if not exists savings_ledger_expense_id_unique
  on public.savings_ledger (expense_id)
  where expense_id is not null;

alter table public.savings_ledger enable row level security;

drop policy if exists "savings_ledger_select_own" on public.savings_ledger;
drop policy if exists "savings_ledger_insert_own" on public.savings_ledger;
drop policy if exists "savings_ledger_delete_own" on public.savings_ledger;
drop policy if exists "savings_ledger_delete_for_household_expense" on public.savings_ledger;
drop policy if exists "savings_ledger_insert_for_household_expense" on public.savings_ledger;

create policy "savings_ledger_select_own"
  on public.savings_ledger
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "savings_ledger_insert_own"
  on public.savings_ledger
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "savings_ledger_delete_own"
  on public.savings_ledger
  for delete
  to authenticated
  using (auth.uid() = user_id);

-- One-time migration if your DB still has kind in ('cash','bank') only:
-- alter table public.user_accounts drop constraint if exists user_accounts_kind_check;
-- alter table public.user_accounts add constraint user_accounts_kind_check
--   check (kind in ('account', 'cash', 'bank'));
-- alter table public.user_accounts alter column kind set default 'account';
-- update public.user_accounts set kind = 'account' where kind in ('cash', 'bank');

-- ---------------------------------------------------------------------------
-- Households (family): shared expense visibility; admin invites with view/full
-- ---------------------------------------------------------------------------

create table if not exists public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Family' check (char_length(trim(name)) between 1 and 80),
  created_at timestamptz not null default now()
);

alter table public.households enable row level security;

drop policy if exists "households_select_member" on public.households;

create table if not exists public.household_members (
  household_id uuid not null references public.households (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('admin', 'full', 'view')),
  joined_at timestamptz not null default now(),
  primary key (household_id, user_id)
);

create unique index if not exists household_members_one_household_per_user_idx
  on public.household_members (user_id);

create index if not exists household_members_household_id_idx
  on public.household_members (household_id);

alter table public.household_members enable row level security;

drop policy if exists "household_members_select_peers" on public.household_members;

-- RLS-safe helpers: policies must not subquery household_members directly or PostgreSQL raises
-- infinite recursion on that table (42P17). These run as definer and bypass RLS on reads.
create or replace function public.household_has_member(p_household_id uuid, p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.household_members m
    where m.household_id = p_household_id
      and m.user_id = p_user_id
  );
$$;

create or replace function public.household_member_role(p_household_id uuid, p_user_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select m.role
  from public.household_members m
  where m.household_id = p_household_id
    and m.user_id = p_user_id
  limit 1;
$$;

create or replace function public.users_in_same_household(p_a uuid, p_b uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.household_members ma
    join public.household_members mb
      on ma.household_id = mb.household_id
    where ma.user_id = p_a
      and mb.user_id = p_b
  );
$$;

revoke all on function public.household_has_member(uuid, uuid) from public;
grant execute on function public.household_has_member(uuid, uuid) to authenticated;

revoke all on function public.household_member_role(uuid, uuid) from public;
grant execute on function public.household_member_role(uuid, uuid) to authenticated;

revoke all on function public.users_in_same_household(uuid, uuid) from public;
grant execute on function public.users_in_same_household(uuid, uuid) to authenticated;

create or replace function public.current_user_household_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select hm.household_id
  from public.household_members hm
  where hm.user_id = auth.uid()
  limit 1;
$$;

create or replace function public.household_admin_user_id(p_household_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select m.user_id
  from public.household_members m
  where m.household_id = p_household_id
    and m.role = 'admin'
  limit 1;
$$;

revoke all on function public.current_user_household_id() from public;
grant execute on function public.current_user_household_id() to authenticated;

revoke all on function public.household_admin_user_id(uuid) from public;
grant execute on function public.household_admin_user_id(uuid) to authenticated;

-- Guests (view) read the household admin's budget rows for dashboard/expenses UI.
drop policy if exists "monthly_limits_select_household_guest" on public.monthly_limits;
create policy "monthly_limits_select_household_guest"
  on public.monthly_limits
  for select
  to authenticated
  using (
    public.household_member_role(public.current_user_household_id(), auth.uid()) = 'view'
    and public.monthly_limits.user_id = public.household_admin_user_id(public.current_user_household_id())
  );

drop policy if exists "user_categories_select_household_guest" on public.user_categories;
create policy "user_categories_select_household_guest"
  on public.user_categories
  for select
  to authenticated
  using (
    public.household_member_role(public.current_user_household_id(), auth.uid()) = 'view'
    and public.user_categories.user_id = public.household_admin_user_id(public.current_user_household_id())
  );

drop policy if exists "category_limits_select_household_guest" on public.category_limits;
create policy "category_limits_select_household_guest"
  on public.category_limits
  for select
  to authenticated
  using (
    public.household_member_role(public.current_user_household_id(), auth.uid()) = 'view'
    and public.category_limits.user_id = public.household_admin_user_id(public.current_user_household_id())
  );

-- Short-lived share links (admin only). Optional legacy email column; token-only invites use email IS NULL.
-- Default expiry 15 minutes; authenticated user who opens link in time joins with their own account.
create table if not exists public.household_invites (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  email text,
  role text not null check (role in ('full', 'view')),
  token text not null unique default encode(gen_random_bytes(16), 'hex'),
  invited_by uuid not null,
  expires_at timestamptz not null default (now() + interval '15 minutes'),
  created_at timestamptz not null default now(),
  constraint household_invites_email_check check (email is null or char_length(trim(email)) between 3 and 320)
);

alter table public.household_invites
  drop constraint if exists household_invites_invited_by_fkey;

-- Migrate older databases (email required / long expiry defaults).
alter table public.household_invites alter column email drop not null;
alter table public.household_invites drop constraint if exists household_invites_email_check;
alter table public.household_invites
  add constraint household_invites_email_check check (email is null or char_length(trim(email)) between 3 and 320);
alter table public.household_invites
  alter column expires_at set default (now() + interval '15 minutes');

drop index if exists household_invites_house_email_lower_idx;
create unique index if not exists household_invites_house_email_lower_idx
  on public.household_invites (household_id, lower(trim(email)))
  where email is not null;

create index if not exists household_invites_household_id_idx
  on public.household_invites (household_id);

alter table public.household_invites enable row level security;

drop policy if exists "household_invites_select_admin" on public.household_invites;
drop policy if exists "household_invites_select_invitee" on public.household_invites;
-- (legacy) email-matched invitee policy removed — joins use time-limited token only.
drop policy if exists "household_invites_insert_admin" on public.household_invites;
drop policy if exists "household_invites_delete_admin" on public.household_invites;

alter table public.expenses
  add column if not exists household_id uuid references public.households (id) on delete set null;

create index if not exists expenses_household_id_idx
  on public.expenses (household_id)
  where household_id is not null;

-- See other members' display names in the same household (read-only).
create policy "user_profiles_select_household_peers"
  on public.user_profiles
  for select
  to authenticated
  using (
    public.users_in_same_household(auth.uid(), public.user_profiles.user_id)
  );

-- Households: any member can read their household row.
create policy "households_select_member"
  on public.households
  for select
  to authenticated
  using (public.household_has_member(public.households.id, auth.uid()));

-- Members: see others in the same household.
create policy "household_members_select_peers"
  on public.household_members
  for select
  to authenticated
  using (public.household_has_member(public.household_members.household_id, auth.uid()));

drop policy if exists "household_members_update_admin" on public.household_members;
create policy "household_members_update_admin"
  on public.household_members
  for update
  to authenticated
  using (public.household_member_role(public.household_members.household_id, auth.uid()) = 'admin')
  with check (public.household_member_role(public.household_members.household_id, auth.uid()) = 'admin');

drop policy if exists "household_members_delete_admin" on public.household_members;
drop policy if exists "household_members_delete_self_leave" on public.household_members;
-- Member removal: admin_detach_household_member() (expense detach + delete under definer).

-- Admins manage invites.
create policy "household_invites_select_admin"
  on public.household_invites
  for select
  to authenticated
  using (
    public.household_member_role(public.household_invites.household_id, auth.uid()) = 'admin'
  );

create policy "household_invites_insert_admin"
  on public.household_invites
  for insert
  to authenticated
  with check (
    public.household_member_role(public.household_invites.household_id, auth.uid()) = 'admin'
  );

create policy "household_invites_delete_admin"
  on public.household_invites
  for delete
  to authenticated
  using (
    public.household_member_role(public.household_invites.household_id, auth.uid()) = 'admin'
  );

-- Expense RLS: replace single-user-only policies with household-aware rules (idempotent drops).
drop policy if exists "expenses_select_own" on public.expenses;
drop policy if exists "expenses_insert_own" on public.expenses;
drop policy if exists "expenses_update_own" on public.expenses;
drop policy if exists "expenses_delete_own" on public.expenses;

create policy "expenses_select_household"
  on public.expenses
  for select
  to authenticated
  using (
    auth.uid() = user_id
    or (
      household_id is not null
      and public.household_has_member(public.expenses.household_id, auth.uid())
    )
  );

create policy "expenses_insert_household"
  on public.expenses
  for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and (
      household_id is null
      or public.household_member_role(public.expenses.household_id, auth.uid()) in ('admin', 'full')
    )
  );

create policy "expenses_update_household"
  on public.expenses
  for update
  to authenticated
  using (
    (
      household_id is null
      and user_id = auth.uid()
    )
    or (
      household_id is not null
      and public.household_member_role(public.expenses.household_id, auth.uid()) in ('admin', 'full')
    )
  )
  with check (
    (
      household_id is null
      and user_id = auth.uid()
    )
    or (
      household_id is not null
      and public.household_member_role(public.expenses.household_id, auth.uid()) in ('admin', 'full')
    )
  );

create policy "expenses_delete_household"
  on public.expenses
  for delete
  to authenticated
  using (
    (
      household_id is null
      and user_id = auth.uid()
    )
    or (
      household_id is not null
      and public.household_member_role(public.expenses.household_id, auth.uid()) in ('admin', 'full')
    )
  );

-- Bootstrap: create a solo household and attach historical expenses.
create or replace function public.create_default_household()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  hid uuid;
begin
  select hm.household_id
  into hid
  from public.household_members hm
  where hm.user_id = auth.uid()
  limit 1;

  if hid is not null then
    update public.expenses
    set household_id = hid
    where user_id = auth.uid()
      and household_id is null;
    return hid;
  end if;

  insert into public.households (name)
  values ('Family')
  returning id into hid;

  insert into public.household_members (household_id, user_id, role)
  values (hid, auth.uid(), 'admin');

  update public.expenses
  set household_id = hid
  where user_id = auth.uid()
    and household_id is null;

  return hid;
end;
$$;

revoke all on function public.create_default_household() from public;
grant execute on function public.create_default_household() to authenticated;

-- Accept invite: logged-in user joins via time-limited token (no email match). Migrates solo household if needed.
create or replace function public.accept_household_invite(invite_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  inv public.household_invites%rowtype;
  uid uuid := auth.uid();
  cur_hid uuid;
  mem_count int;
begin
  if invite_token is null or trim(invite_token) = '' then
    return jsonb_build_object('ok', false, 'error', 'Missing invite token.');
  end if;

  if uid is null then
    return jsonb_build_object('ok', false, 'error', 'Not authenticated.');
  end if;

  select *
  into inv
  from public.household_invites
  where token = invite_token
    and expires_at > now();

  if inv.id is null then
    return jsonb_build_object('ok', false, 'error', 'Invalid or expired invite. Ask for a new link (links expire in 15 minutes).');
  end if;

  if inv.email is not null then
    -- Legacy email-bound invites (optional): must still match signed-in user.
    if not exists (
      select 1 from auth.users u
      where u.id = uid
        and lower(trim(coalesce(u.email, ''))) = lower(trim(inv.email))
    ) then
      return jsonb_build_object(
        'ok', false,
        'error', 'Sign in with the invited email address, then try again.'
      );
    end if;
  end if;

  if exists (
    select 1 from public.household_members m
    where m.user_id = uid
      and m.household_id = inv.household_id
  ) then
    delete from public.household_invites where id = inv.id;
    return jsonb_build_object('ok', true, 'alreadyMember', true);
  end if;

  select household_id into cur_hid
  from public.household_members
  where user_id = uid
  limit 1;

  if cur_hid is not null then
    select count(*)::int into mem_count
    from public.household_members
    where household_id = cur_hid;

    if mem_count > 1 then
      return jsonb_build_object(
        'ok', false,
        'error', 'You already belong to a household with other members. Leave it before accepting.'
      );
    end if;

    update public.expenses
    set household_id = inv.household_id
    where user_id = uid;

    delete from public.household_members where user_id = uid;

    delete from public.households h
    where h.id = cur_hid
      and not exists (
        select 1 from public.household_members m where m.household_id = h.id
      );
  end if;

  insert into public.household_members (household_id, user_id, role)
  values (inv.household_id, uid, inv.role);

  delete from public.household_invites where id = inv.id;

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.accept_household_invite(text) from public;
grant execute on function public.accept_household_invite(text) to authenticated;

-- Detach a guest/full member's expenses and remove membership (admin only; RLS blocks raw expense updates).
create or replace function public.admin_detach_household_member(p_target_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  hid uuid;
  admin_uid uuid := auth.uid();
  target_role text;
begin
  if admin_uid is null or p_target_user_id is null then
    return jsonb_build_object('ok', false, 'error', 'Not authenticated.');
  end if;

  if p_target_user_id = admin_uid then
    return jsonb_build_object('ok', false, 'error', 'Admins cannot remove themselves here.');
  end if;

  select hm.household_id into hid
  from public.household_members hm
  where hm.user_id = admin_uid
  limit 1;

  if hid is null then
    return jsonb_build_object('ok', false, 'error', 'No household.');
  end if;

  if public.household_member_role(hid, admin_uid) is distinct from 'admin' then
    return jsonb_build_object('ok', false, 'error', 'Only the household admin can remove members.');
  end if;

  select m.role into target_role
  from public.household_members m
  where m.household_id = hid
    and m.user_id = p_target_user_id;

  if target_role is null then
    return jsonb_build_object('ok', false, 'error', 'That person is not in your household.');
  end if;

  if target_role = 'admin' then
    return jsonb_build_object('ok', false, 'error', 'Cannot remove the household admin.');
  end if;

  update public.expenses e
  set household_id = null
  where e.user_id = p_target_user_id
    and e.household_id = hid;

  delete from public.household_members m
  where m.household_id = hid
    and m.user_id = p_target_user_id;

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.admin_detach_household_member(uuid) from public;
grant execute on function public.admin_detach_household_member(uuid) to authenticated;

-- Read peers' cash accounts for labels (no writes on their rows unless RLS allows — insert/update remain own-only).
create policy "user_accounts_select_household_peers"
  on public.user_accounts
  for select
  to authenticated
  using (
    public.users_in_same_household(auth.uid(), public.user_accounts.user_id)
  );

-- Let admin/full household members adjust savings_ledger rows tied to a shared expense (same expense owner as ledger.user_id).
create policy "savings_ledger_delete_for_household_expense"
  on public.savings_ledger
  for delete
  to authenticated
  using (
    expense_id is not null
    and public.household_member_role(
      (select e.household_id from public.expenses e where e.id = public.savings_ledger.expense_id limit 1),
      auth.uid()
    ) in ('admin', 'full')
  );

create policy "savings_ledger_insert_for_household_expense"
  on public.savings_ledger
  for insert
  to authenticated
  with check (
    expense_id is not null
    and user_id = (select ee.user_id from public.expenses ee where ee.id = expense_id limit 1)
    and public.household_member_role(
      (select e.household_id from public.expenses e where e.id = public.savings_ledger.expense_id limit 1),
      auth.uid()
    ) in ('admin', 'full')
  );
