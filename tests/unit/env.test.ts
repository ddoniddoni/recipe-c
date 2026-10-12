import { describe, expect, it } from "vitest";
import { parsePublicEnv } from "@/lib/env/public";
import { parseServerEnv } from "@/lib/env/server-schema";

// Deliberately synthetic, unsigned values: never accepted as authentication.
const legacy = (role: string) =>
  `header.${btoa(JSON.stringify({ role }))}.signature`;
const publicConfig = {
  NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test_fixture",
};

describe("public environment", () => {
  it("allows missing Supabase config without claiming a connection", () => {
    expect(parsePublicEnv({}).supabase).toBeNull();
    expect(
      parsePublicEnv({
        NEXT_PUBLIC_SUPABASE_URL: "",
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "",
      }).supabase,
    ).toBeNull();
  });
  it("accepts a publishable key and URL pair", () => {
    expect(parsePublicEnv(publicConfig).supabase?.url).toBe(
      publicConfig.NEXT_PUBLIC_SUPABASE_URL,
    );
  });
  it.each(["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"])(
    "rejects partial config missing %s",
    (name) => {
      expect(() => parsePublicEnv({ ...publicConfig, [name]: "" })).toThrow(
        "환경변수",
      );
    },
  );
  it.each([
    "javascript:alert(1)",
    "ftp://example.com",
    "https://user:pass@example.com",
  ])("rejects unsafe URL %s", (url) => {
    expect(() => parsePublicEnv({ NEXT_PUBLIC_SITE_URL: url })).toThrow(
      "NEXT_PUBLIC_SITE_URL",
    );
  });
  it("accepts legacy anon keys only in the public key slot", () => {
    expect(
      parsePublicEnv({
        ...publicConfig,
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: legacy("anon"),
      }).supabase,
    ).not.toBeNull();
    expect(() =>
      parsePublicEnv({
        ...publicConfig,
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: legacy("service_role"),
      }),
    ).toThrow();
  });
  it.each(["sb_secret_sensitive_fixture", "not-a-key", "eyJ.invalid.payload"])(
    "rejects invalid/privileged public keys without echoing values",
    (key) => {
      try {
        parsePublicEnv({
          ...publicConfig,
          NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: key,
        });
        expect.fail("must reject");
      } catch (error) {
        expect(String(error)).toContain("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
        expect(String(error)).not.toContain(key);
      }
    },
  );
  it("never returns unrelated or server settings", () => {
    expect(
      parsePublicEnv({
        ...publicConfig,
        SUPABASE_SECRET_KEY: "sb_secret_sensitive_fixture",
      }),
    ).not.toHaveProperty("SUPABASE_SECRET_KEY");
  });
});

describe("server environment", () => {
  it("defaults to no demo and no secret", () => {
    expect(parseServerEnv({})).toEqual({
      demoMode: false,
      secretKey: undefined,
    });
  });
  it("requires explicit development opt-in", () => {
    expect(
      parseServerEnv({ NODE_ENV: "development", DEMO_MODE: "true" }).demoMode,
    ).toBe(true);
    expect(
      parseServerEnv({ NODE_ENV: "production", DEMO_MODE: "false" }).demoMode,
    ).toBe(false);
  });
  it("rejects demo when the execution environment is unknown", () => {
    expect(() => parseServerEnv({ DEMO_MODE: "true" })).toThrow("DEMO_MODE");
  });
  it.each(["production", "test"])("rejects demo in %s", (NODE_ENV) => {
    expect(() => parseServerEnv({ NODE_ENV, DEMO_MODE: "true" })).toThrow(
      "DEMO_MODE",
    );
  });
  it.each(["yes", "1", "TRUE"])(
    "rejects ambiguous demo flag %s",
    (DEMO_MODE) => {
      expect(() => parseServerEnv({ DEMO_MODE })).toThrow("DEMO_MODE");
    },
  );
  it.each(["FEATURE_AFFILIATE_LINKS", "FEATURE_SPONSORED_CHALLENGES"])(
    "blocks out-of-scope feature %s",
    (flag) => {
      expect(() => parseServerEnv({ [flag]: "true" })).toThrow(flag);
    },
  );
  it("accepts server secrets only in their private slot", () => {
    expect(
      parseServerEnv({ SUPABASE_SECRET_KEY: "sb_secret_test_fixture" })
        .secretKey,
    ).toBeDefined();
    expect(
      parseServerEnv({ SUPABASE_SECRET_KEY: legacy("service_role") }).secretKey,
    ).toBeDefined();
    expect(() =>
      parseServerEnv({ SUPABASE_SECRET_KEY: "sb_publishable_wrong_role" }),
    ).toThrow("SUPABASE_SECRET_KEY");
  });
  it.each([
    { NEXT_PUBLIC_SUPABASE_SECRET_KEY: "sb_secret_private_fixture" },
    { NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY: legacy("service_role") },
    { NEXT_PUBLIC_UNEXPECTED_NAME: "sb_secret_private_fixture" },
    { NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: legacy("service_role") },
  ])("rejects privileged keys under public prefixes", (input) => {
    expect(() => parseServerEnv(input)).toThrow("서버 키는 공개 환경변수");
  });
});
