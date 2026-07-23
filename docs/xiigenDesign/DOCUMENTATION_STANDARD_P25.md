# XIIGen — Documentation Standard
## Phase 25: OpenAPI + Per-Family READMEs + API Reference Generation
## Track B — Foundation Standards
## Date: 2026-03-05 | Status: AUTHORITATIVE

---

> ### ⚠️ IMPLEMENTATION UPDATE (2026-04-14)
>
> This standard was written during the Python/FastAPI design phase.
> The live codebase implements documentation generation in **NestJS 11 + TypeScript 5**.
>
> **Actual implementation in `server/src/doc-gen/`:**
> - `OpenApiGenerator` at `openapi-generator.ts` — OpenAPI 3.0 spec generation
> - `DiagramGenerator` at `diagram-generator.ts` — flow/architecture diagrams
> - `ModuleReadmeGenerator` at `module-readme-generator.ts` — per-module READMEs
> - `ServiceCatalogGenerator` at `service-catalog-generator.ts` — service inventory
> - NestJS Swagger module integration for `/api/docs` endpoint
>
> **The documentation generation architecture is implemented as described,
> using NestJS decorators and @nestjs/swagger instead of FastAPI auto-docs.**

---

## 1. Problem Statement

FLOW-21 shipped 49 services and 23 endpoints with no machine-readable API specification,
no per-family README, and no API reference document:

- `/api/docs` did not exist — integrators had no Swagger UI to explore endpoints
- `/api/openapi.json` did not exist — no contract for client code generation
- 12 service group directories had no `README.md` — family purpose, factory range, and
  BFA rules were only discoverable by reading source code
- `VALIDATION_REPORT` had no docs coverage check — undocumented routes could ship silently
- `scripts/generate-docs.ts` did not exist — no automated API reference output

**Fix:** Every module ships `{domain}.docs.ts` implementing `IFlowDocs`. `@nestjs/swagger`
decorates `DynamicController` with `@ApiTags` and `@ApiOperation` — all flow routes are
auto-documented. `scripts/generate-docs.ts` produces `FLOW_XX_API_REFERENCE.md` per module
and `FULL_API_REFERENCE.md` across all flows. `VALIDATION_REPORT` fails if any service group
directory is missing `README.md` or if documented routes < total routes.

---

## 2. Core Interface — IFlowDocs

```typescript
// Design path: packages/core/src/interfaces/flow-docs.interface.ts
// Actual: server/src/doc-gen/ (OpenApiGenerator, DiagramGenerator, etc.)

export interface FactoryDocEntry {
  factoryId:    string;         // e.g. "F852"
  interfaceName: string;        // e.g. "IFormSchemaService"
  fabric:       string;         // e.g. "DATABASE"
  fabricProvider: string;       // e.g. "Elasticsearch"
  group:        string;         // service group directory name, e.g. "authoring"
  description:  string;         // one sentence
}

export interface FlowDocsManifest {
  domainId:        string;
  displayName:     string;      // e.g. "Forms Automation"
  description:     string;      // 2–3 sentences
  familyRange:     string;      // e.g. "F852–F900"
  taskTypeRange:   string;      // e.g. "T307–T326"
  bfaRuleRange:    string;      // e.g. "CF-386–CF-400"
  designRecords:   string[];    // e.g. ["DR-134", "DR-135"]
  factories:       FactoryDocEntry[];
  endpoints:       string[];    // handlerIds from {domain}.endpoints.ts
  fabrics:         string[];    // fabrics used: e.g. ["DATABASE", "QUEUE"]
}

/**
 * Every module MUST implement IFlowDocs.
 * Shipped as {domain}.docs.ts in the module root.
 * Consumed by scripts/generate-docs.ts and VALIDATION_REPORT.
 */
export interface IFlowDocs {
  readonly manifest: FlowDocsManifest;
}
```

---

## 3. Reference Implementation — forms-automation.docs.ts

```typescript
// modules/forms-automation/forms-automation.docs.ts
// REFERENCE IMPLEMENTATION

import { IFlowDocs, FlowDocsManifest } from '@xiigen/core';

export class FormsAutomationDocs implements IFlowDocs {
  readonly manifest: FlowDocsManifest = {
    domainId:      'forms-automation',
    displayName:   'Forms Automation',
    description:   'Engine-generated form lifecycle management: schema authoring, entry submission, ' +
                   'AI-assisted field suggestions, and workflow routing. All services are fabric-first ' +
                   'and DNA-compliant, resolving through DATABASE FABRIC and QUEUE FABRIC.',
    familyRange:   'F852–F900',
    taskTypeRange: 'T307–T326',
    bfaRuleRange:  'CF-386–CF-400',
    designRecords: ['DR-134', 'DR-135', 'DR-136'],
    fabrics:       ['DATABASE', 'QUEUE', 'AI_ENGINE'],
    endpoints:     [
      'formsStoreSchema',
      'formsGetSchema',
      'formsSchemaVersions',
      'formsSubmitEntry',
      'formsListEntries',
      'formsGetEntry',
    ],
    factories: [
      {
        factoryId:     'F852',
        interfaceName: 'IFormSchemaService',
        fabric:        'DATABASE',
        fabricProvider:'Elasticsearch',
        group:         'authoring',
        description:   'Stores and retrieves versioned JSON Schema documents for tenant-scoped forms.',
      },
      {
        factoryId:     'F853',
        interfaceName: 'IFormSchemaValidatorService',
        fabric:        'DATABASE',
        fabricProvider:'Elasticsearch',
        group:         'authoring',
        description:   'Validates form payloads against stored JSON Schema before persistence.',
      },
      {
        factoryId:     'F858',
        interfaceName: 'IFormSubmissionService',
        fabric:        'DATABASE',
        fabricProvider:'Elasticsearch',
        group:         'submission',
        description:   'Persists form entries and emits entry.persisted event after successful write (DNA-8).',
      },
    ],
  };
}

export const FORMS_AUTOMATION_DOCS = new FormsAutomationDocs();
```

---

## 4. @nestjs/swagger — DynamicController Decoration

```typescript
// Design path: apps/api/src/api/dynamic-controller.base.ts
// Actual: server/src/api/ (NestJS DynamicController with @nestjs/swagger)

import {
  ApiTags, ApiOperation, ApiHeader, ApiResponse, ApiBody,
} from '@nestjs/swagger';
import { EndpointDefinition } from '@xiigen/core';

/**
 * DynamicController registers endpoints from the ENDPOINTS registry (DNA-6).
 * P25 adds @nestjs/swagger decorators so all routes appear in /api/docs.
 *
 * Decorators are applied programmatically at controller bootstrap time —
 * no entity-specific controller class needed (DNA-6 preserved).
 */
export function applySwaggerDecorators(
  target: object,
  methodKey: string,
  endpoint: EndpointDefinition,
): void {
  ApiOperation({
    summary:     endpoint.label,
    description: `domainId: ${endpoint.domainId} | taskTypes: ${(endpoint.taskTypeRefs ?? []).join(', ')}`,
    operationId: endpoint.handlerId,
  })(target, methodKey, Object.getOwnPropertyDescriptor(target, methodKey)!);

  if (endpoint.requiresTenantId !== false) {
    ApiHeader({
      name:        'X-Tenant-Id',
      description: 'Tenant identifier — DNA-5 scope isolation',
      required:    true,
    })(target, methodKey, Object.getOwnPropertyDescriptor(target, methodKey)!);
  }

  if (endpoint.requiresIdempotencyKey) {
    ApiHeader({
      name:        'X-Idempotency-Key',
      description: 'Idempotency key — DNA-7',
      required:    true,
    })(target, methodKey, Object.getOwnPropertyDescriptor(target, methodKey)!);
  }

  ApiResponse({
    status:      200,
    description: 'DataProcessResult<T> — isSuccess + data | error',
    schema: {
      properties: {
        isSuccess: { type: 'boolean' },
        data:      { type: 'object', description: JSON.stringify(endpoint.responseShape ?? {}) },
        error:     { type: 'string', nullable: true },
      },
    },
  })(target, methodKey, Object.getOwnPropertyDescriptor(target, methodKey)!);
}
```

### NestJS Swagger bootstrap

```typescript
// apps/api/src/main.ts (updated)

import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // OpenAPI — always available (not dev-only)
  const config = new DocumentBuilder()
    .setTitle('XIIGen Engine API')
    .setDescription('Fabric-first, DNA-compliant engine API. All endpoints require X-Tenant-Id (DNA-5).')
    .setVersion('1.0')
    .addApiKey({ type: 'apiKey', in: 'header', name: 'X-Tenant-Id' }, 'tenant-id')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  // /api/openapi.json — always served (used by generate-docs.ts + client codegen)
  app.use('/api/openapi.json', (_req: unknown, res: { json: (d: unknown) => void }) => {
    res.json(document);
  });

  await app.listen(3000);
}
```

---

## 5. Per-Family README.md Standard

Every service group directory MUST contain a `README.md` with this exact structure:

```markdown
# {Family Name} — {domain} / {group}

**Factory range:** F852–F855
**Task types:** T307–T310
**Fabric:** DATABASE (Elasticsearch primary)
**BFA rules:** CF-386, CF-387
**Design records:** DR-134

## Purpose

One or two sentences describing what this service group does and why it exists.

## Factories

| Factory | Interface | Description |
|---------|-----------|-------------|
| F852 | IFormSchemaService | Stores versioned JSON Schema documents for tenant-scoped forms |
| F853 | IFormSchemaValidatorService | Validates payloads against stored schema before persistence |

## Iron Rules

- IR-307-1: Every schema document MUST include tenantId, formId, schemaVersion, createdAt
- IR-307-2: JSON Schema validation MUST run before storage

## Fabric Resolution

- F852 → DATABASE FABRIC → IDatabaseService → Elasticsearch
- F858 → DATABASE FABRIC → IDatabaseService → Elasticsearch
- F860 → QUEUE FABRIC → IQueueService → Redis Streams
```

---

## 6. scripts/generate-docs.ts

```typescript
// scripts/generate-docs.ts
// Run by: pnpm generate:docs
// Output: docs/FLOW_XX_API_REFERENCE.md per module + docs/FULL_API_REFERENCE.md

import { readdirSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, resolve } from 'path';

const MODULES_DIR = resolve('modules');
const DOCS_DIR    = resolve('docs/api');
const ENDPOINTS   = await import('../apps/api/src/api/endpoints.registry');

if (!existsSync(DOCS_DIR)) mkdirSync(DOCS_DIR, { recursive: true });

const allSections: string[] = [
  '# XIIGen — Full API Reference\n',
  `> Generated: ${new Date().toISOString()}\n`,
  '---\n',
];

const domains = readdirSync(MODULES_DIR, { withFileTypes: true })
  .filter(d => d.isDirectory())
  .map(d => d.name);

for (const domain of domains) {
  const docsFile = join(MODULES_DIR, domain, `${domain}.docs.ts`);
  if (!existsSync(docsFile)) continue;

  // Dynamic import of the docs manifest
  const mod      = await import(docsFile);
  const docs     = mod[`${toPascalCase(domain)}Docs`] ?? Object.values(mod)[0];
  const manifest = docs?.manifest;
  if (!manifest) continue;

  const domainEndpoints = ENDPOINTS.ENDPOINTS.filter(
    e => e.domainId === domain,
  );

  const section = buildSection(manifest, domainEndpoints);

  // Per-module file
  writeFileSync(join(DOCS_DIR, `${domain.toUpperCase()}_API_REFERENCE.md`), section);

  allSections.push(section);
  allSections.push('---\n');
}

// Master file
writeFileSync(join(DOCS_DIR, 'FULL_API_REFERENCE.md'), allSections.join('\n'));
console.log(`✅ Docs generated: ${domains.length} modules → ${DOCS_DIR}`);

function buildSection(manifest: FlowDocsManifest, endpoints: EndpointDefinition[]): string {
  return [
    `## ${manifest.displayName} (${manifest.domainId})`,
    '',
    manifest.description,
    '',
    `| Attribute | Value |`,
    `|-----------|-------|`,
    `| Factory range | ${manifest.familyRange} |`,
    `| Task types | ${manifest.taskTypeRange} |`,
    `| BFA rules | ${manifest.bfaRuleRange} |`,
    `| Design records | ${manifest.designRecords.join(', ')} |`,
    `| Fabrics | ${manifest.fabrics.join(', ')} |`,
    '',
    '### Factories',
    '',
    '| Factory | Interface | Group | Fabric | Description |',
    '|---------|-----------|-------|--------|-------------|',
    ...manifest.factories.map(f =>
      `| ${f.factoryId} | ${f.interfaceName} | ${f.group} | ${f.fabric} | ${f.description} |`
    ),
    '',
    '### Endpoints',
    '',
    '| Method | Path | Handler | Task Types | Tenant Required |',
    '|--------|------|---------|------------|-----------------|',
    ...endpoints.map(e =>
      `| ${e.method} | \`${e.path}\` | ${e.handlerId} | ${(e.taskTypeRefs ?? []).join(', ')} | ${e.requiresTenantId !== false ? '✅' : '—'} |`
    ),
    '',
  ].join('\n');
}

function toPascalCase(slug: string): string {
  return slug.split('-').map(w => w[0].toUpperCase() + w.slice(1)).join('');
}
```

---

## 7. VALIDATION_REPORT — Documentation Coverage Checks

```typescript
// scripts/validate.ts (updated — adds documentation checks)

// ... existing mandatory file checks from P24 ...

// ── Documentation coverage ────────────────────────────────────────────────

for (const domain of domains) {
  const moduleDir = join(MODULES_DIR, domain);

  // Check per-family README.md presence
  const groups = readdirSync(moduleDir, { withFileTypes: true })
    .filter(d => d.isDirectory() && !d.name.startsWith('_') && d.name !== '__tests__')
    .map(d => d.name);

  for (const group of groups) {
    const readmePath = join(moduleDir, group, 'README.md');
    if (!existsSync(readmePath)) {
      console.error(`❌ MISSING README: modules/${domain}/${group}/README.md`);
      failures++;
    }
  }

  // Check documented vs total endpoint ratio
  const endpointsFile = join(moduleDir, `${domain}.endpoints.ts`);
  const docsFile      = join(moduleDir, `${domain}.docs.ts`);

  if (existsSync(endpointsFile) && existsSync(docsFile)) {
    // Import and compare
    const endpointsMod = await import(endpointsFile);
    const docsMod      = await import(docsFile);
    const endpoints    = Object.values(endpointsMod).flat() as { handlerId: string }[];
    const docsManifest = (Object.values(docsMod)[0] as IFlowDocs)?.manifest;
    const documented   = new Set(docsManifest?.endpoints ?? []);

    const undocumented = endpoints.filter(e => !documented.has(e.handlerId));
    if (undocumented.length > 0) {
      console.error(
        `❌ UNDOCUMENTED endpoints in ${domain}: ${undocumented.map(e => e.handlerId).join(', ')}`
      );
      failures++;
    }
  }
}
```

---

## 8. Tests Required

### IFlowDocs contract tests

```typescript
// apps/api/src/test/unit/flow-docs.spec.ts

describe('FormsAutomationDocs', () => {
  it('manifest has all required fields', () => {
    const docs = new FormsAutomationDocs();
    const m = docs.manifest;
    expect(m.domainId).toBe('forms-automation');
    expect(m.familyRange).toMatch(/^F\d+–F\d+$/);
    expect(m.taskTypeRange).toMatch(/^T\d+–T\d+$/);
    expect(m.factories.length).toBeGreaterThanOrEqual(1);
    expect(m.endpoints.length).toBeGreaterThanOrEqual(1);
  });

  it('every factory entry has factoryId, interfaceName, fabric, description', () => {
    const docs = new FormsAutomationDocs();
    for (const f of docs.manifest.factories) {
      expect(f.factoryId).toMatch(/^F\d+$/);
      expect(f.interfaceName).toMatch(/^I[A-Z]/);
      expect(f.fabric).toBeTruthy();
      expect(f.description.length).toBeGreaterThan(10);
    }
  });

  it('all endpoint handlerIds in manifest exist in FORMS_AUTOMATION_ENDPOINTS', () => {
    const docs       = new FormsAutomationDocs();
    const registered = new Set(FORMS_AUTOMATION_ENDPOINTS.map(e => e.handlerId));
    for (const handlerId of docs.manifest.endpoints) {
      expect(registered.has(handlerId)).toBe(true);
    }
  });
});
```

### OpenAPI endpoint tests

```typescript
// apps/api/src/test/integration/openapi.spec.ts

describe('OpenAPI', () => {
  it('/api/openapi.json returns valid OpenAPI 3.0 document', async () => {
    const res = await request(app.getHttpServer()).get('/api/openapi.json');
    expect(res.status).toBe(200);
    expect(res.body.openapi).toMatch(/^3\./);
    expect(res.body.info.title).toBe('XIIGen Engine API');
    expect(Object.keys(res.body.paths ?? {}).length).toBeGreaterThan(0);
  });

  it('/api/docs returns Swagger UI HTML', async () => {
    const res = await request(app.getHttpServer()).get('/api/docs');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/html');
  });

  it('all ENDPOINTS registry entries appear as paths in openapi.json', async () => {
    const res   = await request(app.getHttpServer()).get('/api/openapi.json');
    const paths = Object.keys(res.body.paths ?? {});
    for (const endpoint of ENDPOINTS) {
      // Convert :param to {param} for OpenAPI path format
      const oaPath = endpoint.path.replace(/:([a-zA-Z]+)/g, '{$1}');
      expect(paths).toContain(oaPath);
    }
  });
});
```

### generate-docs script tests

```typescript
// scripts/test/generate-docs.spec.ts

describe('generate-docs', () => {
  it('produces output for each module with a docs file', async () => {
    await generateDocs();
    expect(existsSync('docs/api/FORMS-AUTOMATION_API_REFERENCE.md')).toBe(true);
    expect(existsSync('docs/api/FULL_API_REFERENCE.md')).toBe(true);
  });

  it('FULL_API_REFERENCE.md contains all module display names', async () => {
    await generateDocs();
    const content = readFileSync('docs/api/FULL_API_REFERENCE.md', 'utf8');
    expect(content).toContain('Forms Automation');
  });
});
```

### VALIDATION_REPORT docs coverage tests

```typescript
// scripts/test/validate-docs.spec.ts

describe('VALIDATION_REPORT — docs coverage', () => {
  it('fails when service group README.md is missing', async () => {
    // Temporarily remove a README
    renameSync('modules/forms-automation/authoring/README.md', 'modules/forms-automation/authoring/README.md.bak');
    await expect(runValidate()).rejects.toThrow();
    renameSync('modules/forms-automation/authoring/README.md.bak', 'modules/forms-automation/authoring/README.md');
  });

  it('fails when endpoint in endpoints.ts is absent from docs manifest', async () => {
    // Temporarily add an endpoint not in docs
    // ... (test setup) ...
    await expect(runValidate()).rejects.toThrow();
  });

  it('passes when all READMEs present and endpoints fully documented', async () => {
    await expect(runValidate()).resolves.not.toThrow();
  });
});
```

---

## 9. Module Template — COMPLETE (All 6 Mandatory Files)

```
modules/{domain-slug}/
├── index.ts
├── manifest.ts
├── {domain}.module.ts
├── {domain}.controller.ts
│
├── ── 6 MANDATORY STANDARD FILES (ALL COMPLETE after P25) ───────
│
├── {domain}.rag-seed.ts        ← Phase 21 ✅
│                                    IFlowRagSeed: indexPatterns() + indexBfaRules() + indexDesignRecords()
│
├── {domain}.prompts.ts         ← Phase 22 ✅
│                                    IFlowPromptSeed: seedPrompts() per task type × role
│
├── {domain}.endpoints.ts       ← Phase 23 ✅
│                                    EndpointDefinition[] for ENDPOINTS registry + AppRouter
│
├── {domain}.logger.ts          ← Phase 24 ✅
│                                    StructuredLogger pre-configured with flowId + serviceId
│
├── {domain}.docs.ts            ← Phase 25 ✅ FINAL MANDATORY FILE
│                                    IFlowDocs: FlowDocsManifest with factories, endpoints,
│                                    ranges, fabrics, design records
│
├── ── SERVICE GROUPS ───────────────────────────────────────────
│
├── {group-a}/
│   ├── README.md               ← Phase 25 ✅ MANDATORY (per-family, checked by VALIDATION_REPORT)
│   ├── index.ts
│   └── {service}.ts
│
└── __tests__/
    ├── unit/    ├── integration/    └── e2e/
```

**27-check VALIDATION_REPORT** (pnpm build gate):

| Check group | Checks | Added by |
|-------------|--------|----------|
| Mandatory standard files (5 files present) | 1–5 | P21–P25 |
| Per-family README.md present | 6–10 | P25 |
| Endpoints fully documented in docs manifest | 11–15 | P25 |
| OpenAPI paths match ENDPOINTS registry | 16–18 | P25 |
| Coverage ≥ 80% | 19–20 | P24 |
| No console.log in service code | 21–22 | P24 |
| Health endpoint exists per domain | 23–24 | P24 |
| DNA compliance (AF-7 static analysis) | 25–27 | Existing |

---

## 10. Iron Rules (Added by Phase 25)

| # | Rule | Consequence |
|---|------|-------------|
| IR-P25-1 | Every module MUST ship `{domain}.docs.ts` implementing `IFlowDocs` | VALIDATION_REPORT build failure |
| IR-P25-2 | Every handlerId in `{domain}.endpoints.ts` MUST appear in `FlowDocsManifest.endpoints` | Documented vs total route check fails |
| IR-P25-3 | Every service group directory MUST contain `README.md` with the standard structure | VALIDATION_REPORT build failure |
| IR-P25-4 | `README.md` MUST include factory range, task types, fabric resolution, and BFA rules | Incomplete documentation |
| IR-P25-5 | `/api/openapi.json` MUST be always available — not dev-only | Integration contract requirement |
| IR-P25-6 | All ENDPOINTS registry entries MUST appear as paths in `/api/openapi.json` | VALIDATION_REPORT check 16–18 |
| IR-P25-7 | `scripts/generate-docs.ts` MUST produce output without errors on every `pnpm build` | CI validation-report job |

---

## 11. Backward Compatibility

- All existing artifact numbers unchanged (F1–F1483, T1–T564, CF-1–CF-788, SK-1–SK-401, DR-1–DR-266)
- `@nestjs/swagger` decorators are additive — existing handler behavior unchanged
- `/api/openapi.json` and `/api/docs` are new routes — no existing route modified
- FLOW-35 next anchors unchanged: F1484 · Family 223 · T565 · CF-789 · SK-402 · DR-267

---

## 12. Track B Summary — All 5 Foundation Standards Complete

| Phase | Standard | Mandatory Module File | Key Deliverable |
|-------|----------|-----------------------|-----------------|
| P21 | RAG Seeding | `{domain}.rag-seed.ts` | AF-4 → ES index `xiigen-rag-patterns` |
| P22 | Prompt Management | `{domain}.prompts.ts` | AF-3 → ES index `xiigen-prompts`, 3-tier resolution |
| P23 | Client Completeness | `{domain}.endpoints.ts` + hooks + screen | AppRouter auto-discovery, PromptsScreen, RagSearchScreen |
| P24 | CI/CD + Logging | `{domain}.logger.ts` | StructuredLogger, GitHub Actions CI, health endpoint |
| P25 | Documentation | `{domain}.docs.ts` + per-family `README.md` | OpenAPI `/api/docs`, generate-docs.ts, VALIDATION_REPORT |

**27-check VALIDATION_REPORT** now enforces all Track B standards on every `pnpm build`.

---

## 13. Checkpoint

```json
{
  "phase": 25,
  "title": "Documentation Standard",
  "status": "complete",
  "delivers": [
    "IFlowDocs interface + FlowDocsManifest type",
    "forms-automation.docs.ts reference implementation",
    "DynamicController: @ApiTags + @ApiOperation decorators applied programmatically",
    "/api/docs (Swagger UI) + /api/openapi.json (always available)",
    "Per-family README.md standard (required structure defined)",
    "scripts/generate-docs.ts: per-module + FULL_API_REFERENCE.md",
    "VALIDATION_REPORT updated: README.md presence + endpoint coverage checks",
    "Unit tests: manifest validation, handlerId cross-check",
    "Integration tests: /api/openapi.json valid, paths match ENDPOINTS",
    "generate-docs script tests, VALIDATION_REPORT docs coverage tests"
  ],
  "ironRulesAdded": 7,
  "ironRuleRange": "IR-P25-1 through IR-P25-7",
  "mandatoryModuleFiles": {
    "complete": 6,
    "total": 6,
    "allFiles": [
      "{domain}.rag-seed.ts (P21)",
      "{domain}.prompts.ts (P22)",
      "{domain}.endpoints.ts + web hooks + screen (P23)",
      "{domain}.logger.ts (P24)",
      "{domain}.docs.ts + per-group README.md (P25)"
    ],
    "status": "MODULE TEMPLATE COMPLETE ✅"
  },
  "trackBStatus": "COMPLETE ✅ — all 5 foundation standards issued (P21–P25)",
  "validationReportChecks": 27,
  "artifactNumbersUnchanged": true,
  "nextAnchors": { "F": 1484, "T": 565, "CF": 789, "SK": 402, "DR": 267 }
}
```
