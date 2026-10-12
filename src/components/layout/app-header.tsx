import Link from "next/link";
import { Navigation } from "./navigation";

export function AppHeader({ demoMode }: { demoMode: boolean }) {
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
          <span className="phase-label">P0 · 준비 중</span>
        </div>
      </header>
    </>
  );
}
