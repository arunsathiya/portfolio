-- Migration: Harden comments
-- 1. Pin search_path on uuid_generate_v7 (advisor: function_search_path_mutable)
-- 2. Tie comments to the signed-in user; author fields come from auth.users, not the client
-- 3. Server-side limits: content length, slug format, per-user rate limit
-- 4. Least-privilege grants for authenticated
-- 5. Replace single-column indexes with ones matching the queries

ALTER FUNCTION public.uuid_generate_v7() SET search_path = pg_catalog, extensions;

-- Ownership
ALTER TABLE public.comments
  ADD COLUMN user_id uuid REFERENCES auth.users (id) ON DELETE SET NULL;

UPDATE public.comments c
SET user_id = u.id
FROM auth.users u
WHERE c.user_id IS NULL
  AND u.raw_user_meta_data ->> 'user_name' = c.author_name;

-- Author fields, id and timestamp are set here so the client can't forge them.
-- Inserts without a user (service role, SQL editor) are left as-is.
CREATE OR REPLACE FUNCTION public.comments_before_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  meta jsonb;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  IF (
    SELECT count(*) FROM public.comments
    WHERE user_id = auth.uid() AND created_at > now() - interval '1 minute'
  ) >= 3 OR (
    SELECT count(*) FROM public.comments
    WHERE user_id = auth.uid() AND created_at > now() - interval '1 day'
  ) >= 30 THEN
    RAISE EXCEPTION 'Too many comments, please try again later' USING ERRCODE = 'P0001';
  END IF;

  SELECT raw_user_meta_data INTO meta FROM auth.users WHERE id = auth.uid();

  NEW.id := public.uuid_generate_v7();
  NEW.user_id := auth.uid();
  NEW.created_at := now();
  NEW.author_name := coalesce(meta ->> 'full_name', meta ->> 'name', meta ->> 'user_name', 'Anonymous');
  NEW.author_avatar := meta ->> 'avatar_url';
  RETURN NEW;
END
$$;

REVOKE EXECUTE ON FUNCTION public.comments_before_insert() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER comments_before_insert
  BEFORE INSERT ON public.comments
  FOR EACH ROW EXECUTE FUNCTION public.comments_before_insert();

-- Limits
ALTER TABLE public.comments
  ADD CONSTRAINT comments_content_length CHECK (char_length(btrim(content)) BETWEEN 1 AND 1000),
  ADD CONSTRAINT comments_post_slug_format CHECK (post_slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' AND char_length(post_slug) <= 200);

-- Policies
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.comments;
CREATE POLICY "Signed-in users insert their own comments" ON public.comments
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

-- Grants: signed-in users can read and insert, nothing else
REVOKE ALL ON TABLE public.comments FROM authenticated;
GRANT SELECT, INSERT ON TABLE public.comments TO authenticated;

-- Indexes
DROP INDEX IF EXISTS public.idx_comments_post_slug;
DROP INDEX IF EXISTS public.idx_comments_created_at;
CREATE INDEX idx_comments_post_slug_created_at ON public.comments (post_slug, created_at);
CREATE INDEX idx_comments_user_id_created_at ON public.comments (user_id, created_at);
