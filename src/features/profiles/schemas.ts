import { z } from "zod";

const reserved = new Set([
  "admin", "api", "auth", "me", "settings", "login", "signup", "logout", "recipes", "awards", "u", "dev",
  "support", "help", "system", "notifications", "terms", "privacy", "challenges",
]);
export const profileSchema = z.object({
  handle: z.string().regex(/^[a-z0-9_]{3,24}$/, "영문 소문자, 숫자, 밑줄로 3~24자 입력해 주세요.")
    .refine((value) => !reserved.has(value), "이 주소는 사용할 수 없어요."),
  displayName: z.string().trim().min(2, "닉네임은 2자 이상 입력해 주세요.").max(30, "닉네임은 30자까지 입력할 수 있어요."),
  bio: z.string().trim().max(300, "소개는 300자까지 입력할 수 있어요."),
});
