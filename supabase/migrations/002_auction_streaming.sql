-- ============================================================
-- 002_auction_streaming.sql
-- Run this in the Supabase SQL Editor
-- ============================================================

-- ── Step 2a: Add streaming columns to auctions ─────────────
alter table auctions
  add column if not exists stream_active     boolean     not null default false,
  add column if not exists stream_started_at timestamptz;

-- ── Step 2b: Add invite_code column ─────────────────────────
alter table auctions
  add column if not exists invite_code text unique;

-- auctions is already in supabase_realtime — no action needed
