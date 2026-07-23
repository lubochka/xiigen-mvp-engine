---
name: xiigen-core-principles-skill
version: "1.0.0"
sk_number: SK-409
priority: SUPREME
load_order: 7
origin: Flows 25–33 + multi-tenant-support.md
---

# XIIGen Core Principles Skill — 8 Foundational Principles

These 8 principles are non-negotiable. They are derived from Flows 25–33 and the multi-tenant architecture research. Every plan must explicitly address all 8 before receiving approval.

## When to Invoke

- planning-skill Gate 7 invokes this skill
- SESSION-0 Step 12 checks FC-12 compliance (were all 8 answered?)
- Any time a plan is being reviewed for completeness

## The Rule

A plan that cannot answer "yes" to a principle's gate question either amends the plan to address the principle, or receives Luba's explicit written sign-off that the principle is out of scope for this specific plan.

---

## PRINCIPLE 1 — Multi-Tenant by Default

**One-sentence rule:** Every new artifact must carry `tenantId` scope — there are no single-tenant artifacts.

**What this means for XIIGen:**
- Every Elasticsearch index has a tenant prefix: `${tenantId}_flows`, `${tenantId}_tasks`
- Every Redis key has tenant scope: `tenant:${tenantId}:session:${sessionId}`
- Every PostgreSQL row has a `tenant_id` column with row-level security
- `AsyncLocalStorage` propagates tenantId automatically via kernel (DNA-5)
- No method may accept `tenantId` as a parameter — it comes from context

**Plan gate question:** Does every new artifact (index, table, cache key, queue event, factory instance) have `tenantId` scope? Are there zero paths where tenant A can read tenant B's data?

**Negative example (violation):**
```typescript
// WRONG — tenantId as parameter, shared index
async getFlows(tenantId: string): Promise<Flow[]> {
  return this.db.search({ index: 'flows', query: { tenantId } });
}
// CORRECT — tenantId from context, tenant-scoped index
async getFlows(): Promise<Flow[]> {
  const ctx = this.clsService.get();
  return this.db.search({ index: `${ctx.tenantId}_flows`, query: {} });
}
```

---

## PRINCIPLE 2 — Configs in Safe Environments

**One-sentence rule:** All configuration comes through the fabric layer — never hardcoded, never in source, always per-tenant capable.

**What this means for XIIGen:**
- API keys go through `ISecretsService` (AWS Secrets Manager or LocalStack)
- Model selection goes through FREEDOM config, not hardcoded model names
- Provider endpoints go through environment variables, resolved at fabric init
- Per-tenant config overrides are supported via the FREEDOM pattern
- `ISecretsService.getSecret(key, tenantId)` — tenant-scoped secrets

**FREEDOM/MACHINE test:** If a value changes between tenants → FREEDOM. If it is an invariant across all tenants → MACHINE.

**Plan gate question:** Are all configs routed through the fabric layer? Can tenant A have a different model endpoint than tenant B without a code change?

**Negative example (violation):**
```typescript
// WRONG — hardcoded API key, no per-tenant capability
const client = new Anthropic({ apiKey: 'sk-ant-hardcoded-key' });
// CORRECT — via fabric, per-tenant capable
const aiProvider = await this.factory.createAsync<IAiProvider>('AI_ENGINE', { tenantId });
```

---

## PRINCIPLE 3 — Always Improve Prompts (PromptOps)

**One-sentence rule:** Prompts are versioned assets that go through a Judge+improve cycle — no prompt is static.

**What this means for XIIGen:**
- Every prompt has a `PromptAsset` record: `{ id, version, content, evalScore, status }`
- Promotion pipeline: DRAFT → CANDIDATE → TESTED → ACTIVE → ARCHIVED
- AF-9 (Judge) evaluates prompt quality; score below threshold triggers improvement loop
- AF-11 (Feedback) captures which prompt version produced what score delta
- Multi-model critique: Codex + GPT-4 + Gemini evaluate candidates independently
- Rollback = pointer swap (ACTIVE → previous ACTIVE), not content mutation

**Plan gate question:** Are prompts versioned? Is there a Judge+improve cycle that runs when quality drops?

**Negative example (violation):**
```typescript
// WRONG — static prompt string in code
const prompt = `Generate a ${taskType} service following these rules...`;
// CORRECT — versioned prompt asset from RAG
const promptAsset = await this.ragService.getPromptVersion({ taskType, tenantId });
```

---

## PRINCIPLE 4 — RAG Is Always Dual (General + Local)

**One-sentence rule:** Knowledge is stored in RAG globally; tested locally with a seeded local instance.

**What this means for XIIGen:**
- **TIER 1 — Global RAG:** Production Elasticsearch cluster. Stores: flow templates, task type contracts, DNA pattern examples, BFA conflict history, successful generation exemplars.
- **TIER 2 — Local RAG:** Seeded from global RAG snapshot. Used for: local development, CI test runs, docker-compose.test.yml environment.
- Local RAG config in docker-compose.test.yml:
  ```yaml
  elasticsearch:
    image: elasticsearch:8.x
    ports: ["19200:9200"]
    environment:
      - xpack.security.enabled=false
  ```
- Seeding: `npm run rag:seed` populates local ES from snapshot before tests run

**Plan gate question:** Is new knowledge stored in RAG (not just hardcoded)? Is there a local RAG variant for testing?

**Negative example (violation):**
```typescript
// WRONG — knowledge hardcoded in AF-3
const templates = { ORCHESTRATION: 'Generate a flow that...', DATA_PIPELINE: '...' };
// CORRECT — stored in RAG, retrieved by task type
const template = await this.ragService.getPromptTemplate({ taskType, tenantId });
```

---

## PRINCIPLE 5 — Always Improve (Self-Developing Engine)

**One-sentence rule:** The engine itself gets better over time — not just the generated output.

**What this means for XIIGen:**
- AF-11 (Feedback) captures `skillsActive`, `scoreDelta`, `taskType` per generation cycle
- `getSkillEffectiveness(key)` feeds back to AF-4 to adjust future skill selection
- Failed patterns become negative exemplars in RAG (FLOW-26 pattern)
- The engine can detect its own capability gaps and queue new factory registrations
- Promotion ladder: DRAFT → WIRED → VALIDATED → INJECTED → MINIMAL → CORE

**Plan gate question:** Does this plan make the ENGINE better (improved selection, better prompts, richer RAG), or does it only improve a one-time output?

**Negative example (violation):** Adding a new prompt template directly to `af3-prompt-library.ts` as a static string. It improves one generation but the engine does not learn from it.

**Correct pattern:** Add the template to RAG with a `taskType` key, and hook AF-11 to track whether it improves score delta — so future sessions can automatically prefer or deprecate it.

---

## PRINCIPLE 6 — Planning + Arbitrating Decision Nodes (BFA)

**One-sentence rule:** Every decision that affects multiple flows must go through BFA cross-flow validation.

**What this means for XIIGen:**
- BFA (Backward Compatibility Fabric Assertion) checks new artifacts against FLOW-01 through FLOW-31
- Decision nodes (entities, events, routes, task types) with cross-flow impact go through AF-2 planning gate
- FLOW-25 (Arbiter) handles semantic conflict detection + human-in-loop for high-severity conflicts
- New factory families must not conflict with existing flow event names
- `bfaRegistration.events[]` in every EngineContract is checked before promotion

**Plan gate question:** Are new decision nodes (entities, events, task types) cross-validated against existing flows? Is there an arbitration path for conflicts?

**Negative example (violation):** FLOW-32 adds `order.completed` event without checking that FLOW-08 already publishes `order.completed` with a different payload shape — BFA conflict, silent data corruption.

---

## PRINCIPLE 7 — Local Testing for Everything (Unit + Sim + Docker)

**One-sentence rule:** Every component must be testable locally before it touches production infrastructure.

**What this means for XIIGen:**
- **Unit:** Pure logic, no I/O. `jest` in-process.
- **Simulation:** Real DI, in-memory providers. `@nestjs/testing` + `AppModule`.
- **Docker:** Real containers for fabric providers. `docker-compose.test.yml` — ES:19200, PG:15432, Redis:16379, LocalStack:14566.
- **Sequence:** Unit passes → Simulation passes → Docker passes → code review → merge.
- No code ships with only unit tests. Simulation is the minimum bar for new services.

**Plan gate question:** For every new component in the plan, are unit + simulation + Docker test paths defined?

**Negative example (violation):** New `ElasticsearchProvider` tested only via unit mocks. Production ES version has different query behavior — caught only after deploy.

---

## PRINCIPLE 8 — Open Source Model + Training Loop (Cost Optimization)

**One-sentence rule:** Use open-source models for local development cycles; capture every interaction as training data for future cost reduction.

**What this means for XIIGen:**
- **Local development:** Route to local `ollama` instance (Llama 3, Mistral, etc.) via `IAiProvider` mock or local provider
- **Training data capture:** Every AF-9 Judge verdict + AF-11 feedback delta is a training exemplar
- **Cost tracking:** Token counts logged per `(tenantId, taskType, modelId)` — observable via OTel
- **Model routing:** Contextual bandit (FLOW-29 pattern) — cheap model for low-complexity tasks, expensive model for high-stakes generation
- **Future:** Fine-tuned model on XIIGen generation data reduces API costs as usage grows

**Plan gate question:** Is cost tracked per tenant per task type? Are generation cycles captured as training data? Is there a local model path for dev/test?

**Negative example (violation):** Every call routes to `Codex-opus` regardless of task complexity. Low-complexity code scaffolding costs the same as high-stakes architectural generation. No training data captured.

---

## The 8-Gate Checklist (Planning-Skill Gate 7)

Run this checklist for every plan before approval:

```
P1: Multi-tenant
  [ ] Every new index/table/key has tenantId scope
  [ ] No tenant can read another tenant's data
  [ ] TenantId comes from AsyncLocalStorage, not parameters
  [ ] Per-tenant config overrides supported

P2: Safe configs
  [ ] No hardcoded API keys or endpoints
  [ ] ISecretsService used for all secrets
  [ ] FREEDOM config for tenant-variable settings
  [ ] MACHINE config for invariant settings

P3: Prompt improvement
  [ ] Prompts are PromptAsset records with versions
  [ ] AF-9 Judge score triggers improvement cycle
  [ ] Multi-model critique path exists
  [ ] Rollback = pointer swap, not content mutation

P4: RAG dual-tier
  [ ] New knowledge goes into RAG (not hardcoded)
  [ ] Local RAG variant configured for testing
  [ ] docker-compose.test.yml has ES on port 19200
  [ ] Seeding command exists for local RAG

P5: Self-improvement
  [ ] AF-11 captures skillsActive + scoreDelta
  [ ] Failed patterns become negative RAG exemplars
  [ ] Improvement loop triggers on score drop
  [ ] Promotion ladder defined for new patterns

P6: BFA arbitration
  [ ] New events checked against FLOW-01–FLOW-31
  [ ] bfaRegistration.events[] defined in EngineContract
  [ ] Conflict resolution path exists (FLOW-25 Arbiter)
  [ ] AF-2 planning gate checks cross-flow impact

P7: Local testability
  [ ] Unit tests: pure logic path defined
  [ ] Simulation tests: @nestjs/testing path defined
  [ ] Docker tests: fabric provider path defined
  [ ] Test sequence: unit → sim → docker → review

P8: Cost + training
  [ ] Token counts logged per (tenantId, taskType, modelId)
  [ ] Judge verdicts captured as training exemplars
  [ ] Local model path exists for dev/test (ollama or mock)
  [ ] Model routing logic defined (simple vs complex tasks)
```
