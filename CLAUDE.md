# Eco Fridge: AI Powered Expiry Manager - 개발 표준 가이드

이 문서는 Eco Fridge 프로젝트의 일관성 있는 코드 품질과 효율적인 협업을 위한 개발 표준 가이드입니다. 모든 개발자는 코드 작성 전 본 가이드를 숙지하고 준수해야 합니다.

## 1. 핵심 아키텍처 원칙

-   **Mobile-First Design:** 모든 UI와 UX는 모바일 환경을 최우선으로 고려하여 설계 및 개발합니다.
-   **Component-Based Architecture:** 재사용 가능하고 응집도 높은 컴포넌트 단위로 개발하여 생산성과 유지보수성을 높입니다. (`Shadcn/UI` 기반)
-   **Service-Oriented Backend:** 백엔드 비즈니스 로직은 `src/lib/services` 내의 서비스 계층에 캡슐화됩니다. API 라우트(`src/app/api/**`)는 요청과 응답만 처리하는 얇은 컨트롤러(Controller) 역할을 하며, AI 처리나 데이터베이스 상호작용과 같은 복잡한 작업은 서비스에 위임합니다. 이는 관심사 분리, 모듈성, 재사용성을 촉진합니다.
-   **Feature-based Type Definitions:** 타입스크립트 타입은 `src/types` 디렉토리 내에서 기능(`scanner.d.ts`, `command.d.ts` 등)별로 구성됩니다. 핵심 데이터베이스 타입은 `database.ts`에 위치하여 애플리케이션 성장에 따른 타입 관리의 용이성을 확보합니다.
-   **Clear State Separation:** 상태 관리 라이브러리의 역할을 명확히 분리하여 데이터 흐름을 예측 가능하게 관리합니다.
    -   **Server State (`@tanstack/react-query`):** 서버와의 데이터 동기화, 캐싱, 비동기 데이터 처리를 담당합니다.
    -   **Client State (`zustand`):** 전역 UI 상태, 필터, 세션 정보 등 클라이언트 측 상태를 담당합니다.
    -   **Local State (`useState`, `useReducer`):** 단일 컴포넌트 내에서만 사용되는 지역 상태를 담당합니다.
-   **Type Safety:** TypeScript의 `strict` 모드를 활성화하고, `Supabase`에서 생성된 타입을 적극 활용하여 타입 안정성을 극대화합니다.

## 2. 기술 스택

-   **Framework:** Next.js 14+ (App Router)
-   **Language:** TypeScript
-   **Styling:** Tailwind CSS, Shadcn/UI
-   **Database & Auth:** Supabase (PostgreSQL, Auth, Storage)
-   **Server State:** TanStack Query (React Query)
-   **Client State:** Zustand
-   **AI Provider:** Google Gemini API
-   **Deployment:** Vercel

## 3. 상세 개발 규칙

프로젝트의 구체적인 코딩 컨벤션은 `.claude` 디렉토리 하위의 상세 규칙 문서를 따릅니다.

-   **[./.claude/01-directory-structure.md](./.claude/01-directory-structure.md):** 프로젝트 디렉토리 구조 및 파일 배치 규칙
-   **[./.claude/02-naming-conventions.md](./.claude/02-naming-conventions.md):** 파일, 변수, 함수 등의 명명 규칙
-   **[./.claude/03-component-guide.md](./.claude/03-component-guide.md):** 컴포넌트 설계, `Shadcn/UI` 활용법 및 모범 사례
-   **[./.claude/04-state-management.md](./.claude/04-state-management.md):** 상태 관리 라이브러리(React Query, Zustand) 사용 가이드
-   **[./.claude/05-api-routes-guide.md](./.claude/05-api-routes-guide.md):** Next.js API 라우트 작성 규칙
-   **[./.claude/06-styling-guide.md](./.claude/06-styling-guide.md):** Tailwind CSS 및 `cn` 함수 사용법
-   **[./.claude/07-typescript-guide.md](./.claude/07-typescript-guide.md):** TypeScript 타입 정의 및 활용 규칙
-   **[./.claude/08-supabase-usage.md](./.claude/08-supabase-usage.md):** Supabase 클라이언트 사용 및 데이터베이스 연동 가이드
