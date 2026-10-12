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
