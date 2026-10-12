import { z } from "zod";

export type EnvInput = Readonly<Record<string, string | undefined>>;

export const optionalText = (schema: z.ZodType<string>) =>
  z.preprocess(
    (value) =>
      typeof value === "string" && value.trim() === "" ? undefined : value,
    schema.optional(),
  );

export const httpUrl = z
  .string()
  .url()
  .refine((value) => {
    const url = new URL(value);
    return (
      ["http:", "https:"].includes(url.protocol) &&
      !url.username &&
      !url.password
    );
  });

// This checks the key's purpose, NOT its signature or authentication validity.
export function isLegacyKey(value: string, role: "anon" | "service_role") {
  try {
    const parts = value.split(".");
    if (parts.length !== 3 || parts.some((part) => !part)) return false;
    const payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const decoded: unknown = JSON.parse(atob(payload));
    return (
      typeof decoded === "object" &&
      decoded !== null &&
      "role" in decoded &&
      decoded.role === role
    );
  } catch {
    return false;
  }
}

export function parseSafely<T>(schema: z.ZodType<T>, input: EnvInput): T {
  const result = schema.safeParse(input);
  if (!result.success) {
    const fields = [
      ...new Set(
        result.error.issues.map(
          (issue) => issue.path.join(".") || "environment",
        ),
      ),
    ];
    // Never serialize Zod issues, input values, or secrets into errors/logs.
    throw new Error(`환경변수 설정을 확인하세요: ${fields.join(", ")}`);
  }
  return result.data;
}
