import type { Metadata } from "next";
import { AuthShell } from "@/features/auth/components/auth-shell";
import { AuthAvailability } from "@/features/auth/components/auth-availability";
import { AuthForm } from "@/features/auth/components/auth-form";
import { signupAction } from "@/features/auth/actions";

export const metadata: Metadata = { title: "회원가입" };
export default function SignupPage() {
  return <AuthShell title="나의 요리 이야기 시작하기" description="이메일, 이름, 비밀번호로 가입하고 바로 시작하세요.">
    <AuthAvailability><AuthForm mode="signup" action={signupAction} /></AuthAvailability>
  </AuthShell>;
}
