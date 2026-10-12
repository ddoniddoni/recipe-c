import type { NextRequest } from "next/server";
import { createSupabaseRouteClient } from "@/lib/supabase/route";
import { authRedirect } from "@/features/auth/route-redirect";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token_hash");
  const type = request.nextUrl.searchParams.get("type");
  const client = createSupabaseRouteClient(request);
  if (!client) return authRedirect("/auth/error?reason=unavailable");
  if (!token || token.length > 512 || (type !== "signup" && type !== "recovery")) {
    return client.finish(authRedirect("/auth/error?reason=invalid"));
  }
  try {
    const { error } = await client.supabase.auth.verifyOtp({ token_hash: token, type });
    if (error) return client.finish(authRedirect("/auth/error?reason=expired"));
    return client.finish(authRedirect(type === "recovery" ? "/reset-password" : "/settings/profile"));
  } catch {
    return client.finish(authRedirect("/auth/error?reason=unavailable"));
  }
}
