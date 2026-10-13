"use client";

import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { awardAction } from "../actions";
import type { AwardInput, AwardDetail, AwardPeriod, AdminAwardDetail } from "../schemas";

type WithoutRequest<T> = T extends unknown ? Omit<T, "requestId"> : never;
type Command = WithoutRequest<AwardInput>;
function useAwardMutation() {
  const router = useRouter();
  const locked = useRef(false);
  const request = useRef<{ content: string; id: string } | null>(null);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [conflict, setConflict] = useState(false);
  async function run(input: Command, success: string) {
    if (locked.current) return;
    locked.current = true; setPending(true); setMessage(""); setConflict(false);
    const content = JSON.stringify(input);
    if (!request.current || request.current.content !== content) request.current = { content, id: crypto.randomUUID() };
    try {
      const result = await awardAction({ ...input, requestId: request.current.id });
      if (!result.ok) { setMessage(result.message); setConflict(result.code === "CONFLICT"); return; }
      request.current = null; setMessage(success); router.refresh(); return true;
    } catch { setMessage("결과를 확인하지 못했어요. 같은 내용으로 다시 시도해 주세요."); }
    finally { locked.current = false; setPending(false); }
  }
  return { pending, message, conflict, run };
}
function Status({ mutation }: { mutation: ReturnType<typeof useAwardMutation> }) {
  return <div aria-live="polite"><p className="form-message" role="status">{mutation.message}</p>{mutation.conflict ? <Button variant="secondary" onClick={() => { if (window.confirm("입력 중인 내용을 보관했나요? 최신 내용으로 페이지를 다시 불러옵니다.")) window.location.reload(); }}>최신 내용 불러오기</Button> : null}</div>;
}
export function EntryForm({ data, signedIn }: { data: AwardDetail; signedIn: boolean }) {
  const mutation = useAwardMutation();
  const own = data.ownEntry;
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const versionId = own?.versionId ?? String(form.get("versionId") ?? "");
    if (form.get("agreed") !== "on") return;
    await mutation.run({ operation: own ? "restore" : "enter", periodId: data.period.id, versionId, agreed: true }, own ? "같은 버전으로 출품을 복구했어요." : "출품했어요. 이 버전으로 평가받게 돼요.");
  }
  if (data.period.state !== "published") return null;
  if (!signedIn) return <p className="version-notice"><Link className="text-link" href={`/login?next=${encodeURIComponent(`/awards/${data.period.slug}`)}`}>로그인</Link>하고 출품할 수 있어요.</p>;
  if (!data.canEnter) return <p className="version-notice">프로필 설정을 마친 일반 회원만 출품할 수 있어요. 운영자와 테스트 계정은 제외돼요.</p>;
  return <section className="award-entry-form member-card" aria-labelledby="my-entry-title"><h2 id="my-entry-title">내 출품작</h2>
    {own ? <><p>상태: {own.status === "submitted" ? "출품 중" : own.status === "withdrawn" ? "철회됨" : "참여 제외"}</p><Link className="text-link" href={`/recipes/${own.recipeId}?version=${own.versionId}`}>고정된 출품 버전 보기</Link></> : null}
    {own?.status === "submitted" ? <div><p className="field-hint">철회 후에는 접수 기간 안에서만 같은 버전으로 복구할 수 있어요.</p><Button variant="secondary" disabled={mutation.pending} onClick={() => { if (window.confirm("이 출품작을 철회할까요? 접수 마감 후에는 직접 복구할 수 없어요.")) void mutation.run({ operation: "withdraw", periodId: data.period.id }, "출품을 철회했어요."); }}>출품 철회</Button></div>
      : data.period.phase === "submission" && own?.status !== "disqualified" ? <form onSubmit={submit}><fieldset disabled={mutation.pending} className="award-fields">
        {own ? <p>복구하면 처음 출품했던 버전이 그대로 사용돼요.</p> : data.ownRecipes.length ? <div className="field"><label htmlFor="award-version">출품할 공개 버전</label><select id="award-version" name="versionId" required defaultValue=""><option value="" disabled>레시피를 선택하세요</option>{data.ownRecipes.map((r) => <option key={r.versionId} value={r.versionId}>{r.title} · v{r.versionNo}</option>)}</select></div>
          : <p>접수 기간에 처음 발행한 레시피가 없어요. <Link className="text-link" href="/recipes/new">레시피 작성하기</Link></p>}
        {own || data.ownRecipes.length ? <><label className="award-consent"><input type="checkbox" name="agreed" required />행사 주제와 참여 규칙을 읽었고, 선택한 버전이 고정되는 데 동의해요.</label><Button type="submit">{mutation.pending ? "저장 중…" : own ? "같은 버전으로 복구" : "이 버전 출품하기"}</Button></> : null}
      </fieldset></form> : !own ? <p>지금은 출품 접수 시간이 아니에요.</p> : null}
    <Status mutation={mutation} />
  </section>;
}
export function CreatePeriodForm() {
  const mutation = useAwardMutation();
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = new FormData(event.currentTarget);
    await mutation.run({ operation: "create", month: `${form.get("month")}-01`, title: String(form.get("title")), theme: String(form.get("theme")), slug: String(form.get("slug")) }, "행사 초안을 만들었어요. 목록에서 일정을 확인한 뒤 공개해 주세요.");
  }
  return <details className="award-rules"><summary>새 월간 행사 만들기</summary><form onSubmit={submit}><fieldset disabled={mutation.pending} className="award-fields">
    <TextField id="award-month" name="month" type="month" label="행사 월" required hint="아직 시작하지 않은 월만 만들 수 있어요. 공개는 접수 시작 전에 마쳐 주세요." />
    <TextField id="award-title" name="title" label="행사 이름" minLength={2} maxLength={80} required />
    <TextField id="award-slug" name="slug" label="행사 주소" pattern="[a-z0-9][a-z0-9\-]{2,59}" minLength={3} maxLength={60} required hint="영문 소문자·숫자·하이픈. 예: monthly-2026-11" />
    <div className="field"><label htmlFor="award-theme">주제와 안내 (필수)</label><textarea id="award-theme" name="theme" rows={4} minLength={2} maxLength={1000} required /></div>
    <p className="field-hint">한국 시간 기준 1일 접수 시작, 21일 평가 시작, 다음 달 1일 평가 마감, 다음 달 4일부터 결과 확정이 가능해요. 공개 후 일정·규칙은 바꿀 수 없어요.</p>
    <Button type="submit">{mutation.pending ? "생성 중…" : "행사 초안 만들기"}</Button>
  </fieldset><Status mutation={mutation} /></form></details>;
}
export function PeriodControls({ period, run }: { period: AwardPeriod; run: AdminAwardDetail["run"] }) {
  const router = useRouter();
  const mutation = useAwardMutation();
  return <section className="member-card"><h2>행사 진행</h2><div className="award-actions">
    {period.state === "draft" ? <Button disabled={mutation.pending} onClick={() => void mutation.run({ operation: "publish", periodId: period.id }, "행사를 공개했어요.")}>일정·규칙 확정하고 공개</Button> : null}
    {period.phase === "review" ? <Button disabled={mutation.pending} onClick={async () => { if (await mutation.run({ operation: "prepare", periodId: period.id }, "새 집계 미리보기를 만들었어요. 아래 결과와 제외 내역을 검토해 주세요.")) router.replace(`/admin/awards?period=${period.id}`); }}>새 집계 미리보기 만들기</Button> : null}
    {period.phase === "review" && run ? <form onSubmit={(e) => { e.preventDefault(); void mutation.run({ operation: "finalize", periodId: period.id, runId: run.id }, "결과를 확정하고 수상 알림을 발송했어요."); }}><fieldset disabled={mutation.pending || run.stale} className="award-fields">
      <label className="award-consent"><input type="checkbox" required />아래 순위·제외 내역을 확인했으며, 결과를 확정해 공개하는 데 동의해요.</label><Button type="submit">이 집계로 결과 확정</Button>
    </fieldset></form> : null}
  </div>{run?.stale && period.state !== "finalized" ? <p role="status" className="field-error">입력이 변경된 집계예요. 새 미리보기를 만든 뒤 다시 확인해 주세요.</p> : null}<Status mutation={mutation} /></section>;
}
export function ReasonAction({ periodId, operation, targetId, status, label }: { periodId: string; operation: "cancel" | "entryStatus" | "evaluationStatus" | "revoke"; targetId?: string; status?: "submitted" | "disqualified" | "included" | "excluded"; label: string }) {
  const mutation = useAwardMutation();
  const id = `reason-${operation}-${targetId ?? periodId}-${status ?? ""}`;
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const reason = String(new FormData(event.currentTarget).get("reason"));
    let input: Command;
    if (operation === "cancel") input = { operation, periodId, reason };
    else if (operation === "revoke" && targetId) input = { operation, periodId, reason, entryId: targetId };
    else if (operation === "entryStatus" && targetId && (status === "submitted" || status === "disqualified")) input = { operation, periodId, reason, entryId: targetId, status };
    else if (operation === "evaluationStatus" && targetId && (status === "included" || status === "excluded")) input = { operation, periodId, reason, evaluationId: targetId, status };
    else return;
    await mutation.run(input, "운영 조치를 반영하고 사유를 기록했어요.");
  }
  return <details className="award-reason"><summary>{label}</summary><form onSubmit={submit}><fieldset disabled={mutation.pending} className="award-fields"><div className="field"><label htmlFor={id}>운영 사유 (10~1,000자)</label><textarea id={id} name="reason" minLength={10} maxLength={1000} required rows={3} /></div>
    <label className="award-consent"><input type="checkbox" required />대상과 조치 내용을 확인했어요.</label><Button type="submit" variant="secondary">{mutation.pending ? "처리 중…" : label}</Button></fieldset><Status mutation={mutation} /></form></details>;
}
