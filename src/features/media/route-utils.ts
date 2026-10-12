import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import { getPublicEnv } from "@/lib/env/public";
import { createSupabaseRouteClient } from "@/lib/supabase/route";

export function mediaJson(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: {
    "Cache-Control": "private, no-store, max-age=0", "Referrer-Policy": "no-referrer",
    "X-Content-Type-Options": "nosniff",
  } });
}
export async function readMediaRequest(request: NextRequest): Promise<unknown> {
  if (request.headers.get("origin") !== new URL(getPublicEnv().siteUrl).origin
    || request.headers.get("content-type")?.split(";")[0] !== "application/json") throw new Error("INVALID_REQUEST");
  if (Number(request.headers.get("content-length") ?? 0) > 2048) throw new Error("INVALID_REQUEST");
  const reader = request.body?.getReader();
  if (!reader) throw new Error("INVALID_REQUEST");
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 2048) { await reader.cancel(); throw new Error("INVALID_REQUEST"); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}
export async function mediaMember(context: NonNullable<ReturnType<typeof createSupabaseRouteClient>>) {
  const { data, error } = await context.supabase.auth.getUser();
  if (error || !data.user || data.user.is_anonymous) return null;
  const account = await context.supabase.rpc("get_my_account");
  const member = account.data?.[0];
  if (account.error || !member || member.status !== "active" || !member.email_verified || !member.profile_completed) return null;
  return member;
}
