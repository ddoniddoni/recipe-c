# 진행 현황

최종 갱신: 2026-10-13

## 현재 상태

**P0 기반 구현과 검증 완료. P1 인증·권한 코드는 develop에 통합했으며 P2 레시피·미디어 UI/서버/마이그레이션 코드를 작성했다. 사용자의 2026-10-12 지시에 따라 테스트·린트·타입 검사·빌드·브라우저 검증은 별도 요청까지 보류한다. Supabase 연결은 밤으로 미뤘으며 실제 연결과 DB/Storage 적용은 하지 않았다. P1/P2 완료나 동작 검증 통과를 의미하지 않는다.**

현재 단계: P2 레시피·미디어 코드 작성. P1/P2 외부 연결 대기 / 검증 보류
다음 작업: 밤에 기존 개발용 Supabase의 스키마·Auth·Storage 연결을 재개한다. 검증은 별도 재개 요청 이후
서비스명: 레시피 어워즈, 가칭
확정 스택: Next.js, Supabase, npm

## 단계 체크

| 단계 | 상태 | 완료 조건/메모 |
|---|---|---|
| 문서 패키지 | 완료 | AGENTS + 제품/UI + 기술/데이터 + 어워즈/수익 + 개발/테스트 |
| P0 기반 | 완료 | 홈/탐색/상세 개발 샘플, 토큰/공통 상태, 환경 검증, 38개 테스트 및 build 통과 |
| P1 인증/권한 | 코드 작성 / 연결 대기 / 검증 보류 | 이메일 Auth, 계정 매핑, RLS, 프로필. 실행 검사는 사용자 요청까지 보류 |
| P2 레시피/이미지 | 코드 작성 / 연결 대기 / 검증 보류 | 초안, 불변 버전, 사진 처리, 검색/상세/조리 보기. 실제 동작 미검증 |
| P3 후기/커뮤니티 | 미시작 | 별점, 사진 후기, 댓글, 북마크, 알림 |
| P4 어워즈 | 미시작 | 월간 출품, 평가, 안전한 결과 확정 |
| P5 공개 베타 | 미시작 | 운영, 신고, 탈퇴, SEO, 전체 검증 |
| P6-A 제휴 | 보류 | 베타 검증과 제휴 승인 이후 |
| P6-B 후원 | 보류 | 실제 파트너와 운영 조건 확정 이후 |

## 설치된 버전

| 항목 | 실제 버전 |
|---|---|
| Node.js | 시스템 v26.4.0 확인. 설치·최종 검증은 v24.21.0 LTS 별도 런타임 사용 |
| npm | 12.2.0 |
| Next.js / React | 16.4.0 / 19.3.0 (react-dom 동일) |
| TypeScript / Tailwind | 5.9.3 strict / 4.3.3, @tailwindcss/turbopack 4.3.3 |
| ESLint / Zod | 9.39.5 / 4.6.6 |
| Supabase CLI / JS / SSR | 2.120.0 / 2.117.3 / 0.12.7 (P1에서 고정 설치) |
| Sharp | 0.35.5 (P2에서 기존 설치 버전을 직접 의존성으로 고정) |
| PostgreSQL | 기존 개발 프로젝트 버전 미확인. 로컬 config는 17, 실행하지 않음 |
| 테스트 도구 | Vitest 5.0.3, Testing Library React 16.3.3, jest-dom 7.0.1, user-event 14.6.7, jsdom 30.1.2 |

`.nvmrc`와 `.node-version`은 24.21.0, package.json engines는 Node >=24.21.0 <25 / npm >=11 <13이다. 전역 Node 설정을 변경하지 않았다. P1 Supabase 패키지는 고정 버전으로 추가하고 lockfile을 갱신했다. npm ci 재설치 검증은 P0 당시 기록이며 P1에서는 실행하지 않았다.

## 기존 P0 검증 기록 (P1/P2에는 해당하지 않음)

| 검증 | 상태 | 비고 |
|---|---|---|
| 문서 구조와 내부 파일 참조 | 기존 문서 기록 | 첨부 패키지의 확인 기록 보존; 이번 앱 검증과 별개 |
| 어워즈 산식 예제와 시간 변환 | 기존 문서 기록 | 첨부 패키지의 예시 계산 기록; 이번 P0에서 재실행하지 않음 |
| npm run lint | PASS | eslint . --max-warnings=0, 오류/경고 없음 |
| npm run typecheck | PASS | next typegen && tsc --noEmit |
| npm run test | PASS | 3개 파일, 38개 단위/UI 테스트 |
| npm run build | PASS | Next.js 16.4.0 Turbopack production build, Supabase 키 없이 통과 |
| npm run validate | PASS | npm ci 이후 최종 소스로 lint → typecheck → test → build, exit 0 |
| npm ci | PASS + 경고 | lockfile 기반 재설치 성공. 아래 npm 경고/취약점 참조 |
| npm run dev / start | PASS | 개발 샘플과 운영 안내 화면 모두 실제 HTTP/브라우저 확인; 점검 서버 종료 |
| 360 / 768 / 1440px 브라우저 | PASS (P0 smoke) | 홈/탐색/상세/UI 점검 12조합 가로 넘침 없음, 캡처 육안 검토 |
| 검색 / 키보드 / 빈 상태 | PASS (P0 smoke) | 검색 후 URL·새로고침 복원, 상세 이동, 결과 없음, not-found UI, skip link, 입력 포커스 때 모바일 메뉴 숨김 |
| 운영 샘플 차단 | PASS | 샘플 카드 0, 샘플 상세 직접 접근 시 설정 안내, /dev/ui는 not-found UI, noindex |
| 운영 DEMO_MODE=true | 예상대로 거부 | build와 start 각각 exit 1 및 DEMO_MODE 오류. 성공 빌드와 구분되는 차단 검증 |
| production 브라우저 JS 검사 | PASS (제한 검사) | SUPABASE_SECRET_KEY, parseServerEnv, 샘플 recipe ID 미포함. 실제 키를 사용한 검증은 아님 |
| React Doctor 전체 소스 | PASS | 34개 파일 검사, 100/100, 진단 없음. Git 기준 회귀 비교는 미검증 |
| React Doctor --scope changed | 실행 실패 | Git 미초기화로 HEAD 없음. Git 초기화 대신 --scope full로 검사 |
| npm audit | FAIL / 잔여 위험 | 개발 의존성 high 5건, 자세한 내용 아래 |
| npm audit --omit=dev | PASS | 런타임 의존성 취약점 0건 (검사 시점) |
| npm run test:db | NOT RUN / 명령 미도입 | P1부터 DB·RLS 및 로컬 Supabase를 구성하며 P0는 DB 변경 없음 |
| npm run test:e2e | NOT RUN / 명령 미도입 | 04 문서의 도입 시점은 P1 이후. P0 브라우저 smoke를 실제 Auth/DB E2E 통과로 간주하지 않음 |
| 실제 인증/업로드/수상/배포 | NOT RUN | P0 범위 밖, 관련 API/DB/결제와 가짜 성공 응답을 만들지 않음 |

## 외부 설정과 출시 차단 항목

P0 샘플에는 실제 API 키가 필요하지 않다. P1은 사용자가 선택한 기존 개발용 Supabase 프로젝트에 연결할 예정이다. URL/ID와 공개 키 설정은 아직 확인되지 않았다. 비밀값을 이 파일에 기록하지 않는다.

운영 전에 확정할 것은 정식 서비스명과 도메인, 운영 주체와 연락처, 정책 문구, 실제 SMTP, 관리자 계정, 배포 환경과 비용, 첫 행사 일정이다. 수익화 활성화에는 별도로 제휴 승인과 후원 계약이 필요하다.

## 결정 이력

| 날짜 | 결정 | 구분/이유 |
|---|---|---|
| 2026-10-12 | 웹 우선, Next.js/Supabase/npm | 사용자 지정 |
| 2026-10-12 | 개인이 작성한 레시피와 사용자 의견 중심 | 사용자 지정 |
| 2026-10-12 | 루트 AGENTS + docs 통합 명세 | 작업 지침과 상세 내용을 분리 |
| 2026-10-12 | 사진 후기와 일반 댓글 구분 | 별점의 의미를 명확히 유지 |
| 2026-10-12 | 불변 발행 버전과 월간 평가 스냅샷 | 수정으로 후기/수상 의미가 바뀌는 문제 방지 |
| 2026-10-12 | 접수 1~20일, 평가 21일~월말 | 공통 평가 기간을 위한 변경 가능한 기본안 |
| 2026-10-12 | 최소 5명, C=3.5, m=5 | 적은 후기 수를 보정하는 변경 가능한 기본안 |
| 2026-10-12 | P0~P5 커뮤니티, P6 수익화 | 실제 참여 흐름과 운영 신뢰 우선 |
| 2026-10-12 | 상금/결제/창작자 정산은 초기 제외 | 초기 운영 복잡도 제한 |
| 2026-10-12 | /Users/ddoni/dev/recipe-community에 새 프로젝트 구성 | 상위 dev는 여러 프로젝트를 담는 폴더. 기존 앱·사용자 변경과 첨부 원본 보존 |
| 2026-10-12 | Next 16.4.0 / Node 24.21.0 LTS | 공식 문서·npm 레지스트리 확인, scaffold는 독립 임시 폴더에서 생성 |
| 2026-10-12 | Tailwind 4.3.3의 공식 scaffold Turbopack loader 유지 | React Compiler/Cache Components는 켜지 않음, 피드백 기능 비활성 |
| 2026-10-12 | Zod는 P0 환경 검증에 도입 | Supabase 클라이언트/CLI는 P1까지 보류 |
| 2026-10-12 | 개발 fixture는 NODE_ENV=development + DEMO_MODE=true에서만 반환 | 미설정/오류 시 자동 fallback 없음. 알 수 없는 실행 환경도 demo 차단 |
| 2026-10-12 | 전체 P0 noindex, 미구현 기능은 활성 링크/쓰기 버튼으로 노출하지 않음 | 실제 사용자 콘텐츠·기능으로 오인 방지 |

## 작업 기록 작성 틀

다음 작업부터 아래 형식으로 이 파일에 덧붙인다. 중요하지 않은 터미널 로그 전체를 복사하지 않는다.

```text
날짜:
단계:
목표:
구현한 내용:
핵심 변경 파일/migration:
실행한 명령과 결과:
미실행 검사와 이유:
남은 문제:
다음 작업:
```

## P0 시작 점검 — 2026-10-12

- `/Users/ddoni/dev`는 여러 프로젝트를 담는 폴더이며 Git 저장소가 아님.
- 대상 `/Users/ddoni/dev/recipe-community`는 시작 전에 존재하지 않음. 기존 프로젝트와 사용자 변경을 건드리지 않고 새 폴더에 문서 사본을 배치.
- 첨부 원본 `Downloads/AGENTS.md`, `Downloads/docs/`는 보존. 루트 AGENTS의 사용자 규칙도 보존.
- 시스템 Node.js v26.4.0 / npm 12.2.0 확인. 명세의 Node 24 LTS와 차이가 있어 별도 런타임에서 검증 예정.
- Git 초기화/commit/push/배포 요청 없음. 수행하지 않음.
- 단계 범위: P0만. 실제 Auth/DB/Storage, 어워즈 집계, 수익화는 미구현 유지.

## P0 완료 기록 — 2026-10-12 (KST)

### 구현과 핵심 파일

- `package.json`, `package-lock.json`, `tsconfig.json`, `eslint.config.mjs`, `next.config.ts`, `vitest.config.mts`: npm/App Router/TypeScript strict, lint/typecheck/test/test:watch/build/validate. `test:db`, `test:e2e`는 성공하는 빈 스크립트로 만들지 않았다.
- `src/app/globals.css`: 명세 색상과 4px 간격, 시스템 한글 폰트, 공통 폭/반응형/포커스 토큰. 캡션 대비를 측정하여 muted를 #68625A로 조정. 본문/배경 14.45:1, muted/배경 5.68:1, 흰색/주 행동 6.00:1, 흰색/배너 7.77:1, muted/샘플 배경 최소 4.73:1. 전체 접근성 인증이나 스크린리더 실기 검증을 의미하지 않는다.
- `src/components/layout/`, `src/app/layout.tsx`: 공통 헤더/푸터, 현재 경로 표시, 모바일 메뉴와 safe area, 본문 건너뛰기, 샘플 배너.
- `src/app/(public)/`: 홈, 탐색, 샘플 상세. `src/features/recipes/`: server-only 샘플 3개, 샘플 제목/재료 검색, 카드/분량·소요 시간/재료/조리 단계. 이미지 자리표시자는 자체 SVG이며 실제 요리 사진으로 표시하지 않는다.
- `src/components/ui/`, `src/app/loading.tsx`, `error.tsx`, `not-found.tsx`, `src/app/dev/ui/page.tsx`: EmptyState/ErrorState/LoadingState, 기본 Button/TextField와 label/hint/error 연결. `/dev/ui`는 개발 샘플 모드에서만 표시.
- `.env.example`, `src/lib/env/`, `src/instrumentation.ts`: 공개/서버 파서 분리, server-only 런타임 경계, URL/키 쌍·키 역할·엄격한 boolean 검증, 공개 변수의 서버 키 차단, 키 값 없는 오류, build/start 시 검증. 설정 값 존재 여부는 연결 성공이 아니다.
- `tests/unit/`: 키 누락/부분 설정/잘못된 URL/키 역할/운영 demo 차단/미지정 실행환경 차단/P6 플래그 차단, fixture 접근 경계와 한글 검색, 폼 설명/오류 연결·입력 보존·키보드 재시도·비활성 버튼 검증.
- P0는 실제 Auth, DB 쿼리/테이블/migration, 서버 저장, 업로드, 어워즈 계산, 수익화 구현이 없다. 댓글·후기·평점·수상 실적도 만들어 표시하지 않는다.

### 실행 방법

프로젝트는 `/Users/ddoni/dev/recipe-community`에 있다. Node 24.21.0을 선택한 터미널에서 실행한다. 시스템 기본 Node는 여전히 v26.4.0이다.

```bash
cd /Users/ddoni/dev/recipe-community
node --version
npm ci
# 실제 키나 .env.local 없이도 P0 샘플 확인 가능
NEXT_TELEMETRY_DISABLED=1 DEMO_MODE=true npm run dev
```

위 dev 서버는 기본 `http://localhost:3000`을 사용한다. 검증 당시에는 다른 서버와 충돌을 피하려고 `--hostname 127.0.0.1 --port 3100`으로 실행했다. 기본 `npm run dev`는 샘플을 켜지 않고 설정 안내를 표시한다. 필요한 로컬 설정은 `.env.example`을 참조해 `.env.local`에 두되 기존 파일을 덮어쓰지 않는다. P0는 실제 Supabase 키를 요구하지 않는다.

```bash
# DEMO_MODE=true인 .env.local이 있어도 운영 검증은 명시적으로 false
NEXT_TELEMETRY_DISABLED=1 DEMO_MODE=false npm run validate
NEXT_TELEMETRY_DISABLED=1 DEMO_MODE=false npm run start
```

이 작업에서만 사용한 격리 Node 런타임 경로는 아래와 같다. 전역 설치나 shell 초기화 파일 변경을 하지 않았다. 장기 개발 환경에서는 Node 24.21.0을 선호하는 버전 관리자로 선택한다.

```bash
export PATH="/Users/ddoni/Documents/Codex/2026-10-12/new-chat/work/runtime/node_modules/node-bin-darwin-arm64/bin:$PATH"
```

### 실패·제한·잔여 위험

1. `npm audit`는 **개발 의존성 high 5건**으로 exit 1이다. 경로는 `eslint-config-next → @next/eslint-plugin-next → fast-glob → micromatch → braces@3.0.3`; [GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm)의 중첩 패턴에 대한 stack-exhaustion DoS가 원인이다. 조회 당시 braces 최신도 3.0.3이며 npm의 자동 수정안은 eslint-config-next 14.2.35로 메이저 다운그레이드다. Next 16 설정을 훼손하는 `audit fix --force`는 실행하지 않았다. 런타임만 검사한 audit은 0건이다. 패치 발표 후 도구 의존성을 다시 확인해야 한다.
2. 공식 scaffold의 ESLint 9.39.5는 npm에서 지원 종료 경고를 냈다. 호환성 검토 없는 메이저 변경을 섞지 않고 기록했다. npm 12 정책이 unrs-resolver/fsevents 설치 스크립트를 차단했지만 권한 설정을 바꾸지 않았고 npm ci·lint·test·build는 통과했다.
3. React Doctor 변경분 검사는 Git HEAD가 없어 실패했다. 전체 소스 검사는 통과했으나 이전 커밋 대비 회귀 검증은 아니다. Git 미초기화 상태이므로 `git status`/`git diff`는 사용할 수 없다. 문서 원본과 파일 내용 비교로 보존 여부를 확인했다.
4. 샘플 모드를 켠 production build/start의 exit 1은 의도한 안전장치 검증이다. 환경 오류 메시지에 실제 키 값을 출력하지 않았다.
5. Tailwind 토큰 변경 직후 개발 서버가 이전 CSS 토큰을 반환하여 브라우저 대기 검사가 1회 timeout 됐다. 소스와 생성 CSS의 차이를 확인한 뒤 서버 재시작 및 npm ci/최종 build로 재검증했다. 최종 브라우저는 #68625a를 반환한다. 캐시 동작에 대한 프레임워크 근본 수정은 범위 밖이다.
6. Next.js 스트리밍 시작 후 notFound는 HTTP 200과 not-found UI/noindex를 반환할 수 있다. 실제 `/dev/ui` 운영 응답에서 이 동작을 확인했다. 개발 UI 내용은 노출되지 않았다. HTTP 404와 화면의 not-found 상태를 혼동하지 않는다.
7. 브라우저 점검은 Ego Chromium의 viewport 및 키보드 smoke다. 실제 모바일 장치, 다른 브라우저, 스크린리더, LCP/CLS 측정은 미실행이다. ErrorState는 컴포넌트 테스트와 UI 예시로 검증했고 실제 DB/네트워크 장애 흐름은 P1 이후다.
8. 원격 Supabase·메일·Storage·RLS·실제 사용자 E2E는 미구현/미검증. P0 build 성공은 서비스 연동 또는 출시 완료가 아니다.

### 보존 확인과 다음 단계

- `/Users/ddoni/Downloads/AGENTS.md`와 `Downloads/docs/` 원본은 변경하지 않았다. 프로젝트 `docs/01`~`04`는 원본과 byte 단위로 일치한다.
- 프로젝트 AGENTS의 사용자 지침은 그대로 보존하고 scaffold의 `BEGIN:nextjs-agent-rules` 관리 블록만 뒤에 병합했다. agent feedback은 활성화하거나 제출하지 않았다.
- 기존 `/Users/ddoni/dev`의 다른 프로젝트에 변경을 가하지 않았다. 새 대상은 작업 전 존재하지 않았으며 Git 초기화/브랜치/commit/push/PR/배포를 수행하지 않았다.
- QA 브라우저와 두 임시 서버는 종료했다. 다음 요청 전까지 P1을 진행하지 않는다.
- 다음 단계는 사용자가 요청할 때 **P1 인증/권한 기반**이다. 먼저 로컬 Supabase/Docker 또는 사용자가 지정한 개발 프로젝트를 확인하고 실제 Auth, 최소 schema/RLS, 권한 테스트를 연결한다. 개발 도구 audit 경고도 다시 확인한다.

### 구현 시 확인한 자료

- [Next.js 설치](https://nextjs.org/docs/app/getting-started/installation), [create-next-app CLI](https://nextjs.org/docs/app/api-reference/cli/create-next-app): 16.4.0 scaffold/옵션 확인.
- 설치된 `node_modules/next/dist/docs/`의 환경변수, Vitest, connection, dynamic routes, server-only, not-found, agentFeedback 문서 확인.
- [Node.js 릴리스 지원 상태](https://nodejs.org/en/about/previous-releases): Node 24 LTS 확인. 정확한 설치 버전은 npm 레지스트리와 실제 실행으로 확인.
- [Supabase 변경 기록](https://supabase.com/changelog.md), [API 키](https://supabase.com/docs/guides/getting-started/api-keys): 공개 publishable/legacy anon과 서버 secret/legacy service_role의 용도 구분. P0에서 실제 Supabase 호출은 하지 않음.

## 최초 GitHub 업로드 — 2026-10-12 (KST)

- 요청 대상: `https://github.com/ddoniddoni/recipe-c.git`. 원격 ref 조회와 GitHub 조회에서 빈 저장소이며 현재 계정에 ADMIN 권한이 있음을 확인했다.
- 시작 상태: 프로젝트에 `.git`이 없다. 전역 `/Users/ddoni/.codex/AGENTS.md`의 Git Flow를 확인했다. `develop`은 개발 통합, `main`은 안정 릴리스 브랜치이며 초기화와 commit은 각각 명시적 요청이 필요하다.
- 업로드 준비: 기존 P0 소스·테스트·문서·npm lockfile을 보존한다. 후보 48개 파일의 일반적인 인증정보 패턴 검사에서 일치가 없었고 로컬 환경 파일도 없었다. `.env.example`은 비밀값이 비어 있는 예제다. `.gitignore`는 의존성, 빌드 산출물, 로컬 환경 파일, 테스트 산출물을 제외한다. 패턴 검사를 완전한 비밀정보 감사로 간주하지 않는다.
- 새 검증: Node 24.21.0 환경에서 `npm run lint`, `npm run typecheck`, `npm run test` 통과(3개 파일, 38개 테스트). 최초 `npm run validate`의 빌드 단계는 샌드박스 포트 바인딩 제한으로 실패했다. 권한을 갖춘 단순 재실행도 캐시된 동일 오류를 반환했다. `.next/cache/turbopack`을 임시 폴더에 보존한 뒤 권한을 갖춰 `npm run build`를 다시 실행하여 exit 0을 확인했다. 앱 소스나 빌드 설정은 수정하지 않았다.
- 추가 React Doctor 검사는 실행하지 못했다. 자동 승인 검토가 `npx --yes react-doctor@latest --verbose --scope full`을 외부 최신 패키지 다운로드·실행 위험 및 요청된 푸시에 불필요한 추가 검사라는 이유로 거절했다. 우회 실행하지 않았다. 앞선 P0 검사 기록과 이번 필수 검증 결과를 구분한다.
- DB 변경과 사용자 흐름 변경이 없어 DB/E2E 검사는 추가하지 않았다. 기존 개발 의존성 audit 위험은 이번 작업에서 재검사하거나 수정하지 않았다.
- 승인 및 초기 구성: 사용자가 Git 초기화, `chore/p0-bootstrap` 최초 커밋, `develop` 생성과 두 브랜치 푸시를 명시적으로 승인했다. `chore/p0-bootstrap`으로 Git을 초기화하고 지정 저장소를 `origin`에 등록했다.
- 업로드 기준: 최초 커밋 메시지는 `chore(bootstrap): initialize P0 foundation`이며 위 검증을 마친 기존 P0와 이 작업 기록만 포함한다. 빈 원격의 최초 기준점을 두 브랜치에 동일하게 설정하고 `develop`에서 작업을 마친다. 이후 개발은 최신 `develop`에서 별도 작업 브랜치를 만든다. `main`으로의 안정 릴리스 승격, PR, 배포는 별도 요청으로 진행한다.

## P1 인증·권한 코드 작성 — 2026-10-12 (KST)

### 요청과 작업 범위

- 사용자 요청: 다음 기능 개발. **테스트 등 검증은 사용자가 다시 지시할 때까지 중단**한다. 테스트 코드 추가, lint/typecheck/test/build, DB/E2E, audit, React Doctor, DB advisor, 브라우저 확인을 실행하지 않았다.
- 기존 P0 커밋 `061ec26`과 원격 develop에서 시작했다. `git fetch origin develop`, fast-forward 확인 후 `feature/p1-auth-foundation`을 생성했다. P0 bootstrap 브랜치를 재사용하지 않았다.
- 연결 대상은 사용자가 선택한 **기존 개발용 Supabase 프로젝트**다. URL 또는 project ID와 `.env.local`의 공개 연결 설정을 요청한 상태다. 로컬 Docker/Supabase/psql 실행 도구도 발견되지 않았으며 Docker를 설치하거나 DB를 시작하지 않았다.

### 작성한 코드

- `src/app/(auth)/`, `src/app/auth/`, `src/features/auth/`: 이메일 가입/확인 재발송/로그인/로그아웃/비밀번호 재설정, 검증 오류·중복 제출 방지·입력 유지, 일회성 token hash 확인과 PKCE callback, 제한된 상대 경로 리다이렉트. Provider 성공 응답을 받은 경우에만 해당 결과를 표시하며 설정 누락·샘플 모드에서는 인증 폼을 비활성 경로로 처리한다.
- `src/lib/supabase/`, `src/proxy.ts`: JS/SSR 클라이언트 분리, 요청마다 서버 클라이언트 생성, 쿠키 갱신과 응답 cache 헤더 보존, `getClaims` 및 최신 `getUser` 확인, DB RPC 기반 본인 계정 조회. secret/service-role 키는 사용하지 않는다.
- `src/app/(member)/`, `src/features/profiles/`, `src/app/(public)/u/[handle]/`, `src/app/admin/`: 최초 프로필 설정, 내 공간, 계정 설정, 공개 프로필과 관리자 접근 경계. 관리자 역할은 사용자 metadata 대신 DB에서 조회한다. 역할/상태 수정 UI나 P5 운영 기능은 추가하지 않았다.
- `supabase/migrations/20261012081353_auth_foundation.sql`: CLI로 생성한 첫 migration 파일. 공개 프로필과 Auth ID 분리, private.accounts/감사 로그/원자적 프로필 수정 속도 제한, 카테고리, RLS/최소 GRANT, 새 Auth 사용자 provisioning과 기존 Auth 사용자 매핑, 본인 프로필 수정 RPC. 프로필 주소는 최초 설정 후 변경 불가다. 공개 프로필은 이메일 확인·정상 상태·최초 설정 조건으로 제한한다.
- `supabase/config.toml`, `supabase/templates/`: 선택 가능한 로컬 설정과 확인/복구 이메일 템플릿. 기존 원격 프로젝트에는 설정을 별도로 적용해야 한다. 원격 연결/migration 적용/Auth 설정 변경/메일 발송은 실행하지 않았다.
- `package.json`, `package-lock.json`, `scripts/`: Supabase JS 2.117.3, SSR 0.12.7, CLI 2.120.0을 고정 설치했다. CLI telemetry를 끄는 프로젝트 래퍼, 로컬 db:start/stop/reset, 실패 시 기존 파일을 보존하는 DB 타입 생성 스크립트를 추가했다. `db:reset`은 `--local`로 한정한다. 테스트 스크립트를 성공하는 빈 구현으로 추가하지 않았다.
- `src/lib/supabase/database.ts`는 migration을 바탕으로 작성한 **수작업 타입 계약**이다. 실제 DB에서 생성한 타입이 아니다. 연결과 migration 적용 후 `npm run db:types -- --linked`로 교체해야 한다.
- `.env.example`, `docs/02`, `docs/04`: 원격 개발 프로젝트 연결, Auth 설정과 이메일 템플릿, 최초 관리자 지정 절차와 타입 파일 경로를 정리했다. 기존 화면의 색상/타이포그래피를 이어 회원 화면을 추가했으며 실제 레시피 작성·저장·후기·수상·P6 기능은 범위에 포함하지 않았다.

### 실행한 작업과 미실행 항목

- npm registry에서 버전/호환성을 조회하고 Node 24.21.0 환경에서 `npm install --save-exact --ignore-scripts --no-audit --no-fund ...`로 필요한 의존성을 설치했다. 기존 의존성의 무관한 업그레이드는 하지 않았다.
- CLI `--help`, `init`, `migration new auth_foundation`만 실행했다. 첫 도움말 호출은 전역 telemetry 설정 파일 쓰기가 샌드박스에 막혀 실패했다. 설치된 CLI의 환경변수 지원을 읽어 `SUPABASE_TELEMETRY_DISABLED=1`, `DO_NOT_TRACK=1`을 설정하자 도움말과 파일 생성이 실행됐다. 전역 설정 변경이나 telemetry 제출은 하지 않았다.
- 설치된 Next.js의 Proxy/cookies/forms 문서, Supabase changelog와 [SSR 문서](https://supabase.com/docs/guides/auth/server-side/creating-a-client), [비밀번호 인증](https://supabase.com/docs/guides/auth/passwords), [메일 템플릿](https://supabase.com/docs/guides/auth/auth-email-templates), 설치 패키지의 SSR 타입을 확인했다. SSR 0.12.7의 `setAll(cookies, headers)` 계약을 반영했다.
- **새 코드의 테스트·lint·typecheck·build·DB/E2E·audit·브라우저 검증은 전부 NOT RUN — 사용자 지시.** P0의 PASS 기록을 P1에 적용하지 않는다. 신규 migration의 SQL 실행, 권한 검증, 실제 DB 타입 생성도 미실행이다.
- 코드와 변경 목록만 읽었다. Git commit/push/PR/배포는 하지 않았다.

### 남은 작업

1. 개발 프로젝트 URL/ID와 `.env.local` 연결 값을 확보하고 기존 스키마/migration 충돌 여부를 확인한다. 대상이 확인되지 않은 원격에 SQL을 실행하지 않는다.
2. 사용자 요청 범위 내에서 migration 및 원격 Auth의 이메일 확인, redirect allowlist, 템플릿, SMTP를 연결한다. 이번에는 외부 설정을 완료하지 않았다.
3. 검증 재개 요청 후 DB 타입 생성, 단위/UI/권한/E2E 테스트 작성과 실행, lint/typecheck/build를 진행한다. 미확인 회원, 역할 위조, 세션 만료/폐기, 프로필 직접 쓰기/중복 handle/속도 제한, 외부 redirect, 재사용된 확인·복구 링크를 우선 다룬다.
4. 앞서 기록한 개발 도구 취약점은 이번에 재조회하지 않았다. P1은 코드 작성 상태이며 연결/검증이 끝나기 전 완료 또는 출시 가능 상태로 취급하지 않는다.

## P1 코드 Git Flow 반영 — 2026-10-12 (KST)

- 사용자 요청으로 기존 개발용 Supabase 연동을 밤으로 미룬다. 연결 정보 요청이나 원격 설정/SQL 적용을 더 진행하지 않으며, 자동 예약 작업도 만들지 않는다.
- 지금까지 작성한 P1 코드의 Git Flow 반영 범위는 `feature/p1-auth-foundation` 커밋·푸시 → `develop` 대상 PR → 병합과 로컬 develop 동기화다. `main` 릴리스와 배포는 포함하지 않는다.
- 사용자 지정 검증 보류를 그대로 유지한다. 이번 반영에서도 테스트·lint·typecheck·build·DB/E2E·audit·React Doctor를 실행하지 않는다. PR에는 미검증 상태와 Supabase 미연동·migration 미적용을 명시한다.
- 기존 P0와 무관한 파일, 로컬 환경 파일, 의존성 디렉터리, 빌드/테스트 산출물은 커밋에 포함하지 않는다. 새 P1 소스, 의존성 lockfile, migration, 설정 예제, 관련 문서가 반영 대상이다.
- 이후 연동 작업은 최신 `develop`에서 새 작업 브랜치로 시작한다. 이 반영은 코드 보존과 개발 브랜치 통합이며 P1 동작 검증 완료를 뜻하지 않는다.

## P2 시작 — 2026-10-12 (KST)

- 사용자 요청: 다음 기능 개발. P1 PR #1 병합 커밋 `56d9b70`의 최신 develop에서 `feature/p2-recipes-media`를 생성했다.
- 범위: 초안 생성/저장과 충돌 처리, 불변 발행 버전과 멱등성, private 사진 업로드/처리/접근, 공개 검색·상세·버전 선택·인분 조절·조리 보기, 내 레시피 목록.
- 실제 Supabase 연결, 원격 DB/Storage 설정, 테스트 작성·실행 및 lint/typecheck/build/브라우저 검증은 계속 보류한다. 코드 작성 이후에도 연결/검증 완료라고 표시하지 않는다.
- 이번 개발 요청은 commit/push/PR/병합/배포 요청이 아니므로 기능 브랜치의 작업 파일로 남긴다.

## P2 레시피·미디어 코드 작성 — 2026-10-12 (KST)

### 작성한 내용과 핵심 파일

- `src/features/recipes/schemas.ts`, `actions.ts`, `queries.ts`, `result.ts`: 초안/발행 입력 계약과 사용자 세션 RPC, 안전한 오류 메시지, 요청별 목록/상세/초안 조회. 작성자·정상 계정·프로필·이메일·세션 확인은 DB 쓰기 함수에서도 수행한다.
- `src/app/(member)/recipes/`, `src/features/recipes/components/recipe-editor.tsx`: 초안 생성, 재료/단계 추가·삭제·순서 이동, 사진 선택, 수동 저장, 권리 확인·경제적 관계 표시, 미리보기와 발행. 실패 시 입력을 유지하고 저장 충돌을 알린다. 발행 응답이 불명확하면 같은 request ID로 결과를 확인한다. 초안 GET 방문 자체로 새 행을 만들지 않는다.
- `src/app/api/uploads/`, `src/features/media/`, `src/lib/supabase/admin.ts`, `src/app/media/[assetId]/route.ts`: private 원본의 서명 업로드, 사용자별 예약/처리 잠금, 서버 바이트 형식·5MiB·6,000px·20MP 제한, APNG/다중 프레임 거절, 방향 보정·메타데이터 제거·최대 1,600px/1MiB WebP 변환. Storage 관리 키는 서버 전용이며 일반 레시피 쓰기에 사용하지 않는다. 쿠키와 Origin 경계, JSON 2KiB 제한, 제한 시간, ready 이후 원본 삭제 재시도, 소유자/공개 참조 확인 후 60초 미디어 URL 발급을 작성했다.
- `src/app/(public)/`, `src/app/(member)/me/`, 레시피 표시 컴포넌트: 홈 새 레시피, 제목/재료 검색, 카테고리/시간/난이도 필터, URL 페이지 이동, 공개 상세와 과거 버전 선택, 인분 변경, 단계별 조리 보기, 내 초안/발행 목록과 공개 프로필 레시피. 실제 연결 실패 시 fixture로 대체하지 않는다. P0 개발 샘플은 기존 경로를 유지한다.
- `supabase/migrations/20261012140254_recipes_media.sql`: CLI로 생성한 migration. recipes/drafts/versions/version_assets/media_assets와 RLS/열 단위 읽기 권한, 현재 버전 복합 FK, 불변 발행 스냅샷, idempotency, 초안 낙관적 잠금, DB 호출 제한, SECURITY INVOKER 공개 view/RPC, 제한된 private 쓰기 함수, private Storage 버킷과 직접 접근 차단 정책을 작성했다.
- `package.json`, `package-lock.json`: Next의 기존 간접 의존성이던 Sharp 0.35.5를 직접 고정했다. 전역 런타임·의존성 버전의 무관한 변경은 하지 않았다.
- `.env.example`, `docs/02`, `docs/04`: P2 서버 키 용도, migration 적용 전 충돌 확인, private Storage 설정, 처리 재시도/파일 정리 한계, 타입 생성 및 후속 연결 절차를 기록했다.

### 구현 결정

- 초안 자동 저장 대신 명세가 허용한 수동 저장을 제공한다. 저장하지 않은 변경과 처리 중 요청을 표시하고 페이지 이탈 시 경고한다.
- 버전 본문은 JSONB 한 사본에 저장하고 검색용 핵심 열을 generated column으로 구성한다. 발행 함수가 FK/자산 참조를 함께 기록한다. 동일한 텍스트/수량/사진 바이트의 재발행을 content hash로 제한한다.
- 처리 결과 경로에 processingToken을 추가했다. 2분 lease가 만료된 작업과 재시도가 겹쳐도 이전 작업이 현재 파일을 덮어쓰지 않도록 시도별 경로와 DB 토큰 검사를 사용한다. DB 결과가 불명확하면 출력 파일을 지우지 않는다.
- 자산은 하나의 레시피에 귀속하며 최초 단계에서는 recipe 목적만 허용한다. 후기/아바타 업로드는 P3 이후 별도 권한 경로로 확장한다. 레시피당 예약 자산 100개, 계정별 서명 60회/시간, 처리 30회/분, 처리 최대 5시도, 자산 URL 발급 240회/분을 DB에서 제한한다.
- P2에서는 실제 후기/북마크 통계가 없어 최신 발행순만 제공한다. 해당 통계와 정렬은 P3 범위다. 일반 어워즈·결제·제휴 기능은 추가하지 않았다.

### 실행한 작업과 검증 상태

- `git fetch origin develop`, fast-forward 확인, `feature/p2-recipes-media` 생성. 소스와 Git 변경 목록을 읽었다. commit/push/PR/병합/배포는 하지 않았다.
- CLI `migration new --help`와 `migration new recipes_media`로 파일만 생성했다. DB/Docker 실행, 원격 연결, migration 적용, Storage 버킷 생성, 실제 업로드/인증 요청은 하지 않았다.
- Node 24.21.0 경로에서 `npm install --save-exact --ignore-scripts --no-audit --no-fund sharp@0.35.5` 실행. 기존 Sharp 버전의 직접 의존성 승격과 lockfile 반영만 수행했으며 설치 스크립트나 audit은 실행하지 않았다.
- 설치된 Next.js Route Handlers/Forms 문서, Supabase Storage SDK의 signed upload 구현과 Sharp 타입을 읽었다. [Supabase 변경 기록](https://supabase.com/changelog), [서명 업로드](https://supabase.com/docs/reference/javascript/storage-from-createsigneduploadurl), [Storage 접근 제어](https://supabase.com/docs/guides/storage/security/access-control), [Sharp 출력/메타데이터/시간 제한](https://sharp.pixelplumbing.com/api-output/)을 참고했다. changelog.md 요청은 도구 오류로 일반 changelog 페이지를 사용했다.
- **테스트 작성/실행, lint, typecheck, build, DB/E2E, audit, React Doctor, 브라우저 확인: 모두 NOT RUN — 사용자 지시.** 기존 P0 결과는 P1/P2에 대한 검증 근거가 아니다.

### 남은 위험과 다음 작업

1. Supabase 연결과 두 migration 적용은 보류 상태다. 기존 개발 프로젝트 객체/버킷과 충돌 여부, 실제 Postgres 버전, Auth/Storage 설정, 서버 키를 연결 시 확인해야 한다.
2. SQL 실행·타입 생성·브라우저 렌더링·권한/경합 검증을 하지 않았으므로 아직 동작이나 보안을 검증한 기능으로 취급하지 않는다. 수작업 DB 타입도 연결 후 생성본으로 교체한다.
3. 사용자 요청 시 두 사용자 간 초안/이미지 접근, 현재/과거 버전의 부모 숨김, 발행 재시도·저장 충돌·지연 처리, 실제 이미지 변환과 메타데이터 제거, 모바일 작성 흐름을 검증한다. 지금 검증 명령을 실행하거나 테스트를 추가하지 않았다.
4. 만료된 처리 시도의 고아 파일, 미참조 자산, 유효한 업로드 서명으로 다시 만들어진 원본의 장기 자동 정리는 P5 작업이다. 이번 코드의 원본 삭제 실패는 완료 재요청으로 재시도할 수 있다. 호스팅의 Sharp 메모리·실행 시간, 대량 검색 성능은 미확인이다.
5. 밤에 연결을 재개한 뒤 별도 검증 요청에 맞춰 P1/P2를 확인한다. P3는 후속 기능 요청 시 시작하며, 이번 기능 브랜치는 아직 미커밋 상태다.

## P2 코드 Git Flow 반영 — 2026-10-13 (KST)

- 사용자 요청: P2 변경에 Git Flow 적용. `feature/p2-recipes-media` 커밋·푸시 → `develop` 대상 PR → 병합 → 로컬 develop fast-forward 동기화 범위로 진행한다.
- 원격 fetch 후 현재 브랜치의 기준 커밋과 origin/develop이 같고 기존 P2 PR이 없음을 확인했다. 현재 P2 소스, migration, Sharp 의존성과 lockfile, 환경변수 예제, 관련 문서를 반영한다. 로컬 환경 파일과 생성 산출물은 포함하지 않는다.
- 테스트·lint·typecheck·build·DB/E2E·audit·React Doctor·브라우저 검증 보류 지시를 유지한다. PR에도 모든 실행 검증 미실행과 Supabase 미연결·migration 미적용을 명시한다.
- 이번 반영은 코드 통합이다. 실제 기능/보안 검증 완료 또는 배포 준비 완료를 뜻하지 않는다. Supabase 연결과 원격 DB/Storage 변경, main 릴리스와 배포는 수행하지 않는다.
- 이후 새 기능은 최신 develop에서 새 작업 브랜치로 시작한다. Supabase 연결·검증은 사용자 재개 요청에 따라 진행한다.
