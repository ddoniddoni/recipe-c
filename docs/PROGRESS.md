# 진행 현황

최종 갱신: 2026-10-14

## 현재 상태

**P0 검증 완료. P1~P3 및 가입 간소화 코드는 develop에 통합했고 기존 개발 Supabase에 적용했다. P4 월간 어워즈 UI/서버/마이그레이션 코드는 `feature/p4-monthly-awards`에 작성했다. P4 원격 DB는 아직 적용하지 않았다. 2026-10-14 사용자 요청으로 Git Flow를 진행하며 통합 결과는 Git/PR 이력을 따른다. 사용자 지시로 테스트 작성·실행, lint/typecheck/build, DB/E2E/advisor/브라우저 검증은 보류한다. P1~P4 기능·보안 검증 통과 또는 단계 완료를 뜻하지 않는다.**

현재 단계: P4 코드 작성 / 원격 적용 대기 / 검증 보류
다음 작업: 사용자 요청 시 P4 원격 migration 적용. P5는 별도 다음 개발 요청에서 진행
서비스명: 레시피 어워즈, 가칭
확정 스택: Next.js, Supabase, npm

## 단계 체크

| 단계 | 상태 | 완료 조건/메모 |
|---|---|---|
| 문서 패키지 | 완료 | AGENTS + 제품/UI + 기술/데이터 + 어워즈/수익 + 개발/테스트 |
| P0 기반 | 완료 | 홈/탐색/상세 개발 샘플, 토큰/공통 상태, 환경 검증, 38개 테스트 및 build 통과 |
| P1 인증/권한 | develop 통합 / DB 적용 / 검증 보류 | 이메일 Auth, 계정 매핑, RLS, 프로필. 실행 검사는 사용자 요청까지 보류 |
| P2 레시피/이미지 | develop 통합 / DB 적용 / 검증 보류 | 초안, 불변 버전, 사진 처리, 검색/상세/조리 보기. 실제 동작 미검증 |
| P3 후기/커뮤니티 | develop 통합 / DB 적용 / 검증 보류 | 버전별 사진 후기·통계, 북마크, 댓글·답글, 알림, 신고 접수. 실제 동작 미검증 |
| P4 어워즈 | 코드 작성 / DB 적용 대기 / 검증 보류 | 월간 출품·평가 스냅샷·집계 준비/확정·공동순위·명예의전당·운영 화면 |
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
| PostgreSQL | 기존 개발 프로젝트 17.6 (원격 적용 시 조회). 로컬 config는 17, 실행하지 않음 |
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

## P3 시작 — 2026-10-13 (KST)

- P2 PR #2 병합 커밋 `1377422`의 최신 develop에서 `feature/p3-community`를 생성했다.
- 범위: 버전별 사진 후기와 평점, 북마크, 댓글·한 단계 답글, 앱 내 알림, 신고 접수, 현재 버전 통계와 정렬, 내 저장/후기 목록.
- UI → 사용자 세션 RPC → DB 제약/RLS를 작성한다. P4 월간 평가와 P5 관리자 신고 처리는 이번 범위 밖이다.
- 사용자 지시에 따라 테스트 작성/실행, lint/typecheck/build/DB/E2E/브라우저 검증, Supabase 연결·migration 적용은 보류한다. 이번 개발 요청에 commit/push/PR/병합/배포는 포함되지 않는다.

## P3 후기·커뮤니티 코드 작성 — 2026-10-13 (KST)

### 구현과 변경 파일

- `src/features/community/`: 입력/조회 계약, 사용자 세션 Server Action, 요청별 조회, 버전별 후기 편집과 사진 1~3장/별점 1~5 입력, 댓글 분류와 한 단계 답글, 신고 접수, 북마크, 내 후기/저장/신고 상태, 알림 읽음 처리를 작성했다. 글은 React 텍스트로 출력하고 실패/충돌 때 입력을 유지한다. 명시적인 최신 내용 불러오기는 입력 소실 확인을 거친다.
- 상세에는 보고 있는 버전의 실제 평균과 후기 수, 모든 버전 후기의 버전 표시, 레시피 작성자 댓글 표시를 연결했다. 카드 안의 저장 버튼은 상세 링크 밖에 배치했다. 프로필에는 공개 후기, 홈에는 현재 버전에 최근 후기가 달린 레시피를 추가했다.
- `src/app/(member)/notifications/page.tsx`, `/me` 탭: 본인 알림 12개씩 조회/페이지 읽음, 비공개 저장 목록, 본인 후기 published/hidden/deleted 상태 및 신고 접수 상태. 숨김/삭제된 대상 알림에는 내용과 링크가 없고, 볼 수 없는 저장 항목은 해제할 수 있다.
- `src/features/media/components/image-uploader.tsx`, `/api/uploads/sign`: 후기 목적/발행 버전으로 사진 예약을 분기하고 P2의 이미지 바이트 검사와 처리 경로를 공유한다. 레시피/후기 사진을 서로 바꾸어 사용할 수 없도록 DB 소유자·목적·버전 검사를 작성했다.
- `supabase/migrations/20261012154218_community.sql`: CLI로 만든 미적용 migration. 후기·사진 참조·댓글·북마크·알림·신고와 FK/UQ/RLS/명시적 grants, 제한된 쓰기 RPC, 사진 목적 확장, 현재 버전 통계/공개 조회를 작성했다. 비공개 저장자 목록과 공개 저장 수를 분리하며 일반 사용자 직접 쓰기를 허용하지 않는다.
- `src/features/recipes/`와 `src/lib/supabase/database.ts`: 실제 평점/후기/저장 수와 최신/보정 평점/후기 수/저장 수 정렬. DB 타입은 실행 중인 스키마에서 생성하지 않은 수작업 계약이다. `docs/02`, `docs/04`에 변경 계약과 연결 절차를 반영했다.

### 주요 결정

- 후기 생성/편집/삭제를 하나의 private DB 함수로 모았다. 삭제 후에도 사용자+버전 UNIQUE를 유지하고 동일 행을 복원한다. revision과 request ID/입력 hash로 경합과 중복 요청을 처리한다. 댓글은 고정 ID를 재사용하며 같은 방식으로 재시도를 처리한다.
- 통계는 버전별 공개 후기의 SECURITY INVOKER view로 읽는다. 후기/북마크 원본을 다중 JOIN하지 않고 각각 집계한다. 일반 정렬 보정식은 C=3.5, m=5이며 월간 어워즈 참여/결과를 의미하지 않는다.
- 후기와 답글 알림은 글쓰기와 같은 DB 트랜잭션에서 event_key UNIQUE로 생성하며 본문을 복제하지 않는다. 신고 대상은 nullable FK 세 개 중 하나만 허용하고 본인의 중복 미처리 신고는 기존 접수 ID를 반환한다.
- 기존 UI 색·글꼴·공통 컴포넌트를 유지하면서 후기의 버전/점수/사진과 대화의 깊이를 구분했다. 사진 업로드 준비가 안 된 환경에서는 새 사진을 올릴 수 없으며 저장 성공을 흉내 내지 않는다.

### 실행 상태와 남은 작업

- 실행한 작업: Git fetch/fast-forward 기준 확인/새 작업 브랜치, CLI migration new 도움말과 파일 생성, 소스 작성과 Git 변경 목록 읽기. 패키지 설치·의존성 변경 없음. commit/push/PR/병합/배포 없음.
- 설치된 Next.js data-security 가이드와 [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [DB 함수](https://supabase.com/docs/guides/database/functions), [변경 기록](https://supabase.com/changelog)을 참고했다. changelog.md는 도구가 Markdown 응답을 지원하지 않아 일반 페이지로 읽었다. 사용자 지시가 스킬의 실행 검증 권고보다 우선하므로 React Doctor/DB advisor도 실행하지 않았다.
- **테스트 작성·실행, lint, typecheck, build, DB/E2E, audit, React Doctor, 브라우저 검증: NOT RUN — 사용자 지시.** SQL 실행과 실제 이미지/세션/요청 결과를 확인하지 않았다. P0 통과 기록은 이번 기능의 근거가 아니다.
- Supabase 연결과 migration 3개 적용은 보류다. 연결 재개 시 기존 객체 충돌, PostgreSQL 버전, Auth/Storage/SMTP 설정과 타입 생성을 확인해야 한다. 실행하지 않은 코드의 SQL/타입/권한/동시성/렌더링 오류 가능성이 남아 있다.
- P4는 후기 변경 함수 내부에 행사 잠금·서버 시각·평가 snapshot/source_revision 갱신을 추가한다. P5는 관리자 신고 처리·숨김/복구·탈퇴·파일 정리/영구 삭제를 추가한다. 이번에는 운영 기능이나 월간 평가를 가짜로 연결하지 않았다.

## 공유 Supabase 접두사 적용 — 2026-10-13 (KST)

- 사용자가 `.env.local`에 Supabase 값을 입력했으며 해당 프로젝트는 다른 앱과 공유한다고 알렸다. 이 앱 테이블에 `re_` 접두사를 사용하라는 지시를 현재 P3 작업에 반영했다. 환경 파일은 읽어 출력하거나 변경하지 않았다.
- 아직 미적용인 P1/P2/P3 migration의 앱 테이블을 모두 re_ 이름으로 수정하고 FK/RLS/조회/함수 내부 참조를 맞췄다. 공개 뷰·RPC·인덱스·제약·정책도 접두사를 적용했다. 내부 객체는 `re_private.re_*`, 버킷은 `re_recipe_media`를 사용한다. 클라이언트 from/rpc 호출과 TypeScript 계약, 운영 SQL 예제, AGENTS 규칙을 함께 변경했다.
- 공유 public 스키마의 기본 권한 변경과 기존 private 스키마 사용을 제거했다. 앱 전용 스키마가 이미 있으면 초기 migration이 중단되므로 기존 객체를 자동 인수하지 않는다. auth/storage 시스템 테이블 이름은 유지했다.
- 기존의 전체 Auth 사용자 backfill과 전역 Auth 생성 트리거를 제거하고 `re_ensure_account`를 로그인/가입 확인 경로에 연결했다. DB에서 현재 사용자·실제 세션·이메일 확인을 재검사하며 본인만 생성한다. 앱 전용 advisory lock으로 중복 등록을 직렬화하고 role은 항상 기본 member로 시작한다.
- 실제 원격 DB 조회/적용, 서버 실행, 테스트 작성/실행, lint/typecheck/build/DB/E2E/React Doctor는 하지 않았다. `.env.local` 입력은 연결 검증 완료가 아니다. Auth 자체는 공유하므로 전역 비밀번호·메일·계정 삭제 설정은 별도 앱처럼 분리된 것으로 취급하지 않는다.
- Git 변경은 기존 P3 브랜치에 유지한다. commit/push/PR/병합은 이번 요청 범위에 없으며 실행하지 않았다. 연결 재개 시 공유 migration 이력과 re_ 객체 충돌부터 확인한다. P5 탈퇴 계약도 앱 데이터 정리와 공유 Auth 전체 삭제를 분리하도록 정정했다.

## 원격 DB 적용 연결 준비 — 2026-10-13 (KST)

- 사용자가 원격 DB 적용을 요청하고 `.env.local`의 프로젝트 `mwepkrdlvdreoojrqegr`를 대상으로 지정했다. 환경 파일의 비밀값은 출력하거나 변경하지 않았다.
- 기존 Supabase MCP는 다른 프로젝트를 가리켰다. 사용자 지시에 따라 로컬 Codex 설정의 Supabase MCP URL에서 프로젝트 참조만 대상 프로젝트로 변경했다. CLI 조회 결과 해당 프로젝트, enabled=true, auth_status=o_auth를 확인했다. 서버의 비인증 연결은 HTTP 401로 응답했다.
- 현재 대화 런타임에는 Supabase MCP 도구가 노출되지 않아 원격 스키마 조회·migration 적용은 아직 수행하지 못했다. MCP 도구를 다시 불러온 세션에서 대상 확인 → 기존 이력/객체 충돌 확인 → 앱 migration 적용 → 생성 객체 확인 순서로 이어간다. 다른 앱의 객체나 migration 이력은 수정하지 않는다.
- 테스트·lint·typecheck·build·DB/E2E·audit·React Doctor·브라우저 QA 보류 지시를 유지한다. commit/push/PR/병합 없음.

## 원격 DB 적용 재개 — 2026-10-13 (KST)

- MCP 재인증과 사용자 리로드 후 `get_project_url`이 `.env.local`과 같은 `mwepkrdlvdreoojrqegr`를 반환했다.
- 적용 전 조회: PostgreSQL 17.6, 타 앱 public 테이블 14개와 migration 이력 14개. `re_private`, public `re_` 객체/함수/정책 및 `re_recipe_media` 버킷은 없으며 필요한 Auth 열이 존재한다.
- P1/P2/P3를 MCP로 순서대로 적용하고 생성 객체와 기존 공유 객체의 정의/권한 보존 여부를 확인한다. 기능/권한 테스트와 앱 검증 명령은 계속 보류한다.

### 적용 결과

- MCP `apply_migration` 3건 모두 `success: true`. 원격 이력에 기록된 버전과 로컬 파일명을 일치시켰다. 예전 파일명은 위 개발 기록에만 남긴다.
  - `20261012081353_auth_foundation.sql` → `20261012170253_re_auth_foundation.sql`
  - `20261012140254_recipes_media.sql` → `20261012170300_re_recipes_media.sql`
  - `20261012154218_community.sql` → `20261012170309_re_community.sql`
- 적용 후 카탈로그 조회: public 앱 테이블 13개와 re_private 테이블 3개 모두 RLS 활성화, 공개 뷰 4개 모두 security_invoker=true, public 앱 함수 29개 중 SECURITY DEFINER 0개. 분류 9개만 등록됐으며 앱 계정은 0개로 기존 Auth 사용자 일괄 등록 없음.
- `re_recipe_media`: private, 5MiB, JPEG/PNG/WebP. 이 버킷의 anon/authenticated 직접 접근만 막는 restrictive 정책을 확인했다.
- 기존 migration 14건이 그대로 남아 있고 앱 이력 3건만 추가됐다. 기존 public 객체의 RLS/ACL, public 함수 소스/ACL, public/auth/storage 기존 정책 표현식, public/전역 기본 권한, Auth 트리거 정의를 모아 계산한 적용 전후 fingerprint가 동일했다. 타 앱 사용자 데이터는 조회하거나 변경하지 않았다.
- `.env.local`은 기존 키 값을 유지하면서 변수 이름만 앱이 읽는 `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`로 맞췄다. 비밀값을 출력하지 않았으며 Git에 포함하지 않는다.
- 변경 파일: migration 3개(원격 버전으로 이름 정렬), `docs/04_DELIVERY_AND_TESTS.md`, 이 진행 기록. 기존 기능 변경은 현재 P3 브랜치에 보존했다.
- **테스트·lint·typecheck·build·DB/E2E·audit·React Doctor·DB advisor·브라우저 QA 및 타입 생성: NOT RUN — 사용자 보류 지시.** 이번 확인은 원격 적용과 객체 생성 확인이며 기능/권한 테스트 통과를 뜻하지 않는다.
- 남은 작업: 공유 Auth callback/메일 설정 확인, 실제 로그인·업로드·커뮤니티 흐름 및 권한 검증, 수작업 DB 타입의 생성본 전환. 전역 Auth/메일/SMTP 설정은 수정하지 않았다. commit/push/PR/병합/앱 배포 없음.

## 가입 흐름 간소화 시작 — 2026-10-13 (KST)

- 사용자 요청: 이메일·이름·비밀번호만 입력하고 가입 시 이메일 확인 절차를 생략한다. 현재 미완료인 P3/원격 연결 작업의 가입 흐름을 이어 수정한다.
- 공유 Auth의 전역 설정을 바꾸지 않고 서버에서 새 사용자만 자동 확인 상태로 생성한다. 기존 Auth 사용자의 확인 상태·비밀번호·metadata는 수정하지 않는다. 가입 후 입력한 이름과 자동 handle로 앱 프로필을 준비하고 바로 로그인한다.
- 서버 전용 가입 경로에는 DB 요청 제한을 추가한다. 사용자 세션 검사·RLS·소유권 검사는 유지하며, 테스트/빌드 보류와 기존 미커밋 변경 보존 지시를 유지한다.

### 가입 간소화 반영 결과

- `schemas.ts`, `auth-form.tsx`, 가입 페이지: 이메일·이름(2~30자)·비밀번호(기존 12~128자) 세 입력만 제공한다. 가입 버튼과 안내를 변경하고 확인 메일 재발송 메뉴/액션을 제거했다. `/verify-email`의 기존 링크는 로그인으로 이동한다.
- `signup-service.ts`, `actions.ts`: 서버 전용 키로 새 Auth 사용자만 `email_confirm: true` 생성 → 사용자 세션 로그인 → 본인 `re_ensure_account` → `/me`. 기존 주소의 계정은 자동 확인/비밀번호 변경하지 않는다. 생성 이후 로그인·프로필 처리가 실패하면 가입 완료와 재로그인 안내를 구분한다. 비밀번호 복구는 유지한다.
- `20261012171637_re_simple_signup.sql`: 입력한 이름과 자동 handle을 사용해 프로필을 완성하고 추가 입력 단계를 생략한다. 표시용 metadata는 검증 후 이름에만 사용한다. 가입 요청 한도는 앱 전체 30회/시간, 이메일 HMAC별 3회/시간이며 service_role 전용 RPC로 제한한다. 공유 Auth 설정, 기존 사용자, 타 앱 객체는 변경하지 않는다.
- 같은 개발 프로젝트에 migration 적용 결과 `success: true`. 기록된 원격 버전으로 로컬 파일명을 정렬하고 적용 SQL과 동일함을 확인했다. DB 카탈로그에서 가입 제한 RPC의 anon/authenticated 실행 권한 없음, service_role 실행 가능, 계정 준비 함수 갱신을 확인했다. 실제 가입 계정은 만들지 않았으며 앱 계정 수는 0개다.
- 계정 화면에서 이메일 소유권을 검증했다는 문구를 제거하고 `.env.example`, AGENTS 및 제품/아키텍처/설치 문서를 갱신했다. [Supabase createUser 공식 문서](https://supabase.com/docs/reference/javascript/auth-admin-createuser)와 설치된 Next.js Server Function 가이드를 참고했다.
- **테스트 작성/실행·lint·typecheck·build·DB/E2E·React Doctor·브라우저 검증: NOT RUN — 사용자 지시.** 코드 읽기와 적용 메타데이터만 확인했다. 실제 새 가입·중복 가입·부분 성공 재로그인·요청 제한 동작은 미검증이다. commit/push/PR/병합/앱 배포 없음.
- 다음 확인은 사용자 재개 요청 시 실제 가입과 로그인 흐름이다. 기존 공유 Auth의 미확인 계정은 기존 서비스에서 처리해야 하며 이번 가입 경로가 자동 인수하지 않는다. 가입 요청 한도는 초기 개발 기준으로, 공개 운영 전 조정할 수 있다.

## P3 및 연결 작업 Git Flow 반영 — 2026-10-13 (KST)

- 사용자 요청으로 `feature/p3-community`의 변경을 커밋·푸시하고 develop 대상 PR 생성·병합·로컬 develop 동기화를 진행한다. 범위는 P3 커뮤니티, 공유 Supabase의 re_ 이름 적용과 원격 migration 기록, 간소화한 신규 가입 흐름이다.
- 원격 fetch 후 현재 HEAD와 origin/develop이 `1377422`로 일치하고 해당 기능 브랜치의 기존 PR이 없음을 확인했다. 로컬 환경 파일은 Git 무시 대상으로 유지한다.
- 기존 테스트 보류 지시를 유지한다. lint/typecheck/test/build/DB/E2E/React Doctor는 실행하지 않으며 PR에 NOT RUN으로 명시한다. 기존 원격 적용 및 DB 카탈로그 확인 기록은 기능 테스트 통과를 뜻하지 않는다.
- 이번 Git Flow는 develop 코드 통합이며 main 릴리스나 앱 배포는 포함하지 않는다. 병합 후 develop에서 마친다.

## P4 월간 어워즈 시작 — 2026-10-13 (KST)

- P3 PR #3 병합 커밋 `edb6740`을 fetch/fast-forward 확인하고 `feature/p4-monthly-awards`를 생성했다.
- 범위: 월간 행사 생성/공개/취소, 고정 버전 출품/철회, 후기 평가 스냅샷, 집계 준비/확정과 동점 처리, 공개 행사/명예의전당/수상 배지/알림, 관리자 행사 화면.
- 계정 가입 24시간은 레시피 앱의 `re_accounts.created_at` 기준으로 정한다. 가입 확인 메일은 사용자 지시대로 생략하며 추가 인증 단계를 도입하지 않는다.
- 테스트 작성/실행, lint/typecheck/build/DB/E2E/advisor/React Doctor/브라우저 QA는 계속 보류한다. 이번 새 기능 개발에서는 migration을 작성하며 원격 적용·commit/push/PR·앱 배포는 실행하지 않는다.

### P4 코드 반영 결과

- `src/features/awards/`: 입력/응답 스키마, 사용자 세션 Server Action, 공개·관리자 조회, 일정/규칙/출품 폼, 결과와 운영 화면 구성 요소를 추가했다. `/awards`, `/awards/[slug]`, `/hall-of-fame`, `/admin/awards`를 연결했다.
- 홈과 탐색 메뉴에 어워즈 진입점을 추가하고, 레시피 상세에 출품 버전의 평가 조건과 수상 배지, 공개 프로필에 수상 기록, 알림에 수상 발표 링크를 연결했다. 부가 어워즈 조회 실패 시 홈/레시피/프로필은 실패 안내를 표시하며 기존 기능을 유지한다.
- `20261013065520_re_monthly_awards.sql`: `re_` 공개 테이블 5개와 `re_private.re_award_run_inputs`를 추가한다. RLS를 켜고 직접 테이블 읽기/쓰기를 허용하지 않으며, 제한된 RPC가 공개/본인/관리자 정보를 각각 투영한다. 공개 RPC는 invoker, 실제 권한 검사는 private definer에 둔다. 이미 적용한 migration은 수정하지 않았다.
- 행사는 monthly-v1 고정 규칙과 한국 달력 월로 생성한다. 접수 시작 전 공개, 출품 시 최신 공개 버전 고정, 1인/1레시피당 월 1회, 접수 중 같은 버전 복구, 사유 있는 운영 제외/복구/취소를 구현했다. 계정 24시간은 앱 가입 시각 기준이며 새 인증 절차는 없다.
- P3 후기 쓰기 경로를 새 migration에서 교체한다. 공개 행사 ID 순 잠금 → 계정 → 레시피 → 후기/정렬된 사진 잠금 → 호출 제한 → 실제 DB 시각 순으로 처리한다. 최초 적격 후기만 평가를 생성하며 종료 전 별점 수정, 확정 전 삭제/철회, 마감 후 고정 별점 복원을 구분한다.
- 집계 입력은 run별 최소 JSONB manifest 한 행으로 저장한다. 본문/사진 없이 후보·평가 ID/별점/포함·제외 사유를 정렬해 규칙과 해시를 저장한다. NUMERIC 보정 점수와 `RANK()`의 1,1,3 공동순위를 사용한다. prepare/finalize는 행사 잠금, revision, 현재 자격 fingerprint, 저장 입력/결과 해시를 비교하며 낡은 집계는 CONFLICT다. 결과·수상 알림·감사 기록은 동일 트랜잭션이다.
- 확정 결과는 최신 레시피로 대체하지 않는다. 숨김·삭제 콘텐츠는 최소 기록으로 표시하고 수상 취소도 기존 점수/순위를 보존한다. P5의 향후 숨김·탈퇴·계정 운영 RPC 역시 행사 우선 잠금과 source_revision 갱신 규칙을 연결해야 한다.
- **테스트 작성/실행·lint·typecheck·build·DB/E2E·React Doctor·advisor·브라우저 QA·타입 생성: NOT RUN — 사용자 보류 지시.** 이번에는 소스를 작성하고 읽었으며 실행 성공이나 DB 문법·권한·동시성 검증을 주장하지 않는다.
- **원격 P4 적용·행사 생성·commit/push/PR·앱 배포 없음.** 실제 사용 전 P4 migration 적용이 필요하다. 관리자 계정 지정, 마감 대기 경쟁, 공동순위, 오래된 집계 거부, 중복 확정 알림, 공개/본인/관리자 정보 경계는 검증 재개 시 우선 확인한다.

## P4 Git Flow — 2026-10-14 (KST)

- 사용자 요청으로 `feature/p4-monthly-awards`의 P4 월간 어워즈 변경을 커밋·푸시하고 `develop` 대상 PR 생성·병합·로컬 `develop` 동기화를 진행한다.
- 원격 fetch 후 기준 커밋 `edb6740`과 `origin/develop`이 일치함을 확인했다. 기존 P4 PR은 없고 `.env.local`은 Git 무시 대상으로 유지한다.
- 범위는 월간 행사·출품·후기 평가 스냅샷·집계 준비/확정·공동수상·명예의전당·배지/알림·관리자 화면과 신규 P4 migration이다. 이미 원격에 적용한 migration은 변경하지 않는다.
- **lint/typecheck/test/build/DB/E2E/React Doctor/advisor/브라우저 검증: NOT RUN — 기존 사용자 보류 지시.** PR에도 미실행 상태를 명시한다. Git 상태 확인은 기능 검증을 뜻하지 않는다.
- **P4 원격 DB 적용·행사 생성·main 릴리스·앱 배포는 포함하지 않는다.** 실제 사용 전 P4 migration 적용이 필요하며, 병합 후 작업 브랜치는 `develop`으로 마친다.
