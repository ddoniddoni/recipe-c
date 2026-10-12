import Link from "next/link";
import { EmptyState } from "@/components/ui/states";
export default function NotFound() {
  return (
    <>
      <h1 className="page-heading">페이지를 찾을 수 없어요</h1>
      <EmptyState
        title="주소를 다시 확인해 주세요"
        action={
          <Link className="button button--primary" href="/">
            홈으로 돌아가기
          </Link>
        }
      >
        <p>페이지가 없거나 아직 제공하지 않는 기능이에요.</p>
      </EmptyState>
    </>
  );
}
