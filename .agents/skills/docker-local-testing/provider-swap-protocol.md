# Provider Swap Protocol

How to add or swap a fabric provider in XIIGen, from the docker-local-testing perspective.

## MACHINE Steps (invariant — all must be done)

1. **Implement the fabric interface**
   - Extend the correct abstract base (e.g., `DatabaseFabric`, `QueueFabric`)
   - Implement all required methods: `connect()`, `disconnect()`, `query()`, `store()` etc.
   - Register in the fabric module via `createAsync()` factory (FREEDOM config)

2. **Create a test file** at `test/fabrics/<provider-name>.spec.ts`
   - Tests must cover: happy path, error path, multi-tenant isolation
   - Use real EngineContract fixtures from `server/src/engine-contracts/sample-contracts.ts`
   - Do NOT use hand-crafted StationInput mocks (self-verification Rule 1)

3. **Add a row to `fabric-coverage-matrix.md`**
   - Fabric type | Provider name | Test file path | Docker? | Notes

4. **Run tenant isolation gate**
   - Extend `test/fabrics/tenant-isolation-e2e.spec.ts` with the new provider (see `tenant-isolation-test.md`)
   - Run: `npx jest test/fabrics/tenant-isolation-e2e.spec.ts --runInBand`

## FREEDOM Steps (configurable per environment)

- Docker image tag (e.g., `elasticsearch:8.11` vs `elasticsearch:7.17`)
- Port mapping (use test-range ports: 19200–19299, 15432–15499, etc.)
- Environment variables (API keys, passwords, cluster settings)
- Startup wait strategy (health endpoint vs simple sleep)
- Docker service in `docker-compose.test.yml` (add service block; do not modify existing services)

## Adding a Docker-Backed Provider

```yaml
# In docker-compose.test.yml — add under services:
my-new-provider:
  image: my-provider-image:tag
  ports:
    - "1XXXX:YYYY"          # test port : container port
  environment:
    - REQUIRED_VAR=value
  healthcheck:
    test: ["CMD", "curl", "-f", "http://localhost:YYYY/health"]
    interval: 5s
    timeout: 3s
    retries: 10
```

Then add health check to the startup sequence in `docker-local-testing/SKILL.md`.

## Swapping an Existing Provider

If swapping (e.g., replacing elasticsearch with opensearch):
1. Keep the old test file or rename it to reflect the new provider
2. Update fabric-coverage-matrix.md: change Provider column + Notes
3. Update docker-compose.test.yml: change image only (keep port)
4. Re-run all fabric tests + tenant isolation gate

**Do NOT remove an old provider's test file until the new provider is fully tested and tenant isolation passes.**

## Common Failures

| Symptom | Cause | Fix |
|---------|-------|-----|
| ES connection refused | Container not yet ready | Add health check wait in startup sequence |
| SQS queue not found | LocalStack cold start | Wait for `"sqs": "running"` in health endpoint |
| PG authentication failed | Wrong password env var | Set `POSTGRES_PASSWORD` in docker-compose.test.yml |
| Wrong tenant data returned | TenantId not in ClsService scope | Add `cls.run({ tenantId }, ...)` wrapper in test |
| In-memory fallback used silently | fabricType case mismatch | Check provider key case (fabric-resolution-trace rule) |
