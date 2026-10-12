import type { Metadata } from "next";
import { AuthShell } from "@/features/auth/components/auth-shell";
import { AuthAvailability } from "@/features/auth/components/auth-availability";
import { AuthForm } from "@/features/auth/components/auth-form";
import { resendConfirmationAction } from "@/features/auth/actions";

export const metadata: Metadata = { title: "이메일 확인" };
export default function VerifyEmailPage() {
  return <AuthShell title="이메일을 확인해 주세요" description="확인 메일이 보이지 않으면 스팸함을 확인하거나 다시 요청해 주세요.">
    <AuthAvailability><AuthForm mode="verify" action={resendConfirmationAction} /></AuthAvailability>
  </AuthShell>;
}
