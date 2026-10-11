-- Ants v3: no-auth private-use schema.
-- No login required. All tables are publicly accessible (suitable for personal/private Supabase projects).
-- Safe to run repeatedly. Apply in Supabase SQL Editor.

begin;

-- ── Workspaces ─────────────────────────────────────────────────────────────
create table if not exists public.ants_workspaces (
  id         uuid primary key default gen_random_uuid(),
  name       text not null check (length(trim(name)) between 1 and 80),
  created_at timestamptz not null default now()
);

-- ── Competitions ────────────────────────────────────────────────────────────
create table if not exists public.ants_competitions (
  id              uuid primary key default gen_random_uuid(),
  workspace_id    uuid not null references public.ants_workspaces(id) on delete cascade,
  title           text not null check(length(trim(title)) between 1 and 200),
  organizer       text not null default '',
  category        text not null default 'Hackathon',
  deadline        date,
  event_date      date,
  stage           text not null default 'Discovering'
                    check(stage in ('Discovering','Preparing','Submitted','Shortlisted','Finalist','Won','Not selected')),
  priority        text not null default 'Medium'
                    check(priority in ('High','Medium','Low')),
  prize           text not null default '',
  application_url text not null default '',
  owner           text not null default '',
  notes           text not null default '',
  requirements    text not null default '',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  check(application_url = '' or application_url ~* '^https?://')
);

-- ── Tasks ───────────────────────────────────────────────────────────────────
create table if not exists public.ants_tasks (
  id             uuid primary key default gen_random_uuid(),
  workspace_id   uuid not null references public.ants_workspaces(id) on delete cascade,
  title          text not null check(length(trim(title)) between 1 and 200),
  competition_id uuid references public.ants_competitions(id) on delete set null,
  assignee       text not null default '',
  due_date       date,
  priority       text not null default 'Medium' check(priority in ('High','Medium','Low')),
  completed      boolean not null default false,
  description    text not null default '',
  created_at     timestamptz not null default now()
);

-- ── Resources ───────────────────────────────────────────────────────────────
create table if not exists public.ants_resources (
  id             uuid primary key default gen_random_uuid(),
  workspace_id   uuid not null references public.ants_workspaces(id) on delete cascade,
  title          text not null check(length(trim(title)) between 1 and 200),
  url            text not null default '' check(url = '' or url ~* '^https?://'),
  kind           text not null default 'Link',
  competition_id uuid references public.ants_competitions(id) on delete set null,
  description    text not null default '',
  created_at     timestamptz not null default now()
);

-- ── Indexes ─────────────────────────────────────────────────────────────────
create index if not exists ants_competitions_workspace on public.ants_competitions(workspace_id, deadline);
create index if not exists ants_tasks_workspace        on public.ants_tasks(workspace_id, competition_id);
create index if not exists ants_resources_workspace    on public.ants_resources(workspace_id, competition_id);

-- ── Auto-update updated_at ──────────────────────────────────────────────────
create or replace function public.ants_touch_updated_at() returns trigger
language plpgsql as $$ begin new.updated_at = now(); return new; end $$;

drop trigger if exists ants_competition_timestamp on public.ants_competitions;
create trigger ants_competition_timestamp
  before update on public.ants_competitions
  for each row execute function public.ants_touch_updated_at();

-- ── Row Level Security: disabled (no-auth personal use) ─────────────────────
-- All tables are publicly accessible via the anon key.
-- If you want to restrict access later, enable RLS and add policies.
alter table public.ants_workspaces   disable row level security;
alter table public.ants_competitions disable row level security;
alter table public.ants_tasks        disable row level security;
alter table public.ants_resources    disable row level security;

-- Grant full access to the anon role (used by the publishable key)
grant select, insert, update, delete
  on public.ants_workspaces, public.ants_competitions, public.ants_tasks, public.ants_resources
  to anon;

-- ── Seed: create Team Ants workspace if it doesn't exist ────────────────────
insert into public.ants_workspaces (name)
select 'Team Ants'
where not exists (select 1 from public.ants_workspaces);

commit;
