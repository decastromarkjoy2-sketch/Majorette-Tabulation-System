import { integer, pgTable, serial, text, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const entryNumbersTable = pgTable(
  "entry_numbers",
  {
    id: serial("id").primaryKey(),
    category: text("category").notNull(), // "group" | "solo"
    schoolCode: text("school_code").notNull(),
    entryNo: integer("entry_no").notNull(),
  },
  (table) => [
    uniqueIndex("entry_numbers_category_school_unique").on(
      table.category,
      table.schoolCode,
    ),
    uniqueIndex("entry_numbers_category_entry_unique").on(
      table.category,
      table.entryNo,
    ),
  ],
);

export const insertEntryNumberSchema = createInsertSchema(entryNumbersTable).omit({
  id: true,
});
export type InsertEntryNumber = z.infer<typeof insertEntryNumberSchema>;
export type EntryNumber = typeof entryNumbersTable.$inferSelect;