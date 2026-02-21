# observability-kit

Structured logging + request tracing for **NestJS** and **plain Node.js**.

Automatic `requestId` correlation across controllers, services and internal steps — no manual ID passing.

---

## Install

```bash
npm install observability-kit
```

Peer deps (NestJS only):

```bash
npm install @nestjs/common @nestjs/core rxjs
```

---

## Entry points

| Import | Contents |
|---|---|
| `observability-kit` | Core — context helpers + logger |
| `observability-kit/nestjs` | Core + NestJS module, decorators and interceptor |

---

## How it works

```
HTTP Request
     ↓
TraceInterceptor           reads / generates requestId
     ↓
AsyncLocalStorage context  requestId lives here for the full async chain
     ↓
@RequestLog                emits request.start / request.end
     ↓
@ServiceLog                emits service.enter / service.exit
     ↓
@StepLog                   emits step.<name>
```

Every log line carries the same `requestId` automatically.

---

## NestJS setup

### 1. Register the module

```typescript
// app.module.ts
import { Module } from '@nestjs/common';
import { TraceLoggerModule } from 'observability-kit/nestjs';

@Module({
  imports: [
    TraceLoggerModule.forRoot({
      serviceName: 'my-api',
      requestIdHeaderName: 'x-request-id', // default
      enableResponseHeader: true,
    }),
  ],
})
export class AppModule {}
```

### 2. Register the interceptor globally

```typescript
// main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { TraceInterceptor } from 'observability-kit/nestjs';
import { logger, PinoLogAdapter } from 'observability-kit';

async function bootstrap() {
  logger.setAdapter(PinoLogAdapter.pretty()); // desarrollo — salida legible
  // logger.setAdapter(new PinoLogAdapter());  // producción — JSON puro

  const app = await NestFactory.create(AppModule);
  app.useGlobalInterceptors(app.get(TraceInterceptor));
  await app.listen(3000);
}
bootstrap();
```

### 3. Decorar controllers y services

```typescript
import { Controller, Get, Param } from '@nestjs/common';
import { RequestLog, ServiceLog, StepLog } from 'observability-kit/nestjs';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get(':id')
  @RequestLog()
  findOne(@Param('id') id: string) {
    return this.ordersService.findOne(id);
  }
}

@Injectable()
export class OrdersService {
  @ServiceLog()
  async findOne(id: string) {
    return this.calculateTotal(id);
  }

  @StepLog('calculate-total', {
    payloadBuilder: (id: string) => ({ id }),
  })
  private calculateTotal(id: string) { /* ... */ }
}
```

---

## Decoradores

### `@RequestLog(options?)`

Aplica en métodos de **controller**. Emite `request.start`, `request.end` y `request.error`.

| Opción | Tipo | Descripción |
|---|---|---|
| `payloadBuilder` | `(...args) => object` | Extrae payload de los argumentos del método |

### `@ServiceLog(options?)`

Aplica en métodos de **service**. Emite `service.enter`, `service.exit` y `service.error`.

| Opción | Tipo | Default |
|---|---|---|
| `payloadBuilder` | `(...args) => object` | — |
| `level` | `LogLevel` | `'info'` |
| `logExit` | `boolean` | `true` |

### `@StepLog(stepName, options?)`

Aplica en métodos internos. Emite `step.<stepName>` y `step.<stepName>.error`.

| Opción | Tipo | Default |
|---|---|---|
| `payloadBuilder` | `(...args) => object` | — |
| `level` | `LogLevel` | `'debug'` |

---

## Logger y adaptadores

La librería usa **Pino** como backend por defecto.

### Desarrollo — una línea por evento, colores

Requiere `pino-pretty`:

```bash
npm install -D pino-pretty
```

```typescript
import { logger, PinoLogAdapter } from 'observability-kit';

logger.setAdapter(PinoLogAdapter.pretty());
```

Output:

```
[06:14:42] INFO: request.start | endpoint=/orders/1 | method=GET | req=46cfd3ae
[06:14:42] INFO: service.enter | service=OrdersService.findOne | req=46cfd3ae
[06:14:42] DEBUG: step.calculate-total | service=OrdersService.calculateTotal | req=46cfd3ae | payload={"id":"1"}
[06:14:42] INFO: service.exit | service=OrdersService.findOne | req=46cfd3ae
[06:14:42] INFO: request.end | endpoint=/orders/1 | method=GET | req=46cfd3ae | payload={"durationMs":12}
```

Nivel mínimo:

```typescript
logger.setAdapter(PinoLogAdapter.pretty({ level: 'info' })); // oculta debug
```

### Producción — JSON puro, async non-blocking

```typescript
import pino from 'pino';
import { logger, PinoLogAdapter } from 'observability-kit';

const dest = pino.destination({ sync: false });
logger.setAdapter(new PinoLogAdapter({ destination: dest }));
```

### Adaptador personalizado

```typescript
import type { ILogAdapter, LogLevel } from 'observability-kit';
import { logger } from 'observability-kit';

class MyAdapter implements ILogAdapter {
  log(level: LogLevel, message: string, data: Record<string, unknown>): void {
    // enviar a cualquier sistema
  }
}

logger.setAdapter(new MyAdapter());
```

---

## Plain Node.js

Sin NestJS. Importa desde `observability-kit`.

```typescript
import { startContext, logger } from 'observability-kit';
import http from 'http';

http.createServer(async (req, res) => {
  await startContext(
    { requestId: req.headers['x-request-id'] as string, endpoint: req.url, method: req.method },
    async () => {
      logger.info('request.start', { service: 'http-server' });
      res.end('OK');
      logger.info('request.end', { service: 'http-server' });
    },
  );
}).listen(3000);
```

---

## Context helpers

```typescript
import { getContext, getRequestId, setContextField } from 'observability-kit';

const ctx = getContext();                      // { requestId, endpoint?, method?, service? }
const id  = getRequestId();                    // string | undefined
setContextField('service', 'payment-worker');
```

---

## Estructura del proyecto

```
src/
  types/options.ts
  core/
    context/request-context.ts
    logger/
      structured-logger.ts
      adapters/
        adapter.interface.ts
        node.adapter.ts
        pino.adapter.ts
  nest/
    adapters/nest.adapter.ts
    decorators/
      request-log.decorator.ts
      service-log.decorator.ts
      step-log.decorator.ts
    interceptors/request.interceptor.ts
    module/trace-logger.module.ts
  index.ts
  nestjs.ts
```

---

## License

MIT

![downloads](https://img.shields.io/npm/dm/observability-kit)
![license](https://img.shields.io/npm/l/observability-kit)

## Status

Early version – feedback welcome.

---

```typescript
import { RequestLog, ServiceLog, StepLog } from 'observability-kit/nestjs';

@Controller('users')
export class UsersController {
  @Get()
  @RequestLog()
  findAll() { … }
}

@Injectable()
export class UsersService {
  @ServiceLog()
  async findAll() { … }

  @StepLog('fetch-from-db')
  private async fetchFromDb() { … }
}
```

Every log line above is automatically enriched with the same `requestId`—no manual passing required.

---

## Why observability-kit?

Most logging libraries solve **logging**.

This library solves **request correlation** across controllers, services, and internal steps without passing IDs manually through the call chain.

```
HTTP Request
     ↓
TraceInterceptor          ← reads / generates requestId
     ↓
AsyncLocalStorage context ← requestId lives here for the full async chain
     ↓
Controller  (@RequestLog) ← logs request.start / request.end
     ↓
Service     (@ServiceLog) ← logs service.enter / service.exit
     ↓
Step        (@StepLog)    ← logs step.<name>
     ↓
Structured JSON logs      ← every line carries requestId, service, timestamp
```

With a single interceptor registration every downstream call—no matter how deep—carries the same `requestId` automatically.

---

## Quick Start

```bash
npm install observability-kit
# NestJS peer deps:
npm install @nestjs/common @nestjs/core rxjs
```

```typescript
// app.module.ts
import { TraceLoggerModule } from 'observability-kit/nestjs';

@Module({ imports: [TraceLoggerModule.forRoot({ serviceName: 'my-api' })] })
export class AppModule {}

// main.ts
const app = await NestFactory.create(AppModule);
app.useGlobalInterceptors(app.get(TraceInterceptor)); // ← one line
await app.listen(3000);
```

That's it. Every request now carries a correlated `requestId` through the full async chain.

---

## Features

- **Request-ID lifecycle** – reads `x-request-id` header or auto-generates a UUID v4; stored in `AsyncLocalStorage` for the full async chain.
- **Structured logs** – every entry is a plain JSON object `{ requestId, service, message, … }`. Payload is omitted when empty.
- **Pluggable adapters** – default writes to `stdout/stderr`; swap for pino, winston, or the built-in NestJS `Logger` with one line.
- **NestJS integration** – module, interceptor, and three method decorators.
- **Plain Node.js** – zero NestJS dependency; import from `observability-kit`.

---

## Install

```bash
npm install observability-kit
```

Peer dependencies (only needed for NestJS integration):

```bash
npm install @nestjs/common @nestjs/core rxjs
```

---

## Package entry points

| Import path                 | Contents                         |
|-----------------------------|----------------------------------|
| `observability-kit`         | Core – context helpers + logger  |
| `observability-kit/nestjs`  | Core + NestJS module/decorators  |

---

## NestJS Setup

### 1 – Register the module

```typescript
import { Module } from '@nestjs/common';
import { TraceLoggerModule } from 'observability-kit/nestjs';

@Module({
  imports: [
    TraceLoggerModule.forRoot({
      serviceName: 'my-api',
      requestIdHeaderName: 'x-request-id', // default
      enableResponseHeader: true,           // echo id back to client
    }),
  ],
})
export class AppModule {}
```

### 2 – Register the interceptor globally

```typescript
// main.ts
import { NestFactory } from '@nestjs/core';
import { TraceInterceptor } from 'observability-kit/nestjs';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalInterceptors(app.get(TraceInterceptor));
  await app.listen(3000);
}
bootstrap();
```

The interceptor automatically:
- Reads / generates the `requestId`.
- Stores `{ requestId, endpoint, method }` in `AsyncLocalStorage`.
- Optionally sets the `x-request-id` response header.

---

## NestJS Decorators

### `@RequestLog(options?)`

Apply to **controller** methods. Emits `request.start`, `request.end` (with `durationMs`), and `request.error`.

```typescript
import { Controller, Get, Param } from '@nestjs/common';
import { RequestLog } from 'observability-kit/nestjs';

@Controller('users')
export class UsersController {
  @Get(':id')
  @RequestLog({
    payloadBuilder: (id: string) => ({ id }),
  })
  async findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }
}
```

Emitted logs:

```json
{ "level": "info",  "message": "request.start", "requestId": "…", "endpoint": "/users/42", "method": "GET", "service": "UsersController.findOne", "payload": { "id": "42" } }
{ "level": "info",  "message": "request.end",   "requestId": "…", "service": "UsersController.findOne", "payload": { "durationMs": 12 } }
```

---

### `@ServiceLog(options?)`

Apply to **service / use-case** methods. Emits `service.enter`, `service.exit`, and `service.error`.

```typescript
import { Injectable } from '@nestjs/common';
import { ServiceLog } from 'observability-kit/nestjs';

@Injectable()
export class UsersService {
  @ServiceLog({
    payloadBuilder: (id: string) => ({ id }),
    logExit: true,   // default true
    level: 'info',   // default 'info'
  })
  async findOne(id: string) {
    return this.repo.findById(id);
  }
}
```

---

### `@StepLog(stepName, options?)`

Apply to internal / domain step methods. Emits `step.<stepName>` (default level `debug`).

```typescript
import { StepLog } from 'observability-kit/nestjs';

export class PaymentService {
  @StepLog('validate-amount', {
    payloadBuilder: (amount: number) => ({ amount }),
    level: 'debug', // default
  })
  private async validateAmount(amount: number) {
    if (amount <= 0) throw new Error('Invalid amount');
  }
}
```

---

## Plain Node.js Setup

No NestJS required. Import from `observability-kit`.

```typescript
import { startContext, logger } from 'observability-kit';
import http from 'http';

http.createServer(async (req, res) => {
  const requestId = (req.headers['x-request-id'] as string) ?? undefined;

  await startContext(
    {
      requestId,
      endpoint: req.url,
      method: req.method,
      service: 'http-server',
    },
    async () => {
      logger.info('request.start', { service: 'http-server' });

      try {
        // handle request …
        logger.debug('step.process', { service: 'http-server', payload: { url: req.url } });
        res.end('OK');
        logger.info('request.end', { service: 'http-server' });
      } catch (err) {
        logger.error('request.error', { service: 'http-server', payload: { error: (err as Error).message } });
        res.statusCode = 500;
        res.end('Error');
      }
    },
  );
}).listen(3000);
```

Emitted log format:

```json
{ "level": "info", "message": "request.start", "timestamp": "2026-03-01T00:00:00.000Z", "service": "http-server", "requestId": "f47ac10b-…", "endpoint": "/", "method": "GET" }
```

---

## Custom log adapter (pino example)

```typescript
import pino from 'pino';
import { logger } from 'observability-kit';
import type { ILogAdapter, LogLevel } from 'observability-kit';

const pinoLogger = pino();

class PinoAdapter implements ILogAdapter {
  log(level: LogLevel, _message: string, data: Record<string, unknown>): void {
    pinoLogger[level](data);
  }
}

// Swap once at startup – affects all subsequent logger calls globally
logger.setAdapter(new PinoAdapter());
```

---

## Context helpers

```typescript
import { getContext, getRequestId, setContextField } from 'observability-kit';

// Anywhere inside an active context (ALS chain):
const ctx = getContext();                      // { requestId, endpoint?, method?, service? }
const id  = getRequestId();                    // string | undefined
setContextField('service', 'payment-worker');  // mutate current context
```

---

## Structured log entry shape

```
{
  level:      "debug" | "info" | "warn" | "error"
  message:    string          // e.g. "request.start"
  timestamp:  string          // ISO 8601
  service:    string          // "ClassName.methodName"
  requestId?: string          // present when inside an ALS context
  endpoint?:  string          // present in HTTP contexts
  method?:    string          // present in HTTP contexts
  payload?:   object          // omitted when empty / undefined
}
```

---

## Project structure

```
src/
  types/
    options.ts                   Shared TypeScript types + interfaces
  core/
    context/
      request-context.ts         AsyncLocalStorage – startContext / getContext / …
    logger/
      structured-logger.ts       StructuredLogger class + `logger` singleton
      adapters/
        adapter.interface.ts     ILogAdapter interface
        node.adapter.ts          Default adapter (stdout/stderr JSON lines)
  nest/
    adapters/
      nest.adapter.ts            NestJS Logger adapter
    decorators/
      request-log.decorator.ts   @RequestLog
      service-log.decorator.ts   @ServiceLog
      step-log.decorator.ts      @StepLog
    interceptors/
      request.interceptor.ts     TraceInterceptor (ALS context population)
    module/
      trace-logger.module.ts     TraceLoggerModule.forRoot()
  index.ts                       Core entry point (no NestJS dependency)
  nestjs.ts                      NestJS entry point (core + NestJS integration)
```

---

## Build

```bash
npm run build       # via NestJS CLI (nest build)
npm run build:tsc   # via tsc directly
```

---

## Roadmap

- [ ] OpenTelemetry support
- [ ] Fastify plugin
- [ ] Express middleware
- [ ] Performance benchmarks

## License

MIT
