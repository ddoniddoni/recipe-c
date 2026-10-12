import { EmptyState } from "@/components/ui/states";

export function SetupNotice({
  hasSupabaseConfig,
}: {
  hasSupabaseConfig: boolean;
}) {
  return (
    <EmptyState title="레시피 공간을 준비하고 있어요">
      <p>
        {hasSupabaseConfig
          ? "연결 설정이 입력되어 있지만, 실제 레시피 조회와 회원 기능은 아직 준비 중이에요."
          : "아직 데이터 서비스가 연결되지 않았어요. 실제 레시피는 연결을 마친 뒤 볼 수 있어요."}
      </p>
      <p>지금은 로그인, 작성, 저장을 이용할 수 없어요.</p>
    </EmptyState>
  );
}
