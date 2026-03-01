import type { LogLevel } from '../../../types/options.js';

export interface ILogAdapter {
  log(level: LogLevel, message: string, data: Record<string, unknown>): void;
}
