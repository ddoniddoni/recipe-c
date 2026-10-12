import type { NextRequest } from "next/server";
import { createSupabaseRouteClient } from "@/lib/supabase/route";
import { authRedirect } from "@/features/auth/route-redirect";
import { safeNextPath } from "@/features/auth/redirects";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const client = createSupabaseRouteClient(request);
  if (!client) return authRedirect("/auth/error?reason=unavailable");
  if (!code || code.length > 2048) return client.finish(authRedirect("/auth/error?reason=invalid"));
  try {
    const { error } = await client.supabase.auth.exchangeCodeForSession(code);
    if (error) return client.finish(authRedirect("/auth/error?reason=expired"));
    const destination = safeNextPath(request.nextUrl.searchParams.get("next"), "/me");
    if (destination !== "/reset-password") {
      const enrollment = await client.supabase.rpc("re_ensure_account");
      if (enrollment.error) return client.finish(authRedirect("/auth/error?reason=unavailable"));
    }
    return client.finish(authRedirect(destination));
  } catch {
    return client.finish(authRedirect("/auth/error?reason=unavailable"));
  }
}
