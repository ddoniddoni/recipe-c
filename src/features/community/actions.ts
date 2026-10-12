"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/database";
import type { RecipeResult } from "@/features/recipes/result";
import { communityInput } from "./schemas";

const messages: Record<string, string> = {
  VALIDATION_ERROR: "글 길이, 별점, 사진을 확인해 주세요.",
  UNAUTHENTICATED: "로그인이 만료됐어요. 다시 로그인해 주세요.",
  FORBIDDEN: "현재 계정이나 게시물 상태에서는 이 작업을 할 수 없어요.",
  PROFILE_REQUIRED: "프로필 설정을 먼저 마쳐 주세요.",
  NOT_FOUND: "대상이 삭제되었거나 더 이상 볼 수 없어요.",
  SELF_REVIEW: "자신의 레시피에는 별점 후기를 남길 수 없어요. 댓글로 이야기를 나눠 주세요.",
  CONFLICT: "이미 저장된 내용이 있거나 다른 탭에서 수정했어요. 작성 중인 글을 복사한 뒤 최신 내용을 불러와 주세요.",
  ASSET_NOT_READY: "이 버전의 후기에 사용할 수 없는 사진이 있어요. 사진을 다시 확인해 주세요.",
  RATE_LIMITED: "요청이 많았어요. 잠시 기다린 뒤 다시 시도해 주세요.",
  UNAVAILABLE: "저장 서비스에 연결할 수 없어요. 입력한 내용은 이 화면에 남아 있어요.",
  INTERNAL_ERROR: "결과를 확인하지 못했어요. 입력을 유지한 채 같은 요청으로 다시 시도해 주세요.",
};
function failure(code: string): RecipeResult<Json> { return { ok: false, code, message: messages[code] ?? messages.INTERNAL_ERROR }; }

export async function communityAction(input: unknown): Promise<RecipeResult<Json>> {
  const parsed = communityInput.safeParse(input);
  if (!parsed.success) return failure("VALIDATION_ERROR");
  const p = parsed.data;
  try {
    const db = await createSupabaseServerClient({ writable: true });
    if (!db) return failure("UNAVAILABLE");
    const { data: user, error: authError } = await db.auth.getUser();
    if (authError || !user.user || user.user.is_anonymous) return failure("UNAUTHENTICATED");
    // Each RPC repeats active account/session/ownership checks. Client IDs never
    // select the actor. This action cannot invoke arbitrary RPC names.
    const result = await (async () => {
      switch (p.operation) {
        case "bookmark": return db.rpc("re_set_bookmark", { p_recipe_id: p.recipeId, p_saved: p.saved });
        case "review": return db.rpc("re_upsert_cook_review", { p_version_id: p.versionId, p_expected_revision: p.expectedRevision,
          p_rating: p.rating, p_body: p.body, p_asset_ids: p.assetIds, p_request_id: p.requestId });
        case "deleteReview": return db.rpc("re_delete_cook_review", { p_version_id: p.versionId, p_expected_revision: p.expectedRevision, p_request_id: p.requestId });
        case "comment": return db.rpc("re_write_recipe_comment", { p_id: p.id, p_recipe_id: p.recipeId, p_parent_id: p.parentId,
          p_kind: p.kind, p_body: p.body, p_expected_revision: p.expectedRevision, p_request_id: p.requestId, p_delete: p.delete });
        case "report": return db.rpc("re_submit_report", { p_target_type: p.targetType, p_target_id: p.targetId, p_reason: p.reason, p_detail: p.detail });
        case "read": return db.rpc("re_mark_notifications_read", { p_ids: p.ids });
      }
    })();
    if (result.error) return failure(Object.hasOwn(messages, result.error.message) ? result.error.message : "INTERNAL_ERROR");
    if (result.data === null) return failure("INTERNAL_ERROR");
    revalidatePath("/me"); revalidatePath("/notifications");
    if ("recipeId" in p) {
      revalidatePath(`/recipes/${p.recipeId}`); revalidatePath("/recipes"); revalidatePath("/"); revalidatePath("/u/[handle]", "page");
    }
    return { ok: true, data: result.data };
  } catch { return failure("INTERNAL_ERROR"); }
}
