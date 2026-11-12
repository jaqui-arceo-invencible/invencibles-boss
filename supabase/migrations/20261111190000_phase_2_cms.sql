create type public.content_status as enum ('draft', 'published', 'archived');
create type public.content_block_type as enum ('rich_text', 'image', 'video', 'document', 'checklist', 'divider', 'callout');

create table public.modules (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 160),
  slug text not null check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  description text not null default '' check (char_length(description) <= 1000),
  position integer not null default 0 check (position >= 0),
  status public.content_status not null default 'draft',
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz,
  unique (team_id, slug), unique (id, team_id)
);
create index modules_team_status_order_idx on public.modules(team_id, status, position);

create table public.lessons (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references public.modules(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 160),
  slug text not null check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  summary text not null default '' check (char_length(summary) <= 1000),
  position integer not null default 0 check (position >= 0),
  estimated_minutes integer not null default 5 check (estimated_minutes between 1 and 1440),
  status public.content_status not null default 'draft',
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz,
  unique (module_id, slug), unique (id, module_id)
);
create index lessons_module_status_order_idx on public.lessons(module_id, status, position);

-- Every edit creates a working revision; learner queries read only published_revision_id.
create table public.lesson_revisions (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  revision integer not null check (revision > 0),
  title text not null,
  summary text not null default '',
  estimated_minutes integer not null default 5 check (estimated_minutes between 1 and 1440),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  published_at timestamptz,
  unique (lesson_id, revision), unique (id, lesson_id)
);
alter table public.lessons add column working_revision_id uuid;
alter table public.lessons add column published_revision_id uuid;
alter table public.lessons add constraint lessons_working_revision_fk foreign key (working_revision_id, id) references public.lesson_revisions(id, lesson_id) deferrable initially deferred;
alter table public.lessons add constraint lessons_published_revision_fk foreign key (published_revision_id, id) references public.lesson_revisions(id, lesson_id) deferrable initially deferred;

create table public.content_blocks (
  id uuid primary key default gen_random_uuid(),
  revision_id uuid not null references public.lesson_revisions(id) on delete cascade,
  type public.content_block_type not null,
  content jsonb not null default '{}'::jsonb check (jsonb_typeof(content) = 'object' and octet_length(content::text) <= 200000),
  position integer not null default 0 check (position >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (revision_id, position)
);
create index content_blocks_revision_order_idx on public.content_blocks(revision_id, position);

create table public.resources (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  uploaded_by uuid not null references auth.users(id),
  title text not null check (char_length(title) between 1 and 180),
  description text not null default '' check (char_length(description) <= 1000),
  file_name text not null check (char_length(file_name) <= 255),
  storage_path text not null unique,
  mime_type text not null check (mime_type in ('image/jpeg','image/png','image/webp','image/gif','application/pdf')),
  file_size bigint not null check (file_size between 1 and 20971520),
  resource_type text generated always as (case when mime_type = 'application/pdf' then 'document' else 'image' end) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, team_id),
  check (storage_path like team_id::text || '/%')
);
create index resources_team_created_idx on public.resources(team_id, created_at desc);
alter table public.modules add column cover_resource_id uuid;
alter table public.modules add constraint modules_cover_same_team_fk foreign key (cover_resource_id,team_id) references public.resources(id,team_id) on delete restrict;

create table public.lesson_resources (
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  resource_id uuid not null references public.resources(id) on delete restrict,
  position integer not null default 0 check (position >= 0),
  primary key (lesson_id, resource_id)
);

insert into public.modules(team_id,title,slug,description,position,status,created_by)
select t.id, seed.title, seed.slug, seed.description, seed.position, 'draft', admin.user_id
from public.teams t
cross join (values
 ('Bienvenida a Invencibles Boss','bienvenida-a-invencibles-boss','Conoce el espacio y cómo aprovechar la academia.',0),
 ('Primeros pasos y primeras 72 horas','primeros-pasos-primeras-72-horas','Organiza tus primeros pasos en el equipo.',1),
 ('Conoce los productos y la oportunidad','productos-y-oportunidad','Información inicial sobre productos y oportunidad.',2),
 ('Cómo conseguir tus primeras clientas','primeras-clientas','Ideas para iniciar conversaciones con potenciales clientas.',3),
 ('Creación de contenido para redes sociales','contenido-para-redes-sociales','Bases para planear contenido propio para redes.',4),
 ('Conversaciones y seguimiento','conversaciones-y-seguimiento','Organiza conversaciones y seguimiento.',5),
 ('Cómo invitar y acompañar a nuevas socias','invitar-y-acompanar-socias','Acompañamiento y bienvenida de nuevas integrantes.',6),
 ('Organización y rutina del negocio','organizacion-y-rutina','Herramientas para planear una rutina sostenible.',7),
 ('Testimonios y experiencias del equipo','experiencias-del-equipo','Espacio reservado para experiencias autorizadas del equipo.',8),
 ('Ejercicios, retos y seguimiento de avances','ejercicios-retos-y-avances','Espacio para ejercicios y retos futuros.',9)
) as seed(title,slug,description,position)
join lateral (select m.user_id from public.memberships m where m.team_id=t.id and m.role='admin' and m.status='active' order by m.joined_at limit 1) admin on true
where t.slug='invencibles-boss'
on conflict (team_id,slug) do nothing;

alter table public.modules enable row level security;
alter table public.lessons enable row level security;
alter table public.lesson_revisions enable row level security;
alter table public.content_blocks enable row level security;
alter table public.resources enable row level security;
alter table public.lesson_resources enable row level security;

create policy modules_member_read on public.modules for select to authenticated
using (public.is_team_member(team_id) and (status = 'published' or public.has_team_role(team_id, array['admin','editor']::public.team_role[])));
create policy modules_admin_insert on public.modules for insert to authenticated
with check (public.has_team_role(team_id,array['admin']::public.team_role[]) and created_by=auth.uid());
create policy modules_admin_update on public.modules for update to authenticated
using (public.has_team_role(team_id,array['admin']::public.team_role[]))
with check (public.has_team_role(team_id,array['admin']::public.team_role[]));
create policy modules_editor_create_draft on public.modules for insert to authenticated
with check (status='draft' and public.has_team_role(team_id, array['editor']::public.team_role[]) and created_by=auth.uid());
create policy modules_editor_edit_draft on public.modules for update to authenticated
using (status='draft' and public.has_team_role(team_id, array['editor']::public.team_role[]))
with check (status='draft' and public.has_team_role(team_id, array['editor']::public.team_role[]));

create policy lessons_member_read on public.lessons for select to authenticated
using (exists(select 1 from public.modules m where m.id = module_id and public.is_team_member(m.team_id)
  and (m.status = 'published' or public.has_team_role(m.team_id, array['admin','editor']::public.team_role[])))
  and (status = 'published' or exists(select 1 from public.modules m where m.id = module_id and public.has_team_role(m.team_id, array['admin','editor']::public.team_role[]))));
create policy lessons_admin_insert on public.lessons for insert to authenticated
with check (created_by=auth.uid() and exists(select 1 from public.modules m where m.id=module_id and public.has_team_role(m.team_id,array['admin']::public.team_role[])));
create policy lessons_admin_update on public.lessons for update to authenticated
using (exists(select 1 from public.modules m where m.id=module_id and public.has_team_role(m.team_id,array['admin']::public.team_role[])))
with check (exists(select 1 from public.modules m where m.id=module_id and public.has_team_role(m.team_id,array['admin']::public.team_role[])));
create policy lessons_editor_create_draft on public.lessons for insert to authenticated
with check (status='draft' and exists(select 1 from public.modules m where m.id=module_id and public.has_team_role(m.team_id,array['editor']::public.team_role[])) and created_by=auth.uid());
create policy lessons_editor_edit_draft on public.lessons for update to authenticated
using (status='draft' and exists(select 1 from public.modules m where m.id=module_id and public.has_team_role(m.team_id,array['editor']::public.team_role[])))
with check (status='draft' and exists(select 1 from public.modules m where m.id=module_id and public.has_team_role(m.team_id,array['editor']::public.team_role[])));

create policy revisions_editor_read on public.lesson_revisions for select to authenticated using (exists(select 1 from public.lessons l join public.modules m on m.id=l.module_id where l.id=lesson_id and public.has_team_role(m.team_id, array['admin','editor']::public.team_role[])));
create policy revisions_editor_write on public.lesson_revisions for insert to authenticated with check (created_by=auth.uid() and exists(select 1 from public.lessons l join public.modules m on m.id=l.module_id where l.id=lesson_id and public.has_team_role(m.team_id,array['admin','editor']::public.team_role[])));
create policy revisions_editor_update on public.lesson_revisions for update to authenticated using (exists(select 1 from public.lessons l join public.modules m on m.id=l.module_id where l.id=lesson_id and public.has_team_role(m.team_id,array['admin','editor']::public.team_role[]))) with check (exists(select 1 from public.lessons l join public.modules m on m.id=l.module_id where l.id=lesson_id and public.has_team_role(m.team_id,array['admin','editor']::public.team_role[])));
create policy revisions_published_member_read on public.lesson_revisions for select to authenticated using (exists(select 1 from public.lessons l join public.modules m on m.id=l.module_id where l.published_revision_id=lesson_revisions.id and l.status='published' and m.status='published' and public.is_team_member(m.team_id)));
create policy blocks_editor_manage on public.content_blocks for all to authenticated
using (exists(select 1 from public.lesson_revisions r join public.lessons l on l.id=r.lesson_id join public.modules m on m.id=l.module_id where r.id=revision_id and public.has_team_role(m.team_id, array['admin','editor']::public.team_role[])))
with check (exists(select 1 from public.lesson_revisions r join public.lessons l on l.id=r.lesson_id join public.modules m on m.id=l.module_id where r.id=revision_id and public.has_team_role(m.team_id, array['admin','editor']::public.team_role[])));
create policy blocks_published_member_read on public.content_blocks for select to authenticated using
(exists(select 1 from public.lesson_revisions r join public.lessons l on l.published_revision_id=r.id join public.modules m on m.id=l.module_id where r.id=revision_id and l.status='published' and m.status='published' and public.is_team_member(m.team_id)));
create policy resources_team_read on public.resources for select to authenticated using (public.is_team_member(team_id));
create policy resources_editor_insert on public.resources for insert to authenticated with check (public.has_team_role(team_id, array['admin','editor']::public.team_role[]) and uploaded_by=auth.uid());
create policy resources_editor_update on public.resources for update to authenticated using (public.has_team_role(team_id, array['admin','editor']::public.team_role[])) with check (public.has_team_role(team_id, array['admin','editor']::public.team_role[]));
create policy lesson_resources_member_read on public.lesson_resources for select to authenticated using (exists(select 1 from public.lessons l join public.modules m on m.id=l.module_id where l.id=lesson_id and l.status='published' and m.status='published' and public.is_team_member(m.team_id)));
create policy lesson_resources_editor_manage on public.lesson_resources for all to authenticated using (exists(select 1 from public.lessons l join public.modules m on m.id=l.module_id where l.id=lesson_id and public.has_team_role(m.team_id, array['admin','editor']::public.team_role[]))) with check (exists(select 1 from public.lessons l join public.modules m on m.id=l.module_id join public.resources r on r.id=resource_id and r.team_id=m.team_id where l.id=lesson_id and public.has_team_role(m.team_id, array['admin','editor']::public.team_role[])));

grant select, insert, update, delete on public.modules, public.lessons, public.lesson_revisions, public.content_blocks, public.resources, public.lesson_resources to authenticated;
grant all on public.modules, public.lessons, public.lesson_revisions, public.content_blocks, public.resources, public.lesson_resources to service_role;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('academy-private', 'academy-private', false, 20971520, array['image/jpeg','image/png','image/webp','image/gif','application/pdf'])
on conflict (id) do update set public=false, file_size_limit=excluded.file_size_limit, allowed_mime_types=excluded.allowed_mime_types;

create policy academy_storage_read on storage.objects for select to authenticated using
(case when bucket_id='academy-private' and (storage.foldername(name))[1] ~ '^[0-9a-f-]{36}$' then public.is_team_member(((storage.foldername(name))[1])::uuid) else false end);
create policy academy_storage_editor_upload on storage.objects for insert to authenticated with check
(case when bucket_id='academy-private' and (storage.foldername(name))[1] ~ '^[0-9a-f-]{36}$' then public.has_team_role(((storage.foldername(name))[1])::uuid, array['admin','editor']::public.team_role[]) and (storage.foldername(name))[2] = auth.uid()::text else false end);
create policy academy_storage_editor_update on storage.objects for update to authenticated using
(case when bucket_id='academy-private' and (storage.foldername(name))[1] ~ '^[0-9a-f-]{36}$' then public.has_team_role(((storage.foldername(name))[1])::uuid, array['admin','editor']::public.team_role[]) else false end) with check
(case when bucket_id='academy-private' and (storage.foldername(name))[1] ~ '^[0-9a-f-]{36}$' then public.has_team_role(((storage.foldername(name))[1])::uuid, array['admin','editor']::public.team_role[]) else false end);
-- Deletion is server mediated after checking every reference; no direct client DELETE policy.

create or replace function public.protect_published_revision()
returns trigger language plpgsql security definer set search_path = '' as $$
declare target_revision uuid;
begin
  target_revision := case when tg_table_name='lesson_revisions' then old.id else old.revision_id end;
  if exists(select 1 from public.lesson_revisions where id=target_revision and published_at is not null)
     or exists(select 1 from public.lessons where published_revision_id=target_revision) then
    raise exception 'published_revision_is_immutable' using errcode='22023';
  end if;
  return old;
end;
$$;
create trigger protect_revision before update or delete on public.lesson_revisions for each row execute function public.protect_published_revision();
create trigger protect_blocks before update or delete on public.content_blocks for each row execute function public.protect_published_revision();

create or replace function public.move_module(target_id uuid, direction integer)
returns void language plpgsql security definer set search_path='' as $$
declare target public.modules%rowtype; neighbor public.modules%rowtype;
begin
 if direction not in (-1,1) then raise exception 'invalid_direction'; end if;
 select * into target from public.modules where id=target_id;
 if not found or not public.has_team_role(target.team_id,array['admin','editor']::public.team_role[]) then raise exception 'forbidden' using errcode='42501'; end if;
 perform 1 from public.teams where id=target.team_id for update;
 if direction=-1 then select * into neighbor from public.modules where team_id=target.team_id and (position,id)<(target.position,target.id) order by position desc,id desc limit 1;
 else select * into neighbor from public.modules where team_id=target.team_id and (position,id)>(target.position,target.id) order by position,id limit 1; end if;
 if found then update public.modules set position=neighbor.position where id=target.id; update public.modules set position=target.position where id=neighbor.id; end if;
end;$$;
revoke all on function public.move_module(uuid,integer) from public,anon;
grant execute on function public.move_module(uuid,integer) to authenticated;

create or replace function public.move_lesson(target_id uuid, direction integer)
returns void language plpgsql security definer set search_path='' as $$
declare target public.lessons%rowtype; neighbor public.lessons%rowtype; target_team uuid;
begin
 if direction not in (-1,1) then raise exception 'invalid_direction'; end if;
 select * into target from public.lessons where id=target_id;
 select team_id into target_team from public.modules where id=target.module_id;
 if not found or not public.has_team_role(target_team,array['admin','editor']::public.team_role[]) then raise exception 'forbidden' using errcode='42501'; end if;
 perform 1 from public.modules where id=target.module_id for update;
 if direction=-1 then select * into neighbor from public.lessons where module_id=target.module_id and (position,id)<(target.position,target.id) order by position desc,id desc limit 1;
 else select * into neighbor from public.lessons where module_id=target.module_id and (position,id)>(target.position,target.id) order by position,id limit 1; end if;
 if found then update public.lessons set position=neighbor.position where id=target.id; update public.lessons set position=target.position where id=neighbor.id; end if;
end;$$;
revoke all on function public.move_lesson(uuid,integer) from public,anon;
grant execute on function public.move_lesson(uuid,integer) to authenticated;

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
 update public.lessons set title=trim(new_title),summary=new_summary,estimated_minutes=new_minutes,working_revision_id=working_id,updated_at=now() where id=target_id;
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
 update public.lesson_revisions set published_at=now() where id=target.working_revision_id and published_at is null;
 update public.lessons set status='published',published_revision_id=target.working_revision_id,published_at=now() where id=target_id;
end;$$;
revoke all on function public.publish_lesson(uuid) from public,anon;
grant execute on function public.publish_lesson(uuid) to authenticated;
