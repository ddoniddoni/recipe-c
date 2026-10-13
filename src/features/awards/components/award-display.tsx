import Image from "next/image";
import Link from "next/link";
import { EmptyState } from "@/components/ui/states";
import { phaseLabels, medalLabels, type AwardPeriod, type AwardEntry, type AwardResult } from "../schemas";

export function awardDate(value: string) {
  return new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(value));
}
export function PeriodCard({ period, admin = false }: { period: AwardPeriod; admin?: boolean }) {
  return <article className="award-period-card">
    <div className="award-period-top"><span className="eyebrow">{period.month.slice(0, 7).replace("-", ". ")} · 월간 어워즈</span><span className="status-pill">{phaseLabels[period.phase]}</span></div>
    <h2><Link href={admin ? `/admin/awards?period=${period.id}` : `/awards/${period.slug}`}>{period.title}</Link></h2>
    <p className="award-theme">{period.theme}</p><p className="field-hint">출품 시작 {awardDate(period.submissionOpensAt)} · 한국 시간</p>
    <Link className="text-link" href={admin ? `/admin/awards?period=${period.id}` : `/awards/${period.slug}`}>{admin ? "행사 운영" : "일정과 출품작 보기"} →</Link>
  </article>;
}
export function AwardSchedule({ period }: { period: AwardPeriod }) {
  return <ol className="award-schedule" aria-label="행사 일정, 한국 시간">
    <li data-active={period.phase === "submission"}><span className="eyebrow">01 · 출품</span><strong>내 레시피를 소개해요</strong><span>{awardDate(period.submissionOpensAt)}부터</span><span>{awardDate(period.submissionClosesAt)} 전까지</span></li>
    <li data-active={period.phase === "voting"}><span className="eyebrow">02 · 요리 후기</span><strong>만들어 보고 나눠요</strong><span>{awardDate(period.votingOpensAt)}부터</span><span>{awardDate(period.votingClosesAt)} 전까지</span></li>
    <li data-active={period.phase === "review" || period.phase === "finalized"}><span className="eyebrow">03 · 결과</span><strong>{period.state === "finalized" ? "결과가 발표됐어요" : "평가를 검토하고 발표해요"}</strong><span>{awardDate(period.finalizeNotBefore)} 이후</span><span>운영자 검토·확정 후 공개</span></li>
  </ol>;
}
export function AwardRules({ period }: { period: AwardPeriod }) {
  return <details className="award-rules"><summary>참여·평가·동점 규칙 읽기</summary><div>
    <p>참여는 무료예요. 출품 기간에 처음 발행한 레시피를 한 사람당 한 개 출품할 수 있어요. 출품 시점의 공개 버전이 고정되고, 새 버전을 발행해도 출품작은 바뀌지 않아요. 철회한 출품작은 접수 기간 안에서만 같은 버전으로 복구할 수 있어요.</p>
    <p>평가 기간에 출품 버전에 처음 등록한 사진 후기만 평가 후보예요. 레시피 커뮤니티 가입 후 {period.rules.minAccountHours}시간이 지난 일반 회원이 작성해야 하며, 작성자 본인·운영자·테스트 계정은 참여할 수 없어요. 사진은 실제 조리를 완전히 검증하지 않아요.</p>
    <p>마감 전 별점 수정은 반영돼요. 마감 후에는 별점이 고정되며, 결과 확정 전 후기 삭제는 평가 철회로 반영돼요. 처음에 조건을 충족하지 못한 후기는 나중에 수정해도 새 평가로 인정되지 않아요. 확정된 과거 결과는 이후 수정·삭제로 다시 계산하지 않아요.</p>
    <p>유효 후기 {period.rules.minReviews}개 이상부터 순위에 올라요. 보정 점수는 (별점 합계 + {period.rules.priorMean} × {period.rules.priorWeight}) ÷ (후기 수 + {period.rules.priorWeight})예요. 보정 점수 → 후기 수 → 별 5개 수 순으로 비교하고, 모두 같으면 공동 순위예요. 공동 1위 두 명 다음은 3위예요. 금상·은상·동상은 각각 1·2·3위에 해당해요.</p>
    <p>수상 조건을 충족한 출품작이 없으면 수상자 없이 종료돼요. 일반 월간 순위는 결제·광고·제휴 실적과 무관해요. 규칙 버전: {period.rules.version}</p>
  </div></details>;
}
export function AwardEntryCard({ entry }: { entry: AwardEntry }) {
  return <article className="recipe-card"><Link className="recipe-card-link" href={`/recipes/${entry.recipeId}?version=${entry.versionId}`}>
    <Image src={`/media/${entry.coverAssetId}`} alt={`${entry.title} 완성 사진`} width={640} height={480} unoptimized className="recipe-cover" />
    <div className="recipe-card-body"><span className="eyebrow">출품 버전 v{entry.versionNo}</span><h3>{entry.title}</h3><p className="recipe-author">{entry.author}</p><p className="field-hint">현재 레시피와 내용이 다를 수 있어요.</p><span className="text-link">출품 레시피로 요리하기 ↗</span></div>
  </Link></article>;
}
export function AwardResults({ results, final = true }: { results: AwardResult[]; final?: boolean }) {
  if (!results.length) return <EmptyState title={final ? "이 페이지에 표시할 수상 결과가 없어요" : "이 페이지에 집계된 순위가 없어요"}><p>유효 후기 5개 이상인 출품작만 순위에 포함돼요. 수상자 없이 확정할 수도 있어요.</p></EmptyState>;
  return <ol className="award-results">{results.map((result) => <li key={result.entryId} className="award-result" data-medal={result.medal ?? "none"}>
    <div className="award-place"><strong>{result.rank}</strong><span>{result.medal ? medalLabels[result.medal] : "위"}</span></div>
    <div className="award-result-content">{result.visibility === "visible" && result.entry ? <>
      <h3><Link href={`/recipes/${result.entry.recipeId}?version=${result.entry.versionId}`}>{result.entry.title}</Link></h3>
      <p><Link className="text-link" href={`/u/${result.entry.handle}`}>{result.entry.author}</Link> · 출품 버전 v{result.entry.versionNo}</p>
    </> : <h3>{result.visibility === "revoked" ? "수상이 취소된 기록" : "콘텐츠를 볼 수 없는 수상 기록"}</h3>}
      <p className="award-score">보정 점수 <strong>{result.score.toFixed(4)}</strong><span>후기 {result.count}개 · 평균 {result.average.toFixed(2)} · 별 5개 {result.fiveStarCount}개</span></p>
      {result.visibility === "revoked" ? <p className="field-hint">수상 취소로 다른 순위가 승격되지는 않아요.</p> : null}
    </div>
  </li>)}</ol>;
}
