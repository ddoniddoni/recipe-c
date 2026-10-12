import { z } from "zod";
import { recipeCardSchema, uuidSchema } from "@/features/recipes/schemas";

export const commentKinds = { question: "질문", substitution: "대체 재료", suggestion: "개선 제안", general: "일반 의견" } as const;
export const reportReasons = { spam: "광고·도배", abuse: "욕설·괴롭힘", rights: "저작권·개인정보", unsafe: "위험한 내용", other: "기타" } as const;
const revision = z.number().int().nonnegative();
const request = { requestId: uuidSchema };
export const communityInput = z.discriminatedUnion("operation", [
  z.object({ operation: z.literal("bookmark"), recipeId: uuidSchema, saved: z.boolean() }),
  z.object({ operation: z.literal("review"), recipeId: uuidSchema, versionId: uuidSchema, expectedRevision: revision,
    rating: z.number().int().min(1).max(5), body: z.string().trim().min(20).max(2000),
    assetIds: z.array(uuidSchema).min(1).max(3).refine((ids) => new Set(ids).size === ids.length), ...request }),
  z.object({ operation: z.literal("deleteReview"), recipeId: uuidSchema, versionId: uuidSchema, expectedRevision: revision, ...request }),
  z.object({ operation: z.literal("comment"), id: uuidSchema, recipeId: uuidSchema, parentId: uuidSchema.nullable(),
    kind: z.enum(["question", "substitution", "suggestion", "general"]), body: z.string().trim().max(1000),
    expectedRevision: revision, delete: z.boolean(), ...request }).refine((input) => input.delete || input.body.length > 0),
  z.object({ operation: z.literal("report"), recipeId: uuidSchema, targetType: z.enum(["recipe", "review", "comment"]),
    targetId: uuidSchema, reason: z.enum(["spam", "abuse", "rights", "unsafe", "other"]), detail: z.string().trim().min(10).max(1000) }),
  z.object({ operation: z.literal("read"), ids: z.array(uuidSchema).min(1).max(100) }),
]);
export type CommunityInput = z.infer<typeof communityInput>;
export const reviewSchema = z.object({
  id: uuidSchema, recipeId: uuidSchema, versionId: uuidSchema, versionNo: z.number(), title: z.string(),
  authorId: uuidSchema, author: z.string(), handle: z.string(), rating: z.number().nullable(), body: z.string(),
  revision: z.number(), status: z.enum(["published", "hidden", "deleted"]), createdAt: z.string(), updatedAt: z.string(), assetIds: z.array(uuidSchema),
});
export type CookReview = z.infer<typeof reviewSchema>;
export const commentSchema = z.object({
  id: uuidSchema, recipeId: uuidSchema, parentId: uuidSchema.nullable(), kind: z.enum(["question", "substitution", "suggestion", "general"]),
  body: z.string(), authorId: uuidSchema.nullable(), author: z.string().nullable(), handle: z.string().nullable(),
  status: z.enum(["published", "deleted"]), revision: z.number(), createdAt: z.string(),
});
export type RecipeComment = z.infer<typeof commentSchema>;
export const communitySchema = z.object({ reviews: z.array(reviewSchema), reviewTotal: z.number(), ownReview: reviewSchema.nullable(),
  comments: z.array(commentSchema.extend({ replies: z.array(commentSchema), replyCount: z.number() })), commentTotal: z.number() });
export const reviewListSchema = z.object({ items: z.array(reviewSchema), total: z.number() });
export const bookmarksSchema = z.object({ items: z.array(z.object({ recipeId: uuidSchema, card: recipeCardSchema.nullable() })), total: z.number() });
export const notificationsSchema = z.object({ items: z.array(z.object({ id: uuidSchema, type: z.enum(["review", "reply"]),
  readAt: z.string().nullable(), createdAt: z.string(), recipeId: uuidSchema.nullable(), versionId: uuidSchema.nullable(),
  entityId: uuidSchema.nullable(), threadId: uuidSchema.nullable() })), total: z.number(), unread: z.number() });
export const reportsSchema = z.object({ items: z.array(z.object({ id: uuidSchema, reason_code: z.enum(["spam", "abuse", "rights", "unsafe", "other"]),
  status: z.enum(["pending", "reviewing", "resolved", "dismissed"]), created_at: z.string() })), total: z.number() });
export type CommunitySearch = { reviewsPage: number; commentsPage: number; threadId?: string; repliesPage: number };
export function pageNumber(value: string | string[] | undefined) {
  const n = Number(Array.isArray(value) ? value[0] : value);
  return Number.isInteger(n) ? Math.max(1, Math.min(100, n)) : 1;
}
export function parseCommunitySearch(query: Record<string, string | string[] | undefined>): CommunitySearch {
  const thread = Array.isArray(query.thread) ? query.thread[0] : query.thread;
  return { reviewsPage: pageNumber(query.reviewsPage), commentsPage: pageNumber(query.commentsPage),
    repliesPage: pageNumber(query.repliesPage), threadId: uuidSchema.safeParse(thread).success ? thread : undefined };
}
export function communityHref(recipeId: string, versionId: string, search: CommunitySearch, anchor: string) {
  const q = new URLSearchParams({ version: versionId, reviewsPage: String(search.reviewsPage), commentsPage: String(search.commentsPage) });
  if (search.threadId) { q.set("thread", search.threadId); q.set("repliesPage", String(search.repliesPage)); }
  return `/recipes/${recipeId}?${q}#${anchor}`;
}
