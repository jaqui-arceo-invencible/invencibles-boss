-- Direct messages, in-app notices, and message reports.
-- Notification writers live in schema private so members cannot insert notices for other people.

create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated, service_role;

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams (id) on delete cascade,
  type text not null default 'direct' check (type = 'direct'),
  participant_low uuid not null references public.profiles (id) on delete cascade,
  participant_high uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, team_id),
  unique (team_id, participant_low, participant_high),
  check (participant_low < participant_high)
);

create table public.conversation_members (
  conversation_id uuid not null,
  team_id uuid not null,
  user_id uuid not null references public.profiles (id) on delete cascade,
  last_read_at timestamptz,
  joined_at timestamptz not null default now(),
  primary key (conversation_id, user_id),
  foreign key (conversation_id, team_id) references public.conversations (id, team_id) on delete cascade
);

create table public.direct_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null,
  team_id uuid not null,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  content text not null check (char_length(btrim(content)) between 1 and 2000),
  created_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (id, team_id),
  foreign key (conversation_id, team_id) references public.conversations (id, team_id) on delete cascade
);

create index direct_messages_conversation_idx on public.direct_messages (conversation_id, created_at desc);

create table public.user_blocks (
  team_id uuid not null references public.teams (id) on delete cascade,
  blocker_id uuid not null references public.profiles (id) on delete cascade,
  blocked_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (team_id, blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams (id) on delete cascade,
  recipient_id uuid not null references public.profiles (id) on delete cascade,
  actor_id uuid references public.profiles (id) on delete set null,
  type text not null check (type in ('comment_reply', 'post_comment', 'lesson_reply', 'direct_message', 'announcement')),
  title text not null check (char_length(btrim(title)) between 1 and 120),
  body text not null default '' check (char_length(body) <= 180),
  post_id uuid,
  comment_id uuid,
  lesson_id uuid,
  conversation_id uuid,
  message_id uuid,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  check (recipient_id is distinct from actor_id)
);

create index notifications_recipient_idx on public.notifications (recipient_id, created_at desc);
create index notifications_unread_idx on public.notifications (recipient_id, created_at desc) where read_at is null;
create unique index notifications_announcement_once
  on public.notifications (recipient_id, post_id)
  where type = 'announcement' and post_id is not null;

alter table public.content_reports add column message_id uuid;
alter table public.content_reports drop constraint content_reports_check;
alter table public.content_reports add constraint content_reports_one_target
  check (num_nonnulls(post_id, comment_id, message_id) = 1);
alter table public.content_reports
  add constraint content_reports_message_id_team_id_fkey
  foreign key (message_id, team_id) references public.direct_messages (id, team_id) on delete cascade;
create unique index content_reports_message_once
  on public.content_reports (reporter_id, message_id)
  where message_id is not null;

create or replace view public.direct_message_previews
with (security_invoker = true) as
select distinct on (conversation_id)
  id,
  conversation_id,
  team_id,
  sender_id,
  content,
  created_at,
  deleted_at
from public.direct_messages
order by conversation_id, created_at desc;
