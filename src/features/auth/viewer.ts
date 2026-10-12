import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { getAppStatus } from "@/lib/env/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database";
import { safeNextPath } from "./redirects";

export type Member = Database["public"]["Functions"]["get_my_account"]["Returns"][number];
export type Viewer =
  | { kind: "unconfigured" | "demo" | "guest" | "unavailable" }
  | { kind: "member"; email: string; account: Member };

// React cache deduplicates within this request only. Never persist session data.
export const getViewer = cache(async (): Promise<Viewer> => {
  const status = getAppStatus();
  if (status.demoMode) return { kind: "demo" };
  if (!status.hasSupabaseConfig) return { kind: "unconfigured" };
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { kind: "unconfigured" };
  try {
    const { data: verified, error } = await supabase.auth.getClaims();
    if (error?.name === "AuthRetryableFetchError") return { kind: "unavailable" };
    if (error || !verified?.claims.sub) return { kind: "guest" };
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError?.name === "AuthRetryableFetchError") return { kind: "unavailable" };
    if (userError || !userData.user || userData.user.is_anonymous) return { kind: "guest" };
    const { data, error: accountError } = await supabase.rpc("get_my_account");
    if (accountError || !data?.[0]) return { kind: "unavailable" };
    return { kind: "member", email: userData.user.email ?? "", account: data[0] };
  } catch {
    return { kind: "unavailable" };
  }
});

export async function getPageViewer(next: string) {
  const viewer = await getViewer();
  if (viewer.kind === "guest") redirect(`/login?next=${encodeURIComponent(safeNextPath(next))}`);
  return viewer;
}
