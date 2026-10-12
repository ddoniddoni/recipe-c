import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getAppStatus } from "@/lib/env/server";
import { SetupNotice } from "@/components/layout/setup-notice";
import { getSampleRecipes } from "@/features/recipes/fixtures.server";
import { RecipeVisual } from "@/features/recipes/components/recipe-visual";
import {
  RecipeMeta,
  RatingSummary,
} from "@/features/recipes/components/recipe-card";
import {
  IngredientList,
  StepList,
} from "@/features/recipes/components/recipe-content";
import { PublishedRecipeDetail } from "@/features/recipes/components/published-recipe-detail";

import { parseCommunitySearch } from "@/features/community/schemas";

export const metadata: Metadata = { title: "레시피 상세" };

export default async function RecipePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const status = getAppStatus();
  if (!status.demoMode && status.hasSupabaseConfig) {
    const [{ id }, query] = await Promise.all([params, searchParams]);
    return <PublishedRecipeDetail id={id} communitySearch={parseCommunitySearch(query)} versionId={Array.isArray(query.version) ? query.version[0] : query.version} />;
  }
  if (!status.demoMode)
    return (
      <>
        <h1 className="page-heading">레시피 상세</h1>
        <SetupNotice hasSupabaseConfig={status.hasSupabaseConfig} />
      </>
    );
  const { id } = await params;
  const recipe = getSampleRecipes().find((item) => item.id === id);
  if (!recipe) notFound();
  return (
    <div className="recipe-detail">
      <Link className="back-link" href="/recipes">
        ← 샘플 목록으로
      </Link>
      <div className="detail-heading">
        <div>
          <p className="eyebrow">{recipe.category} · 샘플 v1</p>
          <h1>{recipe.title}</h1>
          <p className="detail-summary">{recipe.summary}</p>
          <p className="recipe-author">{recipe.author}</p>
          <RecipeMeta recipe={recipe} />
          <RatingSummary />
        </div>
        <RecipeVisual tone={recipe.tone} large />
      </div>
      <div className="detail-columns">
        <IngredientList recipe={recipe} />
        <div>
          <StepList steps={recipe.steps} />
          <aside className="recipe-tip">
            <h2>작은 조리 팁</h2>
            <p>{recipe.tip}</p>
          </aside>
        </div>
      </div>
      <section
        className="discussion-placeholder"
        aria-labelledby="reviews-title"
      >
        <h2 id="reviews-title">요리 사진 후기와 의견</h2>
        <p>샘플에는 실제 후기와 댓글이 없어요.</p>
        <p className="muted">
          사진을 첨부한 요리 후기에만 별점이 있어요. 일반 댓글은 평점에 반영되지
          않아요.
        </p>
      </section>
    </div>
  );
}
