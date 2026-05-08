-- ============================================================
-- 005_exhibitions.sql
-- Run in Supabase SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS exhibitions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  curator_id      uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title           text NOT NULL,
  statement       text,
  status          text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','closed')),
  visibility      text NOT NULL DEFAULT 'public' CHECK (visibility IN ('public','link_only','invite_only')),
  opens_at        timestamptz,
  closes_at       timestamptz,
  auction_enabled boolean NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS exhibition_artworks (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exhibition_id  uuid NOT NULL REFERENCES exhibitions(id) ON DELETE CASCADE,
  artwork_id     uuid NOT NULL REFERENCES artworks(id) ON DELETE CASCADE,
  position       integer NOT NULL DEFAULT 0,
  added_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (exhibition_id, artwork_id)
);

-- RLS
ALTER TABLE exhibitions         ENABLE ROW LEVEL SECURITY;
ALTER TABLE exhibition_artworks ENABLE ROW LEVEL SECURITY;

-- Anyone can view published exhibitions
CREATE POLICY "public can view published exhibitions"
  ON exhibitions FOR SELECT
  USING (status = 'published');

-- Curators can manage their own
CREATE POLICY "curator manages own exhibitions"
  ON exhibitions FOR ALL
  USING (curator_id = (SELECT id FROM profiles WHERE auth_user_id = auth.uid()));

-- Artworks visible when exhibition is visible
CREATE POLICY "exhibition artworks visible with exhibition"
  ON exhibition_artworks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM exhibitions e
      WHERE e.id = exhibition_id AND e.status = 'published'
    )
    OR EXISTS (
      SELECT 1 FROM exhibitions e
      JOIN profiles p ON p.id = e.curator_id
      WHERE e.id = exhibition_id AND p.auth_user_id = auth.uid()
    )
  );

-- Curators can manage their exhibition artworks
CREATE POLICY "curator manages own exhibition artworks"
  ON exhibition_artworks FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM exhibitions e
      JOIN profiles p ON p.id = e.curator_id
      WHERE e.id = exhibition_id AND p.auth_user_id = auth.uid()
    )
  );
