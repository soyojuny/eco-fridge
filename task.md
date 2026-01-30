# 음성 명령 기능 개발 계획

## 1. 개요

사용자가 음성 명령을 통해 냉장고 안의 식료품을 관리할 수 있는 기능을 추가합니다. 기존의 이미지 등록 방식에 더해, "우유 샀어", "계란 냉동실로 옮겨" 와 같은 자연어 명령으로 품목을 추가, 수정, 상태 변경(소비/폐기)할 수 있도록 시스템을 확장합니다.

## 2. 기술 실행 계획

### 2.1. 프론트엔드 (UI & State)

#### 가. 음성 명령 UI 컴포넌트 (`VoiceCommand.tsx`)

-   **위치**: `src/components/voice/VoiceCommand.tsx` (신규 생성)
-   **기능**:
    -   마이크 아이콘 형태의 플로팅 액션 버튼(Floating Action Button)으로 구현하여 어느 탭에서든 접근 가능하도록 합니다.
    -   브라우저의 `Web Speech API (`SpeechRecognition`)`를 사용하여 사용자의 음성을 텍스트로 변환합니다.
    -   음성 인식 상태(`대기중`, `음성 인식중`, `처리중`)에 따라 시각적 피드백(ex. 애니메이션)을 제공합니다.
    -   인식된 텍스트를 백엔드 API로 전송하는 역할을 담당합니다.
-   **통합**: `src/components/layout/MainLayout.tsx` 에 해당 컴포넌트를 추가하여 전역적으로 노출시킵니다.

#### 나. 상태 관리 (`useItems.ts` 수정)

-   **위치**: `src/hooks/useItems.ts`
-   **기능**:
    -   음성 명령 처리를 위한 새로운 `mutation`을 추가합니다.
        ```typescript
        const processVoiceCommandMutation = useMutation({
          mutationFn: (command: string) => fetch('/api/ai/command', { method: 'POST', body: JSON.stringify({ command }) }),
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['items'] });
            toast.success('음성 명령이 처리되었습니다.');
          },
          onError: (error) => {
            toast.error(error.message);
          }
        });
        ```
    -   UI 컴포넌트(`VoiceCommand.tsx`)는 이 `mutation`을 호출하여 음성 명령 처리를 요청합니다.
    -   명령 성공 시 `queryClient.invalidateQueries`를 호출하여 아이템 목록을 자동으로 새로고침하고 UI에 변경사항을 반영합니다.

### 2.2. 백엔드 (API & AI)

#### 가. 음성 명령 처리 API (`/api/ai/command/route.ts`)

-   **위치**: `src/app/api/ai/command/route.ts` (신규 생성)
-   **역할**: 음성 명령 처리의 전체 워크플로우를 관장하는 컨트롤러.
-   **처리 순서**:
    1.  클라이언트로부터 `command` 텍스트를 포함한 `POST` 요청을 수신합니다.
    2.  데이터베이스에서 현재 사용자의 모든 `items` 목록을 조회합니다. (수정/삭제 시 특정 품목을 찾기 위함)
    3.  `command`와 `items` 목록을 `generateVoiceCommandParserPrompt` 함수에 전달하여 AI 프롬프트를 생성합니다.
    4.  생성된 프롬프트를 Gemini API로 전송하여 `의도(intent)`와 `정보(entities)`가 담긴 JSON 응답을 받습니다.
    5.  AI가 반환한 `intent`에 따라 분기 처리:
        -   `ADD_ITEM`: AI가 생성한 품목 정보를 `items` 테이블에 `INSERT`합니다.
        -   `UPDATE_ITEM`: AI가 식별한 대상 품목(`target`)을 찾아 `updates` 내용으로 `UPDATE`합니다. (ex. `storage_method` 또는 `status` 변경)
        -   `DELETE_ITEM`: AI가 식별한 대상 품목의 `status`를 `consumed` 또는 `discarded`로 변경합니다. (실제 `DELETE` 대신 상태 변경)
    6.  처리 결과를 클라이언트에 반환합니다.

#### 나. AI 프롬프트 엔지니어링 (`voice-command-parser.ts`)

-   **위치**: `src/lib/prompts/voice-command-parser.ts` (신규 생성)

## 3. 예상 데이터베이스 스키마 변경

-   `items` 테이블의 `status` enum에 `consumed`(소비됨), `discarded`(폐기됨) 외에 현재 상태를 나타내는 `active`(보관중) 등의 값이 정의되어 있는지 확인합니다. (`src/types/database.ts` 확인 결과, `active`, `consumed`, `discarded`가 이미 존재하므로 스키마 변경은 불필요합니다.)

## 4. 개발 순서

1.  **Backend-First**:
    1.  `voice-command-parser.ts` 프롬프트 초안 작성.
    2.  `/api/ai/command/route.ts` API 엔드포인트 기본 구조 구현. (Gemini 연동 포함)
2.  **Frontend-Integration**:
    1.  `useItems.ts`에 음성 명령 `mutation` 추가.
    2.  `VoiceCommand.tsx` 컴포넌트 구현 및 `MainLayout.tsx`에 통합.
3.  **Test & Refine**:
    1.  실제 음성으로 다양한 시나리오(추가, 수정, 소비, 폐기)를 테스트.
    2.  테스트 결과를 바탕으로 프롬프트와 API 로직을 수정하여 정확도 향상.
    3.  UI/UX 피드백을 반영하여 컴포넌트 완성도 높이기.
