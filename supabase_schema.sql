-- =============================================================
-- DataFlow Suite — Supabase Schema (Phase 4)
-- Run this in your Supabase project → SQL Editor
-- =============================================================

-- Profiles (extends auth.users)
create table if not exists profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text not null,
  name        text not null default '',
  avatar_url  text,
  plan        text not null default 'solo' check (plan in ('solo','pro','team')),
  created_at  timestamptz not null default now()
);
alter table profiles enable row level security;
create policy "users can read own profile"
  on profiles for select using (auth.uid() = id);
create policy "users can update own profile"
  on profiles for update using (auth.uid() = id);

-- Teams
create table if not exists teams (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  owner_id    uuid not null references profiles(id) on delete cascade,
  created_at  timestamptz not null default now()
);
alter table teams enable row level security;
create policy "team members can read team"
  on teams for select
  using (
    exists (
      select 1 from team_members
      where team_members.team_id = teams.id
        and team_members.user_id = auth.uid()
    )
  );
create policy "owners can update team"
  on teams for update
  using (owner_id = auth.uid());
create policy "authenticated users can create teams"
  on teams for insert with check (auth.uid() = owner_id);

-- Team Members
create table if not exists team_members (
  team_id     uuid not null references teams(id) on delete cascade,
  user_id     uuid not null references profiles(id) on delete cascade,
  role        text not null check (role in ('owner','editor','viewer')),
  joined_at   timestamptz not null default now(),
  primary key (team_id, user_id)
);
alter table team_members enable row level security;
create policy "members can see teammates"
  on team_members for select
  using (
    exists (
      select 1 from team_members tm2
      where tm2.team_id = team_members.team_id
        and tm2.user_id = auth.uid()
    )
  );
create policy "owners/editors can add members"
  on team_members for insert
  with check (
    exists (
      select 1 from team_members tm2
      where tm2.team_id = team_id
        and tm2.user_id = auth.uid()
        and tm2.role in ('owner','editor')
    )
  );
create policy "owners can update roles"
  on team_members for update
  using (
    exists (
      select 1 from team_members tm2
      where tm2.team_id = team_members.team_id
        and tm2.user_id = auth.uid()
        and tm2.role = 'owner'
    )
  );
create policy "owners can remove members"
  on team_members for delete
  using (
    exists (
      select 1 from team_members tm2
      where tm2.team_id = team_members.team_id
        and tm2.user_id = auth.uid()
        and tm2.role = 'owner'
    )
  );

-- Projects (cloud-synced)
create table if not exists projects (
  id          uuid primary key default gen_random_uuid(),
  team_id     uuid references teams(id) on delete cascade,
  owner_id    uuid not null references profiles(id) on delete cascade,
  name        text not null,
  description text not null default '',
  data        jsonb not null default '{}',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
alter table projects enable row level security;
create policy "owners can manage own projects"
  on projects for all
  using (owner_id = auth.uid());
create policy "team members can read team projects"
  on projects for select
  using (
    team_id is not null and
    exists (
      select 1 from team_members
      where team_members.team_id = projects.team_id
        and team_members.user_id = auth.uid()
    )
  );
create policy "team editors/owners can edit team projects"
  on projects for update
  using (
    team_id is not null and
    exists (
      select 1 from team_members
      where team_members.team_id = projects.team_id
        and team_members.user_id = auth.uid()
        and team_members.role in ('owner','editor')
    )
  );

-- Project Versions (history snapshots)
create table if not exists project_versions (
  id              uuid primary key default gen_random_uuid(),
  project_id      uuid not null references projects(id) on delete cascade,
  snapshot        jsonb not null,
  changed_by      uuid not null references profiles(id),
  change_summary  text not null default '',
  created_at      timestamptz not null default now()
);
alter table project_versions enable row level security;
create policy "project access grants version access"
  on project_versions for select
  using (
    exists (
      select 1 from projects p
      left join team_members tm on tm.team_id = p.team_id
      where p.id = project_versions.project_id
        and (p.owner_id = auth.uid() or tm.user_id = auth.uid())
    )
  );
create policy "project owners/editors can insert versions"
  on project_versions for insert
  with check (
    exists (
      select 1 from projects p
      left join team_members tm on tm.team_id = p.team_id
      where p.id = project_id
        and (
          p.owner_id = auth.uid()
          or (tm.user_id = auth.uid() and tm.role in ('owner','editor'))
        )
    )
  );

-- Invites
create table if not exists invites (
  id          uuid primary key default gen_random_uuid(),
  team_id     uuid not null references teams(id) on delete cascade,
  email       text not null,
  role        text not null check (role in ('owner','editor','viewer')),
  token       text not null unique,
  expires_at  timestamptz not null,
  accepted    boolean not null default false,
  created_at  timestamptz not null default now()
);
alter table invites enable row level security;
create policy "team owners can manage invites"
  on invites for all
  using (
    exists (
      select 1 from team_members
      where team_members.team_id = invites.team_id
        and team_members.user_id = auth.uid()
        and team_members.role = 'owner'
    )
  );

-- Trigger: auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer
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
