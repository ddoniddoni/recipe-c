import "server-only";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import type { NextRequest, NextResponse } from "next/server";
import { getAuthConfig } from "./config";
import type { Database } from "./database";

export function createSupabaseRouteClient(request: NextRequest) {
  const config = getAuthConfig();
  if (!config) return null;
  const pending = new Map<string, { name: string; value: string; options: CookieOptions }>();
  const cacheHeaders = new Headers({
    "Cache-Control": "private, no-store, max-age=0",
    "Pragma": "no-cache",
    "Expires": "0",
    "Referrer-Policy": "no-referrer",
  });
  const supabase = createServerClient<Database>(config.url, config.publishableKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet, headers) {
        for (const cookie of cookiesToSet) {
          request.cookies.set(cookie.name, cookie.value);
          pending.set(cookie.name, cookie);
        }
        for (const [key, value] of Object.entries(headers)) cacheHeaders.set(key, value);
      },
    },
  });
  return {
    supabase,
    finish(response: NextResponse) {
      for (const { name, value, options } of pending.values()) response.cookies.set(name, value, options);
      cacheHeaders.forEach((value, key) => response.headers.set(key, value));
      return response;
    },
  };
}
