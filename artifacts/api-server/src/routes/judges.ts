import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, judgesTable } from "@workspace/db";
import {
  CreateJudgeBody,
  ListJudgesResponse,
  CreateJudgeResponse,
  DeleteJudgeParams,
  DeleteJudgeResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/judges", async (_req, res): Promise<void> => {
  const judges = await db
    .select()
    .from(judgesTable)
    .orderBy(judgesTable.createdAt);
  res.json(ListJudgesResponse.parse(judges));
});

router.post("/judges", async (req, res): Promise<void> => {
  const parsed = CreateJudgeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [judge] = await db
    .insert(judgesTable)
    .values({ name: parsed.data.name })
    .returning();

  res.status(201).json(CreateJudgeResponse.parse(judge));
});

router.delete("/judges/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = DeleteJudgeParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [deleted] = await db
    .delete(judgesTable)
    .where(eq(judgesTable.id, params.data.id))
    .returning();

  if (!deleted) {
    res.status(404).json({ error: "Judge not found" });
    return;
  }

  res.json(DeleteJudgeResponse.parse({ success: true, id: params.data.id }));
});

export default router;
