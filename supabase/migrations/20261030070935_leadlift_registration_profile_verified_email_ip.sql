-- Applied to Supabase GT3 RS project as migration 20261030070935.
-- User identity is sourced from Supabase Auth and linked by the immutable auth.users.id.
-- Server-side register-leadlift-user Edge Function inserts signup-IP metadata.
-- Server-side profile action refreshes email verification after a confirmed sign-in.
create table if not exists public.leadlift_user_accounts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  email_verified_at timestamptz,
  subscription_status text not null default 'not_subscribed'
    check (subscription_status in ('not_subscribed','trial','active','past_due','canceled')),
  subscription_provider text,
  subscription_customer_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.leadlift_registration_network (
  user_id uuid primary key references auth.users(id) on delete cascade,
  signup_ip inet,
  ip_source text not null default 'unavailable'
    check (ip_source in ('cf-connecting-ip','x-real-ip','x-forwarded-for','unavailable')),
  observed_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '90 days')
);
alter table public.leadlift_user_accounts enable row level security;
alter table public.leadlift_registration_network enable row level security;
revoke all on public.leadlift_user_accounts from anon,authenticated;
grant select (user_id,email,email_verified_at,subscription_status,created_at,updated_at)
  on public.leadlift_user_accounts to authenticated;
revoke all on public.leadlift_registration_network from anon,authenticated;
create policy "Users can view own LeadLift identity" on public.leadlift_user_accounts
  for select to authenticated using ((select auth.uid())=user_id);
insert into public.leadlift_user_accounts(user_id,email,email_verified_at)
  select id,coalesce(email,''),email_confirmed_at from auth.users on conflict(user_id) do nothing;
create index if not exists leadlift_signup_ip_expiry on public.leadlift_registration_network(expires_at);
comment on table public.leadlift_registration_network is
  'Signup IP observed by Edge proxy, server-only access; daily expiry cleanup after 90 days.';
comment on table public.leadlift_user_accounts is
  'Future billing linked by Auth user ID, subscription fields controlled by server only.';
-- Operations: pg_cron was enabled separately, with daily (03:17 UTC)
-- cron.schedule('leadlift_purge_signup_ip_daily','17 3 * * *',
--     $$delete from public.leadlift_registration_network where expires_at <= now()$$);
