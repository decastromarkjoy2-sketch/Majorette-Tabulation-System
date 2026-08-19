import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateScore,
  isDuplicateScoreSubmission,
  judgeRegistrationStatus,
} from "../src/lib/scoring.ts";
import { buildTabulationFromRows } from "../src/lib/tabulation.ts";

test("enforces a three-judge roster and rejects duplicate judge names", () => {
  assert.equal(judgeRegistrationStatus(["Judge A", "Judge B"], "Judge C"), "created");
  assert.equal(judgeRegistrationStatus(["Judge A", "Judge B", "Judge C"], "Judge D"), "full");
  assert.equal(
    judgeRegistrationStatus(["Judge A", "Judge B", "Judge C"], " judge a "),
    "duplicate",
  );
});

test("rejects duplicate score submissions for the same judge, category, and school", () => {
  const submitted = [{ judgeId: 7, category: "group", schoolCode: "01" }];

  assert.equal(
    isDuplicateScoreSubmission(submitted, {
      judgeId: 7,
      category: "group",
      schoolCode: "01",
    }),
    true,
  );
  assert.equal(
    isDuplicateScoreSubmission(submitted, {
      judgeId: 8,
      category: "group",
      schoolCode: "01",
    }),
    false,
  );
  assert.equal(
    isDuplicateScoreSubmission(submitted, {
      judgeId: 7,
      category: "solo",
      schoolCode: "01",
    }),
    false,
  );
});

test("includes deductions in averages and awards only complete entries", () => {
  const judges = [{ id: 1 }, { id: 2 }, { id: 3 }];
  let nextId = 1;
  const score = (judgeId, schoolCode, criteria, deductionCount = 0) => {
    const calculated = calculateScore({
      rawCriterion1: criteria[0],
      rawCriterion2: criteria[1],
      rawCriterion3: criteria[2],
      deductionCount,
    });
    return {
      id: nextId++,
      judgeId,
      judgeName: `Judge ${judgeId}`,
      category: "group",
      schoolCode,
      schoolName: schoolCode === "01" ? "GNHS" : schoolCode === "02" ? "PDSI" : "CTPNHS",
      entryNo: schoolCode,
      rawCriterion1: String(criteria[0]),
      rawCriterion2: String(criteria[1]),
      rawCriterion3: String(criteria[2]),
      deductionCount,
      weightedCriterion1: String(calculated.weightedCriterion1),
      weightedCriterion2: String(calculated.weightedCriterion2),
      weightedCriterion3: String(calculated.weightedCriterion3),
      deductionTotal: String(calculated.deductionTotal),
      totalScore: String(calculated.totalScore),
      createdAt: new Date("2026-08-19T00:00:00.000Z"),
    };
  };

  const scores = [
    score(1, "01", [50, 20, 30], 1),
    score(2, "01", [50, 20, 30]),
    score(3, "01", [50, 20, 30]),
    score(1, "02", [48, 20, 30]),
    score(2, "02", [48, 20, 30]),
    score(3, "02", [48, 20, 30]),
    score(1, "03", [50, 20, 30]),
    score(2, "03", [50, 20, 30]),
  ];

  const result = buildTabulationFromRows("group", scores, judges);
  const bySchool = new Map(result.entries.map((entry) => [entry.schoolCode, entry]));
  const deductedEntry = bySchool.get("01");
  const champion = bySchool.get("02");
  const incompleteEntry = bySchool.get("03");

  assert.equal(deductedEntry.avgDeduction, 10 / 3);
  assert.equal(deductedEntry.avgTotalScore, 290 / 3);
  assert.equal(deductedEntry.rank, 2);
  assert.equal(deductedEntry.award, "1st Runner-up");
  assert.equal(champion.avgTotalScore, 98);
  assert.equal(champion.rank, 1);
  assert.equal(champion.award, "Group Champion");
  assert.equal(incompleteEntry.judgeCount, 2);
  assert.equal(incompleteEntry.isComplete, false);
  assert.equal(incompleteEntry.rank, null);
  assert.equal(incompleteEntry.award, null);
  assert.equal(result.totalScoresSubmitted, scores.length);
});