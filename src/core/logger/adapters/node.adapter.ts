import type { LogLevel } from '../../../types/options.js';
import type { ILogAdapter } from './adapter.interface.js';

export class NodeLogAdapter implements ILogAdapter {
  log(level: LogLevel, message: string, data: Record<string, unknown>): void {
    const entry = JSON.stringify({ level, message, ...data });
    const stream =
      level === 'error' || level === 'warn' ? process.stderr : process.stdout;
    stream.write(entry + '\n');
  }
}
