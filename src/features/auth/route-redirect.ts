import "server-only";
import { NextResponse } from "next/server";
import { getPublicEnv } from "@/lib/env/public";

export function authRedirect(pathname: string) {
  const response = NextResponse.redirect(new URL(pathname, getPublicEnv().siteUrl), 303);
  response.headers.set("Cache-Control", "private, no-store, max-age=0");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}
