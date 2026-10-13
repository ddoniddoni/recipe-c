import type { Metadata } from "next";
import Link from "next/link";
import { z } from "zod";
import { EmptyState } from "@/components/ui/states";
import { Pagination } from "@/features/recipes/components/pagination";
import { pageNumber } from "@/features/community/schemas";
import { getAwards } from "@/features/awards/queries";
import { AwardResults } from "@/features/awards/components/award-display";

export const metadata: Metadata = { title: "명예의전당" };
export default async function HallOfFamePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const query = await searchParams;
  const page = pageNumber(query.page);
  const author = z.string().uuid().safeParse(query.author), recipe = z.string().uuid().safeParse(query.recipe);
  const filters = { ...(author.success ? { author: author.data } : {}), ...(recipe.success ? { recipe: recipe.data } : {}) };
  const data = await getAwards(page, filters);
  const href = (p: number) => `/hall-of-fame?${new URLSearchParams({ page: String(p), ...filters })}`;
  return <section className="awards-page"><header className="page-heading award-heading"><span className="eyebrow">함께 만든 한 달의 기록</span><h1>명예의전당</h1><p>출품 당시의 레시피와 확정된 평가를 기억해요.</p><Link className="text-link" href="/awards">월간 행사 둘러보기 →</Link></header>
    {author.success || recipe.success ? <p className="version-notice">선택한 요리사 또는 레시피의 수상 기록이에요. <Link className="text-link" href="/hall-of-fame">전체 기록 보기</Link></p> : null}
    {data?.results.length ? data.results.map((result) => <section className="award-hall-entry" key={`${result.period.id}:${result.entryId}`}><h2><Link className="text-link" href={`/awards/${result.period.slug}`}>{result.period.title}</Link></h2><AwardResults results={[result]} /></section>)
      : <EmptyState title={data ? "이 페이지에는 수상 기록이 없어요" : "명예의전당 연결을 준비하고 있어요"}><p>검토를 거쳐 확정된 금상·은상·동상 기록이 이곳에 모여요.</p></EmptyState>}
    <Pagination page={page} total={data?.resultTotal ?? 0} href={href} />
  </section>;
}
