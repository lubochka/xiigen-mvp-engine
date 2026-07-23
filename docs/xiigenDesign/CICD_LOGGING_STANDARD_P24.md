# XIIGen — CI/CD + Structured Logging Standard
## Phase 24: StructuredLogger + Health Endpoints + GitHub Actions CI
## Track B — Foundation Standards
## Date: 2026-03-05 | Status: AUTHORITATIVE

---

> ### ⚠️ IMPLEMENTATION UPDATE (2026-04-14)
>
> This standard was written during the Python/FastAPI design phase.
> The live codebase implements CI/CD and logging in **NestJS 11 + TypeScript 5**.
>
> **Actual implementation in `server/src/devops/`:**
> - `StructuredLogger` at `structured-logger.ts` — JSON output with tenant/service/correlation context
> - `CorrelationMiddleware` at `correlation-middleware.ts` — per-request correlation IDs
> - `RequestLogger` at `request-logger.ts` — HTTP request/response logging
> - `CiValidator` at `ci-validator.ts` — CI pipeline validation
> - `DockerfileValidator` at `dockerfile-validator.ts`
> - `ComposeValidator` at `compose-validator.ts`
> - `LintValidator` at `lint-validator.ts`
> - `LogConfig` at `log-config.ts` — log level configuration
> - Pre-commit gate: `scripts/pre-commit-check.sh` (10 checks)
> - Test baseline: 10,470 server tests + ~1,080 client tests
>
> **The structured logging and CI validation architecture is implemented as described.**

---

## 1. Problem Statement

No CI/CD pipeline existed. Logging was ad-hoc `console.log()` with no tenant, flow, or
correlation context — making production debugging across multi-tenant flows impractical:

- No GitHub Actions workflow — builds were never automatically verified after push
- `console.log()` scattered across services with no tenant/service/correlation fields
- No per-flow health endpoint — ops had no way to check factory health per domain
- Log lines from different tenants were indistinguishable in aggregated logs
- Coverage had no enforced floor — test gaps could ship silently

**Fix:** `StructuredLogger` in `@xiigen/kernel` enforces JSON output with mandatory context
fields. A lint rule (`no-console`) blocks raw `console.log`. Every module ships
`{domain}.logger.ts`. CI runs on every push and PR with coverage ≥ 80% gate.

---

## 2. StructuredLogger — Server

```typescript
// Design path: packages/kernel/src/logging/structured-logger.ts
// Actual path: server/src/devops/structured-logger.ts

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogContext {
  tenantId?:      string;   // DNA-5 — always present when inside a request
  flowId?:        string;   // e.g. "forms-automation"
  serviceId?:     string;   // e.g. "F852"
  correlationId?: string;   // trace ID propagated across services via queue events
  taskType?:      string;   // e.g. "T307"
  action?:        string;   // e.g. "storeSchema"
  durationMs?:    number;
  error?:         string;   // DataProcessResult.error code
  [key: string]:  unknown;  // additional fields — Record<string,unknown> (DNA-1)
}

export interface LogLine {
  timestamp:    string;       // ISO-8601
  level:        LogLevel;
  message:      string;
  tenantId:     string;       // "" when outside a request — never omitted
  flowId:       string;       // "" when not in a flow context
  serviceId:    string;       // "" when not in a service context
  correlationId: string;      // "" when not set
  [key: string]: unknown;     // all LogContext fields merged in
}

/**
 * StructuredLogger — mandatory for all server-side services.
 * All output is JSON (one line per log event) — no console.log.
 * Pre-configured with flowId + serviceId at construction time.
 */
export class StructuredLogger {
  constructor(
    private readonly flowId:    string,
    private readonly serviceId: string,
  ) {}

  info(context: LogContext & { message?: string }): void {
    this.write('info', context);
  }

  warn(context: LogContext & { message?: string }): void {
    this.write('warn', context);
  }

  error(context: LogContext & { message?: string }): void {
    this.write('error', context);
  }

  debug(context: LogContext & { message?: string }): void {
    if (process.env['LOG_LEVEL'] === 'debug') this.write('debug', context);
  }

  private write(level: LogLevel, context: LogContext & { message?: string }): void {
    const line: LogLine = {
      timestamp:     new Date().toISOString(),
      level,
      message:       context.message ?? '',
      tenantId:      context.tenantId      ?? '',
      flowId:        context.flowId        ?? this.flowId,
      serviceId:     context.serviceId     ?? this.serviceId,
      correlationId: context.correlationId ?? '',
      ...context,
    };
    // Single JSON line — never multi-line, never console.log
    process.stdout.write(JSON.stringify(line) + '\n');
  }
}
```

---

## 3. Module Logger File — {domain}.logger.ts

```typescript
// modules/forms-automation/forms-automation.logger.ts
// REFERENCE IMPLEMENTATION — pre-configured with flowId + serviceId

import { StructuredLogger } from '@xiigen/kernel';

/**
 * Shared logger instance for the forms-automation module.
 * Import this in every service — never instantiate StructuredLogger directly.
 *
 * Usage:
 *   import { logger } from '../forms-automation.logger';
 *   logger.info({ action: 'storeSchema', tenantId, serviceId: 'F852' });
 */
export const logger = new StructuredLogger(
  'forms-automation',  // flowId
  'forms-automation',  // default serviceId — override per-call with serviceId field
);
```

### Usage in a service

```typescript
// modules/forms-automation/authoring/schema.service.ts

import { logger } from '../forms-automation.logger';   // ← import shared instance
import { DataProcessResult, TenantKeyGenerator } from '@xiigen/kernel';
import { IDatabaseService } from '@xiigen/fabrics';

export class FormSchemaService extends MicroserviceBase {
  constructor(private readonly db: IDatabaseService) { super(); }

  async storeSchema(payload: Record<string, unknown>): Promise<DataProcessResult<string>> {
    const { tenantId } = this.tenantContext;

    logger.info({
      action:    'storeSchema',
      tenantId,
      serviceId: 'F852',
      formId:    payload['formId'] as string,
    });

    const docId = TenantKeyGenerator.generateDocId(tenantId);
    const result = await this.db.storeDocument(tenantId, 'form-schemas', payload, docId);

    if (!result.isSuccess) {
      logger.error({
        action:    'storeSchema',
        tenantId,
        serviceId: 'F852',
        error:     result.error,
        message:   'Failed to store form schema',
      });
    }

    return result;
  }
}
```

---

## 4. ClientLogger — Web

```typescript
// Design path: packages/web-core/src/logging/client-logger.ts
// Actual: client-side logging in client/src/ (React 18, not React Native)

export type ClientLogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface ClientLogContext {
  tenantId?:      string;
  screen?:        string;   // e.g. "FormsScreen"
  hook?:          string;   // e.g. "useFormSchema"
  component?:     string;   // e.g. "SubmitPanel"
  action?:        string;
  correlationId?: string;
  error?:         string;
  durationMs?:    number;
  [key: string]:  unknown;
}

/**
 * ClientLogger — mirrors StructuredLogger shape for log aggregation.
 * Sends JSON to configured endpoint or console in development only.
 */
export class ClientLogger {
  constructor(
    private readonly screen: string,
    private readonly logEndpoint?: string,
  ) {}

  info(context: ClientLogContext & { message?: string }): void {
    this.write('info', context);
  }

  error(context: ClientLogContext & { message?: string }): void {
    this.write('error', context);
  }

  private write(level: ClientLogLevel, context: ClientLogContext & { message?: string }): void {
    const line = {
      timestamp:     new Date().toISOString(),
      level,
      message:       context.message ?? '',
      screen:        context.screen ?? this.screen,
      tenantId:      context.tenantId ?? '',
      correlationId: context.correlationId ?? '',
      ...context,
    };
    if (this.logEndpoint) {
      // Non-blocking fire-and-forget — DNA-3: never throw
      fetch(this.logEndpoint, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(line),
        keepalive: true,
      }).catch(() => { /* swallow — logging must never break the app */ });
    } else if (process.env['NODE_ENV'] === 'development') {
      // Development only — production never uses console
      // eslint-disable-next-line no-console
      console.log(JSON.stringify(line));
    }
  }
}
```

---

## 5. Health Endpoint — Per-Flow

```typescript
// Design path: apps/api/src/api/health.endpoints.ts
// Actual: server/src/api/ (DynamicController pattern)

export const HEALTH_ENDPOINT: EndpointDefinition = {
  method:    'GET',
  path:      '/api/:domain/health',
  handlerId: 'domainHealth',
  label:     'Domain Health Check',
  domainId:  'engine',
  requiresTenantId: false,
};
```

```typescript
// apps/api/src/api/health.handler.ts

import { Injectable } from '@nestjs/common';
import { FactoryRegistry } from '@xiigen/core';
import { DataProcessResult } from '@xiigen/kernel';

export interface HealthStatus {
  status:    'ok' | 'degraded' | 'down';
  factories: Record<string, 'ok' | 'degraded' | 'down'>;
  checkedAt: string;
}

@Injectable()
export class HealthHandler {
  constructor(private readonly registry: FactoryRegistry) {}

  async check(domain: string): Promise<DataProcessResult<HealthStatus>> {
    const factories = this.registry.getByDomain(domain);
    const statuses: Record<string, 'ok' | 'degraded' | 'down'> = {};

    await Promise.allSettled(
      factories.map(async (factory) => {
        try {
          const instance = await factory.createAsync({ tenantId: '__health__' });
          statuses[factory.id] = instance ? 'ok' : 'degraded';
        } catch {
          statuses[factory.id] = 'down';   // DNA-3: caught here, not re-thrown
        }
      }),
    );

    const values = Object.values(statuses);
    const overall: HealthStatus['status'] =
      values.every(v => v === 'ok')   ? 'ok'       :
      values.some(v  => v === 'down') ? 'degraded' : 'ok';

    return DataProcessResult.success({
      status:    overall,
      factories: statuses,
      checkedAt: new Date().toISOString(),
    });
  }
}
```

### Response shape

```json
GET /api/forms-automation/health

{
  "isSuccess": true,
  "data": {
    "status": "ok",
    "factories": {
      "F852": "ok",
      "F853": "ok",
      "F858": "ok"
    },
    "checkedAt": "2026-03-05T12:00:00.000Z"
  }
}
```

---

## 6. ESLint Rule — no-console

```javascript
// .eslintrc.js (apps/api + packages/*)

module.exports = {
  rules: {
    // Block all raw console usage — use StructuredLogger instead
    'no-console': ['error', { allow: [] }],
  },
};
```

```javascript
// .eslintrc.js (apps/web)
module.exports = {
  rules: {
    // Block console in production code — ClientLogger only
    // Exception: ClientLogger itself (one allow)
    'no-console': ['error', { allow: ['log'] }],
    // Custom rule: console.log only allowed in ClientLogger file
    'no-restricted-syntax': [
      'error',
      {
        selector: 'CallExpression[callee.object.name="console"]',
        message:  'Use ClientLogger — never console directly in app code',
      },
    ],
  },
};
```

---

## 7. GitHub Actions CI Workflow

```yaml
# .github/workflows/ci.yml

name: XIIGen CI

on:
  push:
    branches: ['**']
  pull_request:
    branches: [main, develop]

jobs:
  backend:
    name: Backend — TypeScript + NestJS
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v3
        with:
          version: 9

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: TypeScript compile check
        run: pnpm --filter @xiigen/api tsc --noEmit

      - name: Lint (no-console enforced)
        run: pnpm --filter @xiigen/api lint

      - name: Unit + integration tests
        run: pnpm --filter @xiigen/api test --coverage --coverageThreshold='{"global":{"lines":80}}'

      - name: Upload coverage
        uses: actions/upload-artifact@v4
        with:
          name: backend-coverage
          path: apps/api/coverage/

  client:
    name: Client — React 18 + Vite
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v3
        with:
          version: 9

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: TypeScript compile check
        run: pnpm --filter @xiigen/web tsc --noEmit

      - name: Lint
        run: pnpm --filter @xiigen/web lint

      - name: Unit + component tests
        run: pnpm --filter @xiigen/web test --coverage --coverageThreshold='{"global":{"lines":80}}'

      - name: Production build check
        run: pnpm --filter @xiigen/web build

  validation-report:
    name: VALIDATION_REPORT — Module Completeness
    runs-on: ubuntu-latest
    needs: [backend, client]
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'pnpm' }
      - run: pnpm install --frozen-lockfile

      - name: Run VALIDATION_REPORT
        run: pnpm validate
        # Fails build if any module is missing mandatory standard files:
        # {domain}.rag-seed.ts, {domain}.prompts.ts, {domain}.endpoints.ts,
        # {domain}.logger.ts, {domain}.docs.ts
        # Also checks: per-family README.md present, coverage >= 80%,
        # documented vs total routes 100%
```

---

## 8. VALIDATION_REPORT Script

```typescript
// scripts/validate.ts
// Run by: pnpm validate — called by CI validation-report job

import { readdirSync, existsSync } from 'fs';
import { join } from 'path';

const MODULES_DIR  = join(process.cwd(), 'modules');
const MANDATORY_FILES = [
  '{domain}.rag-seed.ts',    // P21
  '{domain}.prompts.ts',     // P22
  '{domain}.endpoints.ts',   // P23
  '{domain}.logger.ts',      // P24
  '{domain}.docs.ts',        // P25 (checked after P25 completes)
] as const;

let failures = 0;

const domains = readdirSync(MODULES_DIR, { withFileTypes: true })
  .filter(d => d.isDirectory())
  .map(d => d.name);

for (const domain of domains) {
  const dir = join(MODULES_DIR, domain);
  for (const template of MANDATORY_FILES) {
    const filename = template.replace('{domain}', domain);
    const fullPath = join(dir, filename);
    if (!existsSync(fullPath)) {
      console.error(`❌ MISSING: modules/${domain}/${filename}`);
      failures++;
    }
  }
}

if (failures > 0) {
  console.error(`\nVALIDATION_REPORT: ${failures} mandatory file(s) missing — build failed.`);
  process.exit(1);
} else {
  console.log('✅ VALIDATION_REPORT: all mandatory module files present.');
}
```

---

## 9. Tests Required

### StructuredLogger unit tests

```typescript
// packages/kernel/src/test/structured-logger.spec.ts

describe('StructuredLogger', () => {
  it('writes valid JSON to stdout', () => {
    const writeSpy = jest.spyOn(process.stdout, 'write').mockImplementation(() => true);
    const logger = new StructuredLogger('forms-automation', 'F852');
    logger.info({ action: 'storeSchema', tenantId: 'acme' });

    const written = JSON.parse(writeSpy.mock.calls[0][0] as string);
    expect(written.level).toBe('info');
    expect(written.tenantId).toBe('acme');
    expect(written.flowId).toBe('forms-automation');
    expect(written.serviceId).toBe('F852');
    expect(written.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    writeSpy.mockRestore();
  });

  it('all log lines include tenantId — empty string when not in request', () => {
    const writeSpy = jest.spyOn(process.stdout, 'write').mockImplementation(() => true);
    const logger = new StructuredLogger('engine', 'bootstrap');
    logger.info({ action: 'startup' });

    const written = JSON.parse(writeSpy.mock.calls[0][0] as string);
    expect('tenantId' in written).toBe(true);   // always present
    expect(written.tenantId).toBe('');
    writeSpy.mockRestore();
  });

  it('error() includes error code field when provided', () => {
    const writeSpy = jest.spyOn(process.stdout, 'write').mockImplementation(() => true);
    const logger = new StructuredLogger('forms-automation', 'F852');
    logger.error({ action: 'storeSchema', tenantId: 'acme', error: 'DB_WRITE_FAILED' });

    const written = JSON.parse(writeSpy.mock.calls[0][0] as string);
    expect(written.level).toBe('error');
    expect(written.error).toBe('DB_WRITE_FAILED');
    writeSpy.mockRestore();
  });
});
```

### Health endpoint tests

```typescript
// apps/api/src/test/unit/health.handler.spec.ts

describe('HealthHandler', () => {
  it('returns ok when all factories resolve', async () => {
    mockRegistry.getByDomain.mockReturnValue([
      { id: 'F852', createAsync: jest.fn().mockResolvedValue({}) },
      { id: 'F858', createAsync: jest.fn().mockResolvedValue({}) },
    ]);
    const result = await handler.check('forms-automation');
    expect(result.isSuccess).toBe(true);
    expect(result.data?.status).toBe('ok');
    expect(result.data?.factories['F852']).toBe('ok');
  });

  it('returns degraded when a factory rejects — never throws', async () => {
    mockRegistry.getByDomain.mockReturnValue([
      { id: 'F852', createAsync: jest.fn().mockResolvedValue({}) },
      { id: 'F858', createAsync: jest.fn().mockRejectedValue(new Error('timeout')) },
    ]);
    const result = await handler.check('forms-automation');
    expect(result.isSuccess).toBe(true);      // DNA-3: never throw
    expect(result.data?.status).toBe('degraded');
    expect(result.data?.factories['F858']).toBe('down');
  });
});
```

### CI config test

```typescript
// scripts/test/ci-config.spec.ts

import { readFileSync } from 'fs';
import * as yaml from 'js-yaml';

describe('CI workflow', () => {
  it('parses as valid YAML', () => {
    const content = readFileSync('.github/workflows/ci.yml', 'utf8');
    expect(() => yaml.load(content)).not.toThrow();
  });

  it('has backend, client, and validation-report jobs', () => {
    const content = readFileSync('.github/workflows/ci.yml', 'utf8');
    const config = yaml.load(content) as Record<string, unknown>;
    const jobs = Object.keys((config['jobs'] as Record<string, unknown>) ?? {});
    expect(jobs).toContain('backend');
    expect(jobs).toContain('client');
    expect(jobs).toContain('validation-report');
  });

  it('coverage threshold is 80%', () => {
    const content = readFileSync('.github/workflows/ci.yml', 'utf8');
    expect(content).toContain('"lines":80');
  });
});
```

---

## 10. Module Template Update

```
modules/{domain-slug}/
├── index.ts
├── manifest.ts
├── {domain}.module.ts
├── {domain}.controller.ts
│
├── ── MANDATORY STANDARD FILES ──────────────────────────────
│
├── {domain}.rag-seed.ts        ← Phase 21 ✅ COMPLETE
├── {domain}.prompts.ts         ← Phase 22 ✅ COMPLETE
├── {domain}.endpoints.ts       ← Phase 23 ✅ COMPLETE
│
├── {domain}.logger.ts          ← THIS FILE (Phase 24) ✅ NOW REQUIRED
│                                    new StructuredLogger(flowId, serviceId)
│                                    export const logger = ...
│                                    imported by every service in the module
│
├── {domain}.docs.ts            ← Phase 25 (PENDING)
│
└── {group}/
    └── {service}.ts            ← imports logger, never console.log
```

---

## 11. Iron Rules (Added by Phase 24)

| # | Rule | Consequence |
|---|------|-------------|
| IR-P24-1 | Every module MUST ship `{domain}.logger.ts` exporting a `StructuredLogger` instance | VALIDATION_REPORT build failure |
| IR-P24-2 | Every service MUST import from `{domain}.logger.ts` — never instantiate `StructuredLogger` directly | Logger misconfiguration |
| IR-P24-3 | `no-console` ESLint rule MUST be enforced on all server packages — zero `console.log` in service code | CI lint failure |
| IR-P24-4 | Every log line MUST include `tenantId` — empty string `""` when outside a request (never omitted) | Observability requirement |
| IR-P24-5 | Every error log MUST include `error` field matching `DataProcessResult.error` code | Debug correlation requirement |
| IR-P24-6 | Every module MUST expose `GET /api/{domain}/health` returning `DataProcessResult<HealthStatus>` | Ops requirement |
| IR-P24-7 | Health handler MUST return `DataProcessResult` — never throw even if all factories are down | DNA-3 |
| IR-P24-8 | CI MUST run on every push — no unverified code ships without TypeScript compile + lint + tests | Quality gate |
| IR-P24-9 | Coverage floor is 80% lines — CI fails below this threshold | Quality gate |

---

## 12. Backward Compatibility

- All existing artifact numbers unchanged (F1–F1483, T1–T564, CF-1–CF-788, SK-1–SK-401, DR-1–DR-266)
- `StructuredLogger` is additive — existing services that used `console.log` need logger import added
- Health endpoint is additive — new route, no existing route modified
- ESLint `no-console` will surface existing violations as CI errors — intentional (fixes are additive)
- FLOW-35 next anchors unchanged: F1484 · Family 223 · T565 · CF-789 · SK-402 · DR-267

---

## 13. Checkpoint

```json
{
  "phase": 24,
  "title": "CI/CD + Structured Logging Standard",
  "status": "complete",
  "delivers": [
    "StructuredLogger: JSON output, mandatory { timestamp, level, tenantId, flowId, serviceId, correlationId }",
    "ClientLogger: same JSON shape + { screen, hook, component } for web",
    "forms-automation.logger.ts reference implementation",
    "HealthHandler: GET /api/:domain/health → DataProcessResult<HealthStatus>",
    "ESLint no-console rule on server + client packages",
    ".github/workflows/ci.yml: backend + client + validation-report jobs",
    "VALIDATION_REPORT script: checks all 5 mandatory module files",
    "StructuredLogger unit tests: JSON shape, tenantId always present, error code",
    "HealthHandler unit tests: all ok, degraded, DNA-3 never-throw",
    "CI config test: YAML valid, 3 jobs, 80% coverage threshold"
  ],
  "ironRulesAdded": 9,
  "ironRuleRange": "IR-P24-1 through IR-P24-9",
  "mandatoryModuleFiles": {
    "complete": 4,
    "total": 6,
    "files": [
      "{domain}.rag-seed.ts (P21)",
      "{domain}.prompts.ts (P22)",
      "{domain}.endpoints.ts + web hooks + screen (P23)",
      "{domain}.logger.ts (P24)"
    ],
    "pending": ["{domain}.docs.ts (P25)"]
  },
  "ciJobs": ["backend", "client", "validation-report"],
  "coverageFloor": "80% lines",
  "artifactNumbersUnchanged": true,
  "nextAnchors": { "F": 1484, "T": 565, "CF": 789, "SK": 402, "DR": 267 }
}
```
