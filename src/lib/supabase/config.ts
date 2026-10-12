import "server-only";
import { getPublicEnv } from "@/lib/env/public";
import { getServerEnv } from "@/lib/env/server";

export function getAuthConfig() {
  if (getServerEnv().demoMode) return null;
  return getPublicEnv().supabase;
}
