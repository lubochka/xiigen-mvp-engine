# Docker Local Testing — Quick Reference

## Pre-Test Checklist

```
☐ docker-compose.test.yml exists at repo root
☐ Run: docker-compose -f docker-compose.test.yml up -d
☐ Wait for Elasticsearch: curl http://localhost:19200/_cluster/health (yellow/green)
☐ Wait for PostgreSQL: pg_isready -h localhost -p 15432
☐ Wait for LocalStack: curl http://localhost:14566/_localstack/health | grep "sqs.*running"
☐ Run: cd server && npx jest --testPathPattern="test/fabrics" --runInBand
☐ Run tenant isolation gate: npx jest test/fabrics/tenant-isolation-e2e.spec.ts --runInBand
☐ Tear down: docker-compose -f docker-compose.test.yml down
```

---

## Fabric Coverage — Docker vs In-Process

| Fabric | Provider | Docker? | Port |
|--------|----------|---------|------|
| DATABASE | elasticsearch | ✅ ES 8.x | 19200 |
| DATABASE | postgresql | ✅ PG 16-alpine | 15432 |
| DATABASE | in-memory | ❌ in-process | — |
| QUEUE | sqs | ✅ LocalStack | 14566 |
| QUEUE | in-memory | ❌ in-process | — |
| AI ENGINE | anthropic/openai/gemini/grok | ❌ real API keys | — |
| AI ENGINE | mock | ❌ in-process | — |
| RAG | in-memory | ❌ in-process | — |
| SECRETS | env-var | ❌ in-process | — |
| SECRETS | aws | ✅ LocalStack | 14566 |

---

## Common Failures

| Symptom | Fix |
|---------|-----|
| ES connection refused | Wait for yellow status — can take 30s after `up -d` |
| LocalStack SQS queue not found | Wait for `"sqs": "running"` in health endpoint |
| PG auth failed | Check `POSTGRES_PASSWORD` env in docker-compose.test.yml |
| In-memory fallback used silently | fabricType case mismatch — check provider registry key (fabric-resolution-trace rule) |
| Wrong tenant data in concurrent test | tenantId lost in Promise.all — use explicit tenantId or cls.run() |

---

## Adding a New Provider

1. Implement fabric interface (MACHINE)
2. Create `test/fabrics/<name>.spec.ts` (MACHINE)
3. Add row to `fabric-coverage-matrix.md` (MACHINE)
4. If docker: add service to `docker-compose.test.yml` + health check (FREEDOM)
5. Add `describe` block to `tenant-isolation-e2e.spec.ts` (see `tenant-isolation-test.md`)

---

## Red Flags

```
⛔ "npm test passes" declared as fabric tested — docker providers NOT in default npm test run
⛔ Tenant isolation test skipped — isolation is a MACHINE requirement
⛔ Docker container started without health check wait — test flakiness will follow
⛔ New provider added with no row in fabric-coverage-matrix.md
⛔ Concurrent Promise.all without explicit tenantId — tenant leak risk
```
