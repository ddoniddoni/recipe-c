import type { ReactNode } from "react";
import { Button } from "./button";

export function EmptyState({
  title,
  children,
  action,
}: {
  title: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <span className="state-mark" aria-hidden="true">
        —
      </span>
      <h2>{title}</h2>
      <div className="muted">{children}</div>
      {action}
    </div>
  );
}

export function ErrorState({ onRetry }: { onRetry?: () => void }) {
  return (
    <div className="error-state" role="alert">
      <h2>화면을 불러오지 못했어요</h2>
      <p>
        잠시 후 다시 시도해 주세요. 문제가 계속되면 연결 상태를 확인해 주세요.
      </p>
      {onRetry ? (
        <Button onClick={onRetry} variant="secondary">
          다시 시도
        </Button>
      ) : null}
    </div>
  );
}

export function LoadingState() {
  return (
    <div className="loading-state" role="status" aria-live="polite">
      <p>레시피를 불러오는 중이에요</p>
      <div className="skeleton-grid" aria-hidden="true">
        {[1, 2, 3].map((id) => (
          <div key={id} className="skeleton" />
        ))}
      </div>
    </div>
  );
}
