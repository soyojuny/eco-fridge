-- ================================================
-- Eco Fridge: Storage 정책 설정 (Single User)
-- 'item-images' 버킷 생성 후 이 SQL을 실행하세요
-- ================================================

-- 기존 정책 삭제 (재실행 시 오류 방지)
DROP POLICY IF EXISTS "Users can upload own images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view images" ON storage.objects;
DROP POLICY IF EXISTS "Allow all operations" ON storage.objects;

-- 모든 작업 허용 (단일 사용자 시스템)
-- 파일 경로 형식: {filename} (user_id 폴더 불필요)
CREATE POLICY "Allow all operations"
ON storage.objects
FOR ALL
USING (bucket_id = 'item-images')
WITH CHECK (bucket_id = 'item-images');

SELECT '✅ Storage 정책이 성공적으로 설정되었습니다! (Single User Mode)' AS message;
