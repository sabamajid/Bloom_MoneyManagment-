-- Run this in Supabase SQL Editor (or via migrations).
-- It creates the expenses table with Row Level Security aligned to Supabase Auth users.

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
  add column if not exists account_id uuid references public.user_accounts (id) on delete restrict;

create index if not exists expenses_account_id_idx
  on public.expenses (account_id)
  where account_id is not null;

-- One-time migration if your DB still has kind in ('cash','bank') only:
-- alter table public.user_accounts drop constraint if exists user_accounts_kind_check;
-- alter table public.user_accounts add constraint user_accounts_kind_check
--   check (kind in ('account', 'cash', 'bank'));
-- alter table public.user_accounts alter column kind set default 'account';
-- update public.user_accounts set kind = 'account' where kind in ('cash', 'bank');
