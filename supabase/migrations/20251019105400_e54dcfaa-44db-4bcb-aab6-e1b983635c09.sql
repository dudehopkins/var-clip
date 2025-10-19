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