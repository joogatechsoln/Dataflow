-- =============================================================
-- DataFlow Suite - Supabase Schema
-- Run this in your Supabase project SQL Editor.
-- =============================================================

create extension if not exists pgcrypto;

-- Tables are created before policies so cross-table RLS references work.

create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text not null,
  name        text not null default '',
  avatar_url  text,
  plan        text not null default 'solo' check (plan in ('solo','pro','team')),
  created_at  timestamptz not null default now()
);

create table if not exists public.teams (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  owner_id    uuid not null references public.profiles(id) on delete cascade,
  created_at  timestamptz not null default now()
);

create table if not exists public.team_members (
  team_id     uuid not null references public.teams(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  role        text not null check (role in ('owner','editor','viewer')),
  joined_at   timestamptz not null default now(),
  primary key (team_id, user_id)
);

create table if not exists public.projects (
  id          uuid primary key default gen_random_uuid(),
  team_id     uuid references public.teams(id) on delete cascade,
  owner_id    uuid not null references public.profiles(id) on delete cascade,
  name        text not null,
  description text not null default '',
  data        jsonb not null default '{}',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.project_versions (
  id              uuid primary key default gen_random_uuid(),
  project_id      uuid not null references public.projects(id) on delete cascade,
  snapshot        jsonb not null,
  changed_by      uuid not null references public.profiles(id),
  change_summary  text not null default '',
  created_at      timestamptz not null default now()
);

create table if not exists public.invites (
  id          uuid primary key default gen_random_uuid(),
  team_id     uuid not null references public.teams(id) on delete cascade,
  email       text not null,
  role        text not null check (role in ('owner','editor','viewer')),
  token       text not null unique,
  expires_at  timestamptz not null,
  accepted    boolean not null default false,
  created_at  timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.teams enable row level security;
alter table public.team_members enable row level security;
alter table public.projects enable row level security;
alter table public.project_versions enable row level security;
alter table public.invites enable row level security;

-- RLS helper functions avoid recursive policies on team_members.

create or replace function public.is_team_member(_team_id uuid, _user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.team_members
    where team_id = _team_id
      and user_id = _user_id
  );
$$;

create or replace function public.is_team_owner(_team_id uuid, _user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.team_members
    where team_id = _team_id
      and user_id = _user_id
      and role = 'owner'
  );
$$;

create or replace function public.can_edit_team(_team_id uuid, _user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.team_members
    where team_id = _team_id
      and user_id = _user_id
      and role in ('owner','editor')
  );
$$;

-- Re-runnable policy setup.

drop policy if exists "users can read own profile" on public.profiles;
drop policy if exists "users can insert own profile" on public.profiles;
drop policy if exists "users can update own profile" on public.profiles;
drop policy if exists "team members can read team" on public.teams;
drop policy if exists "owners can update team" on public.teams;
drop policy if exists "authenticated users can create teams" on public.teams;
drop policy if exists "members can see teammates" on public.team_members;
drop policy if exists "owners/editors can add members" on public.team_members;
drop policy if exists "owners can update roles" on public.team_members;
drop policy if exists "owners can remove members" on public.team_members;
drop policy if exists "owners can manage own projects" on public.projects;
drop policy if exists "team members can read team projects" on public.projects;
drop policy if exists "team editors/owners can edit team projects" on public.projects;
drop policy if exists "project access grants version access" on public.project_versions;
drop policy if exists "project owners/editors can insert versions" on public.project_versions;
drop policy if exists "team owners can manage invites" on public.invites;

create policy "users can read own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "team members can read team"
  on public.teams for select
  using (public.is_team_member(id, auth.uid()));

create policy "owners can update team"
  on public.teams for update
  using (owner_id = auth.uid());

create policy "authenticated users can create teams"
  on public.teams for insert
  with check (auth.uid() = owner_id);

create policy "members can see teammates"
  on public.team_members for select
  using (public.is_team_member(team_id, auth.uid()));

create policy "owners/editors can add members"
  on public.team_members for insert
  with check (
    exists (
      select 1 from public.teams t
      where t.id = team_id
        and t.owner_id = auth.uid()
        and user_id = auth.uid()
        and role = 'owner'
    )
    or public.can_edit_team(team_id, auth.uid())
  );

create policy "owners can update roles"
  on public.team_members for update
  using (public.is_team_owner(team_id, auth.uid()));

create policy "owners can remove members"
  on public.team_members for delete
  using (public.is_team_owner(team_id, auth.uid()));

create policy "owners can manage own projects"
  on public.projects for all
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy "team members can read team projects"
  on public.projects for select
  using (
    team_id is not null
    and public.is_team_member(team_id, auth.uid())
  );

create policy "team editors/owners can edit team projects"
  on public.projects for update
  using (
    team_id is not null
    and public.can_edit_team(team_id, auth.uid())
  );

create policy "project access grants version access"
  on public.project_versions for select
  using (
    exists (
      select 1 from public.projects p
      where p.id = project_versions.project_id
        and (
          p.owner_id = auth.uid()
          or public.is_team_member(p.team_id, auth.uid())
        )
    )
  );

create policy "project owners/editors can insert versions"
  on public.project_versions for insert
  with check (
    exists (
      select 1 from public.projects p
      where p.id = project_id
        and (
          p.owner_id = auth.uid()
          or public.can_edit_team(p.team_id, auth.uid())
        )
    )
  );

create policy "team owners can manage invites"
  on public.invites for all
  using (public.is_team_owner(team_id, auth.uid()))
  with check (public.is_team_owner(team_id, auth.uid()));

-- Trigger: auto-create profile on signup.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
