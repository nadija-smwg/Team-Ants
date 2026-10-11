-- Ants v2: additive private workspace schema. Safe to run repeatedly.
-- Existing public.competitions / tasks / resources are preserved and never read by v2.
-- Apply in Supabase SQL Editor as the database owner.
begin;
create schema if not exists ants_private;
revoke all on schema ants_private from public;
grant usage on schema ants_private to authenticated;
create table if not exists public.ants_workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 1 and 80),
  owner_id uuid not null references auth.users(id),
  invite_code text not null unique default replace(gen_random_uuid()::text, '-', ''),
  created_at timestamptz not null default now()
);
create table if not exists public.ants_members (
  workspace_id uuid not null references public.ants_workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null check(length(trim(display_name)) between 1 and 60),
  role text not null check(role in ('owner','member')),
  primary key(workspace_id,user_id), unique(user_id)
);
create table if not exists public.ants_competitions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.ants_workspaces(id) on delete cascade,
  title text not null check(length(trim(title)) between 1 and 200),
  organizer text not null default '', category text not null default 'Hackathon',
  deadline date, event_date date,
  stage text not null default 'Discovering' check(stage in ('Discovering','Preparing','Submitted','Shortlisted','Finalist','Won','Not selected')),
  priority text not null default 'Medium' check(priority in ('High','Medium','Low')),
  prize text not null default '', application_url text not null default '',
  owner text not null default '', notes text not null default '', requirements text not null default '',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(workspace_id,id),
  check(application_url = '' or application_url ~* '^https?://')
);
create table if not exists public.ants_tasks (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.ants_workspaces(id) on delete cascade,
  title text not null check(length(trim(title)) between 1 and 200),
  competition_id uuid,
  assignee text not null default '', due_date date,
  priority text not null default 'Medium' check(priority in ('High','Medium','Low')),
  completed boolean not null default false,
  description text not null default '', created_at timestamptz not null default now(),
  foreign key(workspace_id,competition_id) references public.ants_competitions(workspace_id,id) on delete set null (competition_id)
);
create table if not exists public.ants_resources (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.ants_workspaces(id) on delete cascade,
  title text not null check(length(trim(title)) between 1 and 200),
  url text not null default '' check(url = '' or url ~* '^https?://'), kind text not null default 'Link',
  competition_id uuid, description text not null default '', created_at timestamptz not null default now(),
  foreign key(workspace_id,competition_id) references public.ants_competitions(workspace_id,id) on delete set null (competition_id)
);
create index if not exists ants_competitions_workspace_date on public.ants_competitions(workspace_id,deadline);
create index if not exists ants_tasks_workspace_competition on public.ants_tasks(workspace_id,competition_id);
create index if not exists ants_resources_workspace_competition on public.ants_resources(workspace_id,competition_id);
-- This internal lookup bypasses membership RLS to avoid recursive policies.
create or replace function ants_private.is_member(target uuid) returns boolean
language sql stable security definer set search_path = '' as $$
 select auth.uid() is not null and exists(select 1 from public.ants_members m where m.workspace_id=target and m.user_id=(select auth.uid()));
$$;
revoke all on function ants_private.is_member(uuid) from public;
grant execute on function ants_private.is_member(uuid) to authenticated;

alter table public.ants_workspaces enable row level security;
alter table public.ants_members enable row level security;
alter table public.ants_competitions enable row level security;
alter table public.ants_tasks enable row level security;
alter table public.ants_resources enable row level security;
revoke all on public.ants_workspaces,public.ants_members,public.ants_competitions,public.ants_tasks,public.ants_resources from anon,authenticated;
grant select on public.ants_workspaces,public.ants_members to authenticated;
grant select,insert,update,delete on public.ants_competitions,public.ants_tasks,public.ants_resources to authenticated;
drop policy if exists ants_workspace_read on public.ants_workspaces;
create policy ants_workspace_read on public.ants_workspaces for select to authenticated using(ants_private.is_member(id));
drop policy if exists ants_member_read on public.ants_members;
create policy ants_member_read on public.ants_members for select to authenticated using(ants_private.is_member(workspace_id));
do $$ declare tbl text; begin
 foreach tbl in array array['ants_competitions','ants_tasks','ants_resources'] loop
 execute format('drop policy if exists ants_member_access on public.%I',tbl);
 execute format('create policy ants_member_access on public.%I for all to authenticated using (ants_private.is_member(workspace_id)) with check (ants_private.is_member(workspace_id))',tbl);
 end loop;
end $$;
create or replace function ants_private.touch_updated_at() returns trigger
language plpgsql set search_path='' as $$ begin new.updated_at=now();return new;end $$;
drop trigger if exists ants_competition_timestamp on public.ants_competitions;
create trigger ants_competition_timestamp before update on public.ants_competitions for each row execute function ants_private.touch_updated_at();

-- Privileged work is kept in a non-exposed schema and checks the caller explicitly.
create or replace function ants_private.create_workspace(team_name text,display_name text) returns uuid
language plpgsql security definer set search_path='' as $$
declare who uuid := auth.uid(); team uuid;
begin
 if who is null then raise exception 'Sign in to create a workspace.';end if;
 if length(trim(team_name)) not between 1 and 80 or length(trim(display_name)) not between 1 and 60 then raise exception 'Enter a team name and your display name.';end if;
 if exists(select 1 from public.ants_members where user_id=who) then raise exception 'You already belong to a workspace.';end if;
 insert into public.ants_workspaces(name,owner_id) values(trim(team_name),who) returning id into team;
 insert into public.ants_members(workspace_id,user_id,display_name,role) values(team,who,trim(display_name),'owner');
 return team;
end $$;
create or replace function ants_private.join_workspace(invite text,display_name text) returns uuid
language plpgsql security definer set search_path='' as $$
declare who uuid := auth.uid();team uuid;
begin
 if who is null then raise exception 'Sign in to join a workspace.';end if;
 if length(trim(display_name)) not between 1 and 60 then raise exception 'Enter your display name.';end if;
 if exists(select 1 from public.ants_members where user_id=who) then raise exception 'You already belong to a workspace.';end if;
 select id into team from public.ants_workspaces where invite_code=trim(invite);
 if team is null then raise exception 'That invite code was not found. Check it with your team.';end if;
 insert into public.ants_members(workspace_id,user_id,display_name,role) values(team,who,trim(display_name),'member');
 return team;
end $$;
revoke all on function ants_private.create_workspace(text,text),ants_private.join_workspace(text,text),ants_private.touch_updated_at() from public;
grant execute on function ants_private.create_workspace(text,text),ants_private.join_workspace(text,text) to authenticated;
create or replace function public.ants_create_workspace(team_name text,display_name text) returns uuid
language sql security invoker set search_path='' as $$select ants_private.create_workspace(team_name,display_name);$$;
create or replace function public.ants_join_workspace(invite text,display_name text) returns uuid
language sql security invoker set search_path='' as $$select ants_private.join_workspace(invite,display_name);$$;
revoke all on function public.ants_create_workspace(text,text),public.ants_join_workspace(text,text) from public,anon;
grant execute on function public.ants_create_workspace(text,text),public.ants_join_workspace(text,text) to authenticated;
commit;

-- Atomic import into an empty workspace, guarded by the same member RLS.
create or replace function public.ants_import_workspace(target uuid,payload jsonb) returns void
language plpgsql security invoker set search_path='' as $$
begin
 if not ants_private.is_member(target) then raise exception 'Workspace access denied.';end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(target::text,0));
 if exists(select 1 from public.ants_competitions where workspace_id=target) or exists(select 1 from public.ants_tasks where workspace_id=target) or exists(select 1 from public.ants_resources where workspace_id=target) then raise exception 'Import is available only for an empty workspace.';end if;
 if jsonb_typeof(payload->'competitions') is distinct from 'array' or jsonb_typeof(payload->'tasks') is distinct from 'array' or jsonb_typeof(payload->'resources') is distinct from 'array' then raise exception 'Invalid backup format.';end if;
 insert into public.ants_competitions(id,workspace_id,title,organizer,category,deadline,event_date,stage,priority,prize,application_url,owner,notes,requirements)
 select r.id,target,r.title,r.organizer,r.category,r.deadline,r.event_date,r.stage,r.priority,r.prize,r.application_url,r.owner,r.notes,r.requirements
 from jsonb_to_recordset(payload->'competitions') as r(id uuid,title text,organizer text,category text,deadline date,event_date date,stage text,priority text,prize text,application_url text,owner text,notes text,requirements text);
 insert into public.ants_tasks(id,workspace_id,title,competition_id,assignee,due_date,priority,completed,description)
 select r.id,target,r.title,r.competition_id,r.assignee,r.due_date,r.priority,r.completed,r.description
 from jsonb_to_recordset(payload->'tasks') as r(id uuid,title text,competition_id uuid,assignee text,due_date date,priority text,completed boolean,description text);
 insert into public.ants_resources(id,workspace_id,title,url,kind,competition_id,description)
 select r.id,target,r.title,r.url,r.kind,r.competition_id,r.description
 from jsonb_to_recordset(payload->'resources') as r(id uuid,title text,url text,kind text,competition_id uuid,description text);
end $$;
revoke all on function public.ants_import_workspace(uuid,jsonb) from public,anon;
grant execute on function public.ants_import_workspace(uuid,jsonb) to authenticated;

commit;
