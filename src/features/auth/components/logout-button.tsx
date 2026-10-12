"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { logoutAction } from "../actions";
import { initialActionState } from "../action-state";

export function LogoutButton() {
  const [state, action, pending] = useActionState(logoutAction, initialActionState);
  return <form action={action} className="logout-form">
    <Button type="submit" variant="secondary" disabled={pending}>{pending ? "로그아웃 중…" : "로그아웃"}</Button>
    {state.message ? <p className="field-error" role="alert">{state.message}</p> : null}
  </form>;
}
