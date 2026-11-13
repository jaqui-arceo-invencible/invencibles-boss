-- Phase 4A: community posts, lesson comments, reactions and reports.
-- Images stay in academy-private under {team}/community/{user}/ and are not resources.
-- Applied on 2026-11-12 as community_tables, community_guards and community_policies.
-- This file is the canonical copy and is already recorded in schema_migrations.

alter table public.profiles
  add column if not exists directory_visible boolean not null default true;

alter table public.lessons
  add column if not exists comments_enabled boolean not null default true;

grant update (directory_visible) on public.profiles to authenticated;

create table if not exists public.community_categories (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  slug text not null check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  position integer not null default 0 check (position >= 0),
  created_at timestamptz not null default now(),
  unique (team_id, slug),
  unique (id, team_id)
);

create table if not exists public.community_posts (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  category_id uuid not null,
  content text not null check (char_length(btrim(content)) between 1 and 4000),
  status text not null default 'visible' check (status in ('visible', 'hidden')),
  is_pinned boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  edited_at timestamptz,
  unique (id, team_id),
  foreign key (category_id, team_id) references public.community_categories (id, team_id)
);

create table if not exists public.post_images (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null,
  team_id uuid not null references public.teams (id) on delete cascade,
  storage_path text not null unique,
  position integer not null check (position between 0 and 3),
  created_at timestamptz not null default now(),
  unique (post_id, position),
  foreign key (post_id, team_id) references public.community_posts (id, team_id) on delete cascade
);

create table if not exists public.post_reactions (
  post_id uuid not null,
  team_id uuid not null references public.teams (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id),
  foreign key (post_id, team_id) references public.community_posts (id, team_id) on delete cascade
);

create table if not exists public.community_comments (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  post_id uuid,
  lesson_id uuid references public.lessons (id) on delete cascade,
  parent_id uuid references public.community_comments (id) on delete cascade,
  content text not null check (char_length(btrim(content)) between 1 and 2000),
  status text not null default 'visible' check (status in ('visible', 'hidden')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  edited_at timestamptz,
  unique (id, team_id),
  check ((post_id is not null) <> (lesson_id is not null)),
  foreign key (post_id, team_id) references public.community_posts (id, team_id) on delete cascade
);

create table if not exists public.content_reports (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams (id) on delete cascade,
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  post_id uuid,
  comment_id uuid,
  reason text not null check (char_length(btrim(reason)) between 1 and 500),
  status text not null default 'open' check (status in ('open', 'resolved', 'dismissed')),
  resolved_by uuid references public.profiles (id),
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  check ((post_id is not null) <> (comment_id is not null)),
  foreign key (post_id, team_id) references public.community_posts (id, team_id) on delete cascade,
  foreign key (comment_id, team_id) references public.community_comments (id, team_id) on delete cascade
);

create index if not exists community_categories_team_idx on public.community_categories (team_id, position);
create index if not exists community_posts_feed_idx on public.community_posts (team_id, is_pinned desc, created_at desc);
create index if not exists community_posts_author_idx on public.community_posts (author_id, created_at desc);
create index if not exists community_comments_post_idx on public.community_comments (post_id, created_at);
create index if not exists community_comments_lesson_idx on public.community_comments (lesson_id, created_at);
create index if not exists post_reactions_post_idx on public.post_reactions (post_id);
create index if not exists content_reports_team_idx on public.content_reports (team_id, status, created_at desc);
create unique index if not exists content_reports_post_once on public.content_reports (reporter_id, post_id) where post_id is not null;
create unique index if not exists content_reports_comment_once on public.content_reports (reporter_id, comment_id) where comment_id is not null;

create or replace function public.guard_community_post()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  recent_count integer;
  is_admin boolean;
begin
  is_admin := public.has_team_role(new.team_id, array['admin']::public.team_role[]);
  new.content := btrim(new.content);
  if char_length(new.content) < 1 or char_length(new.content) > 4000 then
    raise exception 'invalid_content' using errcode = '22023';
  end if;

  if tg_op = 'INSERT' then
    if new.author_id is distinct from (select auth.uid()) or not public.is_team_member(new.team_id) then
      raise exception 'author_required' using errcode = '42501';
    end if;
    if (new.status <> 'visible' or new.is_pinned) and not is_admin then
      raise exception 'admin_required' using errcode = '42501';
    end if;
    select count(*) into recent_count
    from public.community_posts
    where author_id = new.author_id
      and created_at > now() - interval '1 hour';
    if recent_count >= 10 then
      raise exception 'rate_limited' using errcode = '54000';
    end if;
    return new;
  end if;

  if new.author_id is distinct from old.author_id
     or new.team_id is distinct from old.team_id
     or new.created_at is distinct from old.created_at
     or new.id is distinct from old.id then
    raise exception 'immutable' using errcode = '42501';
  end if;
  if (new.is_pinned is distinct from old.is_pinned or new.status is distinct from old.status) and not is_admin then
    raise exception 'admin_required' using errcode = '42501';
  end if;
  if new.content is distinct from old.content or new.category_id is distinct from old.category_id then
    new.edited_at := now();
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create or replace function public.guard_community_comment()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  recent_count integer;
  is_admin boolean;
  parent public.community_comments%rowtype;
  lesson_open boolean;
  lesson_team uuid;
  post_team uuid;
  post_status text;
begin
  is_admin := public.has_team_role(new.team_id, array['admin']::public.team_role[]);
  new.content := btrim(new.content);
  if char_length(new.content) < 1 or char_length(new.content) > 2000 then
    raise exception 'invalid_content' using errcode = '22023';
  end if;

  if tg_op = 'UPDATE' then
    if new.author_id is distinct from old.author_id
       or new.team_id is distinct from old.team_id
       or new.post_id is distinct from old.post_id
       or new.lesson_id is distinct from old.lesson_id
       or new.parent_id is distinct from old.parent_id
       or new.created_at is distinct from old.created_at
       or new.id is distinct from old.id then
      raise exception 'immutable' using errcode = '42501';
    end if;
    if new.status is distinct from old.status and not is_admin then
      raise exception 'admin_required' using errcode = '42501';
    end if;
    if new.content is distinct from old.content then
      new.edited_at := now();
    end if;
    new.updated_at := now();
    return new;
  end if;

  if new.author_id is distinct from (select auth.uid()) or not public.is_team_member(new.team_id) then
    raise exception 'author_required' using errcode = '42501';
  end if;
  if new.status <> 'visible' and not is_admin then
    raise exception 'admin_required' using errcode = '42501';
  end if;

  if new.post_id is not null then
    select team_id, status into post_team, post_status
    from public.community_posts
    where id = new.post_id;
    if post_team is distinct from new.team_id or post_status is distinct from 'visible' then
      raise exception 'post_unavailable' using errcode = '42501';
    end if;
  else
    select m.team_id, (l.comments_enabled and l.status = 'published' and m.status = 'published' and l.published_revision_id is not null)
      into lesson_team, lesson_open
    from public.lessons l
    join public.modules m on m.id = l.module_id
    where l.id = new.lesson_id;
    if lesson_team is distinct from new.team_id then
      raise exception 'lesson_unavailable' using errcode = '42501';
    end if;
    if lesson_open is not true then
      raise exception 'comments_closed' using errcode = '42501';
    end if;
  end if;

  if new.parent_id is not null then
    select * into parent from public.community_comments where id = new.parent_id;
    if parent.id is null
       or parent.parent_id is not null
       or parent.team_id is distinct from new.team_id
       or parent.post_id is distinct from new.post_id
       or parent.lesson_id is distinct from new.lesson_id
       or parent.status is distinct from 'visible' then
      raise exception 'reply_context' using errcode = '42501';
    end if;
  end if;

  select count(*) into recent_count
  from public.community_comments
  where author_id = new.author_id
    and created_at > now() - interval '1 hour';
  if recent_count >= 30 then
    raise exception 'rate_limited' using errcode = '54000';
  end if;
  return new;
end;
$$;

create or replace function public.guard_post_image()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  image_count integer;
  post_author uuid;
begin
  select author_id into post_author
  from public.community_posts
  where id = new.post_id
    and team_id = new.team_id;
  if post_author is null or post_author is distinct from (select auth.uid()) then
    raise exception 'author_required' using errcode = '42501';
  end if;
  if new.storage_path !~ ('^' || new.team_id::text || '/community/' || (select auth.uid())::text || '/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}[.](jpg|jpeg|png|webp)$') then
    raise exception 'invalid_image' using errcode = '22023';
  end if;
  select count(*) into image_count from public.post_images where post_id = new.post_id;
  if image_count >= 4 then
    raise exception 'too_many_images' using errcode = '54000';
  end if;
  return new;
end;
$$;

create or replace function public.guard_post_reaction()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.user_id is distinct from (select auth.uid()) or not public.is_team_member(new.team_id) then
    raise exception 'author_required' using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.community_posts post
    where post.id = new.post_id
      and post.team_id = new.team_id
      and post.status = 'visible'
  ) then
    raise exception 'post_unavailable' using errcode = '42501';
  end if;
  return new;
end;
$$;

create or replace function public.guard_content_report()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  recent_count integer;
  is_admin boolean;
begin
  is_admin := public.has_team_role(new.team_id, array['admin']::public.team_role[]);
  if tg_op = 'UPDATE' then
    if not is_admin then
      raise exception 'admin_required' using errcode = '42501';
    end if;
    if new.reporter_id is distinct from old.reporter_id
       or new.team_id is distinct from old.team_id
       or new.post_id is distinct from old.post_id
       or new.comment_id is distinct from old.comment_id
       or new.reason is distinct from old.reason
       or new.created_at is distinct from old.created_at then
      raise exception 'immutable' using errcode = '42501';
    end if;
    return new;
  end if;

  new.reason := btrim(new.reason);
  if char_length(new.reason) < 1 or char_length(new.reason) > 500 then
    raise exception 'invalid_content' using errcode = '22023';
  end if;
  if new.reporter_id is distinct from (select auth.uid()) or not public.is_team_member(new.team_id) then
    raise exception 'author_required' using errcode = '42501';
  end if;
  if new.status <> 'open' then
    raise exception 'admin_required' using errcode = '42501';
  end if;
  if new.post_id is not null and not exists (
    select 1 from public.community_posts post
    where post.id = new.post_id and post.team_id = new.team_id and post.status = 'visible'
  ) then
    raise exception 'post_unavailable' using errcode = '42501';
  end if;
  if new.comment_id is not null and not exists (
    select 1 from public.community_comments entry
    where entry.id = new.comment_id and entry.team_id = new.team_id and entry.status = 'visible'
  ) then
    raise exception 'comment_unavailable' using errcode = '42501';
  end if;
  select count(*) into recent_count
  from public.content_reports
  where reporter_id = new.reporter_id
    and created_at > now() - interval '1 hour';
  if recent_count >= 10 then
    raise exception 'rate_limited' using errcode = '54000';
  end if;
  return new;
end;
$$;

create or replace function public.guard_lesson_comments_flag()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.comments_enabled is distinct from old.comments_enabled
     and not public.has_team_role(
       (select module.team_id from public.modules module where module.id = new.module_id),
       array['admin']::public.team_role[]
     ) then
    raise exception 'admin_required' using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists guard_community_post on public.community_posts;
create trigger guard_community_post
before insert or update on public.community_posts
for each row execute function public.guard_community_post();

drop trigger if exists guard_community_comment on public.community_comments;
create trigger guard_community_comment
before insert or update on public.community_comments
for each row execute function public.guard_community_comment();

drop trigger if exists guard_post_image on public.post_images;
create trigger guard_post_image
before insert on public.post_images
for each row execute function public.guard_post_image();

drop trigger if exists guard_post_reaction on public.post_reactions;
create trigger guard_post_reaction
before insert on public.post_reactions
for each row execute function public.guard_post_reaction();

drop trigger if exists guard_content_report on public.content_reports;
create trigger guard_content_report
before insert or update on public.content_reports
for each row execute function public.guard_content_report();

drop trigger if exists guard_lesson_comments_flag on public.lessons;
create trigger guard_lesson_comments_flag
before update on public.lessons
for each row execute function public.guard_lesson_comments_flag();

revoke all on function public.guard_community_post() from public, anon;
revoke all on function public.guard_community_comment() from public, anon;
revoke all on function public.guard_post_image() from public, anon;
revoke all on function public.guard_post_reaction() from public, anon;
revoke all on function public.guard_content_report() from public, anon;
revoke all on function public.guard_lesson_comments_flag() from public, anon;
grant execute on function public.guard_community_post() to authenticated;
grant execute on function public.guard_community_comment() to authenticated;
grant execute on function public.guard_post_image() to authenticated;
grant execute on function public.guard_post_reaction() to authenticated;
grant execute on function public.guard_content_report() to authenticated;
grant execute on function public.guard_lesson_comments_flag() to authenticated;

alter table public.community_categories enable row level security;
alter table public.community_posts enable row level security;
alter table public.post_images enable row level security;
alter table public.post_reactions enable row level security;
alter table public.community_comments enable row level security;
alter table public.content_reports enable row level security;

drop policy if exists community_categories_read on public.community_categories;
create policy community_categories_read on public.community_categories
for select to authenticated
using (public.is_team_member(team_id));

drop policy if exists community_categories_admin_write on public.community_categories;
create policy community_categories_admin_write on public.community_categories
for insert to authenticated
with check (public.has_team_role(team_id, array['admin']::public.team_role[]));

drop policy if exists community_categories_admin_update on public.community_categories;
create policy community_categories_admin_update on public.community_categories
for update to authenticated
using (public.has_team_role(team_id, array['admin']::public.team_role[]))
with check (public.has_team_role(team_id, array['admin']::public.team_role[]));

drop policy if exists community_categories_admin_delete on public.community_categories;
create policy community_categories_admin_delete on public.community_categories
for delete to authenticated
using (
  public.has_team_role(team_id, array['admin']::public.team_role[])
  and not exists (select 1 from public.community_posts post where post.category_id = community_categories.id)
);

drop policy if exists community_posts_read on public.community_posts;
create policy community_posts_read on public.community_posts
for select to authenticated
using (
  public.is_team_member(team_id)
  and (
    status = 'visible'
    or author_id = (select auth.uid())
    or public.has_team_role(team_id, array['admin']::public.team_role[])
  )
);

drop policy if exists community_posts_insert on public.community_posts;
create policy community_posts_insert on public.community_posts
for insert to authenticated
with check (
  author_id = (select auth.uid())
  and public.is_team_member(team_id)
);

drop policy if exists community_posts_update_own on public.community_posts;
create policy community_posts_update_own on public.community_posts
for update to authenticated
using (author_id = (select auth.uid()) and public.is_team_member(team_id))
with check (author_id = (select auth.uid()) and public.is_team_member(team_id));

drop policy if exists community_posts_update_admin on public.community_posts;
create policy community_posts_update_admin on public.community_posts
for update to authenticated
using (public.has_team_role(team_id, array['admin']::public.team_role[]))
with check (public.has_team_role(team_id, array['admin']::public.team_role[]));

drop policy if exists community_posts_delete on public.community_posts;
create policy community_posts_delete on public.community_posts
for delete to authenticated
using (
  public.is_team_member(team_id)
  and (
    author_id = (select auth.uid())
    or public.has_team_role(team_id, array['admin']::public.team_role[])
  )
);

drop policy if exists post_images_read on public.post_images;
create policy post_images_read on public.post_images
for select to authenticated
using (
  public.is_team_member(team_id)
  and exists (
    select 1 from public.community_posts post
    where post.id = post_images.post_id
      and post.team_id = post_images.team_id
      and (
        post.status = 'visible'
        or post.author_id = (select auth.uid())
        or public.has_team_role(post.team_id, array['admin']::public.team_role[])
      )
  )
);

drop policy if exists post_images_insert on public.post_images;
create policy post_images_insert on public.post_images
for insert to authenticated
with check (
  public.is_team_member(team_id)
  and exists (
    select 1 from public.community_posts post
    where post.id = post_images.post_id
      and post.team_id = post_images.team_id
      and post.author_id = (select auth.uid())
  )
);

drop policy if exists post_images_delete on public.post_images;
create policy post_images_delete on public.post_images
for delete to authenticated
using (
  public.is_team_member(team_id)
  and exists (
    select 1 from public.community_posts post
    where post.id = post_images.post_id
      and post.team_id = post_images.team_id
      and (
        post.author_id = (select auth.uid())
        or public.has_team_role(post.team_id, array['admin']::public.team_role[])
      )
  )
);

drop policy if exists post_reactions_read on public.post_reactions;
create policy post_reactions_read on public.post_reactions
for select to authenticated
using (
  public.is_team_member(team_id)
  and exists (
    select 1 from public.community_posts post
    where post.id = post_reactions.post_id
      and post.team_id = post_reactions.team_id
      and (
        post.status = 'visible'
        or post.author_id = (select auth.uid())
        or public.has_team_role(post.team_id, array['admin']::public.team_role[])
      )
  )
);

drop policy if exists post_reactions_insert on public.post_reactions;
create policy post_reactions_insert on public.post_reactions
for insert to authenticated
with check (
  user_id = (select auth.uid())
  and public.is_team_member(team_id)
);

drop policy if exists post_reactions_delete on public.post_reactions;
create policy post_reactions_delete on public.post_reactions
for delete to authenticated
using (user_id = (select auth.uid()) and public.is_team_member(team_id));

drop policy if exists community_comments_read on public.community_comments;
create policy community_comments_read on public.community_comments
for select to authenticated
using (
  public.is_team_member(team_id)
  and (
    status = 'visible'
    or author_id = (select auth.uid())
    or public.has_team_role(team_id, array['admin']::public.team_role[])
  )
);

drop policy if exists community_comments_insert on public.community_comments;
create policy community_comments_insert on public.community_comments
for insert to authenticated
with check (
  author_id = (select auth.uid())
  and public.is_team_member(team_id)
);

drop policy if exists community_comments_update_own on public.community_comments;
create policy community_comments_update_own on public.community_comments
for update to authenticated
using (author_id = (select auth.uid()) and public.is_team_member(team_id))
with check (author_id = (select auth.uid()) and public.is_team_member(team_id));

drop policy if exists community_comments_update_admin on public.community_comments;
create policy community_comments_update_admin on public.community_comments
for update to authenticated
using (public.has_team_role(team_id, array['admin']::public.team_role[]))
with check (public.has_team_role(team_id, array['admin']::public.team_role[]));

drop policy if exists community_comments_delete on public.community_comments;
create policy community_comments_delete on public.community_comments
for delete to authenticated
using (
  public.is_team_member(team_id)
  and (
    author_id = (select auth.uid())
    or public.has_team_role(team_id, array['admin']::public.team_role[])
  )
);

drop policy if exists content_reports_read on public.content_reports;
create policy content_reports_read on public.content_reports
for select to authenticated
using (
  reporter_id = (select auth.uid())
  or public.has_team_role(team_id, array['admin']::public.team_role[])
);

drop policy if exists content_reports_insert on public.content_reports;
create policy content_reports_insert on public.content_reports
for insert to authenticated
with check (
  reporter_id = (select auth.uid())
  and public.is_team_member(team_id)
  and status = 'open'
);

drop policy if exists content_reports_admin_update on public.content_reports;
create policy content_reports_admin_update on public.content_reports
for update to authenticated
using (public.has_team_role(team_id, array['admin']::public.team_role[]))
with check (public.has_team_role(team_id, array['admin']::public.team_role[]));

drop policy if exists profiles_read_active_teammates on public.profiles;
create policy profiles_read_active_teammates on public.profiles
for select to authenticated
using (
  exists (
    select 1
    from public.memberships mine
    join public.memberships theirs on theirs.team_id = mine.team_id
    where mine.user_id = (select auth.uid())
      and mine.status = 'active'
      and theirs.user_id = profiles.id
      and theirs.status = 'active'
      and (
        profiles.directory_visible
        or exists (
          select 1 from public.community_posts post
          where post.author_id = profiles.id
            and post.team_id = mine.team_id
            and post.status = 'visible'
        )
        or exists (
          select 1 from public.community_comments entry
          where entry.author_id = profiles.id
            and comment.team_id = mine.team_id
            and comment.status = 'visible'
        )
      )
  )
);

drop policy if exists memberships_read_active_teammates on public.memberships;
create policy memberships_read_active_teammates on public.memberships
for select to authenticated
using (status = 'active' and public.is_team_member(team_id));

drop policy if exists academy_storage_avatar_read on storage.objects;
create policy academy_storage_avatar_read on storage.objects
for select to authenticated
using (
  bucket_id = 'academy-private'
  and (storage.foldername(name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  and public.is_team_member(((storage.foldername(name))[1])::uuid)
  and (storage.foldername(name))[2] = 'avatars'
);

drop policy if exists academy_storage_community_insert on storage.objects;
create policy academy_storage_community_insert on storage.objects
for insert to authenticated
with check (
  bucket_id = 'academy-private'
  and (storage.foldername(name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  and public.is_team_member(((storage.foldername(name))[1])::uuid)
  and (storage.foldername(name))[2] = 'community'
  and (storage.foldername(name))[3] = (select auth.uid())::text
  and lower(name) ~ '[.](jpg|jpeg|png|webp)$'
);

drop policy if exists academy_storage_community_read on storage.objects;
create policy academy_storage_community_read on storage.objects
for select to authenticated
using (
  bucket_id = 'academy-private'
  and (storage.foldername(name))[2] = 'community'
  and exists (
    select 1
    from public.post_images image
    join public.community_posts post on post.id = image.post_id
    where image.storage_path = name
      and public.is_team_member(image.team_id)
      and (
        post.status = 'visible'
        or post.author_id = (select auth.uid())
        or public.has_team_role(image.team_id, array['admin']::public.team_role[])
      )
  )
);

drop policy if exists academy_storage_community_delete on storage.objects;
create policy academy_storage_community_delete on storage.objects
for delete to authenticated
using (
  bucket_id = 'academy-private'
  and (storage.foldername(name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  and public.is_team_member(((storage.foldername(name))[1])::uuid)
  and (storage.foldername(name))[2] = 'community'
  and (
    (storage.foldername(name))[3] = (select auth.uid())::text
    or public.has_team_role(((storage.foldername(name))[1])::uuid, array['admin']::public.team_role[])
  )
);

revoke all on public.community_categories, public.community_posts, public.post_images, public.post_reactions, public.community_comments, public.content_reports from anon, authenticated;
grant select, insert, update, delete on public.community_categories to authenticated;
grant select, insert, update, delete on public.community_posts to authenticated;
grant select, insert, delete on public.post_images to authenticated;
grant select, insert, delete on public.post_reactions to authenticated;
grant select, insert, update, delete on public.community_comments to authenticated;
grant select, insert, update on public.content_reports to authenticated;

insert into public.community_categories (team_id, name, slug, position)
select team.id, seed.name, seed.slug, seed.position
from public.teams team
cross join (
  values
    ('General'::text, 'general'::text, 0),
    ('Preguntas y dudas', 'preguntas-y-dudas', 1),
    ('Productos', 'productos', 2),
    ('Redes sociales', 'redes-sociales', 3),
    ('Consejos de ventas', 'consejos-de-ventas', 4),
    ('Experiencias', 'experiencias', 5),
    ('Logros del equipo', 'logros-del-equipo', 6)
) as seed(name, slug, position)
where team.slug = 'invencibles-boss'
on conflict (team_id, slug) do nothing;
