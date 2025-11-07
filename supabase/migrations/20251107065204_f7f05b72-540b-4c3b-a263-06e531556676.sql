-- Add expires_at column to sessions table for session duration
ALTER TABLE public.sessions
ADD COLUMN expires_at timestamp with time zone;

-- Create index for efficient expired session queries
CREATE INDEX idx_sessions_expires_at ON public.sessions(expires_at) WHERE expires_at IS NOT NULL;

-- Add RLS policy to prevent access to expired sessions
CREATE POLICY "Prevent access to expired sessions"
ON public.sessions
FOR SELECT
USING (expires_at IS NULL OR expires_at > now());