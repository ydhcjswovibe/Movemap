-- Movemap Stage 1: Auth, Ownership, Free Limits, and Share Security
-- Apply in Supabase SQL editor after enabling Google Auth provider.

create table if not exists movemap_projects (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  owner_id uuid references auth.users(id),
  account_plan text not null default 'free',
  view_enabled boolean not null default false,
  edit_enabled boolean not null default false,
  edit_token text,
  plan jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table movemap_projects add column if not exists owner_id uuid references auth.users(id);
alter table movemap_projects add column if not exists account_plan text not null default 'free';
alter table movemap_projects add column if not exists view_enabled boolean not null default false;
alter table movemap_projects add column if not exists edit_enabled boolean not null default false;
alter table movemap_projects add column if not exists edit_token text;

alter table movemap_projects enable row level security;

drop policy if exists "allow anonymous insert" on movemap_projects;
drop policy if exists "allow anonymous update" on movemap_projects;
drop policy if exists "allow anonymous read" on movemap_projects;
drop policy if exists "owners can insert projects" on movemap_projects;
drop policy if exists "owners can read projects" on movemap_projects;
drop policy if exists "owners can update projects" on movemap_projects;
drop policy if exists "enabled view links are public" on movemap_projects;

create policy "owners can insert projects"
on movemap_projects for insert
to authenticated
with check (owner_id = auth.uid());

create policy "owners can read projects"
on movemap_projects for select
to authenticated
using (owner_id = auth.uid());

create policy "owners can update projects"
on movemap_projects for update
to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

create policy "enabled view links are public"
on movemap_projects for select
to anon
using (view_enabled = true);

create or replace function free_cloud_project_limit()
returns integer
language sql
stable
as $$
  select 3;
$$;

create or replace function enforce_free_project_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.account_plan = 'free' and (
    select count(*)
    from movemap_projects
    where owner_id = new.owner_id
      and account_plan = 'free'
      and id <> new.id
  ) >= free_cloud_project_limit() then
    raise exception 'Free project limit reached';
  end if;

  return new;
end;
$$;

drop trigger if exists movemap_free_project_limit on movemap_projects;
create trigger movemap_free_project_limit
before insert on movemap_projects
for each row execute function enforce_free_project_limit();

create or replace function get_project_by_edit_token(p_project_id uuid, p_token text)
returns table(id uuid, plan jsonb)
language sql
security definer
set search_path = public
as $$
  select p.id, p.plan
  from movemap_projects p
  where p.id = p_project_id
    and p.edit_enabled = true
    and p.edit_token = p_token;
$$;

create or replace function update_project_by_edit_token(p_project_id uuid, p_token text, p_new_plan jsonb)
returns table(id uuid, plan jsonb)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  update movemap_projects p
  set plan = p_new_plan,
      title = coalesce(p_new_plan->>'title', p.title),
      updated_at = now()
  where p.id = p_project_id
    and p.edit_enabled = true
    and p.edit_token = p_token
  returning p.id, p.plan;
end;
$$;

revoke all on function get_project_by_edit_token(uuid, text) from public;
revoke all on function update_project_by_edit_token(uuid, text, jsonb) from public;
grant execute on function get_project_by_edit_token(uuid, text) to anon;
grant execute on function update_project_by_edit_token(uuid, text, jsonb) to anon;

insert into storage.buckets (id, name, public)
values ('movemap-audio', 'movemap-audio', true)
on conflict (id) do update
set public = true;

drop policy if exists "allow anonymous audio upload" on storage.objects;
drop policy if exists "authenticated audio upload" on storage.objects;
drop policy if exists "anonymous audio read" on storage.objects;

create policy "authenticated audio upload"
on storage.objects for insert
to authenticated
with check (bucket_id = 'movemap-audio');

create policy "anonymous audio read"
on storage.objects for select
to anon
using (bucket_id = 'movemap-audio');
