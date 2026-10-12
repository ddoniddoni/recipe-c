import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getPageViewer } from "@/features/auth/viewer";
import { MemberNotice } from "@/features/auth/components/member-notice";

export const metadata: Metadata = { title: "내 공간" };
export default async function MyPage() {
  const viewer = await getPageViewer("/me");
  if (viewer.kind !== "member" || !viewer.account.email_verified || viewer.account.status !== "active") {
    return <MemberNotice viewer={viewer} />;
  }
  const { account } = viewer;
  if (!account.profile_completed) redirect("/settings/profile");
  return <section className="member-page">
    <header className="page-heading">
      <span className="eyebrow">나의 레시피 노트</span>
      <h1>{account.display_name}님의 공간</h1>
      <p className="muted">내 소개를 다듬고 계정 정보를 관리하세요.</p>
    </header>
    <div className="member-grid">
      <article className="member-card">
        <span className="profile-monogram" aria-hidden="true">{Array.from(account.display_name)[0]}</span>
        <h2>{account.display_name}</h2>
        <p className="muted">@{account.handle}</p>
        {account.bio ? <p className="profile-bio">{account.bio}</p> : <p className="muted">좋아하는 요리를 소개해 보세요.</p>}
        <div className="auth-links"><Link href={`/u/${account.handle}`}>공개 프로필 보기</Link><Link href="/settings/profile">프로필 수정</Link></div>
      </article>
      <article className="member-card">
        <span className="eyebrow">계정</span>
        <h2>이메일과 로그인 관리</h2>
        <p className="account-email">{viewer.email}</p>
        <p className="muted">이메일 확인을 마쳤어요.</p>
        <Link className="text-link" href="/settings">계정 설정으로</Link>
      </article>
    </div>
    <div className="member-coming-soon"><h2>레시피 노트를 준비하고 있어요</h2><p>레시피 작성과 저장 기능은 준비 중이에요. 사용할 수 있게 되면 이곳에서 내 레시피를 모아 볼 수 있어요.</p></div>
  </section>;
}
