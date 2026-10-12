import { z } from "zod";

export const emailSchema = z.string().trim().email("이메일 주소를 확인해 주세요.").max(254, "이메일 주소가 너무 길어요.");
export const passwordSchema = z.string().min(12, "비밀번호는 12자 이상 입력해 주세요.").max(128, "비밀번호는 128자까지 입력할 수 있어요.");
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "비밀번호를 입력해 주세요.").max(128, "비밀번호가 너무 길어요."),
});
export const signupSchema = z.object({ email: emailSchema, password: passwordSchema });
export const resetPasswordSchema = z.object({ password: passwordSchema, confirmPassword: z.string() })
  .refine((value) => value.password === value.confirmPassword, {
    path: ["confirmPassword"], message: "두 비밀번호가 일치하지 않아요.",
  });
