-- ================================================
-- Eco Fridge: 전체 데이터베이스 설정 (Single User)
-- Supabase SQL Editor에서 이 파일 전체를 실행하세요
-- ================================================

-- ================================================
-- 1. Items 테이블 생성 (user_id 제거, quantity 추가)
-- ================================================

CREATE TABLE IF NOT EXISTS items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
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

  -- 수량
  quantity INTEGER DEFAULT 1,            -- 아이템 수량

  -- 추가 정보
  image_url TEXT,                        -- 이미지 URL (Supabase Storage)
  memo TEXT                              -- 사용자 메모
);

-- 성능을 위한 인덱스 생성
CREATE INDEX IF NOT EXISTS items_expiry_date_idx ON items(expiry_date);
CREATE INDEX IF NOT EXISTS items_status_idx ON items(status);
CREATE INDEX IF NOT EXISTS items_storage_method_idx ON items(storage_method);


-- ================================================
-- 2. RLS (Row Level Security) 비활성화
-- ================================================

-- 기존 정책 삭제 (재실행 시 오류 방지)
DROP POLICY IF EXISTS "Users can view own items" ON items;
DROP POLICY IF EXISTS "Users can insert own items" ON items;
DROP POLICY IF EXISTS "Users can update own items" ON items;
DROP POLICY IF EXISTS "Users can delete own items" ON items;

-- RLS 비활성화 (단일 사용자 시스템)
ALTER TABLE items DISABLE ROW LEVEL SECURITY;


-- ================================================
-- 3. 기존 테이블이 있는 경우 user_id 컬럼 제거
-- ================================================

-- user_id 인덱스 제거
DROP INDEX IF EXISTS items_user_id_idx;

-- user_id 컬럼 제거 (이미 없으면 무시됨)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'items'
    AND column_name = 'user_id'
  ) THEN
    ALTER TABLE items DROP COLUMN user_id;
  END IF;
END $$;

-- quantity 컬럼 추가 (이미 있으면 무시됨)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'items'
    AND column_name = 'quantity'
  ) THEN
    ALTER TABLE items ADD COLUMN quantity INTEGER DEFAULT 1;
  END IF;
END $$;


-- ================================================
-- 4. 완료 메시지
-- ================================================

SELECT '✅ Eco Fridge 데이터베이스 설정이 완료되었습니다! (Single User Mode)' AS message;
