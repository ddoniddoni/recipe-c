# 아키텍처, 데이터, 보안 명세

버전: 1.0 | 기준일: 2026-10-12

이 문서는 구현 계약이다. 실제 SQL migration, TypeScript 코드, RLS 테스트는 개발 단계에서 작성한다. 표에 명시한 제약을 UI 검증만으로 대체하지 않는다. 공식 자료의 S 번호는 `04_DELIVERY_AND_TESTS.md`의 참고자료를 가리킨다.

## 1. 기술 구성

| 영역 | 선택 | 적용 규칙 |
|---|---|---|
| 런타임 | Node.js 24 LTS 계열 | P0에서 지원 상태와 호스팅 호환성을 확인하고 정확한 버전을 기록 |
| 프레임워크 | Next.js 16 계열 App Router | 설치 시 지원 중인 안정 패치를 선택하고 lockfile로 고정 |
| UI | React, TypeScript strict | Next.js와 호환되는 버전 사용, 불필요한 any 금지 |
| 스타일 | Tailwind CSS | 초기 scaffold 버전 기준, 디자인 토큰은 한 곳에서 관리 |
| 인증 | Supabase Auth | 이메일·이름·비밀번호 가입, 가입 확인 메일 생략, 서버 렌더링 세션 지원 |
| 데이터 | Supabase PostgreSQL | SQL migration, DB 함수, RLS |
| 이미지 | Supabase Storage + 서버 이미지 처리 | private 버킷, 직접 업로드, 검증 후 사용 |
| 입력 | Zod | 클라이언트 UX 검증과 서버 검증, DB 제약은 별도로 적용 |
| 테스트 | Vitest, Testing Library, Playwright, pgTAP | 단위, UI, E2E, DB 권한 테스트 분리 |
| 패키지 | npm | package-lock.json, CI의 npm ci |

Next.js와 Node 선택의 참고는 S01~S03이다. 버전 문자열을 이 문서만 보고 영구 고정하지 말고 최초 설치 결과를 PROGRESS에 기록한다. beta, canary 버전을 자동 채택하지 않는다.

React Server Components를 기본으로 하고 편집 폼, 별점 입력, 업로더 등에만 Client Component를 쓴다. 최초 버전에서는 Prisma, 별도 Express 서버, Redis, Elasticsearch, 전역 상태 라이브러리, 별도 메시지 큐를 도입하지 않는다. 목록은 서버 조회, 폼 상태는 로컬 상태로 시작한다.

## 2. 시스템 경계

```text
브라우저
  ├─ 공개 페이지와 폼 → Next.js
  │    ├─ Server Components → 사용자 또는 익명 Supabase 읽기
  │    ├─ Server Actions → 검증 → 사용자 JWT를 가진 DB RPC
  │    └─ Route Handlers → 업로드 서명, 이미지 처리, 미디어 접근, 탈퇴 작업
  └─ 업로드 파일 → 제한된 서명으로 Supabase private Storage

Supabase
  ├─ Auth: 가입과 로그인, 비밀번호 복구
  ├─ PostgreSQL: 데이터, 권한, 원자적 쓰기, 어워즈 평가
  └─ Storage: 비공개 업로드 원본과 처리된 이미지
```

일반 사용자의 콘텐츠 요청에 서비스 관리자 키를 사용해 RLS를 우회하지 않는다. 관리자 키가 필요한 파일 처리와 Auth 계정 삭제는 서버 전용 모듈에 한정하고, 그 앞에서 사용자 및 대상 권한을 재검사한다.

Server Action도 공개 호출 경계로 간주하고 매번 인증과 인가를 검사한다. 페이지와 버튼에 접근하지 못해도 요청을 직접 보낼 수 있다는 전제로 설계한다. 공식 보안 참고는 S13이다.

## 3. 폴더 구조

```text
AGENTS.md
docs/
  01_PRODUCT_AND_UI.md
  02_ARCHITECTURE_AND_DATA.md
  03_AWARDS_AND_REVENUE.md
  04_DELIVERY_AND_TESTS.md
  PROGRESS.md
src/
  app/
    (public)/
    (auth)/
    (member)/
    admin/
    auth/confirm/route.ts
    auth/callback/route.ts
    api/uploads/sign/route.ts
    api/uploads/complete/route.ts
    media/[assetId]/route.ts
    layout.tsx
    globals.css
  components/
    ui/
    layout/
  features/
    auth/
    profiles/
    recipes/
    community/            # P3 후기·댓글·저장·알림·신고 접수의 UI/계약
    awards/
    moderation/
    monetization/          # P6에 생성
  lib/
    supabase/client.ts
    supabase/server.ts
    supabase/database.ts   # DB 타입 계약, 연결 후 CLI로 생성
    supabase/admin.ts      # server-only
    supabase/proxy.ts
    env.ts
    errors.ts
    media.ts
    time.ts
  proxy.ts
supabase/
  config.toml
  migrations/
  seed.sql
  tests/database/
tests/
  unit/
  integration/
  e2e/
  fixtures/
scripts/
```

Route Group은 URL 경로를 바꾸지 않는 구성용 폴더다. 특정 기능 폴더는 필요해질 때 만든다. 빈 폴더, 빈 repository 클래스, 무의미한 추상 계층을 미리 양산하지 않는다.

## 4. 환경변수와 실행 모드

```dotenv
# .env.example: 실제 값이나 토큰을 적지 않는다.
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=

# 서버 전용. 신규 가입 계정 생성과 파일 처리에 필요.
SUPABASE_SECRET_KEY=

# 명시적인 개발 화면 시연 전용. 운영 배포에서는 false만 허용.
DEMO_MODE=false

# P6에서만 사용. 둘 다 기본 false.
FEATURE_AFFILIATE_LINKS=false
FEATURE_SPONSORED_CHALLENGES=false
```

새 키 체계의 publishable/secret 사용은 S05를 따른다. 로컬 CLI가 legacy anon/service_role 키를 제공하는 버전이라면 같은 목적의 환경변수 값으로 매핑할 수 있지만 값의 용도는 바꾸지 않는다. 서버 키는 NEXT_PUBLIC 접두사를 붙이지 않는다.

환경 검증은 공개 설정과 서버 비밀을 분리한다. 브라우저 번들에 서버 환경 스키마가 포함되지 않게 한다. 로그에는 키, 쿠키, Authorization 헤더, 인증 링크를 남기지 않는다.

DEMO_MODE는 명시적으로 켠 개발 환경에서만 fixture를 읽는다. 로그인과 영구 저장은 비활성화하고 `샘플 데이터` 배너를 표시한다. Supabase 오류 시 자동으로 fixture로 전환하지 않는다. production에서 DEMO_MODE=true면 시작 또는 빌드를 실패시킨다. 원격 DB가 없는 상태의 build 성공은 기능 연동 성공을 뜻하지 않는다.

## 5. 인증과 계정

`@supabase/supabase-js`와 `@supabase/ssr`로 브라우저와 서버 클라이언트를 분리한다. Next.js 16의 `proxy.ts`에서는 공식 세션 갱신 패턴을 따른다. 서버 인가는 쿠키에서 읽은 `getSession()` 객체만 신뢰하지 않고 검증된 claims를 사용한다. 계정 삭제나 관리자 작업에는 최신 Auth 사용자 확인과 DB의 역할/상태 확인을 추가한다. S04 참고.

리다이렉트 대상은 같은 사이트의 허용된 상대 경로만 허용한다. 외부 URL, `//host` 형태, 인코딩된 우회 문자열을 차단한다. 이메일 확인, 비밀번호 복구, 로그인 직후 돌아갈 경로를 테스트한다.

공개 프로필 ID와 Auth user ID는 분리한다. 탈퇴 이후에도 공개 콘텐츠와 수상 기록의 참조 구조를 안전하게 정리하기 위해서다.

```text
auth.users.id
    ↓ re_private.re_accounts.auth_user_id
re_private.re_accounts.profile_id → public.re_profiles.id
    ↓
recipes.author_id / cook_reviews.author_id / comments.author_id
```

현재 가입은 이메일·이름·비밀번호만 받는다(2026-10-13 사용자 요청). 서버 전용 `signup-service.ts`가 `auth.admin.createUser({ email_confirm: true })`로 새 사용자만 생성하고 사용자 세션 클라이언트로 로그인한다. 공유 Auth 전역 확인 설정은 변경하지 않는다. 기존 이메일의 사용자를 자동 확인하거나 비밀번호·metadata를 덮어쓰지 않으며 중복 주소는 로그인으로 안내한다. 비밀번호 복구 메일과 기존 확인 링크 처리는 유지한다.

로그인·가입 직후 `re_ensure_account`가 본인 프로필과 re_private.re_accounts를 한 트랜잭션으로 생성한다. 이름은 표시용 `display_name` metadata를 2~30자로 검증해서 사용하고, 고유 handle은 자동 생성하며 프로필 입력 완료로 기록한다. 이름·소개는 나중에 수정할 수 있다. 기존 계정은 본인의 미완료 표시만 완료하고 이름·역할을 덮어쓰지 않는다. 공유 Auth 사용자를 일괄 등록하거나 전역 트리거를 설치하지 않는다. metadata는 역할·상태 판단에 사용하지 않는다.

관리 키는 이 신규 가입 경로와 미디어 처리에만 서버에서 사용한다. 가입 전 `re_consume_signup_limit` RPC가 UTC 시간 단위로 앱 전체 30회/동일 이메일 3회의 요청 한도를 적용한다. 이메일은 서버 키 기반 HMAC으로만 기록하며, RPC는 service_role만 실행한다. 가입 생성과 로그인/프로필 생성은 별도 요청이므로 부분 성공이면 재로그인으로 이어가며 이미 생성된 Auth 계정을 삭제하거나 재생성하지 않는다.

DB 보조 함수 `re_private.re_current_profile_id()`, `re_private.re_is_active_member()`, `re_private.re_is_admin()`은 실제 auth.uid()를 기준으로 매핑한다. active_member는 계정 상태·세션과 Auth 확인 상태를 검사한다. 새 가입의 확인 상태는 서버가 자동 설정한 값이므로 이메일 소유권 검증 완료를 의미하지 않으며 UI에 그렇게 표시하지 않는다. `re_private` 스키마를 Data API에 노출하지 않는다.

## 6. 데이터 모델 공통 규칙

Supabase 프로젝트를 다른 앱과 공유하므로 모든 앱 테이블의 물리 이름은 `re_` 접두사를 사용한다. public.re_profiles, public.re_recipes, public.re_cook_reviews와 내부 re_private.re_accounts가 기준이다. 뷰·RPC·인덱스·명시적 제약·정책도 `re_`, Storage 버킷은 `re_recipe_media`로 구분한다. 문서의 기능명이나 `/recipes` 같은 URL은 그대로 유지한다. 이후 단계의 테이블도 같은 접두사 규칙을 따른다.

`auth.users`, `auth.sessions`, `storage.buckets`, `storage.objects`는 Supabase 공용 시스템 테이블이다. 이름을 바꾸지 않으며 앱용 migration에서 다른 프로젝트 행을 수정하지 않는다. public 스키마의 default privileges와 기존 private 스키마 권한을 건드리지 않고, 새 re_private 스키마가 이미 있으면 초기 migration을 실패시켜 충돌을 먼저 확인한다. DB 이름 분리는 Auth의 사용자·비밀번호·이메일 설정을 별개로 만드는 기능이 아니다. 공유 Auth 설정 변경/회원 삭제는 다른 앱 영향을 포함해 별도로 설계한다.

모든 시각은 `timestamptz`, DB 저장 기준은 UTC다. 월간 경계 계산은 Asia/Seoul이다. 사용자 입력 시각을 created_at 또는 평가 시각으로 사용하지 않는다. ID는 UUID, 가변 문자에는 최대 길이 검증을 적용한다.

아래 표에서 FK는 외래키, UQ는 UNIQUE, PK는 기본키다. 열 이름은 기본 계약이며 구현 시 보조 인덱스와 제약 이름을 추가한다. public 테이블은 빠짐없이 RLS를 켠다. `re_private`는 이 앱만의 비공개 운영 데이터다.

### 6.1 계정과 분류

| 테이블 | 주요 필드 | 제약 및 비고 |
|---|---|---|
| re_profiles | id, handle, display_name, bio, avatar_asset_id, visibility_status, created_at | handle UQ, visibility_status=active/deleted. 이메일과 역할 없음 |
| re_private.re_accounts | auth_user_id, profile_id, role, status, is_test_account, created_at | auth_user_id PK/FK auth.users ON DELETE CASCADE, profile_id UQ/FK profiles, role=member/admin, status=active/suspended/deleting |
| re_categories | id, slug, name, sort_order, is_active | slug UQ, 관리자만 변경 |

is_test_account는 운영자가 지정하는 개발용 계정 표시이며 기본 false다. 사용자가 변경할 수 없고 실제 어워즈와 운영 실적에서 제외한다. 격리된 DB의 정상 참여 테스트 fixture와 운영 테스트 계정은 구분한다.

profiles의 display_name은 2~30자, bio는 0~300자다. handle은 영문 소문자, 숫자, 밑줄로 3~24자이며 예약어 admin, api, me, settings 등을 차단한다. profiles.id를 auth.users에 직접 CASCADE 연결하지 않는다.

### 6.2 레시피와 버전

| 테이블 | 주요 필드 | 제약 및 비고 |
|---|---|---|
| re_recipes | id, author_id, current_version_id, status, first_published_at, created_at, updated_at | author_id FK profiles, status=draft/published/hidden/deleted |
| re_recipe_drafts | recipe_id, body, draft_version, updated_at | recipe_id PK/FK recipes, body JSONB, draft_version 정수 |
| re_recipe_versions | id, recipe_id, version_no, title, summary, servings, prep_minutes, cook_minutes, difficulty, category_id, ingredients, steps, tips, tags, cover_asset_id, disclosure_text, content_hash, source_draft_version, publish_request_id, published_at | UQ(recipe_id, version_no), UQ(recipe_id, publish_request_id), 발행 내용은 불변 |
| re_recipe_version_assets | version_id, asset_id, slot, position | FK version/assets, slot=cover/step, UQ(version_id,slot,position) |

current_version_id는 다른 레시피의 버전을 가리킬 수 없다. recipe_versions에 UQ(recipe_id,id)를 추가하고 recipes의 `(id,current_version_id)`에 복합 FK를 설정하는 등 DB에서 일치 조건을 보장한다. 최초 draft 상태에서는 current_version_id가 NULL이다.

재료와 조리 단계는 버전 단위로 읽고 수정되므로 JSONB 배열로 시작한다. 사진 공개 여부와 소유권 추적을 위해 asset 참조는 recipe_version_assets에도 유지한다. 버전 생성 함수가 JSONB와 참조 테이블을 같은 트랜잭션에서 생성한다. 클라이언트가 둘을 따로 수정하지 못한다.

P2 구현에서는 `recipe_versions.body`를 검증된 불변 JSONB 원본으로 저장하고 title/summary/servings/prep_minutes/cook_minutes/difficulty를 generated column으로 노출한다. ingredients/steps/tips/tags/disclosureText는 body에서 읽으며, category_id/cover_asset_id는 FK를 위해 따로 저장한다. 발행 RPC가 이 값을 같은 트랜잭션에서 채우고 일반 사용자의 직접 INSERT/UPDATE/DELETE는 허용하지 않는다. 본문 중복 사본을 서로 다른 경로로 수정하지 않는다.

초안 생성에는 계정별 `creation_request_id`, 저장에는 `last_save_request_id`를 추가한다. 같은 저장 요청은 동일 본문과 expectedDraftVersion일 때만 같은 결과를 반환한다. 저장한 초안은 발행 후에도 다음 편집의 출발점으로 유지한다. 발행 hash는 정규화된 텍스트·수량·태그와 이미지 바이트 hash를 사용하며 재료/단계의 UI 식별자와 권리 확인 체크값은 제외한다.

```typescript
type Ingredient = {
  id: string;
  name: string;
  quantity: number | null;
  unit: string | null;
  quantityText: string | null;
  optional: boolean;
};

type RecipeStep = {
  id: string;
  position: number;
  instruction: string;
  imageAssetId: string | null;
};
```

quantity는 양수이고 최대 1,000,000, 소수 3자리다. quantity가 없으면 quantityText가 필요하다. unit과 quantityText의 최대 길이는 각각 20자, 50자다. 정렬 position은 1부터 중복 없이 이어진다. 재료나 단계 ID는 한 버전 안에서 고유해야 한다. JSON 전체는 UTF-8 기준 최대 256KiB로 제한한다.

DB 함수는 배열 타입, 요소 수, 필드 타입, 문자열 길이, 인분과 시간, imageAssetId의 소유자 및 ready 상태를 직접 확인한다. Zod를 우회해 RPC를 호출해도 잘못된 자료가 저장되면 안 된다.

### 6.3 요리 후기, 의견, 북마크

| 테이블 | 주요 필드 | 제약 및 비고 |
|---|---|---|
| re_cook_reviews | id, recipe_id, recipe_version_id, author_id, rating, body, status, revision, created_at, updated_at | UQ(author_id,recipe_version_id), rating 정수 1~5, status=published/hidden/deleted |
| re_review_assets | review_id, asset_id, position | FK reviews/assets, UQ(review_id,position), 1~3장 |
| re_recipe_comments | id, recipe_id, author_id, parent_id, kind, body, status, revision, created_at, updated_at | parent는 같은 recipe의 최상위 댓글만 가능 |
| re_bookmarks | profile_id, recipe_id, created_at | PK(profile_id,recipe_id) |
| re_notifications | id, recipient_id, actor_id, type, entity_id, event_key, read_at, created_at | UQ(recipient_id,event_key), 수신자만 읽음 |
| re_reports | id, reporter_id, recipe_id, review_id, comment_id, reason_code, detail, status, created_at | 대상 FK 세 개 중 정확히 하나만 NOT NULL |

cook_reviews의 recipe_id와 recipe_version_id는 복합 FK로 같은 레시피임을 보장한다. soft delete 후 같은 버전에 새 행을 생성해 중복 제한을 우회하지 않는다. 복원 또는 기존 행 편집 경로를 사용한다.

후기 생성/변경, 사진 참조 변경, 현재 버전 통계, 월간 평가 반영은 하나의 DB 처리에서 일관성을 유지한다. 단순히 UI에서 평균 점수를 다시 계산하는 것으로 끝내지 않는다.

댓글의 kind는 question/substitution/suggestion/general이다. 삭제된 원댓글은 본문을 지운 자리표시자로 처리하고 다른 사용자의 답글은 유지할 수 있다. 숨김된 본문을 답글 API나 알림 미리보기에서 반환하지 않는다.

P3 구현 계약:

- 후기 생성·편집·삭제는 `re_private.re_mutate_cook_review` 한 경로에서 처리한다. `re_upsert_cook_review`와 `re_delete_cook_review`는 사용자 세션의 공개 진입점이다. 삭제 호출도 versionId + expectedRevision + requestId를 받아 본인 행만 처리한다. 삭제 시 본문/별점을 비우고 사진 참조를 제거하며 행과 revision은 유지한다. 다시 작성하면 같은 행을 복원하고 최초 생성 알림을 재발송하지 않는다.
- 후기와 댓글은 last_request_id 및 입력 hash로 같은 요청의 재시도를 처리한다. 댓글은 클라이언트가 생성한 고정 UUID를 식별자로 쓰되 소유자는 DB 세션에서 정한다. 기존 댓글의 레시피·부모는 바꿀 수 없다. 정상 클라이언트가 기대한 revision과 DB가 다르면 CONFLICT다. 다른 화면 동작의 새로고침이 작성 중인 글을 덮어쓰지 않도록 편집 기준 revision을 유지한다.
- 쓰기 잠금 순서는 계정 → 레시피 → 후기/댓글 → 정렬된 사진 ID다. 계정 잠금으로 같은 사용자의 요청과 호출 제한을 직렬화한다. P4는 후기 변경 함수 내부에 행사 ID 순 잠금, 잠금 후 서버 시각 검사, snapshot/source_revision 갱신을 추가해야 한다. P3에 가짜 월간 평가 기록이나 성공 stub을 만들지 않았다.
- 후기/댓글은 공개 부모의 상태와 작성자 공개 자격을 함께 확인한다. deleted 원댓글은 비운 본문의 자리표시자로 남기고 답글을 읽을 수 있지만 hidden 부모의 답글은 공개하지 않는다. 신고나 알림에도 숨겨진 본문 사본을 보관하지 않는다.
- 북마크 행/알림/신고 접수 상태는 본인에게만 SELECT를 허용한다. 북마크 총수만 좁은 private 함수로 공개하며 저장한 사람의 목록은 반환하지 않는다. 일반 사용자의 직접 테이블 쓰기는 revoke하고 좁은 RPC만 허용한다.
- `re_get_recipe_community`는 후기 12개, 최상위 댓글 12개를 페이지로 반환한다. 기본 답글은 스레드당 3개이며 `thread` 선택 시 12개씩 읽는다. 페이지는 최대 100이다. 내 후기 목록은 공개 부모의 본인 published/hidden/deleted 기록을 보여 주고, 공개 프로필에는 published 후기만 반환한다.
- notifications는 후기 생성/답글에만 생성하며 본문을 저장하지 않는다. 수신자와 event_key의 UNIQUE로 중복을 막는다. 조회 시 현재 공개 view와 결합해 접근 불가 대상의 링크를 없앤다. 읽음 처리는 본인 ID만 대상으로 하고 최대 100개다.
- 신고 사유는 spam/abuse/rights/unsafe/other, 설명은 10~1,000자다. 같은 대상의 pending/reviewing 신고가 있으면 기존 접수 ID를 반환한다. 관리자 판단과 상태 전이는 P5에서 구현한다.

신고 대상이 여러 종류인 경우 식별자 문자열 하나만 저장하지 말고 nullable FK와 `num_nonnulls(...)=1` 같은 제약으로 대상을 보장한다. 동일 사용자의 같은 대상 중복 미처리 신고를 제한한다. 관리자 내부 메모는 reports.detail에 섞지 않고 비공개 감사 이력에 저장한다.

### 6.4 어워즈

| 테이블 | 주요 필드 | 제약 및 비고 |
|---|---|---|
| re_award_periods | id, slug, kind, month_key, title, theme, submission_opens_at, submission_closes_at, voting_opens_at, voting_closes_at, finalize_not_before, state, rules, source_revision, final_run_id, created_by | slug UQ, kind=monthly/sponsored, 첫 베타는 monthly만 생성 |
| re_award_entries | id, period_id, recipe_id, recipe_version_id, author_id, status, submitted_at | UQ(period_id,recipe_id), UQ(period_id,author_id), 출품 버전 고정 |
| re_award_evaluations | id, period_id, entry_id, reviewer_id, review_id, rating_snapshot, eligibility, evaluated_at, updated_at | UQ(entry_id,reviewer_id), UQ(period_id,review_id), 내부 평가 자료 |
| re_award_runs | id, period_id, source_revision, input_hash, rules_snapshot, status, prepared_at, finalized_at, idempotency_key | UQ(period_id,idempotency_key), status=prepared/finalized/superseded |
| re_private.re_award_run_inputs | run_id, evaluation_id, entry_id, rating, included, exclusion_code | 집계에 사용한 최소 입력 스냅샷, 후기 본문과 사진 복제 금지 |
| re_award_results | run_id, entry_id, recipe_id, recipe_version_id, author_id, rank, medal, review_count, rating_sum, five_star_count, raw_average, adjusted_score, visibility_status | PK(run_id,entry_id), 수상하지 않은 적격 후보 결과도 보존 |

month_key는 일반 월간 행사의 해당 월 1일을 나타내는 DATE다. monthly에는 필수이고 sponsored에는 NULL이다. 취소되지 않은 monthly 행사에 대해 month_key의 부분 UNIQUE 인덱스를 두어 같은 달 일반 행사를 중복 생성하지 않는다. source_revision은 0부터 시작하는 BIGINT다. 최초 베타 일정은 접수 시작 < 접수 마감 = 평가 시작 < 평가 종료 <= 확정 가능 시각을 DB에서 검증한다.

award_results의 medal은 gold/silver/bronze/NULL이고, visibility_status는 visible/content_removed/revoked다. 순위는 양의 정수이며 공동순위를 허용한다. 콘텐츠 삭제는 점수를 고쳐 쓰지 않고 content_removed 상태로 표시 내용을 제한한다.

rules는 규칙 버전, 최소 후기 수, 보정 파라미터, 계정 최소 경과 시간, 동점 규칙 등을 포함한 검증된 JSONB다. 행사 공개 후 규칙과 일정은 임의 변경하지 않는다. 상세 상태와 스냅샷 변경 규칙은 03 문서를 따른다.

award_entries의 author_id는 recipes.author_id와 일치해야 한다. period_id와 entry_id의 일치, 평가자의 review 소유권, review의 출품 버전 일치는 모두 DB 함수 및 복합 제약으로 검증한다. 관리자도 표의 점수 열을 직접 편집하는 UI를 갖지 않는다.

### 6.5 이미지와 운영 데이터

| 테이블 | 주요 필드 | 제약 및 비고 |
|---|---|---|
| re_media_assets | id, owner_id, purpose, status, bucket, original_path, processed_path, mime_type, bytes, width, height, sha256, created_at | purpose=recipe/review/avatar, status=pending/processing/ready/rejected/deleted |
| re_private.re_audit_log | id, actor_id, action, entity_type, entity_id, reason, safe_metadata, created_at | append-only, 비밀번호/토큰/불필요한 본문 저장 금지 |
| re_private.re_rate_limit_buckets | scope_key, operation, bucket_start, count | 복합 PK, DB의 원자적 갱신 |
| re_private.re_account_deletion_jobs | id, profile_id, auth_user_id, stage, status, last_error_code, created_at, updated_at, finished_at | 재시도 가능, 최종 처리 후 불필요한 Auth 식별자 제거 |

media_assets의 저장 경로, 해시, 운영 메타데이터 전체를 공개 응답에 담지 않는다. 공개 미디어 응답 모델은 assetId, 안정적인 미디어 경로, width, height, alt 정도로 제한한다. 공개 읽기가 필요한 조회는 열 단위 GRANT 또는 안전한 projection RPC로 제한한다.

### 6.6 P6 전용 데이터

P6에서 affiliate_links와 re_private.re_affiliate_clicks, sponsor_campaigns를 migration으로 추가한다. 초기 명세에 포함됐다는 이유로 P1에서 빈 정산 시스템과 수익 테이블까지 만들지 않는다. 세부 필드는 03 문서가 기준이다.

## 7. 읽기, 검색, 집계

일반 레시피의 대표 평점은 현재 발행 버전에 달린 published 후기만 집계한다. raw average와 count를 함께 반환한다. 현재 버전 통계 view는 recipes.id당 정확히 한 행이어야 한다. 후기와 북마크를 동시에 join해 행이 곱해지는 집계 오류를 피하고 각각 먼저 집계한다.

P3는 `re_recipe_version_stats`를 요청 시 계산하는 SECURITY INVOKER view로 구성한다. 공개 published 후기만 버전별로 먼저 집계하므로 편집/삭제 후 별도의 비동기 카운터 동기화가 필요하지 않다. 북마크 집계는 따로 결합해 행 곱셈을 피한다. 탐색 평점순은 `(rating_sum + 3.5 × 5) / (count + 5)`를 쓰고 후기 없는 레시피를 마지막에 둔다. 화면에는 보정 점수가 아닌 실제 평균과 개수를 표시한다. 후기 많은 순, 저장 많은 순, 최신순도 제공하고 동점은 발행 시각과 레시피 ID로 안정적으로 정렬한다. 월간 어워즈 결과와는 별도다.

읽기 view를 노출할 때는 적용 중인 PostgreSQL 버전에서 `security_invoker=true` 등 RLS를 지키는 방식을 사용하고 실제 역할로 테스트한다. 보안 검토 없이 기본 definer view로 비공개 초안을 노출하지 않는다. S06 참고.

검색은 최초에 제목과 정규화한 재료 이름을 합친 search_text를 사용한다. ILIKE의 `%`, `_`, escape 문자를 의도대로 처리하고 값을 쿼리 문자열에 직접 보간하지 않는다. 한글 검색은 `김치`, `김치 볶음밥`, `간장`, 두 글자 검색 등의 fixture로 검증한다. 초기에는 형태소 검색이나 동의어 이해를 지원한다고 주장하지 않는다.

데이터가 늘면 `pg_trgm` 인덱스로 ILIKE 검색을 보완할 수 있다. 설치된 DB 버전과 실제 실행 계획을 검증한다. 짧은 검색어에서 인덱스 효과가 제한될 수 있으므로 결과 수와 쿼리 시간을 제한한다. S11 참고.

필수 인덱스 기본안은 recipes(status,first_published_at DESC,id), recipe_versions(recipe_id,version_no), cook_reviews(recipe_version_id,status), recipe_comments(recipe_id,parent_id,created_at,id), bookmarks(profile_id,created_at), notifications(recipient_id,read_at,created_at), award_entries(period_id,status), award_evaluations(period_id,entry_id,eligibility)다. FK 열과 권한 검사 열도 실행 계획을 보며 보완한다.

목록 정렬의 마지막 조건에 고유 ID를 붙여 페이지 이동 중 동점 순서가 임의로 바뀌지 않게 한다. offset 기반 페이지네이션으로 시작하되 큰 offset은 제한한다. 공개 DB 전체를 브라우저로 가져와 필터링하지 않는다.

P2의 목록은 페이지당 12개, 최대 100페이지다. 현재 발행 버전의 제목·재료를 NFKC/소문자/공백 제거로 정규화한 후 `strpos`로 검색한다. `%`, `_`, 역슬래시를 SQL 패턴으로 해석하지 않는다. 평점·후기 수·저장 수 정렬은 실제 통계를 구현하는 P3에서 추가하며 P2는 `sort=newest`로 정규화한다. 현재 후기/저장 수를 임의로 생성하지 않는다. 공개 목록 view는 `security_invoker=true`, 상세 RPC는 SECURITY INVOKER와 부모 가시성 검사를 사용한다.

## 8. 권한과 RLS 계약

RLS와 GRANT는 함께 설정한다. RPC 실행 권한도 별도다. S06과 S07 참고.

이 서비스의 점수, 출품, 발행 같은 도메인 쓰기는 직접 테이블 수정 권한을 제거하고 좁은 DB 함수로만 허용한다. 따라서 사용자 JWT를 가진 요청이라도 SECURITY DEFINER 함수 내부에서는 소유권과 상태를 명시적으로 검사해야 한다. 함수가 RLS를 우회할 수 있다는 점을 전제로 테스트한다.

| 데이터 | 비회원 | 정상 회원 | 관리자 | 직접 쓰기 |
|---|---|---|---|---|
| 공개 프로필/카테고리 | 안전한 필드 읽기 | 동일 | 관리 조회 | 금지, 제한 함수 |
| published 레시피와 공개 버전 | 읽기 | 읽기 | 읽기 | 금지 |
| 초안/숨김/삭제 레시피 | 불가 | 본인 관리 조회만 | 운영 조회 | 금지 |
| 공개 요리 후기/댓글 | 공개 부모의 published 내용만 | 동일, 본인 관리 가능 | 운영 조회 | 금지 |
| 북마크 | 불가 | 본인만 | 내용 임의 열람 기능 제공 안 함 | 금지, 본인 설정 함수 |
| 알림 | 불가 | 본인만 | 운영 UI에서 타인 알림 조회 안 함 | 읽음 처리 함수 |
| 신고 | 불가 | 본인 신고의 접수 상태만 | 전체 처리 | 신고/처리 함수 |
| 행사와 후보 | 공개된 행사만 | 동일 | 초안 포함 | 관리자/출품 함수 |
| 평가 자료 | 불가 | 자신의 반영 상태만 | 집계 조회 | 후기 처리에서만 갱신 |
| 준비 중 집계/결과 | 불가 | 불가 | 읽기 | 집계 함수 |
| 확정 결과 | 선택된 final_run의 공개 결과 | 동일 | 감사 정보 포함 | 직접 변경 금지 |
| re_media_assets | 안전한 공개 projection만 | 본인 또는 공개 참조 이미지 | 운영 조회 | 서버 처리 전용 |
| re_private.* | 불가 | 불가 | 제한 RPC 결과만 | 신뢰 함수와 서버 작업만 |

모든 공개 하위 자료의 가시성은 상위 레시피 상태도 검사한다. recipe가 hidden인데 review_assets, 특정 버전 URL, 검색 view, JSON-LD, 공유 미리보기에서 내용이 노출되면 실패다.

SECURITY DEFINER 함수는 search_path를 빈 값 또는 엄격한 고정 값으로 설정하고 객체를 스키마로 한정한다. PUBLIC/anon의 기본 execute를 취소한 뒤 필요한 역할만 허용한다. authenticated에 허용했다고 모든 사용자의 데이터 접근을 허용한 것이 아니다. 함수마다 auth.uid(), current_profile_id, active status, 소유권을 검사한다. 관리자 함수도 실제 DB 역할 확인을 한다. S07 참고.

private 보조 함수가 공개 테이블 policy를 재귀 호출하지 않도록 설계한다. 관리 상태 확인에 필요한 최소 데이터만 반환한다. Storage에는 별도 정책을 적용하며 public 테이블 RLS가 파일 접근까지 자동 보장한다고 가정하지 않는다. RLS에서 호출하는 private 보조 함수의 최소 실행 권한은 필요한 역할에 허용하되 `re_private` 스키마를 Data API에 노출하지 않는다. 단순히 스키마 이름이 re_private이라는 이유로 SQL 권한 검토를 생략하지 않는다.

## 9. 서버 기능과 RPC 계약

읽기는 Server Components에서 기능별 query 함수로 수행한다. 쓰기는 Server Action이 입력을 검증하고 사용자 세션의 RPC를 호출한다. 사진 바이트는 Server Action으로 전송하지 않는다.

| 작업 | 대표 계약 | 핵심 검증 |
|---|---|---|
| 프로필 수정 | update_profile(input) | 본인, 허용 필드, 아바타 소유권 |
| 초안 생성 | create_recipe_draft(initialBody) | 정상 회원, 작성 속도 제한 |
| 초안 저장 | save_recipe_draft(recipeId, expectedDraftVersion, body) | 작성자, 낙관적 잠금 |
| 발행 | publish_recipe(recipeId, expectedDraftVersion, requestId) | 전체 검증, 이미지 ready, 변경 여부, 재시도 중복 방지 |
| 삭제 | delete_recipe(recipeId) | 작성자 또는 사유 있는 관리자, 행사 영향 갱신 |
| 북마크 설정 | set_bookmark(recipeId, saved) | 본인, 공개 대상, toggle이 아닌 목표 상태 |
| 후기 제출/편집 | upsert_cook_review(versionId, expectedRevision, rating, body, assetIds) | 자기 평가 금지, UQ, 사진, 버전 일치 |
| 후기 삭제 | delete_cook_review(reviewId) | 본인, 관련 평가 자격 갱신 |
| 댓글 작성/수정 | write_recipe_comment(input, expectedRevision) | 공개 부모, 답글 깊이, 소유권 |
| 댓글 삭제 | delete_recipe_comment(commentId) | 본인, 안전한 자리표시자 |
| 신고 | submit_report(target, reason, detail) | 대상 존재, 중복/속도 제한 |
| 알림 확인 | mark_notifications_read(ids) | 수신자 본인, 최대 100개 |
| 출품 | submit_award_entry(periodId, recipeId, versionId) | 03 문서 조건 |
| 출품 철회 | withdraw_award_entry(entryId) | 본인, 종료/확정 처리 규칙 |
| 행사 관리 | create_award_period / publish_award_period | 관리자, 일정 순서, 규칙 검증 |
| 집계 준비 | prepare_award_run(periodId, requestId) | 관리자, 종료 시각, 고정 입력 |
| 결과 확정 | finalize_award_run(runId, expectedSourceRevision) | 관리자, 대기기간, 변경 충돌, 멱등성 |
| 신고 조치 | moderate_target(target, action, reason) | 관리자, 상태 전이, 감사 기록 |
| 탈퇴 시작 | request_account_deletion() | 최신 인증, 중복 작업 방지, 상태 잠금 |

RPC 이름은 실제 migration에서 snake_case로 구현한다. 명세의 actor/owner는 로그인 정보에서 구하며 입력으로 받은 userId를 신뢰하지 않는다. 함수가 처리한 여러 테이블 변경은 같은 트랜잭션으로 성공 또는 실패한다.

발행의 requestId는 recipe_versions의 publish_request_id로 보존한다. 같은 요청의 재시도는 같은 버전을 반환하고, 같은 requestId로 다른 초안 버전을 발행하려 하면 CONFLICT다. 다른 쓰기는 고유 제약과 revision 검사로 중복 또는 오래된 덮어쓰기를 막는다.

일관된 오류 형태 예시는 다음과 같다. DB 내부 오류와 SQL 본문은 사용자에게 그대로 노출하지 않는다.

```typescript
type ActionResult<T> =
  | { ok: true; data: T }
  | {
      ok: false;
      code: 'VALIDATION_ERROR' | 'UNAUTHENTICATED' | 'FORBIDDEN'
        | 'NOT_FOUND' | 'CONFLICT' | 'RATE_LIMITED'
        | 'DEADLINE_PASSED' | 'NOT_ELIGIBLE' | 'INTERNAL_ERROR';
      message: string;
      fieldErrors?: Record<string, string[]>;
      requestId?: string;
    };
```

DB가 차단한 경합 오류는 적절한 코드로 변환한다. 네트워크가 끊겨 저장 여부가 불명확할 때 곧바로 새 레코드를 만들지 말고 대상 상태를 확인한다.

## 10. 이미지 파이프라인

private 버킷 `re_recipe_media` 하나로 시작한다. 원본 경로는 `originals/{profileId}/{assetId}`, 처리 결과는 `processed/{profileId}/{assetId}/{processingToken}.webp`다. 사용자 파일명을 저장 경로에 직접 사용하지 않는다. Storage의 일반 anon/authenticated 직접 읽기, 삭제, 덮어쓰기는 허용하지 않는다. 업로드는 서버가 발급한 정확한 original 경로의 서명으로만 진행하고 processed 경로에는 업로드 권한을 주지 않는다. 처리된 파일을 덮어쓰지 않으며 콘텐츠 참조가 있는 파일을 사용자가 임의로 삭제하는 API도 제공하지 않는다. public 버킷은 URL 보유자의 읽기를 막지 못하므로 비공개 초안과 신고 이미지에 사용하지 않는다. S08 참고.

P2에서는 처리 잠금이 2분 뒤 만료되며 최대 5번 처리할 수 있다. 시도마다 다른 processingToken 경로를 사용하고 DB 완료 RPC도 현재 토큰을 검사하므로 늦게 끝난 이전 작업이 재시도 결과를 덮어쓰지 않는다. ready 전환 RPC는 service_role에만 실행 권한을 주고 일반 사용자용 reserve/claim RPC는 매번 세션·작성자·레시피 상태를 확인한다. 자산을 레시피 하나에 귀속해 타인 자산뿐 아니라 다른 레시피의 asset ID도 초안 저장/발행에서 거절한다.

P3에서는 media_assets에 `recipe_version_id`와 `purpose=review`를 추가한다. 레시피 사진은 versionId=NULL, 후기 사진은 동일 레시피의 특정 발행 버전을 복합 FK로 고정한다. `re_reserve_review_upload`는 공개 타인 레시피만 허용하고 계정/버전당 최대 30개 예약을 허용한다. recipe 목적의 기존 100개 제한에는 후기 사진을 포함하지 않는다. 기존 claim/finish 처리 파이프라인을 공유하지만 목적별 소유권·공개 부모·후기 숨김 상태를 다시 검사한다. ready 후기 사진은 본인 또는 공개 published 후기의 참조를 통해서만 공개 URL을 발급한다. 아바타 업로드는 아직 지원하지 않는다.

원본 삭제가 실패하면 ready 상태는 유지하고 다음 완료 요청에서 정리를 재시도한다. 만료된 업로드 서명은 같은 upload_request_id로 갱신할 수 있다. 원본 업로드 서명은 제공자 기본 유효기간을 따르며, 이미 삭제한 원본 경로에 유효한 서명으로 다시 올린 미참조 파일도 P5 정리 대상이다. 만료된 처리 시도의 고아 출력과 장기간 미참조 원본/ready 자산 정리 작업은 P5에서 추가한다. P2는 성공 응답이 불명확한 출력 파일을 즉시 삭제하지 않는다.

처리 순서는 아래와 같다.

1. `/api/uploads/sign`이 정상 회원, 목적, 개수, 속도를 확인하고 pending asset을 만든다. 정확한 단일 경로 업로드 서명만 반환한다.
2. 브라우저가 원본을 Storage에 직접 업로드한다. 완료 전에는 레시피나 후기에 사용 가능한 이미지로 취급하지 않는다.
3. `/api/uploads/complete`가 asset 소유자를 다시 확인하고 pending → processing으로 잠근다. 서버 전용 키로 정해진 원본만 읽는다.
4. 실제 바이트 형식, 크기, 픽셀 수, 디코딩 가능성을 검사한다. 방향을 바로잡고 메타데이터를 제거한 후 WebP를 생성한다.
5. 처리 결과 저장에 성공하면 ready로 전환하고 원본을 제거한다. 실패 시 rejected 또는 재시도 상태와 안전한 오류 코드를 남긴다.
6. 레시피 발행/후기 제출 함수가 ready 이미지와 소유권을 확인하고 참조를 만든다.

허용 입력은 JPEG, PNG, WebP의 정적 이미지이며 파일당 최대 5MiB, 최대 변 길이 6,000px, 총 픽셀 수 20MP다. SVG, HTML, GIF, 동영상, HEIC는 첫 버전에서 명시적으로 거절하고 변환 안내를 한다. 확장자와 Content-Type만 믿지 않는다.

대표 출력은 긴 변 1,600px 이하, 카드용은 640px 변형을 선택적으로 만들 수 있다. 출력은 목표 1MiB 이내로 압축하고 상한을 넘으면 추가 축소 또는 오류 처리한다. EXIF/GPS 보존 옵션을 켜지 않는다. Sharp 출력 동작은 S15를 확인하고 실제 처리 결과에서 메타데이터 제거를 테스트한다.

원본 바이트를 Next.js 요청 body에 통과시키지 않는 구조이므로 업로드와 처리의 타임아웃, 최대 본문 크기를 별도로 관리한다. 이미지 디코더의 입력 픽셀 제한과 처리 시간 제한을 둔다.

### 파일 읽기

`GET /media/[assetId]`는 요청마다 metadata projection을 사용자/익명 RLS로 확인한다. 본인 이미지 또는 현재 공개 콘텐츠에 참조된 ready 이미지일 때만 서버가 짧은 서명 URL을 발급해 이동시킨다. 전체 스토리지 경로나 외부 URL을 요청에서 받지 않는다.

서명 URL TTL 기본안은 60초다. 이미 발급한 URL은 그 시간 동안 유효할 수 있으며, 이미 다운로드한 사본을 회수할 수는 없다. 숨김 즉시 새 URL 발급을 차단한다. 비공개 미디어 경로와 인증 응답은 `Cache-Control: private, no-store`로 둔다. 해당 경로를 Next.js 공유 이미지 최적화 캐시에 통과시키지 않고 unoptimized 또는 동등한 안전한 방식을 사용한다.

파일 전송 최적화는 실측 후 보완하되 비공개 이미지 누출을 성능과 맞바꾸지 않는다. 서명 URL 발급은 식별자 기준 rate limit을 둔다. 참조가 없는 pending/ready 파일은 유예기간 후 정리하고, 공개 버전이나 유효한 후기에 참조된 파일은 단순히 오래됐다는 이유로 삭제하지 않는다.

## 11. 부정 이용과 호출 제한

프로세스 메모리 Map만으로 제한하지 않는다. Server Action을 우회한 직접 RPC에서도 쓰기 제한이 적용되도록 DB 함수 내부의 원자적 rate limit을 사용한다.

| 동작 | 초기 제한 기본안 |
|---|---|
| 초안 새로 만들기 | 계정당 하루 10개 |
| 레시피 발행 | 계정당 하루 5회 |
| 초안 자동 저장 | 정상 UI 2초 debounce, DB 계정당 분당 60회 |
| 요리 후기 생성 | 계정당 하루 10개 |
| 댓글 작성 | 계정당 분당 5개, 하루 100개 |
| 이미지 서명 발급 | 계정당 시간당 60개 |
| 신고 | 계정당 하루 20개 |
| 후기·댓글 편집/삭제 | 각 계정당 분당 30회 |
| 북마크 설정 / 알림 읽음 처리 | 각 계정당 분당 60회 |

시간 bucket은 서버 시각 기준 고정 창으로 시작한다. 창 경계에서 일시적으로 두 배 가까운 호출이 가능하다는 한계를 인지하고 공격 패턴이 나타나면 개선한다. IP만으로 같은 집이나 학교의 정상 사용자를 차단하지 않는다. IP를 저장해야 하는 별도 보안 목적은 보관 정책과 함께 검토하며 기본 로그에 원문 IP를 영구 저장하지 않는다.

신규 가입은 서버 전용 Admin API를 사용하므로 앱의 `re_consume_signup_limit`으로 별도 제한한다. 로그인·비밀번호 복구와 메일 발송 제한은 Supabase 설정을 따른다. 실제 복구 메일 발송은 운영용 SMTP 설정과 전달 확인이 필요하다. S12 참고.

## 12. 알림과 공개 캐시

후기 생성, 답글, 수상 확정에서 알림을 만든다. 자기 자신에게 보내지 않는다. event_key는 예를 들어 `review:{reviewId}:created`, `comment:{id}:reply`, `award:{runId}:{entryId}`다. 재시도로 같은 알림이 중복되지 않아야 한다.

알림에는 민감한 본문을 복제하지 말고 대상 ID와 짧은 유형을 저장한다. 열 때 현재 접근 권한을 다시 검사하고 숨김/삭제된 대상이면 내용을 노출하지 않는다. 이메일과 푸시 알림은 첫 베타 범위 밖이다.

개인화 응답, 초안, 관리자 화면, 토큰 갱신 응답을 공유 캐시나 ISR에 넣지 않는다. 처음에는 공개 콘텐츠도 요청별 읽기로 구현하고 실제 병목을 측정한 뒤 공개 projection만 캐시한다. 공개 데이터 캐시를 도입할 때 숨김/삭제/수정 이벤트의 무효화와 사용자 A의 정보가 사용자 B에게 보이지 않는 테스트를 추가한다. S04 참고.

## 13. 삭제와 탈퇴

일반 게시물 삭제는 즉시 공개 조회에서 제외하고 자격과 집계를 갱신한다. UI의 삭제 버튼이 DB 레코드를 직접 hard delete하지 않게 한다. 관련 외래키가 많다는 이유로 삭제 요청을 무시해서도 안 된다.

회원 탈퇴는 하나의 DB 트랜잭션과 여러 외부 파일/Auth 작업을 완전히 원자화할 수 없으므로 단계형 작업으로 처리한다.

1. 재인증을 확인하고 계정을 deleting으로 바꾼다. 새 쓰기를 차단하고 중복 탈퇴 작업을 합친다.
2. 본인 레시피와 후기의 공개 노출을 중단한다. 미확정 행사 출품과 평가 자격을 갱신한다.
3. 프로필을 비식별 표시로 바꾸고 bio와 avatar 참조를 제거한다. 다른 사람의 답글 구조는 필요한 범위에서 유지한다.
4. 삭제 대상 이미지와 본문을 정리한다. 이미 확정된 결과는 점수와 순위 같은 최소 기록만 남기고 삭제된 레시피의 제목/이미지/프로필을 다시 노출하지 않는다.
5. 이 앱의 re_private.re_accounts 연결과 앱 데이터를 정리한다. 공유 auth.users 계정을 자동 삭제하거나 다른 앱의 세션을 일괄 폐기하지 않는다. Supabase Auth 계정 전체 삭제는 다른 앱 사용 여부와 별도 명시적 요청을 확인한 운영 절차로 분리한다. 작업 로그에서 더 이상 필요하지 않은 Auth 식별자를 지운다.
6. 실패한 단계만 재시도할 수 있게 하고 관리자에게 미완료 작업을 표시한다.

발행 내용의 불변성은 일반 편집에 대한 원칙이다. 삭제와 개인정보 처리에 필요한 관리자 purge는 예외이며 사유와 작업 이력을 남긴다. 수상 스냅샷이 있다는 이유로 탈퇴 사용자의 사진과 본문을 영구 보존하지 않는다. 보관 기간, 법적 예외, 약관 문구는 실제 출시 전에 확정해야 하는 운영 조건이다.

## 14. SEO와 콘텐츠 안전

공개 레시피에 title, description, canonical, Open Graph, 실제 재료와 단계에 근거한 Recipe JSON-LD를 만든다. 비공개 초안과 관리자 화면에는 noindex를 적용하고 sitemap에 넣지 않는다.

JSON-LD의 aggregateRating에는 화면에서 보여 주는 현재 버전의 실제 평균과 후기 수만 넣는다. 어워즈 보정 점수를 별점 평균으로 넣지 않는다. 후기가 없으면 aggregateRating을 생략한다. 없는 영양 정보나 조리 시간을 만들어 넣지 않는다. 구조화 데이터가 검색 결과 노출을 보장하지는 않는다. S14 참고.

사용자 HTML은 허용하지 않는다. 텍스트를 안전하게 렌더링하며 JSON-LD에 포함할 문자열도 `<` 등의 안전한 직렬화를 적용한다. 외부 이미지를 서버가 임의 URL에서 가져오는 기능은 만들지 않아 SSRF 경로를 줄인다. 링크가 필요하면 검증된 http/https 프로토콜만 허용한다.

알레르기, 칼로리, 의학적 효능을 플랫폼이 자동 검증하거나 보장한다는 표시를 하지 않는다. 운영 가이드에는 위험한 조리 안내나 개인정보가 포함된 사진을 신고할 수 있는 경로를 둔다.

## 15. 운영 관측과 비용

서버 오류는 requestId, 기능명, 안전한 오류 코드, 소요 시간으로 기록한다. 재료 본문, 이메일, 인증 정보는 기본 로그에서 제외한다. 느린 DB 쿼리, 업로드 실패율, Auth 메일 실패, 미디어 용량, 집계 실패, 삭제 작업 실패를 우선 관측한다.

첫 베타에는 새로운 분석 SaaS를 필수 의존성으로 만들지 않는다. 가입/레시피/후기/출품 같은 핵심 활동은 실제 DB에서 집계한다. 방문 세션 추적이 필요하면 개인정보와 동의 정책을 정한 뒤 별도로 도입한다.

서버 요금과 무료 플랜 제공량을 코드에 상수로 박지 않는다. 출시 시 실제 선택한 호스팅과 Supabase 요금, 상업적 이용 조건, 저장 공간과 전송량, 백업 정책을 확인한다. 확정되지 않은 비용과 예상 매출은 관리 화면에서 실적처럼 표시하지 않는다.
