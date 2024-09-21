import { AsyncLocalStorage } from "async_hooks";
import { randomUUID } from "crypto";
import { NextFunction, Response, Request } from "express";

const requestContextStore = new AsyncLocalStorage<Map<string, string>>();
const REQUEST_ID_HEADER_NAME = "x-request-id";

const generateRequestId = (): string => randomUUID();

const addRequestIdMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const existingRequestId = req.headers[REQUEST_ID_HEADER_NAME];
  const requestId = (existingRequestId as string) || generateRequestId();

  res.setHeader(REQUEST_ID_HEADER_NAME, requestId);

  requestContextStore.run(new Map(), () => {
    const store = requestContextStore.getStore();
    if (store) {
      store.set("requestId", requestId);
    }
    next();
  });
};

// Accessing the request ID in subsequent middleware or routes
const retrieveRequestId = (): string | undefined =>
  requestContextStore.getStore()?.get("requestId");

export default {
  addRequestIdMiddleware,
  retrieveRequestId,
};
