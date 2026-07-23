# XIIGEN — IMPLEMENTATION PROTOCOL v1.0
## For: Claude Code (claude/crazy-shannon → Skills_Creation_Claude)
## Covers: FLOW-30 + FLOW-08 gaps + SK-523 + FLOW-26 + BUG-002
## Date: 2026-04-05
## Status: AUTHORITATIVE — load this document at every session start

---

## 0. ABSOLUTE RULES — READ BEFORE ANYTHING ELSE

```
1. All work happens on branch: claude/crazy-shannon
   Never commit directly to Skills_Creation_Claude.
   Merge only after DEFINITION OF DONE passes for the full phase.

2. Every phase must compile (tsc --noEmit = 0 errors) before any test runs.

3. failures === 0 before any ⛔ STOP. Pre-existing failures are not exempt —
   they must be listed in ISSUE INVENTORY and approved by Luba as DEFERRED.

4. .env is gitignored. API keys are NEVER committed. Verified with:
   git ls-files --error-unmatch .env 2>&1 | grep "did not match" || echo "BLOCKED: .env tracked"

5. Never hardcode model names or API keys anywhere in source code.
   All model names come from FREEDOM config. All keys come from xiigen-byok-keys.
   Exception: .env for local dev only — seeded into byok-keys at startup.

6. DNA-8 is absolute: storeDocument() BEFORE every enqueue() and BEFORE every emit().
   No exceptions. Every test must verify call order, not just call existence.

7. DNA-5 is absolute: tenantId comes from AsyncLocalStorage.
   Fabric interfaces MUST NOT accept tenantId as a parameter.
   Named check: no_tenantid_param — score-0 if violated.

8. Every handler returns DataProcessResult<T> — never throws (DNA-3).
   Tests must include: inject failing dependency, verify DataProcessResult.failure returned.
```

---

## 1. LOCAL ENVIRONMENT

### Paths
```
Project root:     C:\Projects\xiigen mvp\
Worktree root:    C:\Projects\xiigen mvp\.claude\worktrees\crazy-shannon\
Server:           [PROJECT_ROOT]\server\
Client:           [PROJECT_ROOT]\client\
Skills:           [PROJECT_ROOT]\.claude\skills\
Flow sessions:    [PROJECT_ROOT]\docs\sessions\FLOW-XX\
Fixtures:         [PROJECT_ROOT]\server\fixtures\indices\
.env file:        [PROJECT_ROOT]\server\.env  (gitignored — never commit)
```

### Session Start Commands (run every session, before any code)
```bash
cd "C:\Projects\xiigen mvp\server"

# 1. Verify branch
git branch --show-current
# Expected: Skills_Creation_Claude (main) or crazy-shannon (worktree)

# 2. Verify .env is not tracked
git ls-files --error-unmatch .env 2>&1 | grep -q "did not match" && echo "✅ .env not tracked" || echo "🔴 STOP: .env is tracked"

# 3. TypeScript baseline
npx tsc --noEmit 2>&1 | tail -3
# Expected: no errors

# 4. Test baseline
npx jest --passWithNoTests 2>&1 | tail -5
# Expected: X passing, 0 failures

# 5. Server starts (using compiled dist — rebuild first if source changed)
npm run build && node dist/main.js &
sleep 4
curl -sf http://localhost:3000/api/engine/check-fabric -H "x-tenant-id: default" | python3 -c "import sys,json; d=json.load(sys.stdin); print('✅ Server healthy' if d.get('gatePassed') else '🔴 Fabric check failed')" || echo "🔴 Server failed to start"
```

### .env for Live Tests (create once, never commit)
```bash
# C:\Projects\xiigen mvp\.env  (or server\.env — gitignored)
NODE_ENV=development
PORT=3000
AI_PROVIDER=anthropic
DATABASE_PROVIDER=in_memory
QUEUE_PROVIDER=in_memory
RAG_PROVIDER=in_memory
SECRETS_PROVIDER=env_var

# Real API keys — never commit these
DEFAULT_ANTHROPIC_KEY=sk-ant-...
DEFAULT_OPENAI_KEY=sk-...
DEFAULT_GEMINI_KEY=AIza...
PINECONE_API_KEY=...
DEFAULT_TENANT_ID=default
TENANT_KEY_ENCRYPTION_SECRET=<base64-32-bytes>

# Optional: local open source model
LOCAL_MODEL_URL=http://localhost:11434
```

**NOTE on key variable names:** The server reads `DEFAULT_ANTHROPIC_KEY` (not `ANTHROPIC_API_KEY`).
See `server/src/fabrics/fabrics.module.ts` line 120 for the canonical variable names.

---

## 2. TESTING PROTOCOL

### Tier 1 — Unit Tests

**Location:** Same directory as the file under test.
```
server/src/engine/node-handlers/planner.handler.spec.ts    ← unit
server/src/tenant/tenant-lifecycle.service.spec.ts         ← unit
server/src/engine/provider-config-selector.service.spec.ts ← unit
```

**Run command:**
```bash
cd server && npx jest --testPathPatterns="[filename].spec.ts" --verbose
```

**Template — copy for every new service:**
```typescript
import 'reflect-metadata';
import { DataProcessResult } from '../kernel/data-process-result';
import { MyService } from './my.service';

// ── Mock factories — one per external dependency ──────────────────────────────
const mockDb = {
  storeDocument: jest.fn().mockResolvedValue(DataProcessResult.success({})),
  searchDocuments: jest.fn().mockResolvedValue(DataProcessResult.success([])),
  getDocument: jest.fn().mockResolvedValue(DataProcessResult.success({})),
};

const mockQueue = {
  enqueue: jest.fn().mockResolvedValue(DataProcessResult.success({ messageId: 'msg-1' })),
};

const mockAls = {
  get: jest.fn().mockReturnValue('tenant-unit-test'),
};

beforeEach(() => jest.clearAllMocks());

describe('MyService', () => {
  // ── POSITIVE TESTS ──────────────────────────────────────────────────────────
  it('happy path: returns DataProcessResult.success with expected shape', async () => { /* ... */ });

  it('DNA-8: storeDocument called BEFORE enqueue', async () => {
    const callOrder: string[] = [];
    mockDb.storeDocument.mockImplementationOnce(async () => {
      callOrder.push('store'); return DataProcessResult.success({});
    });
    mockQueue.enqueue.mockImplementationOnce(async () => {
      callOrder.push('enqueue'); return DataProcessResult.success({});
    });
    await svc.handle(ctx);
    expect(callOrder).toEqual(['store', 'enqueue']); // MUST be this exact order
  });

  it('DNA-5: tenantId read from ALS, not passed as parameter', async () => {
    await svc.handle(ctx);
    // Verify mockAls.get was called — service reads tenant from ALS
    expect(mockAls.get).toHaveBeenCalledWith('tenantId');
    // Verify no fabric call received tenantId as first argument
    const storeArgs = mockDb.storeDocument.mock.calls[0];
    // storeDocument(index, doc, id) — doc should not have tenantId as a
    // method parameter; it may be IN the document as a field (that's OK)
    // What's forbidden: create(tenantId, data) — tenantId as first arg
  });

  // ── NEGATIVE TESTS ──────────────────────────────────────────────────────────
  it('DNA-3: never throws — returns failure when db.storeDocument fails', async () => {
    mockDb.storeDocument.mockResolvedValueOnce(
      DataProcessResult.failure('DB_FAIL', 'Connection refused')
    );
    let threw = false;
    let result: any;
    try {
      result = await svc.handle(ctx);
    } catch {
      threw = true;
    }
    expect(threw).toBe(false);
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBeDefined();
  });

  it('missing tenant: returns failure when byok-keys has no entry', async () => { /* ... */ });
  it('invalid input: returns failure when required field is missing', async () => { /* ... */ });
});
```

**What every unit test file MUST contain:**
- ✅ At least 1 DNA-8 call-order test (store before emit/enqueue)
- ✅ At least 1 DNA-3 test (failure injection → DataProcessResult.failure, no throw)
- ✅ At least 1 DNA-5 test (tenantId from ALS, not parameter) — for any service that writes data
- ✅ At least 1 happy path test
- ✅ At least 1 negative path test (invalid input or dependency failure)

---

### Tier 2 — E2E Tests

**Location:** `server/test/e2e/[feature]/[feature].e2e.spec.ts`
```
server/test/e2e/tenant/tenant-lifecycle.e2e.spec.ts
server/test/e2e/flow-01/cycles-chain.e2e.spec.ts   ← existing pattern
server/test/e2e/integration/full-run-tenant.e2e.spec.ts
```

**Run command:**
```bash
cd server && npx jest --testPathPatterns="[feature].e2e.spec.ts" --verbose --runInBand
```

**Factory pattern (established — copy exactly):**
```typescript
// makeInMemoryDb() — shared factory, returns a real in-memory store
function makeInMemoryDb() {
  const store: Map<string, Record<string, unknown>[]> = new Map();
  return {
    storeDocument: jest.fn(async (index: string, doc: Record<string, unknown>, id: string) => {
      const bucket = store.get(index) ?? [];
      const existing = bucket.findIndex(d => d['id'] === id);
      if (existing >= 0) bucket[existing] = { ...doc, id };
      else bucket.push({ ...doc, id });
      store.set(index, bucket);
      return DataProcessResult.success({ ...doc, id });
    }),
    searchDocuments: jest.fn(async (index: string, filter: Record<string, unknown>) => {
      const bucket = store.get(index) ?? [];
      const results = bucket.filter(doc =>
        Object.entries(filter).every(([k, v]) => v == null || doc[k] === v)
      );
      return DataProcessResult.success(results);
    }),
    getDocument: jest.fn(async (index: string, id: string) => {
      const bucket = store.get(index) ?? [];
      const doc = bucket.find(d => d['id'] === id);
      return doc ? DataProcessResult.success(doc)
                 : DataProcessResult.failure('NOT_FOUND', `${id} not found in ${index}`);
    }),
    _store: store, // expose for assertion
  };
}

function makeInMemoryQueue() {
  const emitted: Array<{ queue: string; payload: Record<string, unknown> }> = [];
  return {
    enqueue: jest.fn(async (queue: string, payload: Record<string, unknown>) => {
      emitted.push({ queue, payload });
      return DataProcessResult.success({ messageId: `msg-${Date.now()}` });
    }),
    _emitted: emitted,
  };
}
```

**E2E test structure — positive and negative:**
```typescript
describe('TenantLifecycleService E2E', () => {

  // ── POSITIVE ────────────────────────────────────────────────────────────────
  it('provision: byok-keys entry created with providers array', async () => {
    const db = makeInMemoryDb();
    const queue = makeInMemoryQueue();
    const svc = new TenantLifecycleService(db as any, queue as any);

    const result = await svc.provision('tenant-a', [
      { id: 'p1', type: 'anthropic', encryptedKey: 'key-a', availableModels: ['claude-sonnet-4-6'], addedAt: new Date().toISOString() }
    ]);

    expect(result.isSuccess).toBe(true);
    const keys = db._store.get('xiigen-byok-keys') ?? [];
    expect(keys.length).toBe(1);
    expect(keys[0]!['tenantId']).toBe('tenant-a');
    expect(Array.isArray(keys[0]!['providers'])).toBe(true);
  });

  it('provision: TenantProvisioned CloudEvent emitted AFTER byok-keys written', async () => {
    const db = makeInMemoryDb();
    const queue = makeInMemoryQueue();
    const callOrder: string[] = [];

    db.storeDocument = jest.fn(async (...args: any[]) => {
      callOrder.push('store:' + args[0]);
      return DataProcessResult.success({});
    });
    queue.enqueue = jest.fn(async (q: string) => {
      callOrder.push('emit:' + q);
      return DataProcessResult.success({ messageId: 'x' });
    });

    const svc = new TenantLifecycleService(db as any, queue as any);
    await svc.provision('tenant-a', []);

    // DNA-8: byok-keys store BEFORE TenantProvisioned event
    const storeIdx = callOrder.indexOf('store:xiigen-byok-keys');
    const emitIdx = callOrder.indexOf('emit:tenant.provisioned');
    expect(storeIdx).toBeGreaterThanOrEqual(0);
    expect(emitIdx).toBeGreaterThan(storeIdx);
  });

  it('deprovision: cascade deletes all tenant-scoped data', async () => {
    const db = makeInMemoryDb();
    const queue = makeInMemoryQueue();
    const svc = new TenantLifecycleService(db as any, queue as any);

    // Setup: provision first
    await svc.provision('tenant-a', []);
    // Manually seed some tenant data
    await db.storeDocument('xiigen-rag-patterns', { tenantId: 'tenant-a', data: 'x' }, 'r1');
    await db.storeDocument('xiigen-planning-decisions', { tenantId: 'tenant-a', grade: 0.9 }, 'd1');

    await svc.deprovision('tenant-a');

    // All tenant data gone
    const keys = db._store.get('xiigen-byok-keys') ?? [];
    expect(keys.filter(d => d['tenantId'] === 'tenant-a').length).toBe(0);
    const rag = db._store.get('xiigen-rag-patterns') ?? [];
    expect(rag.filter(d => d['tenantId'] === 'tenant-a').length).toBe(0);
  });

  it('tenant isolation: tenant-a data not visible to tenant-b queries', async () => {
    const db = makeInMemoryDb();
    const queue = makeInMemoryQueue();
    const svc = new TenantLifecycleService(db as any, queue as any);

    await svc.provision('tenant-a', [{ id: 'p1', type: 'anthropic', encryptedKey: 'k1', availableModels: [], addedAt: '' }]);
    await svc.provision('tenant-b', [{ id: 'p2', type: 'openai',    encryptedKey: 'k2', availableModels: [], addedAt: '' }]);

    const poolA = await new TenantProviderPoolService(db as any).getPool('tenant-a');
    const poolB = await new TenantProviderPoolService(db as any).getPool('tenant-b');

    expect(poolA.providers[0]!.type).toBe('anthropic');
    expect(poolB.providers[0]!.type).toBe('openai');
    // No cross-contamination
    expect(poolA.providers.find(p => p.type === 'openai')).toBeUndefined();
  });

  // ── NEGATIVE ────────────────────────────────────────────────────────────────
  it('provision: idempotent — provisioning same tenantId twice is a no-op', async () => {
    const db = makeInMemoryDb();
    const svc = new TenantLifecycleService(db as any, makeInMemoryQueue() as any);

    await svc.provision('tenant-a', []);
    await svc.provision('tenant-a', []); // second call

    const keys = db._store.get('xiigen-byok-keys') ?? [];
    expect(keys.filter(d => d['tenantId'] === 'tenant-a').length).toBe(1); // not 2
  });

  it('deprovision: returns failure for non-existent tenant', async () => {
    const db = makeInMemoryDb();
    const svc = new TenantLifecycleService(db as any, makeInMemoryQueue() as any);

    const result = await svc.deprovision('does-not-exist');
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('TENANT_NOT_FOUND');
  });

  it('DNA-3: db failure during provision returns failure, does not throw', async () => {
    const db = makeInMemoryDb();
    db.storeDocument = jest.fn().mockResolvedValue(
      DataProcessResult.failure('DB_UNAVAILABLE', 'ES is down')
    );
    const svc = new TenantLifecycleService(db as any, makeInMemoryQueue() as any);

    const result = await svc.provision('tenant-x', []);
    expect(result.isSuccess).toBe(false); // graceful failure, no throw
  });
});
```

**What every E2E test file MUST contain:**
- ✅ Uses makeInMemoryDb() and makeInMemoryQueue() — no real ES or Redis
- ✅ Tenant isolation test: two tenants with same entity ID see only their own data
- ✅ DNA-8 verified by call order array, not just mock.toHaveBeenCalled()
- ✅ Idempotency test: same operation twice = same result as once (DNA-7)
- ✅ Cascade test: deprovision clears all tenant-scoped indices

---

### Tier 3 — UI Tests

**Location:** Same directory as the component.
```
client/src/components/TenantManager/TenantManager.spec.tsx
client/src/components/CycleChain/CycleChainRunner.spec.tsx
```

**Run command:**
```bash
cd client && npx jest --testPathPatterns="[ComponentName].spec.tsx" --verbose
```

**Template:**
```typescript
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { TenantManager } from './TenantManager';

// Mock API calls — never real HTTP in UI tests
global.fetch = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  (global.fetch as jest.Mock).mockResolvedValue({
    ok: true,
    json: async () => ({ tenantId: 'test', status: 'ACTIVE', providers: [] }),
  });
});

describe('TenantManager', () => {

  // ── POSITIVE ────────────────────────────────────────────────────────────────
  it('renders provision form with required fields', () => {
    render(<TenantManager />);
    expect(screen.getByLabelText(/tenant id/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /provision/i })).toBeInTheDocument();
  });

  it('shows success state after provisioning', async () => {
    render(<TenantManager />);
    fireEvent.change(screen.getByLabelText(/tenant id/i), { target: { value: 'my-tenant' } });
    fireEvent.click(screen.getByRole('button', { name: /provision/i }));
    await waitFor(() => expect(screen.getByText(/provisioned/i)).toBeInTheDocument());
  });

  it('displays provider pool after successful provisioning', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        tenantId: 'my-tenant',
        providers: [{ id: 'p1', type: 'anthropic', availableModels: ['claude-sonnet-4-6'] }],
      }),
    });
    render(<TenantManager initialTenantId="my-tenant" />);
    await waitFor(() => expect(screen.getByText(/anthropic/i)).toBeInTheDocument());
  });

  // ── NEGATIVE ────────────────────────────────────────────────────────────────
  it('shows error message when provision API returns 4xx', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Tenant already exists', code: 'TENANT_EXISTS' }),
    });
    render(<TenantManager />);
    fireEvent.click(screen.getByRole('button', { name: /provision/i }));
    await waitFor(() => expect(screen.getByText(/already exists/i)).toBeInTheDocument());
  });

  it('disables submit button during loading', async () => {
    let resolveFetch!: (v: any) => void;
    (global.fetch as jest.Mock).mockReturnValueOnce(
      new Promise(r => { resolveFetch = r; })
    );
    render(<TenantManager />);
    fireEvent.click(screen.getByRole('button', { name: /provision/i }));
    expect(screen.getByRole('button', { name: /provision/i })).toBeDisabled();
    resolveFetch({ ok: true, json: async () => ({}) });
  });

  it('empty tenant ID: shows validation error without calling API', async () => {
    render(<TenantManager />);
    fireEvent.click(screen.getByRole('button', { name: /provision/i }));
    expect(screen.getByText(/tenant id is required/i)).toBeInTheDocument();
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
```

**What every UI test file MUST contain:**
- ✅ Loading state: submit button disabled during pending request
- ✅ Error state: API failure shows user-readable message
- ✅ Empty/invalid input: validation without API call
- ✅ Success state: component shows expected data after success
- ✅ No real fetch calls — all mocked

---

### Tier 4 — Live Tests with Real API Keys

**When to run:** After all unit + e2e + UI tests pass. Before merging to Skills_Creation_Claude.

**Preconditions:**
```bash
# 1. Rebuild and start server with real keys
cd "C:\Projects\xiigen mvp\server"
npm run build

# Start with env vars from .env file at project root
env $(grep -v '^#' ../.env | xargs) node dist/main.js &
sleep 5

# 2. Verify AI provider is REAL (not mock)
curl -sf http://localhost:3000/api/engine/check-fabric \
  -H "x-tenant-id: default" | python3 -c "
import sys, json
d = json.load(sys.stdin)
print('✅ Fabric gate passed' if d.get('gatePassed') else '🔴 Fabric check failed')
"
```

**Live test script — run after Phase C completes:**
```bash
#!/bin/bash
# live-test.sh — run from project root after server is started
# Usage: bash live-test.sh

BASE_URL="http://localhost:3000"
TENANT="live-test-$(date +%s)"

echo "=== PHASE A: Provision tenant with multi-provider pool ==="
PROVISION=$(curl -sf -X POST "$BASE_URL/api/tenant/provision" \
  -H "Content-Type: application/json" \
  -H "x-tenant-id: $TENANT" \
  -d "{
    \"tenantId\": \"$TENANT\",
    \"providers\": [
      {\"id\": \"p1\", \"type\": \"anthropic\",
       \"key\": \"$DEFAULT_ANTHROPIC_KEY\",
       \"availableModels\": [\"claude-sonnet-4-6\", \"claude-opus-4-6\"],
       \"addedAt\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"},
      {\"id\": \"p2\", \"type\": \"openai\",
       \"key\": \"$DEFAULT_OPENAI_KEY\",
       \"availableModels\": [\"gpt-4o\"],
       \"addedAt\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"},
      {\"id\": \"p3\", \"type\": \"gemini\",
       \"key\": \"$DEFAULT_GEMINI_KEY\",
       \"availableModels\": [\"gemini-2.0-flash\"],
       \"addedAt\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"}
    ]
  }")
echo "$PROVISION" | python3 -c "
import sys,json; d=json.load(sys.stdin)
print('✅ Tenant provisioned' if not d.get('error') else f'🔴 FAIL: {d}')
"

echo ""
echo "=== PHASE B: Run cycle chain — Run 1 ==="
RUN1=$(curl -sf -X POST "$BASE_URL/api/cycle-chain/run" \
  -H "Content-Type: application/json" \
  -H "x-tenant-id: $TENANT" \
  -d "{
    \"userIntent\": \"When a user registers, verify their email address and grant access after confirmation\",
    \"constraints\": [
      \"No typed models — all business data uses Record<string, unknown>\",
      \"No throw for business logic — return DataProcessResult\",
      \"Every external dependency resolved via factory\"
    ],
    \"tenantId\": \"$TENANT\",
    \"terminationDepth\": 2
  }")
echo "$RUN1" | python3 -c "
import sys,json
d=json.load(sys.stdin)
if d.get('error'):
    print(f'🔴 FAIL: {d}')
    sys.exit(1)
grade = d.get('grade', 0)
leaf_nodes = len(d.get('leafNodes', []))
plan_steps = len(d.get('planSteps', []))
providers = d.get('providersUsed', 'not yet tracked')
print(f'✅ Run 1 complete | grade={grade:.2f} | planSteps={plan_steps} | leafNodes={leaf_nodes}')
print(f'   Providers used: {providers}')
if grade < 0.85:
    print(f'⚠️  Grade {grade:.2f} < 0.85 — check planner context package')
if grade == 0.0:
    print('🔴 STOP: grade=0.00 — BUG-002 not fixed or planner parse failed')
"

echo ""
echo "=== PHASE C: Run 2 — verify provider rotation (SK-523) ==="
RUN2=$(curl -sf -X POST "$BASE_URL/api/cycle-chain/run" \
  -H "Content-Type: application/json" \
  -H "x-tenant-id: $TENANT" \
  -d "{
    \"userIntent\": \"When a user registers, verify their email address and grant access after confirmation\",
    \"constraints\": [
      \"No typed models — all business data uses Record<string, unknown>\",
      \"No throw for business logic — return DataProcessResult\",
      \"Every external dependency resolved via factory\"
    ],
    \"tenantId\": \"$TENANT\",
    \"terminationDepth\": 2
  }")
echo "$RUN2" | python3 -c "
import sys,json
d=json.load(sys.stdin)
providers_r2 = d.get('providersUsed', {})
print(f'Run 2 providers: {providers_r2}')
print('⚠️  (providersUsed not yet in response — check xiigen-planning-decisions after Phase C)')
"

echo ""
echo "=== THREE-SIGNAL TEST (manual — check visibility records) ==="
echo "After run completes, verify:"
echo "  Signal 1: visibility.cycle1.sent.userIntent = verbatim intent string"
echo "  Signal 2: winning NODE added at least 1 domain-specific constraint not in iron rules"
echo "  Signal 3: at least 1 arbiter raised a CONCERN on round 1 of convergence"

echo ""
echo "=== CLEANUP: Deprovision test tenant ==="
curl -sf -X POST "$BASE_URL/api/tenant/deprovision" \
  -H "Content-Type: application/json" \
  -H "x-tenant-id: $TENANT" \
  -d "{\"tenantId\": \"$TENANT\"}" \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print('✅ Cleanup done' if not d.get('error') else f'🔴 {d}')"
```

**Live test PASS criteria:**
```
✅ Tenant provisioned without error (all 3 providers registered)
✅ Cycle chain completes with grade >= 0.85
✅ visibility.cycle1.sent.userIntent = verbatim intent (no paraphrasing)
✅ At least 1 new domain-specific constraint in winning NODE (Signal 2)
✅ Run 2 uses different provider combination from Run 1 (SK-523 rotation) — Phase C+
✅ Cleanup deprovisions cleanly (no orphan data)
✅ Three-signal test: at least 1 of 3 signals shows genuine AI inference
```

**Live test STOP criteria (fix before merge):**
```
🔴 grade = 0.00 → PLANNER_PARSE_FAILED or grade formula broken
🔴 PLANNER_MISSING_INTENT or PLANNER_MISSING_CONSTRAINTS error → input wiring wrong
🔴 INTENT in visibility.sent is paraphrased → planner context package INTENT field wrong
🔴 All 3 convergence scores = 1.0 on round 1 → context package over-prescribing
🔴 Provider same on run 1 and run 2 → SK-523 rotation not working (Phase C check)
🔴 Deprovision leaves data in any index → cascade incomplete
```

---

## 3. SKILLS TO LOAD PER PHASE

Load by reading the file with the `view` tool before writing any code for that phase.
"Named" without reading = not loaded. Every skill listed = must be read.

### Phase A — Tenant Foundation (FLOW-30 / FLOW-08 Family 27)

```
MANDATORY (read at session start):
  code-execution--phase-preflight-SKILL.md       (SK-457) — preflight checks
  planning--change-propagation-SKILL.md          (SK-440) — blast radius before any file change
  code-execution--flow-implementation-guide-SKILL.md     — DNA rules reference

LOAD BEFORE Phase A implementation:
  planning--temporal-behavior-design-SKILL.md    (SK-503) — lifecycle state machine design
  planning--shared-infrastructure-design-SKILL.md (SK-504) — index naming convention
  qa--data-flow-integrity-SKILL.md               (SK-500) — tenant-scoped index verification
  planning--prerequisite-chain-SKILL.md          (SK-458) — deprovision cascade ordering

REFERENCE DOCUMENTS (read once at start, keep open):
  docs/flow-plan-preparation/XIIGEN-IMPLEMENTATION-PROTOCOL-v1.md  ← this file
  docs/flow-plan-preparation/XIIGEN-ARCHITECTURAL-DECISION-ADDENDUM.md
  server/fixtures/indices/xiigen-byok-keys.json  ← update schema here
```

### Phase B — Multi-Tenant Fabric Fix (FLOW-08 GAPs 1–4)

```
MANDATORY:
  code-execution--phase-preflight-SKILL.md       (SK-457)
  planning--change-propagation-SKILL.md          (SK-440) — blast radius: fabric changes affect ALL flows

LOAD BEFORE Phase B implementation:
  planning--freedom-machine-classification-SKILL.md (SK-451) — what is MACHINE vs FREEDOM
  planning--simulation-protocol-SKILL.md         (SK-441) — trace tenant isolation path per handler
  planning--four-tier-decision-classification-SKILL.md (SK-510) — classify index naming decision
  code-execution--generated-code-review-SKILL.md — review naming convention compliance

REFERENCE DOCUMENTS:
  docs/flow-plan-preparation/XIIGEN-IMPLEMENTATION-PROTOCOL-v1.md  ← this file
  Section 9 of this doc: FLOW-08 Architecture (F244-F271 interface specs)
```

### Phase C — Provider Pool + SK-523 Phase 0

```
MANDATORY:
  code-execution--phase-preflight-SKILL.md       (SK-457)
  code-execution--node-convergence-SKILL.md      (SK-435) — PATH B: how pool wires into convergence

LOAD BEFORE Phase C implementation:
  planning--algorithm-as-service-SKILL.md        (SK-497) — rotation algorithm design
  planning--convergence-round-design-SKILL.md    (SK-452) — how providers map to convergence roles
  planning--confidence-lifecycle-design-SKILL.md (SK-512) — how planning-decisions index accumulates
  code-execution--learning-signal-capture-SKILL.md       — how planning decisions are stored

REFERENCE DOCUMENTS:
  docs/flow-plan-preparation/XIIGEN-ARCHITECTURAL-DECISION-ADDENDUM.md
    Section: Two-Layer Context — generator vs challenger provider separation
  server/src/engine/node-handlers/convergence.handler.ts
    (read before modifying — understand existing injection points)
  Section 9 of this doc: SK-523 role assignment constraints
```

### Phase D — FLOW-26 Self-Development Loop

```
MANDATORY:
  code-execution--phase-preflight-SKILL.md       (SK-457)
  self--extension-session-type-SKILL.md          (SK-509) — this IS a self-extension session
  self--capability-state-reader-SKILL.md         (SK-505) — read state before planning

LOAD BEFORE Phase D implementation:
  self--gap-to-proposal-SKILL.md                 (SK-506) — gap classification protocol
  planning--ai-decision-pipeline-design-SKILL.md (SK-513) — meta-flow AI pipeline design
  planning--learning-loop-closure-SKILL.md       (SK-515) — closing the loop from decision to learning
  self--implementation-integrity-SKILL.md        (SK-507) — verify gap closed after build

REFERENCE DOCUMENTS:
  Section 9 of this doc: FLOW-26 factory specs (F1075-F1102)
  docs/flow-plan-preparation/XIIGEN-SESSION-LOAD-PLAN-v3.md
    Section: THREE-SIGNAL TEST (used in gap detector threshold)
```

### Phase E — Integration + Full Live Test

```
NOTE: BUG-002 (grade formula) already fixed in commit 595938e (Skills_Creation_Claude).
      Option B (planner prompt dependency notation) + Option C (weighted additive formula)
      implemented. 13/13 planner.handler.spec.ts tests pass.
      Phase E = Integration E2E test only (not grade formula re-implementation).

MANDATORY:
  code-execution--phase-preflight-SKILL.md       (SK-457)
  planning--qa-session-type-SKILL.md             (SK-481) — QA gates before merge
  code-execution--test-failure-triage-SKILL.md   (SK-473) — triage any new failures

LOAD BEFORE Phase E implementation:
  planning--simulation-protocol-SKILL.md         (SK-441) — simulate full tenant run before coding
  qa--user-journey-acceptance-testing-SKILL.md   (SK-499) — end-to-end journey test

REFERENCE DOCUMENTS:
  docs/flow-plan-preparation/XIIGEN-DESIGN-VISION-plain-language.md
    Section: REQUIRED ABILITIES — Phase A through D (acceptance criteria)
  docs/flow-plan-preparation/XIIGEN-SESSION-LOAD-PLAN-v3.md
    Section: THREE-SIGNAL TEST
  Section 2 Tier 4 of this doc: Live test PASS/STOP criteria
```

---

## 4. IMPLEMENTATION PROTOCOL PER PHASE

### Protocol Steps (apply to every phase)

```
STEP 0 — PREFLIGHT (before any code)
  □ git branch --show-current  → must show: crazy-shannon (or Skills_Creation_Claude for direct work)
  □ npx tsc --noEmit           → must show: 0 errors
  □ npx jest --passWithNoTests → must show: 0 failures
  □ Read all MANDATORY skills for this phase (view tool)
  □ Read all REFERENCE DOCUMENTS for this phase (view tool)
  □ State output contract: "Phase X is done when [one sentence]"

STEP 1 — BLAST RADIUS (SK-440 before any file modification)
  □ List every file being modified
  □ List every file that imports those files
  □ List every test that exercises modified code
  □ Confirm: no unintended breaking changes in the blast radius

STEP 2 — IMPLEMENT
  □ Write code in crazy-shannon worktree (or main repo if on Skills_Creation_Claude)
  □ Never hardcode: model names, API keys, tenantId values, index names
  □ Index names: always ${tenantId}-${indexName} for tenant-scoped data
  □ Every new service: implements existing fabric interface or creates new interface first
  □ DNA-5: every method that accesses data reads tenantId from ALS — never receives it as parameter

STEP 3 — UNIT TESTS
  □ Write spec file in same directory as implementation
  □ Minimum tests: 1 happy path, 1 DNA-3, 1 DNA-8, 1 DNA-5, 1 negative
  □ Run: npx jest --testPathPatterns="[filename].spec.ts" --verbose
  □ Expected: all pass, 0 failures

STEP 4 — E2E TESTS
  □ Write e2e spec in server/test/e2e/[feature]/
  □ Use makeInMemoryDb() + makeInMemoryQueue() factories
  □ Must include: tenant isolation test, call-order DNA-8 test, idempotency test
  □ Run: npx jest --testPathPatterns="[feature].e2e.spec.ts" --verbose --runInBand
  □ Expected: all pass, 0 failures

STEP 5 — UI TESTS (if component was added or changed)
  □ Write spec in same directory as component
  □ Mock all fetch calls
  □ Must include: loading state, error state, empty/invalid input
  □ Run: cd client && npx jest --testPathPatterns="[ComponentName].spec.tsx" --verbose
  □ Expected: all pass, 0 failures

STEP 6 — FULL SUITE
  □ cd server && npx jest --passWithNoTests 2>&1 | tail -5
  □ Expected: 0 new failures (pre-existing known failures listed in ISSUE INVENTORY)
  □ cd client && npx jest --passWithNoTests 2>&1 | tail -5
  □ Expected: 0 failures

STEP 7 — COMPILE CHECK
  □ cd server && npx tsc --noEmit 2>&1 | tail -3
  □ Expected: no output (0 errors)

STEP 8 — LIVE TEST (Phase C completion and beyond)
  □ Ensure server/.env (or project root .env) has real API keys
  □ Rebuild: npm run build
  □ Start server with env vars: env $(grep -v '^#' ../.env | xargs) node dist/main.js
  □ Run live-test.sh
  □ All PASS criteria met (see Section 2, Tier 4)
  □ If any STOP criterion met: fix before continuing

STEP 9 — DEFINITION OF DONE CHECK
  □ Run definition of done checklist for this phase (see Section 5)
  □ All boxes checked

STEP 10 — COMMIT AND MERGE
  □ git add [changed files — specific, never git add -A]
  □ git commit -m "DEV-XX Phase X: [one sentence summary]\n\nCo-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
  □ git push origin crazy-shannon (if on worktree) OR Skills_Creation_Claude (if on main)
  □ If on worktree: merge to Skills_Creation_Claude (see Section 6)

⛔ STOP — present deliverables. Await Luba approval before next phase.
```

---

## 5. DEFINITION OF DONE PER PHASE

### Phase A — MT Foundation Kernel + FLOW-08 Layer A/B ✅ DONE when:

**STEP A0 — MT Foundation kernel fixes (FIX 1–7 from MT_FOUNDATION_STANDARD_P26)**
```
□ server/src/kernel/mt/tenant-key-generator.ts — generateDocId, generateIdempotencyKey
□ server/src/kernel/mt/tenant-context.middleware.ts — validates X-Tenant-Id on every request
□ server/src/kernel/mt/tenant-registry.interface.ts + in-memory impl — Component 20 of MicroserviceBase
□ enforceScope() returns DataProcessResult (never throws) — FIX 3 verified
□ FREEDOM config wired to DATABASE FABRIC (not in-memory dict) — FIX 7 verified
□ guardQuota() hooked into MicroserviceBase — FIX 5 verified
□ Grep check: grep -rn "new Error.*SCOPE_VIOLATION\|throw.*tenantId" server/src/kernel/ = 0 hits
```

**STEP A1 — FLOW-08 Layer A: Tenant Control Plane (F244-F251)**
```
□ POST /api/tenant/provision creates xiigen-byok-keys entry with providers[] array
□ GET /api/tenant/:id returns tenant lifecycle state
□ POST /api/tenant/deprovision deletes ALL tenant-scoped data across all indices
□ Deprovision: byok-keys entry deleted LAST (verified by call-order test)
□ Dev tenant seeder: if DEFAULT_ANTHROPIC_KEY set in .env, 'default' tenant exists at startup
□ xiigen-byok-keys fixture updated: providers[] schema (id, type, encryptedKey, availableModels, addedAt)
□ No 'capabilities' field in schema — FLOW-26/30 writes that later
□ Document IDs use TenantKeyGenerator: "${tenantId}::${uuid}" — no raw uuidv4()
```

**STEP A2 — FLOW-08 Layer B: Pluggable Provider Adapters (F252-F259)**
```
□ ITenantProviderPoolFabric interface — getPool(tenantId) returns ProviderPool
□ Provider keys stored encrypted (TENANT_KEY_ENCRYPTION_SECRET from .env) — not raw key strings in ES
□ Pool resolution from xiigen-byok-keys by tenantId
```

**Tests for Phase A:**
```
□ Unit tests: tenant-key-generator.spec.ts — 4+ tests
□ Unit tests: tenant-context.middleware.spec.ts — 4+ tests (missing header, suspended, active)
□ Unit tests: tenant-lifecycle.service.spec.ts — 8+ tests including isolation + cascade
□ E2E tests: tenant-lifecycle.e2e.spec.ts — 6+ tests
□ tsc --noEmit: 0 errors
□ Full suite: 0 new failures
□ Grep check: grep -rn "\.create(tenantId\|raw.*uuid\|uuidv4()" server/src/kernel/ = 0 hits
```

### Phase B — Multi-Tenant Fabric Fix ✅ DONE when:

```
□ All fabric interfaces have zero tenantId parameters in method signatures
□ All fabric implementations read tenantId from AsyncLocalStorage (cls)
□ Tenant-scoped index naming: ${tenantId}-listings, ${tenantId}-catalog, ${tenantId}-planning-decisions
□ State machine document key includes tenantId prefix: ${tenantId}:listing-state:${listingId}
□ validate.handler.ts has 4 new named checks:
    marketplace_fabric_no_tenantid_param
    listing_state_key_has_tenant_prefix
    catalog_index_is_tenant_scoped
    listing_feed_is_tenant_scoped
□ Blast radius: all existing tests still pass after interface signature changes
□ Grep check: grep -rn "\.create(tenantId\|\.index({ tenantId" server/src/fabrics/ = 0 hits
□ Unit tests: listing.service.spec.ts — 6+ tests
□ E2E tests: fabric-isolation.e2e.spec.ts — 4+ tests including cross-tenant
□ tsc --noEmit: 0 errors
□ Full suite: 0 new failures
```

### Phase C — Provider Pool + SK-523 ✅ DONE when:

```
□ ITenantProviderPoolFabric interface created and registered in fabrics module
□ TenantProviderPoolService resolves pool from xiigen-byok-keys
□ ProviderConfigSelector Phase 0: different combinations on run 1 vs run 2
□ ProviderConfigSelector constraint: generatorA ≠ generatorB ≠ generatorC (different providers)
□ ProviderConfigSelector constraint: judge provider ≠ all generator providers
□ ConvergenceHandler no longer uses singleton IAiProvider — uses pool per request
□ xiigen-planning-decisions: performance record written after each convergence run
□ Unit tests: provider-config-selector.service.spec.ts — 8+ tests
□ E2E tests: provider-rotation.e2e.spec.ts — 4+ tests
□ LIVE TEST: two consecutive runs produce different planning-decisions entries
□ LIVE TEST: xiigen-planning-decisions has 2 entries after 2 runs
□ tsc --noEmit: 0 errors
□ Full suite: 0 new failures
□ Grep check: grep -rn "process.env\[.DEFAULT_ANTHROPIC" server/src/ | grep -v "main.ts\|seeder\|module" = 0
```

### Phase D — FLOW-26 Self-Development ✅ DONE when:

```
□ CapabilityGapDetector: returns gaps for archetype+combination with grade < 0.70 over minSamples
□ CapabilityGapDetector: returns empty for grade 0.71-0.84 (quality issue, not a gap)
□ MetaFlowContractGenerator: calls PlannerHandler with correct context package (INTENT = gap description)
□ MetaFlowContractGenerator: storeDocument to xiigen-meta-flow-contracts BEFORE emit
□ BFAConflictRegistrar: returns failure on task-type range overlap
□ BFAConflictRegistrar: writes to xiigen-engine-contracts on clean registration
□ CapabilityGapScheduler: triggers after N runs (FREEDOM config key: gap.detection.min_runs, default 10)
□ Unit tests: 3 spec files (detector, generator, registrar), 5+ tests each, all pass
□ E2E tests: gap-detection.e2e.spec.ts — seed 10 planning-decisions below threshold,
    assert contract generated and BFA registration attempted
□ tsc --noEmit: 0 errors
□ Full suite: 0 new failures
□ server/fixtures/indices/xiigen-meta-flow-contracts.json: index mapping present
```

### Phase E — Integration + Full Live Test ✅ DONE when:

```
□ NOTE: BUG-002 grade formula already done (commit 595938e) — do not re-implement
□ Full E2E flow: provision → cycle-chain (depth 2) → gap-detection → deprovision — all pass
□ Live run: grade >= 0.85 for standard user registration intent
□ Three-signal test: at least 1 of 3 signals shows genuine AI inference (not all 0)
□ E2E tests: tenant-full-run.e2e.spec.ts — 8+ tests
□ E2E tests: gap-detection.e2e.spec.ts — from Phase D, extended with full chain
□ tsc --noEmit: 0 errors
□ Full suite: 0 new failures
□ LIVE TEST: all PASS criteria in Section 2 Tier 4 met
```

---

## 6. BRANCH WORKFLOW

### Rule: all work on crazy-shannon, merge to Skills_Creation_Claude after DEFINITION OF DONE

```bash
# Start of phase — verify branch
git checkout claude/crazy-shannon
git pull origin claude/crazy-shannon
git branch --show-current  # must show: crazy-shannon

# During phase — commit incrementally
git add [specific files — never git add -A or git add .]
git commit -m "DEV-XX Phase X [step]: [summary]

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
git push origin crazy-shannon

# End of phase — after DoD passes
# Merge to Skills_Creation_Claude — after Luba approves
git checkout Skills_Creation_Claude
git pull origin Skills_Creation_Claude
git merge claude/crazy-shannon --no-ff -m "DEV-XX merge(crazy-shannon → Skills_Creation_Claude): Phase X complete

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"

# Conflict resolution rule: take crazy-shannon version (it is forward-moving)
# Exception: if Skills_Creation_Claude has a fix that crazy-shannon lacks

git push origin Skills_Creation_Claude
```

### Conflict resolution checklist (before every merge):
```
□ Run: git diff Skills_Creation_Claude...claude/crazy-shannon --name-only
□ For each conflicting file: read both versions before resolving
□ Keep crazy-shannon version unless Skills_Creation_Claude has a fix crazy-shannon is missing
□ After merge: npx tsc --noEmit + npx jest — must show 0 failures
□ State resolved files in merge commit message
```

---

## 7. ISSUE INVENTORY PROTOCOL

At every ⛔ STOP, before presenting deliverables:

```
## ISSUE INVENTORY

| # | Issue | Severity | Status |
|---|-------|----------|--------|
| 1 | [description] | BLOCKING / SIGNIFICANT / ADVISORY | FIXED / DEFERRED (reason) |

DEFERRED rules:
  - BLOCKING issues cannot be deferred without explicit Luba approval
  - SIGNIFICANT issues deferred: must have CARRY-FORWARD entry in next phase
  - ADVISORY: may be deferred to next phase with note
  - "Out of scope" is NOT a valid deferral reason
  - "Low priority" is NOT a valid deferral reason

FIXED rule:
  - Grep for old pattern: grep -rn "[old value]" server/src/ — must return 0 hits
  - Run test that exercises the fix — must pass
```

**Known pre-existing deferrals (approved by Luba):**
```
| 1 | BUG-003 env var naming (.env.example uses DEFAULT_ANTHROPIC_KEY,   | ADVISORY | DEFERRED to Phase A
|   | server reads DEFAULT_ANTHROPIC_KEY — correct, but .env.example     |          | (dev tenant seeder
|   | says ANTHROPIC_API_KEY in comments which is wrong)                 |          | clarifies at startup)
| 2 | SK-523 (config selection) deferred — no DPO triples exist yet       | ADVISORY | DEFERRED to Phase C
| 3 | GAP-4 recursive spawn — EXPAND branch does not call PlannerHandler  | ADVISORY | DEFERRED post Phase E
```

---

## 8. PINECONE + OPEN SOURCE MODEL INTEGRATION

### Pinecone (for RAG — SK-435 PRIOR_ART queries)

When PINECONE_API_KEY is present in .env:
```typescript
// RAG_PROVIDER=pinecone in .env activates this path
// Index naming: `${tenantId}-rag-patterns` namespace in Pinecone
// Fallback: in_memory if Pinecone unreachable
// All Pinecone calls through IRagFabric — never direct @pinecone-database/pinecone import
```

Named check: `rag_provider_is_fabric_not_direct`
No direct `@pinecone-database/pinecone` imports in handler code.
All Pinecone calls go through `@Inject(RAG_SERVICE) private readonly rag: IRagService`.

### Open Source Models (Ollama / local inference)

When LOCAL_MODEL_URL is present in .env (e.g., http://localhost:11434):
```typescript
// Provider type: 'local' in byok-keys entry
// SK-523 treats local models as valid pool participants for generatorA/B/C roles
// Phase 0 rotation includes local models equally with cloud providers
// Performance recorded to planning-decisions same as cloud providers
// No special treatment — just another pool entry
```

Live test addition for open source models:
```bash
# Add local model to tenant pool
curl -sf -X POST "$BASE_URL/api/tenant/provision" \
  -H "Content-Type: application/json" \
  -H "x-tenant-id: oss-test" \
  -d "{
    \"tenantId\": \"oss-test\",
    \"providers\": [
      {\"id\": \"p1\", \"type\": \"anthropic\", \"key\": \"$DEFAULT_ANTHROPIC_KEY\",
       \"availableModels\": [\"claude-sonnet-4-6\"], \"addedAt\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"},
      {\"id\": \"p4\", \"type\": \"local\", \"key\": \"\",
       \"endpoint\": \"http://localhost:11434\",
       \"availableModels\": [\"llama3:8b\", \"codellama:13b\"],
       \"addedAt\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"}
    ]
  }"
```

---

## 9. FLOW ARCHITECTURE REFERENCE (from xiigen-docs.zip)

This section maps the Phase A–E implementation plan to the existing factory specs in the xiigen docs.
Use these as interface contracts — the implementation must match these specs.

### ⚠️ CRITICAL CORRECTIONS (supersedes session file content)

The plan-preparation session files (`FLOW-08-STEP-1-INVARIANTS.md` etc.) contain stale content.
The authoritative source is `ENGINE_ARCHITECTURE_MERGED.md` in the xiigen docs zip.

| Session files said (WRONG) | Master plan says (CORRECT) |
|---------------------------|---------------------------|
| FLOW-08 = "Multi-Tenant State Machine / Marketplace" T139-T168 | FLOW-08 = **Multi-Tenant Payment Processing** F244-F271, T83-T98 |
| FLOW-30 = "Tenant Lifecycle Manager" T470-T479 | FLOW-30 = **PromptOps — Self-Learning Prompts** F1248-F1270, T468-T488 |

### MT_FOUNDATION_STANDARD (P26) — Kernel Patch — IMPLEMENT BEFORE FLOW-08

`MT_FOUNDATION_STANDARD_P26.md` is a **kernel-level patch** fixing 7 structural defects in MicroserviceBase.
**These 7 fixes must be implemented BEFORE FLOW-08 Layer A.** They live in `server/src/kernel/mt/`.

```
FIX 1: TenantKeyGenerator  →  server/src/kernel/mt/tenant-key-generator.ts
  All document IDs: "${tenantId}::${uuid}" — raw uuidv4() FORBIDDEN
  generateIdempotencyKey(tenantId, operationId, payload): "${tenantId}::${operationId}::${payloadHash}"

FIX 2: Tenant-Scoped Idempotency Keys
  IIdempotencyStore — Redis key: "idempotency:{tenantId}:{key}" with TTL
  Two tenants submitting identical payloads → DIFFERENT keys

FIX 3: enforceScope() — DNA-3 fix
  Was: throw new Error('SCOPE_VIOLATION') — violated DNA-3 at kernel level
  Now: return DataProcessResult.failure('SCOPE_VIOLATION', ...) — never throws

FIX 4: ITenantRegistry as Component 20 of MicroserviceBase
  server/src/kernel/mt/tenant-registry.interface.ts
  Methods: provisionTenant, getTenant, validateTenantExists, suspendTenant, deleteTenant, checkQuota
  @Inject(TENANT_REGISTRY) — injected into all services via MicroserviceBase

FIX 5: guardQuota(registry, tenantId, resource, amount)
  Resources: "storage" | "ai_tokens" | "queue_messages" | "active_flows"
  Called BEFORE any AI generate() call — DNA-5 compliance

FIX 6: TenantContextMiddleware
  server/src/kernel/mt/tenant-context.middleware.ts
  Every request: reads X-Tenant-Id → validates against ITenantRegistry
  403 for: missing header, unknown tenant, suspended/deleted

FIX 7: FREEDOM Config DATABASE FABRIC backed
  Was: in-memory dict — lost on restart
  Now: ES-backed 3-tier resolution (tenant override → global default → hardcoded fallback)
```

### FLOW-08 — Multi-Tenant Payment Processing (F244–F271)

**FAMILY 27 — Tenant Control Plane (Phase A interfaces)**

| Factory | Interface | Phase A delivers |
|---------|-----------|-----------------|
| F244 | ITenantRegistryService | POST /api/tenant/provision + GET /api/tenant/:id |
| F246 | ITenantIsolationBindingService | Index alias setup per tenant at provision time |
| F248 | ITenantOnboardingOrchestratorService | 8-state onboarding machine (simplified for MVP) |
| F249 | ITenantGraduationService | Future: pool→silo migration (deferred) |
| F250 | ITenantAuditService | Append-only audit of all provision/deprovision events |
| F251 | ITenantEntitlementService | Quota enforcement: storage, ai_tokens, active_flows |

**Default isolation model (DR-21):** shared_schema with tenant-scoped index naming.
`${tenantId}-listings`, `${tenantId}-catalog`, `${tenantId}-planning-decisions` — NOT shared indices.

**FAMILY 28 — Provider Adapter Layer (Phase C interfaces)**

Key detail from DR-23: provider adapters use strategy pattern.
- `IEncryptionKeyManagementService` (F259): DEK envelope — key material NEVER in Elasticsearch.
- For Phase C: encrypted keys in byok-keys must NOT store raw key strings in ES.
  Store: `{ encryptedKey: '<encrypted>', encryptionRef: '<kms-ref>' }` — not raw key.
  Dev mode: use TENANT_KEY_ENCRYPTION_SECRET from .env for symmetric encryption.

**FAMILY 29 — Tenant-Aware Operations (Phase B + C)**

| Factory | Interface | Phase |
|---------|-----------|-------|
| F260 | IIdempotencyKeyService | B: idempotency across all fabric calls |
| F261 | ITenantRateLimitingService | C: rate limit per tenant per AI provider |
| F268 | ITenantScopedFlowRunnerService | C: wraps cycle-chain with quota + rate limit |

**Phase B — GAP fixes required (per FLOW-08 audit):**
```
GAP-1 (CRITICAL): Remove tenantId from all fabric method signatures
  BEFORE: create(tenantId: string, data: Record<string,unknown>)
  AFTER:  create(data: Record<string,unknown>)  // tenantId from ALS in implementation

GAP-2: State machine document key must include tenantId prefix
  REQUIRED: `${tenantId}:listing-state:${listingId}`
  FORBIDDEN: `listing-state:${listingId}` (no tenant prefix)

GAP-3: Tenant-scoped ES index naming (DR-21 compliance)
  REQUIRED: `${tenantId}-catalog` not `xiigen-catalog`
  Allows: `xiigen-cycle-visibility` for engine-internal indices (not tenant-specific)

GAP-4: Marketplace visibility boundary — explicit MACHINE constraint
  The listing feed is siloed per tenant. Buyer in tenant-A NEVER sees tenant-B listings.
  State this as a named check: listing_feed_is_tenant_scoped

GAP-5 (BLOCKING): Per-tenant key isolation — resolved by Phase C (pool fabric)
  All cycle-chain runs share global keys until Phase C. Acceptable during Phase A-B.

GAP-6: Extend arbiter checklist with 4 specific checks (not just 1 ALS check)
  □ tenantId read from ALS
  □ ES index names are tenant-scoped
  □ Redis keys are tenant-prefixed
  □ State machine document key includes tenantId
```

---

### FLOW-26 — Self-Developing Meta-Flow Engine (F1075–F1102)

**Phase D implements the core of this flow.**

**FAMILY 154 — Gap Detection (Phase D)**

Key constraints from the factory specs:

```typescript
// F1075 ICapabilityGapDetectorService
// Gap types to detect:
type GapType = 'MISSING_FACTORY' | 'MISSING_OPERATION' | 'MISSING_PROVIDER';

// Thresholds (FREEDOM config):
// gap.detection.min_samples = 5 (minimum runs before gap can be declared)
// gap.detection.grade_threshold = 0.70 (below this = GAP, not just quality)
// gap.detection.quality_threshold = 0.85 (below this = quality concern)

// CRITICAL: Cross-tenant gap detection FORBIDDEN
// Each tenant's performance data is isolated — no cross-tenant aggregation
```

**FAMILY 155 — Contract Generator (Phase D)**

Every generated contract MUST include (from F1083/F1084):
- `fabricResolution` field — missing = BUILD FAILURE
- `ARCHETYPE`, `FACTORY_DEPS`, `FABRIC_RESOLUTION`, `AF_CONFIGURATION`, `BFA_VALIDATION`, `IRON_RULES`, `QUALITY_GATES`
- Stub contracts (empty bodies) = BUILD FAILURE

**FAMILY 156 — Genesis Loop (Phase D)**

```
Promotion ladder stages (MACHINE — non-configurable):
  DRAFT → WIRED → VALIDATED → INJECTED → MINIMAL → CORE
  CORE promotion ALWAYS requires human approval — no config can override (F1102 / DR-188)
```

**Reuse thresholds (DR-192 — MACHINE):**
```
COPY:   similarity ≥ 0.90 → reuse as-is
ADAPT:  similarity ≥ 0.60 → adapt existing
REWRITE: below 0.60 → generate from scratch
Reuse scan MUST run before any genesis (F1079 constraint)
```

**Evidence bundle — 12 required sections before GitOps (DR-187):**
```
1. factorySpec  2. taskTypeContract  3. eventSchemas  4. bfaDraft
5. codeBundle  6. unitTestResults  7. e2eTestResults  8. dnaComplianceMatrix
9. securityScanReport  10. sandboxDeployLog  11. flowTemplate  12. promotionRecommendation
Missing any = BUILD FAILURE
```

---

### FLOW-30 — PromptOps: Self-Learning Prompt Engineering (F1248–F1270)

**Note on numbering:** The user's implementation plan refers to FLOW-30 as "Tenant Lifecycle Manager"
which corresponds to FLOW-08 Family 27 (F244-F251) in the xiigen docs. The xiigen docs' FLOW-30
is a separate PromptOps flow. Both are relevant:
- Phase A implements tenant lifecycle (FLOW-08 Family 27)
- FLOW-30 (PromptOps) is deferred until Phase D/E learnings produce training data

**FLOW-30 PromptOps — key constraints for future reference:**

```
DD-298: PromptOps RAG MUST be separate from Operational RAG
  promptops_rag_{tenantId}  ≠  operational_rag_{tenantId}
  Cross-contamination risk: prompt injection, PII leakage, retrieval poisoning

DD-299: ACTIVE promotion requires multi-gate — single LLM-as-judge CANNOT promote alone
DD-300: Prompt versions are IMMUTABLE after creation — no UPDATE on text field
DD-301: Bandit routing, max 3 active variants per context
DD-302: Cross-tenant learning requires sensitivityClass = "public" or "internal-aggregated"

Tenant-scoped indices (14 per tenant):
  prompt_templates_{tenantId}     prompt_versions_{tenantId}
  prompt_policies_{tenantId}      prompt_patches_{tenantId}
  judge_rubrics_{tenantId}        prompt_traces_{tenantId}
  prompt_metrics_{tenantId}       prompt_audit_{tenantId}
  promptops_rag_{tenantId}        eval_cases_{tenantId}
  eval_suites_{tenantId}          canary_assignments_{tenantId}
  promotion_decisions_{tenantId}  tenant_prompt_profiles_{tenantId}
```

**FLOW-30 activation:** Becomes active once SK-523 Phase 0 rotation produces enough
planning-decisions data for the Critic→Editor→Guard optimization pipeline to have
training evidence. Estimated: after Phase C completes and 20+ cycle-chain runs exist.

---

### MT_FOUNDATION_STANDARD — 9 Iron Rules (from P26 translation standard)

These apply to ALL phases. Violations = BUILD FAILURE.

```
IR-P26-1: Raw uuidv4() FORBIDDEN for document IDs — use TenantKeyGenerator
           Format: {tenantId}::{uuid} or {tenantId}::{operationId}::{payloadHash}

IR-P26-2: Idempotency keys must use TenantKeyGenerator
           Redis key: idempotency:{tenantId}:{key} with TTL

IR-P26-3: ScopeEnforcer.enforceScope() returns DataProcessResult — never throws
           Error code: SCOPE_VIOLATION

IR-P26-4: ITenantRegistry must be Component 20 of MicroserviceBase
           All services that write data inherit tenantRegistry, keyGen, idempotency

IR-P26-5: AI calls must check ai_tokens quota before generate()
           Call guardQuota(registry, tenantId, 'ai_tokens', estimatedTokens) first

IR-P26-6: TenantContextMiddleware on EVERY request
           Returns 403 for: missing x-tenant-id header, unknown tenant, suspended/deleted

IR-P26-7: FREEDOM config DATABASE FABRIC backed (not in-memory dict)
           3-tier: (1) tenant override, (2) global default, (3) hardcoded fallback
           Survives restart

IR-P26-8: No per-flow tenant isolation family may ship
           Tenant isolation is a shared kernel concern, not flow-specific

IR-P26-9: Bootstrap fails fast if MT_CONTEXT phase fails
           ITenantRegistry + IIdempotencyStore + FreedomConfig must be reachable at startup
```

---

### Additional Related Flows (infrastructure dependencies)

The following flows are foundational infrastructure that Phases A-E depend on.
FLOW-25 and FLOW-27 are ALREADY COMPLETE — reuse, do not reimplement.

| Flow | Status | Families | What it provides | Phase dependency |
|------|--------|----------|-----------------|-----------------|
| **FLOW-19** | ✅ Complete | CI/CD | Git/CI operations (F697-F733) | FLOW-26 Zone 5 (GitOps) reuses |
| **FLOW-25** | ✅ Complete | BFA Governance | Cross-flow conflict detection, CF rules registry | FLOW-26 D: BFA registration |
| **FLOW-27** | ✅ Complete | Human Gate | EP-6 Human Interaction Gate (F1103-F1128) | FLOW-26 D: promotion ladder; FLOW-30 canary |
| **FLOW-29** | ✅ Complete | Adaptive RAG | 72-factory deep research engine (F1176-F1247) | FLOW-26 Zone 1 gap detection; FLOW-30 meta-memory |
| FLOW-08 | 🔴 Needed | 27-29 | Tenant control plane + provider adapters | Phase A + B |
| FLOW-26 | 🔴 Needed | 154-159 | Self-developing meta-flow engine | Phase D |
| FLOW-30 | 🔴 Needed | 185-190 | PromptOps self-learning + SK-523 Phase 2 | Post-Phase E |

**Corrected dependency chain:**
```
MT_FOUNDATION kernel (P26 — 7 fixes to MicroserviceBase)
    ↓
FLOW-08 Layer A (ITenantRegistry + TenantContextMiddleware + audit)     → Phase A
FLOW-08 Layer B (ITenantProviderPoolFabric — pluggable adapters)       → Phase A/C
FLOW-08 Layer C (quota, rate limiting, tenant-scoped flow execution)   → Phase B/C
    ↓
SK-523 Phase 0 (uses Layer B pool — systematic provider rotation)
Records → xiigen-planning-decisions
    ↓
FLOW-26 Zone 1-2 (reads planning-decisions, detects gaps, generates contracts)
FLOW-26 Zone 3 (IGenesisLoopService — AF-1→AF-9, judge ≥ 0.8)
FLOW-26 Zone 4-6 (sandbox → GitOps from FLOW-19 → promotion + human gate from FLOW-27)
    ↓
FLOW-30 Family 187-188 (prompt optimization via FLOW-29 RAG + canary promotion)
FLOW-30 Family 190 (cross-tenant learning aggregation)
    ↓
SK-523 Phase 1/2 (uses FLOW-30 outputs for intelligent provider selection)
```

**BYOK key rotation (from CF-247):**
- F562.RotateKeyAsync emits `ByokKeyRotated` event
- Old key must NOT be revoked until `PiiReencryptionCompleted` received
- Phase A: implement key storage with rotation support in schema
- Dev mode: no rotation needed — single key per provider per tenant

---

*End of XIIGEN-IMPLEMENTATION-PROTOCOL-v1.md*
*Version: 1.0 — updated 2026-04-05 with FLOW-08/26/30 architecture context*
*This document is the single reference for all Claude Code sessions on Phases A-E.*
*Do not ask questions that are answered here. Do not skip steps.*
