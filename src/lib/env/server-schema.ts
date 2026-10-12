// Pure validation used by next.config.ts and unit tests.
// Application code must access server settings through server.ts (server-only).
import { z } from "zod";
import {
  type EnvInput,
  isLegacyKey,
  optionalText,
  parseSafely,
} from "./shared";

const flag = z
  .enum(["true", "false"])
  .default("false")
  .transform((value) => value === "true");
const serverSchema = z
  .object({
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("production"),
    DEMO_MODE: flag,
    SUPABASE_SECRET_KEY: optionalText(
      z
        .string()
        .refine(
          (key) =>
            /^sb_secret_[A-Za-z0-9_-]+$/.test(key) ||
            isLegacyKey(key, "service_role"),
        ),
    ),
    FEATURE_AFFILIATE_LINKS: flag,
    FEATURE_SPONSORED_CHALLENGES: flag,
  })
  .superRefine((env, context) => {
    if (env.DEMO_MODE && env.NODE_ENV !== "development") {
      context.addIssue({
        code: "custom",
        path: ["DEMO_MODE"],
        message: "Development only",
      });
    }
    for (const key of [
      "FEATURE_AFFILIATE_LINKS",
      "FEATURE_SPONSORED_CHALLENGES",
    ] as const) {
      if (env[key])
        context.addIssue({
          code: "custom",
          path: [key],
          message: "Reserved for P6",
        });
    }
  });

export function parseServerEnv(input: EnvInput) {
  for (const [name, value] of Object.entries(input)) {
    if (!name.startsWith("NEXT_PUBLIC_") || !value) continue;
    if (
      /SECRET|SERVICE_ROLE/i.test(name) ||
      value.startsWith("sb_secret_") ||
      isLegacyKey(value, "service_role")
    ) {
      throw new Error(`서버 키는 공개 환경변수에 설정할 수 없습니다: ${name}`);
    }
  }
  const env = parseSafely(serverSchema, input);
  return { demoMode: env.DEMO_MODE, secretKey: env.SUPABASE_SECRET_KEY };
}
