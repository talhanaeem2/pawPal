-- Pet photos are square, compressed JPEGs created in the client. Keep each
-- authenticated user's files inside their own folder and expose them via the
-- existing public-url based avatar UI.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'pet-photos',
  'pet-photos',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Users can view their own pet photos" ON storage.objects;
CREATE POLICY "Users can view their own pet photos"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'pet-photos'
    AND (storage.foldername(name))[1] = (SELECT auth.uid()::text)
  );

DROP POLICY IF EXISTS "Users can upload their own pet photos" ON storage.objects;
CREATE POLICY "Users can upload their own pet photos"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'pet-photos'
    AND (storage.foldername(name))[1] = (SELECT auth.uid()::text)
  );

DROP POLICY IF EXISTS "Users can update their own pet photos" ON storage.objects;
CREATE POLICY "Users can update their own pet photos"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'pet-photos'
    AND (storage.foldername(name))[1] = (SELECT auth.uid()::text)
  )
  WITH CHECK (
    bucket_id = 'pet-photos'
    AND (storage.foldername(name))[1] = (SELECT auth.uid()::text)
  );

DROP POLICY IF EXISTS "Users can delete their own pet photos" ON storage.objects;
CREATE POLICY "Users can delete their own pet photos"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'pet-photos'
    AND (storage.foldername(name))[1] = (SELECT auth.uid()::text)
  );
