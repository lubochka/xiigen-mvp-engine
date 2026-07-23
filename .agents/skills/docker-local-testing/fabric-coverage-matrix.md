# Fabric Coverage Matrix

All 6 fabric types × all providers. Updated when adding new providers.

| Fabric | Provider | Test File | Docker? | Notes |
|--------|----------|-----------|---------|-------|
| DATABASE | elasticsearch | `test/fabrics/elasticsearch-provider.spec.ts` | ✅ container (ES 8.x, port 19200) | Index creation, multi-tenant namespace isolation |
| DATABASE | postgresql | `test/fabrics/postgresql-provider.spec.ts` | ✅ container (PG 16-alpine, port 15432) | Schema creation, row-level tenant isolation |
| DATABASE | in-memory | `test/fabrics/in-memory-database.spec.ts` | ❌ in-process | Map-based store, no persistence — test per-session isolation |
| QUEUE | sqs | `test/fabrics/sqs-provider.spec.ts` | ✅ LocalStack (port 14566) | Queue creation, message visibility timeout, DLQ routing |
| QUEUE | in-memory | `test/fabrics/in-memory-queue.spec.ts` | ❌ in-process | EventEmitter-based, test ordering + backpressure |
| AI ENGINE | anthropic / openai / gemini / grok | `test/fabrics/ai-concrete-providers.spec.ts` | ❌ real API keys | Requires env vars: ANTHROPIC_API_KEY, OPENAI_API_KEY, GEMINI_API_KEY, GROK_API_KEY |
| AI ENGINE | mock | `test/fabrics/mock-ai-provider.spec.ts` | ❌ in-process | Returns fixed responses — test skill block injection, not AI output |
| RAG | in-memory | `test/fabrics/in-memory-rag.spec.ts` | ❌ in-process | Vector similarity stub — test retrieve/store interface, not embeddings |
| SECRETS | env-var | `test/fabrics/env-var-secrets.spec.ts` | ❌ in-process | Reads from process.env — test with dotenv mock |
| SECRETS | aws | `test/fabrics/aws-secrets.spec.ts` | ✅ LocalStack (port 14566) | SecretsManager mock — test get/put/rotate operations |

## Adding a New Provider

1. Implement the fabric interface (MACHINE)
2. Create `test/fabrics/<provider-name>.spec.ts` (MACHINE)
3. Add a row to this table (MACHINE)
4. If docker-dependent: add a service to `docker-compose.test.yml` (FREEDOM — choose image + port)
5. Update `docker-local-testing/SKILL.md` startup sequence if new health check is needed

## Notes

- **LocalStack** serves both SQS (QUEUE) and SecretsManager (SECRETS) — same container, port 14566
- **AI ENGINE concrete providers** are integration tests requiring real API keys; skipped in CI without keys
- **In-memory providers** never use docker; they must still have test files that verify tenant isolation
- **Tenant isolation test** (`test/fabrics/tenant-isolation-e2e.spec.ts`) must pass for ALL docker-backed providers
