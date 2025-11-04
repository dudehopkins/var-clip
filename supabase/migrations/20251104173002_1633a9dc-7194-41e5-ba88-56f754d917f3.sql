-- Make session-files bucket private for security
UPDATE storage.buckets 
SET public = false 
WHERE id = 'session-files';

-- Add RLS policies for storage access
CREATE POLICY "Users can view files from accessible sessions"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'session-files'
  AND (
    -- File belongs to a public session
    EXISTS (
      SELECT 1 FROM sessions s
      WHERE s.id::text = split_part(name, '/', 1)
      AND s.is_public = true
    )
    OR
    -- User has valid token for the session
    EXISTS (
      SELECT 1 FROM session_tokens st
      JOIN sessions s ON s.id = st.session_id
      WHERE s.id::text = split_part(name, '/', 1)
      AND st.expires_at > now()
    )
  )
);

CREATE POLICY "Users can upload files to accessible sessions"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'session-files'
  AND (
    -- Session is public
    EXISTS (
      SELECT 1 FROM sessions s
      WHERE s.id::text = split_part(name, '/', 1)
      AND s.is_public = true
    )
    OR
    -- User has valid token for the session
    EXISTS (
      SELECT 1 FROM session_tokens st
      JOIN sessions s ON s.id = st.session_id
      WHERE s.id::text = split_part(name, '/', 1)
      AND st.expires_at > now()
    )
  )
);

CREATE POLICY "Users can delete files from accessible sessions"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'session-files'
  AND (
    -- Session is public
    EXISTS (
      SELECT 1 FROM sessions s
      WHERE s.id::text = split_part(name, '/', 1)
      AND s.is_public = true
    )
    OR
    -- User has valid token for the session
    EXISTS (
      SELECT 1 FROM session_tokens st
      JOIN sessions s ON s.id = st.session_id
      WHERE s.id::text = split_part(name, '/', 1)
      AND st.expires_at > now()
    )
  )
);