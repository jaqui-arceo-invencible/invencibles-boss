-- Keep a durable cleanup record if Storage deletion fails after a database commit.
create table public.resource_deletion_jobs (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id),
  storage_path text not null,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);
create index resource_deletion_jobs_pending_idx on public.resource_deletion_jobs(created_at) where completed_at is null;
alter table public.resource_deletion_jobs enable row level security;
revoke all on public.resource_deletion_jobs from public, anon, authenticated;
grant all on public.resource_deletion_jobs to service_role;

-- Direct inserts must also lock the referenced resource, not only the editor RPC.
create or replace function public.validate_content_resource()
returns trigger language plpgsql security definer set search_path = '' as $$
declare resource_text text; resource_team uuid;
begin
  if new.type not in ('image','document') then return new; end if;
  resource_text := new.content->>'resourceId';
  if resource_text is null or resource_text !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    raise exception 'invalid_resource' using errcode='22023';
  end if;
  select m.team_id into resource_team
  from public.lesson_revisions rev
  join public.lessons l on l.id=rev.lesson_id
  join public.modules m on m.id=l.module_id
  where rev.id=new.revision_id;
  if resource_team is null then raise exception 'invalid_revision' using errcode='22023'; end if;
  perform 1 from public.resources r where r.id=resource_text::uuid and r.team_id=resource_team for key share;
  if not found then raise exception 'invalid_resource' using errcode='22023'; end if;
  return new;
end;$$;
create trigger validate_block_resource before insert or update on public.content_blocks
for each row execute function public.validate_content_resource();

create or replace function public.delete_unused_resource(target_id uuid)
returns table(job_id uuid, object_path text)
language plpgsql security definer set search_path = '' as $$
declare target public.resources%rowtype; new_job uuid;
begin
  select * into target from public.resources where id=target_id for update;
  if not found then raise exception 'resource_not_found' using errcode='22023'; end if;
  if not public.has_team_role(target.team_id,array['admin','editor']::public.team_role[]) then
    raise exception 'forbidden' using errcode='42501';
  end if;
  if exists(select 1 from public.modules where cover_resource_id=target_id)
    or exists(select 1 from public.lesson_resources where resource_id=target_id)
    or exists(select 1 from public.content_blocks where content->>'resourceId'=target_id::text) then
    raise exception 'resource_in_use' using errcode='23503';
  end if;
  insert into public.resource_deletion_jobs(team_id,storage_path)
  values(target.team_id,target.storage_path) returning id into new_job;
  delete from public.resources where id=target_id;
  return query select new_job,target.storage_path;
end;$$;
revoke all on function public.delete_unused_resource(uuid) from public, anon;
grant execute on function public.delete_unused_resource(uuid) to authenticated;
