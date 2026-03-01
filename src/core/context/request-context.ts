import { AsyncLocalStorage } from 'node:async_hooks';
import { randomUUID } from 'node:crypto';
import type {
  RequestContext,
  StartContextOptions,
} from '../../types/options.js';

export const requestContextStorage = new AsyncLocalStorage<RequestContext>();

export function startContext(
  options: StartContextOptions,
  callback: () => Promise<unknown> | unknown,
): Promise<unknown> {
  const context: RequestContext = {
    requestId: options.requestId ?? randomUUID(),
    ...(options.endpoint !== undefined ? { endpoint: options.endpoint } : {}),
    ...(options.method !== undefined ? { method: options.method } : {}),
    ...(options.service !== undefined ? { service: options.service } : {}),
  };

  return new Promise<unknown>((resolve, reject) => {
    requestContextStorage.run(context, () => {
      try {
        const result = callback();
        Promise.resolve(result).then(resolve).catch(reject);
      } catch (err) {
        reject(err);
      }
    });
  });
}

export function runWithContext<T>(context: RequestContext, fn: () => T): T {
  return requestContextStorage.run(context, fn);
}

export function getContext(): RequestContext | undefined {
  return requestContextStorage.getStore();
}

export function getRequestId(): string | undefined {
  return requestContextStorage.getStore()?.requestId;
}

export function setContextField<K extends keyof RequestContext>(
  key: K,
  value: RequestContext[K],
): void {
  const store = requestContextStorage.getStore();
  if (store) {
    store[key] = value;
  }
}
