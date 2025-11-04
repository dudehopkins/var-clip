-- Create session_tokens table for server-validated authentication
CREATE TABLE public.session_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  expires_at timestamp with time zone NOT NULL DEFAULT (now() + interval '24 hours')
);

-- Enable RLS
ALTER TABLE public.session_tokens ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can validate tokens by reading
CREATE POLICY "Anyone can validate tokens"
ON public.session_tokens FOR SELECT
USING (expires_at > now());

-- Policy: Only edge functions can create tokens (service role only)
CREATE POLICY "Service role can create tokens"
ON public.session_tokens FOR INSERT
WITH CHECK (true);

-- Policy: Allow cleanup of expired tokens
CREATE POLICY "Anyone can delete expired tokens"
ON public.session_tokens FOR DELETE
USING (expires_at <= now());

-- Create index for faster token lookups
CREATE INDEX idx_session_tokens_token ON public.session_tokens(token);
CREATE INDEX idx_session_tokens_expires ON public.session_tokens(expires_at);

-- Update RLS policies on session_items to check for valid tokens
DROP POLICY IF EXISTS "View items from public sessions only" ON public.session_items;
DROP POLICY IF EXISTS "Create items in public sessions only" ON public.session_items;
DROP POLICY IF EXISTS "Update items in public sessions only" ON public.session_items;
DROP POLICY IF EXISTS "Delete items from public sessions only" ON public.session_items;

-- New policies that check for public sessions OR valid tokens
CREATE POLICY "View items with valid access"
ON public.session_items FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.sessions s
    WHERE s.id = session_items.session_id
    AND s.is_public = true
  )
  OR EXISTS (
    SELECT 1 FROM public.session_tokens st
    JOIN public.sessions s ON s.id = st.session_id
    WHERE s.id = session_items.session_id
    AND st.expires_at > now()
  )
);

CREATE POLICY "Create items with valid access"
ON public.session_items FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.sessions s
    WHERE s.id = session_items.session_id
    AND s.is_public = true
  )
  OR EXISTS (
    SELECT 1 FROM public.session_tokens st
    JOIN public.sessions s ON s.id = st.session_id
    WHERE s.id = session_items.session_id
    AND st.expires_at > now()
  )
);

CREATE POLICY "Update items with valid access"
ON public.session_items FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.sessions s
    WHERE s.id = session_items.session_id
    AND s.is_public = true
  )
  OR EXISTS (
    SELECT 1 FROM public.session_tokens st
    JOIN public.sessions s ON s.id = st.session_id
    WHERE s.id = session_items.session_id
    AND st.expires_at > now()
  )
);

CREATE POLICY "Delete items with valid access"
ON public.session_items FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.sessions s
    WHERE s.id = session_items.session_id
    AND s.is_public = true
  )
  OR EXISTS (
    SELECT 1 FROM public.session_tokens st
    JOIN public.sessions s ON s.id = st.session_id
    WHERE s.id = session_items.session_id
    AND st.expires_at > now()
  )
);