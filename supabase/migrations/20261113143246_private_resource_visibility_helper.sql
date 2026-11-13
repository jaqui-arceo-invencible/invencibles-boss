-- Keep the RLS helper callable by a policy without publishing it as an RPC.
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

create function private.resource_is_visible_to_member(target_resource_id uuid, target_team_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select
    exists(
      select 1 from public.modules m
      where m.cover_resource_id = target_resource_id
        and m.team_id = target_team_id
        and m.status = 'published'
    )
    or exists(
      select 1
      from public.lesson_revisions r
      join public.lessons l on l.published_revision_id = r.id
      join public.modules m on m.id = l.module_id
      where r.cover_resource_id = target_resource_id
        and m.team_id = target_team_id
        and l.status = 'published'
        and m.status = 'published'
    )
    or exists(
      select 1
      from public.content_blocks b
      join public.lesson_revisions r on r.id = b.revision_id
      join public.lessons l on l.published_revision_id = r.id
      join public.modules m on m.id = l.module_id
      where b.content->>'resourceId' = target_resource_id::text
        and m.team_id = target_team_id
        and l.status = 'published'
        and m.status = 'published'
    )
    or exists(
      select 1
      from public.lesson_resources lr
      join public.lessons l on l.id = lr.lesson_id
      join public.modules m on m.id = l.module_id
      where lr.resource_id = target_resource_id
        and m.team_id = target_team_id
        and l.status = 'published'
        and m.status = 'published'
    );
$$;

revoke all on function private.resource_is_visible_to_member(uuid, uuid) from public, anon;
grant execute on function private.resource_is_visible_to_member(uuid, uuid) to authenticated;

drop policy resources_team_read on public.resources;
create policy resources_team_read on public.resources for select to authenticated using (
  public.has_team_role(team_id, array['admin', 'editor']::public.team_role[])
  or (
    public.is_team_member(team_id)
    and private.resource_is_visible_to_member(id, team_id)
  )
);

drop function public.resource_is_visible_to_member(uuid, uuid);
revoke all on function public.validate_lesson_revision_cover() from public, anon, authenticated;
