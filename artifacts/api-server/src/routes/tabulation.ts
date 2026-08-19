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
const TIE_EPSILON = 1e-9;

const TIE_BREAK_POLICY = {
  status: "approved" as const,
  title: "Official tie-break policy",
  description:
    "When complete entries have equal three-judge final averages, the ranking is decided by the following criteria in order.",
  steps: [
    "Higher average Criterion 1 (50 points)",
    "Higher average Criterion 2 (20 points)",
    "Higher average Criterion 3 (30 points)",
    "Lower average deductions",
    "School code in ascending order as the final deterministic fallback",
  ],
  approvedBy: "Competition organizers",
} as const;

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
      tieBreakApplied: false,
      tieBreakReason: null as string | null,
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
  const compareTieBreakCriteria = (a: (typeof entries)[number], b: (typeof entries)[number]) => {
    const higherIsBetter = [
      ["avgCriterion1", "Higher average Criterion 1 (50 points)"],
      ["avgCriterion2", "Higher average Criterion 2 (20 points)"],
      ["avgCriterion3", "Higher average Criterion 3 (30 points)"],
    ] as const;

    for (const [field] of higherIsBetter) {
      const difference = b[field] - a[field];
      if (Math.abs(difference) > TIE_EPSILON) return difference;
    }

    const deductionDifference = a.avgDeduction - b.avgDeduction;
    if (Math.abs(deductionDifference) > TIE_EPSILON) return deductionDifference;

    return a.schoolCode.localeCompare(b.schoolCode);
  };

  entries.sort((a, b) => {
    if (a.isComplete !== b.isComplete) return a.isComplete ? -1 : 1;
    if (
      a.isComplete &&
      b.isComplete &&
      Math.abs(a.avgTotalScore - b.avgTotalScore) > TIE_EPSILON
    ) {
      return b.avgTotalScore - a.avgTotalScore;
    }
    if (
      a.isComplete &&
      b.isComplete &&
      Math.abs(a.avgTotalScore - b.avgTotalScore) <= TIE_EPSILON
    ) {
      return compareTieBreakCriteria(a, b);
    }
    if (a.judgeCount !== b.judgeCount) return b.judgeCount - a.judgeCount;
    return a.schoolCode.localeCompare(b.schoolCode);
  });

  const getTieBreakReason = (group: typeof entries) => {
    if (
      group.some(
        (entry) => Math.abs(entry.avgCriterion1 - group[0].avgCriterion1) > TIE_EPSILON,
      )
    ) {
      return "Higher average Criterion 1 (50 points)";
    }
    if (
      group.some(
        (entry) => Math.abs(entry.avgCriterion2 - group[0].avgCriterion2) > TIE_EPSILON,
      )
    ) {
      return "Higher average Criterion 2 (20 points)";
    }
    if (
      group.some(
        (entry) => Math.abs(entry.avgCriterion3 - group[0].avgCriterion3) > TIE_EPSILON,
      )
    ) {
      return "Higher average Criterion 3 (30 points)";
    }
    if (
      group.some(
        (entry) => Math.abs(entry.avgDeduction - group[0].avgDeduction) > TIE_EPSILON,
      )
    ) {
      return "Lower average deductions";
    }
    return "School code in ascending order";
  };

  for (let start = 0; start < entries.length; ) {
    if (!entries[start].isComplete) break;

    let end = start + 1;
    while (
      end < entries.length &&
      entries[end].isComplete &&
      Math.abs(entries[end].avgTotalScore - entries[start].avgTotalScore) <= TIE_EPSILON
    ) {
      end += 1;
    }

    if (end - start > 1) {
      const tiedEntries = entries.slice(start, end);
      const reason = getTieBreakReason(tiedEntries);
      for (const entry of tiedEntries) {
        entry.tieBreakApplied = true;
        entry.tieBreakReason = reason;
      }
    }

    start = end;
  }

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
    tieBreakPolicy: TIE_BREAK_POLICY,
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
