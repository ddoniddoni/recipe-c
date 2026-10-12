import Link from "next/link";
import { EmptyState } from "@/components/ui/states";
import { getRecentlyReviewedRecipes } from "@/features/community/queries";
import { searchRecipes } from "../queries";
import { parseRecipeSearch } from "../search";
import { PublishedRecipeCard } from "./published-recipe-card";

export async function LatestRecipes() {
  const [result, reviewed] = await Promise.all([searchRecipes(parseRecipeSearch({})), getRecentlyReviewedRecipes()]);
  return <>
    {reviewed?.length ? <section className="section-space"><div className="section-heading"><div><p className="eyebrow">누군가의 식탁에 오른 요리</p><h2>최근 후기가 도착했어요</h2></div></div>
      <div className="recipe-grid">{reviewed.map((recipe) => <PublishedRecipeCard key={recipe.id} recipe={recipe} />)}</div>
    </section> : null}
    <section className="section-space" aria-labelledby="recipes-title">
    <div className="section-heading"><div><p className="eyebrow">새로 펼친 요리 노트</p><h2 id="recipes-title">새 레시피</h2></div><Link className="text-link" href="/recipes">모두 보기 →</Link></div>
    {result?.items.length ? <div className="recipe-grid">{result.items.slice(0, 3).map((recipe) => <PublishedRecipeCard key={recipe.id} recipe={recipe} />)}</div>
      : <EmptyState title="첫 요리 노트를 기다리고 있어요" action={<Link className="button button--primary" href="/recipes/new">레시피 쓰기</Link>}><p>기억하고 싶은 한 끼의 요리법을 나눠 주세요.</p></EmptyState>}
  </section></>;
}
