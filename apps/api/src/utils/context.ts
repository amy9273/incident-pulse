import { AsyncLocalStorage } from 'node:async_hooks';

export interface RequestContext {
  correlationId: string;
  userId?: string;
}

export const requestContext = new AsyncLocalStorage<RequestContext>();

export const getCorrelationId = (): string | undefined => {
  return requestContext.getStore()?.correlationId;
};
