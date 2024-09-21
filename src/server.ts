import express, {
  Express,
  json,
  NextFunction,
  Request,
  Response,
  urlencoded,
} from "express";
import helmet from "helmet";
import { Server } from "http";
import { defineRoutes } from "./app";
import config from "./configs";
import prisma from "./libraries/db/prisma";
import { errorHandler } from "./libraries/error-handling";
import { logger } from "./libraries/log/logger";
import requestIdMiddleware from "./middlewares/request-context";

let connection: Server;

const createExpressApp = (): Express => {
  const expressApp: Express = express();
  expressApp.use(requestIdMiddleware.addRequestIdMiddleware);
  expressApp.use(helmet());
  expressApp.use(urlencoded({ extended: true }));
  expressApp.use(json());

  expressApp.use((req: Request, res: Response, next: NextFunction) => {
    logger.info(`${req.method} ${req.originalUrl}`);
    next();
  });

  logger.info("Express middlewares are set up");
  defineRoutes(expressApp);
  defineErrorHandlingMiddleware(expressApp);
  return expressApp;
};

async function startWebServer(): Promise<Express> {
  logger.info("Starting web server...");
  const expressApp = createExpressApp();
  const APIAddress = await openConnection(expressApp);
  logger.info(`Server is running on ${APIAddress.address}:${APIAddress.port}`);
  await prisma.$connect();
  return expressApp;
}

async function stopWebServer(): Promise<void> {
  return new Promise<void>((resolve) => {
    if (connection !== undefined) {
      connection.close(() => {
        resolve();
      });
    } else {
      resolve();
    }
  });
}

async function openConnection(
  expressApp: Express
): Promise<{ address: string; port: number }> {
  return new Promise((resolve) => {
    const webServerPort = config.PORT;
    logger.info(`Server is about to listen to port ${webServerPort}`);

    connection = expressApp.listen(webServerPort, () => {
      errorHandler.listenToErrorEvents(connection);
      const address = connection.address();
      if (typeof address === "string") {
        resolve({ address, port: webServerPort });
      } else if (address && typeof address === "object") {
        resolve({ address: address.address, port: address.port });
      } else {
        throw new Error("Unable to determine server address");
      }
    });
  });
}

function defineErrorHandlingMiddleware(expressApp: Express): void {
  expressApp.use(
    async (error: any, req: Request, res: Response, next: NextFunction) => {
      if (error && typeof error === "object") {
        if (error.isTrusted === undefined || error.isTrusted === null) {
          error.isTrusted = true;
        }
      }

      errorHandler.handleError(error);
      res.status(error?.HTTPStatus || 500).end();
    }
  );
}

export { createExpressApp, startWebServer, stopWebServer };
