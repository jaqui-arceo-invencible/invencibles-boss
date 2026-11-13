-- Allow an administradora to remove a lesson. Published revisions stay immutable
-- on update; deleting the lesson itself is an explicit action and must not hit the
-- broken field lookup in the previous guard.

create or replace function public.protect_published_revision()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_revision uuid;
begin
  if tg_op = 'DELETE' then
    return old;
  end if;

  if tg_table_name = 'lesson_revisions' then
    target_revision := old.id;
  else
    target_revision := old.revision_id;
  end if;

  if exists (
    select 1 from public.lesson_revisions
    where id = target_revision and published_at is not null
  ) or exists (
    select 1 from public.lessons
    where published_revision_id = target_revision
  ) then
    raise exception 'published_revision_is_immutable' using errcode = '22023';
  end if;

  return new;
end;
$$;
