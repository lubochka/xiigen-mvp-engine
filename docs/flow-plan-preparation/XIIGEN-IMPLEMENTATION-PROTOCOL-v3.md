# XIIGEN — IMPLEMENTATION PROTOCOL v3.0
## For: Claude Code (claude/crazy-shannon → Skills_Creation_Claude)
## Date: 2026-04-05 | Supersedes: v2.0
## Changes from v2.0:
##   - AI_PROVIDER env var removed entirely — pool is the provider, no global singleton
##   - API keys removed from .env — only BOOTSTRAP_* (one-time) + ENCRYPTION_SECRET
##   - MT Foundation kernel (P26) = Phase A-0, must complete before FLOW-08
##   - Full test matrix (unit + logic/E2E + UI) mandatory for every component, no exceptions
##   - Live tests use all 3 providers via pool rotation, not Anthropic-only

---

## ABSOLUTE RULES

```
1.  Work on crazy-shannon only. Merge to Skills_Creation_Claude after full DoD.
2.  tsc --noEmit = 0 errors before any test run.
3.  failures === 0 before every ⛔ STOP.
4.  .env has NO provider API keys after bootstrap.
    TENANT_KEY_ENCRYPTION_SECRET is the only key that stays permanently.
    BOOTSTRAP_* keys deleted from .env after first startup confirms pool populated.
5.  AI_PROVIDER env var does not exist. Pool is the provider. No global singleton.
    grep -q "AI_PROVIDER" .env && echo "🔴 STOP: remove it" — must return nothing.
6.  No model names, API keys, or tenantIds hardcoded anywhere in source.
7.  DNA-8: storeDocument BEFORE every enqueue/emit. Call-order test required.
8.  DNA-5: tenantId from TenantContextMiddleware → ALS. Never as method parameter.
9.  DNA-3: every handler returns DataProcessResult<T>. Never throws.
10. EVERY component requires all three test tiers. No exceptions.
    Unit tests alone = not done.
    Logic/E2E tests alone = not done.
    Missing UI tests = not done.
11. Every learning index record MUST include scope tags: knowledgeScope, ownerId, moduleId.
    Default knowledgeScope=PRIVATE for tenant records. Platform flows: knowledgeScope=MODULE, ownerId=platform.
    grep -rn "storeDocument.*xiigen-rag-patterns\|storeDocument.*xiigen-calibration\|storeDocument.*xiigen-oss" — each must write knowledgeScope.
12. Every phase completion requires a ModuleSnapshot with all 5 data types:
    xiigen-rag-patterns (Class A) + xiigen-calibration-baseline + xiigen-oss-curriculum-runs
    + xiigen-decision-graph (Class B) + xiigen-prompts (Class C).
    A snapshot missing any of these 5 will fail the FreshTenantTestService parity check.
    Parity < 0.90 in DEV mode = PORTABILITY_GAP carry-forward. Parity < 0.95 in LIVE mode = BLOCKING.
```

---

## 1. LOCAL ENVIRONMENT

### Paths
```
Project root:   C:\Projects\xiigen mvp\.claude\worktrees\crazy-shannon\
Kernel:         [PROJECT_ROOT]\packages\kernel\src\mt\
Server:         [PROJECT_ROOT]\server\
Client:         [PROJECT_ROOT]\client\
Phase reports:  [PROJECT_ROOT]\docs\phase-reports\
Fixtures:       [PROJECT_ROOT]\server\fixtures\indices\
.env:           [PROJECT_ROOT]\server\.env   (gitignored — never commit)
```

### Corrected .env — no AI_PROVIDER, no provider keys

```bash
# ═══════════════════════════════════════════════════════
# .env — infrastructure config only. Zero provider keys.
# AI_PROVIDER does not exist. Pool resolves all providers.
# ═══════════════════════════════════════════════════════

NODE_ENV=development
PORT=3000
DATABASE_PROVIDER=in_memory
QUEUE_PROVIDER=in_memory
ELASTICSEARCH_URL=http://localhost:9200

# ── Only key that stays permanently ────────────────────
# Encrypts all provider keys at rest in xiigen-byok-keys.
TENANT_KEY_ENCRYPTION_SECRET=<base64-32-bytes>

# ── Bootstrap seed — read ONCE, then delete these lines ─
# Seeder reads these, encrypts each, writes into
# xiigen-byok-keys as providers[] for 'default' tenant.
# DELETE these lines after confirming default tenant pool exists.
BOOTSTRAP_ANTHROPIC_KEY=sk-ant-...
BOOTSTRAP_OPENAI_KEY=sk-...
BOOTSTRAP_GEMINI_KEY=AIza...
BOOTSTRAP_PINECONE_KEY=...

# ── Non-secret config ───────────────────────────────────
OLLAMA_BASE_URL=http://localhost:11434
OSS_MODELS=llama3:8b,codellama:13b,deepseek-coder:6.7b
OSS_CURRICULUM_CYCLES=10
CALIBRATION_TENANT=calibration-default
DEFAULT_TENANT_ID=default
```

### Why AI_PROVIDER is removed

```
WRONG (v2.0):
  AI_PROVIDER=anthropic → global singleton → all tenants get Claude only
  Live test: only Claude runs, GPT-4 and Gemini are never called

CORRECT (v3.0):
  No AI_PROVIDER env var exists
  Request arrives with X-Tenant-Id: default
  → ITenantProviderPoolFabric.getPool('default')
  → pool = [{anthropic}, {openai}, {gemini}]  (from byok-keys)
  → SK-523 assigns: generatorA=claude, generatorB=gpt-4o, generatorC=gemini
  → all three run in parallel, blind judge picks winner
  → live test exercises all three providers at every station
```

### What happens when only 1 BOOTSTRAP_* key is set

```
pool = [{ type: 'anthropic' }]  (one-provider pool)
SK-523: generatorA=anthropic, generatorB=null, generatorC=null
2-model fallback activates (tested in cycles-chain.e2e.spec.ts)
DPO triple → PENDING_COMPARISON (V9-002 cannot be satisfied)
           → xiigen-training-data-pending (NOT main training index)
Startup log: "⚠️ Single-provider pool for 'default' tenant.
              Add BOOTSTRAP_OPENAI_KEY and BOOTSTRAP_GEMINI_KEY."
```

### Session start commands (run every session)

```bash
cd "C:\Projects\xiigen mvp\.claude\worktrees\crazy-shannon\server"
git branch --show-current                              # → crazy-shannon
git ls-files --error-unmatch .env 2>&1 | grep -q "did not match" \
  && echo "✅ .env not tracked" || echo "🔴 STOP: .env is tracked"
grep -q "AI_PROVIDER" .env 2>/dev/null \
  && echo "🔴 STOP: remove AI_PROVIDER from .env" || echo "✅ no AI_PROVIDER"
grep -qE "ANTHROPIC_API_KEY|OPENAI_API_KEY|GEMINI_API_KEY" .env 2>/dev/null \
  && echo "🔴 STOP: rename *_API_KEY to BOOTSTRAP_*" || echo "✅ no raw API keys"
npx tsc --noEmit 2>&1 | tail -3                        # → 0 errors
npx jest --passWithNoTests 2>&1 | tail -5              # → 0 failures
```

---

## 2. TEST COVERAGE — THREE TIERS, NO EXCEPTIONS

### Rule

```
Every component gets all three tiers before it is considered done.
"Logic test" is NOT the same as unit test. Both are required.
"UI test" means React Testing Library + Playwright snapshot. Both are required.

Tier 1 — Unit test (same directory as implementation)
  Mock ALL external deps. Test pure logic, DNA compliance, call order, edge cases.
  Run: npx jest [file].spec.ts --verbose

Tier 2 — Logic test / E2E (server/test/e2e/[feature]/)
  makeInMemoryDb() + makeInMemoryQueue(). No real HTTP. No real ES. No real Redis.
  Tests: full handler chains, tenant isolation, cascade behavior, cross-component integration.
  Run: npx jest [feature].e2e.spec.ts --verbose --runInBand

Tier 3 — UI test
  RTL (client/src/components/[C]/[C].spec.tsx): mock fetch, all states
  Playwright (client/e2e/snapshot-phase-X.spec.ts): screenshot → UX analysis
  Run: cd client && npx jest [C].spec.tsx --verbose
       cd client && npx playwright test snapshot-phase-X.spec.ts
```

### Minimum counts per component type

| Component | Unit | Logic/E2E | UI (RTL) | Playwright |
|-----------|------|-----------|---------|-----------|
| Kernel class | 5+ | 3+ | N/A | N/A |
| Fabric interface + service | 6+ | 4+ | N/A | N/A |
| NestJS handler | 8+ | 5+ | N/A | N/A |
| NestJS controller | 4+ | 4+ | N/A | N/A |
| React component | N/A | N/A | 5+ | 1 snapshot |
| Full feature | per file | 6+ | 5+ | 1+ snapshots |

---

## 3. TEST TEMPLATES

### Unit test template

```typescript
// [service].spec.ts — same directory as implementation
import 'reflect-metadata';
import { DataProcessResult } from '../kernel/data-process-result';
import { MyService } from './my.service';

const mockDb = {
  storeDocument:   jest.fn().mockResolvedValue(DataProcessResult.success({})),
  searchDocuments: jest.fn().mockResolvedValue(DataProcessResult.success([])),
  getDocument:     jest.fn().mockResolvedValue(DataProcessResult.failure('NOT_FOUND', '')),
};
const mockQueue = { enqueue: jest.fn().mockResolvedValue(DataProcessResult.success({})) };
const mockAls   = { get: jest.fn().mockReturnValue('tenant-unit') };

beforeEach(() => jest.clearAllMocks());

describe('MyService', () => {
  // ── POSITIVE ─────────────────────────────────────────────────────────
  it('happy path: returns DataProcessResult.success with expected shape', async () => { ... });

  it('DNA-8: storeDocument called BEFORE enqueue — verified by call order', async () => {
    const order: string[] = [];
    mockDb.storeDocument.mockImplementationOnce(async () => {
      order.push('store'); return DataProcessResult.success({});
    });
    mockQueue.enqueue.mockImplementationOnce(async () => {
      order.push('enqueue'); return DataProcessResult.success({});
    });
    await new MyService(mockDb as any, mockQueue as any, mockAls as any).handle(ctx);
    expect(order).toEqual(['store', 'enqueue']);
  });

  it('DNA-5: tenantId read from ALS — not received as parameter', async () => {
    await new MyService(mockDb as any, mockQueue as any, mockAls as any).handle(ctx);
    expect(mockAls.get).toHaveBeenCalledWith('tenantId');
    // fabric call must NOT receive tenantId as positional argument
    const firstArg = mockDb.storeDocument.mock.calls[0]?.[1] as Record<string,unknown>;
    expect(firstArg?.['tenantId']).toBeUndefined();
  });

  // ── NEGATIVE ─────────────────────────────────────────────────────────
  it('DNA-3: returns failure — never throws — when db.storeDocument fails', async () => {
    mockDb.storeDocument.mockResolvedValueOnce(
      DataProcessResult.failure('DB_FAIL', 'Connection refused')
    );
    const result = await new MyService(mockDb as any, mockQueue as any, mockAls as any).handle(ctx);
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBeDefined();
    // this line executing proves no throw
  });

  it('returns TENANT_NOT_FOUND when pool has no entry for tenantId', async () => { ... });
  it('returns QUOTA_EXCEEDED before any AI call when quota is exhausted', async () => { ... });
});
```

### Logic/E2E test template

```typescript
// [feature].e2e.spec.ts — server/test/e2e/[feature]/
import 'reflect-metadata';
import { DataProcessResult } from '../../../src/kernel/data-process-result';

function makeInMemoryDb() {
  const store = new Map<string, Record<string, unknown>[]>();
  return {
    storeDocument: jest.fn(async (index: string, doc: Record<string,unknown>, id: string) => {
      const b = store.get(index) ?? [];
      const i = b.findIndex(d => d['id'] === id);
      if (i >= 0) b[i] = { ...doc, id }; else b.push({ ...doc, id });
      store.set(index, b);
      return DataProcessResult.success({ ...doc, id });
    }),
    searchDocuments: jest.fn(async (index: string, filter: Record<string,unknown>) => {
      const results = (store.get(index) ?? []).filter(doc =>
        Object.entries(filter).every(([k, v]) => v == null || doc[k] === v));
      return DataProcessResult.success(results);
    }),
    getDocument: jest.fn(async (index: string, id: string) => {
      const doc = (store.get(index) ?? []).find(d => d['id'] === id);
      return doc
        ? DataProcessResult.success(doc)
        : DataProcessResult.failure('NOT_FOUND', `${id} not in ${index}`);
    }),
    _store: store,
  };
}

function makeInMemoryQueue() {
  const emitted: Array<{ queue: string; payload: Record<string,unknown> }> = [];
  return {
    enqueue: jest.fn(async (queue: string, payload: Record<string,unknown>) => {
      emitted.push({ queue, payload });
      return DataProcessResult.success({ messageId: `m-${Date.now()}` });
    }),
    _emitted: emitted,
  };
}

describe('[Feature] — Logic/E2E', () => {

  // ── POSITIVE ─────────────────────────────────────────────────────────
  it('full flow: tenant provisions → gets pool → runs cycle chain', async () => { ... });

  it('DNA-8: store before emit — index write precedes queue entry', async () => {
    const db = makeInMemoryDb(); const queue = makeInMemoryQueue();
    const order: string[] = [];
    (db.storeDocument as jest.Mock).mockImplementationOnce(async (...a: any[]) => {
      order.push('store:' + a[0]); return DataProcessResult.success({});
    });
    (queue.enqueue as jest.Mock).mockImplementationOnce(async (q: string) => {
      order.push('emit:' + q); return DataProcessResult.success({ messageId: 'x' });
    });
    // ... exercise feature ...
    const si = order.findIndex(c => c.startsWith('store:'));
    const ei = order.findIndex(c => c.startsWith('emit:'));
    expect(si).toBeGreaterThanOrEqual(0);
    expect(ei).toBeGreaterThan(si);
  });

  it('tenant isolation: tenant-A data invisible to tenant-B queries', async () => {
    const db = makeInMemoryDb();
    // populate both tenants, query as A, assert no B records returned
    const records = db._store.get('xiigen-byok-keys') ?? [];
    expect(records.filter(r => r['tenantId'] === 'tenant-a')
                   .every(r => r['tenantId'] === 'tenant-a')).toBe(true);
    expect(records.filter(r => r['tenantId'] === 'tenant-a')
                   .some(r => r['tenantId'] === 'tenant-b')).toBe(false);
  });

  it('idempotency (DNA-7): same operation twice produces one record', async () => { ... });

  // ── NEGATIVE ─────────────────────────────────────────────────────────
  it('DNA-3: cascade db failure returns DataProcessResult.failure at every step', async () => { ... });
  it('single-provider pool: DPO triple goes to pending index, not main training index', async () => { ... });
  it('no BOOTSTRAP_* keys: seeder is no-op, returns failure gracefully', async () => { ... });
  it('provider key never appears in any stored document', async () => {
    const db = makeInMemoryDb();
    // run provisioning with key='sk-test-key'
    const allDocs = [...db._store.values()].flat();
    const serialized = JSON.stringify(allDocs);
    expect(serialized).not.toContain('sk-test-key');   // encrypted — never plaintext
  });
});
```

### UI test template (React Testing Library)

```typescript
// [Component].spec.tsx — same directory as component
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MyComponent } from './MyComponent';

global.fetch = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  (global.fetch as jest.Mock).mockResolvedValue({
    ok: true,
    json: async () => ({
      tenantId: 'test',
      providers: [{ type: 'anthropic' }, { type: 'openai' }, { type: 'gemini' }],
      grade: 0.91,
      winningModel: 'claude-sonnet-4-6',
    }),
  });
});

describe('MyComponent', () => {

  // ── LOADING STATE ──────────────────────────────────────────────────
  it('shows loading spinner while request is pending', async () => {
    let resolve: (v: any) => void;
    (global.fetch as jest.Mock).mockReturnValueOnce(new Promise(r => { resolve = r; }));
    render(<MyComponent />);
    expect(screen.getByTestId('loading-state')).toBeInTheDocument();
    resolve!({ ok: true, json: async () => ({}) });
  });

  it('disables submit button while request is in-flight', async () => {
    let resolve: (v: any) => void;
    (global.fetch as jest.Mock).mockReturnValueOnce(new Promise(r => { resolve = r; }));
    render(<MyComponent />);
    fireEvent.click(screen.getByRole('button', { name: /submit|run|provision/i }));
    expect(screen.getByRole('button', { name: /submit|run|provision/i })).toBeDisabled();
    resolve!({ ok: true, json: async () => ({}) });
  });

  // ── ERROR STATE ────────────────────────────────────────────────────
  it('shows specific error message — not generic "Error"', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'TENANT_EXISTS', message: 'Tenant already exists' }),
    });
    render(<MyComponent />);
    fireEvent.click(screen.getByRole('button', { name: /provision/i }));
    await waitFor(() => {
      expect(screen.getByTestId('error-state')).toHaveTextContent(/already exists/i);
      expect(screen.getByTestId('error-state')).not.toHaveTextContent(/^error$/i);
    });
  });

  // ── EMPTY STATE ────────────────────────────────────────────────────
  it('shows non-blank empty state with call-to-action', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true, json: async () => ({ providers: [] }),
    });
    render(<MyComponent />);
    await waitFor(() => {
      expect(screen.getByTestId('empty-state')).toBeInTheDocument();
      expect(screen.getByTestId('empty-state').textContent?.length).toBeGreaterThan(0);
    });
  });

  // ── SUCCESS STATE ──────────────────────────────────────────────────
  it('shows grade, winning model, and all 3 provider badges', async () => {
    render(<MyComponent />);
    await waitFor(() => {
      expect(screen.getByTestId('grade-display')).toHaveTextContent('0.91');
      expect(screen.getByTestId('model-display')).toHaveTextContent('claude-sonnet-4-6');
      expect(screen.getByTestId('provider-badge-anthropic')).toBeInTheDocument();
      expect(screen.getByTestId('provider-badge-openai')).toBeInTheDocument();
      expect(screen.getByTestId('provider-badge-gemini')).toBeInTheDocument();
    });
  });

  it('provider key values NEVER appear in UI', async () => {
    render(<MyComponent />);
    await waitFor(() => screen.getByTestId('provider-pool'));
    const rendered = document.body.innerHTML;
    expect(rendered).not.toMatch(/sk-ant|sk-[a-z]/);
    expect(rendered).not.toContain('AIza');
    expect(rendered).not.toContain('encryptedKey');
  });

  // ── VALIDATION ─────────────────────────────────────────────────────
  it('shows validation error without API call when required field is empty', async () => {
    render(<MyComponent />);
    fireEvent.click(screen.getByRole('button', { name: /submit|run/i }));
    expect(screen.getByTestId('validation-error')).toBeInTheDocument();
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
```

### UI test template (Playwright snapshot)

```typescript
// client/e2e/snapshot-phase-X.spec.ts
import { test } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

const PHASE = 'PHASE-X';
const DIR = path.join(__dirname, '../../docs/phase-reports', PHASE, 'snapshots');
test.beforeAll(() => fs.mkdirSync(DIR, { recursive: true }));

test('[Component] — empty state', async ({ page }) => {
  await page.goto('http://localhost:5173/[route]');
  await page.waitForSelector('[data-testid="[component]"]', { timeout: 5000 });
  await page.screenshot({ path: `${DIR}/[component]-empty.png`, fullPage: true });
});

test('[Component] — live run with all 3 providers', async ({ page }) => {
  // Pre-provision tenant via API (server must be running)
  await fetch('http://localhost:3000/api/tenant/provision', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Tenant-Id': 'bootstrap' },
    body: JSON.stringify({
      tenantId: 'ui-snapshot-tenant',
      providers: [
        { id: 'p1', type: 'anthropic', key: process.env['BOOTSTRAP_ANTHROPIC_KEY'], availableModels: ['claude-sonnet-4-6'] },
        { id: 'p2', type: 'openai',    key: process.env['BOOTSTRAP_OPENAI_KEY'],    availableModels: ['gpt-4o'] },
        { id: 'p3', type: 'gemini',    key: process.env['BOOTSTRAP_GEMINI_KEY'],    availableModels: ['gemini-2.0-flash'] },
      ],
    }),
  });
  await page.goto('http://localhost:5173/[route]?tenantId=ui-snapshot-tenant');
  await page.waitForSelector('[data-testid="success-state"]', { timeout: 30000 });
  await page.screenshot({ path: `${DIR}/[component]-success.png`, fullPage: true });
});
```

### Required data-testid attributes on every new component

```typescript
<div data-testid="[component-name]">           {/* root wrapper */}
  <div data-testid="loading-state" />          {/* visible ONLY during load */}
  <div data-testid="error-state" />            {/* visible ONLY on error — must contain message */}
  <div data-testid="empty-state" />            {/* visible ONLY with no data */}
  <div data-testid="grade-display" />          {/* if component shows a grade */}
  <div data-testid="model-display" />          {/* if component shows a model name */}
  <div data-testid="provider-pool" />          {/* if component shows provider pool */}
  <div data-testid="provider-badge-anthropic" />{/* one per provider type */}
  <div data-testid="provider-badge-openai" />
  <div data-testid="provider-badge-gemini" />
  <div data-testid="validation-error" />       {/* if component has a form */}
```

### Claude UX analysis — 7 questions (answer for every Playwright screenshot)

```
Q1. Loading state: visible feedback while data loads?
    GOOD: spinner, skeleton, progress bar    BAD: blank screen, no feedback

Q2. Error state: if API call fails, what does user see?
    GOOD: message describing what failed + what to do    BAD: "Error", silent failure

Q3. Empty state: what does user see with no data?
    GOOD: helpful message + call-to-action    BAD: empty table, blank space

Q4. Data visible: can Luba verify the engine ran correctly?
    GOOD: grade shown, model name shown, all 3 providers shown, visibility record visible
    BAD: just "Success", no actual data, important info hidden

Q5. Action clarity: is it obvious what to do next?
    GOOD: primary action prominent    BAD: multiple equally-prominent buttons

Q6. Phase completeness: does UI cover all functionality added in this phase?
    GOOD: tenant panel, provider pool, rotation count, calibration dashboard all visible
    BAD: some phase features not reachable in UI

Q7. Security: are any key values visible?
    GOOD: only type badges (anthropic/openai/gemini) visible, no key strings
    BAD: sk-ant... or AIza... appears anywhere on screen
    → Q7 failure = security regression, blocks merge regardless of other results
```

---

## 4. PHASE SEQUENCE

```
Phase A-0 → Phase A → Phase B → Phase 0 → Phase C → Phase D → Phase E

Phase A-0: MT Foundation kernel (P26) — 7 kernel fixes, no new features
Phase A:   Tenant Foundation (FLOW-08 Layer A+B) — registry, byok-keys, pool fabric
Phase B:   Provider Pool + SK-523 Phase 0 — pool replaces singleton, rotation
Phase 0:   Calibration Bootstrap — model-specific prompts, 1-run benchmark, OSS curriculum
Phase C:   FLOW-26 Self-Development Loop — gap detection, contract generation
Phase D:   FLOW-30 PromptOps skeleton — prompt versioning, canary pipeline
Phase E:   BUG-002 fix + full integration test
```

---

## 5. PHASE A-0 — MT FOUNDATION KERNEL

Must complete before Phase A. Creates the kernel infrastructure that everything depends on.

### Files

```
packages/kernel/src/mt/
  tenant-key-generator.ts + .spec.ts        FIX 1+2: namespaced docIds + idempotency keys
  scope-enforcer.ts + .spec.ts              FIX 3: enforceScope → DataProcessResult, never throws
  tenant-registry.interface.ts              FIX 4: ITenantRegistry as Component 20
  quota-enforcer.ts + .spec.ts              FIX 5: guardQuota before every AI call
  idempotency-store.interface.ts
  idempotency-store.service.ts + .spec.ts   FIX 2 implementation: Redis-backed
  tenant-context.middleware.ts + .spec.ts   FIX 6: 403 on missing/suspended tenant
  freedom-config-manager.ts + .spec.ts      FIX 7: 3-tier ES-backed config resolution

server/src/bootstrap/phases/
  mt-context.phase.ts + .spec.ts            Bootstrap Phase 9

server/src/bootstrap/
  bootstrap-seeder.service.ts + .spec.ts    BOOTSTRAP_* → byok-keys (one-time, idempotent)

server/fixtures/indices/
  xiigen-config.json                        FreedomConfigManager ES backing index
  xiigen-byok-keys.json                     updated: providers[], encryptedKey field
  xiigen-idempotency.json                   IIdempotencyStore backing index
```

### Unit tests

```typescript
describe('TenantKeyGenerator', () => {
  it('generateDocId always starts with tenantId::', () => {
    expect(TenantKeyGenerator.generateDocId('acme').startsWith('acme::')).toBe(true);
  });
  it('generateDocId with hint: acme::hint::uuid', () => {
    expect(TenantKeyGenerator.generateDocId('acme', 'form-1').startsWith('acme::form-1::')).toBe(true);
  });
  it('generateIdempotencyKey: same tenant same payload → same key (deterministic)', () => {
    const k1 = TenantKeyGenerator.generateIdempotencyKey('acme', 'op', { a: 1 });
    const k2 = TenantKeyGenerator.generateIdempotencyKey('acme', 'op', { a: 1 });
    expect(k1).toBe(k2);
  });
  it('generateIdempotencyKey: different tenants same payload → different keys', () => {
    const k1 = TenantKeyGenerator.generateIdempotencyKey('acme', 'op', { a: 1 });
    const k2 = TenantKeyGenerator.generateIdempotencyKey('corp', 'op', { a: 1 });
    expect(k1).not.toBe(k2);
    expect(k1.startsWith('acme::')).toBe(true);
    expect(k2.startsWith('corp::')).toBe(true);
  });
  it('generateIdempotencyKey: same tenant different payload → different keys', () => {
    const k1 = TenantKeyGenerator.generateIdempotencyKey('acme', 'op', { a: 1 });
    const k2 = TenantKeyGenerator.generateIdempotencyKey('acme', 'op', { a: 2 });
    expect(k1).not.toBe(k2);
  });
});

describe('ScopeEnforcer', () => {
  it('returns success when tenantIds match', () => {
    expect(ScopeEnforcer.enforceScope('acme', 'acme', 'doc-1').isSuccess).toBe(true);
  });
  it('DNA-3: never throws on mismatch', () => {
    expect(() => ScopeEnforcer.enforceScope('acme', 'corp', 'doc-1')).not.toThrow();
  });
  it('returns SCOPE_VIOLATION failure on mismatch', () => {
    const r = ScopeEnforcer.enforceScope('acme', 'corp', 'doc-1');
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('SCOPE_VIOLATION');
  });
  it('error message contains both tenantIds for debuggability', () => {
    const r = ScopeEnforcer.enforceScope('acme', 'corp', 'doc-1');
    expect(r.errorMessage).toContain('acme');
    expect(r.errorMessage).toContain('corp');
  });
});

describe('FreedomConfigManager', () => {
  it('tier 1: returns tenant-specific override when exists', async () => { ... });
  it('tier 2: falls back to global default when no tenant entry', async () => { ... });
  it('tier 3: returns hardcoded fallback when no ES record exists', async () => { ... });
  it('DNA-3: returns failure — never throws — when db is unavailable', async () => { ... });
  it('set: stores document with correct tenantId and configKey', async () => { ... });
});

describe('BootstrapSeeder', () => {
  it('reads all 3 BOOTSTRAP_* keys and writes 3-provider pool to byok-keys', async () => { ... });
  it('idempotent: running twice creates 1 byok-keys entry, not 2', async () => { ... });
  it('encryption: stored encryptedKey is NOT the plaintext BOOTSTRAP_* value', async () => {
    process.env['BOOTSTRAP_ANTHROPIC_KEY'] = 'sk-ant-plaintext';
    await seeder.run();
    const records = db._store.get('xiigen-byok-keys') ?? [];
    expect(records[0]!['providers']).toBeDefined();
    const stored = (records[0]!['providers'] as any[])[0];
    expect(stored['encryptedKey']).not.toBe('sk-ant-plaintext');
  });
  it('no BOOTSTRAP_* keys: seeder is no-op, logs warning, DNA-3 compliant', async () => { ... });
  it('single key set: 1-provider pool created, single-provider warning logged', async () => { ... });
  it('DNA-8: byok-keys written BEFORE BootstrapCompleted event', async () => { ... });
});
```

### Logic/E2E tests

```typescript
describe('MT Foundation — logic/E2E', () => {
  it('TenantContextMiddleware: 403 MISSING_TENANT_ID when header absent', async () => { ... });
  it('TenantContextMiddleware: 403 TENANT_NOT_FOUND for unknown tenant', async () => { ... });
  it('TenantContextMiddleware: 403 TENANT_SUSPENDED for suspended tenant', async () => { ... });
  it('TenantContextMiddleware: passes through for active tenant', async () => { ... });
  it('TenantContextMiddleware: engine paths bypass middleware', async () => { ... });
  it('MT isolation: same payload → different docIds with correct tenant prefixes', async () => {
    const id1 = TenantKeyGenerator.generateDocId('acme');
    const id2 = TenantKeyGenerator.generateDocId('corp');
    expect(id1.startsWith('acme::')).toBe(true);
    expect(id2.startsWith('corp::')).toBe(true);
    expect(id1).not.toBe(id2);
  });
  it('MT isolation: tenant-A cannot retrieve tenant-B documents', async () => { ... });
  it('quota: QUOTA_EXCEEDED failure returned before any AI call', async () => { ... });
  it('bootstrap seeder: after seeder, getPool(default) returns 3 providers', async () => { ... });
  it('bootstrap seeder: no BOOTSTRAP_* value appears in any stored field (encrypted)', async () => { ... });
});
```

### UI tests

```typescript
describe('TenantStatusBar', () => {
  it('shows loading while fetching tenant status', async () => { ... });
  it('shows tenant ID and "3 providers" badge when fully provisioned', async () => { ... });
  it('shows "⚠️ 1 provider" warning badge when pool has single provider', async () => { ... });
  it('shows SUSPENDED badge when tenant is suspended', async () => { ... });
  it('never shows any key value in the status bar', async () => {
    render(<TenantStatusBar tenantId="test" />);
    await waitFor(() => screen.getByTestId('tenant-status-bar'));
    expect(document.body.innerHTML).not.toMatch(/sk-ant|sk-[a-z]|AIza/);
  });
});
```

### Phase A-0 definition of done

```
□ TenantKeyGenerator: 5 unit tests pass
□ ScopeEnforcer: 4 unit tests pass (DNA-3 never-throw confirmed)
□ FreedomConfigManager: 5 unit tests pass (3-tier resolution)
□ BootstrapSeeder: 7 unit tests pass (encryption + idempotency + single-key)
□ MT Foundation logic/E2E: 10 tests pass
□ TenantContextMiddleware logic: 5 tests pass (403s + engine bypass)
□ TenantStatusBar UI: 5 tests pass (provider count visible, no keys visible)
□ Playwright: TenantStatusBar snapshot saved in PHASE-A0/snapshots/
□ grep -rn "AI_PROVIDER" server/src/ = 0 hits
□ grep -rn "process.env\[.ANTHROPIC" server/src/ | grep -v bootstrap-seeder = 0 hits
□ tsc --noEmit: 0 errors
□ Full suite: 0 new failures
□ PHASE-A0-REPORT.md created
```

---

## 6. PHASE A — TENANT FOUNDATION (FLOW-08 Layer A + B + C)

Depends on Phase A-0 fully complete.

### Files

```
server/src/tenant/
  tenant-registry.service.ts + .spec.ts      ITenantRegistry implementation
  tenant-registry.controller.ts + .spec.ts   POST /api/tenant/provision
                                              POST /api/tenant/deprovision
                                              GET  /api/tenant/:id
                                              GET  /api/tenant/:id/pool  (no raw keys)

server/src/fabrics/interfaces/
  tenant-provider-pool.fabric.interface.ts   ITenantProviderPoolFabric
  byok-key-store.interface.ts                IByokKeyStore

server/src/fabrics/
  tenant-provider-pool.service.ts + .spec.ts  getPool: decrypts in-memory, never returns plaintext
  byok-key-store.service.ts + .spec.ts        AES-256-GCM encrypt/decrypt

server/fixtures/indices/
  xiigen-tenants.json                         ITenantRegistry ES backing

client/src/components/TenantManager/
  TenantManager.tsx + .spec.tsx
  ProviderPoolDisplay.tsx + .spec.tsx
```

### Unit tests

```typescript
describe('ByokKeyStoreService', () => {
  it('encrypt then decrypt returns original key', async () => {
    const plain = 'sk-ant-test-key';
    const encrypted = await svc.encrypt(plain);
    expect(encrypted).not.toBe(plain);
    expect(await svc.decrypt(encrypted)).toBe(plain);
  });
  it('each encrypt call produces different ciphertext (randomised IV)', async () => {
    const e1 = await svc.encrypt('same');
    const e2 = await svc.encrypt('same');
    expect(e1).not.toBe(e2);
  });
  it('decrypt with wrong secret returns DataProcessResult.failure', async () => { ... });
  it('DNA-3: decrypt failure never throws', async () => {
    expect(() => svc.decryptSync('bad-ciphertext')).not.toThrow();
  });
});

describe('TenantProviderPoolService', () => {
  it('getPool: returned key is plaintext — stored value remains encrypted', async () => {
    await provision('acme', [{ key: 'sk-ant-real' }]);
    const pool = await svc.getPool('acme');
    expect(pool.providers[0]!.key).toBe('sk-ant-real');
    const stored = db._store.get('xiigen-byok-keys')?.[0]?.['providers'] as any[];
    expect(stored[0]['encryptedKey']).not.toBe('sk-ant-real');
  });
  it('getPool response object never contains encryptedKey field', async () => {
    const pool = await svc.getPool('acme');
    expect(JSON.stringify(pool)).not.toContain('encryptedKey');
  });
  it('getPool returns 3 providers when 3 were provisioned', async () => { ... });
  it('getPool returns DataProcessResult.failure for unknown tenantId', async () => { ... });
  it('DNA-3: never throws on db failure', async () => { ... });
});

describe('TenantRegistryService', () => {
  it('provision: stores to xiigen-tenants with correct schema', async () => { ... });
  it('provision: calls encrypt for each provider key before storage', async () => { ... });
  it('provision: DNA-8 — byok-keys written BEFORE TenantProvisioned event', async () => { ... });
  it('provision: idempotent — second call for same tenantId is a no-op', async () => { ... });
  it('provision: accepts 1-provider pool (2-model fallback path)', async () => { ... });
  it('deprovision: byok-keys deletion is the LAST step of cascade', async () => {
    const order: string[] = [];
    // capture all storeDocument calls by index name
    // assert 'xiigen-byok-keys' appears last in order
  });
  it('deprovision: returns TENANT_NOT_FOUND for unknown tenant', async () => { ... });
  it('DNA-3: never throws on any failure path', async () => { ... });
});
```

### Logic/E2E tests

```typescript
describe('Tenant Foundation — logic/E2E', () => {
  it('provision → getPool: pool has 3 providers with decrypted keys', async () => { ... });
  it('provision + 3 provider types: anthropic, openai, gemini all stored', async () => { ... });
  it('deprovision: cascade removes ALL tenant-scoped data across all indices', async () => { ... });
  it('deprovision: byok-keys is the last index cleared', async () => { ... });
  it('tenant isolation: getPool(A) never returns B provider keys', async () => { ... });
  it('no plaintext key in any stored record', async () => {
    const db = makeInMemoryDb();
    await provision(db, 'acme', [{ key: 'sk-ant-secret-key' }]);
    const allDocs = [...db._store.values()].flat();
    expect(JSON.stringify(allDocs)).not.toContain('sk-ant-secret-key');
  });
  it('API response /api/tenant/:id/pool contains NO encryptedKey fields', async () => { ... });
  it('single-provider pool: getPool returns 1 provider, engine logs warning', async () => { ... });
  it('TenantContextMiddleware integration: request without X-Tenant-Id header gets 403', async () => { ... });
});
```

### UI tests

```typescript
describe('TenantManager', () => {
  it('shows loading while provisioning in progress', async () => { ... });
  it('shows 3 provider key inputs (anthropic, openai, gemini)', () => {
    render(<TenantManager />);
    ['anthropic', 'openai', 'gemini'].forEach(type =>
      expect(screen.getByTestId(`provider-input-${type}`)).toBeInTheDocument()
    );
  });
  it('provider key inputs are password type — never shown as plain text', () => {
    render(<TenantManager />);
    ['anthropic', 'openai', 'gemini'].forEach(type =>
      expect(screen.getByTestId(`provider-input-${type}`)).toHaveAttribute('type', 'password')
    );
  });
  it('success state shows "3 providers" — no key values visible', async () => {
    await waitFor(() => expect(screen.getByTestId('provider-pool')).toHaveTextContent('3 providers'));
    expect(document.body.innerHTML).not.toMatch(/sk-ant|sk-[a-z]|AIza/);
  });
  it('shows specific error for duplicate tenant', async () => { ... });
  it('shows empty state with "Add providers" CTA when pool is empty', async () => { ... });
  it('validation: tenantId required, error shown without API call', async () => { ... });
});

describe('ProviderPoolDisplay', () => {
  it('shows type badge for each provider', async () => { ... });
  it('shows available models per provider', async () => { ... });
  it('never shows key values — only type, models, addedAt', async () => {
    render(<ProviderPoolDisplay providers={mockPool} />);
    expect(document.body.innerHTML).not.toMatch(/sk-ant|sk-[a-z]|AIza|encryptedKey/);
  });
  it('shows warning badge when pool has only 1 provider', async () => { ... });
});
```

### Phase A definition of done

```
□ ByokKeyStoreService: 4 unit tests pass (round-trip, random IV, failure, DNA-3)
□ TenantProviderPoolService: 5 unit tests pass (plaintext in-memory, no leak, failure)
□ TenantRegistryService: 8 unit tests pass (provision, deprovision, DNA-8, idempotency)
□ Logic/E2E: 9 tests pass (provision→pool, cascade order, isolation, no plaintext)
□ TenantManager UI: 7 tests pass (password inputs, 3 providers, no keys visible)
□ ProviderPoolDisplay UI: 4 tests pass (badges, no keys)
□ Playwright snapshot: TenantManager provisioned state with 3 provider badges
□ Live test: GET /api/tenant/default/pool returns 3 providers, zero key values
□ grep -rn "encryptedKey" server/src/api/ = 0 hits (never in API responses)
□ tsc --noEmit: 0 errors | Full suite: 0 new failures
□ PHASE-A-REPORT.md created
```

---

## 7. PHASE B — PROVIDER POOL + SK-523 PHASE 0

### Files

```
server/src/engine/
  provider-config-selector.service.ts + .spec.ts   SK-523 Phase 0 rotation

server/src/engine/node-handlers/
  convergence.handler.ts   MODIFIED: pool fabric + SK-523 replaces singleton
  convergence.handler.spec.ts   MODIFIED: pool-based tests added

server/test/e2e/provider-rotation/
  provider-rotation.e2e.spec.ts

client/src/components/CycleRunner/
  CycleRunner.tsx + .spec.tsx   shows all 3 providers used in last run
```

### Unit tests

```typescript
describe('ProviderConfigSelector — SK-523 Phase 0', () => {
  it('run 1 and run 2 use different provider assignments', async () => {
    const r1 = await selector.selectConfig('acme', 'SYNTHESIS', pool3, []);
    const r2 = await selector.selectConfig('acme', 'SYNTHESIS', pool3, [r1.record]);
    expect(JSON.stringify(r1.assignment)).not.toBe(JSON.stringify(r2.assignment));
  });
  it('generatorA ≠ generatorB ≠ generatorC — always 3 different providers', async () => {
    const r = await selector.selectConfig('acme', 'SYNTHESIS', pool3, []);
    const ids = [r.generatorA.providerId, r.generatorB.providerId, r.generatorC!.providerId];
    expect(new Set(ids).size).toBe(3);
  });
  it('judge provider ≠ any generator provider', async () => {
    const r = await selector.selectConfig('acme', 'JUDGMENT', pool3, []);
    const genIds = [r.generatorA.providerId, r.generatorB.providerId, r.generatorC?.providerId];
    expect(genIds).not.toContain(r.judge.providerId);
  });
  it('2-provider pool: generatorC is null, rotation still works', async () => {
    const r = await selector.selectConfig('acme', 'SYNTHESIS', pool2, []);
    expect(r.generatorC).toBeNull();
    expect(r.generatorA.providerId).not.toBe(r.generatorB.providerId);
  });
  it('1-provider pool: generatorB and C null, single-provider warning logged', async () => { ... });
  it('records entry to xiigen-planning-decisions after selection', async () => { ... });
  it('DNA-8: planning-decisions stored BEFORE any downstream call', async () => { ... });
});

describe('ConvergenceHandler — pool-based', () => {
  it('resolves providers from pool, never from env var or singleton', async () => {
    await handler.handle(ctx);
    expect(mockPoolFabric.getPool).toHaveBeenCalledWith('acme');
    // verify no global singleton was used
    expect(mockGlobalAi?.generate).toBeUndefined();
  });
  it('V9-002: chosen.model ≠ rejected.model in DPO triple', async () => {
    // with 3 different providers as generators, winners differ from losers
    const triple = capturedDpoTriple;
    expect(triple.chosen.model).not.toBe(triple.rejected.model);
  });
  it('all 3 provider keys are decrypted in-memory — not stored or logged', async () => { ... });
});
```

### Logic/E2E tests

```typescript
describe('Provider Rotation — logic/E2E', () => {
  it('6 runs cover all 3 provider types in generatorA role', async () => {
    const records: any[] = [];
    for (let i = 0; i < 6; i++) {
      const r = await runCycleChain('acme');
      records.push(r.providersUsed);
    }
    const generatorATypes = records.map(r => r.generatorA.type);
    expect(generatorATypes).toContain('anthropic');
    expect(generatorATypes).toContain('openai');
    expect(generatorATypes).toContain('gemini');
  });
  it('planning-decisions entries record all 3 provider roles', async () => {
    await runCycleChain('acme');
    const records = db._store.get('xiigen-planning-decisions') ?? [];
    expect(records[0]!['generatorA']).toBeDefined();
    expect(records[0]!['generatorB']).toBeDefined();
    expect(records[0]!['judge']).toBeDefined();
  });
  it('single-provider pool: DPO triple goes to pending — not main training index', async () => { ... });
  it('DNA-8: planning-decisions written BEFORE visibility record', async () => { ... });
  it('no provider key appears in planning-decisions records', async () => {
    await runCycleChain('acme');
    const records = db._store.get('xiigen-planning-decisions') ?? [];
    expect(JSON.stringify(records)).not.toMatch(/sk-ant|sk-[a-z]|AIza/);
  });
});
```

### UI tests

```typescript
describe('CycleRunner', () => {
  it('shows all 3 provider badges after run completes', async () => {
    // mock response includes providersUsed: {generatorA: 'anthropic', ...}
    await waitFor(() => {
      expect(screen.getByTestId('provider-badge-anthropic')).toBeInTheDocument();
      expect(screen.getByTestId('provider-badge-openai')).toBeInTheDocument();
      expect(screen.getByTestId('provider-badge-gemini')).toBeInTheDocument();
    });
  });
  it('shows which model won (winning model name visible)', async () => { ... });
  it('shows grade with 2 decimal places', async () => { ... });
  it('shows rotation cycle number', async () => { ... });
  it('loading state visible during AI generation', async () => { ... });
  it('no provider key values visible in result', async () => {
    await waitFor(() => screen.getByTestId('success-state'));
    expect(document.body.innerHTML).not.toMatch(/sk-ant|sk-[a-z]|AIza/);
  });
});
```

### Phase B definition of done

```
□ ProviderConfigSelector: 7 unit tests pass (rotation, 3≠3, judge≠gen, 2-pool, 1-pool)
□ ConvergenceHandler pool: 3 unit tests pass (pool used, V9-002, no key stored)
□ Provider rotation logic/E2E: 5 tests pass (6-run coverage, roles recorded, no key)
□ CycleRunner UI: 6 tests pass (3 badges, model name, no keys)
□ Playwright: CycleRunner with 3 provider badges visible after live run
□ Live test: run 1 and run 2 use different provider assignments
□ Live test: all 3 types (anthropic/openai/gemini) appear across 3 runs
□ tsc --noEmit: 0 errors | Full suite: 0 new failures
□ PHASE-B-REPORT.md created
```

---

## 8. PHASE 0 — CALIBRATION BOOTSTRAP

### Files

```
server/src/calibration/
  prompt-seeder.service.ts + .spec.ts
  prompt-templates/claude-templates.ts
  prompt-templates/gpt4-templates.ts
  prompt-templates/gemini-templates.ts
  calibration-runner.service.ts + .spec.ts
  oss-curriculum-runner.service.ts + .spec.ts
  graph-rag-context-builder.service.ts + .spec.ts
  calibration.controller.ts + .spec.ts

server/fixtures/indices/
  xiigen-calibration-baseline.json
  xiigen-oss-curriculum-runs.json
  xiigen-prompt-templates.json
  xiigen-graph-nodes.json
  xiigen-graph-edges.json

client/src/components/CalibrationDashboard/
  CalibrationDashboard.tsx + .spec.tsx
```

### Key unit tests

```typescript
describe('PromptSeeder', () => {
  it('seeds 33 templates (11 stations × 3 models)', async () => { ... });
  it('idempotent: second run creates no duplicates', async () => { ... });
  it('Claude templates contain XML tags', () => {
    expect(CLAUDE_TEMPLATES.get('AF-1')!.system).toContain('<role>');
  });
  it('GPT-4 templates contain markdown headers', () => {
    expect(GPT4_TEMPLATES.get('AF-1')!.system).toContain('##');
  });
  it('Gemini templates are shorter than Claude templates (more compact)', () => {
    const cLen = CLAUDE_TEMPLATES.get('AF-1')!.system.length;
    const gLen = GEMINI_TEMPLATES.get('AF-1')!.system.length;
    expect(gLen).toBeLessThan(cLen);
  });
  it('DNA-8: all templates stored before CalibrationReady event', async () => { ... });
});

describe('CalibrationRunner', () => {
  it('runBaseline: produces records across all 7 stations (CYCLE-1/2/3 + AF-1/6/7/9) at all depths', async () => { ... });
  it('record schema: every record has station, depth, nodeIntent, model, grade fields', async () => {
    const records = await runner.runBaseline('acme', 'FLOW-01', userIntent);
    records.forEach(r => {
      expect(r.station).toBeDefined();
      expect(typeof r.depth).toBe('number');
      expect(r.nodeIntent).toBeDefined();
      expect(r.model).toBeDefined();
      expect(r.grade).toBeGreaterThanOrEqual(0);
    });
  });
  it('regression: flags when grade drops > 0.05 vs baseline at same (station, depth)', async () => {
    const baseline = [{ station: 'AF-9', depth: 0, model: 'claude', grade: 0.93 }];
    const delta    = [{ station: 'AF-9', depth: 0, model: 'claude', grade: 0.81 }];
    expect(CalibrationRunner.detectRegressions(baseline, delta)[0]!.isRegression).toBe(true);
  });
  it('regression comparison: only compares records at matching (station, depth) — depth 0 vs depth 1 is NOT a regression', async () => {
    const baseline = [{ station: 'CYCLE-2', depth: 0, model: 'claude', grade: 0.89 }];
    const delta    = [{ station: 'CYCLE-2', depth: 1, model: 'claude', grade: 0.74 }];
    // Different depth — not a regression comparison, expected depth degradation
    expect(CalibrationRunner.detectRegressions(baseline, delta)).toHaveLength(0);
  });
  it('no regression: drop ≤ 0.05 is within tolerance', async () => { ... });
  it('DNA-3: Ollama unavailable returns failure, does not throw', async () => { ... });
});

describe('OssCurriculumRunner', () => {
  it('record schema: every record has station, depth, nodeIntent, ossModel, cycle, grade fields', async () => {
    const records = await runner.runCycles('acme', 'FLOW-01', 'CYCLE-2', 0, nodeContent, 5);
    records.forEach(r => {
      expect(r.station).toBe('CYCLE-2');
      expect(typeof r.depth).toBe('number');
      expect(r.nodeIntent).toBeDefined();
      expect(r.ossModel).toBeDefined();
      expect(typeof r.cycle).toBe('number');
    });
  });
  it('grade ≥ 0.85: stores output to RAG tagged with (station, depth) for next cycle', async () => { ... });
  it('grade < 0.85: does NOT store to RAG (prevents contamination)', async () => { ... });
  it('10 records created after 10 cycles', async () => { ... });
  it('RAG_INSUFFICIENT flagged when grades flat across all cycles', async () => { ... });
  it('depth-overload detection: flags when depth-1 grade < depth-0 grade - 0.10', async () => {
    const depth0Records = [{ depth: 0, grade: 0.74 }];
    const depth1Records = [{ depth: 1, grade: 0.44 }];
    expect(OssCurriculumRunner.detectDepthOverload(depth0Records, depth1Records)).toBe(true);
  });
  it('DNA-3: Ollama unavailable returns failure per cycle, does not halt runner', async () => { ... });
});
```

### UI tests

```typescript
describe('CalibrationDashboard', () => {
  it('shows station × depth × model score matrix (CYCLE-1/2/3 + AF stations, all depths)', async () => {
    await waitFor(() => {
      expect(screen.getAllByTestId('station-row').length).toBeGreaterThanOrEqual(7);
      expect(screen.getAllByTestId('model-column').length).toBe(3);
    });
  });
  it('shows depth column per row — depth-0 and depth-1 rows are separate', async () => {
    await waitFor(() => {
      const rows = screen.getAllByTestId('station-row');
      // CYCLE-2 should appear at both depth=0 and depth=1
      const cycle2Rows = rows.filter(r => r.textContent?.includes('CYCLE-2'));
      expect(cycle2Rows.length).toBeGreaterThanOrEqual(2);
    });
  });
  it('depth-overload cells highlighted distinctly from regression cells', async () => { ... });
  it('regression cells highlighted in red', async () => { ... });
  it('shows OSS grade trend symbols (↑ ↓ →) per model per station per depth', async () => { ... });
  it('shows loading state while baseline is running', async () => { ... });
  it('shows single-provider warning banner when pool has 1 provider', async () => { ... });
  it('no key values visible in calibration results', async () => {
    await waitFor(() => screen.getByTestId('calibration-dashboard'));
    expect(document.body.innerHTML).not.toMatch(/sk-ant|sk-[a-z]|AIza/);
  });
});
```

---

## 9. FULL PHASE PROTOCOL

```
STEP 0  Preflight (session start commands above)
STEP 1  Blast radius — list all files changing and all importers
STEP 2  Implement — no hardcoded models/keys/tenantIds/index names
        Add data-testid attributes to every new component
STEP 3  Unit tests — spec file in same directory, DNA tests mandatory
        npx jest [file].spec.ts → all pass
STEP 4  Logic/E2E tests — in-memory fabric, tenant isolation, call order
        npx jest [feature].e2e.spec.ts --runInBand → all pass
STEP 5  UI tests (RTL) — loading/error/empty/success/validation/no-keys
        cd client && npx jest [Component].spec.tsx → all pass
STEP 6  Full suite — both server and client
        cd server && npx jest --passWithNoTests → 0 failures
        cd client && npx jest --passWithNoTests → 0 failures
STEP 7  Compile — npx tsc --noEmit → 0 errors
STEP 8  Live test (Phase B onwards) — live-test.sh with all 3 providers
STEP 9  Calibration delta (Phase 0 onwards) — no regressions at any station at any depth
        Stations: CYCLE-1, CYCLE-2, CYCLE-3, AF-1, AF-6, AF-7, AF-9
        Depths: 0 (top-level) through termination bound
        Grade definitions: STEP-3/5/7 for CYCLE stations; AF-9 judge for AF stations
STEP 10 OSS mini-curriculum (Phase 0 onwards) — at least 1 model shows ↑ trend
        Runs at all stations at all depths. Watch for depth-overload pattern
        (grade drops depth 0→1) — different remediation from RAG plateau.
        Results tagged (station, depth, nodeIntent) in xiigen-oss-curriculum-runs.
STEP 11 Playwright snapshots — before + after UX review, Claude answers 7 questions
STEP 12 Module export — package all learning records into xiigen-module-library snapshot.
        ModuleSnapshotService.captureSnapshot({ tenantId, flowId, phase })
        Required: all 5 data types must be present in snapshot:
          xiigen-rag-patterns (Class A)
          xiigen-calibration-baseline
          xiigen-oss-curriculum-runs
          xiigen-decision-graph (Class B — graphEdgeIds)
          xiigen-prompts (Class C — promptVersionIds)
        Pass = snapshotId confirmed in xiigen-module-library.
        ModuleLibraryService.registerModule (scope: MODULE for platform, PRIVATE for tenant).
        A snapshot missing any of the 5 data types will fail the parity check in STEP 13.
STEP 13 Portability test — provision ephemeral tenant, import snapshot, re-run calibration.
        FreshTenantTestService.runPortabilityTest({ snapshotId, flowId, phase })
          Provisions ephemeral tenant (CLS, no cross-tenant leakage).
          Imports snapshot into adopted::ephemeralId::moduleId namespace.
          Re-runs CalibrationRunner at same (station, depth).
          Deprovisions ephemeral tenant (deleteDocument across 3 calibration indices).
        Parity check: parity = grade_fresh / grade_main
          DEV mode (portability.config.threshold.dev = 0.90, gate.blocking = false):
            parity ≥ 0.90 → PORTABLE ✅
            parity < 0.90 → PORTABILITY_GAP logged (non-blocking)
          LIVE mode (portability.config.threshold.live = 0.95, gate.blocking = true):
            parity ≥ 0.95 → PORTABLE ✅
            parity < 0.95 → BLOCKING ❌
        Record Section 5 in PHASE-X-PORTABILITY-REPORT.md alongside PHASE-X-REPORT.md:
          | Station | Depth | grade_main | grade_fresh | parity | status |
STEP 14 Phase report compiled in docs/phase-reports/PHASE-X/PHASE-X-REPORT.md
STEP 15 Commit: git add [code + docs/phase-reports/PHASE-X/]
        git commit -m "Phase X: [summary] | providers:3 | regression:none | UI:[N fixed] | OSS:↑ | depth:[max depth reached] | parity:[value]"
        git push origin crazy-shannon

⛔ STOP — present phase report. Await Luba approval before next phase.
```

---

## 10. LIVE TEST SCRIPT

```bash
#!/bin/bash
# live-test.sh — run from project root after server started
BASE="http://localhost:3000"
TENANT="live-$(date +%s)"

echo "=== Provision tenant with all 3 providers ==="
PROVISION_RESP=$(curl -sf -X POST "$BASE/api/tenant/provision" \
  -H "Content-Type: application/json" \
  -H "X-Tenant-Id: bootstrap" \
  -d "{
    \"tenantId\": \"$TENANT\",
    \"providers\": [
      {\"id\":\"p1\",\"type\":\"anthropic\",\"key\":\"$BOOTSTRAP_ANTHROPIC_KEY\",\"availableModels\":[\"claude-sonnet-4-6\",\"claude-opus-4-6\"]},
      {\"id\":\"p2\",\"type\":\"openai\",   \"key\":\"$BOOTSTRAP_OPENAI_KEY\",   \"availableModels\":[\"gpt-4o\"]},
      {\"id\":\"p3\",\"type\":\"gemini\",   \"key\":\"$BOOTSTRAP_GEMINI_KEY\",   \"availableModels\":[\"gemini-2.0-flash\"]}
    ]
  }")
echo "$PROVISION_RESP" | python3 -c "
import sys,json; d=json.load(sys.stdin)
if d.get('error'): print(f'🔴 PROVISION FAILED: {d}'); sys.exit(1)
print('✅ Tenant provisioned')
raw=json.dumps(d)
for kw in ['sk-ant','sk-','AIza','encryptedKey']:
    assert kw not in raw, f'🔴 SECRET IN PROVISION RESPONSE: {kw}'
print('✅ No secrets in provision response')
"

echo ""
echo "=== Run 1 — verify all 3 providers used ==="
RUN1=$(curl -sf -X POST "$BASE/api/cycle-chain/run" \
  -H "Content-Type: application/json" \
  -H "X-Tenant-Id: $TENANT" \
  -d '{"userIntent":"When a user registers, verify email and grant access","terminationDepth":3}')
echo "$RUN1" | python3 -c "
import sys,json; d=json.load(sys.stdin)
if d.get('error'): print(f'🔴 RUN FAILED: {d}'); sys.exit(1)
print(f'✅ Run 1 | grade={d.get(\"grade\",0):.2f} | steps={len(d.get(\"planSteps\",[]))}')
p = d.get('providersUsed',{})
for role in ['generatorA','generatorB','generatorC','judge']:
    val = p.get(role)
    print(f'   {role}: {val if val else \"null (2-model fallback)\"}')
types_used = set(v.get('type','') for v in p.values() if isinstance(v,dict))
for t in ['anthropic','openai','gemini']:
    print(f'   {\"✅\" if t in types_used else \"⚠️ \"} {t} in run 1')
# Security check
for kw in ['sk-ant','sk-','AIza','encryptedKey']:
    assert kw not in json.dumps(d), f'🔴 SECRET IN RUN RESPONSE: {kw}'
print('✅ No secrets in run response')
"

echo ""
echo "=== Run 2 — verify rotation (different combination) ==="
RUN2=$(curl -sf -X POST "$BASE/api/cycle-chain/run" \
  -H "Content-Type: application/json" \
  -H "X-Tenant-Id: $TENANT" \
  -d '{"userIntent":"When a user registers, verify email and grant access","terminationDepth":3}')
python3 - "$RUN1" "$RUN2" << 'EOF'
import sys,json
r1 = json.loads(sys.argv[1]).get('providersUsed',{})
r2 = json.loads(sys.argv[2]).get('providersUsed',{})
if r1 != r2:
    print('✅ SK-523 rotation: run 2 has different assignment from run 1')
else:
    print('⚠️  Same assignment on runs 1 and 2 — check rotation logic')
EOF

echo ""
echo "=== Verify planning-decisions contain no secrets ==="
curl -sf "$BASE/api/planning-decisions/$TENANT/latest" \
  -H "X-Tenant-Id: $TENANT" | python3 -c "
import sys; raw=sys.stdin.read()
for kw in ['sk-ant','sk-','AIza','encryptedKey','BOOTSTRAP']:
    assert kw not in raw, f'🔴 SECRET IN PLANNING-DECISIONS: {kw}'
print('✅ No secrets in planning-decisions')
"

echo ""
echo "=== Cleanup ==="
curl -sf -X POST "$BASE/api/tenant/deprovision" \
  -H "Content-Type: application/json" \
  -H "X-Tenant-Id: bootstrap" \
  -d "{\"tenantId\":\"$TENANT\"}" \
  | python3 -c "
import sys,json; d=json.load(sys.stdin)
print('✅ Cleanup done' if not d.get('error') else f'🔴 CLEANUP FAILED: {d}')
"
```

**PASS criteria:**
```
✅ All 3 providers (anthropic / openai / gemini) appear in run 1 assignments
✅ Run 1 and run 2 have different provider assignments (rotation confirmed)
✅ grade ≥ 0.85 on at least one run
✅ Zero secret values (sk-ant, sk-, AIza, encryptedKey) in any API response
✅ Zero secret values in planning-decisions records
✅ Cleanup leaves zero tenant data
```

**STOP criteria — fix before merge:**
```
🔴 AI_PROVIDER in .env → remove it
🔴 Only 1 provider type in results → bootstrap seeder did not run or only 1 BOOTSTRAP_* set
🔴 Same assignment on both runs → SK-523 rotation broken
🔴 Any secret value in any response → security regression, blocks merge immediately
🔴 grade = 0.00 → BUG-002 still present in planner prompt
```

---

## 11. PHASE REPORT FORMAT

```markdown
# PHASE X REPORT — [Name]
Date: [date] | Branch: crazy-shannon | DoD: PASS/FAIL

## 1. Summary
[One sentence per file built]

## 2. Test Counts
| Tier | Before | After | Delta |
|------|--------|-------|-------|
| Unit | N | N+X | +X |
| Logic/E2E | N | N+X | +X |
| UI (RTL) | N | N+X | +X |
| UI (Playwright snapshots) | N | N+X | +X |

## 3. Calibration (all stations at all depths — Phase 0 onwards)
| Station  | Depth | Claude | GPT-4o | Gemini | vs Baseline |
|----------|-------|--------|--------|--------|-------------|
| CYCLE-1  |   0   | [g]    | [g]    | [g]    | ✅ / 🔴      |
| CYCLE-2  |   0   | [g]    | [g]    | [g]    | ✅ / 🔴      |
| CYCLE-2  |   1   | [g]    | [g]    | [g]    | ✅ / 🔴 (depth-overload if drops >0.10 vs depth 0) |
| CYCLE-3  |   0   | [g]    | [g]    | [g]    | ✅ / 🔴      |
| AF-1     | 0-N   | [g]    | [g]    | [g]    | ✅ / 🔴      |
| AF-9     | 0-N   | [g]    | [g]    | [g]    | ✅ / 🔴      |
Note: CYCLE stations graded by STEP-3/5/7 formulas. AF stations graded by AF-9 judge.

## 4. OSS Curriculum (5 cycles, all stations at all depths — Phase 0 onwards)
| Station | Depth | Model | C1 | C2 | C3 | C4 | C5 | Trend | Viable? |
|---------|-------|-------|----|----|----|----|----|----|---------|
Note: ↓ trend at depth 1 vs depth 0 = depth-overload pattern (context reduction required, not more cycles)

## 5. Security Checks
□ AI_PROVIDER absent from .env
□ No secret values in any API response (live test confirmed)
□ No secret values in any stored record (grep confirmed)
□ Provider keys shown as type badges only — no values in UI

## 6. UI Review

### [Component] — Before
![before](snapshots/[component]-before.png)
Q1 Loading: [PASS/FAIL]   Q2 Error: [PASS/FAIL]   Q3 Empty: [PASS/FAIL]
Q4 Data visible: [PASS/FAIL]   Q5 Actions: [PASS/FAIL]
Q6 Completeness: [PASS/FAIL]   Q7 No secrets: [PASS/FAIL]
Issues: [list or NONE]

### [Component] — After
![after](snapshots/[component]-after.png)
Fixes applied: [list]  |  Pending Luba review: [list or NONE]

## 7. Definition of Done
[Full checklist — all ✅ or ❌ with reason]

## 8. Merge Status
[ ] Luba approved   [ ] Merged to Skills_Creation_Claude   [ ] Post-merge: 0 failures
```

---

## 12. BRANCH WORKFLOW

```bash
# Per phase — on crazy-shannon
git add [code files] docs/phase-reports/PHASE-X/
git commit -m "Phase X: [summary] | providers:3 | regression:none | UI:[N fixed] | OSS:↑ | parity:[value]"
git push origin crazy-shannon

# After Luba approves phase report
git checkout Skills_Creation_Claude && git pull origin Skills_Creation_Claude
git merge claude/crazy-shannon --no-ff \
  -m "Merge Phase X: [summary] | tests:+N | providers:3-pool"
cd server && npx jest --passWithNoTests 2>&1 | tail -3   # → 0 failures
git push origin Skills_Creation_Claude
```

---

*End of XIIGEN-IMPLEMENTATION-PROTOCOL-v3.0*
*Save to: [PROJECT_ROOT]\docs\flow-plan-preparation\XIIGEN-IMPLEMENTATION-PROTOCOL-v3.md*
*Load at every Claude Code session start. All steps mandatory. No component exempt from all 3 test tiers.*
