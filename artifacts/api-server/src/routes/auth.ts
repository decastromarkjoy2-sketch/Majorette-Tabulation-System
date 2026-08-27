import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, judgesTable } from "@workspace/db";
import {
  CreateJudgeSessionBody,
  CreateOrganizerSessionBody,
  GetSessionResponse,
} from "@workspace/api-zod";
import {
  clearSession,
  getSession,
  startSession,
  verifyAccessCode,
  verifyOrganizerCode,
} from "../lib/auth";
import { logger } from "../lib/logger";

export function createAuthRouter(database: typeof db = db): IRouter {
  const router: IRouter = Router();

  router.get("/auth/session", (req, res): void => {
    const session = getSession(req);
    if (!session) {
      res.json(GetSessionResponse.parse({ role: "anonymous", judgeId: null }));
      return;
    }
    res.json(
      GetSessionResponse.parse({
        role: session.role,
        judgeId: session.role === "judge" ? session.judgeId : null,
      }),
    );
  });

  router.post("/auth/organizer-sessions", (req, res): void => {
    const parsed = CreateOrganizerSessionBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Enter the organizer access code." });
      return;
    }
    if (!process.env.ORGANIZER_ACCESS_CODE) {
      logger.error("Organizer access code is not configured");
      res.status(503).json({
        error: "Organizer access is not configured. Contact the system owner.",
      });
      return;
    }
    if (!verifyOrganizerCode(parsed.data.accessCode)) {
      res
        .status(401)
        .json({ error: "That organizer access code is not valid." });
      return;
    }

    startSession(res, "organizer");
    res
      .status(201)
      .json(GetSessionResponse.parse({ role: "organizer", judgeId: null }));
  });

  router.post("/auth/judge-sessions", async (req, res): Promise<void> => {
    const parsed = CreateJudgeSessionBody.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ error: "Select your name and enter your access code." });
      return;
    }

    const [judge] = await database
      .select({
        id: judgesTable.id,
        accessCodeHash: judgesTable.accessCodeHash,
        accessCodeVersion: judgesTable.accessCodeVersion,
      })
      .from(judgesTable)
      .where(eq(judgesTable.id, parsed.data.judgeId))
      .limit(1);

    if (
      !judge?.accessCodeHash ||
      !verifyAccessCode(parsed.data.accessCode, judge.accessCodeHash)
    ) {
      res
        .status(401)
        .json({ error: "The judge name or access code is not valid." });
      return;
    }

    startSession(res, "judge", judge.id, judge.accessCodeVersion);
    res
      .status(201)
      .json(GetSessionResponse.parse({ role: "judge", judgeId: judge.id }));
  });

  router.delete("/auth/session", (_req, res): void => {
    clearSession(res);
    res.json(GetSessionResponse.parse({ role: "anonymous", judgeId: null }));
  });

  return router;
}

export default createAuthRouter();
