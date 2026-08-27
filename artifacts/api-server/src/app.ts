import express, {
  type Express,
  type Request,
  type Response,
  type NextFunction,
} from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { db } from "@workspace/db";
import { createApiRouter } from "./routes";
import { logger } from "./lib/logger";

export function createApp(database: typeof db = db): Express {
  const app: Express = express();

  // Lightweight custom request logger middleware
  app.use((req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();
    res.on("finish", () => {
      const duration = Date.now() - start;
      logger.info({
        method: req.method,
        url: req.url?.split("?")[0],
        statusCode: res.statusCode,
        duration: `${duration}ms`,
      });
    });
    next();
  });

  app.use(cors());
  app.use(cookieParser());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.use("/api", createApiRouter(database));

  return app;
}

export default createApp();
