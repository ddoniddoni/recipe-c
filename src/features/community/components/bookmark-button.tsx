"use client";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useCommunityMutation } from "./use-community-mutation";
import { MutationStatus } from "./mutation-status";

export function BookmarkButton({ recipeId, saved: initialSaved }: { recipeId: string; saved: boolean }) {
  const [saved, setSaved] = useState(initialSaved);
  const target = useRef<boolean | null>(null);
  const mutation = useCommunityMutation();
  return <div className="bookmark-control">
    <Button variant="secondary" aria-pressed={saved} disabled={mutation.pending} onClick={async () => {
      const next = target.current ?? !saved;
      target.current = next;
      if (await mutation.run({ operation: "bookmark", recipeId, saved: next }, next ? "내 공간에 저장했어요." : "저장을 해제했어요.")) {
        setSaved(next); target.current = null;
      }
    }}>{mutation.pending ? "저장 변경 중…" : target.current !== null && mutation.code ? "저장 상태 다시 확인" : saved ? "저장됨 · 해제" : "레시피 저장"}</Button>
    <MutationStatus message={mutation.message} code={mutation.code} />
  </div>;
}
