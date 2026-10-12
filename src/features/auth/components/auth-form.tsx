"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { initialActionState, type ActionState } from "../action-state";

type Mode = "login" | "signup" | "forgot" | "reset";
const labels: Record<Mode, string> = {
  login: "로그인", signup: "회원가입", forgot: "재설정 메일 받기", reset: "새 비밀번호 저장",
};

export function AuthForm({ mode, action, next = "/me", notice }: {
  mode: Mode;
  action: (previous: ActionState, formData: FormData) => Promise<ActionState>;
  next?: string;
  notice?: string;
}) {
  const [state, formAction, pending] = useActionState(action, initialActionState);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const hasPassword = mode === "login" || mode === "signup" || mode === "reset";
  const completed = state.status === "success";

  return <>
    {notice ? <p className="auth-message" role="status">{notice}</p> : null}
    <form action={formAction} className="auth-form" aria-busy={pending}>
      <input type="hidden" name="next" value={next} />
      {!completed ? <fieldset disabled={pending}>
        <legend className="sr-only">{labels[mode]}</legend>
        {mode !== "reset" ? <TextField
          id={`${mode}-email`} name="email" type="email" label="이메일" autoComplete="email"
          required maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)}
          error={state.fieldErrors?.email} placeholder="you@example.com" autoCapitalize="none" spellCheck={false}
        /> : null}
        {mode === "signup" ? <TextField
          id="signup-name" name="name" label="이름" autoComplete="name"
          required minLength={2} maxLength={30} value={name} onChange={(event) => setName(event.target.value)}
          error={state.fieldErrors?.name} hint="레시피와 댓글에 표시되는 이름이에요."
        /> : null}
        {hasPassword ? <TextField
          id={`${mode}-password`} name="password" type="password" label={mode === "reset" ? "새 비밀번호" : "비밀번호"}
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          required minLength={mode === "login" ? 1 : 12} maxLength={128}
          value={password} onChange={(event) => setPassword(event.target.value)} error={state.fieldErrors?.password}
          hint={mode !== "login" ? "12~128자. 다른 서비스와 다른 비밀번호를 사용해 주세요." : undefined}
        /> : null}
        {mode === "reset" ? <TextField
          id="reset-confirm-password" name="confirmPassword" type="password" label="새 비밀번호 확인"
          autoComplete="new-password" required minLength={12} maxLength={128}
          value={confirmation} onChange={(event) => setConfirmation(event.target.value)} error={state.fieldErrors?.confirmPassword}
        /> : null}
        <Button type="submit" disabled={pending}>{pending ? "처리 중…" : labels[mode]}</Button>
      </fieldset> : null}
      {state.message ? <p className={state.status === "error" ? "field-error form-feedback" : "auth-message"}
        role={state.status === "error" ? "alert" : "status"}>{state.message}</p> : null}
    </form>
    <div className="auth-links">
      {mode === "login" ? <>
        <Link href="/signup">처음 오셨나요? 회원가입</Link>
        <Link href="/forgot-password">비밀번호를 잊었어요</Link>
      </> : <Link href="/login">로그인으로 돌아가기</Link>}
      {mode === "reset" ? <><Link href="/forgot-password">재설정 메일 다시 받기</Link><Link href="/settings">계정 설정으로</Link></> : null}
    </div>
  </>;
}
