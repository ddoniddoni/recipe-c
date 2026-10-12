import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/features/auth/components/auth-shell";
import { AuthAvailability } from "@/features/auth/components/auth-availability";
import { AuthForm } from "@/features/auth/components/auth-form";
import { resetPasswordAction } from "@/features/auth/actions";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "새 비밀번호 설정" };
export default async function ResetPasswordPage() {
  const supabase = await createSupabaseServerClient();
  // Password recovery does not depend on profile setup or active-member status.
  const result = supabase ? await supabase.auth.getUser().catch(() => null) : null;
  const canReset = Boolean(result?.data.user && !result.error && !result.data.user.is_anonymous);
  return <AuthShell title="새 비밀번호 설정" description="비밀번호 변경 후 새 비밀번호로 다시 로그인해 주세요.">
    <AuthAvailability>
      {canReset ? <AuthForm mode="reset" action={resetPasswordAction} /> : <div className="auth-message">
        <p>유효한 재설정 링크가 필요해요. 메일에서 링크를 열거나 새 링크를 받아 주세요.</p>
        <Link className="text-link" href="/forgot-password">재설정 메일 받기</Link>
      </div>}
    </AuthAvailability>
  </AuthShell>;
}
