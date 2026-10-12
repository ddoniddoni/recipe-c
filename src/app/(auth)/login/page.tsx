import type { Metadata } from "next";
import { AuthShell } from "@/features/auth/components/auth-shell";
import { AuthAvailability } from "@/features/auth/components/auth-availability";
import { AuthForm } from "@/features/auth/components/auth-form";
import { loginAction } from "@/features/auth/actions";
import { safeNextPath } from "@/features/auth/redirects";

export const metadata: Metadata = { title: "로그인" };
export default async function LoginPage({ searchParams }: {
  searchParams: Promise<{ next?: string; notice?: string }>;
}) {
  const params = await searchParams;
  const notice = params.notice === "password-updated" ? "비밀번호를 변경했어요. 새 비밀번호로 로그인해 주세요."
    : params.notice === "signed-out" ? "로그아웃했어요." : undefined;
  return <AuthShell title="다시 만나 반가워요" description="이메일로 나의 레시피 공간에 로그인하세요.">
    <AuthAvailability><AuthForm mode="login" action={loginAction} next={safeNextPath(params.next)} notice={notice} /></AuthAvailability>
  </AuthShell>;
}
