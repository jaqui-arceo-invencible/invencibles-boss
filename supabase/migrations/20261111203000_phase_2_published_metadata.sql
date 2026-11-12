-- Preserve published lesson metadata while editing a new draft.
-- Member metadata and signed URLs are limited to published references.
drop policy resources_team_read on public.resources;
create policy resources_team_read on public.resources for select to authenticated using (
  public.has_team_role(team_id,array['admin','editor']::public.team_role[])
  or (public.is_team_member(team_id) and (
    exists(select 1 from public.modules m where m.cover_resource_id=resources.id and m.status='published')
    or exists(select 1 from public.content_blocks b join public.lessons l on l.published_revision_id=b.revision_id join public.modules m on m.id=l.module_id where b.content->>'resourceId'=resources.id::text and l.status='published' and m.status='published' and m.team_id=resources.team_id)
    or exists(select 1 from public.lesson_resources lr join public.lessons l on l.id=lr.lesson_id join public.modules m on m.id=l.module_id where lr.resource_id=resources.id and l.status='published' and m.status='published' and m.team_id=resources.team_id)
  ))
);

drop policy academy_storage_read on storage.objects;
create policy academy_storage_read on storage.objects for select to authenticated using (
  case when bucket_id='academy-private' and (storage.foldername(name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    then public.has_team_role(((storage.foldername(name))[1])::uuid,array['admin','editor']::public.team_role[])
      or exists(select 1 from public.resources r where r.storage_path=name and r.team_id=((storage.foldername(name))[1])::uuid)
    else false end
);

create or replace function public.save_lesson_draft(target_id uuid, new_title text, new_summary text, new_minutes integer, new_blocks jsonb)
returns void language plpgsql security definer set search_path='' as $$
declare target public.lessons%rowtype; team uuid; next_revision integer; working_id uuid; block jsonb; idx integer:=0; resource_uuid uuid;
begin
 select * into target from public.lessons where id=target_id for update;
 if not found then raise exception 'lesson_not_found' using errcode='22023'; end if;
 select team_id into team from public.modules where id=target.module_id;
 if not public.has_team_role(team,array['admin','editor']::public.team_role[]) then raise exception 'forbidden' using errcode='42501'; end if;
 if length(trim(new_title)) not between 1 and 160 or length(new_summary)>1000 or new_minutes not between 1 and 1440 then raise exception 'invalid_lesson' using errcode='22023'; end if;
 if jsonb_typeof(new_blocks)<>'array' or jsonb_array_length(new_blocks)>100 then raise exception 'invalid_blocks' using errcode='22023'; end if;
 if target.working_revision_id is null or target.working_revision_id=target.published_revision_id then
   select coalesce(max(revision),0)+1 into next_revision from public.lesson_revisions where lesson_id=target_id;
   insert into public.lesson_revisions(lesson_id,revision,title,summary,estimated_minutes,created_by)
   values(target_id,next_revision,trim(new_title),new_summary,new_minutes,auth.uid()) returning id into working_id;
 else
   working_id:=target.working_revision_id;
   update public.lesson_revisions set title=trim(new_title),summary=new_summary,estimated_minutes=new_minutes where id=working_id;
   delete from public.content_blocks where public.content_blocks.revision_id=working_id;
 end if;
 for block in select value from jsonb_array_elements(new_blocks) loop
   if jsonb_typeof(block->'content')<>'object' then raise exception 'invalid_block' using errcode='22023'; end if;
   if block->>'type' in ('image','document') then
     resource_uuid:=(block->'content'->>'resourceId')::uuid;
     if not exists(select 1 from public.resources where id=resource_uuid and team_id=team) then raise exception 'invalid_resource' using errcode='22023'; end if;
   end if;
   insert into public.content_blocks(revision_id,type,content,position)
   values(working_id,(block->>'type')::public.content_block_type,block->'content',idx);
   idx:=idx+1;
 end loop;
 if target.status='published' then
   update public.lessons set working_revision_id=working_id,updated_at=now() where id=target_id;
 else
   update public.lessons set title=trim(new_title),summary=new_summary,estimated_minutes=new_minutes,working_revision_id=working_id,updated_at=now() where id=target_id;
 end if;
end;$$;
revoke all on function public.save_lesson_draft(uuid,text,text,integer,jsonb) from public,anon;
grant execute on function public.save_lesson_draft(uuid,text,text,integer,jsonb) to authenticated;

create or replace function public.publish_lesson(target_id uuid)
returns void language plpgsql security definer set search_path='' as $$
declare target public.lessons%rowtype; team uuid;
begin
 select * into target from public.lessons where id=target_id for update;
 if not found or target.working_revision_id is null then raise exception 'lesson_not_ready' using errcode='22023'; end if;
 select team_id into team from public.modules where id=target.module_id;
 if not public.has_team_role(team,array['admin']::public.team_role[]) then raise exception 'admin_required' using errcode='42501'; end if;
 if target.working_revision_id=target.published_revision_id then return; end if;
 update public.lesson_revisions set published_at=now() where id=target.working_revision_id and published_at is null;
 update public.lessons set status='published',published_revision_id=target.working_revision_id,published_at=now(),
   title=(select title from public.lesson_revisions where id=target.working_revision_id),
   summary=(select summary from public.lesson_revisions where id=target.working_revision_id),
   estimated_minutes=(select estimated_minutes from public.lesson_revisions where id=target.working_revision_id)
 where id=target_id;
end;$$;
revoke all on function public.publish_lesson(uuid) from public,anon;
grant execute on function public.publish_lesson(uuid) to authenticated;
