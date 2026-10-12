"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { draftBodySchema, emptyRecipeBody, uuidSchema } from "./schemas";
import { recipeDbError, recipeError, type RecipeResult } from "./result";

async function writer() {
  const supabase = await createSupabaseServerClient({ writable: true });
  if (!supabase) return null;
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user || data.user.is_anonymous) return null;
  // Account status, verified email, live session and ownership are checked again
  // inside every DB write RPC, including direct calls that bypass this action.
  return supabase;
}

export async function createRecipeAction(requestId: string): Promise<RecipeResult<string>> {
  if (!uuidSchema.safeParse(requestId).success) return recipeError("VALIDATION_ERROR");
  try {
    const supabase = await writer();
    if (!supabase) return recipeError("UNAVAILABLE");
    const { data, error } = await supabase.rpc("create_recipe_draft", { p_body: emptyRecipeBody(), p_request_id: requestId });
    if (error) return recipeDbError(error);
    if (!data) return recipeError("INTERNAL_ERROR");
    revalidatePath("/me");
    return { ok: true, data };
  } catch { return recipeError("INTERNAL_ERROR"); }
}

const saveSchema = z.object({
  recipeId: uuidSchema, expectedVersion: z.number().int().positive(), requestId: uuidSchema, body: draftBodySchema,
});
export async function saveRecipeAction(input: unknown): Promise<RecipeResult<{ draftVersion: number }>> {
  const parsed = saveSchema.safeParse(input);
  if (!parsed.success) return { ...recipeError("VALIDATION_ERROR"), issues: parsed.error.issues.map((issue) => issue.message) };
  try {
    const supabase = await writer();
    if (!supabase) return recipeError("UNAVAILABLE");
    const { recipeId, expectedVersion, body, requestId } = parsed.data;
    const { data, error } = await supabase.rpc("save_recipe_draft", {
      p_recipe_id: recipeId, p_expected_version: expectedVersion, p_body: body, p_request_id: requestId,
    });
    if (error) return recipeDbError(error);
    if (!data) return recipeError("INTERNAL_ERROR");
    revalidatePath("/me");
    return { ok: true, data: { draftVersion: data } };
  } catch { return recipeError("INTERNAL_ERROR"); }
}

const publishSchema = saveSchema.omit({ body: true });
export async function publishRecipeAction(input: unknown): Promise<RecipeResult<string>> {
  const parsed = publishSchema.safeParse(input);
  if (!parsed.success) return recipeError("VALIDATION_ERROR");
  try {
    const supabase = await writer();
    if (!supabase) return recipeError("UNAVAILABLE");
    const { recipeId, expectedVersion, requestId } = parsed.data;
    const { data, error } = await supabase.rpc("publish_recipe", {
      p_recipe_id: recipeId, p_expected_version: expectedVersion, p_request_id: requestId,
    });
    if (error) return recipeDbError(error);
    if (!data) return recipeError("INTERNAL_ERROR");
    revalidatePath("/recipes"); revalidatePath(`/recipes/${recipeId}`); revalidatePath("/me"); revalidatePath("/");
    return { ok: true, data };
  } catch { return recipeError("INTERNAL_ERROR"); }
}
