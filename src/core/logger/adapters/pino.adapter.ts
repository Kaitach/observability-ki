import pino from 'pino';
import { Transform } from 'node:stream';
import type { LogLevel } from '../../../types/options.js';
import type { ILogAdapter } from './adapter.interface.js';

export interface PinoLogAdapterOptions {
  pino?: pino.LoggerOptions;
  destination?: pino.DestinationStream;
}

export interface PrettyOptions {
  level?: LogLevel;
}

interface PinoPrettyStream extends pino.DestinationStream {
  [key: string]: unknown;
}

export class PinoLogAdapter implements ILogAdapter {
  private readonly logger: pino.Logger;

  constructor(opts: PinoLogAdapterOptions = {}) {
    const defaults: pino.LoggerOptions = {
      timestamp: pino.stdTimeFunctions.isoTime,
      base: undefined,
      ...opts.pino,
    };

    this.logger = opts.destination
      ? pino(defaults, opts.destination)
      : pino(defaults);
  }

  static pretty(opts: PrettyOptions = {}): PinoLogAdapter {
    let prettyStream: PinoPrettyStream;

    try {
      const PinoPretty = require('pino-pretty') as (
        options: Record<string, unknown>,
      ) => PinoPrettyStream;

      prettyStream = PinoPretty({
        singleLine: true,
        colorize: true,
        translateTime: 'HH:MM:ss.l',
        ignore: 'pid,hostname,time',
        hideObject: true,
        messageFormat: (
          log: Record<string, unknown>,
          messageKey: string,
        ): string => {
          const msg = String(log[messageKey] ?? '');
          const requestId = log['requestId'] as string | undefined;
          const shortId = requestId ? requestId.slice(0, 8) : null;
          const parts: string[] = [msg];

          if (msg.startsWith('request.')) {
            if (log['endpoint']) parts.push(`endpoint=${String(log['endpoint'])}`);
            if (log['method'])   parts.push(`method=${String(log['method'])}`);
            if (shortId)         parts.push(`req=${shortId}`);
          } else {
            if (log['service']) parts.push(`service=${String(log['service'])}`);
            if (shortId)        parts.push(`req=${shortId}`);
          }

          if (log['payload'] !== undefined) {
            parts.push(`payload=${JSON.stringify(log['payload'])}`);
          }

          return parts.join(' | ');
        },
      });
    } catch {
      throw new Error(
        '[observability-kit] PinoLogAdapter.pretty() requiere "pino-pretty" instalado.\n' +
          'Ejecuta: npm install -D pino-pretty',
      );
    }

    const spaced = new Transform({
      transform(chunk: Buffer, _enc, cb) {
        const raw = chunk.toString();
        const lines = raw.split('\n').filter((l) => l.trim().length > 0);
        for (const line of lines) {
          prettyStream.write(line + '\n');
          process.stdout.write('\n');
        }
        cb();
      },
    });

    return new PinoLogAdapter({
      pino: { level: opts.level ?? 'debug' },
      destination: spaced as unknown as pino.DestinationStream,
    });
  }

  log(level: LogLevel, _message: string, data: Record<string, unknown>): void {
    const { message, timestamp: _ts, ...rest } = data;
    this.logger[level](rest, String(message ?? ''));
  }
}
