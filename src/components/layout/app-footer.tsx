import Link from "next/link";

export function AppFooter({ demoMode }: { demoMode: boolean }) {
  return (
    <footer className="app-footer container">
      <p>한 끼의 경험이 모이는 곳, 레시피 어워즈.</p>
      <div>
        <span>개발 중인 서비스입니다.</span>
        {demoMode ? <Link href="/dev/ui">공통 UI 점검</Link> : null}
      </div>
    </footer>
  );
}
