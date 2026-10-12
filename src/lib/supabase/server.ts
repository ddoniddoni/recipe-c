import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getAuthConfig } from "./config";
import type { Database } from "./database";

// Never share this client across requests. Proxy refreshes read-only RSC cookies.
export async function createSupabaseServerClient({ writable = false } = {}) {
  const config = getAuthConfig();
  if (!config) return null;
  const cookieStore = await cookies();
  return createServerClient<Database>(config.url, config.publishableKey, {
    global: { fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }) },
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll(cookiesToSet) {
        // Server Actions can write cookies; Server Components cannot.
        // Proxy applies private/no-store headers to every app request.
        if (!writable) return;
        for (const { name, value, options } of cookiesToSet) {
          cookieStore.set(name, value, options);
        }
      },
    },
  });
}
