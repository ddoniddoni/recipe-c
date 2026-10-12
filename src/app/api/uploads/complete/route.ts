import { z } from "zod";
import type { NextRequest } from "next/server";
import { createSupabaseRouteClient } from "@/lib/supabase/route";
import { createMediaAdminClient } from "@/lib/supabase/admin";
import { mediaJson, mediaMember, readMediaRequest } from "@/features/media/route-utils";
import { InvalidImageError, MAX_UPLOAD_BYTES, processRecipeImage } from "@/features/media/image-processing";
import { recipeDbError, recipeError } from "@/features/recipes/result";

export const runtime = "nodejs";
export const maxDuration = 60;
const schema = z.object({ assetId: z.uuid() }).strict();
const claimSchema = z.object({ id: z.uuid(), status: z.enum(["ready", "processing"]), token: z.uuid().nullable() });
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
    const { data, error } = await context.supabase.rpc("claim_recipe_upload", { p_asset_id: input.assetId });
    if (error) return finish(recipeDbError(error), 400);
    const claim = claimSchema.parse(data);
    const originalPath = `originals/${member.profile_id}/${claim.id}`;
    const removeOriginal = async () => {
      // Failed cleanup is retryable and does not pretend to have succeeded.
      const removed = await admin.storage.from("recipe-media").remove([originalPath]);
      if (!removed.error) await admin.from("media_assets").update({ original_removed_at: new Date().toISOString() })
        .eq("id", claim.id).eq("owner_id", member.profile_id).eq("status", "ready");
    };
    if (claim.status === "ready") {
      await removeOriginal().catch(() => undefined);
      return finish({ ok: true, data: { assetId: claim.id } });
    }
    if (!claim.token) return finish(recipeError("INTERNAL_ERROR"), 503);
    const token = claim.token;
    const complete = (result: { [key: string]: string | number }) => admin.rpc("finish_recipe_upload", {
      p_asset_id: claim.id, p_owner_id: member.profile_id, p_token: token, p_result: result,
    });
    try {
      const original = await admin.storage.from("recipe-media").download(originalPath);
      if (original.error || !original.data) {
        await complete({ status: "pending", errorCode: "UPLOAD_MISSING" });
        return finish({ ok: false, code: "UPLOAD_MISSING", message: "원본 업로드를 확인하지 못했어요. 같은 사진으로 업로드를 다시 시도해 주세요." }, 409);
      }
      if (original.data.size > MAX_UPLOAD_BYTES) throw new InvalidImageError();
      const output = await processRecipeImage(Buffer.from(await original.data.arrayBuffer()));
      // Attempt-specific paths prevent an expired worker replacing a retry's bytes.
      const processedPath = `processed/${member.profile_id}/${claim.id}/${token}.webp`;
      const uploaded = await admin.storage.from("recipe-media").upload(processedPath, output.bytes, {
        contentType: "image/webp", upsert: false, cacheControl: "0",
      });
      if (uploaded.error) throw new Error("STORAGE_FAILED");
      const result = await complete({ status: "ready", bytes: output.bytes.length,
        width: output.width, height: output.height, sha256: output.sha256 });
      // An ambiguous DB/network result may already have committed. Never delete
      // output bytes in this case; retry claim/read instead of breaking references.
      if (result.error || !result.data) return finish(recipeError("INTERNAL_ERROR"), 503);
      await removeOriginal().catch(() => undefined);
      return finish({ ok: true, data: { assetId: claim.id } });
    } catch (error) {
      const invalid = error instanceof InvalidImageError;
      await complete({ status: invalid ? "rejected" : "pending", errorCode: invalid ? "INVALID_IMAGE" : "PROCESSING_FAILED" });
      return finish(invalid ? recipeError("UPLOAD_REJECTED") : recipeError("INTERNAL_ERROR"), invalid ? 400 : 503);
    }
  } catch { return finish(recipeError("INTERNAL_ERROR"), 503); }
}
