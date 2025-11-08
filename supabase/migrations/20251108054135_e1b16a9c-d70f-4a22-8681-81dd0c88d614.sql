-- Create user roles enum and table
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  role app_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id TEXT, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id::TEXT = _user_id
      AND role = _role
  );
$$;

-- RLS policies
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
USING (user_id::TEXT = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Only admins can insert roles"
ON public.user_roles
FOR INSERT
WITH CHECK (public.has_role(current_setting('request.jwt.claims', true)::json->>'sub', 'admin'));

-- Create session analytics table
CREATE TABLE public.session_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES public.sessions(id) ON DELETE CASCADE NOT NULL,
  action TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.session_analytics ENABLE ROW LEVEL SECURITY;

-- Create index for faster queries
CREATE INDEX idx_session_analytics_session_id ON public.session_analytics(session_id);
CREATE INDEX idx_session_analytics_created_at ON public.session_analytics(created_at);
CREATE INDEX idx_session_analytics_action ON public.session_analytics(action);

-- RLS policies for analytics
CREATE POLICY "Admins can view all analytics"
ON public.session_analytics
FOR SELECT
USING (public.has_role(current_setting('request.jwt.claims', true)::json->>'sub', 'admin'));

CREATE POLICY "Anyone can insert analytics"
ON public.session_analytics
FOR INSERT
WITH CHECK (true);

-- Create session stats view for analytics
CREATE OR REPLACE VIEW public.session_stats AS
SELECT 
  s.id,
  s.session_code,
  s.created_at,
  s.expires_at,
  s.is_public,
  COUNT(DISTINCT sa.ip_address) as unique_visitors,
  COUNT(si.id) as total_items,
  SUM(CASE WHEN si.item_type = 'text' THEN 1 ELSE 0 END) as text_items,
  SUM(CASE WHEN si.item_type = 'image' THEN 1 ELSE 0 END) as image_items,
  SUM(CASE WHEN si.item_type = 'file' THEN 1 ELSE 0 END) as file_items,
  COALESCE(SUM(si.file_size), 0) as total_data_bytes,
  MAX(sa.created_at) as last_activity
FROM public.sessions s
LEFT JOIN public.session_analytics sa ON s.id = sa.session_id
LEFT JOIN public.session_items si ON s.id = si.session_id
GROUP BY s.id, s.session_code, s.created_at, s.expires_at, s.is_public;

-- Allow admins to view stats
GRANT SELECT ON public.session_stats TO authenticated;