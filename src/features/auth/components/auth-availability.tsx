import { getAppStatus } from "@/lib/env/server";

export function AuthAvailability({ children }: { children: React.ReactNode }) {
  const { demoMode, hasSupabaseConfig } = getAppStatus();
  if (demoMode || !hasSupabaseConfig) {
    return <div className="auth-message" role="status">
      <h2>{demoMode ? "샘플 미리보기 중이에요" : "회원 공간을 준비하고 있어요"}</h2>
      <p>{demoMode
        ? "샘플 모드에서는 회원가입과 로그인을 이용할 수 없어요."
        : "아직 인증 서비스가 연결되지 않았어요. 연결을 마친 뒤 가입과 로그인을 이용할 수 있어요."}</p>
    </div>;
  }
  return children;
}
