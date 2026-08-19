import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, judgesTable, scoresTable } from "@workspace/db";
import {
  GetGroupTabulationResponse,
  GetSoloTabulationResponse,
  GetTabulationSummaryResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();
const REQUIRED_JUDGE_COUNT = 3;

// Group awards
const GROUP_AWARDS: Record<number, { award: string; prizeAmount: string }> = {
  1: { award: "Group Champion", prizeAmount: "25,000" },
  2: { award: "1st Runner-up", prizeAmount: "20,000" },
  3: { award: "2nd Runner-up", prizeAmount: "15,000" },
  4: { award: "4th Place", prizeAmount: "10,000" },
  5: { award: "5th Place", prizeAmount: "10,000" },
};

// Solo awards
const SOLO_AWARDS: Record<number, { award: string; prizeAmount: string }> = {
  1: { award: "Solo Champion", prizeAmount: "5,000" },
  2: { award: "1st Runner-up", prizeAmount: "" },
  3: { award: "2nd Runner-up", prizeAmount: "" },
  4: { award: "4th Place", prizeAmount: "" },
  5: { award: "5th Place", prizeAmount: "" },
};

const SCHOOLS = [
  { schoolCode: "01", schoolName: "GNHS", entryNo: "01" },
  { schoolCode: "02", schoolName: "PDSI", entryNo: "02" },
  { schoolCode: "03", schoolName: "CTPNHS", entryNo: "03" },
  { schoolCode: "04", schoolName: "PNHS", entryNo: "04" },
  { schoolCode: "05", schoolName: "BNHS", entryNo: "05" },
];

async function buildTabulation(category: "group" | "solo") {
  const [scores, judges] = await Promise.all([
    db
      .select()
      .from(scoresTable)
      .where(eq(scoresTable.category, category))
      .orderBy(scoresTable.createdAt),
    db
      .select({ id: judgesTable.id })
      .from(judgesTable)
      .orderBy(judgesTable.createdAt),
  ]);

  const awards = category === "group" ? GROUP_AWARDS : SOLO_AWARDS;
  const registeredJudgeIds = new Set(judges.map((judge) => judge.id));

  // Group scores by school
  const bySchool: Record<string, typeof scores> = {};
  for (const s of scores) {
    if (!registeredJudgeIds.has(s.judgeId)) continue;
    if (!bySchool[s.schoolCode]) bySchool[s.schoolCode] = [];
    bySchool[s.schoolCode].push(s);
  }

  const totalJudges = judges.length;

  // Build per-school entries
  const entries = SCHOOLS.map((school) => {
    const schoolScores = bySchool[school.schoolCode] ?? [];
    const scoresByJudge = new Map<number, (typeof schoolScores)[number]>();
    for (const score of schoolScores) {
      scoresByJudge.set(score.judgeId, score);
    }
    const distinctJudgeScores = [...scoresByJudge.values()];
    const count = distinctJudgeScores.length;
    const isComplete =
      totalJudges === REQUIRED_JUDGE_COUNT && count === REQUIRED_JUDGE_COUNT;

    const avg = (field: keyof (typeof distinctJudgeScores)[number]) => {
      if (count === 0) return 0;
      return distinctJudgeScores.reduce((sum, s) => sum + Number(s[field]), 0) / count;
    };

    return {
      schoolCode: school.schoolCode,
      schoolName: school.schoolName,
      entryNo: school.entryNo,
      judgeCount: count,
      isComplete,
      missingJudgeCount: Math.max(0, REQUIRED_JUDGE_COUNT - count),
      avgCriterion1: avg("weightedCriterion1"),
      avgCriterion2: avg("weightedCriterion2"),
      avgCriterion3: avg("weightedCriterion3"),
      avgDeduction: avg("deductionTotal"),
      avgTotalScore: avg("totalScore"),
      rank: null as number | null,
      award: null as string | null,
      prizeAmount: null as string | null,
      judgeScores: distinctJudgeScores.map((s) => ({
        ...s,
        rawCriterion1: Number(s.rawCriterion1),
        rawCriterion2: Number(s.rawCriterion2),
        rawCriterion3: Number(s.rawCriterion3),
        weightedCriterion1: Number(s.weightedCriterion1),
        weightedCriterion2: Number(s.weightedCriterion2),
        weightedCriterion3: Number(s.weightedCriterion3),
        deductionTotal: Number(s.deductionTotal),
        totalScore: Number(s.totalScore),
        createdAt: s.createdAt.toISOString(),
      })),
    };
  });

  // Complete entries are ranked by their three-judge average. Incomplete entries
  // remain visible below them, but cannot receive an official rank or award.
  entries.sort((a, b) => {
    if (a.isComplete !== b.isComplete) return a.isComplete ? -1 : 1;
    if (a.isComplete && b.isComplete && a.avgTotalScore !== b.avgTotalScore) {
      return b.avgTotalScore - a.avgTotalScore;
    }
    if (a.judgeCount !== b.judgeCount) return b.judgeCount - a.judgeCount;
    return a.schoolCode.localeCompare(b.schoolCode);
  });

  let nextRank = 1;
  entries.forEach((entry) => {
    if (!entry.isComplete) return;
    entry.rank = nextRank;
    const awardEntry = awards[nextRank];
    entry.award = awardEntry?.award ?? null;
    entry.prizeAmount = awardEntry?.prizeAmount ?? null;
    nextRank += 1;
  });

  return {
    category,
    entries,
    totalJudges,
    requiredJudgeCount: REQUIRED_JUDGE_COUNT,
    totalScoresSubmitted: scores.length,
  };
}

router.get("/tabulation/group", async (_req, res): Promise<void> => {
  const result = await buildTabulation("group");
  res.json(GetGroupTabulationResponse.parse(result));
});

router.get("/tabulation/solo", async (_req, res): Promise<void> => {
  const result = await buildTabulation("solo");
  res.json(GetSoloTabulationResponse.parse(result));
});

router.get("/tabulation/summary", async (_req, res): Promise<void> => {
  const [group, solo] = await Promise.all([
    buildTabulation("group"),
    buildTabulation("solo"),
  ]);
  res.json(GetTabulationSummaryResponse.parse({ group, solo }));
});

export default router;
