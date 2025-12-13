-- Revoke all public access to session_stats view to fix security exposure
REVOKE ALL ON public.session_stats FROM PUBLIC;
REVOKE ALL ON public.session_stats FROM anon;
REVOKE ALL ON public.session_stats FROM authenticated;

-- Drop the existing security definer view issue
DROP FUNCTION IF EXISTS public.get_session_stats();

-- Recreate the function with proper security (SECURITY INVOKER instead of DEFINER)
-- Note: This function is no longer needed since admin data is fetched via Edge Function
-- But we keep it for backwards compatibility with proper security
CREATE OR REPLACE FUNCTION public.get_session_stats()
RETURNS TABLE (
  id uuid,
  session_code text,
  created_at timestamp with time zone,
  expires_at timestamp with time zone,
  is_public boolean,
  unique_visitors bigint,
  total_items bigint,
  text_items bigint,
  image_items bigint,
  file_items bigint,
  total_data_bytes bigint,
  last_activity timestamp with time zone
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT 
    id,
    session_code,
    created_at,
    expires_at,
    is_public,
    unique_visitors,
    total_items,
    text_items,
    image_items,
    file_items,
    total_data_bytes::bigint,
    last_activity
  FROM public.session_stats
  WHERE public.has_role(current_setting('request.jwt.claims', true)::json->>'sub', 'admin');
$$;