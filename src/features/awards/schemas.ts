import { z } from "zod";

export const phaseLabels = { draft: "공개 준비", upcoming: "접수 예정", submission: "출품 접수", voting: "요리 후기 평가", review: "결과 검토", finalized: "결과 발표", cancelled: "행사 취소" } as const;
export const medalLabels = { gold: "금상", silver: "은상", bronze: "동상" } as const;
const uuid = z.string().uuid();
export const periodSchema = z.object({
  id: uuid, slug: z.string(), title: z.string(), theme: z.string(), month: z.string(),
  state: z.enum(["draft", "published", "finalized", "cancelled"]), phase: z.enum(Object.keys(phaseLabels) as [keyof typeof phaseLabels, ...(keyof typeof phaseLabels)[]]),
  submissionOpensAt: z.string(), submissionClosesAt: z.string(), votingOpensAt: z.string(), votingClosesAt: z.string(), finalizeNotBefore: z.string(),
  rules: z.object({ version: z.literal("monthly-v1"), minReviews: z.number(), priorMean: z.number(), priorWeight: z.number(), minAccountHours: z.number(), tieBreakers: z.array(z.string()) }),
  revision: z.number(), finalRunId: uuid.nullable(),
});
export const entrySchema = z.object({ id: uuid, periodId: uuid, status: z.enum(["submitted", "withdrawn", "disqualified"]), recipeId: uuid, versionId: uuid, versionNo: z.number(), title: z.string(), coverAssetId: uuid, author: z.string(), handle: z.string(), authorId: uuid });
export const resultSchema = z.object({ entryId: uuid, rank: z.number(), medal: z.enum(["gold", "silver", "bronze"]).nullable(), count: z.number(), ratingSum: z.number(), fiveStarCount: z.number(), average: z.number(), score: z.number(), visibility: z.enum(["visible", "content_removed", "revoked"]), entry: entrySchema.nullable() });
export const awardsIndexSchema = z.object({ periods: z.array(periodSchema), periodTotal: z.number(), results: z.array(resultSchema.extend({ period: periodSchema })), resultTotal: z.number() });
export const awardDetailSchema = z.object({ period: periodSchema, entries: z.array(entrySchema), entryTotal: z.number(), ownEntry: entrySchema.pick({ id: true, status: true, versionId: true, recipeId: true }).nullable(), canEnter: z.boolean(),
  ownRecipes: z.array(z.object({ versionId: uuid, title: z.string(), versionNo: z.number() })), ownRecipeTotal: z.number(), results: z.array(resultSchema), resultTotal: z.number() });
export const adminIndexSchema = z.object({ periods: z.array(periodSchema), total: z.number() });
export const adminDetailSchema = z.object({ period: periodSchema,
  run: z.object({ id: uuid, revision: z.number(), status: z.enum(["prepared", "finalized"]), preparedAt: z.string(), inputHash: z.string(), stale: z.boolean() }).nullable(),
  entries: z.array(z.object({ id: uuid, status: entrySchema.shape.status, entry: entrySchema.nullable() })), entryTotal: z.number(),
  evaluations: z.array(z.object({ id: uuid, entryId: uuid, reviewId: uuid, eligibility: z.enum(["included", "withdrawn", "excluded"]), rating: z.number() })), evaluationTotal: z.number(),
  inputs: z.array(z.object({ entryId: uuid, reason: z.string(), includedCount: z.number(), excludedReasons: z.array(z.object({ reason: z.string(), count: z.number() })) })),
  results: z.array(resultSchema), resultTotal: z.number(),
});
export const reviewAwardSchema = z.object({ period: periodSchema, status: z.enum(["finalized", "entry_unavailable", "included", "withdrawn", "excluded", "not_open", "closed", "login", "ineligible", "existing_review", "too_new", "eligible"]), rating: z.number().nullable() });
const base = { requestId: uuid, periodId: uuid };
const reason = z.string().trim().min(10).max(1000);
export const awardInput = z.discriminatedUnion("operation", [
  z.object({ operation: z.literal("create"), requestId: uuid, month: z.string().regex(/^\d{4}-\d{2}-01$/), slug: z.string().regex(/^[a-z0-9][a-z0-9-]{2,59}$/), title: z.string().trim().min(2).max(80), theme: z.string().trim().min(2).max(1000) }),
  z.object({ ...base, operation: z.literal("publish") }), z.object({ ...base, operation: z.literal("cancel"), reason }),
  z.object({ ...base, operation: z.literal("enter"), versionId: uuid, agreed: z.literal(true) }), z.object({ ...base, operation: z.literal("restore"), versionId: uuid, agreed: z.literal(true) }),
  z.object({ ...base, operation: z.literal("withdraw") }),
  z.object({ ...base, operation: z.literal("entryStatus"), entryId: uuid, status: z.enum(["submitted", "disqualified"]), reason }),
  z.object({ ...base, operation: z.literal("evaluationStatus"), evaluationId: uuid, status: z.enum(["included", "excluded"]), reason }),
  z.object({ ...base, operation: z.literal("prepare") }), z.object({ ...base, operation: z.literal("finalize"), runId: uuid }),
  z.object({ ...base, operation: z.literal("revoke"), entryId: uuid, reason }),
]);
export type AwardPeriod = z.infer<typeof periodSchema>;
export type AwardEntry = z.infer<typeof entrySchema>;
export type AwardResult = z.infer<typeof resultSchema>;
export type AwardDetail = z.infer<typeof awardDetailSchema>;
export type AdminAwardDetail = z.infer<typeof adminDetailSchema>;
export type AwardInput = z.infer<typeof awardInput>;
