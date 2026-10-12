"use client";

import Image from "next/image";
import { useId, useRef, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import type { RecipeResult } from "@/features/recipes/result";

type UploadTicket = { assetId: string; path: string; token: string };
async function post<T>(url: string, data: unknown): Promise<RecipeResult<T>> {
  const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data), signal: AbortSignal.timeout(65_000) });
  return response.json() as Promise<RecipeResult<T>>;
}

export function ImageUploader({ recipeId, assetId, label, onChange, onBusy, disabled, reviewVersionId }: {
  recipeId: string; reviewVersionId?: string; assetId: string | null; label: string;
  onChange: (id: string | null) => void; onBusy: (busy: boolean) => void; disabled: boolean;
}) {
  const inputId = useId();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [failed, setFailed] = useState(false);
  const [hasFile, setHasFile] = useState(false);
  const attempt = useRef<{ file: File; requestId: string; ticket?: UploadTicket } | null>(null);

  async function upload() {
    if (busy || disabled || !attempt.current) return;
    setBusy(true); onBusy(true); setFailed(false);
    const current = attempt.current;
    try {
      if (current.ticket) {
        setMessage("앞서 올린 사진의 처리 결과를 확인하고 있어요…");
        const previous = await post<{ assetId: string }>("/api/uploads/complete", { assetId: current.ticket.assetId });
        if (previous.ok) {
          onChange(previous.data.assetId); setMessage("사진 준비 완료. 작성 중인 내용을 저장해 주세요.");
          attempt.current = null; setHasFile(false); return;
        }
        if (previous.code !== "UPLOAD_MISSING") {
          setMessage(previous.message); setFailed(true);
          if (previous.code === "UPLOAD_REJECTED") { attempt.current = null; setHasFile(false); }
          return;
        }
        // The upload token may have expired. Renew the exact same asset ticket.
        current.ticket = undefined;
      }
      if (!current.ticket) {
        setMessage("사진을 올릴 준비를 하고 있어요…");
        const signed = await post<UploadTicket>("/api/uploads/sign", reviewVersionId ? { versionId: reviewVersionId, requestId: current.requestId, purpose: "review" } : { recipeId, requestId: current.requestId, purpose: "recipe" });
        if (!signed.ok) { setMessage(signed.message); setFailed(true); return; }
        current.ticket = signed.data;
      }
      const client = createSupabaseBrowserClient();
      if (!client) { setMessage("사진 저장 서비스가 아직 연결되지 않았어요."); setFailed(true); return; }
      setMessage("사진을 업로드하고 있어요…");
      // A retry can report an existing object after the first upload succeeded.
      // Completion verifies the actual immutable bytes in either case.
      await client.storage.from("re_recipe_media").uploadToSignedUrl(current.ticket.path, current.ticket.token, current.file,
        { contentType: current.file.type, cacheControl: "0" });
      setMessage("사진의 형식과 크기를 확인하고 있어요…");
      const complete = await post<{ assetId: string }>("/api/uploads/complete", { assetId: current.ticket.assetId });
      if (!complete.ok) {
        setMessage(complete.message); setFailed(true);
        if (complete.code === "UPLOAD_REJECTED") { attempt.current = null; setHasFile(false); }
        return;
      }
      onChange(complete.data.assetId); setMessage("사진 준비 완료. 작성 중인 내용을 저장하면 사진 선택도 저장돼요.");
      attempt.current = null; setHasFile(false);
    } catch { setMessage("사진 처리 결과를 확인하지 못했어요. 같은 사진으로 다시 시도할 수 있어요."); setFailed(true); }
    finally { setBusy(false); onBusy(false); }
  }

  return <div className="image-uploader" aria-busy={busy}>
    <label htmlFor={inputId} className="field-label">{label}</label>
    {assetId ? <Image className="upload-preview" src={`/media/${assetId}`} alt={`${label} 미리보기`}
      width={640} height={480} unoptimized /> : <p className="upload-placeholder">직접 만든 요리 사진을 골라 주세요</p>}
    <input id={inputId} type="file" accept="image/jpeg,image/png,image/webp" disabled={disabled || busy}
      aria-describedby={`${inputId}-hint ${inputId}-status`} onChange={(event) => {
        const file = event.target.files?.[0];
        attempt.current = null; setHasFile(false); setFailed(false);
        if (!file) return;
        if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || !file.size || file.size > 5 * 1024 * 1024) {
          setMessage("5MB 이하의 JPEG, PNG, WebP 정지 사진을 선택해 주세요. HEIC 사진은 먼저 변환해 주세요.");
          setFailed(true); return;
        }
        attempt.current = { file, requestId: crypto.randomUUID() }; setHasFile(true); setMessage(`${file.name} 선택됨. 사진 올리기를 눌러 주세요.`);
      }} />
    <p id={`${inputId}-hint`} className="field-hint">JPEG · PNG · WebP / 최대 5MB · 6,000px · 2,000만 화소. 위치 정보는 제거해요.</p>
    <div className="editor-inline-actions">
      {hasFile ? <Button variant="secondary" onClick={upload} disabled={disabled || busy}>{busy ? "사진 처리 중…" : failed ? "같은 사진 다시 시도" : "사진 올리기"}</Button> : null}
      {assetId ? <Button variant="secondary" disabled={disabled || busy} onClick={() => { onChange(null); setMessage("사진 선택을 해제했어요. 작성 중인 내용을 저장해 주세요."); }}>사진 선택 해제</Button> : null}
    </div>
    <p id={`${inputId}-status`} role={failed ? "alert" : "status"} className={failed ? "field-error" : "field-hint"}>{message}</p>
  </div>;
}
