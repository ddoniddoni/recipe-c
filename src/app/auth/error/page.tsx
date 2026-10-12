import Link from "next/link";
import { AuthShell } from "@/features/auth/components/auth-shell";

export default async function AuthErrorPage({ searchParams }: { searchParams: Promise<{ reason?: string }> }) {
  const { reason } = await searchParams;
  return <AuthShell title="인증을 마치지 못했어요" description={reason === "unavailable"
    ? "인증 서비스에 연결하지 못했어요. 잠시 후 다시 시도해 주세요."
    : "링크가 만료되었거나 이미 사용되었어요. 새 메일을 요청해 주세요."}>
    <div className="auth-links">
      <Link href="/forgot-password">비밀번호 재설정 메일 받기</Link>
      <Link href="/login">로그인으로</Link>
    </div>
  </AuthShell>;
}
