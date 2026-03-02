-- ─────────────────────────────────────────────────────────────────────────────
-- Kairos — Migration 001 : Schema initial
-- ─────────────────────────────────────────────────────────────────────────────

-- ─── profiles ────────────────────────────────────────────────────────────────

create table if not exists public.profiles (
  id                uuid primary key references auth.users(id) on delete cascade,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),

  full_name         text,
  city              text,
  canton            char(2),
  target_role       text,

  -- JSON arrays
  languages         jsonb not null default '[]'::jsonb,
  contract_types    text[] not null default '{}',
  preferred_cantons text[] not null default '{}',
  key_skills        text[] not null default '{}',

  -- Search preferences
  workload_min      smallint not null default 80 check (workload_min between 0 and 100),
  workload_max      smallint not null default 100 check (workload_max between 0 and 100),
  salary_min        integer,
  work_mode         text check (work_mode in ('ONSITE', 'HYBRID', 'REMOTE')),
  email_alerts      boolean not null default true,

  -- CV
  cv_url            text,

  -- State
  onboarding_done   boolean not null default false,
  credits           integer not null default 3
);

-- Trigger: update updated_at on row update
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, full_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', null)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists trg_new_user on auth.users;
create trigger trg_new_user
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- RLS
alter table public.profiles enable row level security;

create policy "Users can read own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

-- ─── applications ─────────────────────────────────────────────────────────────

create table if not exists public.applications (
  id         uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  job_id     text not null,
  job_title  text not null,
  company    text,
  status     text not null default 'interested'
    check (status in ('interested','applied','interview','offer','rejected','withdrawn')),
  notes      text,
  applied_at timestamptz
);

alter table public.applications enable row level security;

create policy "Users can manage own applications"
  on public.applications for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ─── credit_transactions ──────────────────────────────────────────────────────

create table if not exists public.credit_transactions (
  id         uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  amount     integer not null,  -- positive = credit, negative = debit
  reason     text not null,
  metadata   jsonb not null default '{}'::jsonb
);

alter table public.credit_transactions enable row level security;

create policy "Users can read own transactions"
  on public.credit_transactions for select
  using (auth.uid() = user_id);

-- ─── job_alerts ───────────────────────────────────────────────────────────────

create table if not exists public.job_alerts (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz not null default now(),
  user_id      uuid not null references public.profiles(id) on delete cascade,
  name         text not null,
  filters      jsonb not null default '{}'::jsonb,
  active       boolean not null default true,
  last_sent_at timestamptz
);

alter table public.job_alerts enable row level security;

create policy "Users can manage own job alerts"
  on public.job_alerts for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ─── Storage: cvs bucket ─────────────────────────────────────────────────────

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'cvs',
  'cvs',
  true,
  5242880,  -- 5 MB
  array['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
)
on conflict (id) do nothing;

create policy "Users can upload own CV"
  on storage.objects for insert
  with check (
    bucket_id = 'cvs'
    and auth.uid()::text = (string_to_array(name, '/'))[2]
  );

create policy "Users can update own CV"
  on storage.objects for update
  using (
    bucket_id = 'cvs'
    and auth.uid()::text = (string_to_array(name, '/'))[2]
  );

create policy "Users can delete own CV"
  on storage.objects for delete
  using (
    bucket_id = 'cvs'
    and auth.uid()::text = (string_to_array(name, '/'))[2]
  );

create policy "Public read access to CVs"
  on storage.objects for select
  using (bucket_id = 'cvs');
