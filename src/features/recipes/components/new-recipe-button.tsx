"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { createRecipeAction } from "../actions";

export function NewRecipeButton() {
  const router = useRouter();
  const requestId = useRef<string | null>(null);
  const running = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return <div>
    <Button disabled={busy} onClick={async () => {
      if (running.current) return;
      running.current = true; setBusy(true); setError("");
      requestId.current ??= crypto.randomUUID();
      try {
        const result = await createRecipeAction(requestId.current);
        if (!result.ok) { setError(result.message); return; }
        router.push(`/recipes/${result.data}/edit`);
      } catch { setError("초안 생성 결과를 확인하지 못했어요. 다시 누르면 같은 요청으로 확인해요."); }
      finally { running.current = false; setBusy(false); }
    }}>{busy ? "초안을 만들고 있어요…" : "비공개 초안 만들기"}</Button>
    {error ? <p className="field-error" role="alert">{error}</p> : null}
  </div>;
}
