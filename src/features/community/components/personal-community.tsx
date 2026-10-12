import Link from "next/link";
import { EmptyState } from "@/components/ui/states";
import { PublishedRecipeCard } from "@/features/recipes/components/published-recipe-card";
import { Pagination } from "@/features/recipes/components/pagination";
import { getMyBookmarks, getMyReports, getMyReviews } from "../queries";
import { reportReasons } from "../schemas";
import { BookmarkButton } from "./bookmark-button";
import { ReviewCard } from "./review-card";

export async function PersonalCommunity({ page, tab }: { page: number; tab: string }) {
  if (tab === "saved") {
    const data = await getMyBookmarks(page);
    return <section className="section-space"><h2>저장한 레시피</h2><p className="field-hint">이 저장 목록은 나에게만 보여요.</p>
      {data?.items.length ? <div className="recipe-grid">{data.items.map(({ recipeId, card }) => card ? <PublishedRecipeCard key={recipeId} recipe={card} />
        : <article className="member-card" key={recipeId}><h3>현재 볼 수 없는 레시피</h3><p>삭제되었거나 숨겨진 레시피예요.</p><BookmarkButton recipeId={recipeId} saved /></article>)}</div>
        : <EmptyState title="아직 저장한 레시피가 없어요" action={<Link className="button button--primary" href="/recipes">레시피 둘러보기</Link>}><p>다음에 만들 요리를 저장해 보세요.</p></EmptyState>}
      <Pagination page={page} total={data?.total ?? 0} href={(p) => `/me?tab=saved&page=${p}`} />
    </section>;
  }
  if (tab === "reports") {
    const data = await getMyReports(page);
    const status = { pending: "접수됨", reviewing: "확인 중", resolved: "처리 완료", dismissed: "조치 없이 종료" };
    return <section className="section-space"><h2>내 신고 접수</h2>
      {data?.items.length ? data.items.map((report) => <article key={report.id} className="community-entry"><strong>{reportReasons[report.reason_code]}</strong>
        <p>{status[report.status]}</p><time dateTime={report.created_at}>{new Date(report.created_at).toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul" })}</time><p className="field-hint">접수 번호 {report.id}</p></article>)
        : <EmptyState title="접수한 신고가 없어요"><p>확인이 필요한 게시물에서 신고할 수 있어요.</p></EmptyState>}
      <Pagination page={page} total={data?.total ?? 0} href={(p) => `/me?tab=reports&page=${p}`} />
    </section>;
  }
  const data = await getMyReviews(page);
  return <section className="section-space"><h2>내 요리 후기</h2><p className="field-hint">현재 볼 수 있는 레시피에 남긴 내 후기예요. 해당 버전에서 수정하거나 삭제한 후기를 다시 작성할 수 있어요.</p>
    {data?.items.length ? data.items.map((review) => review.status === "published" ? <ReviewCard key={review.id} review={review} showRecipe />
      : <article className="community-entry" key={review.id}><h3>{review.title} · v{review.versionNo}</h3><p>{review.status === "deleted" ? "삭제한 후기" : "운영 확인 중인 후기"}</p>
        <Link className="text-link" href={`/recipes/${review.recipeId}?version=${review.versionId}#reviews`}>{review.status === "deleted" ? "후기 다시 작성" : "레시피 보기"}</Link></article>)
      : <EmptyState title="아직 표시할 후기가 없어요"><p>직접 만들어 본 요리의 사진과 이야기를 남겨 보세요.</p></EmptyState>}
    <Pagination page={page} total={data?.total ?? 0} href={(p) => `/me?tab=reviews&page=${p}`} />
  </section>;
}
