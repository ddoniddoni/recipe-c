import Image from "next/image";
import { AwardBadges } from "@/features/awards/components/award-integrations";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getViewer } from "@/features/auth/viewer";
import { getRecipeDetail } from "../queries";
import { difficultyLabels } from "../schemas";
import { RecipeCommunity } from "@/features/community/components/recipe-community";
import { BookmarkButton } from "@/features/community/components/bookmark-button";
import { ReportForm } from "@/features/community/components/report-form";
import type { CommunitySearch } from "@/features/community/schemas";
import { RecipeReading } from "./recipe-reading";

export async function PublishedRecipeDetail({ id, versionId, communitySearch }: { id: string; versionId?: string; communitySearch: CommunitySearch }) {
  const [recipe, viewer] = await Promise.all([getRecipeDetail(id, versionId), getViewer()]);
  if (!recipe) notFound();
  const { card, body } = recipe;
  const member = viewer.kind === "member" && viewer.account.status === "active" && viewer.account.email_verified && viewer.account.profile_completed;
  const isCurrent = card.versionId === recipe.currentVersionId;
  return <article className="recipe-detail">
    <Link className="back-link" href="/recipes">← 레시피 목록으로</Link>
    {!isCurrent ? <aside className="version-notice">이전 발행 버전 v{card.versionNo}을 보고 있어요. <Link className="text-link" href={`/recipes/${id}`}>최신 버전 보기</Link></aside> : null}
    <div className="detail-heading">
      <div><p className="eyebrow">{card.category} · v{card.versionNo}{isCurrent ? " · 현재 버전" : ""}</p><h1>{card.title}</h1>
        <p className="detail-summary">{card.summary}</p>
        <Link className="recipe-author text-link" href={`/u/${card.handle}`}>{card.author}</Link>
        <p className="recipe-meta"><span>{card.minutes}분</span><span>{difficultyLabels[card.difficulty]}</span><span>{card.servings}인분</span></p>
        <p className="field-hint"><time dateTime={card.publishedAt}>{new Date(card.publishedAt).toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul" })}</time> 발행</p>
        <p className="rating-summary">{card.averageRating === null ? "후기 없음" : `★ ${card.averageRating.toFixed(1)} · 후기 ${card.reviewCount}개`} · 저장 {card.bookmarkCount}개</p>
        <div className="detail-actions"><Link className="button button--primary" href={`/recipes/${id}/cook?version=${card.versionId}`}>조리 보기 시작</Link>
          {viewer.kind === "member" && viewer.account.profile_id === card.authorId ? <Link className="button button--secondary" href={`/recipes/${id}/edit`}>레시피 수정</Link> : null}</div>
        {member ? <BookmarkButton key={String(card.saved)} recipeId={id} saved={card.saved} /> : <Link className="text-link" href={`/login?next=${encodeURIComponent(`/recipes/${id}`)}`}>로그인하고 저장하기</Link>}
        {member ? <ReportForm recipeId={id} targetId={id} targetType="recipe" /> : null}
      </div>
      <Image src={`/media/${card.coverAssetId}`} alt={`${card.title} 완성 사진`} width={960} height={720} unoptimized className="detail-cover" />
    </div>
    <form action={`/recipes/${id}`} method="get" className="version-selector"><label htmlFor="recipe-version">발행 버전</label>
      <select name="version" id="recipe-version" defaultValue={card.versionId}>{recipe.versions.map((version) => <option key={version.id} value={version.id}>v{version.versionNo}{version.id === recipe.currentVersionId ? " (현재)" : ""}</option>)}</select>
      <button type="submit" className="button button--secondary">선택한 버전 보기</button>
    </form>
    {body.disclosureText ? <p className="disclosure-note">작성자가 밝힌 경제적 관계: {body.disclosureText}</p> : null}
    <AwardBadges recipeId={id} />
    <RecipeReading key={card.versionId} body={body} />
    {body.tags.length ? <ul className="recipe-tags" aria-label="레시피 태그">{body.tags.map((tag) => <li key={tag}>#{tag}</li>)}</ul> : null}
    <RecipeCommunity recipe={recipe} viewer={viewer} search={communitySearch} />
  </article>;
}
