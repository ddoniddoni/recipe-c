import { z } from "zod";
import {
  type EnvInput,
  httpUrl,
  isLegacyKey,
  optionalText,
  parseSafely,
} from "./shared";

const publicSchema = z
  .object({
    NEXT_PUBLIC_SITE_URL: httpUrl.default("http://localhost:3000"),
    NEXT_PUBLIC_SUPABASE_URL: optionalText(httpUrl),
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: optionalText(
      z
        .string()
        .refine(
          (key) =>
            /^sb_publishable_[A-Za-z0-9_-]+$/.test(key) ||
            isLegacyKey(key, "anon"),
        ),
    ),
  })
  .superRefine((env, context) => {
    if (
      Boolean(env.NEXT_PUBLIC_SUPABASE_URL) !==
      Boolean(env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)
    ) {
      context.addIssue({
        code: "custom",
        path: ["NEXT_PUBLIC_SUPABASE_URL"],
        message: "URL/key pair required",
      });
      context.addIssue({
        code: "custom",
        path: ["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"],
        message: "URL/key pair required",
      });
    }
  });

export function parsePublicEnv(input: EnvInput) {
  const env = parseSafely(publicSchema, input);
  return {
    siteUrl: env.NEXT_PUBLIC_SITE_URL,
    supabase:
      env.NEXT_PUBLIC_SUPABASE_URL && env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
        ? {
            url: env.NEXT_PUBLIC_SUPABASE_URL,
            publishableKey: env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
          }
        : null,
  };
}

export function getPublicEnv() {
  // Explicit property access is required for NEXT_PUBLIC build-time inlining.
  return parsePublicEnv({
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  });
}
