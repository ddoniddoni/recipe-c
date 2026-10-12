"use client";
import { useEffect, useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { ImageUploader } from "@/features/media/components/image-uploader";
import type { Json } from "@/lib/supabase/database";
import type { CookReview } from "../schemas";
import { useCommunityMutation } from "./use-community-mutation";
import { MutationStatus } from "./mutation-status";

export function ReviewEditor({ recipeId, versionId, versionNo, review, canUpload }: {
  recipeId: string; versionId: string; versionNo: number; review: CookReview | null; canUpload: boolean;
}) {
  const id = useId();
  const [body, setBody] = useState(review?.body ?? "");
  const [rating, setRating] = useState(review?.rating ?? 0);
  const [assets, setAssets] = useState<(string | null)[]>(() => [0, 1, 2].map((i) => review?.assetIds[i] ?? null));
  const [uploads, setUploads] = useState<boolean[]>([false, false, false]);
  const [dirty, setDirty] = useState(false);
  // Keep the edit base stable across unrelated router refreshes. A concurrent
  // edit is resolved explicitly through the revision conflict, never by reset.
  const [entry, setEntry] = useState({ revision: review?.revision ?? 0, status: review?.status ?? "new" });
  function acceptReceipt(data: Json, status: "published" | "deleted") {
    if (data && typeof data === "object" && !Array.isArray(data) && typeof data.revision === "number") {
      setEntry({ revision: data.revision, status });
    }
  }
  const mutation = useCommunityMutation();
  const uploading = uploads.some(Boolean);
  const disabled = mutation.pending || uploading;
  useEffect(() => {
    const prevent = (event: BeforeUnloadEvent) => { if (dirty || uploading || mutation.pending) event.preventDefault(); };
    window.addEventListener("beforeunload", prevent);
    return () => window.removeEventListener("beforeunload", prevent);
  }, [dirty, uploading, mutation.pending]);
  if (entry.status === "hidden") return <p className="version-notice">운영 확인 중인 후기는 수정하거나 다시 등록할 수 없어요.</p>;
  const content = { operation: "review" as const, recipeId, versionId, expectedRevision: entry.revision, rating, body,
    assetIds: assets.filter((asset): asset is string => asset !== null) };
  return <form className="community-form review-editor" onSubmit={async (event) => {
    event.preventDefault();
    if (disabled) return;
    if (await mutation.run({ ...content, requestId: mutation.requestId(content) }, "요리 후기를 저장했어요.", (data) => acceptReceipt(data, "published"))) setDirty(false);
  }}>
    <h3>{entry.status === "published" ? "내 후기 수정" : entry.status === "deleted" ? "삭제한 후기 다시 작성" : "직접 만든 요리를 나눠 주세요"}</h3>
    <p className="field-hint">v{versionNo} 레시피로 만든 후기 · 사진 1~3장, 별점 1~5점, 글 20~2,000자</p>
    <fieldset disabled={disabled} className="rating-input"><legend>별점</legend>
      {[1, 2, 3, 4, 5].map((value) => <label key={value}><input type="radio" name={`${id}-rating`} value={value} checked={rating === value} required
        onChange={() => { setRating(value); setDirty(true); }} /><span>{value}점</span></label>)}
    </fieldset>
    <label htmlFor={`${id}-body`}>만들어 본 이야기</label><textarea id={`${id}-body`} value={body} minLength={20} maxLength={2000} required rows={5} disabled={disabled}
      placeholder="어떤 점이 좋았나요? 바꿔 넣은 재료나 다음에 시도할 팁도 좋아요." onChange={(event) => { setBody(event.target.value); setDirty(true); }} />
    {!canUpload ? <p className="field-hint">사진 업로드를 준비 중이에요. 기존 사진이 있는 후기는 글과 별점을 수정할 수 있어요.</p> : null}
    <div className="review-upload-grid">{assets.map((asset, index) => <ImageUploader key={index} recipeId={recipeId} reviewVersionId={versionId}
      assetId={asset} label={`요리 사진 ${index + 1}`} disabled={disabled || !canUpload}
      onChange={(value) => { setAssets((current) => current.map((a, i) => i === index ? value : a)); setDirty(true); }}
      onBusy={(busy) => setUploads((current) => current.map((value, i) => i === index ? busy : value))} />)}</div>
    <p className="field-hint">직접 만든 요리와 사용할 권한이 있는 사진을 올려 주세요. 사진 첨부만으로 조리 사실이 검증되는 것은 아니에요.</p>
    <div className="editor-inline-actions">
      <Button type="submit" disabled={disabled || !content.assetIds.length}>{mutation.pending ? "저장 중…" : entry.status === "published" ? "후기 수정 저장" : "요리 후기 등록"}</Button>
      {entry.status === "published" ? <Button variant="secondary" disabled={disabled} onClick={async () => {
        if (!window.confirm("요리 후기를 삭제할까요? 별점 집계에서 빠지고 글과 사진이 공개되지 않아요.")) return;
        const input = { operation: "deleteReview" as const, recipeId, versionId, expectedRevision: entry.revision };
        if (await mutation.run({ ...input, requestId: mutation.requestId(input) }, "후기를 삭제했어요.", (data) => acceptReceipt(data, "deleted"))) { setDirty(false); setBody(""); setRating(0); setAssets([null, null, null]); }
      }}>후기 삭제</Button> : null}
    </div>
    {dirty ? <p className="field-hint">아직 저장하지 않은 변경이 있어요.</p> : null}
    <MutationStatus message={mutation.message} code={mutation.code} />
  </form>;
}
