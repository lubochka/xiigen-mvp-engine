# AGENTS.md — Integration Testing

## Invoke When
- Behavior crosses a boundary: NestJS service ↔ fabric provider, AF station ↔ AF
  station, adapter ↔ data format, RAG sidecar ↔ consumer.
- You need to prove two components actually work together, not just in isolation.

## The One Rule
> On the path under test, the dependency being integrated MUST be the **real
> implementation**. Mock only genuinely external, non-deterministic deps (LLM SDK,
> 3rd-party HTTP). Mocking the contract under test = a unit test in disguise.

## Allowed vs Forbidden Stubs (Jest, mvp)

```
FORBIDDEN to stub: the fabric/service UNDER TEST
  (IDatabaseFabric / IQueueFabric / ISchedulerFabric / the integrated service)
ALLOWED to stub:   external non-deterministic clients NOT under test (LLM SDK, payment, 3rd-party HTTP)
```

## Fabric-Coverage Matrix (every implementation needs ≥1 real-in/real-out test)

```
| Interface         | Implementation         | Integration spec                                 | Status |
|-------------------|------------------------|--------------------------------------------------|--------|
| IDatabaseFabric   | ElasticsearchFabric    | test/fabrics/elasticsearch.integration.spec.ts   | PASS   |
| IDatabaseFabric   | InMemoryDatabaseFabric | test/fabrics/in-memory-db.integration.spec.ts    | PASS   |
| IQueueFabric      | RedisQueueFabric       | test/fabrics/redis-queue.integration.spec.ts     | PASS   |
```
Containerized fabrics run against the real container:
```
docker-compose -f docker-compose.test.yml up -d
cd server && npx jest test/fabrics/<provider>.integration.spec.ts --verbose
docker-compose -f docker-compose.test.yml down
```
In-memory-only coverage does NOT cover the container implementation — both rows exist.

## No Shared State — Fresh Instance Per Test
```
beforeEach(async () => {
  module = await Test.createTestingModule({ providers: [RealService, /* real fabric */] }).compile();
  svc = module.get(RealService);
});
// per-test index/tenant suffix for containerized writes; teardown in afterEach
```
No module-level singletons carrying state; no reused index without cleanup.

## Gates
- ≥1 boundary scenario with real implementations on BOTH sides (or explicit blocker).
- Every fabric implementation in the matrix: ≥1 real-input/real-output test or a justified N/A.
- Assert the real output value / `result.errorCode`, not only `result.isSuccess`.

## Anti-Patterns
- Mocking the fabric under test and calling it "integration".
- In-memory-only coverage when a container implementation exists.
- Shared/reused state causing order-dependent passes.
- Unit-only coverage substituted for a real boundary test.

## Related
`test-integrity`, `three-level-verification` (Level 2), `docker-local-testing`, `e2e-test-matrix`, `bug-to-tests`.
