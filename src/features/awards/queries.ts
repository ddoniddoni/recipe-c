import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { awardsIndexSchema, awardDetailSchema, adminIndexSchema, adminDetailSchema, reviewAwardSchema } from "./schemas";

export async function getAwards(page = 1, filters: { author?: string; recipe?: string } = {}) {
  const db = await createSupabaseServerClient();
  if (!db) return null;
  const { data, error } = await db.rpc("re_get_awards", { p_page: page, ...(filters.author ? { p_author: filters.author } : {}), ...(filters.recipe ? { p_recipe: filters.recipe } : {}) });
  if (error) throw new Error("어워즈를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.");
  return awardsIndexSchema.parse(data);
}
export async function getAward(slug: string, page = 1, ownPage = 1) {
  const db = await createSupabaseServerClient();
  if (!db) return null;
  const { data, error } = await db.rpc("re_get_awards", { p_slug: slug, p_page: page, p_own_page: ownPage });
  if (error) throw new Error("행사를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.");
  return data === null ? null : awardDetailSchema.parse(data);
}
export async function getAdminAwards(page = 1) {
  const db = await createSupabaseServerClient();
  if (!db) return null;
  const { data, error } = await db.rpc("re_get_admin_awards", { p_page: page });
  if (error) throw new Error("행사 운영 정보를 불러오지 못했어요.");
  return adminIndexSchema.parse(data);
}
export async function getAdminAward(id: string, page = 1, run?: string) {
  const db = await createSupabaseServerClient();
  if (!db) return null;
  const { data, error } = await db.rpc("re_get_admin_awards", { p_period: id, p_page: page, ...(run ? { p_run: run } : {}) });
  if (error) throw new Error("집계 정보를 불러오지 못했어요.");
  return data === null ? null : adminDetailSchema.parse(data);
}
export async function getReviewAwardContext(versionId: string) {
  const db = await createSupabaseServerClient();
  if (!db) return null;
  const { data, error } = await db.rpc("re_get_review_award_context", { p_version: versionId });
  if (error) throw new Error("어워즈 평가 조건을 불러오지 못했어요.");
  return data === null ? null : reviewAwardSchema.parse(data);
}
