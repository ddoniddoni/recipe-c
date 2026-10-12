"use client";
import { Button } from "@/components/ui/button";
import { useCommunityMutation } from "./use-community-mutation";
import { MutationStatus } from "./mutation-status";
export function ReadNotificationsButton({ ids }: { ids: string[] }) {
  const mutation = useCommunityMutation();
  return <div><Button variant="secondary" disabled={mutation.pending || !ids.length} onClick={() => mutation.run({ operation: "read", ids }, "이 페이지의 알림을 읽음으로 표시했어요.")}>{mutation.pending ? "처리 중…" : "이 페이지 읽음 표시"}</Button>
    <MutationStatus message={mutation.message} code={mutation.code} /></div>;
}
