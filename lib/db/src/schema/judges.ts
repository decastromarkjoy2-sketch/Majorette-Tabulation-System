import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const judgesTable = pgTable("judges", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertJudgeSchema = createInsertSchema(judgesTable).omit({ id: true, createdAt: true });
export type InsertJudge = z.infer<typeof insertJudgeSchema>;
export type Judge = typeof judgesTable.$inferSelect;
