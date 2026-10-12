import "server-only";
import { cache } from "react";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { draftSchema, recipeCardSchema, recipeDetailSchema, uuidSchema, type Category } from "./schemas";
import type { RecipeSearch } from "./search";

export const getCategories = cache(async (): Promise<Category[]> => {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return [];
  const { data, error } = await supabase.from("categories").select("id,slug,name").eq("is_active", true).order("sort_order");
  if (error) throw new Error("카테고리를 불러오지 못했습니다.");
  return data ?? [];
});
const listingSchema = z.object({ items: z.array(recipeCardSchema), total: z.number().int().nonnegative() });
export async function searchRecipes(search: RecipeSearch, authorId?: string) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;
  const { data, error } = await supabase.rpc("search_recipes", {
    p_query: search.q, p_category: search.category, p_difficulty: search.difficulty,
    p_max_minutes: search.maxMinutes, p_page: search.page, ...(authorId ? { p_author: authorId } : {}),
  });
  if (error) throw new Error("레시피 목록을 불러오지 못했습니다.");
  return listingSchema.parse(data);
}
export const getRecipeDetail = cache(async (recipeId: string, versionId?: string) => {
  if (!uuidSchema.safeParse(recipeId).success || (versionId !== undefined && !uuidSchema.safeParse(versionId).success)) return null;
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;
  const { data, error } = await supabase.rpc("get_recipe_detail", { p_recipe_id: recipeId, ...(versionId ? { p_version_id: versionId } : {}) });
  if (error) throw new Error("레시피를 불러오지 못했습니다.");
  return data === null ? null : recipeDetailSchema.parse(data);
});
export async function getRecipeDraft(recipeId: string) {
  if (!uuidSchema.safeParse(recipeId).success) return null;
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;
  const { data, error } = await supabase.rpc("get_recipe_draft", { p_recipe_id: recipeId });
  if (error) throw new Error("초안을 불러오지 못했습니다.");
  return data === null ? null : draftSchema.parse(data);
}
const myRecipesSchema = z.object({
  items: z.array(z.object({ id: uuidSchema, title: z.string(), status: z.string(), updated_at: z.string(),
    current_version_id: uuidSchema.nullable(), draft_version: z.number().int() })), total: z.number().int().nonnegative(),
});
export async function getMyRecipes(page: number) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;
  const { data, error } = await supabase.rpc("get_my_recipes", { p_page: page });
  if (error) throw new Error("내 레시피를 불러오지 못했습니다.");
  return myRecipesSchema.parse(data);
}
