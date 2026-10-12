"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ImageUploader } from "@/features/media/components/image-uploader";
import { saveRecipeAction, publishRecipeAction } from "../actions";
import { draftBodySchema, publishBodySchema, difficultyLabels, type Category, type RecipeDraft, type RecipeBody } from "../schemas";
import { RecipeReading } from "./recipe-reading";

export function RecipeEditor({ draft, categories, uploadsEnabled }: {
  draft: RecipeDraft; categories: Category[]; uploadsEnabled: boolean;
}) {
  const router = useRouter();
  const [body, setBody] = useState(draft.body);
  const [tagText, setTagText] = useState(draft.body.tags.join(", "));
  const [version, setVersion] = useState(draft.draftVersion);
  const [savedBody, setSavedBody] = useState(JSON.stringify(draft.body));
  const [preview, setPreview] = useState(false);
  const [busy, setBusy] = useState<"save" | "publish" | null>(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [issues, setIssues] = useState<string[]>([]);
  const [conflict, setConflict] = useState(false);
  const [uncertainPublish, setUncertainPublish] = useState(false);
  const running = useRef(false);
  const saveAttempt = useRef<{ snapshot: string; expectedVersion: number; requestId: string } | null>(null);
  const publishAttempt = useRef<{ expectedVersion: number; requestId: string } | null>(null);
  const dirty = JSON.stringify(body) !== savedBody;
  const locked = busy !== null || uploading || uncertainPublish;
  const update = <K extends keyof RecipeBody>(key: K, value: RecipeBody[K]) => setBody((current) => ({ ...current, [key]: value }));
  const setIngredient = (index: number, values: Partial<RecipeBody["ingredients"][number]>) =>
    setBody((current) => ({ ...current, ingredients: current.ingredients.map((item, i) => i === index ? { ...item, ...values } : item) }));
  const setStep = (index: number, values: Partial<RecipeBody["steps"][number]>) =>
    setBody((current) => ({ ...current, steps: current.steps.map((item, i) => i === index ? { ...item, ...values } : item) }));

  useEffect(() => {
    if (!dirty && !busy && !uploading && !uncertainPublish) return;
    const beforeUnload = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    const beforeNavigation = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey) return;
      const anchor = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>("a[href]") : null;
      if (!anchor || anchor.target === "_blank" || anchor.hasAttribute("download") || anchor.getAttribute("href")?.startsWith("#")) return;
      if (!window.confirm("저장하지 않은 내용이나 처리 중인 요청이 있어요. 이 페이지를 떠날까요?")) {
        event.preventDefault(); event.stopPropagation();
      }
    };
    window.addEventListener("beforeunload", beforeUnload);
    document.addEventListener("click", beforeNavigation, true);
    return () => { window.removeEventListener("beforeunload", beforeUnload); document.removeEventListener("click", beforeNavigation, true); };
  }, [dirty, busy, uploading, uncertainPublish]);

  async function save() {
    if (running.current || locked) return;
    setIssues([]); setMessage("");
    const parsed = draftBodySchema.safeParse(body);
    if (!parsed.success) { setIssues(["입력 길이와 수량을 확인해 주세요. 숫자 수량은 0보다 크고 소수점 셋째 자리까지 입력할 수 있어요."]); return; }
    const snapshot = JSON.stringify(parsed.data);
    if (saveAttempt.current?.snapshot !== snapshot) saveAttempt.current = { snapshot, expectedVersion: version, requestId: crypto.randomUUID() };
    const attempt = saveAttempt.current;
    if (!attempt) return;
    running.current = true; setBusy("save");
    try {
      const result = await saveRecipeAction({ recipeId: draft.recipeId, ...attempt, body: parsed.data });
      if (!result.ok) {
        setIssues([result.message]); setConflict(result.code === "CONFLICT"); return;
      }
      setVersion(result.data.draftVersion); setBody(parsed.data); setTagText(parsed.data.tags.join(", ")); setSavedBody(snapshot);
      saveAttempt.current = null; publishAttempt.current = null; setConflict(false); setMessage("초안을 저장했어요.");
    } catch { setIssues(["저장 결과를 확인하지 못했어요. 초안 저장을 다시 누르면 같은 요청으로 확인해요."]); }
    finally { running.current = false; setBusy(null); }
  }

  async function publish() {
    if (running.current || busy || uploading || dirty) return;
    const parsed = publishBodySchema.safeParse(body);
    if (!parsed.success) { setIssues(parsed.error.issues.map((issue) => issue.message)); return; }
    if (!publishAttempt.current && !window.confirm("이 내용을 모든 사람에게 공개할까요? 발행한 버전은 보존되고 다음 수정은 새 버전으로 발행돼요.")) return;
    publishAttempt.current ??= { expectedVersion: version, requestId: crypto.randomUUID() };
    running.current = true; setBusy("publish"); setIssues([]); setMessage("");
    try {
      const result = await publishRecipeAction({ recipeId: draft.recipeId, ...publishAttempt.current });
      if (!result.ok) {
        const uncertain = result.code === "INTERNAL_ERROR";
        setUncertainPublish(uncertain); setIssues([result.message]); setConflict(result.code === "CONFLICT");
        if (!uncertain) publishAttempt.current = null;
        return;
      }
      setUncertainPublish(false); setMessage("발행했어요. 공개 레시피로 이동합니다.");
      router.push(`/recipes/${draft.recipeId}?version=${result.data}`); router.refresh();
    } catch { setUncertainPublish(true); setIssues(["발행 결과를 확인하지 못했어요. 발행 결과 확인을 눌러 같은 요청으로 확인해 주세요."]); }
    finally { running.current = false; setBusy(null); }
  }

  function moveStep(index: number, direction: -1 | 1) {
    const next = [...body.steps];
    [next[index], next[index + direction]] = [next[index + direction], next[index]];
    update("steps", next.map((item, i) => ({ ...item, position: i + 1 })));
  }

  return <div className="recipe-editor">
    <aside className="editor-status" aria-live="polite">
      <div><strong>{busy === "save" ? "저장 중…" : busy === "publish" ? "발행 중…" : uploading ? "사진 처리 중…" : dirty ? "저장하지 않은 변경이 있어요" : "저장된 초안"}</strong>
        <p className="field-hint">초안은 나만 볼 수 있어요. 변경한 뒤 초안 저장을 눌러 주세요.</p></div>
      {draft.currentVersionId ? <Link className="text-link" href={`/recipes/${draft.recipeId}`}>공개 버전 보기 ↗</Link> : <span className="status-pill">비공개</span>}
    </aside>
    <nav className="editor-outline" aria-label="작성 순서">
      {preview ? <Button variant="secondary" disabled={locked} onClick={() => setPreview(false)}>← 편집으로</Button> : <>
        <a href="#recipe-basics">1 기본 정보</a><a href="#recipe-ingredients">2 재료</a><a href="#recipe-steps">3 조리 단계</a>
      </>}
      <Button variant="secondary" disabled={locked} onClick={() => setPreview((value) => !value)}>{preview ? "계속 편집하기" : "미리보기"}</Button>
    </nav>
    {preview ? <section className="editor-preview" aria-label="발행 전 미리보기">
      <p className="eyebrow">나만 보는 미리보기</p><h2>{body.title || "아직 제목이 없어요"}</h2><p>{body.summary || "레시피 소개를 적어 주세요."}</p>
      {body.coverAssetId ? <Image className="preview-cover" src={`/media/${body.coverAssetId}`} alt="완성 사진 미리보기" width={960} height={640} unoptimized /> : null}
      {body.disclosureText ? <p className="disclosure-note">경제적 관계: {body.disclosureText}</p> : null}
      <RecipeReading key={savedBody} body={body} />
    </section> : <form onSubmit={(event) => { event.preventDefault(); void save(); }}>
      <fieldset disabled={locked} className="editor-fields">
        <legend className="sr-only">레시피 편집</legend>
        <section className="editor-section" id="recipe-basics">
          <header><span className="eyebrow">01 · 기본 정보</span><h2>어떤 요리인가요?</h2><p className="muted">나만의 방법과 맛을 소개해 주세요.</p></header>
          <div className="field"><label htmlFor="recipe-title">레시피 제목</label><input id="recipe-title" value={body.title} maxLength={80} placeholder="예: 바삭한 가장자리의 김치전" onChange={(e) => update("title", e.target.value)} /><p className="field-hint">발행할 때 5~80자</p></div>
          <div className="field"><label htmlFor="recipe-summary">요리 소개</label><textarea id="recipe-summary" rows={3} value={body.summary} maxLength={500} placeholder="어떤 맛인지, 누구와 먹으면 좋을지 적어 주세요." onChange={(e) => update("summary", e.target.value)} /><p className="field-hint">발행할 때 20~500자</p></div>
          <div className="editor-grid">
            <div className="field"><label htmlFor="recipe-category">카테고리</label><select id="recipe-category" value={body.categoryId ?? ""} onChange={(e) => update("categoryId", e.target.value || null)}><option value="">선택해 주세요</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
            <div className="field"><label htmlFor="recipe-difficulty">난이도</label><select id="recipe-difficulty" value={body.difficulty} onChange={(e) => update("difficulty", e.target.value as RecipeBody["difficulty"])}>{Object.entries(difficultyLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
            <div className="field"><label htmlFor="recipe-servings">기본 인분</label><input id="recipe-servings" type="number" min={1} max={20} value={body.servings} onChange={(e) => update("servings", Number(e.target.value))} /></div>
            <div className="field"><label htmlFor="recipe-prep">준비 시간 (분)</label><input id="recipe-prep" type="number" min={0} max={720} value={body.prepMinutes} onChange={(e) => update("prepMinutes", Number(e.target.value))} /></div>
            <div className="field"><label htmlFor="recipe-cook">조리 시간 (분)</label><input id="recipe-cook" type="number" min={0} max={720} value={body.cookMinutes} onChange={(e) => update("cookMinutes", Number(e.target.value))} /></div>
          </div>
          {uploadsEnabled ? <ImageUploader recipeId={draft.recipeId} assetId={body.coverAssetId} label="완성 사진 (필수)" disabled={locked} onBusy={setUploading} onChange={(id) => update("coverAssetId", id)} /> : <p className="auth-message">사진 저장 서비스가 아직 연결되지 않았어요. 글은 초안으로 저장할 수 있고, 사진 연결 후 발행할 수 있어요.</p>}
        </section>
        <section className="editor-section" id="recipe-ingredients">
          <header><span className="eyebrow">02 · 재료</span><h2>준비할 재료를 적어 주세요</h2><p className="muted">숫자로 적은 수량은 독자가 인분에 맞춰 조절할 수 있어요.</p></header>
          {body.ingredients.map((item, i) => <fieldset className="ingredient-editor-row" key={item.id}>
            <legend>재료 {i + 1}</legend>
            <div className="ingredient-editor-grid">
              <div className="field"><label htmlFor={`${item.id}-name`}>재료 이름</label><input id={`${item.id}-name`} value={item.name} maxLength={50} onChange={(e) => setIngredient(i, { name: e.target.value })} /></div>
              <div className="field"><label htmlFor={`${item.id}-quantity`}>숫자 수량</label><input id={`${item.id}-quantity`} type="number" min={0.001} max={1_000_000} step="0.001" value={item.quantity ?? ""} placeholder="2" onChange={(e) => setIngredient(i, { quantity: e.target.value === "" ? null : Number(e.target.value), quantityText: e.target.value ? null : item.quantityText })} /></div>
              <div className="field"><label htmlFor={`${item.id}-unit`}>단위</label><input id={`${item.id}-unit`} value={item.unit ?? ""} maxLength={20} placeholder="큰술, g, 개" onChange={(e) => setIngredient(i, { unit: e.target.value || null })} /></div>
              <div className="field"><label htmlFor={`${item.id}-text`}>또는 수량 설명</label><input id={`${item.id}-text`} value={item.quantityText ?? ""} maxLength={50} placeholder="약간, 취향껏" onChange={(e) => setIngredient(i, { quantityText: e.target.value || null, quantity: e.target.value ? null : item.quantity })} /></div>
            </div>
            <div className="editor-inline-actions"><label className="check-field"><input type="checkbox" checked={item.optional} onChange={(e) => setIngredient(i, { optional: e.target.checked })} />선택 재료</label><Button variant="secondary" onClick={() => update("ingredients", body.ingredients.filter((_, index) => index !== i))}>재료 {i + 1} 삭제</Button></div>
          </fieldset>)}
          <Button variant="secondary" disabled={body.ingredients.length >= 40} onClick={() => update("ingredients", [...body.ingredients, { id: crypto.randomUUID(), name: "", quantity: null, unit: null, quantityText: null, optional: false }])}>+ 재료 추가 ({body.ingredients.length}/40)</Button>
        </section>
        <section className="editor-section" id="recipe-steps">
          <header><span className="eyebrow">03 · 조리 단계</span><h2>차근차근, 만드는 순서</h2><p className="muted">각 단계는 10자 이상 적어 주세요. 사진은 선택이에요.</p></header>
          {body.steps.map((item, i) => <fieldset key={item.id} className="step-editor-row">
            <legend>단계 {i + 1}</legend>
            <div className="field"><label htmlFor={`${item.id}-instruction`}>{i + 1}단계 설명</label><textarea id={`${item.id}-instruction`} value={item.instruction} rows={4} maxLength={1500} onChange={(e) => setStep(i, { instruction: e.target.value })} /></div>
            {uploadsEnabled ? <ImageUploader recipeId={draft.recipeId} assetId={item.imageAssetId} label={`${i + 1}단계 사진 (선택)`} disabled={locked} onBusy={setUploading} onChange={(id) => setStep(i, { imageAssetId: id })} /> : null}
            <div className="editor-inline-actions">
              <Button variant="secondary" disabled={i === 0} onClick={() => moveStep(i, -1)} aria-label={`${i + 1}단계 위로 이동`}>↑ 위로</Button>
              <Button variant="secondary" disabled={i === body.steps.length - 1} onClick={() => moveStep(i, 1)} aria-label={`${i + 1}단계 아래로 이동`}>↓ 아래로</Button>
              <Button variant="secondary" onClick={() => update("steps", body.steps.filter((_, index) => index !== i).map((step, index) => ({ ...step, position: index + 1 })))}>단계 삭제</Button>
            </div>
          </fieldset>)}
          <Button variant="secondary" disabled={body.steps.length >= 20} onClick={() => update("steps", [...body.steps, { id: crypto.randomUUID(), position: body.steps.length + 1, instruction: "", imageAssetId: null }])}>+ 단계 추가 ({body.steps.length}/20)</Button>
        </section>
        <section className="editor-section">
          <header><h2>마지막으로 덧붙일 이야기</h2></header>
          <div className="field"><label htmlFor="recipe-tips">조리 팁 (선택)</label><textarea id="recipe-tips" value={body.tips} rows={3} maxLength={2000} onChange={(e) => update("tips", e.target.value)} /></div>
          <div className="field"><label htmlFor="recipe-tags">태그 (선택)</label><input id="recipe-tags" value={tagText} maxLength={110} placeholder="간단요리, 도시락" onChange={(e) => { setTagText(e.target.value); update("tags", [...new Set(e.target.value.split(",").map((tag) => tag.trim()).filter(Boolean))]); }} /><p className="field-hint">쉼표로 구분해 최대 5개, 각 2~20자.</p></div>
          <div className="field"><label htmlFor="recipe-disclosure">제품 제공·광고 등 경제적 관계 (선택)</label><textarea id="recipe-disclosure" value={body.disclosureText} rows={2} maxLength={500} placeholder="관계가 있는 경우 공개할 내용을 적어 주세요." onChange={(e) => update("disclosureText", e.target.value)} /></div>
          <label className="check-field"><input type="checkbox" checked={body.rightsConfirmed} onChange={(e) => update("rightsConfirmed", e.target.checked)} />직접 작성한 설명이며, 사진을 사용할 권한이 있어요.</label>
        </section>
      </fieldset>
    </form>}
    {issues.length ? <div className="editor-feedback" role="alert"><h2>확인이 필요해요</h2><ul>{issues.map((issue, index) => <li key={index}>{issue}</li>)}</ul>
      {conflict ? <Button variant="secondary" onClick={() => { if (window.confirm("화면의 입력은 사라져요. 필요한 내용을 복사해 두셨나요? 최신 초안을 불러올까요?")) window.location.reload(); }}>최신 초안 불러오기</Button> : null}
    </div> : null}
    {message ? <p className="auth-message" role="status">{message}</p> : null}
    <footer className="editor-actions">
      <div><strong>{draft.currentVersionId ? "수정한 내용은 새 버전으로 발행돼요" : "발행 전까지 나만 볼 수 있어요"}</strong><p className="field-hint">먼저 초안을 저장하고 미리보기에서 발행해 주세요.</p></div>
      <div className="editor-inline-actions">
        <Button variant="secondary" disabled={locked || conflict} onClick={save}>{busy === "save" ? "저장 중…" : "초안 저장"}</Button>
        {preview || uncertainPublish ? <Button disabled={!!busy || uploading || dirty || conflict} onClick={publish}>{busy === "publish" ? "발행 중…" : uncertainPublish ? "발행 결과 확인" : "이 내용 발행"}</Button>
          : <Button disabled={locked} onClick={() => setPreview(true)}>미리보기 →</Button>}
      </div>
    </footer>
  </div>;
}
