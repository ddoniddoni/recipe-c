export type RecipeError = { ok: false; code: string; message: string; issues?: string[] };
export type RecipeResult<T> = { ok: true; data: T } | RecipeError;

const messages: Record<string, string> = {
  UNAUTHENTICATED: "로그인이 만료됐어요. 다시 로그인해 주세요.",
  FORBIDDEN: "현재 계정으로는 이 작업을 할 수 없어요.",
  PROFILE_REQUIRED: "프로필 설정을 먼저 마쳐 주세요.",
  NOT_FOUND: "레시피를 찾을 수 없거나 편집 권한이 없어요.",
  CONFLICT: "다른 탭에서 저장한 내용이 있어요. 내 내용을 복사해 둔 뒤 최신 초안을 불러와 주세요.",
  RATE_LIMITED: "짧은 시간에 요청이 많았어요. 잠시 기다린 뒤 다시 시도해 주세요.",
  VALIDATION_ERROR: "입력 내용과 사진을 확인해 주세요.",
  ASSET_NOT_READY: "이 레시피에 사용할 수 없는 사진이 있어요. 사진 처리가 끝났는지 확인해 주세요.",
  SELF_REVIEW: "자신의 레시피에는 요리 후기를 남길 수 없어요.",
  NO_CHANGES: "현재 공개 버전과 내용이 같아요. 변경한 뒤 다시 발행해 주세요.",
  ASSET_LIMIT: "이 글에 올릴 수 있는 사진 수에 도달했어요.",
  IN_PROGRESS: "사진을 처리하고 있어요. 잠시 뒤 처리 확인을 눌러 주세요.",
  UPLOAD_REJECTED: "이 사진은 처리할 수 없어요. JPEG, PNG, WebP 정지 사진을 새로 선택해 주세요.",
  UNAVAILABLE: "지금은 저장 서비스에 연결할 수 없어요. 입력한 내용은 이 화면에 남아 있어요.",
};
export function recipeError(code: string): RecipeError {
  return { ok: false, code, message: messages[code] ?? "요청 결과를 확인하지 못했어요. 같은 요청으로 다시 시도해 주세요." };
}
export function recipeDbError(error: { message?: string }): RecipeError {
  const code = Object.keys(messages).find((key) => error.message === key);
  return recipeError(code ?? "INTERNAL_ERROR");
}
