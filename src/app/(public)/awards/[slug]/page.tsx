import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getViewer } from "@/features/auth/viewer";
import { EmptyState } from "@/components/ui/states";
import { Pagination } from "@/features/recipes/components/pagination";
import { pageNumber } from "@/features/community/schemas";
import { getAward } from "@/features/awards/queries";
import { phaseLabels } from "@/features/awards/schemas";
import { AwardSchedule, AwardRules, AwardEntryCard, AwardResults } from "@/features/awards/components/award-display";
import { EntryForm } from "@/features/awards/components/award-forms";

export const metadata: Metadata = { title: "월간 행사" };
export default async function AwardPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { slug } = await params;
  if (!/^[a-z0-9][a-z0-9-]{2,59}$/.test(slug)) notFound();
  const query = await searchParams;
  const page = pageNumber(query.page), ownPage = pageNumber(query.ownPage);
  const [data, viewer] = await Promise.all([getAward(slug, page, ownPage), getViewer()]);
  if (!data) notFound();
  const { period } = data;
  return <section className="awards-page"><header className="page-heading award-heading"><Link className="text-link" href="/awards">← 월간 어워즈</Link><p className="eyebrow">{period.month.slice(0, 7)} · {phaseLabels[period.phase]}</p><h1>{period.title}</h1><p className="award-theme">{period.theme}</p></header>
    {period.state === "cancelled" ? <p className="version-notice">취소된 행사예요. 출품과 평가를 진행하지 않으며 수상 결과를 발표하지 않아요.</p> : null}
    <p className="field-hint">아래 일정은 모두 한국 시간이에요. 마감 시각부터는 접수·평가가 종료돼요.</p><AwardSchedule period={period} /><AwardRules period={period} />
    <EntryForm key={`${period.id}:${data.ownEntry?.status ?? "none"}`} data={data} signedIn={viewer.kind === "member"} />
    {period.phase === "submission" && !data.ownEntry ? <Pagination page={ownPage} total={data.ownRecipeTotal} href={(p) => `/awards/${slug}?page=${page}&ownPage=${p}#my-entry-title`} /> : null}
    {period.state === "finalized" ? <section className="section-space" id="results"><div className="section-heading"><h2>확정된 결과</h2><Link className="text-link" href="/hall-of-fame">명예의전당 →</Link></div><p className="field-hint">공동 순위가 있을 수 있어요. 표시 점수는 소수 넷째 자리로 반올림하며, 순위 계산에는 반올림 전 점수를 사용해요.</p>
      <AwardResults results={data.results} /><Pagination page={page} total={data.resultTotal} href={(p) => `/awards/${slug}?page=${p}#results`} /></section>
      : <section className="section-space" id="entries"><div className="section-heading"><h2>함께 만드는 출품작</h2><span>{data.entryTotal}개</span></div><p className="field-hint">출품 버전을 열어 요리해 보세요. 목록 순서는 한국 날짜마다 바뀌며 평가 점수순이 아니에요.</p>
        {data.entries.length ? <div className="recipe-grid">{data.entries.map((entry) => <AwardEntryCard key={entry.id} entry={entry} />)}</div> : <EmptyState title="이 페이지에 공개된 출품작이 없어요"><p>접수 기간에 등록된 출품작을 이곳에서 만날 수 있어요.</p></EmptyState>}
        <Pagination page={page} total={data.entryTotal} href={(p) => `/awards/${slug}?page=${p}&ownPage=${ownPage}#entries`} /></section>}
  </section>;
}
