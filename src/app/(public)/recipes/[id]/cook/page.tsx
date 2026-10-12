import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getRecipeDetail } from "@/features/recipes/queries";
import { RecipeReading } from "@/features/recipes/components/recipe-reading";
import { EmptyState } from "@/components/ui/states";
import { getAppStatus } from "@/lib/env/server";

export const metadata: Metadata = { title: "조리 보기" };
export default async function CookPage({ params, searchParams }: {
  params: Promise<{ id: string }>; searchParams: Promise<{ version?: string | string[] }>;
}) {
  const status = getAppStatus();
  if (!status.hasSupabaseConfig || status.demoMode) return <EmptyState title="조리 보기를 준비하고 있어요"><p>연결된 레시피가 있을 때 이용할 수 있어요.</p></EmptyState>;
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const versionId = Array.isArray(query.version) ? query.version[0] : query.version;
  const recipe = await getRecipeDetail(id, versionId);
  if (!recipe) notFound();
  return <section className="cook-page">
    <Link className="back-link" href={`/recipes/${id}?version=${recipe.card.versionId}`}>← 레시피 전체 보기</Link>
    <header className="page-heading"><p className="eyebrow">조리 보기 · v{recipe.card.versionNo}</p><h1>{recipe.card.title}</h1><p>준비 {recipe.body.prepMinutes}분 · 조리 {recipe.body.cookMinutes}분</p></header>
    <RecipeReading key={recipe.card.versionId} body={recipe.body} cookMode />
  </section>;
}
