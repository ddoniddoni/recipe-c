import Link from "next/link";
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
  const { data: isAdmin, error } = await supabase.rpc("re_check_admin_access");
  if (error || !isAdmin) notFound();
  return <section className="member-page">
    <header className="page-heading"><span className="eyebrow">관리자 전용</span><h1>운영 공간</h1></header>
    <div className="member-card"><h2>월간 어워즈</h2><p>행사를 공개하고 출품·평가를 검토한 뒤 수상 결과를 확정해요.</p><Link className="button button--primary" href="/admin/awards">월간 행사 운영</Link></div>
  </section>;
}
