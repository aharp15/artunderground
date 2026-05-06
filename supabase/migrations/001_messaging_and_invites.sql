-- ============================================================
-- 001_messaging_and_invites.sql
-- Run this in the Supabase SQL Editor
-- Uses gen_random_uuid() (built-in, no extension needed)
-- ============================================================

-- ── Step 1a: Add visibility to auctions ────────────────────
alter table auctions
  add column if not exists visibility text not null default 'public'
  check (visibility in ('public', 'private'));

-- ── Step 1b: Create auction_invites table ──────────────────
create table if not exists auction_invites (
  id           uuid primary key default gen_random_uuid(),
  auction_id   uuid references auctions(id) on delete cascade not null,
  invitee_id   uuid references profiles(id) on delete cascade not null,
  invited_by   uuid references profiles(id) on delete cascade not null,
  status       text not null default 'pending'
               check (status in ('pending', 'accepted', 'declined')),
  created_at   timestamptz not null default now(),
  unique (auction_id, invitee_id)
);

alter table auction_invites enable row level security;

create policy "auction_invites: read own"
  on auction_invites for select
  using (
    invitee_id = current_profile_id()
    or invited_by = current_profile_id()
  );

create policy "auction_invites: seller insert"
  on auction_invites for insert
  with check (invited_by = current_profile_id());

create policy "auction_invites: invitee update"
  on auction_invites for update
  using (invitee_id = current_profile_id());

-- ── Step 1c: Update auctions RLS to respect visibility ─────
drop policy if exists "auctions: public read" on auctions;

create policy "auctions: public read"
  on auctions for select
  using (
    visibility = 'public'
    or seller_id = current_profile_id()
    or id in (
      select auction_id from auction_invites
      where invitee_id = current_profile_id()
      and status = 'accepted'
    )
  );

-- ── Step 1d: Create conversations table ────────────────────
create table if not exists conversations (
  id              uuid primary key default gen_random_uuid(),
  participant_a   uuid references profiles(id) on delete cascade not null,
  participant_b   uuid references profiles(id) on delete cascade not null,
  artwork_id      uuid references artworks(id) on delete set null,
  last_message_at timestamptz,
  created_at      timestamptz not null default now(),
  unique (participant_a, participant_b)
);

alter table conversations enable row level security;

create policy "conversations: participants read"
  on conversations for select
  using (
    participant_a = current_profile_id()
    or participant_b = current_profile_id()
  );

create policy "conversations: authenticated insert"
  on conversations for insert
  with check (
    participant_a = current_profile_id()
    or participant_b = current_profile_id()
  );

create policy "conversations: participants update"
  on conversations for update
  using (
    participant_a = current_profile_id()
    or participant_b = current_profile_id()
  );

-- ── Step 1e: Create messages table ─────────────────────────
create table if not exists messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid references conversations(id) on delete cascade not null,
  sender_id       uuid references profiles(id) on delete cascade not null,
  content         text not null check (char_length(content) > 0 and char_length(content) <= 2000),
  read            bool not null default false,
  created_at      timestamptz not null default now()
);

alter table messages enable row level security;

create policy "messages: participants read"
  on messages for select
  using (
    conversation_id in (
      select id from conversations
      where participant_a = current_profile_id()
         or participant_b = current_profile_id()
    )
  );

create policy "messages: participants insert"
  on messages for insert
  with check (
    sender_id = current_profile_id()
    and conversation_id in (
      select id from conversations
      where participant_a = current_profile_id()
         or participant_b = current_profile_id()
    )
  );

create policy "messages: recipient update"
  on messages for update
  using (
    sender_id != current_profile_id()
    and conversation_id in (
      select id from conversations
      where participant_a = current_profile_id()
         or participant_b = current_profile_id()
    )
  );

-- ── Step 1f: Real-time publications ────────────────────────
alter publication supabase_realtime add table messages;
alter publication supabase_realtime add table conversations;

-- ── Step 1g: get_or_create_conversation function ───────────
create or replace function get_or_create_conversation(
  p_other_profile_id uuid,
  p_artwork_id uuid default null
)
returns uuid
language plpgsql
security definer
as $$
declare
  v_my_id   uuid;
  v_conv_id uuid;
  v_a       uuid;
  v_b       uuid;
begin
  v_my_id := current_profile_id();
  if v_my_id is null then
    raise exception 'not_authenticated';
  end if;

  v_a := least(v_my_id, p_other_profile_id);
  v_b := greatest(v_my_id, p_other_profile_id);

  select id into v_conv_id
  from conversations
  where participant_a = v_a and participant_b = v_b;

  if v_conv_id is null then
    insert into conversations (participant_a, participant_b, artwork_id)
    values (v_a, v_b, p_artwork_id)
    returning id into v_conv_id;
  end if;

  return v_conv_id;
end;
$$;
