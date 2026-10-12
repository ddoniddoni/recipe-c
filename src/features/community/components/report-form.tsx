"use client";
import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { reportReasons } from "../schemas";
import { useCommunityMutation } from "./use-community-mutation";
import { MutationStatus } from "./mutation-status";

export function ReportForm({ recipeId, targetId, targetType }: { recipeId: string; targetId: string; targetType: "recipe" | "review" | "comment" }) {
  const id = useId();
  const [sent, setSent] = useState(false);
  const mutation = useCommunityMutation();
  return <details className="report-disclosure"><summary>신고하기</summary>
    <form className="community-form" onSubmit={async (event) => {
      event.preventDefault();
      const data = new FormData(event.currentTarget);
      const reason = data.get("reason") as keyof typeof reportReasons;
      if (await mutation.run({ operation: "report", recipeId, targetId, targetType, reason, detail: String(data.get("detail") ?? "") }, "신고를 접수했어요. 내 공간에서 접수 상태를 볼 수 있어요.")) setSent(true);
    }}>
      <p className="field-hint">낮은 별점이나 의견 차이만으로 삭제되지 않아요. 확인이 필요한 내용을 구체적으로 적어 주세요.</p>
      <fieldset disabled={mutation.pending || sent}>
        <label htmlFor={`${id}-reason`}>신고 사유</label><select name="reason" id={`${id}-reason`}>{Object.entries(reportReasons).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
        <label htmlFor={`${id}-detail`}>자세한 내용</label><textarea name="detail" id={`${id}-detail`} minLength={10} maxLength={1000} required rows={3} />
        <Button type="submit">{mutation.pending ? "접수 중…" : sent ? "접수됨" : "신고 접수"}</Button>
      </fieldset>
      <MutationStatus message={mutation.message} code={mutation.code} />
    </form>
  </details>;
}
