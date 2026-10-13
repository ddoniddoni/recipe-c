import Link from "next/link";
import { getAwards, getReviewAwardContext } from "../queries";
import { medalLabels, phaseLabels } from "../schemas";

export async function HomeAwards() {
  let data;
  try { data = await getAwards(); }
  catch { return <section className="awards-notice"><span className="eyebrow">월간 어워즈</span><div><h2>행사 정보를 불러오지 못했어요</h2><p>잠시 후 다시 확인해 주세요.</p></div><Link className="text-link" href="/awards">어워즈 보기 →</Link></section>; }
  const period = data?.periods.find((p) => ["submission", "voting", "review"].includes(p.phase))
    ?? data?.periods.filter((p) => p.phase === "upcoming").at(-1)
    ?? data?.periods.find((p) => p.state === "finalized");
  return <section className="awards-notice" aria-labelledby="awards-title"><span className="eyebrow">월간 어워즈</span><div><h2 id="awards-title">{period?.title ?? "첫 어워즈를 준비하고 있어요"}</h2><p>{period ? phaseLabels[period.phase] : "공개된 행사 일정과 주제를 이곳에서 안내할게요."}</p></div><Link className="text-link" href={period ? `/awards/${period.slug}` : "/awards"}>{period ? "행사 보기" : "참여 안내"} →</Link></section>;
}
export async function AwardBadges({ authorId, recipeId }: { authorId?: string; recipeId?: string }) {
  let data;
  try { data = await getAwards(1, { author: authorId, recipe: recipeId }); }
  catch { return <p className="field-hint">수상 기록을 지금 불러올 수 없어요.</p>; }
  if (!data?.results.length) return null;
  const query = new URLSearchParams({ ...(authorId ? { author: authorId } : {}), ...(recipeId ? { recipe: recipeId } : {}) });
  return <section className="award-badges" aria-label="월간 어워즈 수상 기록"><h2>식탁에 쌓인 수상 기록</h2><ul>{data.results.map((result) => <li key={`${result.period.id}:${result.entryId}`}><Link className="award-badge" data-medal={result.medal} href={`/awards/${result.period.slug}`}><span aria-hidden="true">✦</span> {result.period.title} · {result.medal ? medalLabels[result.medal] : `${result.rank}위`}{result.entry ? ` · v${result.entry.versionNo}` : ""}</Link></li>)}</ul><Link className="text-link" href={`/hall-of-fame?${query}`}>수상 기록 전체 보기 ({data.resultTotal}) →</Link></section>;
}
const reviewMessages = {
  finalized: "이미 결과가 확정된 행사예요. 지금 후기를 수정해도 확정된 결과는 바뀌지 않아요.",
  entry_unavailable: "철회되거나 참여에서 제외된 출품작이에요. 현재 어워즈 집계에 포함되지 않아요.",
  included: "이 후기는 어워즈 평가 후보에 포함돼 있어요. 마감 전 별점 수정은 반영되며, 확정 전 삭제하면 평가가 철회돼요.",
  withdrawn: "이 후기의 어워즈 평가는 철회된 상태예요. 마감 후 후기 복구만으로 평가가 자동 복원되지는 않아요.",
  excluded: "이 후기는 현재 어워즈 집계에서 제외돼 있어요.",
  not_open: "아직 평가 기간이 아니에요. 지금 작성한 후기는 나중에 수정해도 어워즈 평가로 바뀌지 않아요.",
  closed: "평가가 마감됐어요. 지금 새로 작성한 후기는 이번 어워즈에 반영되지 않아요.",
  login: "로그인하면 내 후기의 어워즈 참여 조건을 확인할 수 있어요.",
  ineligible: "작성자 본인·운영자·테스트 계정 또는 참여 조건을 충족하지 못한 계정은 평가에 참여할 수 없어요.",
  existing_review: "이 버전에는 이미 작성한 후기가 있어요. 처음 등록할 때 평가 조건을 충족하지 못한 후기는 수정해도 새 평가로 인정되지 않아요.",
  too_new: "레시피 커뮤니티 가입 후 24시간이 지나야 평가에 참여할 수 있어요. 지금 작성한 후기는 나중에 수정해도 이번 평가에 포함되지 않아요.",
  eligible: "지금 이 출품 버전에 처음 등록하는 사진 후기는 어워즈 평가 후보가 될 수 있어요. 최종 포함 여부는 저장 시점의 조건과 운영 검토에 따라 결정돼요.",
} as const;
export async function ReviewAwardNotice({ versionId }: { versionId: string }) {
  let context;
  try { context = await getReviewAwardContext(versionId); }
  catch { return <p className="version-notice">어워즈 평가 조건을 확인하지 못했어요. 평가 참여를 원한다면 행사 정보를 다시 확인한 뒤 후기를 작성해 주세요.</p>; }
  if (!context) return null;
  return <aside className="version-notice"><Link className="text-link" href={`/awards/${context.period.slug}`}>{context.period.title} · 출품 버전</Link><p>{reviewMessages[context.status]}</p>{context.rating !== null ? <p>기록된 평가 별점: {context.rating}점{context.period.phase === "review" || context.period.phase === "finalized" ? " · 마감 후 고정" : ""}</p> : null}</aside>;
}
