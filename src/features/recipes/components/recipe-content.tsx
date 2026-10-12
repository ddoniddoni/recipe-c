import type { SampleRecipe } from "../types";

export function IngredientList({ recipe }: { recipe: SampleRecipe }) {
  return (
    <section className="ingredients" aria-labelledby="ingredients-title">
      <div className="section-heading">
        <h2 id="ingredients-title">재료</h2>
        <span className="muted">{recipe.servings}인분 기준</span>
      </div>
      <dl>
        {recipe.ingredients.map(({ name, amount }) => (
          <div key={name}>
            <dt>{name}</dt>
            <dd>{amount}</dd>
          </div>
        ))}
      </dl>
      <p className="field-hint">표시된 분량은 샘플 레시피의 기본 분량이에요.</p>
    </section>
  );
}

export function StepList({ steps }: { steps: SampleRecipe["steps"] }) {
  return (
    <section aria-labelledby="steps-title">
      <h2 id="steps-title">만드는 순서</h2>
      <ol className="step-list">
        {steps.map((step, index) => (
          <li key={step}>
            <span aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
            <p>{step}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
