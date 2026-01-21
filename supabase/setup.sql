-- ================================================
-- Eco Fridge: 전체 데이터베이스 설정
-- Supabase SQL Editor에서 이 파일 전체를 실행하세요
-- ================================================

-- ================================================
-- 1. Items 테이블 생성
-- ================================================

CREATE TABLE IF NOT EXISTS items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),

  -- 기본 정보
  name TEXT NOT NULL,                    -- 품목명 (예: 우유, 두부)
  category TEXT,                         -- 카테고리 (유제품, 채소, 육류...)

  -- 보관 정보
  storage_method TEXT NOT NULL CHECK (storage_method IN ('fridge', 'freezer', 'pantry')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'consumed', 'discarded')),

  -- 날짜 정보
  purchase_date DATE DEFAULT CURRENT_DATE,
  expiry_date DATE NOT NULL,             -- 유통기한
  is_estimated BOOLEAN DEFAULT false,    -- 유통기한 추정 여부

  -- 추가 정보
  image_url TEXT,                        -- 이미지 URL (Supabase Storage)
  memo TEXT                              -- 사용자 메모
);

-- 성능을 위한 인덱스 생성
CREATE INDEX IF NOT EXISTS items_user_id_idx ON items(user_id);
CREATE INDEX IF NOT EXISTS items_expiry_date_idx ON items(expiry_date);
CREATE INDEX IF NOT EXISTS items_status_idx ON items(status);
CREATE INDEX IF NOT EXISTS items_storage_method_idx ON items(storage_method);


-- ================================================
-- 2. RLS (Row Level Security) 정책 설정
-- ================================================

-- RLS 활성화
ALTER TABLE items ENABLE ROW LEVEL SECURITY;

-- 기존 정책 삭제 (재실행 시 오류 방지)
DROP POLICY IF EXISTS "Users can view own items" ON items;
DROP POLICY IF EXISTS "Users can insert own items" ON items;
DROP POLICY IF EXISTS "Users can update own items" ON items;
DROP POLICY IF EXISTS "Users can delete own items" ON items;

-- SELECT 정책: 자신의 아이템만 조회 가능
CREATE POLICY "Users can view own items"
  ON items FOR SELECT
  USING (auth.uid() = user_id);

-- INSERT 정책: 자신의 아이템만 추가 가능
CREATE POLICY "Users can insert own items"
  ON items FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- UPDATE 정책: 자신의 아이템만 수정 가능
CREATE POLICY "Users can update own items"
  ON items FOR UPDATE
  USING (auth.uid() = user_id);

-- DELETE 정책: 자신의 아이템만 삭제 가능
CREATE POLICY "Users can delete own items"
  ON items FOR DELETE
  USING (auth.uid() = user_id);


-- ================================================
-- 3. 완료 메시지
-- ================================================

SELECT '✅ Eco Fridge 데이터베이스 설정이 완료되었습니다!' AS message;
