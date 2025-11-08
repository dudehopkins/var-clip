-- Drop the existing view
DROP VIEW IF EXISTS public.session_stats;

-- Recreate as a regular view (no security definer needed for views)
CREATE VIEW public.session_stats AS
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

-- Create function to get session stats (admin only)
CREATE OR REPLACE FUNCTION public.get_session_stats()
RETURNS TABLE (
  id UUID,
  session_code TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  is_public BOOLEAN,
  unique_visitors BIGINT,
  total_items BIGINT,
  text_items BIGINT,
  image_items BIGINT,
  file_items BIGINT,
  total_data_bytes BIGINT,
  last_activity TIMESTAMP WITH TIME ZONE
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.session_stats
  WHERE public.has_role(current_setting('request.jwt.claims', true)::json->>'sub', 'admin');
$$;