"use client";

import Image from "next/image";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { RecipeBody } from "../schemas";

export function RecipeReading({ body, cookMode = false }: { body: RecipeBody; cookMode?: boolean }) {
  const [servings, setServings] = useState(body.servings);
  const [step, setStep] = useState(0);
  const steps = cookMode ? body.steps.slice(step, step + 1) : body.steps;
  return <div className={cookMode ? "cook-reading" : "detail-columns"}>
    <section className="ingredients" aria-labelledby="ingredients-title">
      <div className="section-heading"><h2 id="ingredients-title">재료</h2><span className="muted">원본 {body.servings}인분</span></div>
      <div className="servings-control">
        <label htmlFor="servings">만들 분량</label>
        <select id="servings" value={servings} onChange={(event) => setServings(Number(event.target.value))}>
          {Array.from({ length: 20 }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}인분</option>)}
        </select>
      </div>
      <dl aria-live="polite">
        {body.ingredients.map((item) => <div key={item.id}>
          <dt>{item.name}{item.optional ? <span className="muted"> (선택)</span> : null}</dt>
          <dd>{item.quantity === null ? item.quantityText : Number((item.quantity * servings / body.servings).toFixed(6)).toLocaleString("ko-KR", { maximumFractionDigits: 6 })}{item.quantity !== null && item.unit ? ` ${item.unit}` : ""}</dd>
        </div>)}
      </dl>
      <p className="field-hint">숫자 수량만 비례해요. ‘약간’ 같은 설명과 조리 시간은 바뀌지 않아요.</p>
    </section>
    <section className="reading-steps" aria-labelledby="steps-title">
      <h2 id="steps-title">{cookMode ? `조리 단계 ${step + 1} / ${body.steps.length}` : "만드는 순서"}</h2>
      <ol className="step-list" start={cookMode ? step + 1 : 1} aria-live={cookMode ? "polite" : "off"}>
        {steps.map((item) => <li key={item.id}>
          <span aria-hidden="true">{String(item.position).padStart(2, "0")}</span>
          <div><p>{item.instruction}</p>{item.imageAssetId ? <Image src={`/media/${item.imageAssetId}`}
            alt={`${item.position}단계 조리 사진`} width={800} height={600} unoptimized className="step-photo" /> : null}</div>
        </li>)}
      </ol>
      {cookMode ? <div className="cook-controls">
        <Button variant="secondary" disabled={step === 0} onClick={() => setStep((value) => value - 1)}>이전 단계</Button>
        <Button disabled={step >= body.steps.length - 1} onClick={() => setStep((value) => value + 1)}>다음 단계</Button>
      </div> : null}
      {body.tips ? <aside className="recipe-tip"><h2>작은 조리 팁</h2><p>{body.tips}</p></aside> : null}
    </section>
  </div>;
}
