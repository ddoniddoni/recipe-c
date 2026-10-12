import type { SampleRecipe } from "./types";

export function normalizeSampleQuery(value: string | string[] | undefined) {
  return (Array.isArray(value) ? (value[0] ?? "") : (value ?? ""))
    .trim()
    .slice(0, 80);
}

export function filterSampleRecipes(
  recipes: readonly SampleRecipe[],
  query: string,
) {
  const normalize = (value: string) =>
    value.normalize("NFKC").toLocaleLowerCase("ko-KR").replace(/\s+/g, "");
  const needle = normalize(query);
  return recipes.filter((recipe) =>
    normalize(
      [recipe.title, ...recipe.ingredients.map(({ name }) => name)].join(" "),
    ).includes(needle),
  );
}

export type RecipeSearch = { q: string; category: string; maxMinutes: number; difficulty: string; sort: "newest" | "rating" | "reviews" | "saved"; page: number };
export function parseRecipeSearch(params: Record<string, string | string[] | undefined>): RecipeSearch {
  const single = (key: string) => Array.isArray(params[key]) ? params[key]?.[0] : params[key];
  const page = Number(single("page") ?? 1);
  const minutes = Number(single("maxMinutes") ?? 1440);
  const difficulty = single("difficulty") ?? "";
  const category = single("category") ?? "";
  return {
    q: normalizeSampleQuery(params.q), category: /^[a-z][a-z0-9-]{1,39}$/.test(category) ? category : "",
    maxMinutes: Number.isInteger(minutes) && minutes > 0 && minutes <= 1440 ? minutes : 1440,
    difficulty: ["easy", "medium", "hard"].includes(difficulty) ? difficulty : "",
    sort: (["rating", "reviews", "saved"].includes(single("sort") ?? "") ? single("sort") : "newest") as RecipeSearch["sort"],
    page: Number.isInteger(page) ? Math.min(100, Math.max(1, page)) : 1,
  };
}
export function recipeSearchHref(search: RecipeSearch, page: number) {
  const query = new URLSearchParams({ sort: search.sort, page: String(page) });
  if (search.q) query.set("q", search.q);
  if (search.category) query.set("category", search.category);
  if (search.maxMinutes !== 1440) query.set("maxMinutes", String(search.maxMinutes));
  if (search.difficulty) query.set("difficulty", search.difficulty);
  return `/recipes?${query}`;
}
