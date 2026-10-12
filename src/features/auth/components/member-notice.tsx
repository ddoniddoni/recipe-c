import Link from "next/link";
import type { Viewer } from "../viewer";
import { LogoutButton } from "./logout-button";

export function MemberNotice({ viewer }: { viewer: Viewer }) {
  let title = "회원 공간을 준비하고 있어요";
  let message = "인증 서비스가 연결되면 이용할 수 있어요.";
  if (viewer.kind === "demo") message = "샘플 모드에서는 회원 공간과 저장 기능을 이용할 수 없어요.";
  if (viewer.kind === "unavailable") {
    title = "계정 정보를 불러오지 못했어요";
    message = "잠시 후 페이지를 새로고침해 주세요. 문제가 계속되면 다시 로그인해 주세요.";
  }
  if (viewer.kind === "member") {
    title = viewer.account.email_verified ? "현재 이용이 제한된 계정이에요" : "이메일을 확인해 주세요";
    message = viewer.account.email_verified
      ? "현재 계정 상태에서는 프로필 수정과 콘텐츠 작성을 이용할 수 없어요."
      : "가입할 때 받은 확인 메일의 링크를 열어 주세요. 확인한 뒤 프로필을 설정할 수 있어요.";
  }
  return <section className="member-notice auth-message">
    <h1>{title}</h1><p>{message}</p>
    <div className="auth-links">
      {viewer.kind === "member" && !viewer.account.email_verified ? <Link href="/verify-email">확인 메일 다시 받기</Link> : null}
      <Link href="/recipes">레시피 공간으로</Link>
    </div>
    {viewer.kind === "member" || viewer.kind === "unavailable" ? <LogoutButton /> : null}
  </section>;
}
