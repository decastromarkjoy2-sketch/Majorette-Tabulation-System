import { sql } from "drizzle-orm";
import { integer, pgTable, serial, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const judgesTable = pgTable(
  "judges",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    accessCodeHash: text("access_code_hash"),
    accessCodeVersion: integer("access_code_version").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("judges_normalized_name_unique").on(
      sql`lower(trim(${table.name}))`,
    ),
  ],
);

export const insertJudgeSchema = createInsertSchema(judgesTable).omit({ id: true, createdAt: true });
export type InsertJudge = z.infer<typeof insertJudgeSchema>;
export type Judge = typeof judgesTable.$inferSelect;
