import type { SampleRecipe } from "../types";

export function RecipeVisual({
  tone,
  large = false,
}: {
  tone: SampleRecipe["tone"];
  large?: boolean;
}) {
  return (
    <div
      className={`recipe-visual recipe-visual--${tone}${large ? " recipe-visual--large" : ""}`}
      role="img"
      aria-label="개발용 이미지 자리표시자, 실제 요리 사진 아님"
    >
      <svg viewBox="0 0 400 260" aria-hidden="true" focusable="false">
        <ellipse
          cx="200"
          cy="142"
          rx="94"
          ry="89"
          fill="currentColor"
          opacity=".07"
        />
        <circle cx="200" cy="125" r="87" fill="var(--color-surface)" />
        <circle
          cx="200"
          cy="125"
          r="65"
          fill="none"
          stroke="currentColor"
          strokeWidth="1"
          opacity=".22"
        />
        <path
          d="M175 151c28-7 46-30 49-57-28 2-52 25-49 57Zm0 0 40-45"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          d="M87 62v117M79 62v33q8 10 16 0V62M319 62c-16 7-16 43 0 47v70Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          opacity=".5"
        />
      </svg>
      <span className="visual-caption">SAMPLE / 사진 자리표시자</span>
    </div>
  );
}
