import requestIdMiddleware from "./../../middlewares/request-context";
import winston from "winston";
import DailyRotateFile from "winston-daily-rotate-file";

const LOG_DIR = "logs";

class LogManager {
  private static instance: LogManager;
  private logger: winston.Logger;

  private constructor() {
    this.logger = winston.createLogger({
      level: "info",
      format: winston.format.combine(
        winston.format.timestamp({
          format: "YYYY-MM-DD HH:mm:ss",
        }),
        winston.format.errors({ stack: true }),
        winston.format.splat(),
        winston.format.json(),
        winston.format((info) => {
          const requestId = requestIdMiddleware.retrieveRequestId();
          if (requestId) {
            info.requestId = requestId;
          }
          return info;
        })()
      ),
      transports: [
        new winston.transports.File({
          filename: `${LOG_DIR}/error.log`,
          level: "error",
        }),
        new winston.transports.File({ filename: `${LOG_DIR}/combined.log` }),
        new DailyRotateFile({
          level: "info",
          filename: `${LOG_DIR}/application-%DATE%.log`,
          datePattern: "YYYY-MM-DD-HH",
          zippedArchive: true,
          maxSize: "20m",
          maxFiles: "14d",
        }) as winston.transport,
      ],
    });

    if (process.env.NODE_ENV !== "production") {
      this.logger.add(
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
          ),
        })
      );
    }
  }

  public getLogger(): winston.Logger {
    return this.logger;
  }

  public static getInstance(): LogManager {
    if (!LogManager.instance) {
      LogManager.instance = new LogManager();
    }
    return LogManager.instance;
  }
}

export const logger = LogManager.getInstance().getLogger();
