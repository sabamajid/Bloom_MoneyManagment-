-- Run this in Supabase SQL Editor (or via migrations).
-- Idempotent: safe to re-run (drops/recreates RLS policies by name; tables use IF NOT EXISTS).

create extension if not exists "pgcrypto";

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  amount numeric(12, 2) not null check (amount > 0),
  category text not null,
  date timestamptz not null default now(),
  note text,
  created_at timestamptz not null default now()
);

create index if not exists expenses_user_id_date_idx
  on public.expenses (user_id, date desc);

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

-- Pending email invites (only admin creates). Role: full | view (not admin).
create table if not exists public.household_invites (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  email text not null check (char_length(trim(email)) between 3 and 320),
  role text not null check (role in ('full', 'view')),
  token text not null unique default encode(gen_random_bytes(16), 'hex'),
  invited_by uuid not null references auth.users (id) on delete cascade,
  expires_at timestamptz not null default (now() + interval '14 days'),
  created_at timestamptz not null default now()
);

create unique index if not exists household_invites_house_email_lower_idx
  on public.household_invites (household_id, lower(trim(email)));

create index if not exists household_invites_household_id_idx
  on public.household_invites (household_id);

alter table public.household_invites enable row level security;

drop policy if exists "household_invites_select_admin" on public.household_invites;
drop policy if exists "household_invites_select_invitee" on public.household_invites;
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

-- Admins manage invites.
create policy "household_invites_select_admin"
  on public.household_invites
  for select
  to authenticated
  using (
    public.household_member_role(public.household_invites.household_id, auth.uid()) = 'admin'
  );

create policy "household_invites_select_invitee"
  on public.household_invites
  for select
  to authenticated
  using (
    exists (
      select 1 from auth.users u
      where u.id = auth.uid()
        and lower(trim(coalesce(u.email, ''))) = lower(trim(public.household_invites.email))
    )
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

-- Accept invite: must be logged in as invite email; migrates a solo household if needed.
create or replace function public.accept_household_invite(invite_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  inv public.household_invites%rowtype;
  uid uuid := auth.uid();
  uemail text;
  cur_hid uuid;
  mem_count int;
begin
  if invite_token is null or trim(invite_token) = '' then
    return jsonb_build_object('ok', false, 'error', 'Missing invite token.');
  end if;

  select email into uemail from auth.users where id = uid;
  if uemail is null then
    return jsonb_build_object('ok', false, 'error', 'No email on account.');
  end if;

  select *
  into inv
  from public.household_invites
  where token = invite_token
    and expires_at > now();

  if inv.id is null then
    return jsonb_build_object('ok', false, 'error', 'Invalid or expired invite.');
  end if;

  if lower(trim(inv.email)) <> lower(trim(uemail)) then
    return jsonb_build_object(
      'ok', false,
      'error', 'Sign in with the invited email address, then try again.'
    );
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
