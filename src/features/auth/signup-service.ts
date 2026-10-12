import "server-only";
import { createHmac } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { getServerEnv } from "@/lib/env/server";
import { getAuthConfig } from "@/lib/supabase/config";
import type { Database } from "@/lib/supabase/database";

type SignupResult =
  | { status: "created"; userId: string }
  | { status: "unavailable" | "limited" | "existing" | "weak-password" };

// The elevated client stays inside this module. Never confirm/update an existing
// shared Auth user: only create a new one, then sign in via the session client.
export async function createSignupAccount(input: {
  email: string; name: string; password: string;
}): Promise<SignupResult> {
  const config = getAuthConfig();
  const { secretKey } = getServerEnv();
  if (!config || !secretKey) return { status: "unavailable" };
  const admin = createClient<Database>(config.url, secretKey, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
    global: { fetch: (url, init) => fetch(url, {
      ...init, cache: "no-store", signal: AbortSignal.timeout(15_000),
    }) },
  });
  const emailHash = createHmac("sha256", secretKey)
    .update(`re.signup:${input.email.toLowerCase()}`).digest("hex");
  const limit = await admin.rpc("re_consume_signup_limit", { p_email_hash: emailHash });
  if (limit.error) return { status: "unavailable" };
  if (limit.data !== true) return { status: "limited" };
  const { data, error } = await admin.auth.admin.createUser({
    email: input.email,
    password: input.password,
    email_confirm: true,
    user_metadata: { display_name: input.name },
  });
  if (error?.code === "email_exists" || error?.code === "user_already_exists") return { status: "existing" };
  if (error?.code === "weak_password") return { status: "weak-password" };
  if (error || !data.user) return { status: "unavailable" };
  return { status: "created", userId: data.user.id };
}
