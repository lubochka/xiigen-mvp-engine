---
name: xiigen-engine
version: "2.1.0"
description: |
  Core development skill for the XIIGen self-building AI code generation engine (NestJS + React).
  Use when: modifying fabric providers, editing AF stations, working with DNA patterns, touching
  the kernel or multi-tenant system, adding providers, editing guardrails, working with the
  learning system, or making any change to the engine codebase.
  Triggers: "fabric", "provider", "DNA", "DNA pattern", "MicroserviceBase", "tenant",
  "multi-tenant", "AF station", "engine contract", "guardrail", "BFA", "promotion ladder",
  "freedom config", "factory", "createAsync", "DataProcessResult", "BuildSearchFilter",
  "ParseDocument", "DynamicController", "scope isolation", "queue fabric", "database fabric",
  "AI engine", "RAG", "learning", "feedback", "quality scorer", "prompt A/B",
  "xiigen", "XIIGen", "engine", "NestJS server", "fabric interface".
  ALWAYS use this skill when working on any file in the xiigen codebase. Even if the user
  asks a simple question about the project structure, consult this skill first.
allowed-tools: Read Write Edit Bash
argument-hint: "[module name | 'audit' | 'add provider' | 'add contract']"
---

# XIIGen Engine Development Skill

> The engine generates flows. You maintain the engine. Every line of code must pass the DNA test.

## Iron Rules — Memorize Before Writing Any Code

1. **ALL services extend MicroserviceBase** — no exceptions (DNA-4)
2. **ALL data is `Record<string, unknown>`** — no typed models (DNA-1)
3. **ALL fabric access through interfaces** — never import a provider SDK (fabric-first)
4. **ALL queries include tenant scope** — automatic via AsyncLocalStorage (DNA-5)
5. **ALL service methods return `DataProcessResult<T>`** — never throw for business logic (DNA-3)
6. **NO entity-specific controllers** — use DynamicController (DNA-6)
7. **NO direct HTTP between services** — events through queue only
8. **storeDocument() BEFORE enqueue()** — outbox pattern (DNA-8)
9. **CloudEvents envelope on inter-service events** (DNA-9)
10. **Idempotency keys on all queue consumers** (DNA-7)

---

## Quick Reference — What's Where

```
server/src/
├── kernel/              ← DNA primitives + multi-tenant (RARELY TOUCH)
├── fabrics/             ← 6 fabric layers + interfaces + providers
├── factories/           ← Universal factory pattern + registry
├── engine-contracts/    ← Task type definitions + archetypes
├── engine/              ← Flow generator
├── guardrails/          ← BFA + DNA validator + promotion ladder
├── freedom/             ← Config manager (FREEDOM layer)
├── af-stations/         ← 11 AF stations + 3 sub-engines + pipeline
├── api/                 ← REST controllers
├── bootstrap/           ← Startup sequence
├── devops/              ← Logging, Docker, CI
├── doc-gen/             ← OpenAPI, diagrams, READMEs
├── learning/            ← Feedback, model preference, quality scoring
└── rag-init/            ← Pattern extraction + indexing
```

---

## The 6 Fabric Interfaces

Before modifying any fabric, read: [references/fabric-interfaces.md](references/fabric-interfaces.md)

| Fabric | Interface | Token | File |
|--------|-----------|-------|------|
| DATABASE | `IDatabaseService` | `DATABASE_SERVICE` | fabrics/interfaces/database.interface.ts |
| QUEUE | `IQueueService` | `QUEUE_SERVICE` | fabrics/interfaces/queue.interface.ts |
| AI ENGINE | `IAiProvider` | `AI_PROVIDER` | fabrics/interfaces/ai-provider.interface.ts |
| RAG | `IRagService` | `RAG_SERVICE` | fabrics/interfaces/rag.interface.ts |
| SECRETS | `ISecretsService` | `SECRETS_SERVICE` | fabrics/interfaces/secrets.interface.ts |
| FLOW ENGINE | `IFlowOrchestrator` | `FLOW_ORCHESTRATOR` | fabrics/interfaces/flow-orchestrator.interface.ts |

**Each fabric has 5 layers:** interface → factory → fabric-resolver → provider-registry → providers

---

## The 9 DNA Patterns — Detailed

Before writing or reviewing code, read: [references/dna-patterns.md](references/dna-patterns.md)

| # | Pattern | Quick Check |
|---|---------|-------------|
| DNA-1 | ParseDocument | Search for `class [A-Z].*{` — if it's a data model, REJECT |
| DNA-2 | BuildSearchFilter | Search for hardcoded query fields — REJECT if found |
| DNA-3 | DataProcessResult | Search for `throw new` — REJECT if it's business logic |
| DNA-4 | MicroserviceBase | Service not extending base — REJECT |
| DNA-5 | Scope Isolation | Missing tenant scope — REJECT |
| DNA-6 | DynamicController | Entity-specific controller — REJECT |
| DNA-7 | Idempotency | Queue consumer without dedup — REJECT |
| DNA-8 | Outbox | enqueue() before storeDocument() — REJECT (must be store THEN enqueue) |
| DNA-9 | CloudEvents | Inter-service event without envelope — REJECT |

---

## Multi-Tenant System

Before modifying tenancy, read: [references/multi-tenant.md](references/multi-tenant.md)

**Critical:** No `tenant_id` parameter on fabric methods. Providers read `TenantContext` from AsyncLocalStorage. This is a v4 design decision — callers CANNOT forget tenant scoping.

Flow: Request → TenantContextMiddleware (sets AsyncLocalStorage) → TenantGuard (validates) → Fabric providers (read from AsyncLocalStorage automatically)

---

## Adding a New Provider (Step by Step)

1. Create provider file extending the abstract fabric interface
2. Implement ALL abstract methods — each must return `DataProcessResult<T>`
3. The provider is the ONLY place where a specific SDK is imported
4. Register in the provider-registry for that fabric
5. Add to the fabric's NestJS module
6. Add FREEDOM config entry for runtime switching
7. Write tests using the same patterns as existing provider tests
8. Verify tenant isolation: tenant-A data invisible to tenant-B

---

## Adding a New Engine Contract (Task Type)

Read: [references/engine-contracts.md](references/engine-contracts.md)

**Next available numbers:** F1339+, T516+, Family 200+, CF-715+

1. Define the full contract with ALL required fields (see references)
2. Register factory dependencies — each MUST declare its fabric type
3. Map AF stations (which generate, which review, which judge)
4. Register BFA entries (entities, events, routes)
5. Define MACHINE vs FREEDOM split
6. Set iron rules and quality gates
7. Register in TaskTypeRegistry
8. Run BFA validation against all existing flows (FLOW-01 through FLOW-31)
9. Write tests

---

## Code Review Checklist

Run this on every PR or generated file:

- [ ] Does it extend MicroserviceBase? (DNA-4)
- [ ] All returns are DataProcessResult? (DNA-3)
- [ ] No typed models for business data? (DNA-1)
- [ ] No entity names in code? (4-Law #1)
- [ ] No entity-specific controllers? (DNA-6)
- [ ] Fabric interface injected, never provider SDK? (fabric-first)
- [ ] Tenant scope automatic via AsyncLocalStorage? (DNA-5)
- [ ] BuildSearchFilter for all queries? (DNA-2)
- [ ] storeDocument() before enqueue()? (DNA-8)
- [ ] CloudEvents envelope on events? (DNA-9)
- [ ] Idempotency key on mutations? (DNA-7)
- [ ] Tests written and passing?

---

## Testing Conventions

- In-memory providers for all tests (no external services)
- Pattern: `should [behavior] when [condition]`
- Assert on DataProcessResult: `.isSuccess`, `.data`, `.errorCode`, `.message`
- Multi-tenant tests: ALWAYS verify cross-tenant isolation
- Use `beforeEach` to reset in-memory state

```typescript
// Example test pattern
it('should return failure when document not found', async () => {
  const result = await service.getDocument('products', 'nonexistent-id');
  expect(result.isSuccess).toBe(false);
  expect(result.errorCode).toBe('NOT_FOUND');
});
```

---

## Maintenance Rules — Canonical Doc Sync (v2.1)

When any TypeScript file is modified, the following canonical docs must be updated in the **same commit**. Cross-check with `documentation-sync` skill at session end.

| File Changed | Canonical Docs to Update |
|-------------|--------------------------|
| `server/src/engine-contracts/*.ts` | `ENGINE_ARCHITECTURE_MERGED`, `AGENTS.md` |
| `server/src/factories/*.ts` | `ENGINE_ARCHITECTURE_MERGED`, `TASK_TYPES_CATALOG_MERGED` |
| `server/src/af-stations/*.ts` | `ENGINE_ARCHITECTURE_MERGED` |
| `server/src/fabrics/**/*.ts` | `ENGINE_ARCHITECTURE_MERGED` |
| `server/src/fabrics/*/provider-registry.ts` | `ENGINE_ARCHITECTURE_MERGED` (provider key list — case-sensitive) |
| New factory ID (F-XXXX) added | `ENGINE_ARCHITECTURE_MERGED`, `AGENTS.md` (nextFactory number) |
| New task type (T-XXX) added | `TASK_TYPES_CATALOG_MERGED`, `AGENTS.md` (nextTaskType number) |

**Anti-pattern:** Committing TypeScript changes without a matching doc update in the same commit.

---

## Reference Files

| File | When to Read |
|------|-------------|
| [references/fabric-interfaces.md](references/fabric-interfaces.md) | Before modifying any fabric layer |
| [references/dna-patterns.md](references/dna-patterns.md) | Before writing or reviewing any code |
| [references/engine-contracts.md](references/engine-contracts.md) | Before adding task types or factories |
| [references/multi-tenant.md](references/multi-tenant.md) | Before touching the tenant system |
| [references/af-pipeline.md](references/af-pipeline.md) | Before modifying the AI generation pipeline |
| [references/module-map.md](references/module-map.md) | When navigating the codebase |
