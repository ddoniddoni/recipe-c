"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/database";
import type { RecipeResult } from "@/features/recipes/result";
import { awardInput } from "./schemas";

const messages: Record<string, string> = {
  VALIDATION_ERROR: "입력 내용과 규칙 동의를 확인해 주세요. 운영 사유는 10자 이상 입력해 주세요.",
  UNAUTHENTICATED: "로그인 후 다시 시도해 주세요.", FORBIDDEN: "현재 계정이나 출품 상태에서는 이 작업을 할 수 없어요.",
  PROFILE_REQUIRED: "프로필 설정을 먼저 마쳐 주세요.", NOT_FOUND: "행사나 출품 기록을 찾을 수 없어요.",
  WINDOW_CLOSED: "진행 가능한 시간이 아니에요. 행사의 한국 시간 일정을 확인해 주세요.",
  CONFLICT: "다른 변경이 반영됐어요. 최신 내용을 불러와 확인해 주세요. 집계가 바뀌었다면 새 미리보기를 만들어야 해요.",
  ASSET_NOT_READY: "레시피 사진 상태를 확인해 주세요.", RATE_LIMITED: "요청이 많았어요. 잠시 후 다시 시도해 주세요.",
  UNAVAILABLE: "어워즈 서비스에 연결할 수 없어요.", INTERNAL_ERROR: "처리 결과를 확인하지 못했어요. 입력을 유지한 채 다시 시도해 주세요.",
};
const failure = (code: string): RecipeResult<Json> => ({ ok: false, code, message: messages[code] ?? messages.INTERNAL_ERROR });
export async function awardAction(input: unknown): Promise<RecipeResult<Json>> {
  const parsed = awardInput.safeParse(input);
  if (!parsed.success) return failure("VALIDATION_ERROR");
  try {
    const db = await createSupabaseServerClient({ writable: true });
    if (!db) return failure("UNAVAILABLE");
    const { data: auth, error: authError } = await db.auth.getUser();
    if (authError || !auth.user || auth.user.is_anonymous) return failure("UNAUTHENTICATED");
    const { data, error } = await db.rpc("re_award_command", { p_input: parsed.data });
    if (error) return failure(Object.hasOwn(messages, error.message) ? error.message : "INTERNAL_ERROR");
    if (data === null) return failure("INTERNAL_ERROR");
    for (const path of ["/", "/awards", "/hall-of-fame", "/admin/awards", "/notifications", "/me"]) revalidatePath(path);
    revalidatePath("/awards/[slug]", "page"); revalidatePath("/recipes/[id]", "page"); revalidatePath("/u/[handle]", "page");
    return { ok: true, data };
  } catch { return failure("INTERNAL_ERROR"); }
}
