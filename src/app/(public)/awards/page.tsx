import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState } from "@/components/ui/states";
import { Pagination } from "@/features/recipes/components/pagination";
import { pageNumber } from "@/features/community/schemas";
import { getAwards } from "@/features/awards/queries";
import { PeriodCard } from "@/features/awards/components/award-display";

export const metadata: Metadata = { title: "월간 어워즈" };
export default async function AwardsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const page = pageNumber((await searchParams).page);
  const data = await getAwards(page);
  return <section className="awards-page"><header className="page-heading award-heading"><span className="eyebrow">한 달의 식탁을 함께 기억해요</span><h1>월간 어워즈</h1><p>나만의 레시피를 소개하고, 직접 만든 한 끼의 후기로 함께 골라요.</p><Link className="text-link" href="/hall-of-fame">지난 수상작 · 명예의전당 →</Link></header>
    <p className="version-notice">출품과 참여는 무료예요. 일반 댓글은 평가에 반영되지 않으며, 출품 버전에 등록한 사진 후기 중 조건을 충족한 후기만 집계해요.</p>
    {data?.periods.length ? <div className="award-period-grid">{data.periods.map((period) => <PeriodCard key={period.id} period={period} />)}</div>
      : <EmptyState title={data ? "아직 공개된 행사가 없어요" : "어워즈 연결을 준비하고 있어요"}><p>{data ? "행사 일정과 주제가 공개되면 이곳에서 안내할게요." : "서비스 연결 후 행사 일정을 확인할 수 있어요."}</p></EmptyState>}
    <Pagination page={page} total={data?.periodTotal ?? 0} href={(p) => `/awards?page=${p}`} />
  </section>;
}
