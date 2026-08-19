import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, judgesTable, scoresTable } from "@workspace/db";
import {
  SubmitScoreBody,
  ListScoresQueryParams,
  ListScoresResponse,
  SubmitScoreResponse,
  DeleteScoreParams,
  DeleteScoreResponse,
} from "@workspace/api-zod";
import { getSession, requireOrganizer } from "../lib/auth";
import {
  calculateScore,
  isDuplicateScoreSubmission,
  REQUIRED_JUDGE_COUNT,
} from "../lib/scoring";

const router: IRouter = Router();

// School lookup
const SCHOOLS: Record<string, { name: string; entryNo: string }> = {
  "01": { name: "GNHS", entryNo: "01" },
  "02": { name: "PDSI", entryNo: "02" },
  "03": { name: "CTPNHS", entryNo: "03" },
  "04": { name: "PNHS", entryNo: "04" },
  "05": { name: "BNHS", entryNo: "05" },
};

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "23505"
  );
}

router.get("/scores", async (req, res): Promise<void> => {
  const parsed = ListScoresQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { category, judgeId, schoolCode } = parsed.data;

  const conditions = [];
  if (category) conditions.push(eq(scoresTable.category, category));
  if (judgeId != null) conditions.push(eq(scoresTable.judgeId, judgeId));
  if (schoolCode) conditions.push(eq(scoresTable.schoolCode, schoolCode));

  const rows =
    conditions.length > 0
      ? await db
          .select()
          .from(scoresTable)
          .where(and(...conditions))
          .orderBy(scoresTable.createdAt)
      : await db.select().from(scoresTable).orderBy(scoresTable.createdAt);

  const mapped = rows.map((r) => ({
    ...r,
    rawCriterion1: Number(r.rawCriterion1),
    rawCriterion2: Number(r.rawCriterion2),
    rawCriterion3: Number(r.rawCriterion3),
    weightedCriterion1: Number(r.weightedCriterion1),
    weightedCriterion2: Number(r.weightedCriterion2),
    weightedCriterion3: Number(r.weightedCriterion3),
    deductionTotal: Number(r.deductionTotal),
    totalScore: Number(r.totalScore),
    createdAt: r.createdAt.toISOString(),
  }));

  res.json(ListScoresResponse.parse(mapped));
});

router.post("/scores", async (req, res): Promise<void> => {
  const parsed = SubmitScoreBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { category, schoolCode, rawCriterion1, rawCriterion2, rawCriterion3, deductionCount } =
    parsed.data;
  const session = getSession(req);
  if (session?.role !== "judge" || !session.judgeId) {
    res.status(401).json({ error: "Sign in with your judge access code before submitting scores." });
    return;
  }
  const judgeId = session.judgeId;

  const school = SCHOOLS[schoolCode];
  if (!school) {
    res.status(400).json({ error: "Invalid school code" });
    return;
  }

  const judges = await db
    .select({
      id: judgesTable.id,
      name: judgesTable.name,
      accessCodeVersion: judgesTable.accessCodeVersion,
    })
    .from(judgesTable)
    .orderBy(judgesTable.createdAt);

  if (judges.length !== REQUIRED_JUDGE_COUNT) {
    res.status(409).json({
      error: `Scoring requires exactly ${REQUIRED_JUDGE_COUNT} registered judges. The current roster has ${judges.length}.`,
    });
    return;
  }

  const judge = judges.find((registeredJudge) => registeredJudge.id === judgeId);
  if (!judge) {
    res.status(400).json({ error: "The selected judge is not registered." });
    return;
  }
  if (judge.accessCodeVersion !== session.accessCodeVersion) {
    res.status(401).json({
      error: "Your judge session is no longer valid. Sign in again with the current access code.",
    });
    return;
  }

  const [existingScore] = await db
    .select({
      judgeId: scoresTable.judgeId,
      category: scoresTable.category,
      schoolCode: scoresTable.schoolCode,
    })
    .from(scoresTable)
    .where(
      and(
        eq(scoresTable.judgeId, judgeId),
        eq(scoresTable.category, category),
        eq(scoresTable.schoolCode, schoolCode),
      ),
    )
    .limit(1);

  if (
    existingScore &&
    isDuplicateScoreSubmission([existingScore], { judgeId, category, schoolCode })
  ) {
    res.status(409).json({
      error: `${judge.name} has already submitted a ${category} score for ${school.name}.`,
    });
    return;
  }

  const {
    weightedCriterion1,
    weightedCriterion2,
    weightedCriterion3,
    deductionTotal,
    totalScore,
  } = calculateScore({ rawCriterion1, rawCriterion2, rawCriterion3, deductionCount });

  let score: typeof scoresTable.$inferSelect;
  try {
    [score] = await db
      .insert(scoresTable)
      .values({
        judgeId,
        judgeName: judge.name,
        category,
        schoolCode,
        schoolName: school.name,
        entryNo: school.entryNo,
        rawCriterion1: String(rawCriterion1),
        rawCriterion2: String(rawCriterion2),
        rawCriterion3: String(rawCriterion3),
        deductionCount,
        weightedCriterion1: String(weightedCriterion1),
        weightedCriterion2: String(weightedCriterion2),
        weightedCriterion3: String(weightedCriterion3),
        deductionTotal: String(deductionTotal),
        totalScore: String(totalScore),
      })
      .returning();
  } catch (error) {
    if (isUniqueViolation(error)) {
      res.status(409).json({
        error: `${judge.name} has already submitted a ${category} score for ${school.name}.`,
      });
      return;
    }
    throw error;
  }

  const mapped = {
    ...score,
    rawCriterion1: Number(score.rawCriterion1),
    rawCriterion2: Number(score.rawCriterion2),
    rawCriterion3: Number(score.rawCriterion3),
    weightedCriterion1: Number(score.weightedCriterion1),
    weightedCriterion2: Number(score.weightedCriterion2),
    weightedCriterion3: Number(score.weightedCriterion3),
    deductionTotal: Number(score.deductionTotal),
    totalScore: Number(score.totalScore),
    createdAt: score.createdAt.toISOString(),
  };

  res.status(201).json(SubmitScoreResponse.parse(mapped));
});

router.delete("/scores/:id", async (req, res): Promise<void> => {
  if (!requireOrganizer(req, res)) return;
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = DeleteScoreParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [deleted] = await db
    .delete(scoresTable)
    .where(eq(scoresTable.id, params.data.id))
    .returning();

  if (!deleted) {
    res.status(404).json({ error: "Score not found" });
    return;
  }

  res.json(DeleteScoreResponse.parse({ success: true, id: params.data.id }));
});

export default router;
