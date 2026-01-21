-- ================================================
-- Eco Fridge: Storage 정책 설정
-- 'item-images' 버킷 생성 후 이 SQL을 실행하세요
-- ================================================

-- 사용자가 자신의 폴더에만 업로드 가능
-- 파일 경로 형식: {user_id}/{filename}
CREATE POLICY "Users can upload own images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'item-images'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- 사용자가 자신의 이미지만 수정 가능
CREATE POLICY "Users can update own images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'item-images'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- 사용자가 자신의 이미지만 삭제 가능
CREATE POLICY "Users can delete own images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'item-images'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- 모든 사용자가 이미지 조회 가능 (Public bucket이므로)
CREATE POLICY "Anyone can view images"
ON storage.objects FOR SELECT
USING (bucket_id = 'item-images');

SELECT '✅ Storage 정책이 성공적으로 설정되었습니다!' AS message;
