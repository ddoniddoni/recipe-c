"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function Navigation({ mobile = false, showAccount = false }: { mobile?: boolean; showAccount?: boolean }) {
  const pathname = usePathname();
  const items = [
    { href: "/", label: "홈" },
    { href: "/recipes", label: "레시피 탐색" },
    { href: "/awards", label: "어워즈" },
    ...(mobile && showAccount ? [{ href: "/recipes/new", label: "쓰기" }] : []),
    ...(showAccount ? [{ href: "/me", label: "내 공간" }] : []),
  ];
  return (
    <nav
      className={mobile ? "mobile-nav" : "desktop-nav"}
      aria-label={mobile ? "모바일 메뉴" : "주 메뉴"}
    >
      {items.map(({ href, label }) => {
        const active =
          href === "/" ? pathname === "/" : href === "/me"
            ? pathname === "/me" || pathname.startsWith("/settings")
            : href === "/recipes/new" ? pathname === href || pathname.endsWith("/edit")
            : pathname.startsWith(href) && pathname !== "/recipes/new" && !pathname.endsWith("/edit");
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
