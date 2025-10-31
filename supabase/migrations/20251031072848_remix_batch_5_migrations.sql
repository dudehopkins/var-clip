
-- Migration: 20251019105214
-- Create sessions table
CREATE TABLE public.sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_code TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  last_activity TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create session_items table for text, images, and files
CREATE TABLE public.session_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES public.sessions(id) ON DELETE CASCADE NOT NULL,
  item_type TEXT NOT NULL CHECK (item_type IN ('text', 'image', 'file')),
  content TEXT,
  file_url TEXT,
  file_name TEXT,
  file_size BIGINT,
  position INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create index for faster queries
CREATE INDEX idx_session_items_session_id ON public.session_items(session_id);
CREATE INDEX idx_session_items_created_at ON public.session_items(created_at DESC);
CREATE INDEX idx_sessions_code ON public.sessions(session_code);

-- Enable RLS
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_items ENABLE ROW LEVEL SECURITY;

-- Public access policies (no auth required for collaborative clipboard)
CREATE POLICY "Anyone can view sessions"
  ON public.sessions FOR SELECT
  USING (true);

CREATE POLICY "Anyone can create sessions"
  ON public.sessions FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update sessions"
  ON public.sessions FOR UPDATE
  USING (true);

CREATE POLICY "Anyone can view session items"
  ON public.session_items FOR SELECT
  USING (true);

CREATE POLICY "Anyone can create session items"
  ON public.session_items FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update session items"
  ON public.session_items FOR UPDATE
  USING (true);

CREATE POLICY "Anyone can delete session items"
  ON public.session_items FOR DELETE
  USING (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.session_items;

-- Function to generate unique session codes
CREATE OR REPLACE FUNCTION generate_session_code()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  code TEXT;
  exists BOOLEAN;
BEGIN
  LOOP
    -- Generate random 6-character code
    code := lower(substr(md5(random()::text), 1, 6));
    
    -- Check if code exists
    SELECT EXISTS(SELECT 1 FROM public.sessions WHERE session_code = code) INTO exists;
    
    EXIT WHEN NOT exists;
  END LOOP;
  
  RETURN code;
END;
$$;

-- Migration: 20251019105355
-- Fix function search path security warning
DROP FUNCTION IF EXISTS generate_session_code();

CREATE OR REPLACE FUNCTION generate_session_code()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  code TEXT;
  exists BOOLEAN;
BEGIN
  LOOP
    -- Generate random 6-character code
    code := lower(substr(md5(random()::text), 1, 6));
    
    -- Check if code exists
    SELECT EXISTS(SELECT 1 FROM public.sessions WHERE session_code = code) INTO exists;
    
    EXIT WHEN NOT exists;
  END LOOP;
  
  RETURN code;
END;
$$;

-- Migration: 20251019105358
-- Create storage bucket for session files
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'session-files',
  'session-files',
  true,
  52428800, -- 50MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf', 'text/plain', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for session files
CREATE POLICY "Anyone can view session files"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'session-files');

CREATE POLICY "Anyone can upload session files"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'session-files');

CREATE POLICY "Anyone can update session files"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'session-files');

CREATE POLICY "Anyone can delete session files"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'session-files');

-- Migration: 20251029044802
-- Remove MIME type restrictions from session-files bucket to allow all file types
UPDATE storage.buckets
SET allowed_mime_types = NULL
WHERE id = 'session-files';

-- Migration: 20251030080911
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
