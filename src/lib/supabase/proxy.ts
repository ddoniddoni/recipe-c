import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getAuthConfig } from "./config";
import type { Database } from "./database";

export async function refreshSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const config = getAuthConfig();
  const cacheHeaders = new Headers({
    "Cache-Control": "private, no-store, max-age=0",
    "Pragma": "no-cache",
    "Expires": "0",
  });
  if (config) {
    const supabase = createServerClient<Database>(config.url, config.publishableKey, {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(cookiesToSet, headers) {
          for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
          const previousCookies = response.cookies.getAll();
          response = NextResponse.next({ request });
          for (const cookie of previousCookies) response.cookies.set(cookie);
          for (const { name, value, options } of cookiesToSet) response.cookies.set(name, value, options);
          for (const [key, value] of Object.entries(headers)) cacheHeaders.set(key, value);
        },
      },
    });
    try {
      await supabase.auth.getClaims();
    } catch {
      // Page/action guards still deny access if authentication is unavailable.
      // Do not log cookies, tokens, or provider error payloads.
    }
  }
  cacheHeaders.forEach((value, key) => response.headers.set(key, value));
  if (request.nextUrl.pathname.startsWith("/auth/")) response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}
