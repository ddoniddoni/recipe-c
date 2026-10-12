"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function Navigation({ mobile = false }: { mobile?: boolean }) {
  const pathname = usePathname();
  const items = [
    { href: "/", label: "홈" },
    { href: "/recipes", label: "레시피 탐색" },
  ];
  return (
    <nav
      className={mobile ? "mobile-nav" : "desktop-nav"}
      aria-label={mobile ? "모바일 메뉴" : "주 메뉴"}
    >
      {items.map(({ href, label }) => {
        const active =
          href === "/" ? pathname === "/" : pathname.startsWith(href);
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
