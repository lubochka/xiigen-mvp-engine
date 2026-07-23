# FLOW-06 THROUGH FLOW-34 — PATCH INSTRUCTIONS FOR CLAUDE CODE
## Version: 1.0 | Date: 2026-04-01
## Covers: 29 flows, 5 template fixes each, 3 per-flow fixes each
## Total files modified: ~145 (5 per flow × 29 flows)

---

## AUDIT RESULTS (confirmed by grep across all 29 flows)

All 5 template errors are present in every flow — FLOW-06 through FLOW-34.
All 29 flows also have wrong user_intent, inline PRIOR_ART, and FLOW-01 arbiter table.

```
Error                                    Flows affected
──────────────────────────────────────   ──────────────
Step 3: SK-499 instead of SK-448         All 29
Step 4: behaviour field in NODE           All 29
Step 4: "majority vote >= 0.5"           All 29
Step 4: REGISTRATION/VERIFICATION table  All 29
Step 5: convergence_score_threshold 0.5  All 29
Step 6: behaviour.steps in S3 signal     All 29
Step 8: SK-442 instead of SK-452         All 29
Step 8: node.behaviour.steps in Mapping  All 29
user_intent: "Generate production-ready" All 29
PRIOR_ART: inline bullet content         All 29
```

---

## PART 1 — RUN THE PYTHON PATCH SCRIPT (template fixes)

The script `patch_flows.py` applies the 5 template fixes to all 29 flows at once.

**Step 1 — Copy script to project root:**
Copy `/home/claude/patch_flows.py` to `[PROJECT_ROOT]/patch_flows.py`

**Step 2 — Run from project root:**
```bash
cd [PROJECT_ROOT]
python patch_flows.py
```

Expected output:
```
✅ Template fixes applied: 145 files modified
✅ No errors — all replacements found and applied
```

If any "NOT FOUND" errors appear: the file structure differs from expected.
Report which files and stop — do not proceed to Part 2.

**Step 3 — Verify template fixes applied:**
```bash
# Must return 0 lines
grep -rn "SK-499\|SK-442\|convergence_score_threshold\|majority vote >= 0\.5\|behaviour\.steps\|behaviour: {" \
  docs/sessions/FLOW-06 docs/sessions/FLOW-07 docs/sessions/FLOW-10 docs/sessions/FLOW-20 docs/sessions/FLOW-34

# Must return hits (one per flow minimum)
grep -rn "SK-448" docs/sessions/FLOW-06/FLOW-06-STEP-3-CYCLE1-TEST.md
grep -rn "SK-452" docs/sessions/FLOW-06/FLOW-06-STEP-8-HANDOFF-CONTRACT.md
grep -rn "grade_threshold: 0.85" docs/sessions/FLOW-06/FLOW-06-STEP-5-CYCLE2-TEST.md
grep -rn "constraints:" docs/sessions/FLOW-06/FLOW-06-STEP-4-CYCLE2-TEMPLATE.md
grep -rn "quality.scoringCriteria" docs/sessions/FLOW-06/FLOW-06-STEP-6-CYCLE3-CONTEXT.md
```

⛔ STOP after Part 1. Report verification results. Await approval before Part 2.

---

## PART 2 — PER-FLOW FIXES (user_intent + PRIOR_ART + arbiter table)

Apply to Steps 1, 2, and 4 only. Steps 3, 5, 6, 7, 8, 9, 10 are not touched here.

For each flow: open Step 1, Step 2, and Step 4. Make the three fixes. Save. Verify.
Process one flow at a time. No chaining.

---

### FLOW-06 — Membership & Group Feed (T99-T118)

**user_intent** (Steps 1 AND 2 — both files):
```
When a member joins a group on the XIIGen community platform, update their
membership tier, populate their group feed with relevant content, and enforce
access control based on their membership level.
```

**PRIOR_ART** (Step 2 only — replace the 5 inline bullets with one line):
```
PRIOR_ART: "prior plans for membership-tiers group-feed access-control community-platform flow"
```

**Arbiter table** (Step 4 only):
```
| Step Type          | Arbiter Count |
|--------------------|---------------|
| MEMBERSHIP_TIER    | 4             |
| GROUP_FEED         | 4             |
| ACCESS_CONTROL     | 7             |
| Default            | 4             |
```

---

### FLOW-07 — A/B Testing & Experimentation (T119-T138)

**user_intent**:
```
When a user interacts with the XIIGen social platform, route them through the
active A/B experiment, record the interaction to the social feed, and track
the experiment assignment for analysis.
```

**PRIOR_ART**:
```
PRIOR_ART: "prior plans for friend-request social-feed ab-experiment-routing community-platform flow"
```

**Arbiter table**:
```
| Step Type          | Arbiter Count |
|--------------------|---------------|
| SOCIAL_FEED        | 4             |
| FRIEND_REQUEST     | 4             |
| AB_EXPERIMENT      | 7             |
| Default            | 4             |
```

---

### FLOW-08 — Multi-Tenant State Machine (T139-T168)

**user_intent**:
```
When a seller lists a product on the XIIGen marketplace, validate the listing
against the catalog, advance the tenant state machine to the active state, and
make the listing discoverable to buyers.
```

**PRIOR_ART**:
```
PRIOR_ART: "prior plans for marketplace-listing catalog-validation tenant-state-machine community-platform flow"
```

**Arbiter table**:
```
| Step Type            | Arbiter Count |
|----------------------|---------------|
| MARKETPLACE_LISTING  | 4             |
| CATALOG_VALIDATION   | 4             |
| TENANT_STATE_MACHINE | 7             |
| Default              | 4             |
```

---

### FLOW-09 — RAG Pattern Extraction & Skill Indexing (T99-T118)

**user_intent**:
```
When a generation cycle completes on the XIIGen engine, extract the RAG
patterns from the output, index the identified skills into the knowledge
graph, and make the patterns available for future retrieval.
```

**PRIOR_ART**:
```
PRIOR_ART: "prior plans for rag-pattern-extraction skill-indexing knowledge-graph engine-intelligence flow"
```

**Arbiter table**:
```
| Step Type           | Arbiter Count |
|---------------------|---------------|
| PATTERN_EXTRACTION  | 4             |
| SKILL_INDEXING      | 4             |
| KNOWLEDGE_GRAPH     | 7             |
| Default             | 4             |
```

---

### FLOW-10 — Reviews & Reputation (T169-T188)

**user_intent**:
```
When a member submits a review on the XIIGen community platform, score
the review for quality, update the subject's reputation ledger, and route
borderline reviews through the moderation queue.
```

**PRIOR_ART**:
```
PRIOR_ART: "prior plans for review-scoring reputation-ledger content-moderation community-platform flow"
```

**Arbiter table**:
```
| Step Type          | Arbiter Count |
|--------------------|---------------|
| REVIEW_SCORING     | 4             |
| REPUTATION_LEDGER  | 4             |
| MODERATION_QUEUE   | 7             |
| Default            | 4             |
```

---

### FLOW-11 — Schema Registry & DAG (T189-T208)

**user_intent**:
```
When a new schema version is submitted to the XIIGen engine, register it
in the schema registry, validate it against the DAG for dependency conflicts,
and publish the version if validation passes.
```

**PRIOR_ART**:
```
PRIOR_ART: "prior plans for schema-registry dag-validation schema-versioning engine-intelligence flow"
```

**Arbiter table**:
```
| Step Type          | Arbiter Count |
|--------------------|---------------|
| SCHEMA_REGISTRY    | 4             |
| DAG_VALIDATION     | 4             |
| SCHEMA_VERSIONING  | 7             |
| Default            | 4             |
```

---

### FLOW-12 — Subscription & Billing (T209-T228)

**user_intent**:
```
When a customer changes their subscription on the XIIGen platform, calculate
proration, emit the billing event to the billing engine, and update the
subscription lifecycle state.
```

**PRIOR_ART**:
```
PRIOR_ART: "prior plans for subscription-lifecycle billing-events proration-calculation platform-billing flow"
```

**Arbiter table**:
```
| Step Type              | Arbiter Count |
|------------------------|---------------|
| SUBSCRIPTION_LIFECYCLE | 4             |
| BILLING_EVENT          | 4             |
| PRORATION              | 7             |
| Default                | 4             |
```

---

### FLOW-13 — Data Warehouse & Analytics (T169-T188)

**user_intent**:
```
When analytics data arrives on the XIIGen platform, route it through the
analytics pipeline, transform it for the warehouse connector, and emit the
CloudEvent schema for downstream consumers.
```

**PRIOR_ART**:
```
PRIOR_ART: "prior plans for analytics-pipeline warehouse-connector cloudevent-schema platform-analytics flow"
```

**Arbiter table**:
```
| Step Type             | Arbiter Count |
|-----------------------|---------------|
| ANALYTICS_PIPELINE    | 4             |
| WAREHOUSE_CONNECTOR   | 4             |
| CLOUDEVENT_SCHEMA     | 7             |
| Default               | 4             |
```

---

### FLOW-14 — ETL & Data Integration (T189-T200)

**user_intent**:
```
When a data source publishes an event on the XIIGen platform, extract and
transform the payload through the ETL pipeline, validate against the 25
CloudEvent schemas, and enforce BFA peer-flow rules before loading.
```

**PRIOR_ART**:
```
PRIOR_ART: "prior plans for etl-pipeline cloudevent-schema bfa-peer-flow data-integration flow"
```

**Arbiter table**:
```
| Step Type        | Arbiter Count |
|------------------|---------------|
| ETL_EXTRACT      | 4             |
| ETL_TRANSFORM    | 4             |
| ETL_LOAD         | 7             |
| Default          | 4             |
```

---

### FLOW-15 — SaaS Platform & Multi-Tenancy (T201-T240)

**user_intent**:
```
When a tenant is provisioned on the XIIGen SaaS platform, initialise
the 40 contracts for their platform interfaces, wire the 7 required
named checks, and confirm the 52 CloudEvent schemas are registered.
```

**PRIOR_ART**:
```
PRIOR_ART: "prior plans for saas-platform multi-tenancy platform-interfaces named-checks cloudevent-schema flow"
```

**Arbiter table**:
```
| Step Type           | Arbiter Count |
|---------------------|---------------|
| TENANT_PROVISION    | 4             |
| CONTRACT_INIT       | 4             |
| NAMED_CHECK_WIRE    | 7             |
| Default             | 4             |
```

---

### FLOW-16 — Marketplace & Payments (T241-T268)

**user_intent**:
```
When a payment is initiated on the XIIGen marketplace, write the outbox
entry before enqueuing, enforce idempotency via DNA-9, execute the
compensation chain on failure, and confirm all 14 named checks pass.
```

**PRIOR_ART**:
```
PRIOR_ART: "prior plans for marketplace-payment outbox-pattern compensation-chain named-checks platform-payments flow"
```

**Arbiter table**:
```
| Step Type           | Arbiter Count |
|---------------------|---------------|
| PAYMENT_INITIATION  | 4             |
| COMPENSATION_CHAIN  | 4             |
| NAMED_CHECK_GATE    | 7             |
| Default             | 4             |
```

---

### FLOW-17 — Freelancer Marketplace Platform (T229-T245)

**user_intent**:
```
When a freelancer completes a deliverable on the XIIGen marketplace, lock
the escrow ledger, store the deliverable, and execute the N-step LIFO
compensation chain if the milestone is disputed.
```

**PRIOR_ART**:
```
PRIOR_ART: "prior plans for escrow-ledger deliverable-store lifo-compensation freelancer-marketplace flow"
```

**Arbiter table**:
```
| Step Type           | Arbiter Count |
|---------------------|---------------|
| ESCROW_LEDGER       | 4             |
| DELIVERABLE_STORE   | 4             |
| LIFO_COMPENSATION   | 7             |
| Default             | 4             |
```

---

### FLOW-18 — Visual Flow Creation & Code Injection Engine (T246-T286)

**user_intent**:
```
When a designer creates a visual flow on the XIIGen engine, merge the CRDT
edits, inject the generated code into the target module, and auto-register
the flow with the BFA conflict detector.
```

**PRIOR_ART**:
```
PRIOR_ART: "prior plans for crdt-merge code-injection bfa-auto-registration visual-flow engine flow"
```

**Arbiter table**:
```
| Step Type          | Arbiter Count |
|--------------------|---------------|
| CRDT_MERGE         | 4             |
| CODE_INJECTION     | 4             |
| BFA_REGISTRATION   | 7             |
| Default            | 4             |
```

---

### FLOW-19 — Durable Sagas & Compliance (T287-T306)

**user_intent**:
```
When a multi-step saga is initiated on the XIIGen platform, evaluate
the 9 named check conditions, run the EP-5 crash harness against the
saga steps, and emit the compliance event on completion.
```

**PRIOR_ART**:
```
PRIOR_ART: "prior plans for durable-saga named-check ep5-crash-harness compliance platform-sagas flow"
```

**Arbiter table**:
```
| Step Type       | Arbiter Count |
|-----------------|---------------|
| SAGA_INITIATION | 4             |
| NAMED_CHECK     | 4             |
| CRASH_HARNESS   | 7             |
| Default         | 4             |
```

---

### FLOW-20 — Sponsored Content + Graph API + Ads Platform (T287-T306)

**user_intent**:
```
When an ad impression is recorded on the XIIGen platform, route the
request-response through the dual-gate arbiter, debit the spend ledger,
and emit the sponsored content event to the graph API.
```

**PRIOR_ART**:
```
PRIOR_ART: "prior plans for sponsored-content spend-ledger dual-gate-arbiter graph-api platform-ads flow"
```

**Arbiter table**:
```
| Step Type           | Arbiter Count |
|---------------------|---------------|
| AD_IMPRESSION       | 4             |
| SPEND_LEDGER        | 4             |
| DUAL_GATE_ARBITER   | 7             |
| Default             | 4             |
```

---

### FLOW-21 — Dynamic Forms & Workflows (T307-T340)

**user_intent**:
```
When a user submits a dynamic form on the XIIGen platform, evaluate the
conditional logic, advance the workflow state machine to the next step,
and trigger any dependent form renders.
```

**PRIOR_ART**:
```
PRIOR_ART: "prior plans for dynamic-form conditional-logic workflow-state-machine platform-forms flow"
```

**Arbiter table**:
```
| Step Type            | Arbiter Count |
|----------------------|---------------|
| FORM_SUBMISSION      | 4             |
| CONDITIONAL_LOGIC    | 4             |
| WORKFLOW_STATE       | 7             |
| Default              | 4             |
```

---

### FLOW-22 — CMS & Publishing Platform (T341-T380)

**user_intent**:
```
When an editor publishes content on the XIIGen CMS, advance the editorial
workflow to published state, register the slug, and emit the versioned
publish event to downstream consumers.
```

**PRIOR_ART**:
```
PRIOR_ART: "prior plans for cms-editorial-workflow versioned-publishing slug-registry platform-cms flow"
```

**Arbiter table**:
```
| Step Type          | Arbiter Count |
|--------------------|---------------|
| EDITORIAL_WORKFLOW | 4             |
| SLUG_REGISTRY      | 4             |
| VERSIONED_PUBLISH  | 7             |
| Default            | 4             |
```

---

### FLOW-23 — Form Builder & Templates (T381-T420)

**user_intent**:
```
When a user creates a form on the XIIGen form builder, save it to the
template gallery, configure the submission pipeline, and make the form
available for embedding.
```

**PRIOR_ART**:
```
PRIOR_ART: "prior plans for form-builder template-gallery submission-pipeline platform-form-builder flow"
```

**Arbiter table**:
```
| Step Type           | Arbiter Count |
|---------------------|---------------|
| FORM_BUILDER        | 4             |
| TEMPLATE_GALLERY    | 4             |
| SUBMISSION_PIPELINE | 7             |
| Default             | 4             |
```

---

### FLOW-24 — AI Safety & Content Moderation (T421-T460)

**user_intent**:
```
When content is submitted on the XIIGen platform, enforce the CF-465 iron
rule via the SafetyGateToken, run the 8 named safety checks, and update
the gamification ledger based on the moderation outcome.
```

**PRIOR_ART**:
```
PRIOR_ART: "prior plans for ai-safety content-moderation safety-gate-token named-checks gamification platform-safety flow"
```

**Arbiter table**:
```
| Step Type          | Arbiter Count |
|--------------------|---------------|
| SAFETY_GATE        | 4             |
| MODERATION_CHECK   | 4             |
| GAMIFICATION_LEDGER| 7             |
| Default            | 4             |
```

---

### FLOW-25 — BFA Cross-Flow Governance (T461-T512)

**user_intent**:
```
When a new flow is registered on the XIIGen engine, run BFA conflict
detection across all active flows, validate entity, route, and factory
overlap, and block deployment if any conflict is detected.
```

**PRIOR_ART**:
```
PRIOR_ART: "prior plans for bfa-conflict-detection entity-overlap route-overlap factory-overlap engine-governance flow"
```

**Arbiter table**:
```
| Step Type           | Arbiter Count |
|---------------------|---------------|
| CONFLICT_DETECTION  | 4             |
| ENTITY_VALIDATION   | 4             |
| DEPLOYMENT_GATE     | 7             |
| Default             | 4             |
```

---

### FLOW-26 — Self-Developing Meta-Flow Engine (T389-T412)

**user_intent**:
```
When the XIIGen engine identifies a capability gap, generate the contract
for a new meta-flow, extend the engine with the generated service, and
register the extension with the BFA conflict detector.
```

**PRIOR_ART**:
```
PRIOR_ART: "prior plans for meta-flow contract-generation engine-self-extension bfa-registration engine-meta-flow flow"
```

**Arbiter table**:
```
| Step Type           | Arbiter Count |
|---------------------|---------------|
| CONTRACT_GENERATION | 4             |
| ENGINE_EXTENSION    | 4             |
| BFA_REGISTRATION    | 7             |
| Default             | 4             |
```

---

### FLOW-27 — Human Interaction Gate (T413-T422)

**user_intent**:
```
When a generation cycle produces an output that requires human review on
the XIIGen engine, queue the review task, assign it to the review panel,
and route escalations through the approval gate.
```

**PRIOR_ART**:
```
PRIOR_ART: "prior plans for human-approval-gate review-queue escalation-routing engine-human-gate flow"
```

**Arbiter table**:
```
| Step Type        | Arbiter Count |
|------------------|---------------|
| REVIEW_QUEUE     | 4             |
| APPROVAL_GATE    | 4             |
| ESCALATION_ROUTE | 7             |
| Default          | 4             |
```

---

### FLOW-28 — Blog/CMS Modules Platform (T423-T440)

**user_intent**:
```
When a blog post is published on the XIIGen platform, enforce CF590 content
rules, sanitize XSS and SSRF vectors, apply the budget gate, and serve
the post from the cache-first published-only search index.
```

**PRIOR_ART**:
```
PRIOR_ART: "prior plans for blog-cms cf590 xss-ssrf-sanitization cache-first published-search platform-blog flow"
```

**Arbiter table**:
```
| Step Type          | Arbiter Count |
|--------------------|---------------|
| CONTENT_VALIDATION | 4             |
| SECURITY_GATE      | 4             |
| CACHE_PUBLISH      | 7             |
| Default            | 4             |
```

---

### FLOW-29 — Adaptive RAG Deep Research (T443-T469)

**user_intent**:
```
When a deep research query arrives on the XIIGen engine, route it through
the adaptive RAG pipeline, execute multi-hop graph traversal, and return
synthesised findings with source attribution.
```

**PRIOR_ART**:
```
PRIOR_ART: "prior plans for adaptive-rag deep-research multi-hop-reasoning graph-traversal engine-rag flow"
```

**Arbiter table**:
```
| Step Type          | Arbiter Count |
|--------------------|---------------|
| RAG_ROUTING        | 4             |
| MULTI_HOP_TRAVERSAL| 4             |
| SYNTHESIS          | 7             |
| Default            | 4             |
```

---

### FLOW-30 — Tenant Lifecycle Manager (T470-T479)

**user_intent**:
```
When a tenant is deprovisioned on the XIIGen platform, transition the
lifecycle state, execute the cleanup cascade across all tenant-scoped
indices, and confirm the tenant scope is fully cleared.
```

**PRIOR_ART**:
```
PRIOR_ART: "prior plans for tenant-provisioning lifecycle-transitions cleanup-cascade platform-tenant flow"
```

**Arbiter table**:
```
| Step Type             | Arbiter Count |
|-----------------------|---------------|
| LIFECYCLE_TRANSITION  | 4             |
| CLEANUP_CASCADE       | 4             |
| SCOPE_VERIFICATION    | 7             |
| Default               | 4             |
```

---

### FLOW-31 — Design Intelligence Engine (T480-T506)

**user_intent**:
```
When a design token is updated on the XIIGen design system, extract the
new token values, validate all dependent components for compliance, and
publish the updated governance report.
```

**PRIOR_ART**:
```
PRIOR_ART: "prior plans for design-system-governance token-extraction component-compliance engine-design flow"
```

**Arbiter table**:
```
| Step Type            | Arbiter Count |
|----------------------|---------------|
| TOKEN_EXTRACTION     | 4             |
| COMPONENT_COMPLIANCE | 4             |
| GOVERNANCE_REPORT    | 7             |
| Default              | 4             |
```

---

### FLOW-32 — Sharable Flows & RAG Template Marketplace (T516-T535)

**user_intent**:
```
When a flow author publishes a template to the XIIGen marketplace, apply
tripartite signing, store the template in the content-addressed store,
route it through human review, and confirm the 7 named checks pass.
```

**PRIOR_ART**:
```
PRIOR_ART: "prior plans for tripartite-signing content-addressed-store human-review named-checks template-marketplace flow"
```

**Arbiter table**:
```
| Step Type          | Arbiter Count |
|--------------------|---------------|
| TRIPARTITE_SIGNING | 4             |
| CAS_STORAGE        | 4             |
| NAMED_CHECK_GATE   | 7             |
| Default            | 4             |
```

---

### FLOW-33 — System Initiation: Self-Building Bootstrap (T516-T522)

**user_intent**:
```
When the XIIGen engine starts for the first time, bootstrap the generation
loop, seed the initial skills into the knowledge graph, and confirm the
engine is capable of self-initiating the first flow.
```

**PRIOR_ART**:
```
PRIOR_ART: "prior plans for generation-loop-bootstrap engine-self-initiation skill-seeding engine-bootstrap flow"
```

**Arbiter table**:
```
| Step Type            | Arbiter Count |
|----------------------|---------------|
| BOOTSTRAP_INITIATION | 4             |
| SKILL_SEEDING        | 4             |
| LOOP_CONFIRMATION    | 7             |
| Default              | 4             |
```

---

### FLOW-34 — AI Agent Orchestration (T536-T579)

**user_intent**:
```
When an AI agent task is submitted to the XIIGen engine, route it through
the thin adapter compliance gate, collect votes from the agent panel, and
confirm the orchestration result via the voting gate.
```

**PRIOR_ART**:
```
PRIOR_ART: "prior plans for ai-agent-orchestration thin-adapter-compliance voting-gate engine-agent flow"
```

**Arbiter table**:
```
| Step Type              | Arbiter Count |
|------------------------|---------------|
| AGENT_ROUTING          | 4             |
| ADAPTER_COMPLIANCE     | 4             |
| VOTING_GATE            | 7             |
| Default                | 4             |
```

---

## VERIFICATION AFTER PART 2

Run for each flow after applying per-flow fixes:
```bash
# user_intent must NOT contain "Generate production-ready"
grep -c "Generate production-ready" docs/sessions/FLOW-XX/FLOW-XX-STEP-1-INVARIANTS.md
grep -c "Generate production-ready" docs/sessions/FLOW-XX/FLOW-XX-STEP-2-CYCLE1-CONTEXT.md
# Expected: 0 for both

# PRIOR_ART must be a single query line
grep -A 2 "^PRIOR_ART:" docs/sessions/FLOW-XX/FLOW-XX-STEP-2-CYCLE1-CONTEXT.md
# Expected: one line starting with a quote, no bullet points

# Arbiter table must NOT contain REGISTRATION
grep -c "REGISTRATION" docs/sessions/FLOW-XX/FLOW-XX-STEP-4-CYCLE2-TEMPLATE.md
# Expected: 0
```

⛔ STOP after each flow. Report verification result. Await approval before next flow.

---

## DOCUMENT CHECKLIST

Per flow, 3 files modified:
```
□ FLOW-XX-STEP-1-INVARIANTS.md      (user_intent)
□ FLOW-XX-STEP-2-CYCLE1-CONTEXT.md  (user_intent + PRIOR_ART)
□ FLOW-XX-STEP-4-CYCLE2-TEMPLATE.md (arbiter table)
```

Plus script applied to 5 files per flow:
```
□ FLOW-XX-STEP-3-CYCLE1-TEST.md
□ FLOW-XX-STEP-4-CYCLE2-TEMPLATE.md
□ FLOW-XX-STEP-5-CYCLE2-TEST.md
□ FLOW-XX-STEP-6-CYCLE3-CONTEXT.md
□ FLOW-XX-STEP-8-HANDOFF-CONTRACT.md
```

Total per flow: 7 files. Total across 29 flows: 203 file operations.
Steps 7, 9, 10 are correct in all flows — do not modify.
