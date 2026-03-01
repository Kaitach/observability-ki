export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface RequestContext {
  requestId: string;
  endpoint?: string;
  method?: string;
  service?: string;
}

export interface StartContextOptions {
  requestId?: string;
  endpoint?: string;
  method?: string;
  service?: string;
}

export interface DefaultLevels {
  requestStart?: LogLevel;
  requestEnd?: LogLevel;
  requestError?: LogLevel;
  serviceEnter?: LogLevel;
  step?: LogLevel;
}

export interface TraceLoggerModuleOptions {
  serviceName: string;
  requestIdHeaderName?: string;
  enableResponseHeader?: boolean;
  defaultLevels?: DefaultLevels;
}

export interface RequestLogOptions {
  payloadBuilder?: (...args: unknown[]) => Record<string, unknown> | undefined;
}

export interface ServiceLogOptions {
  payloadBuilder?: (...args: unknown[]) => Record<string, unknown> | undefined;
  level?: LogLevel;
  logExit?: boolean;
}

export interface StepLogOptions {
  payloadBuilder?: (...args: unknown[]) => Record<string, unknown> | undefined;
  level?: LogLevel;
}
