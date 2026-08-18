import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, scoresTable } from "@workspace/db";
import {
  SubmitScoreBody,
  ListScoresQueryParams,
  ListScoresResponse,
  SubmitScoreResponse,
  DeleteScoreParams,
  DeleteScoreResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

// School lookup
const SCHOOLS: Record<string, { name: string; entryNo: string }> = {
  "01": { name: "GNHS", entryNo: "01" },
  "02": { name: "PDSI", entryNo: "02" },
  "03": { name: "CTPNHS", entryNo: "03" },
  "04": { name: "PNHS", entryNo: "04" },
  "05": { name: "BNHS", entryNo: "05" },
};

// Weight constants
const WEIGHTS = { c1: 0.5, c2: 0.2, c3: 0.3 };

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

  const { judgeId, judgeName, category, schoolCode, rawCriterion1, rawCriterion2, rawCriterion3, deductionCount } =
    parsed.data;

  const school = SCHOOLS[schoolCode];
  if (!school) {
    res.status(400).json({ error: "Invalid school code" });
    return;
  }

  const weightedCriterion1 = rawCriterion1 * WEIGHTS.c1;
  const weightedCriterion2 = rawCriterion2 * WEIGHTS.c2;
  const weightedCriterion3 = rawCriterion3 * WEIGHTS.c3;
  const deductionTotal = deductionCount * 10;
  const totalScore = weightedCriterion1 + weightedCriterion2 + weightedCriterion3 - deductionTotal;

  const [score] = await db
    .insert(scoresTable)
    .values({
      judgeId,
      judgeName,
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
