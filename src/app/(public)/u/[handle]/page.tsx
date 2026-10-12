import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { EmptyState } from "@/components/ui/states";

export const metadata: Metadata = { title: "요리사 프로필" };
export default async function PublicProfilePage({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  if (!/^[a-z0-9_]{3,24}$/.test(handle)) notFound();
  const supabase = await createSupabaseServerClient();
  if (!supabase) return <EmptyState title="프로필 공간을 준비하고 있어요"><p>아직 데이터 서비스가 연결되지 않았어요.</p></EmptyState>;
  const { data, error } = await supabase.from("profiles").select("handle, display_name, bio")
    .eq("handle", handle).eq("visibility_status", "active").maybeSingle();
  if (error) return <EmptyState title="프로필을 불러오지 못했어요"><p>잠시 후 다시 시도해 주세요.</p></EmptyState>;
  if (!data) notFound();
  return <section className="member-page settings-page">
    <header className="page-heading"><span className="eyebrow">요리사 프로필</span><h1>{data.display_name}</h1><p className="muted">@{data.handle}</p></header>
    <article className="member-card"><h2>짧은 소개</h2><p className="profile-bio">{data.bio || "아직 소개를 작성하지 않았어요."}</p></article>
    <div className="member-coming-soon"><p>레시피와 요리 후기 모아보기는 준비 중이에요.</p></div>
  </section>;
}
