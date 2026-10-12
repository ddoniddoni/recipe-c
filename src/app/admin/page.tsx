import { notFound } from "next/navigation";
import { getPageViewer } from "@/features/auth/viewer";
import { MemberNotice } from "@/features/auth/components/member-notice";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function AdminPage() {
  const viewer = await getPageViewer("/me");
  if (viewer.kind !== "member") return <MemberNotice viewer={viewer} />;
  const supabase = await createSupabaseServerClient();
  if (!supabase) notFound();
  // Fresh Auth user + DB role/status/session check; metadata never grants access.
  const { data: current, error: userError } = await supabase.auth.getUser();
  if (userError || !current.user) notFound();
  const { data: isAdmin, error } = await supabase.rpc("check_admin_access");
  if (error || !isAdmin) notFound();
  return <section className="member-page">
    <header className="page-heading"><span className="eyebrow">관리자 전용</span><h1>운영 공간</h1></header>
    <div className="member-card"><h2>관리자 접근 권한을 확인했어요</h2><p>신고 처리와 행사 운영 기능은 후속 단계에서 제공해요.</p></div>
  </section>;
}
