import Link from "next/link";

export function Pagination({ page, total, href }: { page: number; total: number; href: (page: number) => string }) {
  const pages = Math.min(100, Math.ceil(total / 12));
  if (pages <= 1 && page === 1) return null;
  return <nav className="pagination" aria-label="페이지 이동">
    {page > 1 ? <Link className="button button--secondary" href={href(Math.min(page - 1, Math.max(1, pages)))}>이전</Link> : <span />}
    <span aria-current="page">{page} / {Math.max(1, pages)}</span>
    {page < pages ? <Link className="button button--secondary" href={href(page + 1)}>다음</Link> : <span />}
  </nav>;
}
