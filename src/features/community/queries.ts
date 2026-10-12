import "server-only";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { recipeCardSchema } from "@/features/recipes/schemas";
import { bookmarksSchema, communitySchema, notificationsSchema, reportsSchema, reviewListSchema, type CommunitySearch } from "./schemas";

export async function getCommunity(recipeId: string, versionId: string, search: CommunitySearch) {
  const db = await createSupabaseServerClient();
  if (!db) return null;
  const { data, error } = await db.rpc("re_get_recipe_community", { p_recipe_id: recipeId, p_version_id: versionId,
    p_reviews_page: search.reviewsPage, p_comments_page: search.commentsPage, p_replies_page: search.repliesPage,
    ...(search.threadId ? { p_thread_id: search.threadId } : {}) });
  if (error) throw new Error("후기와 댓글을 불러오지 못했습니다.");
  return data === null ? null : communitySchema.parse(data);
}
export async function getProfileReviews(authorId: string, page: number) {
  const db = await createSupabaseServerClient();
  if (!db) return null;
  const { data, error } = await db.rpc("re_get_profile_reviews", { p_author_id: authorId, p_page: page });
  if (error) throw new Error("요리 후기를 불러오지 못했습니다.");
  return reviewListSchema.parse(data);
}
export async function getMyBookmarks(page: number) {
  const db = await createSupabaseServerClient();
  if (!db) return null;
  const { data, error } = await db.rpc("re_get_my_bookmarks", { p_page: page });
  if (error) throw new Error("저장한 레시피를 불러오지 못했습니다.");
  return bookmarksSchema.parse(data);
}
export async function getNotifications(page: number) {
  const db = await createSupabaseServerClient();
  if (!db) return null;
  const { data, error } = await db.rpc("re_get_my_notifications", { p_page: page });
  if (error) throw new Error("알림을 불러오지 못했습니다.");
  return notificationsSchema.parse(data);
}
export async function getMyReports(page: number) {
  const db = await createSupabaseServerClient();
  if (!db) return null;
  const { data, error } = await db.rpc("re_get_my_reports", { p_page: page });
  if (error) throw new Error("신고 접수 상태를 불러오지 못했습니다.");
  return reportsSchema.parse(data);
}
export async function getRecentlyReviewedRecipes() {
  const db = await createSupabaseServerClient();
  if (!db) return null;
  const { data, error } = await db.rpc("re_get_recently_reviewed_recipes");
  if (error) throw new Error("최근 후기가 달린 레시피를 불러오지 못했습니다.");
  return z.array(recipeCardSchema).parse(data);
}

export async function getMyReviews(page: number) {
  const db = await createSupabaseServerClient();
  if (!db) return null;
  const { data, error } = await db.rpc("re_get_my_reviews", { p_page: page });
  if (error) throw new Error("내 후기를 불러오지 못했습니다.");
  return reviewListSchema.parse(data);
}
