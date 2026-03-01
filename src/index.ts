export {
  startContext,
  getContext,
  getRequestId,
  setContextField,
  runWithContext,
} from './core/context/request-context.js';

export { logger, StructuredLogger } from './core/logger/structured-logger.js';

export type { ILogAdapter } from './core/logger/adapters/adapter.interface.js';
export { NodeLogAdapter } from './core/logger/adapters/node.adapter.js';

export type {
  LogLevel,
  RequestContext,
  StartContextOptions,
  TraceLoggerModuleOptions,
  DefaultLevels,
  RequestLogOptions,
  ServiceLogOptions,
  StepLogOptions,
} from './types/options.js';
