import { z } from "zod";

export const MAX_RECIPE_BYTES = 256 * 1024;
export const uuidSchema = z.uuid();
const text = (max: number) => z.string().transform((value) => value.trim().replace(/\s+/g, " ")).pipe(z.string().max(max));
const nullableText = (max: number) => text(max).transform((value) => value || null).nullable();
const ingredientSchema = z.object({
  id: uuidSchema, name: text(50),
  quantity: z.number().positive().max(1_000_000).multipleOf(0.001).nullable(),
  unit: nullableText(20), quantityText: nullableText(50), optional: z.boolean(),
}).strict();
const stepSchema = z.object({
  id: uuidSchema, position: z.number().int().min(1).max(20),
  instruction: text(1500), imageAssetId: uuidSchema.nullable(),
}).strict();

export const draftBodySchema = z.object({
  title: text(80), summary: text(500), servings: z.number().int().min(1).max(20),
  prepMinutes: z.number().int().min(0).max(720), cookMinutes: z.number().int().min(0).max(720),
  difficulty: z.enum(["easy", "medium", "hard"]), categoryId: uuidSchema.nullable(),
  ingredients: z.array(ingredientSchema).max(40), steps: z.array(stepSchema).max(20),
  coverAssetId: uuidSchema.nullable(), tips: text(2000),
  tags: z.array(text(20).pipe(z.string().min(2))).max(5).transform((tags) => [...new Set(tags)]),
  disclosureText: text(500), rightsConfirmed: z.boolean(),
}).strict().superRefine((body, ctx) => {
  for (const key of ["ingredients", "steps"] as const) {
    if (new Set(body[key].map((item) => item.id)).size !== body[key].length) {
      ctx.addIssue({ code: "custom", path: [key], message: "항목 식별자가 중복됐어요." });
    }
  }
  body.steps.forEach((step, index) => {
    if (step.position !== index + 1) ctx.addIssue({ code: "custom", path: ["steps", index], message: "단계 순서를 확인해 주세요." });
  });
  if (new TextEncoder().encode(JSON.stringify(body)).byteLength > MAX_RECIPE_BYTES) {
    ctx.addIssue({ code: "custom", message: "레시피 내용이 너무 커요." });
  }
});

export const publishBodySchema = draftBodySchema.superRefine((body, ctx) => {
  const issue = (path: (string | number)[], message: string) => ctx.addIssue({ code: "custom", path, message });
  if (body.title.length < 5) issue(["title"], "제목을 5자 이상 적어 주세요.");
  if (body.summary.length < 20) issue(["summary"], "소개를 20자 이상 적어 주세요.");
  if (!body.categoryId) issue(["categoryId"], "카테고리를 선택해 주세요.");
  if (body.prepMinutes + body.cookMinutes < 1) issue(["cookMinutes"], "총 소요 시간은 1분 이상이어야 해요.");
  if (!body.coverAssetId) issue(["coverAssetId"], "완성 사진을 올려 주세요.");
  if (!body.rightsConfirmed) issue(["rightsConfirmed"], "글과 사진의 사용 권한을 확인해 주세요.");
  if (!body.ingredients.length) issue(["ingredients"], "재료를 하나 이상 적어 주세요.");
  body.ingredients.forEach((item, i) => {
    if (!item.name) issue(["ingredients", i, "name"], "재료 이름을 적어 주세요.");
    if (item.quantity === null && !item.quantityText) issue(["ingredients", i, "quantityText"], "수량 또는 ‘약간’ 같은 설명을 적어 주세요.");
    if (item.quantity !== null && item.quantityText) issue(["ingredients", i, "quantityText"], "숫자 수량과 수량 설명 중 하나만 사용해 주세요.");
  });
  if (!body.steps.length) issue(["steps"], "조리 단계를 하나 이상 적어 주세요.");
  body.steps.forEach((step, i) => {
    if (step.instruction.length < 10) issue(["steps", i, "instruction"], "단계 설명을 10자 이상 적어 주세요.");
  });
});

export type RecipeBody = z.infer<typeof draftBodySchema>;
export type Ingredient = RecipeBody["ingredients"][number];
export type RecipeStep = RecipeBody["steps"][number];
export type Category = { id: string; slug: string; name: string };
export const difficultyLabels = { easy: "쉬움", medium: "보통", hard: "어려움" } as const;
export function emptyRecipeBody(): RecipeBody {
  return { title: "", summary: "", servings: 2, prepMinutes: 0, cookMinutes: 0,
    difficulty: "easy", categoryId: null, ingredients: [], steps: [], coverAssetId: null,
    tips: "", tags: [], disclosureText: "", rightsConfirmed: false };
}

export const draftSchema = z.object({
  recipeId: uuidSchema, body: draftBodySchema, draftVersion: z.number().int(),
  updatedAt: z.string(), currentVersionId: uuidSchema.nullable(), status: z.string(),
});
export type RecipeDraft = z.infer<typeof draftSchema>;
export const recipeCardSchema = z.object({
  id: uuidSchema, versionId: uuidSchema, versionNo: z.number().int(), title: z.string(),
  summary: z.string(), servings: z.number(), minutes: z.number(),
  difficulty: z.enum(["easy", "medium", "hard"]), category: z.string(), coverAssetId: uuidSchema,
  authorId: uuidSchema, author: z.string(), handle: z.string(), publishedAt: z.string(),
});
export type PublishedRecipeCard = z.infer<typeof recipeCardSchema>;
export const recipeDetailSchema = z.object({
  card: recipeCardSchema, body: draftBodySchema, currentVersionId: uuidSchema,
  versions: z.array(z.object({ id: uuidSchema, versionNo: z.number().int(), publishedAt: z.string() })),
});
export type RecipeDetail = z.infer<typeof recipeDetailSchema>;
