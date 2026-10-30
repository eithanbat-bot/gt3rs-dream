-- LeadLift Mail. Applied to GT3 RS Supabase project on 2026-10-30.
-- Preserve unrelated LeadLift lead-capture and payment tables.
create table if not exists public.mailbox_accounts (
 id uuid primary key default gen_random_uuid(),
 owner_user_id uuid not null references auth.users(id) on delete cascade,
 provider text not null check (provider in ('google','microsoft')),
 email_address text not null check (length(email_address) between 5 and 254),
 token_ciphertext text not null,
 refresh_ciphertext text not null,
 token_expires_at timestamptz not null,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 last_sync_at timestamptz,
 voice_sample_count integer not null default 0 check (voice_sample_count between 0 and 500),
 training_cursor text,
 ai_processing_consent boolean not null default false,
 send_mode text not null default 'approval' check (send_mode in ('approval','paused')),
 unique (owner_user_id,provider,email_address)
);
create table if not exists public.mailbox_messages (
 id uuid primary key default gen_random_uuid(),
 owner_user_id uuid not null references auth.users(id) on delete cascade,
 account_id uuid not null references public.mailbox_accounts(id) on delete cascade,
 provider_message_id text not null,
 provider_thread_id text,
 direction text not null default 'inbound' check (direction in ('inbound','outbound')),
 sender_email text not null,
 subject text not null default '',
 body_text text not null default '',
 received_at timestamptz not null,
 intent_score integer not null check (intent_score between 0 and 100),
 category text not null default 'other',
 score_reasons text[] not null default '{}',
 requires_human boolean not null default false,
 escalation_reason text,
 status text not null default 'new' check (status in ('new','drafted','review','sending','send_unknown','sent','dismissed')),
 draft_reply text,
 brief text,
 rfc822_id text,
 to_email text,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique (account_id,provider_message_id)
);
create table if not exists public.mailbox_voice_profiles (
 account_id uuid primary key references public.mailbox_accounts(id) on delete cascade,
 owner_user_id uuid not null references auth.users(id) on delete cascade,
 sample_count integer not null default 0 check (sample_count between 0 and 500),
 avg_words numeric not null default 0,
 formality_score numeric not null default 0,
 exclamation_rate numeric not null default 0,
 greeting_counts jsonb not null default '{}'::jsonb,
 signoff_counts jsonb not null default '{}'::jsonb,
 updated_at timestamptz not null default now()
);
create table if not exists public.mailbox_audit (
 id bigint generated always as identity primary key,
 owner_user_id uuid not null references auth.users(id) on delete cascade,
 account_id uuid references public.mailbox_accounts(id) on delete set null,
 message_id uuid references public.mailbox_messages(id) on delete set null,
 action text not null,
 details jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now()
);
create table if not exists public.mailbox_oauth_states (
 state_hash text primary key,
 owner_user_id uuid not null references auth.users(id) on delete cascade,
 provider text not null check (provider in ('google','microsoft')),
 expires_at timestamptz not null,
 created_at timestamptz not null default now()
);
create index if not exists mailbox_messages_priority_idx on public.mailbox_messages(owner_user_id,intent_score desc,received_at desc);
create index if not exists mailbox_messages_account_idx on public.mailbox_messages(account_id,received_at desc);
create index if not exists mailbox_audit_idx on public.mailbox_audit(owner_user_id,created_at desc);
alter table public.mailbox_accounts enable row level security;
alter table public.mailbox_messages enable row level security;
alter table public.mailbox_voice_profiles enable row level security;
alter table public.mailbox_audit enable row level security;
alter table public.mailbox_oauth_states enable row level security;
create policy "Account owner can see connections" on public.mailbox_accounts for select to authenticated using ((select auth.uid())=owner_user_id);
create policy "Account owner can read own messages" on public.mailbox_messages for select to authenticated using ((select auth.uid())=owner_user_id);
create policy "Account owner can read own voice profile" on public.mailbox_voice_profiles for select to authenticated using ((select auth.uid())=owner_user_id);
create policy "Account owner can read own audit" on public.mailbox_audit for select to authenticated using ((select auth.uid())=owner_user_id);
revoke all on public.mailbox_accounts from anon,authenticated;
grant select (id,owner_user_id,provider,email_address,token_expires_at,created_at,updated_at,last_sync_at,voice_sample_count,ai_processing_consent,send_mode) on public.mailbox_accounts to authenticated;
revoke all on public.mailbox_oauth_states from anon,authenticated;
grant select on public.mailbox_messages,public.mailbox_voice_profiles,public.mailbox_audit to authenticated;
comment on table public.mailbox_accounts is 'OAuth tokens encrypted server-side; no client write access; mailbox connections opt-in.';
comment on table public.mailbox_messages is 'Private customer message content; owner-only RLS, retain minimally and allow deletion.';
