import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import judgesRouter from "./judges";
import scoresRouter from "./scores";
import tabulationRouter from "./tabulation";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(judgesRouter);
router.use(scoresRouter);
router.use(tabulationRouter);

export default router;
