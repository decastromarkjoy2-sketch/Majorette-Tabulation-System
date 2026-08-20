import { Router, type IRouter } from "express";
import { and, eq, sql } from "drizzle-orm";
import { db, entryNumbersTable } from "@workspace/db";
import {
  AssignEntryNumbersBody,
  AssignEntryNumbersResponse,
  ListEntryNumbersResponse,
  UpdateEntryNumberBody,
  UpdateEntryNumberResponse,
} from "@workspace/api-zod";
import { requireOrganizer } from "../lib/auth";
import {
  ENTRY_NUMBER_LOCK_ID,
  ensureEntryNumbers,
  getEntryNumberRows,
  isUniqueViolation,
  validateEntryNo,
} from "../lib/entry-numbers";
import { SCHOOLS, isCompetitionCategory } from "../lib/schools";

export function createEntryNumbersRouter(database: typeof db = db): IRouter {
  const router: IRouter = Router();

  router.get("/entry-numbers", async (_req, res): Promise<void> => {
    res.json(ListEntryNumbersResponse.parse(await getEntryNumberRows(database)));
  });

  router.post("/entry-numbers/assign", async (req, res): Promise<void> => {
    if (!requireOrganizer(req, res)) return;
    const parsed = AssignEntryNumbersBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    await ensureEntryNumbers(database);
    const { category, mode } = parsed.data;
    const assignedNumbers =
      mode === "sequential"
        ? SCHOOLS.map((_school, index) => index + 1)
        : [...SCHOOLS.map((_school, index) => index + 1)].sort(
            () => Math.random() - 0.5,
          );

    try {
      const rows = await database.transaction(async (tx) => {
        await tx.execute(
          sql`select pg_advisory_xact_lock(${ENTRY_NUMBER_LOCK_ID})`,
        );
        await tx
          .update(entryNumbersTable)
          .set({ entryNo: sql`-${entryNumbersTable.entryNo}` })
          .where(eq(entryNumbersTable.category, category));

        for (const [index, school] of SCHOOLS.entries()) {
          await tx
            .update(entryNumbersTable)
            .set({ entryNo: assignedNumbers[index] })
            .where(
              and(
                eq(entryNumbersTable.category, category),
                eq(entryNumbersTable.schoolCode, school.schoolCode),
              ),
            );
        }

        return tx
          .select()
          .from(entryNumbersTable)
          .where(eq(entryNumbersTable.category, category))
          .orderBy(entryNumbersTable.schoolCode);
      });

      res.json(
        AssignEntryNumbersResponse.parse({
          category,
          mode,
          entries: rows.map((row) => ({
            category,
            schoolCode: row.schoolCode,
            schoolName:
              SCHOOLS.find((school) => school.schoolCode === row.schoolCode)
                ?.schoolName ?? row.schoolCode,
            entryNo: String(row.entryNo).padStart(2, "0"),
          })),
        }),
      );
    } catch (error) {
      if (isUniqueViolation(error)) {
        res.status(409).json({ error: "Entry numbers must be unique within a category." });
        return;
      }
      throw error;
    }
  });

  router.patch(
    "/entry-numbers/:category/:schoolCode",
    async (req, res): Promise<void> => {
      if (!requireOrganizer(req, res)) return;

      const category = Array.isArray(req.params.category)
        ? req.params.category[0]
        : req.params.category;
      const schoolCode = Array.isArray(req.params.schoolCode)
        ? req.params.schoolCode[0]
        : req.params.schoolCode;
      if (!isCompetitionCategory(category)) {
        res.status(400).json({ error: "Category must be group or solo." });
        return;
      }
      if (!SCHOOLS.some((school) => school.schoolCode === schoolCode)) {
        res.status(400).json({ error: "Invalid school code." });
        return;
      }

      const parsed = UpdateEntryNumberBody.safeParse(req.body);
      if (!parsed.success || !validateEntryNo(parsed.data.entryNo)) {
        res.status(400).json({
          error: parsed.success
            ? "Entry number must be a positive whole number."
            : parsed.error.message,
        });
        return;
      }

      await ensureEntryNumbers(database);
      try {
        const [updated] = await database.transaction(async (tx) => {
          await tx.execute(
            sql`select pg_advisory_xact_lock(${ENTRY_NUMBER_LOCK_ID})`,
          );
          return tx
            .update(entryNumbersTable)
            .set({ entryNo: parsed.data.entryNo })
            .where(
              and(
                eq(entryNumbersTable.category, category),
                eq(entryNumbersTable.schoolCode, schoolCode),
              ),
            )
            .returning();
        });
        if (!updated) {
          res.status(404).json({ error: "Entry number configuration not found." });
          return;
        }

        res.json(
          UpdateEntryNumberResponse.parse({
            category,
            schoolCode,
            schoolName:
              SCHOOLS.find((school) => school.schoolCode === schoolCode)
                ?.schoolName ?? schoolCode,
            entryNo: String(updated.entryNo).padStart(2, "0"),
          }),
        );
      } catch (error) {
        if (isUniqueViolation(error)) {
          res.status(409).json({
            error: "That entry number is already assigned in this category.",
          });
          return;
        }
        throw error;
      }
    },
  );

  return router;
}

export default createEntryNumbersRouter();