-- ============================================================
-- 003_follows.sql
-- Run this in the Supabase SQL Editor
-- ============================================================

create table if not exists follows (
  id           uuid primary key default gen_random_uuid(),
  follower_id  uuid references profiles(id) on delete cascade not null,
  following_id uuid references profiles(id) on delete cascade not null,
  created_at   timestamptz not null default now(),
  unique (follower_id, following_id)
);

alter table follows enable row level security;

create policy "follows: read own"
  on follows for select
  using (follower_id = current_profile_id() or following_id = current_profile_id());

create policy "follows: insert own"
  on follows for insert
  with check (follower_id = current_profile_id());

create policy "follows: delete own"
  on follows for delete
  using (follower_id = current_profile_id());
