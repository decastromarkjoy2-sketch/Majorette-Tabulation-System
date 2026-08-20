import { REQUIRED_JUDGE_COUNT } from "./scoring.ts";
import { formatEntryNo, SCHOOLS } from "./schools.ts";

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

const GROUP_AWARDS: Record<number, { award: string; prizeAmount: string }> = {
  1: { award: "Group Champion", prizeAmount: "25,000" },
  2: { award: "1st Runner-up", prizeAmount: "20,000" },
  3: { award: "2nd Runner-up", prizeAmount: "15,000" },
  4: { award: "4th Place", prizeAmount: "10,000" },
  5: { award: "5th Place", prizeAmount: "10,000" },
};

const SOLO_AWARDS: Record<number, { award: string; prizeAmount: string }> = {
  1: { award: "Solo Champion", prizeAmount: "5,000" },
  2: { award: "1st Runner-up", prizeAmount: "4,000" },
  3: { award: "2nd Runner-up", prizeAmount: "3,000" },
  4: { award: "4th Place", prizeAmount: "2,000" },
  5: { award: "5th Place", prizeAmount: "2,000" },
};

export type TabulationScore = {
  id: number;
  judgeId: number;
  judgeName: string;
  category: string;
  schoolCode: string;
  schoolName: string;
  entryNo: string;
  rawCriterion1: string;
  rawCriterion2: string;
  rawCriterion3: string;
  deductionCount: number;
  weightedCriterion1: string;
  weightedCriterion2: string;
  weightedCriterion3: string;
  deductionTotal: string;
  totalScore: string;
  createdAt: Date;
};

export type TabulationJudge = { id: number };

export function buildTabulationFromRows(
  category: "group" | "solo",
  scores: readonly TabulationScore[],
  judges: readonly TabulationJudge[],
  entryNumbers = new Map<string, string>(),
) {
  const awards = category === "group" ? GROUP_AWARDS : SOLO_AWARDS;
  const registeredJudgeIds = new Set(judges.map((judge) => judge.id));

  const bySchool: Record<string, TabulationScore[]> = {};
  for (const score of scores) {
    if (!registeredJudgeIds.has(score.judgeId)) continue;
    if (!bySchool[score.schoolCode]) bySchool[score.schoolCode] = [];
    bySchool[score.schoolCode].push(score);
  }

  const totalJudges = judges.length;
  const entries = SCHOOLS.map((school) => {
    const schoolScores = bySchool[school.schoolCode] ?? [];
    const scoresByJudge = new Map<number, TabulationScore>();
    for (const score of schoolScores) {
      scoresByJudge.set(score.judgeId, score);
    }
    const distinctJudgeScores = [...scoresByJudge.values()];
    const count = distinctJudgeScores.length;
    const isComplete =
      totalJudges === REQUIRED_JUDGE_COUNT && count === REQUIRED_JUDGE_COUNT;

    const avg = (field: keyof TabulationScore) => {
      if (count === 0) return 0;
      return distinctJudgeScores.reduce((sum, score) => sum + Number(score[field]), 0) / count;
    };

    return {
      schoolCode: school.schoolCode,
      schoolName: school.schoolName,
      entryNo: entryNumbers.get(school.schoolCode) ?? formatEntryNo(SCHOOLS.indexOf(school) + 1),
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
      judgeScores: distinctJudgeScores.map((score) => ({
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
      })),
    };
  });

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