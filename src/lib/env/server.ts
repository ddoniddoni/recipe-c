import "server-only";
import { getPublicEnv } from "./public";
import { parseServerEnv } from "./server-schema";

export function getServerEnv() {
  return parseServerEnv(process.env);
}

export function getAppStatus() {
  const { demoMode } = getServerEnv();
  // Presence of keys is configuration only; it never implies a successful connection.
  return { demoMode, hasSupabaseConfig: getPublicEnv().supabase !== null };
}
