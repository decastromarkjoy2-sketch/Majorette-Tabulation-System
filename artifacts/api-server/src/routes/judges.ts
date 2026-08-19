import { Router, type IRouter } from "express";
import { eq, sql } from "drizzle-orm";
import { db, judgesTable } from "@workspace/db";
import {
  CreateJudgeBody,
  ListJudgesResponse,
  CreateJudgeResponse,
  DeleteJudgeParams,
  DeleteJudgeResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();
const REQUIRED_JUDGE_COUNT = 3;
const JUDGE_ROSTER_LOCK_ID = 843_073;

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "23505"
  );
}

router.get("/judges", async (_req, res): Promise<void> => {
  const judges = await db
    .select()
    .from(judgesTable)
    .orderBy(judgesTable.createdAt);
  res.json(ListJudgesResponse.parse(judges.map((j) => ({ ...j, createdAt: j.createdAt.toISOString() }))));
});

router.post("/judges", async (req, res): Promise<void> => {
  const parsed = CreateJudgeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const judgeName = parsed.data.name.trim();
  if (!judgeName) {
    res.status(400).json({ error: "Judge name cannot be blank." });
    return;
  }

  let result:
    | { status: "created"; judge: typeof judgesTable.$inferSelect }
    | { status: "duplicate" }
    | { status: "full" };

  try {
    result = await db.transaction(async (tx) => {
      await tx.execute(sql`select pg_advisory_xact_lock(${JUDGE_ROSTER_LOCK_ID})`);

      const judges = await tx
        .select({ id: judgesTable.id, name: judgesTable.name })
        .from(judgesTable)
        .orderBy(judgesTable.createdAt);

      const normalizedName = judgeName.toLocaleLowerCase();
      const duplicateJudge = judges.some(
        (judge) => judge.name.trim().toLocaleLowerCase() === normalizedName,
      );

      if (duplicateJudge) return { status: "duplicate" as const };
      if (judges.length >= REQUIRED_JUDGE_COUNT) {
        return { status: "full" as const };
      }

      const [judge] = await tx
        .insert(judgesTable)
        .values({ name: judgeName })
        .returning();

      return { status: "created" as const, judge };
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      res.status(409).json({ error: "A judge with this name is already registered." });
      return;
    }
    throw error;
  }

  if (result.status === "duplicate") {
    res.status(409).json({ error: "A judge with this name is already registered." });
    return;
  }

  if (result.status === "full") {
    res.status(409).json({
      error: `The judging roster is full. Exactly ${REQUIRED_JUDGE_COUNT} judges are allowed.`,
    });
    return;
  }

  res.status(201).json(CreateJudgeResponse.parse({
    ...result.judge,
    createdAt: result.judge.createdAt.toISOString(),
  }));
});

router.delete("/judges/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = DeleteJudgeParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const deleted = await db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(${JUDGE_ROSTER_LOCK_ID})`);
    const [judge] = await tx
      .delete(judgesTable)
      .where(eq(judgesTable.id, params.data.id))
      .returning();
    return judge;
  });

  if (!deleted) {
    res.status(404).json({ error: "Judge not found" });
    return;
  }

  res.json(DeleteJudgeResponse.parse({ success: true, id: params.data.id }));
});

export default router;
