---
name: integration-testing
description: "Verify boundaries between components with ≥2 real implementations on the path under test (no stubs on the tested contract), a fabric-coverage matrix, and per-test fresh instances. Use when behavior crosses services, modules, fabric providers, adapters, or data formats."
category: code-execution
languages: all
adapted_for: "xiigen mvp — NestJS 11 + Jest (server), React 18 (client), FastAPI RAG sidecar, containerized fabrics (Elasticsearch/Redis)"
---

# Integration Testing

## Purpose

Verify the **boundaries between components**, not a component in isolation. An
integration test exercises a path where **at least two real implementations**
collaborate, with **no stub standing in for the contract under test**. Where a unit
test mocks the dependency, an integration test wires the real one and asserts the
**real output**.

## When to Use

Use when behavior crosses services, NestJS modules, fabric providers, adapters, AF
stations, or data formats — e.g. an application service calling a real fabric, two AF
stations passing EngineContract data, or a NestJS provider resolving a real
implementation through DI.

## The Universal Rule — ≥2 real implementations, none stubbed on the tested path

> An "integration test" that mocks the very contract it claims to integrate is a unit
> test wearing a costume. On the path under test, the dependency being integrated MUST
> be the **real implementation**. Only dependencies that are NOT under test (and are
> genuinely external) may stay mocked.

```
✓ Application service (real) → fabric provider (real, e.g. real ES/Redis client in a container) → assert real output
✗ Application service (real) → fabric provider (jest.fn() mock) → "integration" proves nothing the unit test didn't
```

### Allowed vs forbidden stubs (Jest, mvp)

| Dependency | In an integration test for THIS boundary | Why |
|---|---|---|
| The fabric/contract **under test** (`IDatabaseFabric`, `IQueueFabric`, `ISchedulerFabric`, the service being integrated) | **FORBIDDEN to stub** — use the real implementation (containerized or in-memory real class) | stubbing it removes the boundary you are testing |
| External non-deterministic clients NOT under test (LLM SDK, third-party HTTP, payment gateway) | **Allowed to stub** | external, costly, non-deterministic; not the boundary being verified |
| Time/clock when the boundary is not time-based | Allowed to inject a controllable clock | determinism, not the contract under test |

Forbidden pattern to grep for in a spec that claims integration coverage:
```bash
# A jest mock of the fabric/service the test is supposed to integrate = coverage illusion
grep -nE "useValue:\s*\{.*\}|jest\.fn\(\)|mockReturnValue|mockResolvedValue" test/<boundary>.integration.spec.ts
# If the MOCK targets the dependency under test → not an integration test. Wire the real class.
```

## Fabric-Coverage Matrix (required artifact)

Every fabric implementation that can run a path must have **≥1 integration test with
real inputs and a real-output assertion**. Maintain the matrix before writing tests:

```
| Fabric interface     | Implementation        | Integration test (real in → real out)              | Status |
|----------------------|-----------------------|----------------------------------------------------|--------|
| IDatabaseFabric      | ElasticsearchFabric   | test/fabrics/elasticsearch.integration.spec.ts     | PASS   |
| IDatabaseFabric      | InMemoryDatabaseFabric| test/fabrics/in-memory-db.integration.spec.ts      | PASS   |
| IQueueFabric         | RedisQueueFabric      | test/fabrics/redis-queue.integration.spec.ts       | PASS   |
| ISchedulerFabric     | <impl>                | test/fabrics/<impl>.integration.spec.ts            | N/A: <reason> |
```

- Containerized fabrics (Elasticsearch, Redis) run via `docker-compose.test.yml`
  (see `docker-local-testing`); bring the stack up, run the spec against the real
  container, tear it down. A green in-memory-only run does NOT cover the container
  implementation — both rows of the matrix must exist.
- The FastAPI RAG sidecar is a real boundary: an integration test for a RAG-consuming
  path calls the running sidecar (or a real-contract test double that returns the
  sidecar's real response shape), not a `jest.fn()` returning a hand-made object.
- A missing matrix row, or a row whose only test mocks the fabric, is an integration
  gap — not "covered".

## Inputs

Component boundary, the contract (interface) crossing it, realistic inputs, the
target project commands (`npx jest <spec>`, `docker-compose -f docker-compose.test.yml up -d`).

## Steps

1. Identify the integration boundary and the interface that crosses it.
2. Define realistic inputs and the **real** expected output (shape AND value).
3. Wire the **real implementations** on the path under test; mock only genuinely
   external, non-deterministic dependencies.
4. Run the narrowest useful integration test against the real collaborators
   (container up if the fabric is containerized).
5. Record unsupported dependencies or blockers explicitly.

## No shared state — fresh instance per test (universal)

Integration tests must not share mutable state. Each `it`/`test` (or `beforeEach`)
constructs a **fresh** instance / fresh `Test.createTestingModule(...).compile()` and,
for containerized fabrics, an isolated index/namespace (e.g. a per-test tenant or
index suffix). No `static`/module-level singletons carrying state between tests.

```
✗ const svc = new Service();            // module scope — leaks state across tests
✗ shared ES index reused without cleanup → test order dependence
✓ beforeEach(async () => { module = await Test.createTestingModule({...}).compile(); svc = module.get(...); })
✓ per-test index/tenant suffix; teardown in afterEach
```
Tenant isolation is part of this: an integration test that writes to a fabric must
scope its writes (tenantId/index) so it cannot bleed into another test's data.

## Gates

At least one meaningful boundary scenario is covered with **real implementations on
both sides** (or the boundary is explicitly blocked with a reason). Every fabric
implementation in the matrix has ≥1 real-input/real-output integration test or a
justified N/A.

## Evidence

Integration test output showing the real collaborators ran (container logs / real
fabric response), the fabric-coverage matrix with statuses, or an explicit blocker.
`validation_only`, a green run that mocked the contract under test, or unit-only
coverage are NOT integration evidence.

## Anti-Patterns

- Replacing integration coverage with isolated unit tests only.
- Mocking the fabric/service **under test** and calling the result an integration test.
- In-memory-only coverage for a fabric that has a containerized implementation
  (the container path stays untested).
- Shared mutable state / reused index causing order-dependent passes.
- Asserting only `result.isSuccess` instead of the real output value/`errorCode`
  (behavioral-assertion-gate; see `test-integrity` Rule 6).

## Related

`test-integrity` (Rule 6 behavioral assertions; FM-1 stub-fix masking),
`three-level-verification` (Level 2 is the integration level — real wiring, not L1 mocks),
`docker-local-testing` (container startup / fabric coverage harness),
`e2e-test-matrix` (scenario categories), `bug-to-tests` (the integration test is one of the 3 levels).
