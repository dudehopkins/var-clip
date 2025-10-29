-- Remove MIME type restrictions from session-files bucket to allow all file types
UPDATE storage.buckets
SET allowed_mime_types = NULL
WHERE id = 'session-files';