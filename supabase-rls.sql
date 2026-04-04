-- supabase-rls.sql
-- Run this in Supabase SQL Editor AFTER: npx prisma db push

-- ============================================================
-- PROFILES
-- ============================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Anyone can read profiles
CREATE POLICY "profiles_select_public"
  ON profiles FOR SELECT
  USING (true);

-- Allow inserts from the trigger function (SECURITY DEFINER bypasses RLS)
-- or allow users inserting their own profile
CREATE POLICY "profiles_insert_own"
  ON profiles FOR INSERT
  WITH CHECK (true);

-- Users can only update their own profile
CREATE POLICY "profiles_update_own"
  ON profiles FOR UPDATE
  USING (auth.uid()::text = id)
  WITH CHECK (auth.uid()::text = id);

-- ============================================================
-- POSTS
-- ============================================================
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

-- Anyone (including logged-out) can read all posts
CREATE POLICY "posts_select_public"
  ON posts FOR SELECT
  USING (true);

-- Only authenticated users can create posts — and author_id must match their uid
CREATE POLICY "posts_insert_authenticated"
  ON posts FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND auth.uid()::text = author_id
  );

-- Only the post author can update
CREATE POLICY "posts_update_own"
  ON posts FOR UPDATE
  USING (auth.uid()::text = author_id)
  WITH CHECK (auth.uid()::text = author_id);

-- Only the post author can delete
CREATE POLICY "posts_delete_own"
  ON posts FOR DELETE
  USING (auth.uid()::text = author_id);

-- ============================================================
-- STORAGE — bucket: feedback-attachments
-- ============================================================
-- Create bucket (skip if already exists)
INSERT INTO storage.buckets (id, name, public)
VALUES ('feedback-attachments', 'feedback-attachments', false)
ON CONFLICT DO NOTHING;

-- Authenticated users can upload to their own user folder only
-- Path structure enforced: {user_id}/{filename}
CREATE POLICY "storage_upload_own_folder"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'feedback-attachments'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Anyone can read/download files (posts are public)
CREATE POLICY "storage_read_public"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'feedback-attachments');

-- Only the uploader (folder owner) can delete their files
CREATE POLICY "storage_delete_own"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'feedback-attachments'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- ============================================================
-- TRIGGER: Auto-create profile on auth.users insert
-- Collects username + full_name from user_metadata set at signup
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, full_name, avatar_url)
  VALUES (
    NEW.id::text,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.raw_user_meta_data->>'avatar_url'
  ) ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Drop if exists first to allow re-running this script
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
