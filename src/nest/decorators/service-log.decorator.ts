import { logger } from '../../core/logger/structured-logger.js';
import type { ServiceLogOptions } from '../../types/options.js';

export function ServiceLog(options: ServiceLogOptions = {}): MethodDecorator {
  return function (
    target: object,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor,
  ): PropertyDescriptor {
    const originalMethod = descriptor.value as (...args: unknown[]) => unknown;
    const service = `${target.constructor.name}.${String(propertyKey)}`;
    const level = options.level ?? 'info';
    const logExit = options.logExit !== false;

    descriptor.value = async function (
      this: unknown,
      ...args: unknown[]
    ): Promise<unknown> {
      const payload = options.payloadBuilder?.(...args);
      const hasPayload =
        payload !== undefined && Object.keys(payload).length > 0;

      logger[level]('service.enter', {
        service,
        ...(hasPayload ? { payload } : {}),
      });

      try {
        const result = await Promise.resolve(originalMethod.apply(this, args));
        if (logExit) {
          logger[level]('service.exit', { service });
        }
        return result;
      } catch (error) {
        const err = error as Error;
        logger.error('service.error', {
          service,
          payload: { error: err.message },
        });
        throw error;
      }
    };

    return descriptor;
  };
}
