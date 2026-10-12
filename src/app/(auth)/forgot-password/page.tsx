import type { Metadata } from "next";
import { AuthShell } from "@/features/auth/components/auth-shell";
import { AuthAvailability } from "@/features/auth/components/auth-availability";
import { AuthForm } from "@/features/auth/components/auth-form";
import { forgotPasswordAction } from "@/features/auth/actions";

export const metadata: Metadata = { title: "비밀번호 찾기" };
export default function ForgotPasswordPage() {
  return <AuthShell title="비밀번호를 잊으셨나요?" description="가입한 이메일로 비밀번호 재설정 링크를 보내드려요.">
    <AuthAvailability><AuthForm mode="forgot" action={forgotPasswordAction} /></AuthAvailability>
  </AuthShell>;
}
