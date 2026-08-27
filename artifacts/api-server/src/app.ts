import express, { type Express, type Request, type Response } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import * as pinoHttp from "pino-http";
import { db } from "@workspace/db";
import { createApiRouter } from "./routes";
import { logger } from "./lib/logger";

const httpLogger = (pinoHttp as any).default || pinoHttp;

export function createApp(database: typeof db = db): Express {
  const app: Express = express();

  app.use(
    httpLogger({
      logger,
      serializers: {
        req(req: any) {
          return {
            id: req.id,
            method: req.method,
            url: req.url?.split("?")[0],
          };
        },
        res(res: any) {
          return {
            statusCode: res.statusCode,
          };
        },
      },
    }),
  );
  app.use(cors());
  app.use(cookieParser());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.use("/api", createApiRouter(database));

  return app;
}

export default createApp();
