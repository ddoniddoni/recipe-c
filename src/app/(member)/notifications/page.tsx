import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getPageViewer } from "@/features/auth/viewer";
import { MemberNotice } from "@/features/auth/components/member-notice";
import { EmptyState } from "@/components/ui/states";
import { Pagination } from "@/features/recipes/components/pagination";
import { getNotifications } from "@/features/community/queries";
import { pageNumber } from "@/features/community/schemas";
import { ReadNotificationsButton } from "@/features/community/components/read-notifications-button";

export const metadata: Metadata = { title: "알림", robots: { index: false, follow: false } };
export default async function NotificationsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const viewer = await getPageViewer("/notifications");
  if (viewer.kind !== "member" || !viewer.account.email_verified || viewer.account.status !== "active") return <MemberNotice viewer={viewer} />;
  if (!viewer.account.profile_completed) redirect("/settings/profile");
  const page = pageNumber((await searchParams).page);
  const data = await getNotifications(page);
  return <section className="member-page"><header className="page-heading"><p className="eyebrow">내 요리에 도착한 이야기</p><h1>알림</h1><p>읽지 않은 알림 {data?.unread ?? 0}개</p></header>
    <ReadNotificationsButton ids={data?.items.filter((n) => !n.readAt).map((n) => n.id) ?? []} />
    {data?.items.length ? <ul className="notification-list">{data.items.map((n) => {
      const query = new URLSearchParams();
      if (n.versionId) query.set("version", n.versionId);
      if (n.threadId) query.set("thread", n.threadId);
      const href = `/recipes/${n.recipeId}?${query}#${n.type === "review" ? "reviews" : "comments"}`;
      return <li key={n.id} className="community-entry" data-unread={!n.readAt}>
        <span className="eyebrow">{n.readAt ? "읽음" : "새 알림"}</span>
        {n.recipeId ? <Link className="text-link" href={href}>{n.type === "review" ? "내 레시피에 요리 사진 후기가 도착했어요." : "내 댓글에 답글이 달렸어요."}</Link>
          : <p>더 이상 볼 수 없는 게시물의 알림이에요.</p>}
        <time dateTime={n.createdAt}>{new Date(n.createdAt).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })}</time>
      </li>;
    })}</ul> : <EmptyState title="아직 도착한 알림이 없어요"><p>내 레시피에 후기가 등록되거나 내 댓글에 답글이 달리면 알려 드려요.</p></EmptyState>}
    <Pagination page={page} total={data?.total ?? 0} href={(p) => `/notifications?page=${p}`} />
  </section>;
}
