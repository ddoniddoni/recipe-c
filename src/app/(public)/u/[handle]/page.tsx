import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { EmptyState } from "@/components/ui/states";
import { searchRecipes } from "@/features/recipes/queries";
import { parseRecipeSearch } from "@/features/recipes/search";
import { PublishedRecipeCard } from "@/features/recipes/components/published-recipe-card";
import { Pagination } from "@/features/recipes/components/pagination";

export const metadata: Metadata = { title: "요리사 프로필" };
export default async function PublicProfilePage({ params, searchParams }: { params: Promise<{ handle: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { handle } = await params;
  if (!/^[a-z0-9_]{3,24}$/.test(handle)) notFound();
  const supabase = await createSupabaseServerClient();
  if (!supabase) return <EmptyState title="프로필 공간을 준비하고 있어요"><p>아직 데이터 서비스가 연결되지 않았어요.</p></EmptyState>;
  const { data, error } = await supabase.from("profiles").select("id, handle, display_name, bio")
    .eq("handle", handle).eq("visibility_status", "active").maybeSingle();
  if (error) return <EmptyState title="프로필을 불러오지 못했어요"><p>잠시 후 다시 시도해 주세요.</p></EmptyState>;
  if (!data) notFound();
  const search = parseRecipeSearch(await searchParams);
  const recipes = await searchRecipes({ ...parseRecipeSearch({}), page: search.page }, data.id);
  return <section className="member-page">
    <header className="page-heading"><span className="eyebrow">요리사 프로필</span><h1>{data.display_name}</h1><p className="muted">@{data.handle}</p></header>
    <article className="member-card"><h2>짧은 소개</h2><p className="profile-bio">{data.bio || "아직 소개를 작성하지 않았어요."}</p></article>
    <section className="section-space"><h2>공개 레시피</h2>
      {recipes?.items.length ? <div className="recipe-grid">{recipes.items.map((recipe) => <PublishedRecipeCard key={recipe.id} recipe={recipe} />)}</div>
        : <EmptyState title="아직 공개한 레시피가 없어요"><p>레시피가 발행되면 이곳에서 볼 수 있어요.</p></EmptyState>}
      <Pagination page={search.page} total={recipes?.total ?? 0} href={(page) => `/u/${handle}?page=${page}`} />
    </section>
  </section>;
}
