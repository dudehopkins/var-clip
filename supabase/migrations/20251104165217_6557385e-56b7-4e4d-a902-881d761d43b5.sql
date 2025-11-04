-- Fix Session Items RLS to Respect Session Privacy Settings

-- Drop all overly permissive policies
DROP POLICY IF EXISTS "Anyone can view session items" ON public.session_items;
DROP POLICY IF EXISTS "Anyone can create session items" ON public.session_items;
DROP POLICY IF EXISTS "Anyone can update session items" ON public.session_items;
DROP POLICY IF EXISTS "Anyone can delete session items" ON public.session_items;

-- Only allow access to items in public sessions
-- Private sessions will be blocked until proper authentication is implemented

CREATE POLICY "View items from public sessions only"
ON public.session_items FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.sessions
    WHERE sessions.id = session_items.session_id
    AND sessions.is_public = true
  )
);

CREATE POLICY "Create items in public sessions only"
ON public.session_items FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.sessions
    WHERE sessions.id = session_items.session_id
    AND sessions.is_public = true
  )
);

CREATE POLICY "Update items in public sessions only"
ON public.session_items FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.sessions
    WHERE sessions.id = session_items.session_id
    AND sessions.is_public = true
  )
);

CREATE POLICY "Delete items from public sessions only"
ON public.session_items FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.sessions
    WHERE sessions.id = session_items.session_id
    AND sessions.is_public = true
  )
);