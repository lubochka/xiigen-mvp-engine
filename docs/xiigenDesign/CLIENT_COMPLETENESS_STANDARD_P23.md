# XIIGen — Client Completeness Standard
## Phase 23: Per-Flow Endpoints, Hooks & Screens
## Track B — Foundation Standards
## Date: 2026-03-05 | Status: AUTHORITATIVE

---

> ### ⚠️ IMPLEMENTATION UPDATE (2026-04-14)
>
> This standard was written during the Python/FastAPI design phase.
> The live codebase implements the client in **React 18 + Vite 5 + Tailwind CSS + TypeScript**.
>
> **Actual implementation:**
> - 71 React page components across 31 directories in `client/src/pages/`
> - Per-flow pages follow semantic slug naming (e.g., `client/src/pages/marketplace-payments/`)
> - React Query hooks in `client/src/hooks/`
> - API client layer in `client/src/api/`
> - ~1,080 client tests via Vitest 4.1.4
> - Playwright e2e tests in `client/e2e/`
> - DynamicController pattern provides `/api/dynamic/{indexName}` endpoints (DNA-6)
>
> **The per-flow client contract pattern (endpoints + hooks + screens) is implemented
> as described, adapted to React 18 + Vite instead of React Native + Expo.**

---

## 1. Problem Statement

FLOW-21 shipped 49 services and 23 endpoints but the client layer was incomplete:

- `ENDPOINTS` registry had zero FLOW-21 routes — the DynamicController had no domain entries
- Client shipped without domain-specific screens — only generic scaffolding
- API hooks returned raw `unknown` payloads with no DNA-1 parser wrappers
- AppRouter required manual route registration per flow — adding a flow meant editing core router
- `/api/rag/search` and `/api/prompts/*` (P21/P22) had no client hooks or screens

**Fix:** Every module ships three client contract files. AppRouter auto-discovers routes from
installed module endpoint files. All hooks follow a typed `{ data, loading, error }` contract
with DNA-1 `parseDocument()` parsers. A `PromptsScreen` ships as part of the engine kernel.

---

## 2. Per-Flow Client Contract — Three Mandatory Files

```
modules/{domain-slug}/
├── {domain}.endpoints.ts      ← server-side: EndpointDefinition[] registered in ENDPOINTS
│
apps/web/src/
├── modules/{domain-slug}/
│   ├── use{Domain}.hooks.ts   ← React Query hooks with DNA-1 parsers
│   └── {Domain}Screen.tsx     ← screen component, auto-wired by AppRouter
```

All three files are generated together. A module missing any of them fails `VALIDATION_REPORT`.

---

## 3. EndpointDefinition — Server Side

```typescript
// Design path: packages/core/src/interfaces/endpoint-definition.interface.ts
// Actual: NestJS uses DynamicController at server/src/api/ (DNA-6 — no entity controllers)

export interface EndpointDefinition {
  /** HTTP method */
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

  /** Express/NestJS route path, e.g. "/api/forms/:formId/schema" */
  path: string;

  /**
   * Handler ID — maps to DynamicController handler registry.
   * Must be unique across all installed modules.
   */
  handlerId: string;

  /** Human-readable label shown in PromptsScreen and API docs */
  label: string;

  /** Module that owns this endpoint */
  domainId: string;

  /** Task type(s) this endpoint exercises, for AI generation context */
  taskTypeRefs?: string[];

  /** Whether X-Tenant-Id header is required — default true (DNA-5) */
  requiresTenantId?: boolean;

  /** Whether idempotency key header is required (DNA-7) */
  requiresIdempotencyKey?: boolean;

  /** DataProcessResult<T> shape of the response data field */
  responseShape?: Record<string, string>;
}
```

---

## 4. Module Endpoint File — forms-automation.endpoints.ts

```typescript
// modules/forms-automation/forms-automation.endpoints.ts
// REFERENCE IMPLEMENTATION

import { EndpointDefinition } from '@xiigen/core';

export const FORMS_AUTOMATION_ENDPOINTS: EndpointDefinition[] = [
  // ── Schema Authoring (F852) ──────────────────────────────────────────
  {
    method:               'POST',
    path:                 '/api/forms/:formId/schema',
    handlerId:            'formsStoreSchema',
    label:                'Store Form Schema',
    domainId:             'forms-automation',
    taskTypeRefs:         ['T307'],
    requiresTenantId:     true,
    requiresIdempotencyKey: true,
    responseShape:        { schemaId: 'string' },
  },
  {
    method:           'GET',
    path:             '/api/forms/:formId/schema',
    handlerId:        'formsGetSchema',
    label:            'Get Form Schema',
    domainId:         'forms-automation',
    taskTypeRefs:     ['T307'],
    requiresTenantId: true,
    responseShape:    { formId: 'string', schema: 'Record<string,unknown>', version: 'number' },
  },
  {
    method:           'GET',
    path:             '/api/forms/:formId/schema/versions',
    handlerId:        'formsSchemaVersions',
    label:            'List Schema Versions',
    domainId:         'forms-automation',
    requiresTenantId: true,
    responseShape:    { versions: 'Record<string,unknown>[]' },
  },

  // ── Entry Submission (F858) ──────────────────────────────────────────
  {
    method:               'POST',
    path:                 '/api/forms/:formId/entries',
    handlerId:            'formsSubmitEntry',
    label:                'Submit Form Entry',
    domainId:             'forms-automation',
    taskTypeRefs:         ['T308'],
    requiresTenantId:     true,
    requiresIdempotencyKey: true,
    responseShape:        { entryId: 'string' },
  },
  {
    method:           'GET',
    path:             '/api/forms/:formId/entries',
    handlerId:        'formsListEntries',
    label:            'List Form Entries',
    domainId:         'forms-automation',
    requiresTenantId: true,
    responseShape:    { entries: 'Record<string,unknown>[]', total: 'number' },
  },
  {
    method:           'GET',
    path:             '/api/forms/:formId/entries/:entryId',
    handlerId:        'formsGetEntry',
    label:            'Get Form Entry',
    domainId:         'forms-automation',
    requiresTenantId: true,
    responseShape:    { entry: 'Record<string,unknown>' },
  },
];
```

---

## 5. React Query Hooks — useForms.hooks.ts

```typescript
// apps/web/src/modules/forms-automation/useForms.hooks.ts
// REFERENCE IMPLEMENTATION — all hooks follow { data, loading, error } contract

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../api/api-client';
import { parseDocument } from '@xiigen/web-core';   // DNA-1: parse all API responses

// ── Types (Record-based — DNA-1) ─────────────────────────────────────────────

export type FormSchema  = Record<string, unknown>;
export type FormEntry   = Record<string, unknown>;
export type ApiError    = { code: string; message: string };

// ── Schema Hooks ─────────────────────────────────────────────────────────────

export function useFormSchema(formId: string) {
  return useQuery({
    queryKey: ['forms', formId, 'schema'],
    queryFn:  async () => {
      const res = await apiClient.get(`/api/forms/${formId}/schema`);
      return parseDocument(res.data.data) as FormSchema;   // DNA-1
    },
    enabled: !!formId,
  });
  // returns: { data: FormSchema | undefined, isLoading, error }
}

export function useFormSchemaVersions(formId: string) {
  return useQuery({
    queryKey: ['forms', formId, 'schema', 'versions'],
    queryFn:  async () => {
      const res = await apiClient.get(`/api/forms/${formId}/schema/versions`);
      const raw = res.data.data as unknown[];
      return raw.map(v => parseDocument(v as Record<string, unknown>));  // DNA-1
    },
    enabled: !!formId,
  });
}

export function useStoreSchema() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      formId,
      schema,
      idempotencyKey,
    }: { formId: string; schema: Record<string, unknown>; idempotencyKey: string }) => {
      const res = await apiClient.post(
        `/api/forms/${formId}/schema`,
        schema,
        { headers: { 'X-Idempotency-Key': idempotencyKey } },   // DNA-7
      );
      if (!res.data.isSuccess) throw { code: res.data.error, message: res.data.message };
      return res.data.data as { schemaId: string };
    },
    onSuccess: (_, { formId }) => {
      queryClient.invalidateQueries({ queryKey: ['forms', formId, 'schema'] });
    },
  });
}

// ── Entry Hooks ───────────────────────────────────────────────────────────────

export function useFormEntries(formId: string) {
  return useQuery({
    queryKey: ['forms', formId, 'entries'],
    queryFn:  async () => {
      const res = await apiClient.get(`/api/forms/${formId}/entries`);
      const raw = res.data.data?.entries as unknown[] ?? [];
      return raw.map(e => parseDocument(e as Record<string, unknown>));  // DNA-1
    },
    enabled: !!formId,
  });
}

export function useSubmitEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      formId,
      payload,
      idempotencyKey,
    }: { formId: string; payload: Record<string, unknown>; idempotencyKey: string }) => {
      const res = await apiClient.post(
        `/api/forms/${formId}/entries`,
        payload,
        { headers: { 'X-Idempotency-Key': idempotencyKey } },   // DNA-7
      );
      if (!res.data.isSuccess) throw { code: res.data.error, message: res.data.message };
      return res.data.data as { entryId: string };
    },
    onSuccess: (_, { formId }) => {
      queryClient.invalidateQueries({ queryKey: ['forms', formId, 'entries'] });
    },
  });
}
```

---

## 6. Screen Component — FormsScreen.tsx

```typescript
// apps/web/src/modules/forms-automation/FormsScreen.tsx
// REFERENCE IMPLEMENTATION — screen auto-wired by AppRouter via FORMS_AUTOMATION_ENDPOINTS

import React, { useState } from 'react';
import { useFormSchema, useFormEntries, useSubmitEntry } from './useForms.hooks';

interface FormsScreenProps {
  formId: string;
}

export default function FormsScreen({ formId }: FormsScreenProps) {
  const schema  = useFormSchema(formId);
  const entries = useFormEntries(formId);
  const submit  = useSubmitEntry();
  const [payload, setPayload] = useState<Record<string, unknown>>({});

  if (schema.isLoading || entries.isLoading) return <LoadingState />;

  if (schema.error) return (
    <ErrorState code={(schema.error as ApiError).code} message={(schema.error as ApiError).message} />
  );

  return (
    <div className="forms-screen">
      <SchemaPanel schema={schema.data} />
      <EntryList entries={entries.data ?? []} />
      <SubmitPanel
        onSubmit={(data) => submit.mutate({
          formId,
          payload: data,
          idempotencyKey: `${formId}::${crypto.randomUUID()}`,  // DNA-7
        })}
        isSubmitting={submit.isPending}
        error={submit.error as ApiError | null}
      />
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────

function SchemaPanel({ schema }: { schema?: Record<string, unknown> }) {
  if (!schema) return null;
  return (
    <section>
      <h2>Form Schema — v{schema['schemaVersion'] as number}</h2>
      <pre>{JSON.stringify(schema['fields'], null, 2)}</pre>
    </section>
  );
}

function EntryList({ entries }: { entries: Record<string, unknown>[] }) {
  return (
    <section>
      <h2>Entries ({entries.length})</h2>
      <ul>
        {entries.map(e => (
          <li key={e['entryId'] as string}>
            {e['entryId'] as string} — {e['status'] as string}
          </li>
        ))}
      </ul>
    </section>
  );
}

function SubmitPanel({
  onSubmit, isSubmitting, error,
}: {
  onSubmit: (data: Record<string, unknown>) => void;
  isSubmitting: boolean;
  error: ApiError | null;
}) {
  const [raw, setRaw] = useState('{}');
  return (
    <section>
      <h2>Submit Entry</h2>
      <textarea value={raw} onChange={e => setRaw(e.target.value)} rows={6} />
      {error && <p className="error">{error.code}: {error.message}</p>}
      <button
        onClick={() => { try { onSubmit(JSON.parse(raw)); } catch { /* invalid JSON */ } }}
        disabled={isSubmitting}
      >
        {isSubmitting ? 'Submitting…' : 'Submit'}
      </button>
    </section>
  );
}

function LoadingState()  { return <div>Loading…</div>; }
function ErrorState({ code, message }: ApiError) {
  return <div className="error">{code}: {message}</div>;
}
```

---

## 7. AppRouter — Auto-Discovery

```typescript
// apps/web/src/navigation/app-router.tsx
// Auto-discovers routes from all installed module endpoint files

import React, { lazy, Suspense } from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';

// Engine screens (always present)
import PromptsScreen   from '../screens/PromptsScreen';
import RagSearchScreen from '../screens/RagSearchScreen';
import DashboardScreen from '../screens/DashboardScreen';

// Module screens — auto-discovered at build time via Vite glob import
const MODULE_SCREENS = import.meta.glob('../modules/*/*.tsx', { eager: false });

/**
 * Builds routes from ENDPOINTS registry entries.
 * Each module's {domain}.endpoints.ts feeds the registry.
 * Screen resolved by convention: modules/{domainId}/{DomainPascalCase}Screen.tsx
 */
function buildModuleRoutes(): RouteObject[] {
  return Object.entries(MODULE_SCREENS).map(([path, importFn]) => {
    const slug    = path.match(/modules\/([^/]+)\//)?.[1] ?? 'unknown';
    const Screen  = lazy(importFn as () => Promise<{ default: React.ComponentType }>);
    return {
      path:    `/modules/${slug}`,
      element: <Suspense fallback={<div>Loading…</div>}><Screen /></Suspense>,
    };
  });
}

const router = createBrowserRouter([
  { path: '/',               element: <DashboardScreen /> },
  { path: '/prompts',        element: <PromptsScreen /> },
  { path: '/rag/search',     element: <RagSearchScreen /> },
  ...buildModuleRoutes(),
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
```

---

## 8. Engine Kernel Screens — PromptsScreen & RagSearchScreen

```typescript
// apps/web/src/screens/PromptsScreen.tsx
// Engine screen — shipped with kernel, not per-module

import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiClient } from '../api/api-client';
import { parseDocument } from '@xiigen/web-core';

export default function PromptsScreen() {
  const [taskType, setTaskType] = useState('T307');
  const [role, setRole]         = useState('genesis');

  const prompt = useQuery({
    queryKey: ['prompts', taskType, role],
    queryFn:  async () => {
      const res = await apiClient.get(`/api/prompts/${taskType}?role=${role}`);
      return parseDocument(res.data) as Record<string, unknown>;  // DNA-1
    },
  });

  const versions = useQuery({
    queryKey: ['prompts', taskType, role, 'versions'],
    queryFn:  async () => {
      const res = await apiClient.get(`/api/prompts/${taskType}/versions?role=${role}`);
      const raw = res.data.data as unknown[] ?? [];
      return raw.map(v => parseDocument(v as Record<string, unknown>));
    },
  });

  const updatePrompt = useMutation({
    mutationFn: async (content: string) =>
      apiClient.put(`/api/prompts/${taskType}`, { role, content, domainId: 'global' }),
  });

  return (
    <div className="prompts-screen">
      <h1>Prompt Management</h1>
      <div className="controls">
        <input value={taskType} onChange={e => setTaskType(e.target.value)} placeholder="Task Type (e.g. T307)" />
        <select value={role} onChange={e => setRole(e.target.value)}>
          {['genesis','review','judge','compliance','security'].map(r => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
      </div>

      {prompt.isLoading ? <p>Loading…</p> : (
        <div className="prompt-editor">
          <h2>Active Prompt — v{prompt.data?.['version'] as number}</h2>
          <textarea
            defaultValue={prompt.data?.['content'] as string}
            rows={12}
            onBlur={e => updatePrompt.mutate(e.target.value)}
          />
        </div>
      )}

      <div className="version-history">
        <h2>Version History</h2>
        <ul>
          {(versions.data ?? []).map(v => (
            <li key={v['promptId'] as string}>
              v{v['version'] as number} — {v['updatedAt'] as string}
              {v['changeNote'] ? ` — ${v['changeNote'] as string}` : ''}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
```

```typescript
// apps/web/src/screens/RagSearchScreen.tsx

import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { apiClient } from '../api/api-client';
import { parseDocument } from '@xiigen/web-core';

export default function RagSearchScreen() {
  const [query, setQuery]           = useState('');
  const [patternType, setPatternType] = useState('');

  const search = useMutation({
    mutationFn: async () => {
      const res = await apiClient.post('/api/rag/search', {
        query,
        patternType: patternType || undefined,
        topK: 10,
      });
      const raw = res.data.data as unknown[] ?? [];
      return raw.map(r => parseDocument(r as Record<string, unknown>));  // DNA-1
    },
  });

  return (
    <div className="rag-search-screen">
      <h1>RAG Pattern Search</h1>
      <div className="search-bar">
        <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search patterns…" />
        <select value={patternType} onChange={e => setPatternType(e.target.value)}>
          <option value="">All types</option>
          {['SERVICE_PATTERN','BFA_RULE','DESIGN_RECORD','TASK_CONTRACT'].map(t => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <button onClick={() => search.mutate()} disabled={search.isPending || !query}>
          {search.isPending ? 'Searching…' : 'Search'}
        </button>
      </div>
      <ul className="results">
        {(search.data ?? []).map(r => (
          <li key={r['patternId'] as string}>
            <strong>{r['patternId'] as string}</strong>
            {' — '}{r['patternType'] as string}
            {' — '}{r['domainId'] as string}
            <p>{r['keywords'] as string}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

---

## 9. ENDPOINTS Registry Update

```typescript
// Design path: apps/api/src/api/endpoints.registry.ts
// Actual: server/src/api/ (DynamicController + module-based registration)
// Adds RAG + Prompts engine endpoints registered in P21/P22

import { RAG_ENDPOINTS }    from './rag.endpoints';        // P21
import { PROMPTS_ENDPOINTS } from './prompts.endpoints';   // P22
import { FORMS_AUTOMATION_ENDPOINTS } from '../../modules/forms-automation/forms-automation.endpoints';

export const ENDPOINTS = [
  ...RAG_ENDPOINTS,
  ...PROMPTS_ENDPOINTS,
  ...FORMS_AUTOMATION_ENDPOINTS,
  // Future modules append their endpoint arrays here via auto-discovery
];
```

---

## 10. Tests Required

### Hook unit tests

```typescript
// apps/web/src/__tests__/unit/useForms.hooks.spec.ts

describe('useFormSchema hook', () => {
  it('parses response with parseDocument (DNA-1) — no raw unknown fields pass through', async () => {
    server.use(rest.get('/api/forms/:formId/schema', (_, res, ctx) =>
      res(ctx.json({ isSuccess: true, data: { formId: 'f1', schemaVersion: 2, fields: {} } }))
    ));
    const { result } = renderHook(() => useFormSchema('f1'), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.['formId']).toBe('f1');
    expect(result.current.data?.['schemaVersion']).toBe(2);
  });

  it('error.code surfaces from DataProcessResult when API returns failure', async () => {
    server.use(rest.get('/api/forms/:formId/schema', (_, res, ctx) =>
      res(ctx.json({ isSuccess: false, error: 'SCHEMA_NOT_FOUND' }))
    ));
    const { result } = renderHook(() => useFormSchema('missing'), { wrapper });
    await waitFor(() => expect(result.current.error).toBeTruthy());
    expect((result.current.error as ApiError).code).toBe('SCHEMA_NOT_FOUND');
  });
});

describe('useSubmitEntry mutation', () => {
  it('sends X-Idempotency-Key header (DNA-7)', async () => {
    let capturedHeaders: Record<string, string> = {};
    server.use(rest.post('/api/forms/:formId/entries', (req, res, ctx) => {
      capturedHeaders = Object.fromEntries(req.headers.entries());
      return res(ctx.json({ isSuccess: true, data: { entryId: 'e1' } }));
    }));
    const { result } = renderHook(() => useSubmitEntry(), { wrapper });
    await act(() => result.current.mutate({
      formId: 'f1', payload: { name: 'test' }, idempotencyKey: 'f1::uuid-1'
    }));
    expect(capturedHeaders['x-idempotency-key']).toBe('f1::uuid-1');
  });
});
```

### Screen component tests

```typescript
// apps/web/src/__tests__/unit/FormsScreen.spec.tsx

describe('FormsScreen', () => {
  it('renders schema version and entry count', async () => {
    mockHooks({ schema: { schemaVersion: 3, fields: {} }, entries: [{ entryId: 'e1', status: 'active' }] });
    render(<FormsScreen formId="f1" />);
    await screen.findByText(/Form Schema — v3/);
    expect(screen.getByText(/Entries \(1\)/)).toBeInTheDocument();
  });

  it('shows loading state while fetching', () => {
    mockHooksLoading();
    render(<FormsScreen formId="f1" />);
    expect(screen.getByText(/Loading/)).toBeInTheDocument();
  });

  it('shows error code from DataProcessResult on failure', async () => {
    mockHooksError({ code: 'SCHEMA_NOT_FOUND', message: 'No schema found' });
    render(<FormsScreen formId="f1" />);
    await screen.findByText(/SCHEMA_NOT_FOUND/);
  });
});
```

### Endpoint → hook → screen integration

```typescript
// apps/web/src/__tests__/integration/forms-flow.spec.tsx

describe('Forms automation — endpoint → hook → screen integration', () => {
  it('full create-and-display flow', async () => {
    render(<FormsScreen formId="form-1" />);
    await screen.findByText(/Form Schema/);

    // Submit entry
    const textarea = screen.getByRole('textbox', { name: /submit/i });
    await userEvent.clear(textarea);
    await userEvent.type(textarea, '{"name":"Alice"}');
    await userEvent.click(screen.getByRole('button', { name: /submit/i }));

    await screen.findByText(/e1/);  // entry ID appears in list after mutation + refetch
  });
});
```

---

## 11. Module Template Update

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
│
├── {domain}.endpoints.ts       ← THIS FILE (Phase 23) ✅ NOW REQUIRED
│                                    EndpointDefinition[] for ENDPOINTS registry
│                                    consumed by AppRouter auto-discovery
│                                    + client hooks + screen shipped in apps/web/src/modules/
│
├── {domain}.logger.ts          ← Phase 24 (PENDING)
├── {domain}.docs.ts            ← Phase 25 (PENDING)
│
└── {group}/
    └── {service}.ts

apps/web/src/modules/{domain-slug}/
├── use{Domain}.hooks.ts        ← React Query hooks, DNA-1 parsers, { data, loading, error }
└── {Domain}Screen.tsx          ← screen component, auto-wired by AppRouter
```

---

## 12. Iron Rules (Added by Phase 23)

| # | Rule | Consequence |
|---|------|-------------|
| IR-P23-1 | Every module MUST ship `{domain}.endpoints.ts` with at least one `EndpointDefinition` | VALIDATION_REPORT build failure |
| IR-P23-2 | Every module MUST ship `use{Domain}.hooks.ts` with one hook per endpoint | VALIDATION_REPORT build failure |
| IR-P23-3 | Every module MUST ship `{Domain}Screen.tsx` auto-wired in AppRouter | VALIDATION_REPORT build failure |
| IR-P23-4 | All hooks MUST use `parseDocument()` on API response data (DNA-1) | DNA-1 violation |
| IR-P23-5 | All hooks MUST return `{ data, isLoading, error }` shape — no raw `unknown` | Type safety requirement |
| IR-P23-6 | `error.code` MUST surface from `DataProcessResult.error` field — no generic JS Error | DNA-3 contract alignment |
| IR-P23-7 | Mutations with `requiresIdempotencyKey=true` MUST send `X-Idempotency-Key` header (DNA-7) | Idempotency violation |
| IR-P23-8 | AppRouter MUST auto-discover module screens via Vite glob — no manual route edits | Client DynamicController law |
| IR-P23-9 | `/api/rag/search` and `/api/prompts/*` MUST be in `ENDPOINTS` registry | P21/P22 completeness check |

---

## 13. Backward Compatibility

- All existing artifact numbers unchanged (F1–F1483, T1–T564, CF-1–CF-788, SK-1–SK-401, DR-1–DR-266)
- Existing ENDPOINTS registry entries are additive — existing routes unchanged
- AppRouter glob discovery is purely additive — existing routes unaffected
- `DataProcessResult<T>` shape on the server is mirrored client-side: `{ isSuccess, data, error }`
- FLOW-35 next anchors unchanged: F1484 · Family 223 · T565 · CF-789 · SK-402 · DR-267

---

## 14. Checkpoint

```json
{
  "phase": 23,
  "title": "Client Completeness Standard",
  "status": "complete",
  "delivers": [
    "EndpointDefinition interface",
    "forms-automation.endpoints.ts reference implementation (6 endpoints)",
    "useForms.hooks.ts: useFormSchema, useFormSchemaVersions, useStoreSchema, useFormEntries, useSubmitEntry",
    "FormsScreen.tsx: schema panel + entry list + submit panel",
    "AppRouter: Vite glob auto-discovery for module screens",
    "PromptsScreen: task type selector + inline editor + version history",
    "RagSearchScreen: full-text search + patternType filter + results list",
    "ENDPOINTS registry updated with RAG + Prompts engine endpoints",
    "Hook unit tests: DNA-1 parser coverage, error.code, idempotency header",
    "Screen component tests: loading/error/data states",
    "Endpoint → hook → screen integration test"
  ],
  "ironRulesAdded": 9,
  "ironRuleRange": "IR-P23-1 through IR-P23-9",
  "mandatoryModuleFiles": {
    "complete": 3,
    "total": 6,
    "files": [
      "{domain}.rag-seed.ts (P21)",
      "{domain}.prompts.ts (P22)",
      "{domain}.endpoints.ts + web hooks + screen (P23)"
    ],
    "pending": ["{domain}.logger.ts (P24)", "{domain}.docs.ts (P25)"]
  },
  "clientFiles": {
    "engineScreens": ["PromptsScreen", "RagSearchScreen"],
    "modulePattern": "modules/{domain}/use{Domain}.hooks.ts + {Domain}Screen.tsx"
  },
  "artifactNumbersUnchanged": true,
  "nextAnchors": { "F": 1484, "T": 565, "CF": 789, "SK": 402, "DR": 267 }
}
```
