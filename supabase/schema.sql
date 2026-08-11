-- ============================================================
-- CHAT APP — SUPABASE DATABASE SCHEMA
-- Run this whole file in: Supabase Dashboard → SQL Editor → Run
-- (Or paste it into the "New query" tab and hit Run.)
-- ============================================================

-- ---------- 1. PROFILES (one row per authenticated user) ----------
-- Note: `online` / `last_seen` are not written by the app yet (presence tracking
-- is a later phase), so contacts will appear offline for now.
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text unique,
  full_name text,
  avatar_url text,
  online boolean not null default false,
  last_seen timestamptz,
  created_at timestamptz not null default now()
);

-- Auto-create a profile whenever someone signs up
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, username, full_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'username', 'user_' || left(new.id::text, 8)),
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ---------- 2. CONTACTS (your sidebar list) ----------
create table if not exists public.contacts (
  user_id uuid not null references public.profiles (id) on delete cascade,
  contact_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, contact_id),
  check (user_id <> contact_id)
);

create index if not exists contacts_user_idx on public.contacts (user_id);

-- ---------- 3. CONVERSATIONS (1:1 chats; group-ready) ----------
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.conversation_participants (
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);

create index if not exists participants_user_idx on public.conversation_participants (user_id);

-- ---------- 4. MESSAGES ----------
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  content text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists messages_conv_created_idx on public.messages (conversation_id, created_at);

-- ---------- 4b. MEDIA MESSAGES (image / audio attachments) ----------
-- `type` distinguishes plain text from attachments; media_path is the
-- object path inside the `chat-media` storage bucket (not a public URL —
-- the API mints short-lived signed URLs on read since the bucket is private).
alter table public.messages
  add column if not exists type text not null default 'text' check (type in ('text', 'image', 'audio'));
alter table public.messages
  add column if not exists media_path text;
alter table public.messages
  add column if not exists media_mime text;
alter table public.messages
  add column if not exists duration_seconds numeric;

alter table public.messages drop constraint if exists messages_content_or_media_check;
alter table public.messages add constraint messages_content_or_media_check check (
  (type = 'text' and content is not null and char_length(content) > 0)
  or (type in ('image', 'audio') and media_path is not null)
);

-- ---------- 5. ROW LEVEL SECURITY ----------
alter table public.profiles enable row level security;
alter table public.contacts enable row level security;
alter table public.conversations enable row level security;
alter table public.conversation_participants enable row level security;
alter table public.messages enable row level security;

-- Profiles: any authenticated user can view; you can only edit your own
drop policy if exists "profiles are viewable by authenticated users" on public.profiles;
create policy "profiles are viewable by authenticated users" on public.profiles
  for select to authenticated using (true);

drop policy if exists "users can update own profile" on public.profiles;
create policy "users can update own profile" on public.profiles
  for update to authenticated using (auth.uid() = id);

-- Contacts: only the owner sees/edits their list
drop policy if exists "contacts are viewable by owner" on public.contacts;
create policy "contacts are viewable by owner" on public.contacts
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists "contacts insertable by owner" on public.contacts;
create policy "contacts insertable by owner" on public.contacts
  for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "contacts deletable by owner" on public.contacts;
create policy "contacts deletable by owner" on public.contacts
  for delete to authenticated using (auth.uid() = user_id);

-- Conversations: participants can read
drop policy if exists "conversations are viewable by participants" on public.conversations;
create policy "conversations are viewable by participants" on public.conversations
  for select to authenticated using (
    exists (
      select 1 from public.conversation_participants cp
      where cp.conversation_id = id and cp.user_id = auth.uid()
    )
  );

-- Participants: read your own memberships AND the other members of conversations you
-- belong to. The second clause is required so the contact_previews view (which joins
-- the *other* user's participant row) can see it.
drop policy if exists "participants viewable by members" on public.conversation_participants;
create policy "participants viewable by members" on public.conversation_participants
  for select to authenticated using (
    user_id = auth.uid()
    or exists (
      select 1 from public.conversation_participants cp
      where cp.conversation_id = conversation_id and cp.user_id = auth.uid()
    )
  );

-- Messages: participants can read messages in their conversations
drop policy if exists "messages are viewable by participants" on public.messages;
create policy "messages are viewable by participants" on public.messages
  for select to authenticated using (
    exists (
      select 1 from public.conversation_participants cp
      where cp.conversation_id = conversation_id and cp.user_id = auth.uid()
    )
  );

-- Messages: participants can insert; sender must be you
drop policy if exists "messages insertable by participants" on public.messages;
create policy "messages insertable by participants" on public.messages
  for insert to authenticated with check (
    sender_id = auth.uid() and exists (
      select 1 from public.conversation_participants cp
      where cp.conversation_id = conversation_id and cp.user_id = auth.uid()
    )
  );

-- Messages: the *other* participant can mark messages as read
drop policy if exists "messages updatable to mark read" on public.messages;
create policy "messages updatable to mark read" on public.messages
  for update to authenticated using (
    auth.uid() <> sender_id and exists (
      select 1 from public.conversation_participants cp
      where cp.conversation_id = conversation_id and cp.user_id = auth.uid()
    )
  );

-- ---------- 5b. STORAGE (image / audio attachments) ----------
-- Private bucket. Objects are stored under `{conversation_id}/{uuid}-{filename}`
-- so RLS can check the requester is a participant of that conversation.
insert into storage.buckets (id, name, public)
values ('chat-media', 'chat-media', false)
on conflict (id) do nothing;

drop policy if exists "chat-media insertable by conversation participants" on storage.objects;
create policy "chat-media insertable by conversation participants" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'chat-media'
    and exists (
      select 1 from public.conversation_participants cp
      where cp.conversation_id = (storage.foldername(name))[1]::uuid
        and cp.user_id = auth.uid()
    )
  );

drop policy if exists "chat-media readable by conversation participants" on storage.objects;
create policy "chat-media readable by conversation participants" on storage.objects
  for select to authenticated using (
    bucket_id = 'chat-media'
    and exists (
      select 1 from public.conversation_participants cp
      where cp.conversation_id = (storage.foldername(name))[1]::uuid
        and cp.user_id = auth.uid()
    )
  );

-- ---------- 6. REALTIME (live message delivery) ----------
-- Broadcast new messages to all connected clients. Idempotent: skips if already added.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'messages'
  ) then
    alter publication supabase_realtime add table public.messages;
  end if;
end
$$;

-- ---------- 7. SIDEBAR VIEW: contact + last message + unread count ----------
-- Note: unread count is computed in a LATERAL join (not a scalar subquery in the
-- SELECT list) because PostgreSQL can't reference LATERAL columns from a
-- subquery in the target list ("column conv.id does not exist").
create or replace view public.contact_previews
with (security_invoker = on) as
select
  c.user_id,
  c.contact_id,
  p.username,
  p.full_name,
  p.avatar_url,
  p.online,
  p.last_seen,
  conv.id as conversation_id,
  lm.content as last_message,
  lm.type as last_message_type,
  lm.sender_id as last_message_sender,
  lm.created_at as last_message_at,
  coalesce(uc.unread_count, 0) as unread_count
from public.contacts c
join public.profiles p on p.id = c.contact_id
left join lateral (
  select cp1.conversation_id
  from public.conversation_participants cp1
  join public.conversation_participants cp2
    on cp2.conversation_id = cp1.conversation_id
   and cp2.user_id = c.contact_id
  where cp1.user_id = c.user_id
  limit 1
) conv on true
left join lateral (
  select count(*) as unread_count
  from public.messages m
  where m.conversation_id = conv.id
    and m.sender_id = c.contact_id
    and m.read_at is null
) uc on true
left join lateral (
  select m.content, m.type, m.sender_id, m.created_at
  from public.messages m
  where m.conversation_id = conv.id
  order by m.created_at desc
  limit 1
) lm on true;

-- Allow authenticated users to read the view (RLS still filters rows via security_invoker)
grant select on public.contact_previews to authenticated;

-- ---------- 8. RPC: find-or-create a 1:1 conversation ----------
create or replace function public.get_or_create_conversation(other_user_id uuid)
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  me uuid := auth.uid();
  conv uuid;
begin
  if me is null then
    raise exception 'Not authenticated';
  end if;

  select cp1.conversation_id into conv
  from public.conversation_participants cp1
  join public.conversation_participants cp2
    on cp2.conversation_id = cp1.conversation_id
   and cp2.user_id = other_user_id
  where cp1.user_id = me
  limit 1;

  if conv is null then
    insert into public.conversations default values returning id into conv;
    insert into public.conversation_participants (conversation_id, user_id)
    values (conv, me), (conv, other_user_id);
  end if;

  return conv;
end;
$$;

grant execute on function public.get_or_create_conversation(uuid) to authenticated;

-- ---------- 9. OPTIONAL: seed demo contacts --------------
-- Run AFTER you have signed up two accounts (user A and user B).
-- Replace the two UUIDs with real profile ids (see below):
--
--   select id, username from public.profiles;
--
-- Then, while signed in as user A, add user B as a contact:
--
--   insert into public.contacts (user_id, contact_id)
--   values ('A_PROFILE_UUID', 'B_PROFILE_UUID');
--
-- And optionally a first message:
--
--   select public.get_or_create_conversation('B_PROFILE_UUID');
--
-- ============================================================
