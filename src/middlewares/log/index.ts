import { logger } from "../../libraries/log/logger";
import { NextFunction, Request, Response } from "express";

interface LogRequestOptions {
  fields?: string[];
}

// Middleware to log the request.
// Logic: by default it will log req.params and req.query if they exist.
// for the req.body, if no specific fields are provided in the fields, it will log the entire body.
const logRequest = (options: LogRequestOptions = {}) => {
  const { fields = [] } = options;

  return (req: Request, res: Response, next: NextFunction) => {
    const logData: { [key: string]: any } = {};

    if (Object.keys(req.params).length > 0) {
      logData.params = req.params;
    }

    if (Object.keys(req.query).length > 0) {
      logData.query = req.query;
    }

    if (req.body) {
      if (fields.length > 0) {
        fields.forEach((field) => {
          if (field in req.body) {
            logData[field] = req.body[field];
          }
        });
      } else {
        logData.body = req.body;
      }
    }

    logger.info(`${req.method} ${req.originalUrl}`, logData);

    // Store the original end method
    const oldEnd = res.end;

    // Override the end method
    res.end = function (this: Response, ...args: any[]) {
      // Log the status code after the original end method is called
      logger.info(`${req.method} ${req.originalUrl}`, {
        statusCode: res.statusCode,
      });
      // @ts-ignore
      return oldEnd.apply(this, args);
    };

    next();
  };
};

export default { logRequest };
