import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  Inject,
  Optional,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { randomUUID } from 'node:crypto';
import type { Request, Response } from 'express';
import { runWithContext } from '../../core/context/request-context.js';
import type {
  RequestContext,
  TraceLoggerModuleOptions,
} from '../../types/options.js';
import { TRACE_LOGGER_OPTIONS } from '../tokens.js';

@Injectable()
export class TraceInterceptor implements NestInterceptor {
  private readonly headerName: string;
  private readonly enableResponseHeader: boolean;

  constructor(
    @Optional()
    @Inject(TRACE_LOGGER_OPTIONS)
    options?: TraceLoggerModuleOptions,
  ) {
    this.headerName = options?.requestIdHeaderName ?? 'x-request-id';
    this.enableResponseHeader = options?.enableResponseHeader ?? false;
  }

  intercept(
    executionContext: ExecutionContext,
    next: CallHandler,
  ): Observable<unknown> {
    const kind = executionContext.getType<string>();
    if (kind !== 'http') {
      return next.handle();
    }

    const req = executionContext.switchToHttp().getRequest<Request>();
    const res = executionContext.switchToHttp().getResponse<Response>();

    const headerValue = this.getHeader(req, this.headerName);
    const requestId =
      typeof headerValue === 'string' && headerValue.length > 0
        ? headerValue
        : randomUUID();

    const context: RequestContext = {
      requestId,
      endpoint: req.path,
      method: req.method,
    };

    if (this.enableResponseHeader) {
      res.setHeader(this.headerName, requestId);
    }

    return new Observable((subscriber) => {
      runWithContext(context, () => {
        next.handle().subscribe(subscriber);
      });
    });
  }

  private getHeader(req: Request, name: string): string | string[] | undefined {
    return req.headers[name.toLowerCase()];
  }
}
