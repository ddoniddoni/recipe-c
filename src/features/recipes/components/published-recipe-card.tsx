import Image from "next/image";
import Link from "next/link";
import { difficultyLabels, type PublishedRecipeCard as Card } from "../schemas";

export function PublishedRecipeCard({ recipe }: { recipe: Card }) {
  return <article className="recipe-card">
    <Link href={`/recipes/${recipe.id}`} className="recipe-card-link">
      <Image src={`/media/${recipe.coverAssetId}`} alt={`${recipe.title} 완성 사진`}
        width={640} height={480} unoptimized className="recipe-cover" />
      <div className="recipe-card-body">
        <span className="eyebrow">{recipe.category}</span><h3>{recipe.title}</h3>
        <p className="recipe-author">{recipe.author}</p>
        <p className="recipe-meta"><span>{recipe.minutes}분</span><span>{difficultyLabels[recipe.difficulty]}</span><span>{recipe.servings}인분</span></p>
        <div className="card-bottom"><span className="muted">v{recipe.versionNo}</span><span aria-hidden="true">↗</span></div>
      </div>
    </Link>
  </article>;
}
