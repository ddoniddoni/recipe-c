# 개발 순서, 검증, 출시 가이드

버전: 1.0 | 작성일: 2026-10-12

## 1. 패키지 사용법

압축을 푼 폴더의 AGENTS.md와 docs/를 프로젝트 루트에 배치하고 VS Code에서 연다. 아직 Next.js 앱을 생성하지 않았어도 이 문서부터 Codex에 읽히면 된다. 이미 소스가 있으면 기존 구조와 버전을 먼저 조사하며 새 프로젝트로 덮어쓰지 않는다.

AGENTS.md는 Codex 작업 규칙이고 상세 제품 계약은 docs의 네 문서다. Codex의 AGENTS 탐색과 적용 방식은 공식 가이드 S16을 참고한다. 작업 현황은 PROGRESS.md 하나로 관리한다.

### 최초 실행 프롬프트

```text
AGENTS.md와 docs/01_PRODUCT_AND_UI.md부터 docs/04_DELIVERY_AND_TESTS.md까지,
그리고 docs/PROGRESS.md를 읽고 이 프로젝트를 시작해줘.

이번 작업은 P0만 진행해줘.
먼저 기존 파일, Git 상태, Node.js와 npm 버전을 확인하고 사용자 변경을 보존해줘.
Next.js App Router, TypeScript, npm 기반을 구성하고,
디자인 토큰과 공통 레이아웃, 명시적인 개발용 샘플 화면,
환경변수 검증 구조와 lint/typecheck/test/build 명령을 준비해줘.
문서가 이미 있는 루트에 create-next-app을 무작정 실행하거나 AGENTS.md를 덮어쓰지 마.

Supabase 키가 없다고 로그인이나 저장 성공을 가짜로 구현하지 마.
이 단계에서는 실제 인증, DB 기능, 어워즈 집계, 결제 기능으로 범위를 넓히지 마.
실행한 검증과 실패/미실행 항목을 구분하고 docs/PROGRESS.md를 갱신해줘.
사용자 요청 없는 Git 초기화, commit, push, 배포는 하지 마.
```

### 다음 단계 프롬프트

```text
AGENTS.md와 docs/PROGRESS.md를 읽고 현재 단계의 완료 여부부터 확인해줘.
직전 단계가 검증되어 있다면 다음 한 단계만 구현해줘.
해당 단계의 UI, 서버 처리, DB 제약과 권한, 테스트를 함께 완성해줘.
막힌 외부 설정이 있으면 정확한 항목을 기록하고 검증 가능한 작업을 진행해줘.
실행하지 못한 검사를 통과로 표시하지 말고 PROGRESS.md를 갱신해줘.
```

## 2. 환경 확인과 초기 생성

실행 전 node --version, npm --version, package.json, package-lock.json, Git 상태를 확인한다. 설치 버전과 명세가 충돌하면 차이를 기록하고 호환되는 안정 버전을 선택한다. 지원 중인 Next.js 16 패치와 Node.js 24 LTS를 기본 대상으로 한다. 공식 근거 S01~S03.

문서만 있는 루트도 비어 있는 폴더가 아니다. create-next-app이 기존 파일 때문에 실패할 수 있으므로 별도의 새로운 임시 폴더에 scaffold를 생성한 후 필요한 앱 파일을 비교하여 옮긴다. 기존 AGENTS.md, docs, .env, 사용자 소스는 덮어쓰지 않는다.

새 임시 폴더를 만들 때 사용할 명령 형태는 다음과 같다. 같은 이름의 기존 폴더가 없는지 먼저 확인한다. 선택 프롬프트가 나오면 TypeScript, Tailwind, ESLint, App Router, src 디렉터리, npm을 선택한다.

```bash
npx create-next-app@16 recipe-community-bootstrap --ts --tailwind --eslint --app --src-dir --use-npm --import-alias "@/*" --skip-install --disable-git
```

CLI 옵션은 S18을 확인한다. 생성된 AGENTS의 Next.js 관리 안내 블록은 사용자 AGENTS와 병합한다. 텔레메트리나 에이전트 피드백을 별도로 제출하거나 새로운 외부 연동을 활성화하지 않는다.

필요한 파일을 프로젝트로 옮긴 다음 프로젝트 루트에서 npm install을 실행해 lockfile을 생성한다. P0에서 이미 앱이 있다면 scaffold 단계를 생략하고 기존 설정을 보완한다. 불필요한 React Compiler나 고급 캐시 옵션은 설정에 존재한다는 이유만으로 확대 사용하지 않는다.

단계에 따라 필요한 패키지만 추가한다. 예시 명령은 설치 시 실제 버전을 확인하고 잠그기 위한 시작점이다.

```bash
# P1: 실제 인증과 DB 클라이언트
npm install @supabase/supabase-js @supabase/ssr zod
npm install --save-dev supabase

# P0~P3: 사용하는 시점에 테스트 도구 추가
npm install --save-dev vitest @testing-library/react @testing-library/jest-dom @playwright/test

# P2: 이미지 처리를 직접 의존성으로 선언
npm install sharp
```

패키지 추가 후 peer dependency 경고를 검토하고 잠금 파일을 하나만 유지한다. 정상적인 npm 설치에 --force나 --legacy-peer-deps를 기본 옵션으로 쓰지 않는다. 테스트와 빌드가 깨졌다고 기존 의존성 전체를 무차별 업데이트하지 않는다.

### 공유 Supabase의 이름과 적용 범위

- 사용자 제공 `.env.local`은 값 출력·문서 복사·커밋 없이 로컬에서만 사용한다. 값이 입력되어 있어도 migration 적용과 연결 성공을 뜻하지 않는다.
- 모든 레시피 앱 테이블/뷰/RPC는 `re_` 접두사, 비공개 스키마는 `re_private`, 버킷은 `re_recipe_media`다. 기존 다른 앱의 profiles/recipes/accounts나 private 스키마를 사용하거나 rename하지 않는다.
- P1/P2/P3 migration을 처음 적용하기 전에 이 규칙으로 수정했고, 지정된 개발 프로젝트에 2026-10-13(KST) 적용했다. 이미 예전 migration을 다른 환경에 적용했다면 그대로 재실행하지 말고 그 환경의 실제 앱 객체만 대상으로 별도 전환 migration을 준비한다.
- 공유 프로젝트에서는 전체 DB reset, migration repair, remote schema pull을 자동 실행하지 않는다. 적용 전 기존 Supabase migration 이력과 앱 전용 이름 충돌을 확인하고 기존 앱의 migration까지 이 저장소가 소유한다고 간주하지 않는다.
- 원격 이력에는 타 앱 migration 14개가 함께 있다. 이 저장소만으로 전체 `db push`를 실행하거나 빠진 타 앱 이력을 repair하지 않는다. 현재 앱 migration은 MCP `apply_migration`으로 각각 적용했으며 로컬 파일명을 MCP가 기록한 실제 버전과 맞췄다. 후속 적용도 기존 이력을 보존하고 해당 앱의 새 migration만 대상으로 한다.
- public 스키마의 default privileges 변경, auth.users 트리거, 전체 Auth 사용자 backfill은 이 앱 초기화에서 제외한다. config.toml과 이메일 템플릿은 로컬 개발 설정이며 공유 원격 Auth 설정에 덮어씌우지 않는다. 로그인·가입 확인에서 본인의 `re_ensure_account`만 호출한다.

### P3 후기·커뮤니티 연결 시 추가할 사항

- P1/P2 다음에 `20261012170309_re_community.sql`을 적용한다. 지정된 개발 프로젝트에는 적용됐으며, 다른 환경에서는 기존 후기·댓글·북마크·알림·신고 객체와 충돌 여부를 먼저 확인한다.
- P3는 기존 media_assets 목적 제약과 claim/finish 함수, recipe_cards/get_recipe_detail 읽기 계약을 확장한다. search_recipes의 기존 6인자 함수를 7인자(끝에 p_sort 기본값)로 교체하므로 스키마 반영과 앱 코드 배포를 함께 계획한다. 아바타 목적은 허용하지 않는다.
- 새 환경변수/패키지는 없다. 후기 사진도 P2의 private 버킷과 서버 전용 파일 처리 키를 사용한다. 일반 후기·댓글·신고 요청은 사용자 세션으로만 처리한다.
- 검증 재개 시 SOCIAL-01~07과 REC-08, MEDIA-03/04, SEC-04/06/08을 우선 실행한다. 추가로 같은 요청 재시도, 편집 중 다른 액션의 새로고침, 동일 버전 후기 동시 생성/삭제 후 복원, 목적/버전이 다른 사진 주입, 삭제/숨김 원댓글, 신고 중복 접수, 타인 알림 읽음, 비공개 저장 목록과 공개 저장 수의 분리를 확인한다.
- DB 타입은 수작업 계약이다. 연결 후 생성본으로 교체하고 anon/authenticated 역할과 여러 사용자 세션으로 권한을 확인해야 한다. 이번에는 테스트를 작성하거나 실행하지 않았다.

## 3. npm 스크립트 계약

다음 명령 이름을 준비한다. 각 스크립트의 실제 구현과 필요한 환경은 해당 단계에서 추가한다. 없는 명령을 문서만 보고 실행 완료로 기록하지 않는다.

| 명령 | 실행 내용 기본안 | 도입 |
|---|---|---|
| npm run dev | next dev | P0 |
| npm run build | next build | P0 |
| npm run start | next start | P0 |
| npm run lint | eslint . | P0 |
| npm run typecheck | next typegen && tsc --noEmit | P0 |
| npm run test | vitest run | P0 |
| npm run test:watch | vitest | P0 |
| npm run test:e2e | playwright test | P1 이후 |
| npm run db:start | supabase start | P1 |
| npm run db:stop | supabase stop | P1 |
| npm run db:reset | supabase db reset --local | P1, 로컬 데이터 삭제 주의 |
| npm run db:types | scripts/generate-db-types.mjs 실행 | P1 |
| npm run test:db | supabase test db | P1 |
| npm run validate | lint → typecheck → test → build | P0 |

Next.js 16에서 lint는 ESLint CLI로 별도 실행한다. next typegen 동작과 설정 로딩은 S20을 참고한다. typecheck를 생략하거나 TypeScript의 ignoreBuildErrors 옵션을 켜서 빌드를 통과시키지 않는다.

DB 타입 생성 스크립트는 `supabase gen types typescript --local` 결과를 받아 성공한 경우에만 `src/lib/supabase/database.ts`를 교체한다. 기존 개발 프로젝트는 명시적으로 `--linked`를 선택할 수 있다. 생성 실패로 기존 파일이 빈 파일이 되는 리다이렉션 실수를 피한다.

최소한 하나의 의미 있는 테스트를 P0부터 두고 `passWithNoTests`를 완료 증거로 사용하지 않는다. 실제 DB와 브라우저 환경이 필요한 테스트는 단위 테스트 결과와 구분한다.

## 4. Supabase 개발 환경

### 현재 작업의 연결·검증 방침 (2026-10-13)

사용자는 **기존 개발용 Supabase 프로젝트** `mwepkrdlvdreoojrqegr`에 원격 적용을 요청했다. MCP의 프로젝트 URL과 `.env.local` 대상이 일치함을 확인했고, P1/P2/P3 migration을 순서대로 적용했다. 공유 Auth 설정은 변경하지 않았다. DB 적용 확인은 실제 가입·로그인·파일 업로드의 동작 확인을 의미하지 않는다.

또한 사용자 지시로 **테스트, lint, typecheck, build, audit, React Doctor, DB advisor, 브라우저 검증은 별도 요청까지 실행하지 않는다.** 아래 검증 목록은 향후 재개할 때의 기준이며 이번 구현의 통과 기록이 아니다. 새 P1/P2/P3 테스트 작성도 보류한다. 이번에는 적용 전 충돌 조회와 적용 후 DB 카탈로그·migration 이력 확인만 수행했다.

현재 가입은 이메일·이름·비밀번호만 입력하며 확인 메일과 추가 프로필 입력을 생략한다. `20261012171637_re_simple_signup.sql`까지 원격 적용했다. `SUPABASE_SECRET_KEY`는 신규 Auth 사용자 생성에도 필요하다. 전역 Auth의 Confirm email은 다른 앱을 위해 유지하고 새 사용자에만 Admin API의 `email_confirm: true`를 사용한다. 기존 계정 확인·비밀번호를 덮어쓰지 않는다. 요청 제한은 앱 전체 30회/시간, 이메일별 3회/시간이며 실제 가입 호출 테스트는 하지 않았다.

### 기존 개발 프로젝트 연결

1. 대상이 운영 DB가 아닌 개발 프로젝트임을 확인하고 기존 테이블/함수와 migration 이력을 먼저 확인한다. 이 P1 migration은 `public.re_profiles`, `public.re_categories`, `re_private.re_accounts` 등을 새로 만들므로 동명 객체가 이미 있으면 적용 전에 조정한다. 공유 Auth 사용자 일괄 매핑은 하지 않는다. 이 앱의 로그인/가입 확인에서 `re_ensure_account`를 호출한 사용자만 일반 회원으로 등록하며 사용자 metadata의 권한은 복사하지 않는다.
2. `.env.local`에 `NEXT_PUBLIC_SITE_URL=http://localhost:3000`, 실제 `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`, `DEMO_MODE=false`를 설정한다. 서버 키는 신규 가입과 이미지 처리용이며 일반 회원 콘텐츠 요청은 세션 클라이언트를 쓴다. 실제 키를 문서나 채팅, Git에 넣지 않는다.
3. 앱 전용 환경에서는 Dashboard Auth의 Site URL을 앱과 같은 origin으로 설정한다. 공유 환경에서는 기존 Site URL을 덮어쓰지 않고 앱의 정확한 callback URL 추가를 별도로 검토한다. `localhost`와 `127.0.0.1`을 섞지 않으며 광범위한 wildcard를 사용하지 않는다.
4. 앱 전용 환경의 기준은 이메일/비밀번호 가입, **이메일 확인 필수**, 비밀번호 최소 12자, secure password change, anonymous sign-in 비활성화다. 공유 프로젝트의 전역 설정은 타 앱에 영향을 주므로 자동 변경하지 않는다. 외부 개발 프로젝트에는 `supabase/config.toml`이 자동 적용되지 않는다.
5. 앱 전용 환경의 메일 템플릿은 `supabase/templates/confirmation.html`, `recovery.html`을 기준으로 한다. 공유 프로젝트의 템플릿과 SMTP는 이번에 변경하지 않았으며, 앱별 callback 및 확인/복구 메일 흐름은 별도 연결 확인이 필요하다.
6. CLI 연결과 migration 적용은 대상/권한을 확인한 뒤 별도로 진행한다. `npm run supabase -- ...`는 프로젝트에 고정한 CLI를 사용하며 telemetry를 끈다. DB 적용 완료 전 UI의 설정 존재 표시를 연결 성공으로 보지 않는다.
7. DB 적용 후 타입 생성은 `npm run db:types -- --linked`를 사용한다. 현재 `src/lib/supabase/database.ts`는 **수작업으로 작성한 P1~P3 타입 계약**이다. 공유 프로젝트의 생성본에는 타 앱 객체도 포함되므로 앱 계약 범위를 검토한다. 생성 스크립트는 정상 종료와 Database 타입 출력을 확인한 뒤 이 파일을 원자적으로 교체하며 실패 시 기존 파일을 보존한다. 사용자 요청 전에는 타입 생성이나 검증도 실행하지 않는다.

가입 → 자동 로그인/프로필 생성 → `/me` 순서로 연결한다. 비밀번호 복구는 `/forgot-password` → 메일 → `/reset-password` → 재로그인이다. `getClaims`로 토큰을 검증하고, 계정 정보/관리자 경로에는 최신 Auth 사용자와 DB 계정 정보를 사용한다. Proxy는 쿠키 갱신과 `private, no-store` 응답 헤더를 함께 전달한다. 요청별 서버 클라이언트를 사용하며 사용자 세션을 전역 캐시에 저장하지 않는다.

### P2 레시피·사진 연결 시 추가할 설정

- P1 `20261012170253_re_auth_foundation.sql` 다음에 `20261012170300_re_recipes_media.sql`을 적용한다. 지정된 개발 프로젝트에는 적용됐다. 다른 환경에서는 기존 `re_recipes`, `re_media_assets`, 관련 함수와 `re_recipe_media` 버킷이 없는지 먼저 확인한다. 이 migration은 기존 객체를 덮어쓰지 않는다.
- `.env.local`의 `SUPABASE_SECRET_KEY`는 사진 서명·처리·접근과 신규 가입 계정 생성에 서버에서 사용한다. 일반 레시피/초안 쓰기는 사용자 세션의 RPC를 사용한다. 키가 없으면 신규 가입과 사진 업로드를 사용할 수 없다. 키를 설정했다고 Storage 연결이 확인된 것은 아니다.
- `re_recipe_media`는 private, 파일당 5MiB, JPEG/PNG/WebP만 허용한다. migration은 이 버킷에 일반 anon/authenticated 직접 접근을 막는 restrictive Storage 정책을 추가한다. 버킷을 public으로 전환하지 않는다. 서명된 원본 업로드와 서버의 처리 경로 외에는 쓰기 권한을 추가하지 않는다.
- 업로드 요청 Origin은 `NEXT_PUBLIC_SITE_URL`의 origin과 정확히 일치해야 한다. 브라우저에서 접속한 호스트를 Site URL과 맞춘다. 파일 바이트는 Storage에 직접 전송하며, Next.js sign/complete에는 2KiB 이하 JSON만 받는다.
- 이미지 처리는 Node 런타임과 Sharp 0.35.5가 필요하다. 호스팅의 요청 시간·메모리 한도를 확인하고 Sharp 출력·픽셀 제한·처리 시간 제한을 실제로 검증한다. EXIF/GPS 제거, APNG/animated WebP·위장 파일 차단, 업로드 중단·서명 만료·처리 경합은 아직 실행 검증하지 않았다.
- UI는 수동 초안 저장이다. 발행 전에 저장하고 미리보기를 연다. 저장 충돌은 입력을 보존한 채 최신 초안 다시 읽기를 안내하며 자동 덮어쓰기를 하지 않는다. 발행 결과가 불명확하면 같은 request ID로 확인하고, 공개 페이지의 과거 버전 링크는 해당 버전을 유지한다.
- DB 타입은 여전히 수작업 계약이다. 연결 후 실제 타입 생성과 권한/경합/E2E 검증을 사용자 재개 지시에 맞춰 수행한다. 장기 미참조 파일 및 고아 처리 결과의 자동 정리는 P5 잔여 작업이다.

### 최초 관리자 지정

관리자 생성은 회원가입 입력이나 Auth user metadata로 하지 않는다. 프로젝트 소유자가 개발 프로젝트 SQL Editor에서 대상 Auth user ID, 이메일 확인, 정상 계정 상태를 직접 확인한 후 아래 트랜잭션을 사용한다. `<verified-auth-user-id>`를 정확한 UUID로 교체하고 **변경된 행이 정확히 1개인지 확인한 뒤** 커밋한다. 이 SQL을 앱 API나 일반 회원 RPC로 공개하지 않는다.

```sql
begin;
with promoted as (
  update re_private.re_accounts a set role = 'admin'
  from auth.users u
  where a.auth_user_id = '<verified-auth-user-id>'::uuid
    and u.id = a.auth_user_id and u.email_confirmed_at is not null
    and not coalesce(u.is_anonymous, false) and a.status = 'active'
    and a.role = 'member'
  returning a.profile_id
)
insert into re_private.re_audit_log(actor_id, action, entity_type, entity_id, reason)
select null, 'account.admin_bootstrap', 'profile', profile_id,
  'Project owner approved initial administrator' from promoted
returning entity_id;
-- 확인 후 COMMIT; 대상이 다르거나 행 수가 예상과 다르면 ROLLBACK;
```

`/admin`은 최신 사용자 확인과 `check_admin_access()`가 모두 허용해야 접근할 수 있다. 일반 사용자의 `role=admin` 메타데이터로는 접근할 수 없다. 실제 운영 도구와 권한/회원탈퇴 관리 UI는 P5에서 구현한다.

### 선택 가능한 로컬 환경

로컬 개발의 권장 경로는 Supabase CLI와 Docker 호환 컨테이너 런타임이다. CLI는 npm dev dependency로 설치한다. S09 참고.

```bash
npx supabase init
npm run db:start
```

이미 config.toml이 있으면 init을 반복하지 않는다. 로컬 서비스가 시작되면 출력된 URL과 개발용 키를 .env.local에 입력한다. 실제 비밀값은 채팅, 문서, Git diff에 복사하지 않는다.

컨테이너를 사용할 수 없으면 사용자가 지정한 별도 개발용 Supabase 프로젝트를 활용할 수 있다. 이때 운영 프로젝트를 대신 사용하지 않는다. 로컬 DB 테스트가 미실행이라는 사실을 기록하고 원격 프로젝트 검증과 혼동하지 않는다.

migration은 생성 순서대로 적용하며 스키마와 RLS, grants, DB 함수의 변경을 함께 버전 관리한다. Dashboard에서 임시로 수정한 사항은 migration에 반영하기 전까지 구현 완료로 보지 않는다.

### 테스트 데이터

격리된 로컬 테스트 DB에만 계정을 생성한다. Auth 테스트 계정은 테스트 전용 Admin API 등 적절한 방법으로 만들며 서비스 사용자의 인증 데이터를 복사하지 않는다.

A는 레시피 작성자, B와 C는 일반 평가자, U는 이메일 미확인 회원, S는 이용 제한 회원, M은 관리자다. 어워즈 최소 후기 테스트에는 서로 다른 일반 사용자 5명 이상을 추가한다. 실제 운영에 쓰일 수 있는 이메일 주소나 비밀번호를 fixture에 넣지 않는다.

레시피 샘플, 리뷰 사진, 초안, 숨김 게시물, 마감 직전 행사, 수상자 없는 행사를 준비한다. 샘플 이미지는 권리가 확인된 파일이나 중립적 placeholder를 사용하고 실제 요리 인증처럼 운영에 공개하지 않는다.

테스트/seed 스크립트는 허용된 로컬 호스트와 명시적인 테스트 실행 모드를 확인한다. 원격 URL에서는 기본적으로 종료한다. 실제 운영 DB에 개발 회원과 가짜 후기를 자동 삽입하는 기능을 만들지 않는다.

## 5. 구현 단계

### P0. 저장소와 UI 기반

기존 파일 조사, Node/npm 확인, Next.js 설정, TypeScript strict, Tailwind 토큰, 기본 레이아웃, 홈/탐색/상세의 샘플 UI를 구현한다. 샘플 콘텐츠는 개발 전용 fixture이며 서버 저장 성공을 흉내 내지 않는다.

공통 EmptyState, ErrorState, 로딩 상태, 폼 접근성 기본 컴포넌트를 준비한다. .env.example, 공개/서버 환경 검증의 분리, npm 스크립트, 첫 단위 테스트를 만든다. 실제 인증, DB 테이블 생성, 수익 기능은 이 단계에서 구현하지 않는다.

**완료 기준:** 개발 서버가 실행되고 360px/768px/1,440px에서 기본 레이아웃이 유지된다. lint, typecheck, test, build 결과를 기록한다. 설정이 없는 실제 데이터 화면은 안내를 보여 주며 성공 응답을 날조하지 않는다.

### P1. 인증과 권한 기반

Supabase 로컬 설정, 첫 migration, public.re_profiles/re_private.re_accounts/public.re_categories, 계정 매핑 보조 함수, audit와 rate limit 기반을 만든다. 이메일 가입, 확인, 로그인, 로그아웃, 비밀번호 재설정, 서버 세션 갱신, 프로필 최초 설정을 연결한다.

공개/회원/관리자 경계를 적용하고 기본 RLS와 함수 권한을 테스트한다. 관리자 최초 지정은 문서화한 제한된 운영 절차로 수행한다. 사용자가 role을 고르는 회원가입 필드는 만들지 않는다.

**완료 기준:** 실제 Auth 흐름이 동작하고 미확인 회원과 관리자 역할 위조가 차단된다. 두 사용자의 세션과 프로필이 섞이지 않는다. SQL migration을 빈 로컬 DB에 재적용할 수 있다.

### P2. 레시피와 미디어

초안, 불변 발행 버전, 사진 업로드와 검증, 검색, 목록, 상세, 버전 선택, 인분 변경, 기본 조리 보기, 편집 충돌 처리를 구현한다. DB 함수에서 발행과 이미지 소유권을 검증한다.

**완료 기준:** A가 등록한 레시피를 B와 비회원이 볼 수 있고 A의 초안은 볼 수 없다. 이미지 업로드 중 실패와 재시도가 동작한다. 다른 사람의 이미지 ID와 다른 레시피 버전 ID를 주입할 수 없다. 같은 발행 요청을 재시도해도 버전이 중복되지 않는다.

### P3. 후기와 대화

실제 북마크, 요리 사진 후기, 1~5점 별점, 현재 버전 통계, 댓글과 한 단계 답글, 앱 내 알림, 사용자 신고 접수를 구현한다. 이후 P4가 붙을 수 있게 후기 변경을 하나의 DB 처리 경로로 유지한다.

**완료 기준:** 자기 평가와 동일 버전 중복 후기가 DB에서 차단된다. 후기 생성/수정/삭제 뒤 통계가 맞는다. 댓글과 북마크는 어워즈 점수로 취급되지 않는다. 숨김 부모의 후기와 이미지가 공개되지 않는다.

### P4. 월간 어워즈

행사 생성과 공개, 출품, 시간 기반 단계, 요리 후기에서 평가 생성, 종료 시각 보호, 보정 점수, 공동수상, 집계 준비와 확정, 명예의전당과 프로필 배지를 구현한다. P3의 후기 함수에 평가 스냅샷과 잠금을 연결한다.

**완료 기준:** 03 문서의 전체 규칙을 DB와 UI가 일관되게 적용한다. 두 관리자가 동시에 확정해도 결과가 하나이며, 미리보기 이후 입력 변경을 감지한다. 수상자 없는 달도 정상적으로 마감된다. 결과 확정 후 일반 후기 변경이 과거 수상을 바꾸지 않는다.

### P5. 공개 베타 운영 준비

관리자 신고 처리, 숨김/복구/이용 제한, 감사 이력, 삭제와 회원 탈퇴 단계형 작업, 파일 정리와 재시도, 운영 지표, SEO, 정책 화면, SMTP, 접근성, 성능과 보안 테스트를 완성한다.

**완료 기준:** 핵심 E2E와 RLS 테스트가 통과하고, 운영자가 실제로 신고와 탈퇴 실패를 처리할 수 있다. 정책/운영자 정보, 실제 배포 설정, 메일 발송 등 외부 항목은 완료/미완료로 따로 표시한다. 사용자 승인 전 공개 배포하지 않는다.

### P6-A. 제휴 상품

플래그를 기본 false로 둔 채 관리자 링크 관리, 공개 고지, 원본 링크 이동, 최소 클릭 수집을 구현한다. 실제 제휴 승인과 문구 확인 후에만 운영 기능을 활성화한다.

**완료 기준:** 잘못된 도메인과 프로토콜을 차단하고 클릭 수집 실패가 구매 이동을 막지 않는다. 클릭 수와 실매출이 구분된다. 플래그가 꺼지면 UI와 수집 모두 비활성이다.

### P6-B. 브랜드 후원 챌린지

일반 어워즈와 다른 kind와 경로로 행사 운영을 확장한다. 후원 표시, 콘텐츠 사용 동의, 실제 계약에 맞는 규칙과 지표를 구현한다. 일반 명예의전당과 점수 데이터를 섞지 않는다.

**완료 기준:** 일반 행사와 후원 행사 참여/평가의 중복 제한이 작동한다. 후원 금액으로 일반 점수가 바뀌지 않는다. 계약/보상/권리 확인이 없는 운영 캠페인은 활성화하지 않는다.

## 6. 요구사항 추적

| 제품 요구 | 구현 단계 | 검증 묶음 |
|---|---|---|
| RQ-01~02 인증과 프로필 | P1 | AUTH, SEC |
| RQ-03~06 레시피와 탐색 | P2 | REC, MEDIA, UX |
| RQ-07~09 저장과 후기/댓글 | P3 | SOCIAL, SEC |
| RQ-10~11 어워즈와 명예의전당 | P4 | AWARD |
| RQ-12 알림 | P3~P4 | SOCIAL, AWARD |
| RQ-13~16 운영, 삭제, SEO, 지표 | P5 | OPS, SEC, UX |
| RQ-17~18 제휴 | P6-A | REV |
| RQ-19~20 후원 | P6-B | REV, AWARD |

## 7. 테스트 기준

단위 테스트는 계산, 입력 검증, 기간 변환, 인분 변경, 오류 매핑을 검증한다. DB 테스트는 실제 anon/authenticated 역할과 사용자 JWT claim을 설정해 RLS, grants, 함수 권한, 제약을 확인한다. E2E는 격리된 Auth/DB/Storage에 연결해 실제 브라우저 동작을 확인한다.

DB 권한 테스트를 전부 service-role 클라이언트로 실행하면 일반 사용자의 보안이 검증되지 않는다. DB testing과 pgTAP 실행은 S10을 참고한다. 경쟁 상태는 서로 다른 연결과 동시 요청으로 검사하며 순차 호출 테스트만으로 대신하지 않는다.

### 필수 테스트 목록

| ID | 시나리오 | 기대 결과 |
|---|---|---|
| AUTH-01 | 가입, 이메일 확인, 로그인, 로그아웃 | 정상 흐름과 화면 상태 일치 |
| AUTH-02 | 만료/재사용된 확인 또는 복구 링크 | 안전한 실패, 새 요청 안내 |
| AUTH-03 | 세션 만료 후 새로고침 | 갱신 또는 재로그인, 타인 세션 혼합 없음 |
| AUTH-04 | 외부 redirect와 인코딩 우회 | 외부 사이트로 이동하지 않음 |
| SEC-01 | A의 draft를 비회원/B가 직접 조회 | 거부 또는 존재하지 않는 안전한 응답 |
| SEC-02 | 회원 metadata에 admin 주입 | 관리자 접근 실패 |
| SEC-03 | 작성자/점수/created_at을 직접 바꾸는 API 요청 | GRANT/RLS/함수 검증으로 차단 |
| SEC-04 | 미확인/정지 회원이 RPC 직접 호출 | 콘텐츠 쓰기와 평가 차단 |
| SEC-05 | 일반 회원이 관리자 DB 함수 호출 | FORBIDDEN |
| SEC-06 | hidden 레시피의 과거 버전, 후기, 미디어, JSON-LD 조회 | 공개 정보 누출 없음 |
| SEC-07 | 브라우저 bundle과 로그 검사 | secret key/토큰/이메일 링크 미노출 |
| SEC-08 | A 로그인 응답 이후 B/비회원 요청 | 캐시로 개인 데이터가 전달되지 않음 |
| REC-01 | 초안 저장, 브라우저 재진입 | 마지막 저장 내용 복원 |
| REC-02 | 두 탭에서 같은 draft_version 저장 | 하나는 충돌, 조용한 덮어쓰기 없음 |
| REC-03 | 필수 항목 누락/배열 과다/악성 HTML | 오류 또는 안전한 텍스트 출력 |
| REC-04 | 발행 requestId 재전송 | 동일 버전, 중복 생성 없음 |
| REC-05 | v2 발행 후 v1 출품과 후기 조회 | v1 유지, v2로 혼합 안 됨 |
| REC-06 | 인분 변경과 `약간` 수량 | 숫자만 비례 변경, 원본 불변 |
| REC-07 | 한글 제목/재료 검색, 필터 URL 복원 | 문서화한 검색 범위에서 일관된 결과 |
| REC-08 | 후기/북마크 다중 JOIN 집계 | 행 곱셈 없이 정확한 개수 |
| MEDIA-01 | 정상 JPEG/PNG/WebP 업로드 | ready 처리와 공개 참조 정상 |
| MEDIA-02 | SVG/HTML 위장, 과대 파일, 과대 픽셀 | 업로드/완료 단계에서 차단 |
| MEDIA-03 | B가 A의 asset ID로 발행/후기 제출 | 거부 |
| MEDIA-04 | 타인 초안 이미지 URL 추측 | 접근 차단 |
| MEDIA-05 | 이미지 방향과 EXIF/GPS | 방향 정상, 민감 메타데이터 제거 |
| MEDIA-06 | 업로드 중단/완료 중복/처리 실패 | 재시도 안전, 임의 ready 불가 |
| SOCIAL-01 | 자기 레시피 평가 | DB에서 차단 |
| SOCIAL-02 | 같은 버전 중복 후기 동시 제출 | 한 행만 존재 |
| SOCIAL-03 | 후기 편집/삭제/숨김 | 현재 버전 평균과 count 일치 |
| SOCIAL-04 | 사진 0장 후기, 다른 목적 asset 재사용 | 차단 |
| SOCIAL-05 | 다른 레시피 댓글에 답글, 깊이 2 이상 | 차단 |
| SOCIAL-06 | 북마크 설정 요청 재시도 | 목표 상태 유지, 개수 중복 없음 |
| SOCIAL-07 | 알림 재시도와 타인 알림 읽음 처리 | 중복 생성/타인 수정 없음 |
| AWARD-01 | 접수 시작/마감, 평가 시작/종료 정확한 경계 | `[start,end)` 적용 |
| AWARD-02 | 2월, 윤년, 12월→1월, KST→UTC | 정확한 달 경계 |
| AWARD-03 | 이전 달 레시피, 타인 레시피, 중복 출품 | 거부 |
| AWARD-04 | 후기 0/1/4/5개 후보 | 5개부터 자격, 0개는 평균 NULL |
| AWARD-05 | score 계산 예시 네 가지 | 03 문서 수치와 일치 |
| AWARD-06 | 점수/후기수/5점수가 같은 후보 | 공동순위, `1,1,3`과 수상 표시 |
| AWARD-07 | 후기 5.0 1개와 충분한 4점대 후보 | 최소 후기 조건 적용 |
| AWARD-08 | 가입 24시간 미만/직전/직후 | 정확한 자격과 사전 안내 |
| AWARD-09 | 마감 후 일반 후기 점수 변경 | 월간 snapshot 불변 |
| AWARD-10 | 미리보기 뒤 후기 삭제/숨김/탈퇴 | source_revision 변경, 확정 충돌 |
| AWARD-11 | 두 관리자의 동시 확정/동일 요청 재시도 | final_run 하나, 알림 중복 없음 |
| AWARD-12 | 마감 전 시작, 마감 후 잠금 획득 | 늦은 평가 쓰기 차단 |
| AWARD-13 | 수상자 없는 달과 후보 1개인 달 | 정상 확정, 가짜 수상자 없음 |
| AWARD-14 | 확정 후 사진 삭제/레시피 수정/탈퇴 | 결과 수치 보존, 삭제 콘텐츠 비노출 |
| OPS-01 | 낮은 평점 신고와 관리자 조치 | 자동 삭제 없이 사유 기반 처리 |
| OPS-02 | 탈퇴 단계 중 파일/Auth 오류 | 노출 중단 유지, 실패 단계 재시도 |
| OPS-03 | 미참조 파일 청소 | 활성 참조 파일 보존 |
| OPS-04 | 외부 SMTP 설정 후 인증 메일 | 실제 수신과 복구 확인 |
| UX-01 | 360/768/1440px, 키보드, 모달 | 핵심 동작 사용 가능 |
| UX-02 | 빈 상태/네트워크 실패/중복 제출 | 내용 보존과 명확한 복구 |
| UX-03 | sitemap/canonical/Recipe JSON-LD | 공개 실제 값만 사용 |
| REV-01 | 제휴 플래그 off | 광고 UI와 수집 모두 없음 |
| REV-02 | 악성 URL/비승인 도메인 | 등록 거부 |
| REV-03 | 클릭 수집 실패/중복 beacon | 외부 이동 유지, event 중복 제한 |
| REV-04 | sponsored 행사 확정 | 일반 명예의전당/점수에 미반영 |

## 8. 성능과 품질 목표

초기 목표는 압축된 레시피 사진, 명시적인 이미지 크기, 목록 페이지당 제한된 쿼리, 불필요한 클라이언트 번들 최소화다. 모바일 공개 페이지의 LCP 2.5초 이하, CLS 0.1 이하를 목표로 측정할 수 있으나 실제 결과를 확인하지 않고 달성했다고 쓰지 않는다.

DB 검색과 상세 조회는 1,000개 레시피 수준의 로컬 fixture에서 먼저 계획과 실행 시간을 확인한다. 환경, 데이터 크기, 캐시 조건을 함께 기록한다. 검색어 하나의 가장 빠른 실행 결과만 전체 서비스 성능이라고 보고하지 않는다.

사진 처리와 어워즈 집계에는 시간 제한과 실패 기록을 둔다. 서버리스 실행 시간과 메모리 조건이 맞지 않으면 그 작업만 별도 실행 환경으로 분리하는 결정을 기록한다. 처음부터 마이크로서비스를 만들지는 않는다.

## 9. 출시 전 차단 조건

아래 항목 중 중요한 보안/정책/운영 항목이 미완료면 `개발용 데모`나 `제한 테스트` 상태로 유지하고 공개 서비스 완료로 표시하지 않는다.

| 분야 | 확인할 사항 |
|---|---|
| 보안 | RLS와 함수 권한, 관리자 키 미노출, 업로드 권한, 타인 데이터 접근 테스트 |
| 인증 | 실제 메일 수신, 리다이렉트 allowlist, 비밀번호 복구, 계정 상태 적용 |
| 운영 | 관리자 계정, 신고 담당자, 숨김/복구 절차, 탈퇴 실패 재시도 |
| 정책 | 운영 주체, 약관, 개인정보 처리 항목/목적/보관/삭제, 외부 처리업체, 콘텐츠 권리, 신고 연락처 |
| 파일 | 원본 정리, 업로드 한도, 비공개 이미지 접근, 삭제 이후 노출 제한 |
| 데이터 | 개발 seed 제거, 마이그레이션 이력, 실제 백업/복구 절차 확인 |
| 배포 | 운영 환경변수, 도메인, HTTPS, 실제 호스팅의 상업적 이용 조건과 비용 |
| 어워즈 | 공개 일정/규칙, 수상자 없는 상황, 관리자 확정과 이의 접수 경로 |
| 품질 | 핵심 E2E, 모바일, 접근성, 404/에러 상태, SEO 실제 값 |
| 수익화 | P6를 켤 때만 제휴 승인/고지와 후원 계약, 콘텐츠 사용 동의 확인 |

배포 플랫폼은 아직 사용자 확정 사항이 아니다. Vercel 등 Next.js 지원 환경을 후보로 검토할 수 있지만 무료 플랜의 상업적 이용 허용이나 무료 한도가 충분하다고 가정하지 않는다. 가격과 제공량은 실제 도입 시 다시 확인한다.

이 명세는 이용약관이나 법률 의견서가 아니다. 개인정보와 광고 고지 문구를 자동 생성했다는 이유만으로 법적 검토가 완료됐다고 처리하지 않는다.

## 10. 완료 정의와 작업 보고

단계 완료는 요구 기능의 happy path뿐 아니라 권한, 오류, 로딩, 빈 상태, 테스트, 문서 업데이트가 함께 끝난 상태다. 화면만 있거나 DB만 있고 접근 권한 검사가 없으면 완료가 아니다.

각 작업 끝에 PROGRESS.md를 갱신하고 다음 형식으로 보고한다.

```text
단계: P2
구현: 초안 저장, 발행 버전, 이미지 처리
변경 파일: 기능별 핵심 파일과 migration
검증: lint PASS / typecheck PASS / test PASS / build PASS
추가 검증: test:db FAIL 또는 test:e2e NOT RUN — 실제 사유
미완료: 운영용 SMTP 등 외부 설정과 남은 테스트
위험: 미검증 범위와 영향을 받는 기능
다음 작업: 현재 단계의 잔여 작업 또는 다음 한 단계
```

위 내용은 보고 형식의 예시이지 이 프로젝트의 실행 결과가 아니다. 현재 패키지는 문서만 작성된 상태다. git diff를 확인하고 사용자 변경을 훼손하지 않았는지도 확인한다. 자동 commit/push/배포는 하지 않는다.

## 11. 변경 관리

수정할 수 있는 기본안은 서비스명, 디자인 토큰, 카테고리, 다음 행사 규칙, 기능 우선순위다. 이미 공개한 행사 규칙, 확정 결과, 보안 검증을 편의상 변경하지 않는다.

아키텍처 변경이 필요하면 이유, 대안, 비용, 기존 데이터와 테스트 영향, 결론을 PROGRESS의 결정 이력에 간단히 적고 해당 명세만 수정한다. 작업할 때마다 별도의 계획 문서와 회고 문서를 생성하지 않는다.

<a id="references"></a>

## 12. 공식 참고자료

확인 기준일은 2026-10-12다. 문서에 기술한 서비스 규칙, 수치, 단계는 이 프로젝트의 설계 결정이며 아래 출처가 이 사업의 성공이나 수익을 보장한다는 뜻은 아니다. 구현할 때는 설치 버전에 맞는 페이지와 변경 사항을 다시 확인한다.

| ID | 자료 | 적용 대상 |
|---|---|---|
| S01 | [Next.js Installation](https://nextjs.org/docs/app/getting-started/installation) | App Router 초기 설정, 기본 도구 |
| S02 | [Next.js Version 16](https://nextjs.org/docs/app/guides/upgrading/version-16) | 버전 호환과 변경 사항 |
| S03 | [Node.js 공식 다운로드](https://nodejs.org/en/download/current) | Node 24 LTS 확인 |
| S04 | [Supabase SSR client](https://supabase.com/docs/guides/auth/server-side/creating-a-client?queryGroups=framework&framework=nextjs) | 쿠키, 클라이언트 분리, proxy, claims, 캐시 주의 |
| S05 | [Supabase API keys](https://supabase.com/docs/guides/getting-started/api-keys) | publishable/secret 키 구분 |
| S06 | [Supabase Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security) | RLS, GRANT, view와 역할 |
| S07 | [Supabase Database functions](https://supabase.com/docs/guides/database/functions) | RPC와 함수 실행 권한 |
| S08 | [Supabase Storage buckets](https://supabase.com/docs/guides/storage/buckets/fundamentals) | public/private와 서명 URL |
| S09 | [Supabase CLI](https://supabase.com/docs/guides/local-development/cli/getting-started) | npm 설치와 로컬 서비스 |
| S10 | [Supabase Database testing](https://supabase.com/docs/guides/database/testing) | pgTAP와 DB 테스트 |
| S11 | [PostgreSQL pg_trgm](https://www.postgresql.org/docs/current/pgtrgm.html) | 문자열 검색 인덱스 |
| S12 | [Supabase Custom SMTP](https://supabase.com/docs/guides/auth/auth-smtp) | 실제 사용자 대상 메일 설정 |
| S13 | [Next.js Data Security](https://nextjs.org/docs/app/guides/data-security) | 서버 함수와 데이터 접근 경계 |
| S14 | [Google Recipe structured data](https://developers.google.com/search/docs/appearance/structured-data/recipe) | 레시피 구조화 데이터 |
| S15 | [Sharp Output options](https://sharp.pixelplumbing.com/api-output/) | 출력 형식과 메타데이터 처리 |
| S16 | [Codex AGENTS.md](https://developers.openai.com/codex/guides/agents-md/) | 프로젝트 지침 읽기 |
| S17 | [Supabase getClaims](https://supabase.com/docs/reference/javascript/auth-getclaims) | 검증된 JWT claims |
| S18 | [create-next-app CLI](https://nextjs.org/docs/app/api-reference/cli/create-next-app) | npm, src-dir, disable-git, skip-install 옵션 |
| S19 | [PostgreSQL Date/Time functions](https://www.postgresql.org/docs/current/functions-datetime.html) | clock_timestamp와 트랜잭션 시각 |
| S20 | [Next.js CLI](https://nextjs.org/docs/app/api-reference/cli/next) | next typegen과 빌드/검증 명령 |
