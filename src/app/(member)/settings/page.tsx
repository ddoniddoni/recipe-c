import type { Metadata } from "next";
import Link from "next/link";
import { getPageViewer } from "@/features/auth/viewer";
import { MemberNotice } from "@/features/auth/components/member-notice";
import { LogoutButton } from "@/features/auth/components/logout-button";

export const metadata: Metadata = { title: "계정 설정" };
export default async function SettingsPage() {
  const viewer = await getPageViewer("/settings");
  if (viewer.kind !== "member") return <MemberNotice viewer={viewer} />;
  return <section className="member-page settings-page">
    <header className="page-heading"><span className="eyebrow">나의 계정</span><h1>계정 설정</h1></header>
    <div className="member-card">
      <h2>이메일</h2><p className="account-email">{viewer.email}</p>
      <p className="muted">로그인에 사용하는 이메일이에요.</p>
      {viewer.account.status !== "active" ? <p className="field-error">현재 계정은 콘텐츠 작성과 프로필 수정이 제한되어 있어요.</p> : null}
      <div className="auth-links">
        {viewer.account.email_verified && viewer.account.status === "active" ? <Link href="/settings/profile">프로필 설정</Link> : null}
        <Link href="/forgot-password">비밀번호 재설정 메일 받기</Link>
      </div>
      <LogoutButton />
    </div>
  </section>;
}
