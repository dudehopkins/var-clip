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