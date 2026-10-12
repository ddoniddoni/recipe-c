import Image from "next/image";
import Link from "next/link";
import { BookmarkButton } from "@/features/community/components/bookmark-button";
import { getViewer } from "@/features/auth/viewer";
import { difficultyLabels, type PublishedRecipeCard as Card } from "../schemas";

export async function PublishedRecipeCard({ recipe }: { recipe: Card }) {
  const viewer = await getViewer();
  const member = viewer.kind === "member" && viewer.account.status === "active" && viewer.account.email_verified && viewer.account.profile_completed;
  return <article className="recipe-card">
    <Link href={`/recipes/${recipe.id}`} className="recipe-card-link">
      <Image src={`/media/${recipe.coverAssetId}`} alt={`${recipe.title} 완성 사진`}
        width={640} height={480} unoptimized className="recipe-cover" />
      <div className="recipe-card-body">
        <span className="eyebrow">{recipe.category}</span><h3>{recipe.title}</h3>
        <p className="recipe-author">{recipe.author}</p>
        <p className="recipe-meta"><span>{recipe.minutes}분</span><span>{difficultyLabels[recipe.difficulty]}</span><span>{recipe.servings}인분</span></p>
        <p className="rating-summary">{recipe.averageRating === null ? "후기 없음" : `★ ${recipe.averageRating.toFixed(1)} · 후기 ${recipe.reviewCount}개`}</p>
        <div className="card-bottom"><span className="muted">v{recipe.versionNo}</span><span aria-hidden="true">↗</span></div>
      </div>
    </Link>
    <div className="recipe-card-save">{member ? <BookmarkButton key={String(recipe.saved)} recipeId={recipe.id} saved={recipe.saved} /> : <Link className="text-link" href={`/login?next=${encodeURIComponent(`/recipes/${recipe.id}`)}`}>로그인하고 저장</Link>}<span className="field-hint">저장 {recipe.bookmarkCount}개</span></div>
  </article>;
}
