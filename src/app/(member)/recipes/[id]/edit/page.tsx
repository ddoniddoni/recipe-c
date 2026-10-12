import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getPageViewer } from "@/features/auth/viewer";
import { MemberNotice } from "@/features/auth/components/member-notice";
import { getCategories, getRecipeDraft } from "@/features/recipes/queries";
import { RecipeEditor } from "@/features/recipes/components/recipe-editor";
import { getServerEnv } from "@/lib/env/server";

export const metadata: Metadata = { title: "레시피 편집", robots: { index: false, follow: false } };
export default async function EditRecipePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const viewer = await getPageViewer(`/recipes/${id}/edit`);
  if (viewer.kind !== "member" || !viewer.account.email_verified || viewer.account.status !== "active") return <MemberNotice viewer={viewer} />;
  if (!viewer.account.profile_completed) redirect("/settings/profile");
  const [draft, categories] = await Promise.all([getRecipeDraft(id), getCategories()]);
  if (!draft) notFound();
  return <section className="editor-page">
    <Link className="back-link" href="/me">← 내 레시피 노트</Link>
    <header className="page-heading"><p className="eyebrow">나의 레시피 노트</p><h1>{draft.currentVersionId ? "레시피 다듬기" : "레시피 쓰기"}</h1></header>
    <RecipeEditor key={draft.recipeId} draft={draft} categories={categories} uploadsEnabled={Boolean(getServerEnv().secretKey)} />
  </section>;
}
