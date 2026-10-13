import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { getPageViewer } from "@/features/auth/viewer";
import { MemberNotice } from "@/features/auth/components/member-notice";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Pagination } from "@/features/recipes/components/pagination";
import { pageNumber } from "@/features/community/schemas";
import { getAdminAward, getAdminAwards } from "@/features/awards/queries";
import { AwardRules, AwardSchedule, AwardResults, PeriodCard, awardDate } from "@/features/awards/components/award-display";
import { CreatePeriodForm, PeriodControls, ReasonAction } from "@/features/awards/components/award-forms";

export const metadata: Metadata = { title: "월간 행사 운영", robots: { index: false, follow: false } };
const reasons: Record<string, string> = { included: "포함", withdrawn: "철회", disqualified: "출품 제외", excluded: "평가 제외", content_unavailable: "비공개 콘텐츠", author_ineligible: "출품자 자격 미충족", reviewer_ineligible: "평가자 자격 미충족", review_unavailable: "비공개 후기", photo_unavailable: "사진 조건 미충족" };
export default async function AdminAwardsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const viewer = await getPageViewer("/admin/awards");
  if (viewer.kind !== "member") return <MemberNotice viewer={viewer} />;
  const db = await createSupabaseServerClient();
  if (!db) notFound();
  const { data: auth, error: authError } = await db.auth.getUser();
  if (authError || !auth.user) notFound();
  const { data: admin, error } = await db.rpc("re_check_admin_access");
  if (error || !admin) notFound();
  const query = await searchParams;
  const page = pageNumber(query.page);
  const id = z.string().uuid().safeParse(query.period), runId = z.string().uuid().safeParse(query.run);
  if (query.period && !id.success) notFound();
  if (!id.success) {
    const data = await getAdminAwards(page);
    return <section className="awards-page"><header className="page-heading"><p className="eyebrow">관리자 전용</p><h1>월간 행사 운영</h1></header><CreatePeriodForm />
      <div className="award-period-grid">{data?.periods.map((period) => <PeriodCard key={period.id} period={period} admin />)}</div>
      {!data?.periods.length ? <p>생성된 행사가 없어요.</p> : null}<Pagination page={page} total={data?.total ?? 0} href={(p) => `/admin/awards?page=${p}`} /></section>;
  }
  const data = await getAdminAward(id.data, page, runId.success ? runId.data : undefined);
  if (!data) notFound();
  const { period, run } = data;
  const href = (p: number) => `/admin/awards?${new URLSearchParams({ period: period.id, page: String(p), ...(run ? { run: run.id } : {}) })}`;
  return <section className="awards-page"><header className="page-heading"><Link className="text-link" href="/admin/awards">← 행사 운영 목록</Link><h1>{period.title}</h1><p className="award-theme">{period.theme}</p><p>입력 리비전 {period.revision}</p>{period.state !== "draft" ? <Link className="text-link" href={`/awards/${period.slug}`}>공개 행사 화면 →</Link> : null}</header>
    <AwardSchedule period={period} /><AwardRules period={period} /><PeriodControls key={`${period.id}:${run?.id}`} period={period} run={run} />
    {period.state !== "finalized" && period.state !== "cancelled" ? <ReasonAction periodId={period.id} operation="cancel" label="행사 취소" /> : null}
    <section className="section-space"><h2>{run?.status === "finalized" ? "확정 집계" : "집계 미리보기"}</h2>
      {run ? <><p>집계 생성: {awardDate(run.preparedAt)} · 리비전 {run.revision}</p><p className="field-hint award-hash">집계 ID {run.id}<br />입력 해시 {run.inputHash}</p><AwardResults results={data.results} final={run.status === "finalized"} />
        <Pagination page={page} total={data.resultTotal} href={href} />
        {period.state === "finalized" && run.id === period.finalRunId ? data.results.filter((r) => r.visibility !== "revoked").map((r) => <ReasonAction key={r.entryId} periodId={period.id} operation="revoke" targetId={r.entryId} label={`${r.rank}위 수상 취소: ${r.entry?.title ?? "비공개 콘텐츠"}`} />) : null}
        <h3>집계 입력과 제외 내역</h3><p className="field-hint">원문과 사진은 집계 사본에 저장하지 않아요. 유효 후기 5개 미만이면 순위에서 제외돼요.</p><ul className="award-admin-list">{data.inputs.map((input) => <li key={input.entryId}><code>{input.entryId}</code><p>{reasons[input.reason] ?? input.reason} · 유효 후기 {input.includedCount}개</p>{input.excludedReasons.map((r) => <p key={r.reason}>{reasons[r.reason] ?? r.reason}: {r.count}개</p>)}</li>)}</ul>
        <Pagination page={page} total={data.entryTotal} href={href} />
      </> : <p>평가 마감 후 미리보기를 만들 수 있어요. 결과 확정은 {awardDate(period.finalizeNotBefore)} 이후 가능해요.</p>}
    </section>
    <section className="section-space"><h2>출품 관리 · {data.entryTotal}개</h2><ul className="award-admin-list">{data.entries.map((e) => <li key={e.id}><h3>{e.entry ? <Link href={`/recipes/${e.entry.recipeId}?version=${e.entry.versionId}`}>{e.entry.title} · v{e.entry.versionNo}</Link> : "비공개 출품작"}</h3><p>{e.status === "submitted" ? "출품 중" : e.status === "withdrawn" ? "철회됨" : "참여 제외"} · <code>{e.id}</code></p>
      {period.state === "published" && e.status !== "withdrawn" ? <ReasonAction periodId={period.id} operation="entryStatus" targetId={e.id} status={e.status === "disqualified" ? "submitted" : "disqualified"} label={e.status === "disqualified" ? "출품 제외 해제" : "출품 제외"} /> : null}</li>)}</ul><Pagination page={page} total={data.entryTotal} href={href} /></section>
    <section className="section-space"><h2>평가 관리 · {data.evaluationTotal}개</h2><p className="field-hint">평가 복원은 기존 평가의 고정 별점을 사용해요. 새 후기를 소급해서 평가로 등록할 수 없어요.</p><ul className="award-admin-list">{data.evaluations.map((e) => <li key={e.id}><p>평가 <code>{e.id}</code></p><p>출품 <code>{e.entryId}</code> · 별점 {e.rating} · {reasons[e.eligibility]}</p>
      {period.state === "published" ? <ReasonAction periodId={period.id} operation="evaluationStatus" targetId={e.id} status={e.eligibility === "included" ? "excluded" : "included"} label={e.eligibility === "included" ? "평가 제외" : "고정 별점으로 평가 복원"} /> : null}</li>)}</ul><Pagination page={page} total={data.evaluationTotal} href={href} /></section>
  </section>;
}
