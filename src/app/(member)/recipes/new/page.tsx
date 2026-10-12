import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getPageViewer } from "@/features/auth/viewer";
import { MemberNotice } from "@/features/auth/components/member-notice";
import { NewRecipeButton } from "@/features/recipes/components/new-recipe-button";

export const metadata: Metadata = { title: "레시피 쓰기", robots: { index: false, follow: false } };
export default async function NewRecipePage() {
  const viewer = await getPageViewer("/recipes/new");
  if (viewer.kind !== "member" || !viewer.account.email_verified || viewer.account.status !== "active") return <MemberNotice viewer={viewer} />;
  if (!viewer.account.profile_completed) redirect("/settings/profile");
  return <section className="recipe-start">
    <Link className="back-link" href="/me">← 내 레시피 노트</Link>
    <header className="page-heading"><p className="eyebrow">새로운 한 끼의 기록</p><h1>나만의 요리법을<br />한 장씩 채워 보세요.</h1><p>우선 나만 볼 수 있는 초안을 만들어요. 준비가 되면 공개할 수 있어요.</p></header>
    <ol className="recipe-start-steps"><li><strong>기본 정보와 완성 사진</strong><span>요리의 맛과 특징을 소개해요.</span></li><li><strong>재료와 만드는 순서</strong><span>다른 사람도 따라 할 수 있게 적어요.</span></li><li><strong>저장하고, 미리보고, 발행</strong><span>미완성 초안은 내 공간에서 이어 쓸 수 있어요.</span></li></ol>
    <NewRecipeButton />
  </section>;
}
