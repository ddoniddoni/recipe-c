import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { getSampleRecipes } from "@/features/recipes/fixtures.server";
import {
  filterSampleRecipes,
  normalizeSampleQuery,
} from "@/features/recipes/search";

afterEach(() => vi.unstubAllEnvs());

describe("development-only samples", () => {
  it("does not fall back to samples when keys and demo setting are absent", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("DEMO_MODE", undefined);
    expect(getSampleRecipes()).toEqual([]);
  });
  it("returns samples only after explicit development opt-in", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("DEMO_MODE", "true");
    expect(getSampleRecipes()).toHaveLength(3);
  });
  it("fails closed in production even if demo was requested", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("DEMO_MODE", "true");
    expect(() => getSampleRecipes()).toThrow("DEMO_MODE");
  });
  it("searches Korean titles and ingredients without mutating fixtures", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("DEMO_MODE", "true");
    const recipes = getSampleRecipes();
    expect(
      filterSampleRecipes(recipes, "토마토 달걀").map((r) => r.id),
    ).toEqual(["sample-tomato-rice"]);
    expect(filterSampleRecipes(recipes, "간장").map((r) => r.id)).toEqual([
      "sample-mushroom-noodles",
    ]);
    expect(filterSampleRecipes(recipes, "없는재료")).toEqual([]);
    expect(recipes).toHaveLength(3);
  });
  it("normalizes repeat query parameters and limits query length", () => {
    expect(normalizeSampleQuery(["  버섯 ", "토마토"])).toBe("버섯");
    expect(normalizeSampleQuery(undefined)).toBe("");
    expect(normalizeSampleQuery("가".repeat(200))).toHaveLength(80);
  });
});
