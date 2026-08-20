import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import healthRouter from "./health";
import { createAuthRouter } from "./auth";
import { createJudgesRouter } from "./judges";
import { createScoresRouter } from "./scores";
import { createEntryNumbersRouter } from "./entry-numbers";
import { createTabulationRouter } from "./tabulation";

export function createApiRouter(database: typeof db = db): IRouter {
  const router: IRouter = Router();

  router.use(healthRouter);
  router.use(createAuthRouter(database));
  router.use(createJudgesRouter(database));
  router.use(createScoresRouter(database));
  router.use(createEntryNumbersRouter(database));
  router.use(createTabulationRouter(database));

  return router;
}

export default createApiRouter();
