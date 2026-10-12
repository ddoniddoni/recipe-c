import Link from "next/link";
import type { SampleRecipe } from "../types";
import { RecipeVisual } from "./recipe-visual";

export function RecipeMeta({ recipe }: { recipe: SampleRecipe }) {
  return (
    <p className="recipe-meta">
      <span>{recipe.minutes}분</span>
      <span>{recipe.difficulty}</span>
      <span>{recipe.servings}인분</span>
    </p>
  );
}

export function RatingSummary() {
  return <span className="rating-summary">후기 없음</span>;
}

export function RecipeCard({ recipe }: { recipe: SampleRecipe }) {
  return (
    <article className="recipe-card">
      <Link href={`/recipes/${recipe.id}`} className="recipe-card-link">
        <RecipeVisual tone={recipe.tone} />
        <div className="recipe-card-body">
          <span className="eyebrow">{recipe.category}</span>
          <h3>{recipe.title}</h3>
          <p className="recipe-author">{recipe.author}</p>
          <RecipeMeta recipe={recipe} />
          <div className="card-bottom">
            <RatingSummary />
            <span aria-hidden="true">↗</span>
          </div>
        </div>
      </Link>
    </article>
  );
}
