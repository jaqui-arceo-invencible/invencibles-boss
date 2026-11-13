create or replace function public.guard_conversation()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  actor uuid;
  other_id uuid;
begin
  actor := (select auth.uid());
  if actor is null or actor not in (new.participant_low, new.participant_high) then
    raise exception 'author_required' using errcode = '42501';
  end if;
  if new.type <> 'direct' or new.participant_low >= new.participant_high then
    raise exception 'invalid_content' using errcode = '22023';
  end if;
  if not public.is_team_member(new.team_id) then
    raise exception 'author_required' using errcode = '42501';
  end if;
  other_id := case when actor = new.participant_low then new.participant_high else new.participant_low end;
  if not exists (
    select 1
    from public.memberships membership
    join public.profiles profile on profile.id = membership.user_id
    where membership.team_id = new.team_id
      and membership.user_id = other_id
      and membership.status = 'active'
      and profile.directory_visible
  ) then
    raise exception 'unavailable' using errcode = '42501';
  end if;
  if exists (
    select 1 from public.user_blocks block
    where block.team_id = new.team_id
      and (
        (block.blocker_id = actor and block.blocked_id = other_id)
        or (block.blocker_id = other_id and block.blocked_id = actor)
      )
  ) then
    raise exception 'blocked' using errcode = '42501';
  end if;
  return new;
end;
$$;

create or replace function public.add_conversation_members()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  insert into public.conversation_members (conversation_id, team_id, user_id)
  values
    (new.id, new.team_id, new.participant_low),
    (new.id, new.team_id, new.participant_high);
  return new;
end;
$$;

create or replace function public.guard_direct_message()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  recent_count integer;
  other_id uuid;
begin
  if tg_op = 'UPDATE' then
    if old.sender_id is distinct from (select auth.uid()) then
      raise exception 'author_required' using errcode = '42501';
    end if;
    if new.id is distinct from old.id
       or new.conversation_id is distinct from old.conversation_id
       or new.team_id is distinct from old.team_id
       or new.sender_id is distinct from old.sender_id
       or new.content is distinct from old.content
       or new.created_at is distinct from old.created_at
       or (old.deleted_at is not null and new.deleted_at is distinct from old.deleted_at) then
      raise exception 'immutable' using errcode = '42501';
    end if;
    return new;
  end if;

  new.content := btrim(new.content);
  if char_length(new.content) < 1 or char_length(new.content) > 2000 then
    raise exception 'invalid_content' using errcode = '22023';
  end if;
  if new.sender_id is distinct from (select auth.uid()) or not public.is_team_member(new.team_id) then
    raise exception 'author_required' using errcode = '42501';
  end if;
  if new.deleted_at is not null then
    raise exception 'invalid_content' using errcode = '22023';
  end if;
  select case when conversation.participant_low = new.sender_id then conversation.participant_high else conversation.participant_low end
    into other_id
  from public.conversations conversation
  where conversation.id = new.conversation_id
    and conversation.team_id = new.team_id
    and new.sender_id in (conversation.participant_low, conversation.participant_high);
  if other_id is null then
    raise exception 'unavailable' using errcode = '42501';
  end if;
  if exists (
    select 1 from public.user_blocks block
    where block.team_id = new.team_id
      and (
        (block.blocker_id = new.sender_id and block.blocked_id = other_id)
        or (block.blocker_id = other_id and block.blocked_id = new.sender_id)
      )
  ) then
    raise exception 'blocked' using errcode = '42501';
  end if;
  select count(*) into recent_count
  from public.direct_messages
  where sender_id = new.sender_id
    and created_at > now() - interval '1 hour';
  if recent_count >= 40 then
    raise exception 'rate_limited' using errcode = '54000';
  end if;
  return new;
end;
$$;

create or replace function public.guard_user_block()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    if old.blocker_id is distinct from (select auth.uid()) then
      raise exception 'author_required' using errcode = '42501';
    end if;
    return old;
  end if;
  if new.blocker_id is distinct from (select auth.uid()) or not public.is_team_member(new.team_id) then
    raise exception 'author_required' using errcode = '42501';
  end if;
  if new.blocker_id = new.blocked_id then
    raise exception 'invalid_content' using errcode = '22023';
  end if;
  if not exists (
    select 1 from public.memberships membership
    where membership.team_id = new.team_id
      and membership.user_id = new.blocked_id
      and membership.status = 'active'
  ) then
    raise exception 'unavailable' using errcode = '42501';
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
       or new.message_id is distinct from old.message_id
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
  if new.message_id is not null and not exists (
    select 1
    from public.direct_messages message
    join public.conversations conversation on conversation.id = message.conversation_id
    where message.id = new.message_id
      and message.team_id = new.team_id
      and (select auth.uid()) in (conversation.participant_low, conversation.participant_high)
  ) then
    raise exception 'message_unavailable' using errcode = '42501';
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

create or replace function private.notify_comment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  recipient uuid;
  kind text;
  heading text;
begin
  if new.status is distinct from 'visible' then
    return new;
  end if;
  if new.parent_id is not null then
    select entry.author_id into recipient
    from public.community_comments entry
    where entry.id = new.parent_id;
    if new.lesson_id is not null then
      kind := 'lesson_reply';
      heading := 'Respondieron tu pregunta';
    else
      kind := 'comment_reply';
      heading := 'Respondieron tu comentario';
    end if;
  elsif new.post_id is not null then
    select post.author_id into recipient
    from public.community_posts post
    where post.id = new.post_id;
    kind := 'post_comment';
    heading := 'Comentaron tu publicación';
  else
    return new;
  end if;
  if recipient is null or recipient = new.author_id then
    return new;
  end if;
  insert into public.notifications (team_id, recipient_id, actor_id, type, title, body, post_id, comment_id, lesson_id)
  values (new.team_id, recipient, new.author_id, kind, heading, left(btrim(new.content), 140), new.post_id, new.id, new.lesson_id);
  return new;
end;
$$;

create or replace function private.notify_direct_message()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  recipient uuid;
begin
  if new.deleted_at is not null then
    return new;
  end if;
  select case
    when conversation.participant_low = new.sender_id then conversation.participant_high
    else conversation.participant_low
  end
  into recipient
  from public.conversations conversation
  where conversation.id = new.conversation_id
    and conversation.team_id = new.team_id;
  if recipient is null or recipient = new.sender_id then
    return new;
  end if;
  insert into public.notifications (team_id, recipient_id, actor_id, type, title, body, conversation_id, message_id)
  values (new.team_id, recipient, new.sender_id, 'direct_message', 'Nuevo mensaje', left(btrim(new.content), 140), new.conversation_id, new.id);
  return new;
end;
$$;

create or replace function private.notify_announcement()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if new.is_pinned is not true or new.status is distinct from 'visible' then
      return new;
    end if;
  elsif not (new.is_pinned is true and old.is_pinned is distinct from true and new.status = 'visible') then
    return new;
  end if;
  insert into public.notifications (team_id, recipient_id, actor_id, type, title, body, post_id)
  select new.team_id, membership.user_id, new.author_id, 'announcement', 'Aviso del equipo', left(btrim(new.content), 140), new.id
  from public.memberships membership
  where membership.team_id = new.team_id
    and membership.status = 'active'
    and membership.user_id is distinct from new.author_id
  on conflict (recipient_id, post_id) where type = 'announcement' and post_id is not null do nothing;
  return new;
end;
$$;

create or replace function private.touch_conversation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.conversations
  set updated_at = now()
  where id = new.conversation_id;
  return new;
end;
$$;

drop trigger if exists guard_conversation on public.conversations;
create trigger guard_conversation
before insert on public.conversations
for each row execute function public.guard_conversation();

drop trigger if exists add_conversation_members on public.conversations;
create trigger add_conversation_members
after insert on public.conversations
for each row execute function public.add_conversation_members();

drop trigger if exists guard_direct_message on public.direct_messages;
create trigger guard_direct_message
before insert or update on public.direct_messages
for each row execute function public.guard_direct_message();

drop trigger if exists touch_conversation on public.direct_messages;
create trigger touch_conversation
after insert on public.direct_messages
for each row execute function private.touch_conversation();

drop trigger if exists notify_direct_message on public.direct_messages;
create trigger notify_direct_message
after insert on public.direct_messages
for each row execute function private.notify_direct_message();

drop trigger if exists guard_user_block on public.user_blocks;
create trigger guard_user_block
before insert or delete on public.user_blocks
for each row execute function public.guard_user_block();

drop trigger if exists notify_comment on public.community_comments;
create trigger notify_comment
after insert on public.community_comments
for each row execute function private.notify_comment();

drop trigger if exists notify_announcement on public.community_posts;
create trigger notify_announcement
after insert or update on public.community_posts
for each row execute function private.notify_announcement();

revoke all on function public.guard_conversation() from public, anon;
revoke all on function public.add_conversation_members() from public, anon;
revoke all on function public.guard_direct_message() from public, anon;
revoke all on function public.guard_user_block() from public, anon;
revoke all on function private.notify_comment() from public, anon, authenticated;
revoke all on function private.notify_direct_message() from public, anon, authenticated;
revoke all on function private.notify_announcement() from public, anon, authenticated;
revoke all on function private.touch_conversation() from public, anon, authenticated;
grant execute on function public.guard_conversation() to authenticated;
grant execute on function public.add_conversation_members() to authenticated;
grant execute on function public.guard_direct_message() to authenticated;
grant execute on function public.guard_user_block() to authenticated;
grant execute on function private.notify_comment() to authenticated;
grant execute on function private.notify_direct_message() to authenticated;
grant execute on function private.notify_announcement() to authenticated;
grant execute on function private.touch_conversation() to authenticated;

alter table public.conversations enable row level security;
alter table public.conversation_members enable row level security;
alter table public.direct_messages enable row level security;
alter table public.user_blocks enable row level security;
alter table public.notifications enable row level security;

drop policy if exists conversations_read on public.conversations;
create policy conversations_read on public.conversations
for select to authenticated
using (
  public.is_team_member(team_id)
  and (select auth.uid()) in (participant_low, participant_high)
);

drop policy if exists conversations_insert on public.conversations;
create policy conversations_insert on public.conversations
for insert to authenticated
with check (
  public.is_team_member(team_id)
  and (select auth.uid()) in (participant_low, participant_high)
);

drop policy if exists conversation_members_read on public.conversation_members;
create policy conversation_members_read on public.conversation_members
for select to authenticated
using (
  public.is_team_member(team_id)
  and exists (
    select 1 from public.conversations conversation
    where conversation.id = conversation_members.conversation_id
      and (select auth.uid()) in (conversation.participant_low, conversation.participant_high)
  )
);

drop policy if exists conversation_members_insert on public.conversation_members;
create policy conversation_members_insert on public.conversation_members
for insert to authenticated
with check (
  public.is_team_member(team_id)
  and exists (
    select 1 from public.conversations conversation
    where conversation.id = conversation_members.conversation_id
      and conversation.team_id = conversation_members.team_id
      and (select auth.uid()) in (conversation.participant_low, conversation.participant_high)
      and conversation_members.user_id in (conversation.participant_low, conversation.participant_high)
  )
);

drop policy if exists conversation_members_update on public.conversation_members;
create policy conversation_members_update on public.conversation_members
for update to authenticated
using (user_id = (select auth.uid()) and public.is_team_member(team_id))
with check (user_id = (select auth.uid()) and public.is_team_member(team_id));

drop policy if exists direct_messages_read on public.direct_messages;
create policy direct_messages_read on public.direct_messages
for select to authenticated
using (
  public.is_team_member(team_id)
  and (
    exists (
      select 1 from public.conversations conversation
      where conversation.id = direct_messages.conversation_id
        and (select auth.uid()) in (conversation.participant_low, conversation.participant_high)
    )
    or (
      public.has_team_role(team_id, array['admin']::public.team_role[])
      and exists (
        select 1 from public.content_reports report
        where report.message_id = direct_messages.id
          and report.team_id = direct_messages.team_id
      )
    )
  )
);

drop policy if exists direct_messages_insert on public.direct_messages;
create policy direct_messages_insert on public.direct_messages
for insert to authenticated
with check (
  sender_id = (select auth.uid())
  and public.is_team_member(team_id)
  and exists (
    select 1 from public.conversations conversation
    where conversation.id = direct_messages.conversation_id
      and conversation.team_id = direct_messages.team_id
      and (select auth.uid()) in (conversation.participant_low, conversation.participant_high)
  )
);

drop policy if exists direct_messages_update on public.direct_messages;
create policy direct_messages_update on public.direct_messages
for update to authenticated
using (sender_id = (select auth.uid()) and public.is_team_member(team_id))
with check (sender_id = (select auth.uid()) and public.is_team_member(team_id));

drop policy if exists user_blocks_read on public.user_blocks;
create policy user_blocks_read on public.user_blocks
for select to authenticated
using (
  public.is_team_member(team_id)
  and (select auth.uid()) in (blocker_id, blocked_id)
);

drop policy if exists user_blocks_insert on public.user_blocks;
create policy user_blocks_insert on public.user_blocks
for insert to authenticated
with check (
  blocker_id = (select auth.uid())
  and public.is_team_member(team_id)
);

drop policy if exists user_blocks_delete on public.user_blocks;
create policy user_blocks_delete on public.user_blocks
for delete to authenticated
using (blocker_id = (select auth.uid()) and public.is_team_member(team_id));

drop policy if exists notifications_read on public.notifications;
create policy notifications_read on public.notifications
for select to authenticated
using (recipient_id = (select auth.uid()) and public.is_team_member(team_id));

drop policy if exists notifications_update on public.notifications;
create policy notifications_update on public.notifications
for update to authenticated
using (recipient_id = (select auth.uid()) and public.is_team_member(team_id))
with check (recipient_id = (select auth.uid()) and public.is_team_member(team_id));

revoke all on public.conversations, public.conversation_members, public.direct_messages, public.user_blocks, public.notifications from anon, authenticated;
grant select, insert on public.conversations to authenticated;
grant select, insert on public.conversation_members to authenticated;
grant update (last_read_at) on public.conversation_members to authenticated;
grant select, insert on public.direct_messages to authenticated;
grant update (deleted_at) on public.direct_messages to authenticated;
grant select, insert, delete on public.user_blocks to authenticated;
grant select on public.notifications to authenticated;
grant update (read_at) on public.notifications to authenticated;
revoke all on public.direct_message_previews from public, anon;
grant select on public.direct_message_previews to authenticated;

alter table public.direct_messages replica identity full;
alter table public.notifications replica identity full;
alter table public.community_comments replica identity full;
alter table public.conversation_members replica identity full;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'direct_messages'
  ) then
    alter publication supabase_realtime add table public.direct_messages;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'notifications'
  ) then
    alter publication supabase_realtime add table public.notifications;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'community_comments'
  ) then
    alter publication supabase_realtime add table public.community_comments;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'conversation_members'
  ) then
    alter publication supabase_realtime add table public.conversation_members;
  end if;
end $$;
