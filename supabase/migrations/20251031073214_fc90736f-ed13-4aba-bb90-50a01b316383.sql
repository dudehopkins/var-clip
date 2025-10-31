-- Add password protection to sessions
ALTER TABLE public.sessions 
ADD COLUMN password_hash TEXT DEFAULT NULL;

-- Add comment explaining the column
COMMENT ON COLUMN public.sessions.password_hash IS 'Bcrypt hash of session password if password protection is enabled. NULL means no password required.';