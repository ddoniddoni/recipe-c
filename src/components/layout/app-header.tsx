import Link from "next/link";
import { Navigation } from "./navigation";
import { getViewer } from "@/features/auth/viewer";

export async function AppHeader({ demoMode }: { demoMode: boolean }) {
  const viewer = await getViewer();
  return (
    <>
      {demoMode ? (
        <div className="demo-banner">
          <div className="container">
            <strong>샘플 데이터</strong>
            <span>개발용 미리보기 · 로그인과 저장은 제공하지 않아요.</span>
          </div>
        </div>
      ) : null}
      <header className="app-header">
        <div className="container header-inner">
          <Link href="/" className="brand" aria-label="레시피 어워즈 홈">
            <span className="brand-mark" aria-hidden="true">
              r.
            </span>
            레시피 어워즈<span className="brand-caption">가칭</span>
          </Link>
          <Navigation />
          {demoMode ? <span className="phase-label">개발 샘플</span> : <div className="header-actions">{viewer.kind === "member" ? <Link className="account-link" href="/notifications">알림</Link> : null}<Link className="write-link" href="/recipes/new">레시피 쓰기</Link><Link className="account-link"
            href={viewer.kind === "member" ? "/me" : "/login"}>
            {viewer.kind === "member" ? "내 공간" : "로그인"}
          </Link></div>}
        </div>
      </header>
    </>
  );
}
