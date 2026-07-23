# XIIGen Core Principles — Agent Instructions

## Load this skill when
- planning-skill Gate 7 is reached
- A plan is being reviewed for foundational compliance
- SESSION-0 runs FC-12 check (principles compliance)
- The word "principles" appears in a planning context

## When to invoke (ALWAYS before infrastructure discovery)
Load this skill early — before the plan is written — so violations are caught in the design phase, not after code is written.

## The 8 Principles — One Line Each

| # | Principle | One Line |
|---|-----------|----------|
| P1 | Multi-Tenant by Default | `tenantId` scope on every artifact — no shared state across tenants |
| P2 | Safe Configs | All secrets via `ISecretsService`, all configs via fabric FREEDOM pattern |
| P3 | Prompt Improvement | Prompts are versioned `PromptAsset` records; AF-9 Judge drives improvement cycle |
| P4 | RAG Dual-Tier | Knowledge in global RAG; local RAG (ES:19200) for testing |
| P5 | Self-Improving Engine | AF-11 captures what worked; engine selection improves over time |
| P6 | BFA Arbitration | New decision nodes validated against FLOW-01–31; conflicts escalate via FLOW-25 |
| P7 | Local Testability | Unit → Simulation → Docker test path for every new component |
| P8 | Cost + Training | Token costs tracked per tenant; generation cycles captured as training data |

## The 32-Item Checklist (4 per principle)

**P1 — Multi-Tenant:**
- [ ] Every new index/table/cache key has `tenantId` scope
- [ ] No method accepts `tenantId` as parameter — it comes from AsyncLocalStorage
- [ ] Per-tenant config overrides are supported
- [ ] Tenant A cannot read Tenant B's data (verified by test)

**P2 — Safe Configs:**
- [ ] No hardcoded API keys or model endpoints in source
- [ ] `ISecretsService.getSecret(key, tenantId)` used for all credentials
- [ ] Per-tenant variable settings are FREEDOM config
- [ ] Invariant settings are MACHINE config

**P3 — Prompt Improvement:**
- [ ] New prompts are `PromptAsset` records (id, version, content, evalScore, status)
- [ ] AF-9 Judge evaluates prompt quality; threshold triggers improvement loop
- [ ] Multi-model critique path exists (Claude + GPT-4 + Gemini)
- [ ] Rollback = pointer swap to previous ACTIVE version

**P4 — RAG Dual-Tier:**
- [ ] New knowledge goes into RAG (not hardcoded in TypeScript)
- [ ] Local ES instance configured in docker-compose.test.yml (port 19200)
- [ ] RAG seeding command available (`npm run rag:seed`)
- [ ] Test suite uses local RAG, not production RAG

**P5 — Self-Improvement:**
- [ ] AF-11 captures `skillsActive`, `scoreDelta` per generation cycle
- [ ] Failed patterns injected as negative exemplars in RAG
- [ ] Score drop triggers improvement loop (not just logging)
- [ ] Promotion ladder defined for new patterns (DRAFT → CORE)

**P6 — BFA Arbitration:**
- [ ] New events cross-validated against FLOW-01–31
- [ ] `bfaRegistration.events[]` in every new EngineContract
- [ ] Semantic conflict path exists (FLOW-25 Arbiter)
- [ ] AF-2 planning gate checks cross-flow impact before generation

**P7 — Local Testability:**
- [ ] Unit test path defined (pure logic, no I/O)
- [ ] Simulation test path defined (`@nestjs/testing` with in-memory providers)
- [ ] Docker test path defined (real containers via docker-compose.test.yml)
- [ ] Test sequence enforced: unit → sim → docker

**P8 — Cost + Training:**
- [ ] OTel token logging: `(tenantId, taskType, modelId)` per request
- [ ] AF-9 Judge verdicts captured as training exemplars
- [ ] Local model path exists (ollama or mock provider) for dev cycles
- [ ] Model routing logic separates simple tasks (cheap) from complex (expensive)

## RED FLAGS — Automatic Plan Rejection

These patterns mean the plan violates a foundational principle. Do not proceed to code:

| Red Flag | Principle | Rejection reason |
|----------|-----------|-----------------|
| `const prompt = \`Generate...\`` (static string in code) | P3 | Prompt not versioned |
| `tenantId` as method parameter | P1 | Bypasses AsyncLocalStorage isolation |
| `new Anthropic({ apiKey: hardcoded })` | P2 | Secret not in ISecretsService |
| New knowledge hardcoded in `af3-prompt-library.ts` | P4 | Should go to RAG |
| No test matrix in plan | P7 | Missing testability path |
| No token cost tracking in new AF station | P8 | Cost invisible |
| New event without BFA check | P6 | Cross-flow conflict risk |
