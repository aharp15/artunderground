-- ============================================================
-- 006_admin.sql
-- Run in Supabase SQL Editor
-- ============================================================

-- Add is_admin flag to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_admin boolean NOT NULL DEFAULT false;

-- Grant yourself admin access (replace with your profile's auth_user_id):
-- UPDATE profiles SET is_admin = true WHERE auth_user_id = '<your-uuid>';
