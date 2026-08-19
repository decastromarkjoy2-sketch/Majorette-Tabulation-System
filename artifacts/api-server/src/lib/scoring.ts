export const REQUIRED_JUDGE_COUNT = 3;

type ScoreIdentity = {
  judgeId: number;
  category: string;
  schoolCode: string;
};

export type ScoreCalculationInput = {
  rawCriterion1: number;
  rawCriterion2: number;
  rawCriterion3: number;
  deductionCount: number;
};

export type ScoreCalculation = {
  weightedCriterion1: number;
  weightedCriterion2: number;
  weightedCriterion3: number;
  deductionTotal: number;
  totalScore: number;
};

export function calculateScore({
  rawCriterion1,
  rawCriterion2,
  rawCriterion3,
  deductionCount,
}: ScoreCalculationInput): ScoreCalculation {
  // Raw scores are already on the weighted scale (0-50, 0-20, 0-30).
  const weightedCriterion1 = rawCriterion1;
  const weightedCriterion2 = rawCriterion2;
  const weightedCriterion3 = rawCriterion3;
  const deductionTotal = deductionCount * 10;

  return {
    weightedCriterion1,
    weightedCriterion2,
    weightedCriterion3,
    deductionTotal,
    totalScore: weightedCriterion1 + weightedCriterion2 + weightedCriterion3 - deductionTotal,
  };
}

export function isDuplicateScoreSubmission(
  scores: readonly ScoreIdentity[],
  target: ScoreIdentity,
): boolean {
  return scores.some(
    (score) =>
      score.judgeId === target.judgeId &&
      score.category === target.category &&
      score.schoolCode === target.schoolCode,
  );
}

export function judgeRegistrationStatus(
  registeredJudgeNames: readonly string[],
  judgeName: string,
): "created" | "duplicate" | "full" {
  const normalizedName = judgeName.trim().toLocaleLowerCase();
  if (
    registeredJudgeNames.some(
      (registeredName) => registeredName.trim().toLocaleLowerCase() === normalizedName,
    )
  ) {
    return "duplicate";
  }
  if (registeredJudgeNames.length >= REQUIRED_JUDGE_COUNT) return "full";
  return "created";
}