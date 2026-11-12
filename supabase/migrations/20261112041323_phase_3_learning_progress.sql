-- Member learning progress. Percentages are calculated from published lessons; they are not stored.
-- Opening a lesson records in_progress. Completion is sticky for this phase.

create table if not exists public.lesson_progress (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  status text not null check (status in ('in_progress', 'completed')),
  started_at timestamptz,
  completed_at timestamptz,
  last_opened_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, lesson_id),
  check (
    (status = 'in_progress' and completed_at is null)
    or (status = 'completed' and completed_at is not null)
  )
);

create index if not exists lesson_progress_user_opened_idx on public.lesson_progress (user_id, last_opened_at desc);
create index if not exists lesson_progress_team_user_idx on public.lesson_progress (team_id, user_id);

create table if not exists public.checklist_item_progress (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  block_id uuid not null,
  item_id text not null check (item_id ~ '^[a-zA-Z0-9_-]{8,80}$'),
  completed boolean not null default false,
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (user_id, lesson_id, item_id)
);

create index if not exists checklist_item_progress_user_lesson_idx on public.checklist_item_progress (user_id, lesson_id);

create or replace function public.keep_lesson_completion()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.user_id is distinct from old.user_id
    or new.lesson_id is distinct from old.lesson_id
    or new.team_id is distinct from old.team_id then
    raise exception 'progress identity is immutable' using errcode = '42501';
  end if;
  if old.status = 'completed' then
    new.status := 'completed';
    new.completed_at := coalesce(old.completed_at, new.completed_at, now());
  end if;
  if new.status = 'completed' and new.completed_at is null then
    new.completed_at := now();
  end if;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists lesson_progress_keep_completion on public.lesson_progress;
create trigger lesson_progress_keep_completion
before update on public.lesson_progress
for each row execute function public.keep_lesson_completion();

create or replace function public.touch_lesson_progress(target_lesson uuid, mark_complete boolean)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  tid uuid;
begin
  if uid is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;

  select mo.team_id into tid
  from public.lessons l
  join public.modules mo on mo.id = l.module_id
  join public.memberships m on m.team_id = mo.team_id and m.user_id = uid and m.status = 'active'
  where l.id = target_lesson
    and l.status = 'published'
    and mo.status = 'published'
    and l.published_revision_id is not null;

  if tid is null then
    raise exception 'lesson unavailable' using errcode = '42501';
  end if;

  insert into public.lesson_progress (team_id, user_id, lesson_id, status, started_at, completed_at, last_opened_at)
  values (
    tid,
    uid,
    target_lesson,
    case when mark_complete then 'completed' else 'in_progress' end,
    now(),
    case when mark_complete then now() else null end,
    now()
  )
  on conflict (user_id, lesson_id) do update set
    status = case
      when mark_complete or public.lesson_progress.status = 'completed' then 'completed'
      else 'in_progress'
    end,
    started_at = coalesce(public.lesson_progress.started_at, now()),
    completed_at = case
      when mark_complete or public.lesson_progress.status = 'completed' then coalesce(public.lesson_progress.completed_at, now())
      else public.lesson_progress.completed_at
    end,
    last_opened_at = now(),
    updated_at = now();
end;
$$;

create or replace function public.set_checklist_item(
  target_lesson uuid,
  target_block uuid,
  target_item text,
  is_completed boolean
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  tid uuid;
begin
  if uid is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;
  if target_item !~ '^[a-zA-Z0-9_-]{8,80}$' then
    raise exception 'invalid checklist item' using errcode = '22023';
  end if;

  select mo.team_id into tid
  from public.lessons l
  join public.modules mo on mo.id = l.module_id
  join public.memberships m on m.team_id = mo.team_id and m.user_id = uid and m.status = 'active'
  where l.id = target_lesson
    and l.status = 'published'
    and mo.status = 'published'
    and l.published_revision_id is not null;

  if tid is null then
    raise exception 'lesson unavailable' using errcode = '42501';
  end if;

  insert into public.checklist_item_progress (team_id, user_id, lesson_id, block_id, item_id, completed, completed_at)
  values (tid, uid, target_lesson, target_block, target_item, is_completed, case when is_completed then now() else null end)
  on conflict (user_id, lesson_id, item_id) do update set
    block_id = excluded.block_id,
    completed = excluded.completed,
    completed_at = case
      when excluded.completed then coalesce(public.checklist_item_progress.completed_at, now())
      else null
    end,
    updated_at = now();
end;
$$;

alter table public.lesson_progress enable row level security;
alter table public.checklist_item_progress enable row level security;

drop policy if exists lesson_progress_select_own on public.lesson_progress;
create policy lesson_progress_select_own on public.lesson_progress
for select to authenticated
using (user_id = (select auth.uid()) and public.is_team_member(team_id));

drop policy if exists lesson_progress_insert_own on public.lesson_progress;
create policy lesson_progress_insert_own on public.lesson_progress
for insert to authenticated
with check (
  user_id = (select auth.uid())
  and public.is_team_member(team_id)
  and exists (
    select 1 from public.lessons l
    join public.modules mo on mo.id = l.module_id
    where l.id = lesson_id
      and mo.team_id = lesson_progress.team_id
      and l.status = 'published'
      and mo.status = 'published'
      and l.published_revision_id is not null
  )
);

drop policy if exists lesson_progress_update_own on public.lesson_progress;
create policy lesson_progress_update_own on public.lesson_progress
for update to authenticated
using (user_id = (select auth.uid()) and public.is_team_member(team_id))
with check (
  user_id = (select auth.uid())
  and public.is_team_member(team_id)
  and exists (
    select 1 from public.lessons l
    join public.modules mo on mo.id = l.module_id
    where l.id = lesson_id
      and mo.team_id = lesson_progress.team_id
      and l.status = 'published'
      and mo.status = 'published'
      and l.published_revision_id is not null
  )
);

drop policy if exists checklist_progress_select_own on public.checklist_item_progress;
create policy checklist_progress_select_own on public.checklist_item_progress
for select to authenticated
using (user_id = (select auth.uid()) and public.is_team_member(team_id));

drop policy if exists checklist_progress_insert_own on public.checklist_item_progress;
create policy checklist_progress_insert_own on public.checklist_item_progress
for insert to authenticated
with check (
  user_id = (select auth.uid())
  and public.is_team_member(team_id)
  and exists (
    select 1 from public.lessons l
    join public.modules mo on mo.id = l.module_id
    where l.id = lesson_id
      and mo.team_id = checklist_item_progress.team_id
      and l.status = 'published'
      and mo.status = 'published'
      and l.published_revision_id is not null
  )
);

drop policy if exists checklist_progress_update_own on public.checklist_item_progress;
create policy checklist_progress_update_own on public.checklist_item_progress
for update to authenticated
using (user_id = (select auth.uid()) and public.is_team_member(team_id))
with check (
  user_id = (select auth.uid())
  and public.is_team_member(team_id)
  and exists (
    select 1 from public.lessons l
    join public.modules mo on mo.id = l.module_id
    where l.id = lesson_id
      and mo.team_id = checklist_item_progress.team_id
      and l.status = 'published'
      and mo.status = 'published'
      and l.published_revision_id is not null
  )
);

revoke all on public.lesson_progress, public.checklist_item_progress from anon, authenticated;
grant select, insert, update on public.lesson_progress, public.checklist_item_progress to authenticated;

revoke all on function public.keep_lesson_completion() from public, anon, authenticated;
grant execute on function public.keep_lesson_completion() to authenticated;

revoke all on function public.touch_lesson_progress(uuid, boolean) from public, anon;
grant execute on function public.touch_lesson_progress(uuid, boolean) to authenticated;

revoke all on function public.set_checklist_item(uuid, uuid, text, boolean) from public, anon;
grant execute on function public.set_checklist_item(uuid, uuid, text, boolean) to authenticated;

drop policy if exists academy_storage_avatar_insert on storage.objects;
create policy academy_storage_avatar_insert on storage.objects
for insert to authenticated
with check (
  bucket_id = 'academy-private'
  and (storage.foldername(name))[1] ~ '^[0-9a-f-]{36}$'
  and public.is_team_member(((storage.foldername(name))[1])::uuid)
  and (storage.foldername(name))[2] = 'avatars'
  and (storage.foldername(name))[3] = (select auth.uid())::text
  and lower(name) ~ '\.(jpg|jpeg|png|webp)$'
);

drop policy if exists academy_storage_avatar_update on storage.objects;
create policy academy_storage_avatar_update on storage.objects
for update to authenticated
using (
  bucket_id = 'academy-private'
  and (storage.foldername(name))[1] ~ '^[0-9a-f-]{36}$'
  and public.is_team_member(((storage.foldername(name))[1])::uuid)
  and (storage.foldername(name))[2] = 'avatars'
  and (storage.foldername(name))[3] = (select auth.uid())::text
)
with check (
  bucket_id = 'academy-private'
  and (storage.foldername(name))[1] ~ '^[0-9a-f-]{36}$'
  and public.is_team_member(((storage.foldername(name))[1])::uuid)
  and (storage.foldername(name))[2] = 'avatars'
  and (storage.foldername(name))[3] = (select auth.uid())::text
  and lower(name) ~ '\.(jpg|jpeg|png|webp)$'
);
