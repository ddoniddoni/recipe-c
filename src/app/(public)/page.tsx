import Link from "next/link";
import { HomeAwards } from "@/features/awards/components/award-integrations";
import { getAppStatus } from "@/lib/env/server";
import { SetupNotice } from "@/components/layout/setup-notice";
import { getSampleRecipes } from "@/features/recipes/fixtures.server";
import { RecipeCard } from "@/features/recipes/components/recipe-card";
import { LatestRecipes } from "@/features/recipes/components/latest-recipes";

export default function HomePage() {
  const status = getAppStatus();
  return (
    <>
      <section className="home-intro">
        <div>
          <p className="eyebrow">우리의 작은 레시피 노트</p>
          <h1>
            오늘의 한 끼가,
            <br />
            누군가의 <em>레시피</em>로.
          </h1>
          <p className="intro-copy">
            익숙한 재료에 나만의 방법을 더해요.
            <br className="desktop-break" /> 만들고, 나누고, 함께 쌓아 갈 한
            끼의 기록.
          </p>
          <Link className="button button--primary" href="/recipes">
            {status.demoMode ? "샘플 레시피 둘러보기" : "레시피 탐색"}
            <span aria-hidden="true">↗</span>
          </Link>
        </div>
        <aside className="kitchen-note">
          <span className="eyebrow">이 공간에서 나눌 이야기</span>
          <p>
            냉장고 속 재료로 만든 한 그릇.
            <br />
            다음에도 기억하고 싶은 작은 팁.
            <br />
            직접 만들어 본 솔직한 후기.
          </p>
          <span className="note-signature">당신의 식탁에서 시작해요.</span>
        </aside>
      </section>
      <HomeAwards />
      {status.demoMode ? (
        <section className="section-space" aria-labelledby="recipes-title">
          <div className="section-heading">
            <div>
              <p className="eyebrow">가볍게 차리는 한 끼</p>
              <h2 id="recipes-title">레시피 노트 미리보기</h2>
            </div>
            <Link className="text-link" href="/recipes">
              전체 샘플 보기 <span aria-hidden="true">→</span>
            </Link>
          </div>
          <p className="section-description">
            화면 구성을 확인하기 위한 샘플이에요. 실제 회원의 게시물이 아니에요.
          </p>
          <div className="recipe-grid">
            {getSampleRecipes().map((recipe) => (
              <RecipeCard key={recipe.id} recipe={recipe} />
            ))}
          </div>
        </section>
      ) : status.hasSupabaseConfig ? <LatestRecipes /> : (
        <SetupNotice hasSupabaseConfig={status.hasSupabaseConfig} />
      )}
    </>
  );
}
