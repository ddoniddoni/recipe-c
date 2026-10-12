import type { Metadata } from "next";
import Link from "next/link";
import { getAppStatus } from "@/lib/env/server";
import { SetupNotice } from "@/components/layout/setup-notice";
import { TextField } from "@/components/ui/text-field";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/states";
import { getSampleRecipes } from "@/features/recipes/fixtures.server";
import {
  filterSampleRecipes,
  normalizeSampleQuery,
} from "@/features/recipes/search";
import { RecipeCard } from "@/features/recipes/components/recipe-card";
import { RecipeCatalog } from "@/features/recipes/components/recipe-catalog";
import { parseRecipeSearch } from "@/features/recipes/search";

export const metadata: Metadata = { title: "레시피 탐색" };

export default async function RecipesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const status = getAppStatus();
  const params = await searchParams;
  const query = normalizeSampleQuery(params.q);
  const recipes = status.demoMode
    ? filterSampleRecipes(getSampleRecipes(), query)
    : [];
  return (
    <>
      <div className="page-heading">
        <p className="eyebrow">레시피 노트</p>
        <h1>오늘은 무엇을 만들까요?</h1>
        <p>
          {status.demoMode
            ? "제목이나 재료로 샘플 레시피를 찾아보세요."
            : "제목과 재료로, 오늘 만들고 싶은 요리를 찾아보세요."}
        </p>
      </div>
      {status.demoMode ? (
        <>
          <form
            action="/recipes"
            method="get"
            role="search"
            className="search-form"
          >
            <TextField
              key={query}
              id="recipe-search"
              name="q"
              label="샘플 레시피 검색"
              type="search"
              defaultValue={query}
              maxLength={80}
              placeholder="토마토, 달걀, 버섯…"
              hint="샘플의 제목과 재료만 검색해요."
            />
            <Button type="submit">검색</Button>
          </form>
          <div className="results-heading">
            <h2>{query ? `‘${query}’ 검색 결과` : "전체 샘플"}</h2>
            <span className="muted">샘플 {recipes.length}개</span>
            {query ? (
              <Link className="text-link" href="/recipes">
                검색 초기화
              </Link>
            ) : null}
          </div>
          {recipes.length ? (
            <div className="recipe-grid">
              {recipes.map((recipe) => (
                <RecipeCard key={recipe.id} recipe={recipe} />
              ))}
            </div>
          ) : (
            <EmptyState
              title="일치하는 샘플이 없어요"
              action={
                <Link className="button button--secondary" href="/recipes">
                  전체 샘플 보기
                </Link>
              }
            >
              <p>다른 제목이나 재료 이름으로 검색해 보세요.</p>
            </EmptyState>
          )}
        </>
      ) : status.hasSupabaseConfig ? <RecipeCatalog search={parseRecipeSearch(params)} /> : (
        <SetupNotice hasSupabaseConfig={status.hasSupabaseConfig} />
      )}
    </>
  );
}
