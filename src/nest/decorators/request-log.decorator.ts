import { logger } from '../../core/logger/structured-logger.js';
import type { RequestLogOptions } from '../../types/options.js';

export function RequestLog(options: RequestLogOptions = {}): MethodDecorator {
  return function (
    target: object,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor,
  ): PropertyDescriptor {
    const originalMethod = descriptor.value as (...args: unknown[]) => unknown;
    const service = `${target.constructor.name}.${String(propertyKey)}`;

    descriptor.value = async function (
      this: unknown,
      ...args: unknown[]
    ): Promise<unknown> {
      const payload = options.payloadBuilder?.(...args);
      const hasPayload =
        payload !== undefined && Object.keys(payload).length > 0;

      logger.info('request.start', {
        service,
        ...(hasPayload ? { payload } : {}),
      });

      const startTime = Date.now();

      try {
        const result = await Promise.resolve(originalMethod.apply(this, args));
        const durationMs = Date.now() - startTime;
        logger.info('request.end', { service, payload: { durationMs } });
        return result;
      } catch (error) {
        const durationMs = Date.now() - startTime;
        const err = error as Error;
        logger.error('request.error', {
          service,
          payload: {
            durationMs,
            errorName: err.name,
            error: err.message,
            ...(err.stack ? { stack: err.stack } : {}),
          },
        });
        throw error;
      }
    };

    return descriptor;
  };
}
