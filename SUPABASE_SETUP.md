# Supabase 설정 가이드

## 1. Supabase 프로젝트 생성

### 1.1 계정 생성 및 로그인
1. [Supabase](https://supabase.com) 접속
2. GitHub 계정으로 로그인 (또는 이메일 가입)

### 1.2 새 프로젝트 생성
1. Dashboard에서 **"New Project"** 클릭
2. 프로젝트 정보 입력:
   - **Name**: `smart-pantry` (또는 원하는 이름)
   - **Database Password**: 안전한 비밀번호 설정 (나중에 필요할 수 있음)
   - **Region**: `Northeast Asia (Seoul)` 선택 (한국 사용자의 경우)
3. **"Create new project"** 클릭
4. 프로젝트 생성 완료까지 대기 (약 2분)

---

## 2. API 키 확인 및 환경 변수 설정

### 2.1 API 키 확인
1. 프로젝트 Dashboard에서 좌측 메뉴 **"Project Settings"** (톱니바퀴 아이콘) 클릭
2. **"API"** 탭 선택
3. 다음 정보 확인:
   - **Project URL**: `https://xxxxxxxx.supabase.co`
   - **anon public**: `eyJhbGciOiJIUzI1NiIs...` (긴 문자열)

### 2.2 환경 변수 설정
프로젝트의 `.env.local` 파일을 열고 다음과 같이 수정:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...your-anon-key

# Google Gemini API
GOOGLE_GEMINI_API_KEY=your-gemini-api-key
```

> ⚠️ **중요**: 실제 값으로 교체하세요. `your-`로 시작하는 부분을 Supabase에서 복사한 값으로 대체합니다.

---

## 3. 데이터베이스 테이블 생성

### 3.1 SQL Editor 접속
1. Supabase Dashboard 좌측 메뉴에서 **"SQL Editor"** 클릭
2. **"New query"** 클릭

### 3.2 Items 테이블 생성
다음 SQL을 복사하여 실행:

```sql
-- ================================================
-- Eco Fridge: Items 테이블 생성
-- ================================================

-- 기존 테이블이 있다면 삭제 (주의: 데이터가 삭제됨)
-- DROP TABLE IF EXISTS items;

-- Items 테이블 생성
CREATE TABLE items (
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
CREATE INDEX items_user_id_idx ON items(user_id);
CREATE INDEX items_expiry_date_idx ON items(expiry_date);
CREATE INDEX items_status_idx ON items(status);
CREATE INDEX items_storage_method_idx ON items(storage_method);

-- 확인 메시지
SELECT 'Items 테이블이 성공적으로 생성되었습니다!' AS message;
```

**"Run"** 버튼 클릭하여 실행

### 3.3 Row Level Security (RLS) 정책 설정
새 쿼리에서 다음 SQL 실행:

```sql
-- ================================================
-- Eco Fridge: RLS (Row Level Security) 정책 설정
-- 사용자는 자신의 데이터만 접근 가능
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

-- 확인 메시지
SELECT 'RLS 정책이 성공적으로 설정되었습니다!' AS message;
```

---

## 4. Authentication 설정

### 4.1 이메일 인증 설정
1. 좌측 메뉴 **"Authentication"** 클릭
2. **"Providers"** 탭 선택
3. **"Email"** 확인 (기본 활성화)
4. 설정 확인:
   - ✅ Enable Email provider
   - ✅ Confirm email (선택사항 - 개발 중에는 비활성화 가능)

### 4.2 사이트 URL 설정 (중요!)
1. **"Authentication"** → **"URL Configuration"**
2. 다음 URL 설정:
   - **Site URL**: `http://localhost:3000` (개발용)
   - **Redirect URLs**:
     ```
     http://localhost:3000/**
     http://localhost:3000/auth/callback
     ```

> 📝 **배포 후**: Vercel 배포 URL도 추가해야 합니다.
> 예: `https://your-app.vercel.app/**`

### 4.3 이메일 템플릿 설정 (선택사항)
1. **"Authentication"** → **"Email Templates"**
2. **"Magic Link"** 템플릿 수정 가능
3. 기본 템플릿도 잘 작동합니다.

---

## 5. Storage 설정 (이미지 저장용)

### 5.1 버킷 생성
1. 좌측 메뉴 **"Storage"** 클릭
2. **"New bucket"** 클릭
3. 버킷 정보 입력:
   - **Name**: `item-images`
   - **Public bucket**: ✅ 체크 (이미지 공개 접근용)
4. **"Create bucket"** 클릭

### 5.2 Storage 정책 설정
SQL Editor에서 다음 실행:

```sql
-- ================================================
-- Eco Fridge: Storage 정책 설정
-- ================================================

-- 사용자가 자신의 폴더에만 업로드 가능
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

-- 모든 사용자가 이미지 조회 가능 (Public bucket)
CREATE POLICY "Anyone can view images"
ON storage.objects FOR SELECT
USING (bucket_id = 'item-images');

SELECT 'Storage 정책이 성공적으로 설정되었습니다!' AS message;
```

---

## 6. 설정 확인

### 6.1 테이블 확인
1. 좌측 메뉴 **"Table Editor"** 클릭
2. `items` 테이블이 보이면 성공

### 6.2 정책 확인
1. `items` 테이블 클릭
2. 우측 상단 **"RLS Policies"** 버튼 클릭
3. 4개의 정책이 보이면 성공:
   - Users can view own items
   - Users can insert own items
   - Users can update own items
   - Users can delete own items

---

## 7. 앱 실행 테스트

### 7.1 개발 서버 시작
```bash
npm run dev
```

### 7.2 테스트 순서
1. `http://localhost:3000` 접속
2. 로그인 페이지로 리다이렉트 확인
3. 이메일 입력 → "로그인 링크 받기" 클릭
4. 이메일에서 Magic Link 클릭
5. 메인 화면 진입 확인

---

## 8. 문제 해결

### 8.1 "Invalid supabaseUrl" 오류
- `.env.local` 파일의 URL이 올바른지 확인
- URL이 `https://`로 시작하는지 확인
- 개발 서버 재시작: `npm run dev`

### 8.2 로그인 링크가 오지 않음
- Supabase Dashboard → Authentication → Users 확인
- 스팸 메일함 확인
- Email Provider가 활성화되어 있는지 확인

### 8.3 "Row Level Security" 오류
- RLS 정책이 올바르게 설정되었는지 확인
- SQL Editor에서 정책 쿼리 재실행

### 8.4 데이터가 저장되지 않음
- 브라우저 개발자 도구 → Network 탭에서 API 응답 확인
- Supabase Dashboard → Table Editor에서 데이터 확인

---

## 9. 유용한 SQL 쿼리

### 테이블 구조 확인
```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'items';
```

### 모든 아이템 조회 (관리자용)
```sql
SELECT * FROM items ORDER BY created_at DESC;
```

### 특정 사용자의 아이템 조회
```sql
SELECT * FROM items
WHERE user_id = 'user-uuid-here'
ORDER BY expiry_date ASC;
```

### 유통기한 임박 아이템 조회
```sql
SELECT * FROM items
WHERE status = 'active'
  AND expiry_date <= CURRENT_DATE + INTERVAL '3 days'
ORDER BY expiry_date ASC;
```

### 테이블 데이터 전체 삭제 (주의!)
```sql
TRUNCATE TABLE items;
```

---

## 10. 배포 시 추가 설정

Vercel 배포 후:

1. **Supabase URL Configuration 업데이트**
   - Site URL: `https://your-app.vercel.app`
   - Redirect URLs에 추가: `https://your-app.vercel.app/**`

2. **Vercel 환경 변수 설정**
   - Vercel Dashboard → Project Settings → Environment Variables
   - `.env.local`의 모든 변수 추가

---

## 완료!

모든 설정이 완료되면 Eco Fridge 앱을 사용할 준비가 된 것입니다. 🎉
