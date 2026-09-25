-- Comments now load in the browser, so new comments no longer need a site rebuild.
DROP TRIGGER IF EXISTS "vercel builds on new comments" ON public.comments;
