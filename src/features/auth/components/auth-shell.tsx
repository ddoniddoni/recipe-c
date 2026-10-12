import Link from "next/link";

export function AuthShell({ title, description, children }: {
  title: string; description: string; children: React.ReactNode;
}) {
  return (
    <section className="auth-layout" aria-labelledby="auth-title">
      <aside className="auth-note">
        <span className="eyebrow">나의 레시피 노트</span>
        <h2>다음 한 끼를 <br />함께 만들어 가요.</h2>
        <p>내 요리법을 기록하고, 다른 사람의 한 끼에서 새로운 아이디어를 만나세요.</p>
        <Link className="text-link" href="/recipes">레시피 공간 둘러보기 <span aria-hidden="true">↗</span></Link>
      </aside>
      <div className="auth-panel">
        <header className="auth-heading">
          <h1 id="auth-title">{title}</h1>
          <p className="muted">{description}</p>
        </header>
        {children}
      </div>
    </section>
  );
}
