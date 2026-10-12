import Image from "next/image";
import Link from "next/link";
import type { CookReview } from "../schemas";
import { ReportForm } from "./report-form";

export function ReviewCard({ review, currentVersionId, canReport = false, showRecipe = false }: {
  review: CookReview; currentVersionId?: string; canReport?: boolean; showRecipe?: boolean;
}) {
  return <article className="community-entry review-entry" id={`review-${review.id}`}>
    <header className="community-entry-heading">
      <Link className="text-link" href={`/u/${review.handle}`}>{review.author}</Link>
      <span className="review-score" aria-label={`5점 만점에 ${review.rating}점`}>★ {review.rating} / 5</span>
      <time dateTime={review.createdAt}>{new Date(review.createdAt).toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul" })}</time>
    </header>
    <p className="field-hint"><Link href={`/recipes/${review.recipeId}?version=${review.versionId}#reviews`}>{showRecipe ? `${review.title} · ` : ""}v{review.versionNo}로 만든 후기</Link>
      {currentVersionId && review.versionId !== currentVersionId ? " · 이전 버전으로 만든 후기" : ""}</p>
    <p className="community-body">{review.body}</p>
    <div className="review-photos">{review.assetIds.map((asset, i) => <Image key={asset} src={`/media/${asset}`} alt={`${review.author}님의 요리 사진 ${i + 1}`} width={480} height={360} unoptimized />)}</div>
    {review.updatedAt !== review.createdAt ? <p className="field-hint">수정된 후기</p> : null}
    {canReport ? <ReportForm recipeId={review.recipeId} targetId={review.id} targetType="review" /> : null}
  </article>;
}
