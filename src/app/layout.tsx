import type { Metadata } from "next";
import { connection } from "next/server";
import { AppHeader } from "@/components/layout/app-header";
import { AppFooter } from "@/components/layout/app-footer";
import { Navigation } from "@/components/layout/navigation";
import { getAppStatus } from "@/lib/env/server";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "레시피 어워즈 · 개발 미리보기",
    template: "%s | 레시피 어워즈",
  },
  description:
    "나만의 요리법을 나누는 레시피 커뮤니티. 현재 개발 중인 서비스입니다.",
  robots: { index: false, follow: false },
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  await connection();
  const { demoMode } = getAppStatus();
  return (
    <html lang="ko">
      <body>
        <a className="skip-link" href="#main-content">
          본문으로 건너뛰기
        </a>
        <AppHeader demoMode={demoMode} />
        <main
          className="container main-content"
          id="main-content"
          tabIndex={-1}
        >
          {children}
        </main>
        <AppFooter demoMode={demoMode} />
        <Navigation mobile showAccount={!demoMode} />
      </body>
    </html>
  );
}
