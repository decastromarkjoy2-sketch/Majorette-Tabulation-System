import { pgTable, serial, integer, text, numeric, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { judgesTable } from "./judges";

export const scoresTable = pgTable(
  "scores",
  {
    id: serial("id").primaryKey(),
    judgeId: integer("judge_id").notNull().references(() => judgesTable.id, { onDelete: "cascade" }),
    judgeName: text("judge_name").notNull(),
    category: text("category").notNull(), // "group" | "solo"
    schoolCode: text("school_code").notNull(), // "01" | "02" | "03" | "04" | "05"
    schoolName: text("school_name").notNull(),
    entryNo: text("entry_no").notNull(),
    rawCriterion1: numeric("raw_criterion1", { precision: 6, scale: 2 }).notNull(),
    rawCriterion2: numeric("raw_criterion2", { precision: 6, scale: 2 }).notNull(),
    rawCriterion3: numeric("raw_criterion3", { precision: 6, scale: 2 }).notNull(),
    deductionCount: integer("deduction_count").notNull().default(0),
    weightedCriterion1: numeric("weighted_criterion1", { precision: 8, scale: 4 }).notNull(),
    weightedCriterion2: numeric("weighted_criterion2", { precision: 8, scale: 4 }).notNull(),
    weightedCriterion3: numeric("weighted_criterion3", { precision: 8, scale: 4 }).notNull(),
    deductionTotal: numeric("deduction_total", { precision: 8, scale: 2 }).notNull(),
    totalScore: numeric("total_score", { precision: 8, scale: 4 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("scores_judge_category_school_unique").on(
      table.judgeId,
      table.category,
      table.schoolCode,
    ),
  ],
);

export const insertScoreSchema = createInsertSchema(scoresTable).omit({ id: true, createdAt: true });
export type InsertScore = z.infer<typeof insertScoreSchema>;
export type Score = typeof scoresTable.$inferSelect;
