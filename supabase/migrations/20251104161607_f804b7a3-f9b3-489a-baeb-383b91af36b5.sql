-- Fix Sessions Table RLS Policies to Prevent Session Hijacking

-- Drop the overly permissive update policy
DROP POLICY IF EXISTS "Anyone can update sessions" ON public.sessions;

-- Create restricted update policy that prevents password_hash modifications
-- and only allows updating last_activity for session keepalive
CREATE POLICY "Allow last_activity updates only"
ON public.sessions
FOR UPDATE
USING (true)
WITH CHECK (
  -- Prevent password_hash from being modified
  password_hash IS NOT DISTINCT FROM (SELECT password_hash FROM public.sessions WHERE id = sessions.id)
  -- Only allow last_activity changes
  AND created_at = (SELECT created_at FROM public.sessions WHERE id = sessions.id)
  AND session_code = (SELECT session_code FROM public.sessions WHERE id = sessions.id)
  AND is_public IS NOT DISTINCT FROM (SELECT is_public FROM public.sessions WHERE id = sessions.id)
);

-- Add policy to prevent deletion of sessions (optional security hardening)
CREATE POLICY "Prevent session deletion"
ON public.sessions
FOR DELETE
USING (false);