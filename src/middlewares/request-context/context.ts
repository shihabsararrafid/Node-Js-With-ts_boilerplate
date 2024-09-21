import { AsyncLocalStorage } from "async_hooks";

let currentContext: AsyncLocalStorage<unknown> | undefined;

export function context(): AsyncLocalStorage<unknown> {
  if (currentContext === undefined) {
    currentContext = new AsyncLocalStorage<unknown>();
  }

  return currentContext;
}
