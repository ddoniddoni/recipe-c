import Link from "next/link";
import { EmptyState } from "@/components/ui/states";
import { getMyRecipes } from "../queries";
import { Pagination } from "./pagination";

export async function MyRecipes({ page }: { page: number }) {
  const result = await getMyRecipes(page);
  if (!result) return null;
  return <section className="section-space" aria-labelledby="my-recipes-title">
    <div className="section-heading"><div><p className="eyebrow">계속 쓰고 싶은 한 끼</p><h2 id="my-recipes-title">내 레시피</h2></div><Link className="button button--primary" href="/recipes/new">+ 레시피 쓰기</Link></div>
    {result.items.length ? <ul className="my-recipe-list">{result.items.map((recipe) => <li key={recipe.id}>
      <div><span className="eyebrow">{recipe.status === "published" ? "발행됨 · 수정 초안" : "비공개 초안"}</span><h3><Link href={`/recipes/${recipe.id}/edit`}>{recipe.title || "제목 없는 레시피"}</Link></h3>
        <p className="field-hint">최근 저장 <time dateTime={recipe.updated_at}>{new Date(recipe.updated_at).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })}</time></p></div>
      <div className="editor-inline-actions">{recipe.current_version_id ? <Link className="text-link" href={`/recipes/${recipe.id}`}>공개 버전</Link> : null}<Link className="button button--secondary" href={`/recipes/${recipe.id}/edit`}>이어서 쓰기</Link></div>
    </li>)}</ul> : <EmptyState title="아직 작성한 레시피가 없어요"><p>나만의 요리법을 비공개 초안부터 시작해 보세요.</p></EmptyState>}
    <Pagination page={page} total={result.total} href={(next) => `/me?page=${next}`} />
  </section>;
}
