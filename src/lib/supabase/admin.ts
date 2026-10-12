import "server-only";
import { createClient } from "@supabase/supabase-js";
import { getAuthConfig } from "./config";
import { getServerEnv } from "@/lib/env/server";
import type { Database } from "./database";

// Media processing only. User reads/writes continue to use their session client.
export function createMediaAdminClient() {
  const config = getAuthConfig();
  const { secretKey } = getServerEnv();
  if (!config || !secretKey) return null;
  return createClient<Database>(config.url, secretKey, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
    global: { fetch: (input, init) => fetch(input, {
      ...init, cache: "no-store", signal: AbortSignal.timeout(15_000),
    }) },
  });
}
