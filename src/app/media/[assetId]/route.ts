import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseRouteClient } from "@/lib/supabase/route";
import { createMediaAdminClient } from "@/lib/supabase/admin";
import { uuidSchema } from "@/features/recipes/schemas";
import { mediaJson } from "@/features/media/route-utils";

export const runtime = "nodejs";
export async function GET(request: NextRequest, { params }: { params: Promise<{ assetId: string }> }) {
  const { assetId } = await params;
  const context = createSupabaseRouteClient(request);
  if (!context || !uuidSchema.safeParse(assetId).success) return mediaJson({ message: "사진을 찾을 수 없어요." }, 404);
  const fail = (status = 404) => context.finish(mediaJson({ message: "사진을 불러올 수 없어요." }, status));
  try {
    // User/anonymous RLS first; operational path lookup only after authorization.
    const visible = await context.supabase.from("re_media_assets").select("id,width,height").eq("id", assetId).eq("status", "ready").maybeSingle();
    if (visible.error || !visible.data) return fail();
    const access = await context.supabase.rpc("re_authorize_media_access", { p_asset_id: assetId });
    if (access.error || !access.data) return fail(access.error?.message === "RATE_LIMITED" ? 429 : 404);
    const admin = createMediaAdminClient();
    if (!admin) return fail(503);
    const asset = await admin.from("re_media_assets").select("processed_path").eq("id", assetId).eq("status", "ready").maybeSingle();
    if (asset.error || !asset.data?.processed_path) return fail();
    const signed = await admin.storage.from("re_recipe_media").createSignedUrl(asset.data.processed_path, 60);
    if (signed.error || !signed.data) return fail(503);
    const response = NextResponse.redirect(signed.data.signedUrl, 307);
    response.headers.set("X-Robots-Tag", "noindex");
    return context.finish(response);
  } catch { return fail(503); }
}
