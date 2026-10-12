"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { actionError, validationError, type ActionState } from "@/features/auth/action-state";
import { profileSchema } from "./schemas";

export async function updateProfileAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = profileSchema.safeParse({
    handle: formData.get("handle"), displayName: formData.get("displayName"), bio: formData.get("bio"),
  });
  if (!parsed.success) return validationError(parsed.error);
  const supabase = await createSupabaseServerClient({ writable: true });
  if (!supabase) return actionError("지금은 프로필을 저장할 수 없어요.");
  try {
    const { data: verified, error: verificationError } = await supabase.auth.getClaims();
    if (verificationError || !verified?.claims.sub) return actionError("로그인 시간이 만료되었어요. 다시 로그인해 주세요.");
    const { error } = await supabase.rpc("update_profile", {
      p_handle: parsed.data.handle, p_display_name: parsed.data.displayName, p_bio: parsed.data.bio,
    });
    if (error) {
      if (error.code === "23505") return { status: "error", message: "프로필 주소를 확인해 주세요.", fieldErrors: { handle: "이미 사용 중인 주소예요." } };
      if (error.message === "RATE_LIMITED") return actionError("수정 요청이 많아요. 잠시 후 다시 저장해 주세요.");
      if (error.message === "HANDLE_LOCKED") return actionError("한 번 설정한 프로필 주소는 변경할 수 없어요.");
      if (error.code === "42501") return actionError("이메일 확인과 계정 상태를 확인해 주세요. 현재 프로필을 수정할 수 없어요.");
      if (error.code === "23514" || error.code === "22023") return actionError("프로필 입력 조건을 다시 확인해 주세요.");
      return actionError("프로필을 저장하지 못했어요. 입력 내용을 보관하고 잠시 후 다시 시도해 주세요.");
    }
  } catch {
    return actionError("연결이 끊겨 저장 결과를 확인하지 못했어요. 내 공간에서 확인한 뒤 다시 시도해 주세요.");
  }
  revalidatePath("/", "layout");
  revalidatePath(`/u/${parsed.data.handle}`);
  return { status: "success", message: "프로필을 저장했어요." };
}
