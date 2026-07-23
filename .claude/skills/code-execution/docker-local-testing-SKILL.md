---
name: docker-local-testing-skill
sk_number: SK-421
version: "1.0.0"
load_order: 21
priority: RECOMMENDED
author: luba
updated: "2026-03-18"
description: >
  All 6 fabric provider test coverage using Docker. Ensures every fabric
  interface is tested against a real containerized dependency — not just an
  in-memory fallback. Governs docker-compose.test.yml startup, port assignments,
  tenant isolation testing, and provider swap verification.
---

# Docker Local Testing Skill v1.0

## When to Invoke

- Before declaring any fabric provider "tested"
- Before any Phase 11 code modification touching fabric providers
- When adding a new provider to an existing fabric type
- When diagnosing a fabric bug that "only happens in production"

---

## Fabric Coverage Matrix

See `fabric-coverage-matrix.md` for the full 10-row table. Summary:

| Fabric | Docker? | Test file |
|--------|---------|-----------|
| DATABASE / elasticsearch | ✅ container | `test/fabrics/elasticsearch-provider.spec.ts` |
| DATABASE / postgresql | ✅ container | `test/fabrics/postgresql-provider.spec.ts` |
| DATABASE / in-memory | ❌ in-process | `test/fabrics/in-memory-database.spec.ts` |
| QUEUE / sqs | ✅ LocalStack | `test/fabrics/sqs-provider.spec.ts` |
| QUEUE / in-memory | ❌ in-process | `test/fabrics/in-memory-queue.spec.ts` |
| AI ENGINE / anthropic, openai, gemini, grok | ❌ real API keys | `test/fabrics/ai-concrete-providers.spec.ts` |
| AI ENGINE / mock | ❌ in-process | `test/fabrics/mock-ai-provider.spec.ts` |
| RAG / in-memory | ❌ in-process | `test/fabrics/in-memory-rag.spec.ts` |
| SECRETS / env-var | ❌ in-process | `test/fabrics/env-var-secrets.spec.ts` |
| SECRETS / aws | ✅ LocalStack | `test/fabrics/aws-secrets.spec.ts` |

---

## Docker Startup Sequence

```bash
# 1. Start containers (MACHINE — always in this order)
docker-compose -f docker-compose.test.yml up -d

# 2. Wait for Elasticsearch (yellow status = ready)
until curl -s http://localhost:19200/_cluster/health | grep -q '"status":"yellow"\|"status":"green"'; do
  echo "Waiting for ES..."; sleep 2
done

# 3. Wait for PostgreSQL
until pg_isready -h localhost -p 15432 -U postgres; do
  echo "Waiting for PG..."; sleep 2
done

# 4. Wait for LocalStack
until curl -s http://localhost:14566/_localstack/health | grep -q '"sqs": "running"'; do
  echo "Waiting for LocalStack SQS..."; sleep 2
done

# 5. Run fabric test suite
cd server && npx jest --testPathPattern="test/fabrics" --runInBand

# 6. Tear down
docker-compose -f docker-compose.test.yml down
```

---

## Port Assignments (FREEDOM — configurable)

| Service | Test Port | Prod Port |
|---------|-----------|-----------|
| Elasticsearch | 19200 | 9200 |
| PostgreSQL | 15432 | 5432 |
| Redis | 16379 | 6379 |
| LocalStack (SQS/Secrets) | 14566 | 4566 |

Override by setting `TEST_ES_PORT`, `TEST_PG_PORT`, `TEST_REDIS_PORT`, `TEST_LOCALSTACK_PORT` in `.env.test`.

---

## Tenant Isolation Gate

After any fabric test, confirm multi-tenant isolation:

```bash
cd server && npx jest test/fabrics/tenant-isolation-e2e.spec.ts --runInBand
```

See `tenant-isolation-test.md` for the pattern to extend this file when adding new fabric tests.

---

## Anti-Patterns

1. **"Unit tests pass = the fabric is tested."** Unit tests mock the fabric interface. Docker tests use a real container. A provider that passes unit tests can fail against a real ES cluster (index mapping errors, auth, version incompatibilities).

2. **"I'll test against the real API when it's deployed."** AI ENGINE concrete providers (Anthropic, OpenAI) must have at least one contract-level test with real keys before Phase 11 code modifications. Mock tests alone do not count.

3. **"The in-memory provider works — ship it."** In-memory is a fallback. Every service that will run in production with a real provider must be tested against that real provider.

4. **"I ran npm test and everything passed."** `npm test` runs the standard jest suite. Fabric docker tests require a separate startup sequence. They are not included in the default `npm test` run.

5. **Starting docker containers without verifying health.** A container can be "up" but not ready. Always wait for health signals before running tests. ES especially takes 15–30 seconds to reach yellow status.

---

## Provider Swap Protocol

See `provider-swap-protocol.md`. Summary:

MACHINE (invariant): implement the fabric interface, create a test file, add a row to fabric-coverage-matrix.md.
FREEDOM (configurable): docker image tag, port, environment variables, startup wait time.
