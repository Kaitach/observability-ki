import { DynamicModule, Global, Module } from '@nestjs/common';
import { logger } from '../../core/logger/structured-logger.js';
import { NestLogAdapter } from '../adapters/nest.adapter.js';
import { TraceInterceptor } from '../interceptors/request.interceptor.js';
import type { TraceLoggerModuleOptions } from '../../types/options.js';
import { TRACE_LOGGER_OPTIONS } from '../tokens.js';

export { TRACE_LOGGER_OPTIONS };

@Global()
@Module({})
export class TraceLoggerModule {
  static forRoot(options: TraceLoggerModuleOptions): DynamicModule {
    logger.setAdapter(new NestLogAdapter());

    return {
      module: TraceLoggerModule,
      providers: [
        {
          provide: TRACE_LOGGER_OPTIONS,
          useValue: options,
        },
        TraceInterceptor,
      ],
      exports: [TRACE_LOGGER_OPTIONS, TraceInterceptor],
    };
  }
}
