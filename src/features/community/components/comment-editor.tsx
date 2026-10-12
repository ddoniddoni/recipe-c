"use client";
import { useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { commentKinds, type RecipeComment } from "../schemas";
import { useCommunityMutation } from "./use-community-mutation";
import { MutationStatus } from "./mutation-status";

export function CommentEditor({ recipeId, parentId = null, comment }: { recipeId: string; parentId?: string | null; comment?: RecipeComment }) {
  const id = useId();
  const identity = useRef<string | null>(comment?.id ?? null);
  const [body, setBody] = useState(comment?.body ?? "");
  const [kind, setKind] = useState<keyof typeof commentKinds>(comment?.kind ?? "general");
  const [deleted, setDeleted] = useState(false);
  const [revision, setRevision] = useState(comment?.revision ?? 0);
  const mutation = useCommunityMutation();
  function input(deleted: boolean) {
    identity.current ??= crypto.randomUUID();
    const content = { operation: "comment" as const, id: identity.current, recipeId, parentId: comment?.parentId ?? parentId,
      kind, body: deleted ? "" : body, expectedRevision: revision, delete: deleted };
    return { ...content, requestId: mutation.requestId(content) };
  }
  const label = comment ? "댓글 수정 저장" : parentId ? "답글 등록" : "댓글 등록";
  return <form className="community-form comment-editor" onSubmit={async (event) => {
    event.preventDefault();
    if (await mutation.run(input(false), comment ? "댓글을 수정했어요." : parentId ? "답글을 등록했어요." : "댓글을 등록했어요.", (data) => {
      if (comment && data && typeof data === "object" && !Array.isArray(data) && typeof data.revision === "number") setRevision(data.revision);
    })) {
      if (!comment) { setBody(""); identity.current = null; }
    }
  }}>
    <fieldset disabled={mutation.pending || deleted}>
      <label htmlFor={`${id}-kind`}>이야기 분류</label><select id={`${id}-kind`} value={kind} onChange={(event) => setKind(event.target.value as keyof typeof commentKinds)}>
        {Object.entries(commentKinds).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </select>
      <label htmlFor={`${id}-body`}>{parentId ? "답글" : "의견"}</label><textarea id={`${id}-body`} value={body} required maxLength={1000} rows={3}
        onChange={(event) => setBody(event.target.value)} placeholder="궁금한 점이나 나만의 조리 팁을 나눠 주세요." />
      <div className="editor-inline-actions"><Button type="submit">{mutation.pending ? "저장 중…" : deleted ? "삭제됨" : label}</Button>
        {comment ? <Button variant="secondary" onClick={async () => {
          if (window.confirm("댓글을 삭제할까요? 다른 사람이 쓴 답글은 남아 있어요.") && await mutation.run(input(true), "댓글을 삭제했어요.")) setDeleted(true);
        }}>댓글 삭제</Button> : null}
      </div>
    </fieldset>
    <MutationStatus message={mutation.message} code={mutation.code} />
  </form>;
}
