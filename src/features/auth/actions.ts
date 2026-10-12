"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getPublicEnv } from "@/lib/env/public";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { actionError, validationError, type ActionState } from "./action-state";
import { safeNextPath } from "./redirects";
import { emailSchema, loginSchema, resetPasswordSchema, signupSchema } from "./schemas";
import { createSignupAccount } from "./signup-service";

const unavailable = () => actionError("지금은 인증 서비스를 이용할 수 없어요. 잠시 후 다시 시도해 주세요.");
function providerError(code?: string): ActionState {
  if (code === "over_email_send_rate_limit" || code === "over_request_rate_limit") {
    return actionError("요청이 많아요. 잠시 기다린 뒤 다시 시도해 주세요.");
  }
  if (code === "email_not_confirmed") return actionError("기존 계정으로 로그인할 수 없어요. 계정을 만든 서비스에서 계정 상태를 확인해 주세요.");
  if (code === "weak_password") return actionError("더 안전한 비밀번호를 입력해 주세요. 흔한 단어나 반복된 문자는 피해 주세요.");
  if (code === "same_password") return actionError("이전과 다른 비밀번호를 입력해 주세요.");
  if (code === "reauthentication_needed" || code === "reauthentication_not_valid") {
    return actionError("확인 시간이 지났어요. 비밀번호 재설정 메일을 다시 요청해 주세요.");
  }
  return unavailable();
}

export async function loginAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = loginSchema.safeParse({ email: formData.get("email"), password: formData.get("password") });
  if (!parsed.success) return validationError(parsed.error);
  const supabase = await createSupabaseServerClient({ writable: true });
  if (!supabase) return unavailable();
  let destination = safeNextPath(formData.get("next"));
  try {
    const { error } = await supabase.auth.signInWithPassword(parsed.data);
    if (error?.code === "invalid_credentials") return actionError("이메일 또는 비밀번호를 확인해 주세요.");
    if (error) return providerError(error.code);
    const { data: verified, error: verificationError } = await supabase.auth.getClaims();
    if (verificationError || !verified?.claims.sub) return unavailable();
    const enrollment = await supabase.rpc("re_ensure_account");
    if (enrollment.error) return actionError("레시피 계정을 준비하지 못했어요. 다시 로그인해 주세요.");
    const { data, error: accountError } = await supabase.rpc("re_get_my_account");
    if (accountError || !data?.[0]) return actionError("로그인은 되었지만 계정 정보를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.");
    const account = data[0];
    if (account.status !== "active") destination = "/settings";
  } catch {
    return unavailable();
  }
  revalidatePath("/", "layout");
  redirect(destination);
}

export async function signupAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = signupSchema.safeParse({ email: formData.get("email"), name: formData.get("name"), password: formData.get("password") });
  if (!parsed.success) return validationError(parsed.error);
  const supabase = await createSupabaseServerClient({ writable: true });
  if (!supabase) return unavailable();
  let created = false;
  try {
    const result = await createSignupAccount(parsed.data);
    if (result.status === "limited") return actionError("가입 요청이 많아요. 잠시 후 다시 시도해 주세요.");
    if (result.status === "existing") return actionError("이 이메일로 가입할 수 없어요. 이미 계정이 있다면 로그인해 주세요.");
    if (result.status === "weak-password") return providerError("weak_password");
    if (result.status !== "created") return unavailable();
    created = true;
    const signedIn = await supabase.auth.signInWithPassword({
      email: parsed.data.email, password: parsed.data.password,
    });
    if (signedIn.error || !signedIn.data.session || signedIn.data.user?.id !== result.userId) {
      return { status: "success", message: "회원가입이 완료됐어요. 로그인해서 시작해 주세요." };
    }
    const enrollment = await supabase.rpc("re_ensure_account");
    if (enrollment.error) {
      return { status: "success", message: "회원가입은 완료됐지만 프로필을 준비하지 못했어요. 다시 로그인해 주세요." };
    }
  } catch {
    return created
      ? { status: "success", message: "회원가입은 완료됐어요. 로그인해서 이어가 주세요." }
      : actionError("가입 결과를 확인하지 못했어요. 먼저 로그인을 시도하고, 가입되지 않았다면 다시 요청해 주세요.");
  }
  revalidatePath("/", "layout");
  redirect("/me");
}

export async function forgotPasswordAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = emailSchema.safeParse(formData.get("email"));
  if (!parsed.success) return { ...validationError(parsed.error), fieldErrors: { email: "이메일 주소를 확인해 주세요." } };
  const supabase = await createSupabaseServerClient({ writable: true });
  if (!supabase) return unavailable();
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(parsed.data, {
      redirectTo: new URL("/auth/callback?next=/reset-password", getPublicEnv().siteUrl).toString(),
    });
    if (error) return providerError(error.code);
    return { status: "success", message: "가입된 주소라면 재설정 메일이 도착해요. 메일의 링크에서 새 비밀번호를 설정해 주세요." };
  } catch {
    return unavailable();
  }
}

export async function resetPasswordAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = resetPasswordSchema.safeParse({ password: formData.get("password"), confirmPassword: formData.get("confirmPassword") });
  if (!parsed.success) return validationError(parsed.error);
  const supabase = await createSupabaseServerClient({ writable: true });
  if (!supabase) return unavailable();
  try {
    const { data, error: userError } = await supabase.auth.getUser();
    if (userError || !data.user || data.user.is_anonymous) return actionError("재설정 링크가 만료되었어요. 메일을 다시 요청해 주세요.");
    const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
    if (error) return providerError(error.code);
  } catch {
    return actionError("연결이 끊겨 비밀번호 변경 결과를 확인하지 못했어요. 새 비밀번호로 로그인을 시도한 뒤 다시 요청해 주세요.");
  }
  // Updating the password and revoking sessions are separate Auth operations.
  // Preserve the known password-update outcome if the second operation fails.
  const signout = await supabase.auth.signOut({ scope: "global" }).catch(() => null);
  if (!signout || signout.error) {
    return {
      status: "success",
      message: "비밀번호는 변경됐어요. 모든 기기의 로그아웃 처리는 완료하지 못했어요. 계정 설정에서 로그아웃 후 새 비밀번호로 로그인해 주세요.",
    };
  }
  revalidatePath("/", "layout");
  redirect("/login?notice=password-updated");
}

export async function logoutAction(): Promise<ActionState> {
  const supabase = await createSupabaseServerClient({ writable: true });
  if (!supabase) return unavailable();
  try {
    const { error } = await supabase.auth.signOut({ scope: "local" });
    if (error) return actionError("로그아웃하지 못했어요. 다시 시도해 주세요.");
  } catch {
    return unavailable();
  }
  revalidatePath("/", "layout");
  redirect("/login?notice=signed-out");
}
