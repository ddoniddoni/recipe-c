import { notFound } from "next/navigation";
import { getAppStatus } from "@/lib/env/server";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/states";
import { TextField } from "@/components/ui/text-field";

export default function UiPreviewPage() {
  if (!getAppStatus().demoMode) notFound();
  return (
    <>
      <div className="page-heading">
        <p className="eyebrow">개발 전용</p>
        <h1>공통 UI 점검</h1>
        <p>
          빈 화면, 오류, 로딩과 입력 접근성을 확인하는 예시예요. 제출과 저장은
          제공하지 않아요.
        </p>
      </div>
      <div className="ui-examples">
        <section>
          <h2>입력 필드</h2>
          <TextField
            id="preview-title"
            label="레시피 제목"
            hint="5~80자로 입력해 주세요. 이 입력은 저장되지 않아요."
            required
            maxLength={80}
          />
          <TextField
            id="preview-error"
            label="오류 표시 예시"
            defaultValue="밥"
            error="제목을 5자 이상 입력해 주세요."
          />
        </section>
        <section>
          <h2>빈 상태 예시</h2>
          <EmptyState title="아직 레시피가 없어요">
            <p>나누고 싶은 한 끼를 준비해 주세요.</p>
          </EmptyState>
        </section>
        <section>
          <h2>오류 상태 예시</h2>
          <ErrorState />
        </section>
        <section>
          <h2>로딩 상태 예시</h2>
          <LoadingState />
        </section>
      </div>
    </>
  );
}
