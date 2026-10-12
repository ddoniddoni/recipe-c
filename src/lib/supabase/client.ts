"use client";

import { createBrowserClient } from "@supabase/ssr";
import { getPublicEnv } from "@/lib/env/public";
import type { Database } from "./database";

export function createSupabaseBrowserClient() {
  const config = getPublicEnv().supabase;
  if (!config) throw new Error("인증 서비스가 아직 연결되지 않았어요.");
  return createBrowserClient<Database>(config.url, config.publishableKey);
}
