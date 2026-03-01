import { logger } from '../../core/logger/structured-logger.js';
import type { StepLogOptions } from '../../types/options.js';

export function StepLog(
  stepName: string,
  options: StepLogOptions = {},
): MethodDecorator {
  return function (
    target: object,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor,
  ): PropertyDescriptor {
    const originalMethod = descriptor.value as (...args: unknown[]) => unknown;
    const service = `${target.constructor.name}.${String(propertyKey)}`;
    const level = options.level ?? 'debug';

    descriptor.value = async function (
      this: unknown,
      ...args: unknown[]
    ): Promise<unknown> {
      const payload = options.payloadBuilder?.(...args);
      const hasPayload =
        payload !== undefined && Object.keys(payload).length > 0;

      logger[level](`step.${stepName}`, {
        service,
        ...(hasPayload ? { payload } : {}),
      });

      try {
        return await Promise.resolve(originalMethod.apply(this, args));
      } catch (error) {
        const err = error as Error;
        logger.error(`step.${stepName}.error`, {
          service,
          payload: { error: err.message },
        });
        throw error;
      }
    };

    return descriptor;
  };
}
