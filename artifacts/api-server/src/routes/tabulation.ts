import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, judgesTable, scoresTable } from "@workspace/db";
import {
  GetGroupTabulationResponse,
  GetSoloTabulationResponse,
  GetTabulationSummaryResponse,
} from "@workspace/api-zod";
import { buildTabulationFromRows } from "../lib/tabulation";

const router: IRouter = Router();

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

  return buildTabulationFromRows(category, scores, judges);
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