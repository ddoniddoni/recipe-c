import type { ZodError } from "zod";

export type ActionState = {
  status: "idle" | "error" | "success";
  message: string;
  fieldErrors?: Record<string, string>;
};
export const initialActionState: ActionState = { status: "idle", message: "" };
export function actionError(message: string): ActionState {
  return { status: "error", message };
}
export function validationError(error: ZodError): ActionState {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const field = String(issue.path[0] ?? "form");
    if (!fieldErrors[field]) fieldErrors[field] = issue.message;
  }
  return { status: "error", message: "입력한 내용을 확인해 주세요.", fieldErrors };
}
