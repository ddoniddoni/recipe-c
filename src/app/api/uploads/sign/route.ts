import { z } from "zod";
import type { NextRequest } from "next/server";
import { createSupabaseRouteClient } from "@/lib/supabase/route";
import { createMediaAdminClient } from "@/lib/supabase/admin";
import { mediaJson, mediaMember, readMediaRequest } from "@/features/media/route-utils";
import { recipeDbError, recipeError } from "@/features/recipes/result";

export const runtime = "nodejs";
const schema = z.object({ recipeId: z.uuid(), requestId: z.uuid() }).strict();
export async function POST(request: NextRequest) {
  const context = createSupabaseRouteClient(request);
  if (!context) return mediaJson(recipeError("UNAVAILABLE"), 503);
  const finish = (body: unknown, status = 200) => context.finish(mediaJson(body, status));
  let input: z.infer<typeof schema>;
  try { input = schema.parse(await readMediaRequest(request)); }
  catch { return finish(recipeError("VALIDATION_ERROR"), 400); }
  try {
    const member = await mediaMember(context);
    if (!member) return finish(recipeError("UNAUTHENTICATED"), 401);
    const admin = createMediaAdminClient();
    if (!admin) return finish(recipeError("UNAVAILABLE"), 503);
    const { data: id, error } = await context.supabase.rpc("reserve_recipe_upload", {
      p_recipe_id: input.recipeId, p_request_id: input.requestId,
    });
    if (error) return finish(recipeDbError(error), 400);
    if (!id) return finish(recipeError("INTERNAL_ERROR"), 503);
    const path = `originals/${member.profile_id}/${id}`;
    const { data, error: signError } = await admin.storage.from("recipe-media").createSignedUploadUrl(path, { upsert: false });
    if (signError || !data) return finish(recipeError("INTERNAL_ERROR"), 503);
    return finish({ ok: true, data: { assetId: id, path: data.path, token: data.token } });
  } catch { return finish(recipeError("INTERNAL_ERROR"), 503); }
}
