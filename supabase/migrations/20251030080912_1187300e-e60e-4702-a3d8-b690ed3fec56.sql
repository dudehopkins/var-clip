-- Add security features to sessions table
ALTER TABLE public.sessions 
ADD COLUMN is_public boolean NOT NULL DEFAULT true;

-- Create session access table for private sessions with email invites
CREATE TABLE public.session_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  email text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(session_id, email)
);

-- Enable RLS on session_access
ALTER TABLE public.session_access ENABLE ROW LEVEL SECURITY;

-- RLS policies for session_access
CREATE POLICY "Anyone can view session access"
  ON public.session_access
  FOR SELECT
  USING (true);

CREATE POLICY "Anyone can create session access"
  ON public.session_access
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can delete session access"
  ON public.session_access
  FOR DELETE
  USING (true);

-- Function to check if user has access to a session
CREATE OR REPLACE FUNCTION public.has_session_access(p_session_id uuid, p_email text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.sessions s
    WHERE s.id = p_session_id 
      AND (
        s.is_public = true 
        OR EXISTS (
          SELECT 1 FROM public.session_access sa 
          WHERE sa.session_id = p_session_id 
            AND sa.email = p_email
        )
      )
  );
$$;