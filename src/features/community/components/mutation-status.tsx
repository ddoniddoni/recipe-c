"use client";
import { Button } from "@/components/ui/button";
export function MutationStatus({ message, code }: { message: string; code: string }) {
  return <div className="mutation-status">
    <p role={code ? "alert" : "status"} className={code ? "field-error" : "field-hint"}>{message}</p>
    {code === "CONFLICT" ? <Button variant="secondary" onClick={() => {
      if (window.confirm("작성 중인 글을 복사해 두었나요? 최신 내용을 불러오면 이 화면의 입력이 사라져요.")) window.location.reload();
    }}>최신 내용 불러오기</Button> : null}
  </div>;
}
