import Link from "next/link";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/states";
import { getCategories, searchRecipes } from "../queries";
import { difficultyLabels } from "../schemas";
import { recipeSearchHref, type RecipeSearch } from "../search";
import { PublishedRecipeCard } from "./published-recipe-card";
import { Pagination } from "./pagination";

export async function RecipeCatalog({ search }: { search: RecipeSearch }) {
  const [categories, result] = await Promise.all([getCategories(), searchRecipes(search)]);
  if (!result) return <EmptyState title="레시피 공간을 준비하고 있어요"><p>저장 서비스가 연결되면 레시피를 볼 수 있어요.</p></EmptyState>;
  return <>
    <form action="/recipes" method="get" role="search" className="catalog-search" key={recipeSearchHref(search, search.page)}>
      <div className="field catalog-query"><label htmlFor="search-query">제목·재료 검색</label><input id="search-query" type="search" name="q" maxLength={80} defaultValue={search.q} placeholder="김치, 달걀, 버섯…" /></div>
      <div className="field"><label htmlFor="search-category">카테고리</label><select name="category" id="search-category" defaultValue={search.category}><option value="">전체</option>{categories.map((c) => <option key={c.id} value={c.slug}>{c.name}</option>)}</select></div>
      <div className="field"><label htmlFor="search-minutes">최대 소요 시간</label><input id="search-minutes" name="maxMinutes" type="number" min={1} max={1440} defaultValue={search.maxMinutes === 1440 ? "" : search.maxMinutes} placeholder="분 / 제한 없음" /></div>
      <div className="field"><label htmlFor="search-difficulty">난이도</label><select name="difficulty" id="search-difficulty" defaultValue={search.difficulty}><option value="">전체</option>{Object.entries(difficultyLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></div>
      <div className="field"><label htmlFor="search-sort">정렬</label><select name="sort" id="search-sort" defaultValue={search.sort}><option value="newest">최신 발행순</option><option value="rating">평점순</option><option value="reviews">후기 많은 순</option><option value="saved">저장 많은 순</option></select></div><Button type="submit">검색</Button>
    </form>
    {search.sort === "rating" ? <p className="field-hint">평점순은 현재 버전 후기의 평균과 개수를 보정한 점수로 정렬해요: (별점 합 + 3.5 × 5) ÷ (후기 수 + 5). 후기가 없으면 마지막에 표시해요. 월간 어워즈 순위와는 별개예요.</p> : null}
    <div className="results-heading"><h2>{search.q ? `‘${search.q}’ 검색 결과` : "레시피 노트"}</h2><span className="muted">{result.total}개</span><Link className="text-link" href="/recipes">검색 초기화</Link></div>
    {result.items.length ? <div className="recipe-grid">{result.items.map((recipe) => <PublishedRecipeCard key={recipe.id} recipe={recipe} />)}</div>
      : <EmptyState title={result.total ? "이 페이지에는 레시피가 없어요" : "아직 이곳에 레시피가 없어요"}
        action={result.total ? <Link className="button button--secondary" href={recipeSearchHref(search, 1)}>첫 페이지로</Link> : <Link className="button button--secondary" href="/recipes/new">첫 레시피 쓰기</Link>}>
        <p>{result.total ? "이전 페이지나 첫 페이지에서 레시피를 찾아보세요." : "검색 조건을 바꾸거나, 나만의 요리법을 나눠 주세요."}</p></EmptyState>}
    <Pagination page={search.page} total={result.total} href={(page) => recipeSearchHref(search, page)} />
    {result.total > 1200 ? <p className="field-hint">처음 100페이지까지 볼 수 있어요. 검색 조건을 좁혀 주세요.</p> : null}
  </>;
}
