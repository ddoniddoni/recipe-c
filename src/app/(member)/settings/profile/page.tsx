import type { Metadata } from "next";
import { getPageViewer } from "@/features/auth/viewer";
import { MemberNotice } from "@/features/auth/components/member-notice";
import { ProfileForm } from "@/features/profiles/components/profile-form";

export const metadata: Metadata = { title: "프로필 설정" };
export default async function ProfileSettingsPage() {
  const viewer = await getPageViewer("/settings/profile");
  if (viewer.kind !== "member" || !viewer.account.email_verified || viewer.account.status !== "active") {
    return <MemberNotice viewer={viewer} />;
  }
  const account = viewer.account;
  return <section className="member-page settings-page">
    <header className="page-heading"><span className="eyebrow">나를 소개하는 공간</span>
      <h1>{account.profile_completed ? "프로필 수정" : "어떤 이름으로 만날까요?"}</h1>
      <p className="muted">함께 요리 이야기를 나눌 이름과 짧은 소개를 적어 주세요.</p>
    </header>
    <div className="member-card"><ProfileForm profile={{ handle: account.handle, displayName: account.display_name, bio: account.bio, completed: account.profile_completed }} /></div>
  </section>;
}
