import { Server } from "http";
import util from "util";
import { logger } from "../log/logger";
import { AppError } from "./AppError";

let httpServerRef: Server | null = null;

interface ErrorHandler {
  listenToErrorEvents: (httpServer: Server) => void;
  handleError: (errorToHandle: unknown) => Promise<void>;
}

const errorHandler: ErrorHandler = {
  listenToErrorEvents: (httpServer: Server) => {
    httpServerRef = httpServer;

    process.on("uncaughtException", async (error: Error) => {
      await errorHandler.handleError(error);
    });

    process.on("unhandledRejection", async (reason: unknown) => {
      await errorHandler.handleError(reason);
    });

    process.on("SIGTERM", async () => {
      logger.error(
        "App received SIGTERM event, try to gracefully close the server"
      );
      await terminateHttpServerAndExit();
    });

    process.on("SIGINT", async () => {
      logger.error(
        "App received SIGINT event, try to gracefully close the server"
      );
      await terminateHttpServerAndExit();
    });
  },

  handleError: async (errorToHandle: unknown) => {
    try {
      const appError = normalizeError(errorToHandle);
      logger.error(appError.message, appError);

      if (!appError.isTrusted) {
        await terminateHttpServerAndExit();
      }
    } catch (handlingError) {
      // No logger here since it might have failed
      process.stdout.write(
        "The error handler failed. Here are the handler failure and then the origin error that it tried to handle: "
      );
      process.stdout.write(JSON.stringify(handlingError));
      process.stdout.write(JSON.stringify(errorToHandle));
    }
  },
};

const terminateHttpServerAndExit = async (): Promise<never> => {
  if (httpServerRef) {
    await new Promise<void>((resolve) => httpServerRef!.close(() => resolve())); // Graceful shutdown
  }
  process.exit();
};

// The input might not be 'AppError' or even 'Error' instance, the output of this function will be AppError.
const normalizeError = (errorToHandle: unknown): AppError => {
  if (errorToHandle instanceof AppError) {
    return errorToHandle;
  }
  if (errorToHandle instanceof Error) {
    const appError = new AppError(errorToHandle.name, errorToHandle.message);
    appError.stack = errorToHandle.stack;
    return appError;
  }

  const inputType = typeof errorToHandle;
  return new AppError(
    "general-error",
    `Error Handler received a non-error instance with type - ${inputType}, value - ${util.inspect(
      errorToHandle
    )}`
  );
};

export { errorHandler };
