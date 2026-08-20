import { asc, and, eq } from "drizzle-orm";
import { db, entryNumbersTable } from "@workspace/db";
import {
  formatEntryNo,
  SCHOOLS,
  type CompetitionCategory,
  type SchoolCode,
} from "./schools";

export const ENTRY_NUMBER_LOCK_ID = 2_091_117;
export const MAX_ENTRY_NUMBER = 2_147_483_647;

const DEFAULT_CATEGORIES: CompetitionCategory[] = ["group", "solo"];

export async function ensureEntryNumbers(database: typeof db): Promise<void> {
  const values = DEFAULT_CATEGORIES.flatMap((category) =>
    SCHOOLS.map((school, index) => ({
      category,
      schoolCode: school.schoolCode,
      entryNo: index + 1,
    })),
  );

  await database
    .insert(entryNumbersTable)
    .values(values)
    .onConflictDoNothing();
}

export async function getEntryNumberRows(
  database: typeof db,
  category?: CompetitionCategory,
) {
  await ensureEntryNumbers(database);
  const rows = category
    ? await database
        .select()
        .from(entryNumbersTable)
        .where(eq(entryNumbersTable.category, category))
        .orderBy(asc(entryNumbersTable.schoolCode))
    : await database
        .select()
        .from(entryNumbersTable)
        .orderBy(asc(entryNumbersTable.category), asc(entryNumbersTable.schoolCode));

  return rows.map((row) => ({
    category: row.category as CompetitionCategory,
    schoolCode: row.schoolCode as SchoolCode,
    schoolName: SCHOOLS.find((school) => school.schoolCode === row.schoolCode)?.schoolName ?? row.schoolCode,
    entryNo: formatEntryNo(row.entryNo),
  }));
}

export async function getEntryNumberMap(
  database: typeof db,
  category: CompetitionCategory,
): Promise<Map<string, string>> {
  const rows = await getEntryNumberRows(database, category);
  return new Map(rows.map((row) => [row.schoolCode, row.entryNo]));
}

export function validateEntryNo(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isSafeInteger(value) &&
    value > 0 &&
    value <= MAX_ENTRY_NUMBER
  );
}

export function isUniqueViolation(error: unknown): boolean {
  let current: unknown = error;
  for (let depth = 0; depth < 4; depth += 1) {
    if (
      typeof current === "object" &&
      current !== null &&
      "code" in current &&
      (current as { code?: string }).code === "23505"
    ) {
      return true;
    }
    current =
      typeof current === "object" &&
      current !== null &&
      "cause" in current
        ? (current as { cause?: unknown }).cause
        : undefined;
  }
  return false;
}