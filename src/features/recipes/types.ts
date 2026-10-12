export type SampleRecipe = {
  id: string;
  title: string;
  summary: string;
  author: string;
  category: string;
  minutes: number;
  servings: number;
  difficulty: "쉬움" | "보통";
  tone: "clay" | "herb" | "oat";
  ingredients: readonly { name: string; amount: string }[];
  steps: readonly string[];
  tip: string;
};
