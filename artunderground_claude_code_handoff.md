# ArtUNDERGROUND — Community Features Build Order
# Hand this file to Claude Code to continue the build

## Context
ArtUNDERGROUND is a Next.js 16 (App Router) art marketplace built on:
- Supabase (auth, Postgres database, real-time, storage)
- TypeScript + Tailwind
- Dark theme using CSS variables (--bg-primary: #0D0D0D, --purple: #7F77DD etc)
- All files live in src/app and src/components

The app already has:
- Auth (sign in / sign up / onboarding)
- Artist profiles, artwork upload, portfolio
- Live auctions with real-time bidding (place_bid() Postgres function)
- Notifications table (id, user_id, type, payload jsonb, read, created_at)
- Follows table (follower_id, following_id)
- RLS enabled on all tables
- Supabase real-time publication on: auctions, bids, notifications

The existing colour system (in globals.css):
  --bg-primary:   #0D0D0D
  --bg-secondary: #111111
  --bg-card:      #1A1A1A
  --bg-hover:     #222222
  --border:       #2A2A2A
  --text-primary: #E8E6DC
  --text-secondary: #888780
  --text-muted:   #555550
  --purple:       #7F77DD
  --green:        #1D9E75
  --red:          #D85A30

---

## Task 1 — SQL Migrations (run in Supabase SQL Editor)

Write and run the following SQL:

### 1a. Add visibility to auctions
```sql
alter table auctions
  add column if not exists visibility text not null default 'public'
  check (visibility in ('public', 'private'));
```

### 1b. Create auction_invites table
```sql
create table if not exists auction_invites (
  id           uuid primary key default uuid_generate_v4(),
  auction_id   uuid references auctions(id) on delete cascade not null,
  invitee_id   uuid references profiles(id) on delete cascade not null,
  invited_by   uuid references profiles(id) on delete cascade not null,
  status       text not null default 'pending'
               check (status in ('pending', 'accepted', 'declined')),
  created_at   timestamptz not null default now(),
  unique (auction_id, invitee_id)
);

-- RLS
alter table auction_invites enable row level security;

-- Invitee and seller can read their own invites
create policy "auction_invites: read own"
  on auction_invites for select
  using (
    invitee_id = current_profile_id()
    or invited_by = current_profile_id()
  );

-- Only the auction seller can create invites
create policy "auction_invites: seller insert"
  on auction_invites for insert
  with check (invited_by = current_profile_id());

-- Invitee can update status (accept/decline)
create policy "auction_invites: invitee update"
  on auction_invites for update
  using (invitee_id = current_profile_id());
```

### 1c. Update auctions RLS to respect visibility
```sql
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
```

### 1d. Create conversations table
```sql
create table if not exists conversations (
  id              uuid primary key default uuid_generate_v4(),
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
```

### 1e. Create messages table
```sql
create table if not exists messages (
  id              uuid primary key default uuid_generate_v4(),
  conversation_id uuid references conversations(id) on delete cascade not null,
  sender_id       uuid references profiles(id) on delete cascade not null,
  content         text not null check (char_length(content) > 0 and char_length(content) <= 2000),
  read            bool not null default false,
  created_at      timestamptz not null default now()
);

alter table messages enable row level security;

-- Only conversation participants can read messages
create policy "messages: participants read"
  on messages for select
  using (
    conversation_id in (
      select id from conversations
      where participant_a = current_profile_id()
         or participant_b = current_profile_id()
    )
  );

-- Participants can send messages
create policy "messages: participants insert"
  with check (
    sender_id = current_profile_id()
    and conversation_id in (
      select id from conversations
      where participant_a = current_profile_id()
         or participant_b = current_profile_id()
    )
  );

-- Recipient can mark as read
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

-- Add messages to real-time publication
alter publication supabase_realtime add table messages;
alter publication supabase_realtime add table conversations;
```

### 1f. Postgres function — get or create conversation
```sql
create or replace function get_or_create_conversation(
  p_other_profile_id uuid,
  p_artwork_id uuid default null
)
returns uuid
language plpgsql
security definer
as $$
declare
  v_my_id uuid;
  v_conv_id uuid;
  v_a uuid;
  v_b uuid;
begin
  v_my_id := current_profile_id();
  if v_my_id is null then
    raise exception 'not_authenticated';
  end if;

  -- Canonical ordering so (a,b) and (b,a) map to same row
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
```

---

## Task 2 — API Routes to create

### 2a. src/app/api/conversations/route.ts
GET  — list all conversations for current user (with last message preview)
POST — call get_or_create_conversation(other_profile_id, artwork_id?)

### 2b. src/app/api/conversations/[id]/messages/route.ts
GET  — fetch messages for a conversation (paginated, newest first)
POST — send a message (insert into messages, update conversations.last_message_at, 
        fire notification to recipient of type 'new_message')

### 2c. src/app/api/auctions/[id]/invites/route.ts
GET  — list invites for an auction (seller only)
POST — invite a collector by profile_id (insert auction_invite, fire notification 
        of type 'auction_invite')
PATCH — accept or decline an invite (invitee only, update status)

### 2d. Update src/app/api/auctions/route.ts
Add `visibility` field to CreateAuctionSchema (optional, default 'public')

---

## Task 3 — UI Pages and Components to create

### 3a. Update CreateAuctionButton (src/components/CreateAuctionButton.tsx)
- Add a visibility toggle (Public / Private) to the auction creation modal
- If Private is selected, show a collector search field after creation to invite users
- POST visibility to /api/auctions, then if private, POST to /api/auctions/[id]/invites

### 3b. src/app/messages/page.tsx — Inbox page
- List all conversations for current user
- Show other participant's name + avatar, last message preview, unread count
- Link to /messages/[id] for each conversation
- Add "Messages" link to dashboard sidebar/nav

### 3c. src/app/messages/[id]/page.tsx — Conversation thread
- Show full message history (newest at bottom)
- Real-time subscription on messages table filtered by conversation_id
- Message input at bottom, send on Enter or button click
- Show artwork context card at top if conversation.artwork_id is set
- Mark messages as read on load

### 3d. MessageButton component (src/components/MessageButton.tsx)
- Client component used on artist profile pages and artwork detail page
- Calls POST /api/conversations with other_profile_id
- Redirects to /messages/[conversation_id]

### 3e. src/app/auctions/[id]/page.tsx — Private auction page
- If auction.visibility === 'private' and user is not invited: show locked state
  ("This is a private auction. You need an invitation to bid.")
- If user is seller: show invite management panel (list invitees, search + add)
- If user is invited: show normal bidding panel

### 3f. Update notifications panel (dashboard)
- Handle new notification types: 'new_message', 'auction_invite'
- 'auction_invite' should show Accept / Decline buttons inline
- Accepting calls PATCH /api/auctions/[id]/invites with status: 'accepted'

---

## Task 4 — Update TypeScript types (src/lib/types.ts)

Add:
```typescript
export interface Conversation {
  id: string
  participant_a: string
  participant_b: string
  artwork_id: string | null
  last_message_at: string | null
  created_at: string
}

export interface Message {
  id: string
  conversation_id: string
  sender_id: string
  content: string
  read: boolean
  created_at: string
}

export interface AuctionInvite {
  id: string
  auction_id: string
  invitee_id: string
  invited_by: string
  status: 'pending' | 'accepted' | 'declined'
  created_at: string
}
```

Also add to Database type:
```typescript
conversations:    { Row: Conversation }
messages:         { Row: Message }
auction_invites:  { Row: AuctionInvite }
```

---

## Design notes for Claude Code

- Match the existing dark theme exactly — use CSS variables, not hardcoded colours
- All inline styles should use camelCase (borderColor not border-color)
- Server Components fetch data, Client Components handle interactivity
- Real-time subscriptions always go in Client Components with useEffect cleanup
- The supabase browser client is at src/lib/supabase/client.ts (createClient)
- The supabase server client is at src/lib/supabase/server.ts (createServerSupabaseClient)
- Use the existing SiteNav component for all page navbars
- Follow the same PowerShell base64 install script pattern if delivering files

## Priority order
1. SQL migrations (Task 1) — foundation everything else depends on
2. API routes (Task 2) — backend before UI
3. Messaging UI (Task 3b, 3c, 3d) — highest pitch impact
4. Private auction invites (Task 3a, 3e, 3f) — second priority
