import type { ILogAdapter } from '../../core/logger/adapters/adapter.interface.js';
import type { LogLevel } from '../../types/options.js';

interface NestLike {
  log(message: string): void;
  debug(message: string): void;
  warn(message: string): void;
  error(message: string): void;
}

const CONTEXT = 'TraceLogger';

let nestLogger: NestLike | undefined;

async function getNestLogger(): Promise<NestLike> {
  if (nestLogger) return nestLogger;
  const { Logger } = await import('@nestjs/common');
  nestLogger = new Logger(CONTEXT) as unknown as NestLike;
  return nestLogger;
}

export class NestLogAdapter implements ILogAdapter {
  private readonly syncLogger: NestLike | undefined;

  constructor(logger?: NestLike) {
    this.syncLogger = logger;
  }

  log(level: LogLevel, message: string, data: Record<string, unknown>): void {
    const { timestamp: _ts, message: _msg, ...rest } = data;

    const fields = Object.entries(rest)
      .map(([k, v]) => {
        if (v !== null && typeof v === 'object') {
          return `${k}=${JSON.stringify(v)}`;
        }
        return `${k}=${String(v)}`;
      })
      .join(' | ');

    const serialised = fields.length > 0 ? `${message} | ${fields}` : message;
    const target = this.syncLogger;

    if (target) {
      this.emit(target, level, serialised);
    } else {
      getNestLogger()
        .then((l) => this.emit(l, level, serialised))
        .catch(() => {
          process.stderr.write(
            JSON.stringify({ level, message, ...data }) + '\n',
          );
        });
    }
  }

  private emit(target: NestLike, level: LogLevel, serialised: string): void {
    switch (level) {
      case 'debug':
        target.debug(serialised);
        break;
      case 'warn':
        target.warn(serialised);
        break;
      case 'error':
        target.error(serialised);
        break;
      default:
        target.log(serialised);
    }
  }
}
