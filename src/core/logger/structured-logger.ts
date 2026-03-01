import { getContext } from '../context/request-context.js';
import type { ILogAdapter } from './adapters/adapter.interface.js';
import { NodeLogAdapter } from './adapters/node.adapter.js';

export class StructuredLogger {
  private adapter: ILogAdapter;

  constructor(adapter?: ILogAdapter) {
    this.adapter = adapter ?? new NodeLogAdapter();
  }

  setAdapter(adapter: ILogAdapter): void {
    this.adapter = adapter;
  }

  private buildEntry(
    message: string,
    options: { service: string; payload?: Record<string, unknown> },
  ): Record<string, unknown> {
    const ctx = getContext();

    const entry: Record<string, unknown> = {
      timestamp: new Date().toISOString(),
      service: options.service,
      message,
    };

    if (ctx?.requestId) entry['requestId'] = ctx.requestId;
    if (ctx?.endpoint) entry['endpoint'] = ctx.endpoint;
    if (ctx?.method) entry['method'] = ctx.method;

    if (options.payload && Object.keys(options.payload).length > 0) {
      entry['payload'] = options.payload;
    }

    return entry;
  }

  debug(
    message: string,
    options: { service: string; payload?: Record<string, unknown> },
  ): void {
    this.adapter.log('debug', message, this.buildEntry(message, options));
  }

  info(
    message: string,
    options: { service: string; payload?: Record<string, unknown> },
  ): void {
    this.adapter.log('info', message, this.buildEntry(message, options));
  }

  warn(
    message: string,
    options: { service: string; payload?: Record<string, unknown> },
  ): void {
    this.adapter.log('warn', message, this.buildEntry(message, options));
  }

  error(
    message: string,
    options: { service: string; payload?: Record<string, unknown> },
  ): void {
    this.adapter.log('error', message, this.buildEntry(message, options));
  }
}

export const logger = new StructuredLogger();
