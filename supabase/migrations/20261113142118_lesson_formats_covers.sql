-- A lesson's format, primary video, and cover belong to its revision so editing
-- published content does not change what members already see.
alter table public.lesson_revisions
  add column lesson_format text not null default 'text'
    check (lesson_format in ('text', 'video')),
  add column video_url text not null default ''
    check (char_length(video_url) <= 2000),
  add column cover_resource_id uuid references public.resources(id) on delete restrict;

create or replace function public.validate_lesson_revision_cover()
returns trigger language plpgsql security definer set search_path = '' as $$
declare resource_team uuid;
begin
  if new.cover_resource_id is null then return new; end if;

  select m.team_id into resource_team
  from public.lessons l
  join public.modules m on m.id = l.module_id
  where l.id = new.lesson_id;

  if resource_team is null then
    raise exception 'invalid_lesson' using errcode = '22023';
  end if;

  perform 1
  from public.resources r
  where r.id = new.cover_resource_id
    and r.team_id = resource_team
    and r.mime_type = 'image/webp'
  for key share;

  if not found then
    raise exception 'invalid_cover_resource' using errcode = '22023';
  end if;

  return new;
end;
$$;

create trigger validate_lesson_revision_cover
before insert or update of cover_resource_id on public.lesson_revisions
for each row execute function public.validate_lesson_revision_cover();

drop function public.save_lesson_draft(uuid, text, text, integer, jsonb);

create function public.save_lesson_draft(
  target_id uuid,
  new_title text,
  new_summary text,
  new_minutes integer,
  new_format text,
  new_video_url text,
  new_cover_resource_id uuid,
  new_blocks jsonb
)
returns void language plpgsql security definer set search_path = '' as $$
declare
  target public.lessons%rowtype;
  team uuid;
  next_revision integer;
  working_id uuid;
  block jsonb;
  idx integer := 0;
  resource_uuid uuid;
  format_text text := lower(trim(new_format));
  video_text text := trim(new_video_url);
begin
  select * into target from public.lessons where id = target_id for update;
  if not found then raise exception 'lesson_not_found' using errcode = '22023'; end if;

  select team_id into team from public.modules where id = target.module_id;
  if not public.has_team_role(team, array['admin', 'editor']::public.team_role[]) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  if length(trim(new_title)) not between 1 and 160
    or length(new_summary) > 1000
    or new_minutes not between 1 and 1440
    or format_text not in ('text', 'video')
    or jsonb_typeof(new_blocks) <> 'array'
    or jsonb_array_length(new_blocks) > 100 then
    raise exception 'invalid_lesson' using errcode = '22023';
  end if;

  if format_text = 'text' then
    video_text := '';
  elsif video_text !~ '^https://(www\.youtube\.com/watch\?[^[:space:]]*v=[A-Za-z0-9_-]{11}[^[:space:]]*|youtu\.be/[A-Za-z0-9_-]{11}[^[:space:]]*|vimeo\.com/[0-9]+[^[:space:]]*)$'
    or jsonb_array_length(new_blocks) <> 0 then
    raise exception 'invalid_video_lesson' using errcode = '22023';
  end if;

  if new_cover_resource_id is not null and not exists (
    select 1 from public.resources
    where id = new_cover_resource_id
      and team_id = team
      and mime_type = 'image/webp'
  ) then
    raise exception 'invalid_cover_resource' using errcode = '22023';
  end if;

  if target.working_revision_id is null or target.working_revision_id = target.published_revision_id then
    select coalesce(max(revision), 0) + 1 into next_revision
    from public.lesson_revisions where lesson_id = target_id;

    insert into public.lesson_revisions(
      lesson_id, revision, title, summary, estimated_minutes, lesson_format,
      video_url, cover_resource_id, created_by
    )
    values (
      target_id, next_revision, trim(new_title), new_summary, new_minutes,
      format_text, video_text, new_cover_resource_id, auth.uid()
    )
    returning id into working_id;
  else
    working_id := target.working_revision_id;
    update public.lesson_revisions
    set title = trim(new_title),
        summary = new_summary,
        estimated_minutes = new_minutes,
        lesson_format = format_text,
        video_url = video_text,
        cover_resource_id = new_cover_resource_id
    where id = working_id;

    delete from public.content_blocks where revision_id = working_id;
  end if;

  for block in select value from jsonb_array_elements(new_blocks) loop
    if jsonb_typeof(block->'content') <> 'object' then
      raise exception 'invalid_block' using errcode = '22023';
    end if;

    if block->>'type' in ('image', 'document') then
      resource_uuid := (block->'content'->>'resourceId')::uuid;
      if not exists (
        select 1 from public.resources where id = resource_uuid and team_id = team
      ) then
        raise exception 'invalid_resource' using errcode = '22023';
      end if;
    end if;

    insert into public.content_blocks(revision_id, type, content, position)
    values (working_id, (block->>'type')::public.content_block_type, block->'content', idx);
    idx := idx + 1;
  end loop;

  if target.status = 'published' then
    update public.lessons
    set working_revision_id = working_id, updated_at = now()
    where id = target_id;
  else
    update public.lessons
    set title = trim(new_title),
        summary = new_summary,
        estimated_minutes = new_minutes,
        working_revision_id = working_id,
        updated_at = now()
    where id = target_id;
  end if;
end;
$$;

revoke all on function public.save_lesson_draft(uuid, text, text, integer, text, text, uuid, jsonb) from public, anon;
grant execute on function public.save_lesson_draft(uuid, text, text, integer, text, text, uuid, jsonb) to authenticated;

create function public.set_lesson_cover(target_id uuid, new_cover_resource_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  target public.lessons%rowtype;
  team uuid;
  next_revision integer;
  working_id uuid;
begin
  select * into target from public.lessons where id = target_id for update;
  if not found or target.working_revision_id is null then
    raise exception 'lesson_not_ready' using errcode = '22023';
  end if;

  select team_id into team from public.modules where id = target.module_id;
  if not public.has_team_role(team, array['admin', 'editor']::public.team_role[]) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  if new_cover_resource_id is not null and not exists (
    select 1 from public.resources
    where id = new_cover_resource_id
      and team_id = team
      and mime_type = 'image/webp'
  ) then
    raise exception 'invalid_cover_resource' using errcode = '22023';
  end if;

  if target.working_revision_id = target.published_revision_id then
    select coalesce(max(revision), 0) + 1 into next_revision
    from public.lesson_revisions where lesson_id = target_id;

    insert into public.lesson_revisions(
      lesson_id, revision, title, summary, estimated_minutes, lesson_format,
      video_url, cover_resource_id, created_by
    )
    select lesson_id, next_revision, title, summary, estimated_minutes,
      lesson_format, video_url, cover_resource_id, auth.uid()
    from public.lesson_revisions
    where id = target.working_revision_id
    returning id into working_id;

    insert into public.content_blocks(revision_id, type, content, position)
    select working_id, type, content, position
    from public.content_blocks
    where revision_id = target.working_revision_id;
  else
    working_id := target.working_revision_id;
  end if;

  update public.lesson_revisions
  set cover_resource_id = new_cover_resource_id
  where id = working_id;

  update public.lessons
  set working_revision_id = working_id, updated_at = now()
  where id = target_id;
end;
$$;

revoke all on function public.set_lesson_cover(uuid, uuid) from public, anon;
grant execute on function public.set_lesson_cover(uuid, uuid) to authenticated;

drop policy resources_team_read on public.resources;
create policy resources_team_read on public.resources for select to authenticated using (
  public.has_team_role(team_id, array['admin', 'editor']::public.team_role[])
  or (
    public.is_team_member(team_id) and (
      exists(
        select 1 from public.modules m
        where m.cover_resource_id = resources.id and m.status = 'published'
      )
      or exists(
        select 1
        from public.lesson_revisions r
        join public.lessons l on l.published_revision_id = r.id
        join public.modules m on m.id = l.module_id
        where r.cover_resource_id = resources.id
          and l.status = 'published'
          and m.status = 'published'
          and m.team_id = resources.team_id
      )
      or exists(
        select 1
        from public.content_blocks b
        join public.lessons l on l.published_revision_id = b.revision_id
        join public.modules m on m.id = l.module_id
        where b.content->>'resourceId' = resources.id::text
          and l.status = 'published'
          and m.status = 'published'
          and m.team_id = resources.team_id
      )
      or exists(
        select 1
        from public.lesson_resources lr
        join public.lessons l on l.id = lr.lesson_id
        join public.modules m on m.id = l.module_id
        where lr.resource_id = resources.id
          and l.status = 'published'
          and m.status = 'published'
          and m.team_id = resources.team_id
      )
    )
  )
);

create or replace function public.delete_unused_resource(target_id uuid)
returns table(job_id uuid, object_path text)
language plpgsql security definer set search_path = '' as $$
declare target public.resources%rowtype; new_job uuid;
begin
  select * into target from public.resources where id = target_id for update;
  if not found then raise exception 'resource_not_found' using errcode = '22023'; end if;
  if not public.has_team_role(target.team_id, array['admin', 'editor']::public.team_role[]) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  if exists(select 1 from public.modules where cover_resource_id = target_id)
    or exists(select 1 from public.lesson_revisions where cover_resource_id = target_id)
    or exists(select 1 from public.lesson_resources where resource_id = target_id)
    or exists(select 1 from public.content_blocks where content->>'resourceId' = target_id::text) then
    raise exception 'resource_in_use' using errcode = '23503';
  end if;

  insert into public.resource_deletion_jobs(team_id, storage_path)
  values(target.team_id, target.storage_path) returning id into new_job;
  delete from public.resources where id = target_id;
  return query select new_job, target.storage_path;
end;
$$;
