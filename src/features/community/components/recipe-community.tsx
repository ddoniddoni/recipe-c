import Link from "next/link";
import { getServerEnv } from "@/lib/env/server";
import type { Viewer } from "@/features/auth/viewer";
import type { RecipeDetail } from "@/features/recipes/schemas";
import { EmptyState } from "@/components/ui/states";
import { Pagination } from "@/features/recipes/components/pagination";
import { getCommunity } from "../queries";
import { commentKinds, communityHref, type CommunitySearch, type RecipeComment } from "../schemas";
import { ReviewCard } from "./review-card";
import { ReviewEditor } from "./review-editor";
import { CommentEditor } from "./comment-editor";
import { ReportForm } from "./report-form";

function Comment({ comment, authorId, viewerId }: { comment: RecipeComment; authorId: string; viewerId: string | null }) {
  return <article className="community-entry" id={`comment-${comment.id}`}>
    <header className="community-entry-heading">
      {comment.handle ? <Link className="text-link" href={`/u/${comment.handle}`}>{comment.author}</Link> : <span>{comment.author}</span>}
      {comment.authorId === authorId ? <span className="author-label">레시피 작성자</span> : null}
      <span className="field-hint">{commentKinds[comment.kind]}</span>
    </header>
    <p className="community-body">{comment.status === "deleted" ? "작성자가 삭제한 댓글이에요." : comment.body}</p>
    {viewerId && comment.status === "published" ? <div className="comment-controls">
      {viewerId === comment.authorId ? <details><summary>수정·삭제</summary><CommentEditor key={comment.id} recipeId={comment.recipeId} comment={comment} /></details> : null}
      <ReportForm recipeId={comment.recipeId} targetId={comment.id} targetType="comment" />
    </div> : null}
  </article>;
}

export async function RecipeCommunity({ recipe, viewer, search }: { recipe: RecipeDetail; viewer: Viewer; search: CommunitySearch }) {
  const { card } = recipe;
  const data = await getCommunity(card.id, card.versionId, search);
  if (!data) return <EmptyState title="후기와 댓글을 불러올 수 없어요"><p>페이지를 새로고침해 주세요.</p></EmptyState>;
  const member = viewer.kind === "member" && viewer.account.status === "active" && viewer.account.email_verified && viewer.account.profile_completed;
  const viewerId = member && viewer.kind === "member" ? viewer.account.profile_id : null;
  const href = (patch: Partial<CommunitySearch>, anchor: string) => communityHref(card.id, card.versionId, { ...search, ...patch }, anchor);
  return <div className="recipe-community">
    <section className="section-space" id="reviews" aria-labelledby="reviews-title">
      <div className="section-heading"><div><p className="eyebrow">한 끼를 만들어 본 이야기</p><h2 id="reviews-title">요리 사진 후기</h2></div></div>
      <div className="review-summary"><strong>{card.averageRating === null ? "아직 후기가 없어요" : `★ ${card.averageRating.toFixed(1)} / 5`}</strong>
        <span>v{card.versionNo} · 후기 {card.reviewCount}개</span><p>다른 버전의 별점은 이 평균에 섞이지 않아요.</p></div>
      {viewerId === card.authorId ? <p className="version-notice">내 레시피에는 별점 후기를 남길 수 없어요. 아래 댓글에서 이야기를 나눠 주세요.</p>
        : viewerId ? <ReviewEditor key={card.versionId} recipeId={card.id} versionId={card.versionId} versionNo={card.versionNo}
          review={data.ownReview} canUpload={Boolean(getServerEnv().secretKey)} />
          : <p className="version-notice"><Link className="text-link" href={viewer.kind === "member" ? "/settings/profile" : `/login?next=${encodeURIComponent(`/recipes/${card.id}`)}`}>로그인과 프로필 설정</Link>을 마치면 사진 후기를 남길 수 있어요.</p>}
      <div className="results-heading"><h3>모든 버전의 후기</h3><span className="muted">{data.reviewTotal}개</span></div>
      {data.reviews.length ? data.reviews.map((review) => <ReviewCard key={review.id} review={review} currentVersionId={recipe.currentVersionId} canReport={member} />)
        : <EmptyState title="아직 등록된 후기가 없어요"><p>직접 만든 한 끼를 사진과 함께 나눠 주세요.</p></EmptyState>}
      <Pagination page={search.reviewsPage} total={data.reviewTotal} href={(page) => href({ reviewsPage: page }, "reviews")} />
    </section>
    <section className="section-space" id="comments" aria-labelledby="comments-title">
      <div className="section-heading"><div><p className="eyebrow">질문부터 대체 재료까지</p><h2 id="comments-title">의견 나누기</h2></div><span className="muted">{data.commentTotal}개 대화</span></div>
      <p className="field-hint">댓글은 평점에 반영되지 않아요. 답글은 한 단계까지 남길 수 있어요.</p>
      {member ? <CommentEditor recipeId={card.id} /> : <p className="muted">로그인 후 의견을 나눌 수 있어요.</p>}
      {search.threadId ? <Link className="text-link" href={href({ threadId: undefined, repliesPage: 1 }, "comments")}>← 전체 대화 보기</Link> : null}
      {data.comments.length ? data.comments.map((thread) => <div className="comment-thread" key={thread.id}>
        <Comment comment={thread} authorId={card.authorId} viewerId={viewerId} />
        <div className="comment-replies">
          {thread.replies.map((reply) => <Comment key={reply.id} comment={reply} authorId={card.authorId} viewerId={viewerId} />)}
          {!search.threadId && thread.replyCount > 3 ? <Link className="text-link" href={href({ threadId: thread.id, repliesPage: 1 }, "comments")}>답글 {thread.replyCount}개 모두 보기</Link> : null}
          {search.threadId ? <Pagination page={search.repliesPage} total={thread.replyCount} href={(page) => href({ repliesPage: page }, "comments")} /> : null}
          {member ? <details><summary>답글 쓰기</summary><CommentEditor recipeId={card.id} parentId={thread.id} /></details> : null}
        </div>
      </div>) : <EmptyState title={search.threadId ? "이 대화를 볼 수 없어요" : "첫 이야기를 기다리고 있어요"}><p>{search.threadId ? "삭제되었거나 숨겨진 대화일 수 있어요." : "궁금한 점이나 함께 나눌 팁을 적어 주세요."}</p></EmptyState>}
      {!search.threadId ? <Pagination page={search.commentsPage} total={data.commentTotal} href={(page) => href({ commentsPage: page }, "comments")} /> : null}
    </section>
  </div>;
}
