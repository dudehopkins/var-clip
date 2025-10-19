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