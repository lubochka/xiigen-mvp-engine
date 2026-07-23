---
name: flow-plan-review
sk_number: SK-437
version: "2.0.0"
priority: BLOCKING
author: luba
updated: "2026-03-23"
description: >
  Two-layer gate that fires before ANY flow execution (FLOW-01 through FLOW-32+).
  Layer 0: Infrastructure Readiness Gate — verifies all ~170+ cumulative gaps (~533+ build items) are resolved
  before any flow can be approved. No flow executes until the engine can actually run it.
  Layer 1: 12-section plan completeness check — validates the specific flow plan is complete.
  Both layers must pass. Infrastructure failure blocks immediately, skips completeness check.
triggers:
  - "flow plan is presented"
  - "FLOW-XX plan submitted"
  - "here is the flow plan"
  - "plan for flow"
  - "file with FLOW-NN in name or opening content"
  - "@<filename containing FLOW- prefix>"
  - "execute flow"
  - "start phase A"
  - "begin INJECT"
  - "run FLOW"
---

# flow-plan-review v2.0.0

## Purpose

Every flow plan submitted for execution must pass two gates before any Phase A work begins:

**Gate 0 — Infrastructure Readiness:** The engine must be able to run a flow.
All ~170+ identified gaps (~533+ build items across 8 phases) must be resolved.
No flow runs on missing infrastructure. Infrastructure failures do not produce educational DPO triples — they produce crashes and incorrect data that corrupt the training set.

**Gate 1 — Plan Completeness:** The specific flow plan must be fully specified.
Incomplete plans lead to incorrect seeding, wrong arbiters, mid-cycle discoveries,
and wasted DPO triples on a broken generation loop.

There is no partial approval. Infrastructure must be ready. Plan must be complete.

---

## When to Invoke

Auto-fire **immediately** when any of the following occur — before any other response:

- A document with `FLOW-` in its filename is referenced
- The user writes "here is the flow plan", "plan for flow", "execute flow", "start phase A", "run FLOW-XX"
- A markdown document is submitted whose opening section contains `flow_id:` or a task type list
- A session file references a FLOW-XX plan document

Do NOT wait for explicit instruction to run this check. It fires on detection.
Do NOT run Gate 1 (plan completeness) if Gate 0 (infrastructure) fails.

---

## GATE 0 — Infrastructure Readiness

Run these checks in order. First failure = INFRA-BLOCKED. Stop. Do not proceed to Gate 1.

For each check: **PASS** = confirmed present | **FAIL** = absent or broken

### PHASE 1 — Foundation (blocks all execution)

**CHECK 1.1 — P26 Kernel Fixes (7 MT defects)**
```bash
# All 7 must pass:
node -e "require('./packages/kernel/src/mt/tenant-key-generator'); console.log('✅ TenantKeyGenerator')"
node -e "require('./packages/kernel/src/mt/idempotency-store'); console.log('✅ IIdempotencyStore')"
grep -q 'DataProcessResult' server/src/kernel/guardrails/scope-enforcer.ts && echo "✅ ScopeEnforcer returns DataProcessResult"
node -e "require('./packages/kernel/src/mt/tenant-registry'); console.log('✅ ITenantRegistry')"
grep -q 'guardQuota\|QuotaEnforcer' server/src/kernel/quota/quota-enforcer.ts && echo "✅ QuotaEnforcer"
grep -q 'X-Tenant-Id\|TenantContextMiddleware' server/src/kernel/middleware/tenant-context.middleware.ts && echo "✅ TenantContextMiddleware"
grep -q 'IDatabaseService\|ES.*backed' server/src/freedom/freedom-config-manager.ts && echo "✅ FreedomConfigManager ES-backed"
```
FAIL if any output is not ✅.

**CHECK 1.2 — Dead Code Deleted (14 files)**
```bash
for f in \
  server/src/scripts/run-flow01-af-pipeline.ts \
  server/src/af-stations/inventory-engine.ts \
  server/src/af-stations/synthesis-engine.ts \
  server/src/af-stations/judgment-engine.ts \
  server/src/af-stations/af3-prompt-library.ts \
  server/src/af-stations/af4-rag-context.ts \
  server/src/af-stations/af1-genesis.ts \
  server/src/af-stations/af2-planning.ts \
  server/src/af-stations/af6-code-review.ts \
  server/src/af-stations/af8-security.ts \
  server/src/af-stations/af11-feedback.ts \
  server/src/engine-contracts/flow01-user-registration-contracts.ts \
  server/src/engine-contracts/flow01-user-registration-seed-prompts.ts \
  server/src/scripts/test-af-station.ts; do
  [ -f "$f" ] && echo "❌ NOT DELETED: $f" || echo "✅ deleted: $f"
done
```
FAIL if any file still exists.

**CHECK 1.3 — ES Indices (12 required pre-FLOW-01)**
```bash
for idx in xiigen-prompts xiigen-rag-patterns xiigen-flow-definitions \
  xiigen-engine-contracts xiigen-run-traces xiigen-arbiters \
  xiigen-lifecycle xiigen-node-definitions xiigen-flow-state-snapshots \
  xiigen-checkpoint-reports xiigen-alerts xiigen-training-data \
  xiigen-bundles; do
  curl -sf localhost:9200/${idx}/_mapping | grep -q '"type"' \
    && echo "✅ ${idx}" || echo "❌ MISSING ${idx}"
done
```
FAIL if any index is missing. Note: xiigen-bundles required for Wave 2+ flows.
12 pre-FLOW-01: 9 from Track 1/S3 + xiigen-checkpoint-reports + xiigen-alerts + xiigen-training-data from S2.
xiigen-training-data MUST have domain/entityType/conflictType/ftId/productScope in mapping from day one.

---

### PHASE 2 — Core Engine (blocks all Phase B)

**CHECK 2.1 — EngineBootstrapper**
```bash
ls server/src/bootstrap/engine-bootstrapper.ts && echo "✅ EngineBootstrapper"
```

**CHECK 2.2 — 6 Node Handlers**
```bash
for h in rag-retrieve decompose ai-generate validate score feedback; do
  ls server/src/engine/node-handlers/${h}.handler.ts \
    && echo "✅ ${h}.handler" || echo "❌ MISSING ${h}.handler"
done
```

**CHECK 2.3 — TopologyStore + GenericNodeExecutor**
```bash
ls apps/api/src/engine/topology-store.ts && echo "✅ TopologyStore"
ls server/src/engine/generic-node-executor.ts && echo "✅ GenericNodeExecutor"
```
TopologyStore (Task 19a) reads xiigen-flow-definitions by taskTypeId; returns null gracefully for unknown task types; required before GenericNodeExecutor.

**CHECK 2.4 — PromptLibraryStation**
```bash
ls server/src/engine/prompt-library.station.ts && echo "✅ PromptLibraryStation"
```

---

### PHASE 3 — Handler Configuration (must exist before handlers can evaluate correctly)

**CHECK 3.1 — Archetype Template Registry (42 templates, JSON not TypeScript)**

The decompose.handler MUST load templates from an external registry, NOT from a hardcoded switch statement. Required templates (42 after FLOW-34; FLOW-14 adds 4 ETL archetypes B23-B26; FLOW-17 adds 4 marketplace archetypes B27-B30; FLOW-15/16/18 register archetype names but add no new decompose templates; FLOW-19 adds B31-B34; FLOW-20 adds B35; FLOW-21 adds B36-B39; FLOW-22 adds 0; FLOW-23/28/32 add 0; FLOW-24 adds B40=HYBRID_SYNC_ASYNC, B41=SAFETY_GATED_PUBLISH, B42=ADAPTIVE_CALENDAR):
```bash
for arch in SERVICE ORCHESTRATION CONVERGENCE BROADCAST PARALLEL \
            REGISTRATION PROMOTION ANALYTICS ATTENDANCE AGGREGATION \
            BROADCAST-SOCIAL COMPLETION GAMIFICATION MEMBERSHIP GROUP_FEED \
            SOCIAL-GRAPH FEED-PIPELINE SOCIAL-DISCOVERY \
            CATALOG LISTING-DISCOVERY SUBMISSION_GATEWAY MODERATION \
            INGESTION TRANSFORM MODELING ACTIVATION \
            MARKETPLACE ESCROW_SAGA EVIDENCE_CAPTURE REPUTATION \
            CATALOG_INGESTION ENV_PROVISIONING PIPELINE_CONTRACT RESTORE_DRILL \
            REQUEST_RESPONSE AUTHORING PERSISTENCE NOTIFICATION FEED_EXECUTION \
            HYBRID_SYNC_ASYNC SAFETY_GATED_PUBLISH ADAPTIVE_CALENDAR; do
  ls server/fixtures/archetype-templates/${arch,,}.template.json 2>/dev/null \
    && echo "✅ ${arch} template" || echo "❌ MISSING ${arch} template"
done
# Verify decompose.handler loads from registry, not switch:
grep -q 'loadTemplate\|ArchetypeRegistry\|archetype.*json' \
  server/src/engine/node-handlers/decompose.handler.ts \
  && echo "✅ Decompose loads from registry" \
  || echo "❌ Decompose may have hardcoded switch — verify"
```
FAIL if any archetype template is missing for the flow being reviewed.

**CHECK 3.2 — Named Check Registry (NamedCheckRegistry class) ⛔ PRE-WAVE-5 HARD BLOCKER — GAP-NEW-35**

All 219 named checks (FLOW-01=11, FLOW-02=5, FLOW-06=7, FLOW-32=18; net +5 vs original; final total 219) (after FLOW-22: Wave 3 close=101 + FLOW-14 adds 6 → 107 + FLOW-15 adds 15 → 116 + FLOW-16 adds 7 → 123 + FLOW-17 adds 10 → 133 + FLOW-18 adds 8 → 141 + FLOW-19 adds 8 → 149 + FLOW-20 adds 10 → 159 + FLOW-21 adds 5 → 164 + FLOW-22 adds 8 → 172; FLOW-23 adds 8 → 180; FLOW-24 adds 9 → 189; FLOW-28 adds 8 → 197; FLOW-32 adds 18 → 215; FLOW-34 adds 4 → 219 total required) must be driven by 7 generic evaluator patterns, loaded externally via `NamedCheckRegistry.loadFromES()` or `loadFromDirectory()`. NOT a hardcoded TypeScript Record in validate.handler.ts:
```bash
# Verify NamedCheckRegistry class exists
grep -q 'class NamedCheckRegistry\|NamedCheckRegistry' \
  server/src/engine/node-handlers/validate.handler.ts \
  && echo "✅ NamedCheckRegistry class" || echo "❌ MISSING NamedCheckRegistry (GAP-NEW-35)"
# Verify directory-based loading
ls server/fixtures/named-checks/ && echo "✅ named-checks fixtures dir" || echo "❌ MISSING fixtures/named-checks/"
```

The 7 generic evaluator patterns covering all 167 checks (externally loadable from xiigen-arbiters ES index):
```bash
for pattern in regex_present regex_absent line_order config_vs_hardcode \
               machine_constant branch_exists regex_absent_in_context; do
  grep -q "${pattern}" server/src/engine/node-handlers/validate.handler.ts \
    && echo "✅ evaluator: ${pattern}" || echo "❌ MISSING evaluator: ${pattern}"
done
# Verify checks are loaded from xiigen-arbiters, not hardcoded:
grep -q 'loadChecks\|ArbitersRegistry\|xiigen-arbiters' \
  server/src/engine/node-handlers/validate.handler.ts \
  && echo "✅ Checks load from ES" || echo "❌ Named checks may be hardcoded"
```
FAIL if any evaluator pattern is missing or checks are still hardcoded TypeScript.

**CHECK 3.3 — Quality Gate Evaluators in score.handler (48 evaluators)**

```bash
for gate in dna_compliance iron_rules testability \
            parallel_execution convergence_guard always_emit consent_check \
            null_capacity deferred_not_failed best_effort atomic_capacity \
            machine_constant dual_entry_path group_atomicity \
            lifo_compensation conditional_secondary_event \
            role_hierarchy compound_scope numeric_range_clamping \
            zero_score_valid \
            aggregate_only \
            two_phase_reservation fail_open_behavior pure_function_inline \
            three_path_moderation aggregate_retraction \
            machine_state_machine ep4_saga_cycle_order scd2_immutability \
            zone_promotion_order pii_gate_before_mart \
            db_unique_idempotency derived_never_stored \
            external_ref_only activity_counts_only atomic_pg_transaction; do
  grep -q "${gate}" server/src/engine/node-handlers/score.handler.ts \
    && echo "✅ gate: ${gate}" || echo "❌ MISSING gate: ${gate}"
done
# Critical: CONTRACT-AWARE evaluators (6 total) — each reads from schema fields
grep -q 'contract\.machineConstants\|machineConstants.*contract' \
  server/src/engine/node-handlers/score.handler.ts \
  && echo "✅ machine_constant reads from contract" \
  || echo "❌ machine_constant may not be contract-aware"
grep -q 'contract\.failureBehavior.*FAIL_OPEN\|failureBehavior.*contract' \
  server/src/engine/node-handlers/score.handler.ts \
  && echo "✅ fail_open_behavior is contract-aware" \
  || echo "❌ fail_open_behavior may not be contract-aware"
grep -q "taskTypeId.*T112\|pureFunction.*contract\|contract.*pureFunction" \
  server/src/engine/node-handlers/score.handler.ts \
  && echo "✅ pure_function_inline is contract-aware" \
  || echo "❌ pure_function_inline may not be contract-aware"
grep -q 'contract\.moderationPaths\|moderationPaths.*contract' \
  server/src/engine/node-handlers/score.handler.ts \
  && echo "✅ three_path_moderation reads moderationPaths from contract" \
  || echo "❌ three_path_moderation may not be contract-aware"
grep -q 'contract\.aggregation\|aggregation\.removeEvents\|handlesRetraction' \
  server/src/engine/node-handlers/score.handler.ts \
  && echo "✅ aggregate_retraction reads aggregation from contract" \
  || echo "❌ aggregate_retraction may not be contract-aware"
grep -q 'machineFreedom.*state_machine\|machine.*type.*state_machine\|stateTransitions\|transitions.*machine' \
  server/src/engine/node-handlers/score.handler.ts \
  && echo "✅ machine_state_machine reads machineFreedom.machine[].type from contract" \
  || echo "❌ machine_state_machine may not be contract-aware (FLOW-12 T-[+1], GAP-NEW-55)"

# FLOW-14 CONTRACT-AWARE evaluators
grep -q 'ep4_saga_cycle_order\|ep4.*saga.*order\|saga.*cycle.*order' \
  server/src/engine/node-handlers/score.handler.ts \
  && echo "✅ ep4_saga_cycle_order CONTRACT-AWARE evaluator (FLOW-14 T190/T192)" \
  || echo "❌ MISSING ep4_saga_cycle_order (FLOW-14 T190/T192 — EP-4 durable saga ordering)"

grep -q 'scd2_immutability\|scd2.*immut\|never.*update.*only.*version' \
  server/src/engine/node-handlers/score.handler.ts \
  && echo "✅ scd2_immutability CONTRACT-AWARE evaluator (FLOW-14 T195)" \
  || echo "❌ MISSING scd2_immutability (FLOW-14 T195 — SCD-2 never update only version)"

grep -q 'zone_promotion_order\|zone.*promo.*order\|raw.*before.*staging' \
  server/src/engine/node-handlers/score.handler.ts \
  && echo "✅ zone_promotion_order CONTRACT-AWARE evaluator (FLOW-14 T193/T200)" \
  || echo "❌ MISSING zone_promotion_order (FLOW-14 T193/T200 — CF-192 zone promotion)"

grep -q 'pii_gate_before_mart\|pii.*gate.*mart\|classification.*before.*mart' \
  server/src/engine/node-handlers/score.handler.ts \
  && echo "✅ pii_gate_before_mart evaluator (FLOW-14 T196)" \
  || echo "❌ MISSING pii_gate_before_mart (FLOW-14 T196 — F462 PLATFORM-ONLY PII gate)"

# FLOW-17 evaluators
grep -q 'db_unique_idempotency\|DB_UNIQUE_constraint\|dbUnique.*idempotency' \
  server/src/engine/node-handlers/score.handler.ts \
  && echo "✅ db_unique_idempotency CONTRACT-AWARE evaluator (FLOW-17 T231)" \
  || echo "❌ MISSING db_unique_idempotency (FLOW-17 T231 — financial DB UNIQUE constraint)"
grep -q 'derived_never_stored\|derived_at_query_time_never_stored\|neverStore.*score' \
  server/src/engine/node-handlers/score.handler.ts \
  && echo "✅ derived_never_stored CONTRACT-AWARE evaluator (FLOW-17 T245)" \
  || echo "❌ MISSING derived_never_stored (FLOW-17 T245 — reputation score never persisted)"
grep -q 'external_ref_only\|externalRefOnly\|base64.*BUILD_FAILURE\|EVIDENCE_CAPTURE.*privacy' \
  server/src/engine/node-handlers/score.handler.ts \
  && echo "✅ external_ref_only evaluator (FLOW-17 T243 CF-293)" \
  || echo "❌ MISSING external_ref_only (FLOW-17 T243 — screenshot external ref BUILD_FAILURE)"
grep -q 'activity_counts_only\|activityCountsOnly\|keystroke.*BUILD_FAILURE\|CF.294' \
  server/src/engine/node-handlers/score.handler.ts \
  && echo "✅ activity_counts_only evaluator (FLOW-17 T243 CF-294)" \
  || echo "❌ MISSING activity_counts_only (FLOW-17 T243 — no keystroke/mouse content BUILD_FAILURE)"
grep -q 'atomic_pg_transaction\|atomicPgTransaction\|db\.transaction.*financial' \
  server/src/engine/node-handlers/score.handler.ts \
  && echo "✅ atomic_pg_transaction evaluator (FLOW-17 T231/T236/T239)" \
  || echo "❌ MISSING atomic_pg_transaction (FLOW-17 — multiple financial factories in single db.transaction)"

# FLOW-18 evaluator
grep -q 'multi_model_consensus\|multiModelConsensus\|contract.*multiModelConsensus' \
  server/src/engine/node-handlers/score.handler.ts \
  && echo "✅ multi_model_consensus CONTRACT-AWARE evaluator (FLOW-18 T251 — 3-model parallel; single-model = IR-251-1 score-0)" \
  || echo "❌ MISSING multi_model_consensus (FLOW-18 T251 — fires when contract.multiModelConsensus === true)"

# FLOW-19 evaluator
grep -q 'compensation_before_apply\|compensationBeforeApply\|storeCompensation.*before.*apply' \
  server/src/engine/node-handlers/score.handler.ts \
  && echo "✅ compensation_before_apply evaluator (FLOW-19 T272 DD-152 — storeCompensation before apply line-order)" \
  || echo "❌ MISSING compensation_before_apply (FLOW-19 T272 — IaC provision saga compensation-first)"

# FLOW-20 evaluators
grep -q 'consent_blocking_pipeline_gate\|consentBlockingPipelineGate\|consent.*pipeline.*gate' \
  server/src/engine/node-handlers/score.handler.ts \
  && echo "✅ consent_blocking_pipeline_gate evaluator (FLOW-20 T301/T292 — consent must be FIRST step)" \
  || echo "❌ MISSING consent_blocking_pipeline_gate (FLOW-20 — consent blocks entire auction pipeline)"
grep -q 'redis_only_no_pg\|redisOnlyNoPg\|no.*PG.*auction\|auction.*no.*postgres' \
  server/src/engine/node-handlers/score.handler.ts \
  && echo "✅ redis_only_no_pg evaluator (FLOW-20 T292 DD-166 — no PG/ORM in auction critical path)" \
  || echo "❌ MISSING redis_only_no_pg (FLOW-20 T292 — PG adds 5-15ms breaches 50ms SLO)"
grep -q 'conservative_multi_model\|conservativeMultiModel\|DD.175\|Math\.min.*score.*diverge' \
  server/src/engine/node-handlers/score.handler.ts \
  && echo "✅ conservative_multi_model evaluator (FLOW-20 DD-175 — take LOWER score on >10% divergence)" \
  || echo "❌ MISSING conservative_multi_model (FLOW-20 — Math.max on scores = score-0 for content safety)"

# FLOW-24 evaluators
grep -q 'platform_only_enforcement\|platformOnlyEnforcement' \
  server/src/engine/node-handlers/score.handler.ts \
  && echo "✅ platform_only_enforcement evaluator (FLOW-24 — PLATFORM-ONLY factories; no tenant override binding)" \
  || echo "❌ MISSING platform_only_enforcement (FLOW-24)"
grep -q 'append_only_enforcement\|appendOnlyEnforcement' \
  server/src/engine/node-handlers/score.handler.ts \
  && echo "✅ append_only_enforcement CONTRACT-AWARE evaluator (FLOW-24 — F1014/F1010 IAppendOnlyStore; no UPDATE/DELETE; DDL REVOKE)" \
  || echo "❌ MISSING append_only_enforcement (FLOW-24)"
grep -q 'safety_gate_token_required\|safetyGateTokenRequired' \
  server/src/engine/node-handlers/score.handler.ts \
  && echo "✅ safety_gate_token_required CONTRACT-AWARE evaluator (FLOW-24 — F1003.publish() receives SafetyGateToken from F1002; DR-168)" \
  || echo "❌ MISSING safety_gate_token_required (FLOW-24)"
grep -q 'server_side_grading_only\|serverSideGradingOnly' \
  server/src/engine/node-handlers/score.handler.ts \
  && echo "✅ server_side_grading_only evaluator (FLOW-24 — no client-submitted score field; DD-226)" \
  || echo "❌ MISSING server_side_grading_only (FLOW-24)"
grep -q 'timezone_from_profile\|timezoneFromProfile' \
  server/src/engine/node-handlers/score.handler.ts \
  && echo "✅ timezone_from_profile evaluator (FLOW-24 — TZ from F982 profile never client/server TZ; DD-223)" \
  || echo "❌ MISSING timezone_from_profile (FLOW-24)"
grep -q 'fabric_connector_only\|fabricConnectorOnly' \
  server/src/engine/node-handlers/score.handler.ts \
  && echo "✅ fabric_connector_only CONTRACT-AWARE evaluator (FLOW-24 — no hardcoded Google/Outlook API calls; CF-466)" \
  || echo "❌ MISSING fabric_connector_only (FLOW-24)"

# FLOW-34 evaluator (PENALIZES complexity — FIRST evaluator that scores LOWER for more logic)
grep -q 'thin_adapter_compliance\|thinAdapterCompliance' \
  server/src/engine/node-handlers/score.handler.ts \
  && echo "✅ thin_adapter_compliance evaluator (FLOW-34 — IR-THIN-1; PENALIZES DB queries/business rules/direct HTTP in adapter; score-0 for complexity; FIRST evaluator that scores lower for more logic)" \
  || echo "❌ MISSING thin_adapter_compliance (FLOW-34 — adapter-ONLY evaluator)"
```
FAIL if any evaluator is missing. Fail if any CONTRACT-AWARE evaluator lacks schema field reading.
**5th CONTRACT-AWARE evaluator: machine_state_machine** (after machine_constant, zero_score_valid, fail_open_behavior, pure_function_inline). Fires only when `machineFreedom.machine[].type === "state_machine"`. 4 checks: (1) transition guard exists, (2) invalid transitions emit rollback, (3) transition map NOT from config.get(), (4) state enum matches declared states[].
**FLOW-14 adds 4 more CONTRACT-AWARE evaluators (9th through 12th):** ep4_saga_cycle_order (fires on machineFreedom.machine[].key === "ep4_saga_cycle_order"), scd2_immutability (fires on "scd2_immutability" key), zone_promotion_order (fires on "zone_promotion_order" key), pii_gate_before_mart (fires for MODELING archetype).
**FLOW-17 adds 5 more evaluators (13th through 17th):** db_unique_idempotency (CONTRACT-AWARE: fires on DB_UNIQUE_constraint MACHINE value), derived_never_stored (CONTRACT-AWARE: fires on derived_at_query_time_never_stored MACHINE value), external_ref_only (archetype-triggered: EVIDENCE_CAPTURE), activity_counts_only (archetype-triggered: EVIDENCE_CAPTURE), atomic_pg_transaction (financial-context: multiple financial factory calls). Total after FLOW-17: 36 evaluators (11 CONTRACT-AWARE).
**FLOW-18 adds 1 evaluator:** multi_model_consensus (CONTRACT-AWARE: fires when contract.multiModelConsensus === true). Total: 37.
**FLOW-19 adds 1 evaluator:** compensation_before_apply (line-order check: storeCompensation before apply). Total: 38.
**FLOW-20 adds 3 evaluators:** consent_blocking_pipeline_gate, redis_only_no_pg, conservative_multi_model. **Total: 41 evaluators (12 CONTRACT-AWARE).**
**FLOW-24 adds 6 evaluators:** platform_only_enforcement, append_only_enforcement, safety_gate_token_required, server_side_grading_only, timezone_from_profile, fabric_connector_only. Total: 47.
**FLOW-34 adds 1 evaluator:** thin_adapter_compliance (PENALIZES complexity; adapter-ONLY; FIRST evaluator that scores LOWER for more logic; opposite of all 47 prior evaluators). **Total: 48 evaluators after FLOW-34.**

**CHECK 3.4 — EngineContract Schema Extensions**

```bash
grep -q 'machineConstants' server/src/engine-contracts/contract-schema.ts \
  && echo "✅ machineConstants[]" || echo "❌ MISSING machineConstants[]"
grep -q 'compensationChain' server/src/engine-contracts/contract-schema.ts \
  && echo "✅ compensationChain" || echo "❌ MISSING compensationChain"
grep -q 'enumConstraint' server/src/engine-contracts/contract-schema.ts \
  && echo "✅ enumConstraint in ironRules" || echo "❌ MISSING enumConstraint"
grep -q 'discriminatedPayload' server/src/engine-contracts/contract-schema.ts \
  && echo "✅ discriminatedPayload" || echo "❌ MISSING discriminatedPayload"
grep -q '"DUAL"' server/src/engine-contracts/contract-schema.ts \
  && echo "✅ entry.type DUAL" || echo "❌ MISSING DUAL entry type"
grep -q 'source_resolution' server/src/engine-contracts/contract-schema.ts \
  && echo "✅ source_resolution" || echo "❌ MISSING source_resolution"
grep -q '"order".*handlers\|handlers.*"order"' server/src/engine-contracts/contract-schema.ts \
  && echo "✅ order field in handlers[]" || echo "❌ MISSING order in handlers[]"
grep -q 'scopeDimensions' server/src/engine-contracts/contract-schema.ts \
  && echo "✅ scopeDimensions[]" || echo "❌ MISSING scopeDimensions[]"
grep -q 'scopeRequirement' server/src/engine-contracts/contract-schema.ts \
  && echo "✅ scopeRequirement on ironRules" || echo "❌ MISSING scopeRequirement"
grep -q 'authorizationGate' server/src/engine-contracts/contract-schema.ts \
  && echo "✅ authorizationGate on ironRules" || echo "❌ MISSING authorizationGate"
grep -q 'conditionBehavior\|condition.*HandlerSpec' server/src/engine-contracts/contract-schema.ts \
  && echo "✅ condition/conditionBehavior on HandlerSpec" || echo "❌ MISSING HandlerSpec condition fields"
grep -q 'executionModel\|INLINE_ONLY' server/src/engine-contracts/contract-schema.ts \
  && echo "✅ executionModel / INLINE_ONLY entry type" || echo "❌ MISSING executionModel field"
grep -q 'inlineInvokes' server/src/engine-contracts/contract-schema.ts \
  && echo "✅ inlineInvokes[]" || echo "❌ MISSING inlineInvokes[]"
grep -q 'twoPhaseGate' server/src/engine-contracts/contract-schema.ts \
  && echo "✅ twoPhaseGate" || echo "❌ MISSING twoPhaseGate"
# Verify GenericNodeExecutor handles inline execution model
grep -q 'executionModel.*inline\|INLINE_ONLY\|generateServiceCode' \
  server/src/engine/generic-node-executor.ts \
  && echo "✅ E7: Inline execution model handled" || echo "❌ MISSING E7 inline execution model"
grep -q 'pureFunction.*true\|pureFunction.*inline\|INLINE.*pureFunction' \
  server/src/engine/generic-node-executor.ts \
  && echo "✅ E8: Pure function inline variant handled" || echo "❌ MISSING E8 pure function inline"
# Verify crossFlowFactoryDependencies support in EngineContract schema
grep -q 'crossFlowFactoryDependencies' server/src/engine-contracts/contract-schema.ts \
  && echo "✅ crossFlowFactoryDependencies schema field" || echo "❌ MISSING crossFlowFactoryDependencies (GAP-NEW-31)"
grep -q 'softDependencies' server/src/engine-contracts/contract-schema.ts \
  && echo "✅ softDependencies schema field" || echo "❌ MISSING softDependencies (GAP-NEW-32)"
grep -q 'machineFormula\|MachineFormulaSpec' server/src/engine-contracts/contract-schema.ts \
  && echo "✅ machineFormula schema field" || echo "❌ MISSING machineFormula (GAP-NEW-33)"
grep -q 'privacyConstraints\|MUST_NOT_PERSIST\|MUST_AGGREGATE_ONLY' server/src/engine-contracts/contract-schema.ts \
  && echo "✅ privacyConstraints schema field" || echo "❌ MISSING privacyConstraints (GAP-NEW-34)"
grep -q 'twoPhaseReservation\|atomicGroupOperation\|retryPolicy.*EXPONENTIAL' server/src/engine-contracts/contract-schema.ts \
  && echo "✅ FLOW-09 schema fields" || echo "❌ MISSING FLOW-09 schema fields (twoPhaseReservation/atomicGroupOperation/retryPolicy)"
grep -q 'failureBehavior.*FAIL_OPEN\|FAIL_OPEN.*failureBehavior' server/src/engine-contracts/contract-schema.ts \
  && echo "✅ failureBehavior: FAIL_OPEN schema field" || echo "❌ MISSING failureBehavior (FLOW-09 T113)"
grep -q 'pureFunction.*boolean' server/src/engine-contracts/contract-schema.ts \
  && echo "✅ pureFunction schema field" || echo "❌ MISSING pureFunction (FLOW-09 T112)"
# FLOW-10 schema fields (GAP-NEW-43 through GAP-NEW-47)
grep -q 'moderationPaths\|ModerationPathSpec' server/src/engine-contracts/contract-schema.ts \
  && echo "✅ moderationPaths schema field" || echo "❌ MISSING moderationPaths (FLOW-10 T-[+1], GAP-NEW-43)"
grep -q 'uncertaintyBehavior\|HUMAN_QUEUE' server/src/engine-contracts/contract-schema.ts \
  && echo "✅ uncertaintyBehavior schema field" || echo "❌ MISSING uncertaintyBehavior (GAP-NEW-43)"
grep -q 'aggregation.*AggregationSpec\|addEvents.*removeEvents\|recalculateOnRemove' server/src/engine-contracts/contract-schema.ts \
  && echo "✅ aggregation AggregationSpec schema field" || echo "❌ MISSING aggregation/AggregationSpec (FLOW-10 T-[+2], GAP-NEW-44)"
grep -q 'crossFlowReadDependencies\|CrossFlowReadDependency' server/src/engine-contracts/contract-schema.ts \
  && echo "✅ crossFlowReadDependencies schema field" || echo "❌ MISSING crossFlowReadDependencies (FLOW-10 T-[+0], GAP-NEW-45)"
grep -q 'conditionalReEntry\|ConditionalReEntrySpec\|CLEAR_SETNX\|REVISION_FLAG' server/src/engine-contracts/contract-schema.ts \
  && echo "✅ conditionalReEntry schema field" || echo "❌ MISSING conditionalReEntry (FLOW-10 T-[+3], GAP-NEW-46)"
# FLOW-11 schema fields (GAP-NEW-49 through GAP-NEW-54)
grep -q 'absoluteOverrides\|AbsoluteOverrideSpec' server/src/engine-contracts/contract-schema.ts \
  && echo "✅ absoluteOverrides schema field" || echo "❌ MISSING absoluteOverrides (FLOW-11 T155, GAP-NEW-49)"
grep -q 'graphDirection.*UNIDIRECTIONAL\|BIDIRECTIONAL.*graphDirection' server/src/engine-contracts/contract-schema.ts \
  && echo "✅ graphDirection schema field" || echo "❌ MISSING graphDirection (FLOW-11 T144, GAP-NEW-50)"
grep -q 'removalStrategy\|RemovalStrategySpec\|SHADOW_BAN' server/src/engine-contracts/contract-schema.ts \
  && echo "✅ removalStrategy schema field" || echo "❌ MISSING removalStrategy (FLOW-11 T142, GAP-NEW-51)"
grep -q 'namedModes\|NamedModeSpec' server/src/engine-contracts/contract-schema.ts \
  && echo "✅ namedModes schema field" || echo "❌ MISSING namedModes (FLOW-11 T145, GAP-NEW-52)"
grep -q 'inlineInvocationSpecs\|callerContextMap' server/src/engine-contracts/contract-schema.ts \
  && echo "✅ inlineInvocationSpecs schema field" || echo "❌ MISSING inlineInvocationSpecs (FLOW-11 T147, GAP-NEW-54)"
# FLOW-12 schema fields (GAP-NEW-55 through GAP-NEW-59)
grep -q 'financialTypeConstraints\|FinancialTypeSpec\|integer.cents' server/src/engine-contracts/contract-schema.ts \
  && echo "✅ financialTypeConstraints schema field" || echo "❌ MISSING financialTypeConstraints (FLOW-12 T-[+0], GAP-NEW-56)"
grep -q 'zeroNullDistinctFields' server/src/engine-contracts/contract-schema.ts \
  && echo "✅ zeroNullDistinctFields schema field" || echo "❌ MISSING zeroNullDistinctFields (FLOW-12 T-[+0], GAP-NEW-57)"
grep -q 'state_machine.*type\|type.*state_machine\|states.*transitions' server/src/engine-contracts/contract-schema.ts \
  && echo "✅ machineFreedom state_machine type" || echo "❌ MISSING state_machine machineFreedom type (FLOW-12 T-[+1], GAP-NEW-55)"
grep -q '"SCHEDULED"\|SCHEDULED.*entry\|entry.*SCHEDULED' server/src/engine-contracts/contract-schema.ts \
  && echo "✅ entry.type SCHEDULED" || echo "❌ MISSING SCHEDULED entry type (FLOW-12 T-[+2], GAP-NEW-58 ⛔ BLOCKER)"
grep -q 'factorySource\|dependencyType.*cross.wave\|cross.wave.*hard' server/src/engine-contracts/contract-schema.ts \
  && echo "✅ factorySource + dependencyType fields" || echo "❌ MISSING factorySource/dependencyType (FLOW-12, GAP-NEW-59)"
# FLOW-13 schema fields (GAP-NEW-60 through GAP-NEW-64)
grep -q 'multiLayerSecurityGate\|SecurityGateSpec\|securityGate.*layers' server/src/engine-contracts/contract-schema.ts \
  && echo "✅ multiLayerSecurityGate schema field" || echo "❌ MISSING multiLayerSecurityGate (FLOW-13 T173, GAP-NEW-60)"
grep -q 'irreversibleOperation\|IrreversibleOperationSpec\|requiresApprovalToken' server/src/engine-contracts/contract-schema.ts \
  && echo "✅ irreversibleOperation schema field" || echo "❌ MISSING irreversibleOperation (FLOW-13 T186, GAP-NEW-61)"
grep -q 'schemaEvolutionPolicy\|SchemaEvolutionPolicySpec\|additive.*breaking' server/src/engine-contracts/contract-schema.ts \
  && echo "✅ schemaEvolutionPolicy schema field" || echo "❌ MISSING schemaEvolutionPolicy (FLOW-13 T171, GAP-NEW-63)"
grep -q 'backpressure\|BackpressureSpec\|depthConfigKey' server/src/engine-contracts/contract-schema.ts \
  && echo "✅ backpressure schema field" || echo "❌ MISSING backpressure (FLOW-13 T169, GAP-NEW-64)"
# FLOW-14 machineFreedom ordering keys
grep -q 'ep4_saga_cycle_order\|zone_promotion_order\|scd2_immutability\|dim_versioning_atomicity' server/src/engine-contracts/contract-schema.ts \
  && echo "✅ FLOW-14 machineFreedom ordering keys" || echo "❌ MISSING FLOW-14 machineFreedom keys (T190/T193/T195/T200)"
# FLOW-15 schema fields (GAP-NEW-65 through GAP-NEW-71)
grep -q 'cryptographicExchange\|CryptographicExchangeSpec\|PKCE.*ephemeral' server/src/engine-contracts/contract-schema.ts \
  && echo "✅ cryptographicExchange schema field" || echo "❌ MISSING cryptographicExchange (FLOW-15 T202, GAP-NEW-65)"
grep -q 'securityComparisons\|SecurityComparisonSpec\|timingSafeEqual' server/src/engine-contracts/contract-schema.ts \
  && echo "✅ securityComparisons schema field" || echo "❌ MISSING securityComparisons (FLOW-15 T203, GAP-NEW-66)"
grep -q 'eventSourcedState\|EventSourcedStateSpec\|eventLog.*projection' server/src/engine-contracts/contract-schema.ts \
  && echo "✅ eventSourcedState schema field" || echo "❌ MISSING eventSourcedState (FLOW-15 T212, GAP-NEW-67)"
grep -q 'storageConstraints\|StorageConstraintSpec\|medium.*POSTGRESQL' server/src/engine-contracts/contract-schema.ts \
  && echo "✅ storageConstraints schema field" || echo "❌ MISSING storageConstraints (FLOW-15 T185/T213, GAP-NEW-68)"
grep -q 'keyVersioning\|KeyVersioningSpec\|CREATE_NEW_VERSION' server/src/engine-contracts/contract-schema.ts \
  && echo "✅ keyVersioning schema field" || echo "❌ MISSING keyVersioning (FLOW-15 T218, GAP-NEW-69)"
grep -q 'durableSaga\|DurableSagaSpec\|crashRecovery' server/src/engine-contracts/contract-schema.ts \
  && echo "✅ durableSaga schema field" || echo "❌ MISSING durableSaga (FLOW-15 T213/T217, GAP-NEW-70)"
# FLOW-16 schema fields (GAP-F16-01 through GAP-F16-02)
grep -q 'ep5OutboxRelay\|EP5OutboxSpec\|transactional.*outbox' server/src/engine-contracts/contract-schema.ts \
  && echo "✅ ep5OutboxRelay schema field" || echo "❌ MISSING ep5OutboxRelay (FLOW-16, GAP-F16-01)"
grep -q 'idempotencyKeyRegistry\|IdempotencyRegistrySpec\|guardedFactories' server/src/engine-contracts/contract-schema.ts \
  && echo "✅ idempotencyKeyRegistry schema field" || echo "❌ MISSING idempotencyKeyRegistry (FLOW-16, GAP-F16-02)"
# FLOW-17 machineFreedom MACHINE values
grep -q 'DB_UNIQUE_constraint\|dbUniqueConstraint' server/src/engine-contracts/contract-schema.ts \
  && echo "✅ DB_UNIQUE_constraint machineFreedom value (FLOW-17 T231)" || echo "❌ MISSING DB_UNIQUE_constraint (FLOW-17 T231, GAP-F17-01)"
grep -q 'derived_at_query_time_never_stored\|derivedNeverStored' server/src/engine-contracts/contract-schema.ts \
  && echo "✅ derived_at_query_time_never_stored machineFreedom value (FLOW-17 T245)" || echo "❌ MISSING derived_at_query_time_never_stored (FLOW-17 T245, GAP-F17-02)"
# FLOW-18 schema fields
grep -q 'multiModelConsensus' server/src/engine-contracts/contract-schema.ts \
  && echo "✅ multiModelConsensus schema field (FLOW-18 T251, GAP-18-02)" || echo "❌ MISSING multiModelConsensus (FLOW-18, GAP-18-02)"
grep -q 'featureFlagRequired' server/src/engine-contracts/contract-schema.ts \
  && echo "✅ featureFlagRequired schema field (FLOW-18 T253, GAP-18-05)" || echo "❌ MISSING featureFlagRequired (FLOW-18, GAP-18-05)"
# FLOW-19 schema fields
grep -q 'compensationSaga\|CompensationSagaSpec\|compensationStrategy' server/src/engine-contracts/contract-schema.ts \
  && echo "✅ compensationSaga CompensationSagaSpec schema field (FLOW-19 K8, GAP-NEW-74)" || echo "❌ MISSING compensationSaga (FLOW-19, K8)"
grep -q 'crossTaskValidations\|CrossTaskValidation' server/src/engine-contracts/contract-schema.ts \
  && echo "✅ crossTaskValidations schema field (FLOW-19 K7 — sole-gate cross-task)" || echo "❌ MISSING crossTaskValidations (FLOW-19, K7)"
# FLOW-20 schema fields
grep -q '"request_response"\|request_response.*executionModel\|executionModel.*request_response' server/src/engine-contracts/contract-schema.ts \
  && echo "✅ executionModel: request_response (FLOW-20 7th execution model, L6/L7)" || echo "❌ MISSING executionModel request_response (FLOW-20, L6)"
grep -q 'sloMs\|slo_ms\|SloMs' server/src/engine-contracts/contract-schema.ts \
  && echo "✅ sloMs schema field (FLOW-20 L6 — max latency ms for request_response)" || echo "❌ MISSING sloMs (FLOW-20, L6)"
# FLOW-21 schema fields
grep -q 'prerequisiteStages' server/src/engine-contracts/contract-schema.ts \
  && echo "✅ prerequisiteStages schema field (FLOW-21 GAP-21-01 — stage-gate ordering)" || echo "❌ MISSING prerequisiteStages (FLOW-21, GAP-21-01)"
grep -q '"invariants"\|invariants.*string\[\]' server/src/engine-contracts/contract-schema.ts \
  && echo "✅ invariants schema field (FLOW-21 GAP-21-01 — INV-15-1/INV-15-2)" || echo "❌ MISSING invariants (FLOW-21, GAP-21-01)"
grep -q 'machineFixedOrdering' server/src/engine-contracts/contract-schema.ts \
  && echo "✅ machineFixedOrdering schema field (FLOW-21 GAP-21-01 — machine-fixed operation order)" || echo "❌ MISSING machineFixedOrdering (FLOW-21, GAP-21-01)"
grep -q 'fanoutPosition\|FanoutPosition' server/src/engine-contracts/contract-schema.ts \
  && echo "✅ fanoutPosition schema field (FLOW-21 GAP-21-06 — FIRST|MIDDLE|LAST)" || echo "❌ MISSING fanoutPosition (FLOW-21, GAP-21-06)"
# FLOW-23 schema fields
grep -q 'accessMode\|"read-only"\|"read-write"' server/src/engine-contracts/contract-schema.ts \
  && echo "✅ accessMode schema field (FLOW-23 T357 — template_mode_readonly check)" || echo "❌ MISSING accessMode (FLOW-23)"
grep -q 'dagPosition\|dag_position' server/src/engine-contracts/contract-schema.ts \
  && echo "✅ dagPosition schema field (FLOW-23 T360 — step-1 enforcement)" || echo "❌ MISSING dagPosition (FLOW-23)"
grep -q 'qualityThreshold\|quality_threshold' server/src/engine-contracts/contract-schema.ts \
  && echo "✅ qualityThreshold schema field (FLOW-23 T363 — AF-9 fractional 0.8)" || echo "❌ MISSING qualityThreshold (FLOW-23)"
grep -q 'envelopeTarget\|envelope_target' server/src/engine-contracts/contract-schema.ts \
  && echo "✅ envelopeTarget schema field (FLOW-23 T361 — CloudEvents F969)" || echo "❌ MISSING envelopeTarget (FLOW-23)"
# FLOW-24 schema fields
grep -q 'hybridSyncAsync\|HybridSyncAsyncSpec' server/src/engine-contracts/contract-schema.ts \
  && echo "✅ hybridSyncAsync schema field (FLOW-24 T369 DD-220)" || echo "❌ MISSING hybridSyncAsync (FLOW-24)"
grep -q '"hybrid-sync-async"\|hybrid.*sync.*async.*executionModel' server/src/engine-contracts/contract-schema.ts \
  && echo "✅ executionModel: hybrid-sync-async (FLOW-24 — 8th execution model)" || echo "❌ MISSING hybrid-sync-async executionModel (FLOW-24)"
grep -q 'appendOnlyPattern\|IAppendOnlyStore' server/src/engine-contracts/contract-schema.ts \
  && echo "✅ appendOnlyPattern schema field (FLOW-24 F1014/F1010)" || echo "❌ MISSING appendOnlyPattern (FLOW-24)"
grep -q 'safetyGateTokenRequired\|safety_gate_token' server/src/engine-contracts/contract-schema.ts \
  && echo "✅ safetyGateTokenRequired schema field (FLOW-24 T368/T374 DR-168)" || echo "❌ MISSING safetyGateTokenRequired (FLOW-24)"
grep -q '"timezoneSource"\|timezoneSource.*profile' server/src/engine-contracts/contract-schema.ts \
  && echo "✅ timezoneSource schema field (FLOW-24 — profile/server/client DD-223)" || echo "❌ MISSING timezoneSource (FLOW-24)"
grep -q 'externalConnectors\|ExternalConnectorSpec' server/src/engine-contracts/contract-schema.ts \
  && echo "✅ externalConnectors schema field (FLOW-24 F1022-F1024 calendar fabric CF-466)" || echo "❌ MISSING externalConnectors (FLOW-24)"
# FLOW-28 schema fields
grep -q '"redis-only"\|"redis-first"\|storageMode' server/src/engine-contracts/contract-schema.ts \
  && echo "✅ storageMode schema field (FLOW-28 T423 draft Redis-only DD-273)" || echo "❌ MISSING storageMode (FLOW-28)"
grep -q 'pgWriteForbidden\|pg_write_forbidden' server/src/engine-contracts/contract-schema.ts \
  && echo "✅ pgWriteForbidden schema field (FLOW-28 draft path)" || echo "❌ MISSING pgWriteForbidden (FLOW-28)"
grep -q 'virusScanRequired\|virus_scan_required' server/src/engine-contracts/contract-schema.ts \
  && echo "✅ virusScanRequired schema field (FLOW-28 T428 CF-599)" || echo "❌ MISSING virusScanRequired (FLOW-28)"
grep -q 'circuitBreakerThreshold\|circuit_breaker_threshold' server/src/engine-contracts/contract-schema.ts \
  && echo "✅ circuitBreakerThreshold schema field (FLOW-28 T438 CF-585)" || echo "❌ MISSING circuitBreakerThreshold (FLOW-28)"
grep -q 'circuitBreakerWindow\|circuit_breaker_window' server/src/engine-contracts/contract-schema.ts \
  && echo "✅ circuitBreakerWindow schema field (FLOW-28 10 consecutive calls)" || echo "❌ MISSING circuitBreakerWindow (FLOW-28)"
grep -q 'af11FeedbackRequired\|af11_feedback' server/src/engine-contracts/contract-schema.ts \
  && echo "✅ af11FeedbackRequired schema field (FLOW-28 DD-283)" || echo "❌ MISSING af11FeedbackRequired (FLOW-28)"
grep -q 'debounceWindowMs\|debounce_window' server/src/engine-contracts/contract-schema.ts \
  && echo "✅ debounceWindowMs schema field (FLOW-28 T429 media variants)" || echo "❌ MISSING debounceWindowMs (FLOW-28)"
grep -q '"all-variants"\|"first-variant"\|completionMode' server/src/engine-contracts/contract-schema.ts \
  && echo "✅ completionMode schema field (FLOW-28 T429)" || echo "❌ MISSING completionMode (FLOW-28)"
# FLOW-32 schema fields
grep -q 'dualTenantEvent\|DualTenantEvent' server/src/engine-contracts/contract-schema.ts \
  && echo "✅ dualTenantEvent schema field (FLOW-32 T531 DUAL_WRITE)" || echo "❌ MISSING dualTenantEvent (FLOW-32)"
grep -q 'crossTaskReadDependencies\|cross_task_read' server/src/engine-contracts/contract-schema.ts \
  && echo "✅ crossTaskReadDependencies extended (FLOW-32 T534)" || echo "❌ MISSING crossTaskReadDependencies extension (FLOW-32)"
# FLOW-34 schema fields
grep -q '"hybrid"\|implementationMode.*hybrid' server/src/engine-contracts/contract-schema.ts \
  && echo "✅ implementationMode: hybrid (FLOW-34 manual phases A-D + per-plugin AF)" || echo "❌ MISSING implementationMode hybrid (FLOW-34)"
grep -q 'layerCoupling\|CONCEPT_NEUTRAL\|IMPL_VARIES\|STACK_COUPLED' server/src/engine-contracts/contract-schema.ts \
  && echo "✅ layerCoupling schema field (FLOW-34 three-layer coupling model)" || echo "❌ MISSING layerCoupling (FLOW-34)"
# Verify GenericNodeExecutor handles E9 (wave-prerequisite-check)
grep -q 'prerequisites.*forEach\|ALL.*ACTIVE\|prereq.*check' \
  server/src/engine/generic-node-executor.ts \
  && echo "✅ E9: Wave-prerequisite-check pattern" || echo "❌ MISSING E9 wave-prerequisite-check"
```

---

### PHASE 4 — APIs (blocks Phase A–E execution)

**CHECK 4.1 — All 6 Required Endpoints**
```bash
# Execute trigger
grep -rq 'POST.*flow.*execute\|execute.*flow' server/src/api/ \
  && echo "✅ POST /api/flow/execute" || echo "❌ MISSING /api/flow/execute"
# Run trace reader
grep -rq 'runs.*trace\|runId.*trace' server/src/api/ \
  && echo "✅ GET /api/runs/:runId/trace" || echo "❌ MISSING /api/runs/:runId/trace"
# Prompt CRUD
grep -rq 'prompts.*taskType\|taskType.*prompts' server/src/api/ \
  && echo "✅ /api/prompts/:taskType" || echo "❌ MISSING /api/prompts"
# RAG search
grep -rq 'rag.*search\|search.*rag' server/src/api/ \
  && echo "✅ POST /api/rag/search" || echo "❌ MISSING /api/rag/search"
# FlowStateSnapshot
grep -rq 'flow.*state\|flowId.*state' server/src/api/ \
  && echo "✅ GET /api/flow/:flowId/state" || echo "❌ MISSING FlowStateSnapshot endpoint"
# Lifecycle
grep -rq 'lifecycle.*flows\|flows.*lifecycle' server/src/api/ \
  && echo "✅ /api/lifecycle/flows" || echo "❌ MISSING lifecycle endpoints"
```

---

### PHASE 5 — Executor Extensions (required for specific flows)

**CHECK 5.1 — GenericNodeExecutor Capabilities**
```bash
grep -q 'registerEventConsumers\|consumes.*forEach\|consumes.*map' \
  server/src/engine/generic-node-executor.ts \
  && echo "✅ E3: Multiple CONSUMES registration" || echo "❌ MISSING E3"
grep -q 'route.*node\|nodeType.*route\|"route"' \
  server/src/engine/generic-node-executor.ts \
  && echo "✅ E4: Route node (dual entry path)" || echo "❌ MISSING E4"
grep -q 'forwardDependency\|forward.*register\|pending.*event' \
  server/src/engine/generic-node-executor.ts \
  && echo "✅ E5: Forward dependency registration" || echo "❌ MISSING E5"
grep -q 'machineOrder\|enforceOrder\|handlers.*sort.*order' \
  server/src/engine/generic-node-executor.ts \
  && echo "✅ E6: MACHINE-fixed step ordering" || echo "❌ MISSING E6"
grep -q 'INLINE_ONLY\|executionModel.*inline' \
  server/src/engine/generic-node-executor.ts \
  && echo "✅ E7: Inline execution model" || echo "❌ MISSING E7"
grep -q 'pureFunction' \
  server/src/engine/generic-node-executor.ts \
  && echo "✅ E8: Pure function inline variant" || echo "❌ MISSING E8 (FLOW-09 T112)"
grep -q 'prerequisites.*forEach\|ALL.*ACTIVE\|prereq.*check\|wave.*prerequisite' \
  server/src/engine/generic-node-executor.ts \
  && echo "✅ E9: Wave-prerequisite-check pattern" || echo "❌ MISSING E9 wave-prerequisite-check (FLOW-09+ — ALL Wave-N ACTIVE before Phase A)"
grep -q 'SCHEDULED\|registerScheduledJob\|Bull.*delayed\|BullMQ\|schedule.*job\|delayed.*job' \
  server/src/engine/generic-node-executor.ts \
  && echo "✅ E10: Scheduled job registration (FLOW-12 T-[+2])" || echo "❌ MISSING E10 SCHEDULED entry type (GAP-NEW-58 ⛔ BLOCKER)"
grep -q 'request_response\|requestResponse\|sloMs\|SLO.*monitor' \
  server/src/engine/generic-node-executor.ts \
  && echo "✅ E11: Request_response execution model (FLOW-20 — HTTP handler with SLO monitoring)" || echo "❌ MISSING E11 request_response execution model (FLOW-20)"
grep -q 'hybrid.*sync.*async\|hybridSyncAsync\|syncSteps\|asyncSteps\|split.*sync.*async' \
  server/src/engine/generic-node-executor.ts \
  && echo "✅ E12: Hybrid sync/async execution model (FLOW-24 T369 DD-220)" || echo "❌ MISSING E12 hybrid sync/async (FLOW-24)"
grep -q 'votingGate\|voting.*gate\|VotingResult\|4.*5.*threshold\|arbiter.*vote\|≥4.*5' \
  server/src/engine/generic-node-executor.ts \
  && echo "✅ E13: Voting gate ≥4/5 threshold (FLOW-34 — 5-arbiter consensus)" || echo "❌ MISSING E13 voting gate (FLOW-34)"
grep -q 'hybridMode\|hybrid.*mode.*transition\|manual.*phases\|implementationMode.*hybrid' \
  server/src/engine/generic-node-executor.ts \
  && echo "✅ E14: Hybrid mode transition manual→AF (FLOW-34)" || echo "❌ MISSING E14 hybrid mode transition (FLOW-34)"
```

---

### GATE 0 RESULT

Count all ❌ outputs across checks 1.1 through 5.1.

**If count > 0 → INFRA-BLOCKED:**
```
INFRASTRUCTURE NOT READY — FLOW EXECUTION BLOCKED
═══════════════════════════════════════════════════════════════════
Flow requested: [flow_id]
Infrastructure failures: [N] gaps unresolved

Failed checks:
  ❌ [CHECK N.N]: [what is missing]
  ❌ [CHECK N.N]: [what is missing]

Required action: Complete infrastructure build phases before running any flow.
Build order: PHASE 1 → PHASE 2 → PHASE 3 → PHASE 4 → PHASE 5
Critical path: SESSION-P26-S1.md → ES indices → node handlers → GenericNodeExecutor → APIs

Do NOT proceed to Phase A of any flow until all checks pass.
═══════════════════════════════════════════════════════════════════
```

**STOP. Do NOT run Gate 1. Do NOT check plan completeness.**

**If count = 0 → INFRASTRUCTURE READY. Proceed to Gate 1.**

---

## GATE 1 — Plan Completeness (12 Sections)

Only reached if Gate 0 passed.

For each section below: determine whether it is present **and** sufficiently specified.

- **Present + complete** → ✅ one-line summary of what was found
- **Absent or underspecified** → ❌ exact statement of what is missing

### Section 1 — Flow Metadata
Required: `flow_id` (e.g., FLOW-02), `wave` (0–3), `prerequisite_flows` (explicit list or NONE),
task type list where each entry declares: task type ID, archetype, entry event, exit event.

Underspecified if: archetypes missing, entry/exit events not named, wave not declared.

**Additional check for Wave 2+ flows:**
- Confirm pre-allocation ranges (Family, CF) are confirmed values — not `⛔ REQUIRED` placeholders.
- If T-range is lower than FLOW-01's T47 (e.g., FLOW-05's T44-T46): confirm the guard script
  checks for T-range collision before seeding, not just Family/CF allocation.
- Confirm `wave_baseline_entry` is set in STATE.json — not `__SET_BEFORE_WAVE_2_STARTS__`.

### Section 2 — New Patterns
Required: Explicit named list of new capability patterns this flow introduces.
Must match PAT-NNN naming from the cumulative pattern registry.

Underspecified if: section says "see contracts" or is empty, or patterns not individually named.

**Additional: Archetype templates required.** For each archetype in Section 1:
confirm a template exists (Check 3.1 above). If a new archetype appears that has NO template
yet built — this is both a ❌ for Section 2 AND a new infrastructure gap to report.

### Section 3 — Missing Infrastructure
Required: Explicit declaration of:
- Which of the ~170+ cumulative gaps (GAP-01 through GAP-34-16) this flow depends on
- Any NEW gaps this flow introduces (beyond the ~170 already known)
- ES indices that must exist before execution
- Node handler types registered in NodeHandlerRegistry
- Track 0 (P26 MT Kernel) fixes confirmed complete
- EngineBootstrapper fixtures seeded
- All EngineContract schema extensions present — including FLOW-08/09/10/11/12/13/14/15/16/17 additions:
  machineConstants, compensationChain, enumConstraint, discriminatedPayload, DUAL entry,
  source_resolution, order field, scopeDimensions, authorizationGate, executionModel,
  inlineInvokes, twoPhaseGate, crossFlowFactoryDependencies, softDependencies,
  machineFormula, privacyConstraints, twoPhaseReservation, atomicGroupOperation,
  retryPolicy, failureBehavior, pureFunction, crossWaveTriggers,
  moderationPaths, uncertaintyBehavior, aggregation (AggregationSpec),
  crossFlowReadDependencies, conditionalReEntry,
  absoluteOverrides, graphDirection, removalStrategy, namedModes, inlineInvocationSpecs,
  financialTypeConstraints (GAP-NEW-56), zeroNullDistinctFields (GAP-NEW-57),
  machineFreedom.machine[].type "state_machine" (GAP-NEW-55),
  entry.type "SCHEDULED" (GAP-NEW-58 ⛔ BLOCKER), factorySource + dependencyType (GAP-NEW-59),
  multiLayerSecurityGate (GAP-NEW-60), irreversibleOperation (GAP-NEW-61),
  schemaEvolutionPolicy (GAP-NEW-63), backpressure (GAP-NEW-64),
  cryptographicExchange (GAP-NEW-65), securityComparisons (GAP-NEW-66),
  eventSourcedState (GAP-NEW-67), storageConstraints (GAP-NEW-68),
  keyVersioning (GAP-NEW-69), durableSaga (GAP-NEW-70),
  ep5OutboxRelay (GAP-F16-01), idempotencyKeyRegistry (GAP-F16-02),
  DB_UNIQUE_constraint machineFreedom value (GAP-F17-01),
  derived_at_query_time_never_stored machineFreedom value (GAP-F17-02),
  multiModelConsensus boolean (GAP-18-02), featureFlagRequired string (GAP-18-05),
  compensationSaga CompensationSagaSpec (K8), crossTaskValidations CrossTaskValidation[] (K7),
  executionModel: "request_response" (L6), sloMs number (L6),
  prerequisiteStages string[] (GAP-21-01), invariants string[] (GAP-21-01),
  machineFixedOrdering (GAP-21-01), fanoutPosition FIRST|MIDDLE|LAST (GAP-21-06),
  accessMode read-only|read-write (GAP-F23-01), dagPosition/step1 enforcement (GAP-F23-02),
  qualityThreshold number (GAP-F23-03), envelopeTarget PLATFORM-ONLY (GAP-F23-04),
  hybridSyncAsync boolean (GAP-F24-01), executionModel: hybrid-sync-async (GAP-F24-02),
  appendOnlyPattern boolean (GAP-F24-03), safetyGateTokenRequired boolean (GAP-F24-04),
  timezoneSource "user_profile" (GAP-F24-05), externalConnectors string[] (GAP-F24-06),
  storageMode "redis-draft"|"pg-permanent" (GAP-F28-01), pgWriteForbidden boolean (GAP-F28-02),
  virusScanRequired boolean (GAP-F28-03), circuitBreakerThreshold number (GAP-F28-04),
  circuitBreakerWindow ms (GAP-F28-05), af11FeedbackRequired boolean (GAP-F28-06),
  debounceWindowMs number (GAP-F28-07), completionMode "human"|"auto" (GAP-F28-08),
  dualTenantEvent boolean (GAP-32-01), crossTaskReadDependencies (GAP-32-02),
  implementationMode: "hybrid" (GAP-34-01), layerCoupling "none"|"loose"|"tight" (GAP-34-02)

Underspecified if: section says "TBD", "none assumed", or is absent entirely.
**This section being absent = automatic rejection.** Unknown blockers = blocked execution.

**Reference gaps to check against:**
GAP-01 to GAP-10 (FLOW-01 foundation), GAP-NEW-01 to -04 (FLOW-02),
GAP-NEW-05 to -09 (FLOW-03), GAP-NEW-10 to -15 (FLOW-04),
GAP-NEW-16 to -20 (FLOW-05), GAP-NEW-21 to -25 (FLOW-06),
GAP-NEW-26 to -30 (FLOW-07), GAP-NEW-31 to -35 (FLOW-08),
GAP-NEW-36 to -42 (FLOW-09 domain-specific, G1-G10 impl specs),
GAP-NEW-43 to -48 (FLOW-10: moderationPaths, aggregation retraction, crossFlowRead, conditionalReEntry, score range parameterization, DPO conflict resolution),
GAP-NEW-49 to -54 (FLOW-11: absoluteOverrides/legal hold, graphDirection, removalStrategy/shadow-ban, namedModes/block-mute, factory reference validation, inlineInvocationSpecs),
GAP-NEW-55 to -59 (FLOW-12: machine_state_machine evaluator, financialTypeConstraints/integer-cents, zeroNullDistinctFields/zero-vs-null, SCHEDULED entry type E10, factorySource/dependencyType).
GAP-NEW-60 to -64 (FLOW-13: multiLayerSecurityGate three-layer-ordered-checks, irreversibleOperation approval-token gate, conditionalEdgeTest protocol, schemaEvolutionPolicy additive-vs-breaking, backpressure queue-depth reject).
GAP-15-01 to -08 (FLOW-15: archetype registry for 10+ new archetypes BLOCKER, PLATFORM-ONLY factory enforcement CRITICAL, EP-4 crash recovery harness CRITICAL, batched generation session management, cross-flow vault isolation, windowed aggregation RAG pattern, event-sourced state machine RAG pattern, silo graduation one-way enforcement).
GAP-NEW-65 to -71 (FLOW-15 deep-dive: cryptographicExchange PKCE, securityComparisons timing-safe, eventSourcedState circuit-breaker, storageConstraints POSTGRESQL, keyVersioning BYOK, durableSaga EP-4, dns_before_ssl ordering).
GAP-F16-01 to -14 (FLOW-16: EP-5 transactional outbox BLOCKER, idempotency key registry BLOCKER, LIFO saga compensation BLOCKER, two-actor BFA, VirtualClock, 3-model AI consensus, cart lock, financial PII scrubbing, non-repudiation audit, DNA-9 AST linter, FLOW-15 discrepancy, human review queue, seller metrics computation tier, BOLA check).
GAP-F17-01 to -11 (FLOW-17: db_unique_idempotency, derived_never_stored, external_ref_only BUILD_FAILURE, activity_counts_only BUILD_FAILURE, atomic_pg_transaction, 4 new archetype templates, 10 named arbiter checks, 25 BFA rules, Wave 4 pre-allocation BLOCKER, stress test registry, skill RAG indexing).
GAP-18-01 to -08 (FLOW-18: hot code injection F646 BLOCKER, multi-model consensus BLOCKER, CRDT F669 CRITICAL, sandbox network isolation CRITICAL, feature flag F682 BLOCKER, ST-183 DNA sweep IMPORTANT, BFA auto-registration CRITICAL, DAG acyclicity validator CRITICAL).
K1 to K11 (FLOW-19: compensation-before-apply evaluator, sole-gate cross-task check, audit-before-deactivation, zero-egress routing, wall-clock RTO, secrets-vault-ref-only, cross-task validation K7, 4 archetype templates + DURABLE_SAGA parametric, 8 named arbiter checks, 27 BFA rules, Wave 4 pre-allocation BLOCKER).
L1 to L12 (FLOW-20: consent-blocking-pipeline-gate evaluator, redis-only-no-pg check, PCI zero-PAN deep scan, political-dual-gate, fraud-before-billing ordering, executionModel request_response + sloMs schema, REQUEST_RESPONSE archetype template, 10 named arbiter checks, 24 BFA rules, DNA batch sweep, ST-214 backward compat, Wave 4 pre-allocation BLOCKER).
GAP-21-01 to -07 (FLOW-21: stage-gate pipeline ordering, composite anti-spam RAG pattern, Redis TTL→PG two-phase RAG pattern, DLQ-only retry named check, virus scan before signed URL, fan-out ordering payment-last, OAuth token PG-only).
GAP-22-1 to -8 (FLOW-22: ETag optimistic concurrency BLOCKER, append-only registry, snapshot-before-mutation BLOCKER, schema additive-only, publish saga compensation BLOCKER, single-pass transform, CDN invalidation mandatory, token queue during publish).
GAP-F23-01 to -10 (FLOW-23: step1_template_ordering DAG enforcer, pure-computation ILayoutSolverService F953, F969 CloudEvents PLATFORM-ONLY wrapper, JSONPath dynamic binding E11, DD-216 privilege escalation guard, tenant isolation step-1 fixture, accessMode schema field, dagPosition schema field, qualityThreshold schema field, envelopeTarget schema field).
GAP-F24-01 to -11 (FLOW-24: SafetyGateToken mandatory arg DR-168, hybridSyncAsync E12 executor mode, server-side grading only, consent-blocks-ALL gate, timezoneSource user_profile enforcement, B40 HYBRID_SYNC_ASYNC template, B41 SAFETY_GATED_PUBLISH template, B42 ADAPTIVE_CALENDAR template, Neo4j fabric IF-7 integration, 6 new evaluators BLOCKER, FLOW-24 named checks 9 BLOCKER).
GAP-F28-01 to -16 (FLOW-28: Redis-TTL draft storage, storageMode schema field, pgWriteForbidden schema field, XSS-before-storage sanitization enforcer, virusScanRequired schema field, SSRF-on-retry guard, AI circuit breaker Redis-backed, circuitBreakerThreshold schema field, circuitBreakerWindow schema field, maxFanout gate, af11FeedbackRequired schema field, debounceWindowMs schema field, completionMode schema field, human-in-loop queue integration, draft-never-pg named check, Redis-TTL ephemeral pattern RAG indexing).
GAP-32-01 to -07 (FLOW-32: logic/data DAG node separation, secret-ref indirection only, dualTenantEvent schema field, crossTaskReadDependencies schema field, integer arithmetic settlement enforcer, cosign+SBOM+SLSA supply chain signing, fraud_human_review_required gate).
GAP-NEW-77 to -109 (cross-flow infrastructure: JSONPath dynamic binding, consent-blocks-ALL evaluator, hybridSyncAsync executor, SafetyGateToken mandatory validator, XSS-before-storage enforcer, Redis-backed circuit breaker, SSRF-on-retry guard, maxFanout gate, supply chain signing cosign+SBOM+SLSA, integer arithmetic settlement, secret-ref indirection validator, 5-arbiter voting gate E13, meta-adapter hybrid mode E14, thin-adapter compliance evaluator, layerCoupling schema field, implementationMode hybrid, HYBRID_SYNC_ASYNC archetype template, SAFETY_GATED_PUBLISH archetype template, ADAPTIVE_CALENDAR archetype template, Neo4j fabric IF-7, Redis-TTL draft pattern, step1_template_ordering DAG enforcer, dagPosition schema field, envelopeTarget PLATFORM-ONLY, timezoneSource user_profile, storageMode redis-draft|pg-permanent, af11FeedbackRequired schema field, dualTenantEvent schema field, 5th DPO conflict LIFO vs atomic rollback).
GAP-34-01 to -16 (FLOW-34: thin-adapter compliance PENALIZES complexity, Mode A queue-only invocation, no-secrets-in-adapter enforcer, 5-arbiter voting gate E13 BLOCKER, meta-adapter hybrid mode E14, implementationMode hybrid schema, layerCoupling schema field, adapter complexity scoring, 4 new named checks BLOCKER, cross-flow BFA revalidation BLOCKER, FLOW-34 DPO triples pattern transfer 33% lowest ever, PLATFORM-ONLY 17 factories validation, Wave 5 pre-allocation null, adapter test harness, meta-generation archetype identification, adapter compliance scoring rubric).
N1 to N10 (cross-flow infrastructure patterns: stepOrderingEnforcer, pureFunctionSeparator, cloudEventsEnvelope PLATFORM-ONLY, jwtRoleOnly privilege guard, safetyGateTokenValidator, serverSideGradingOnly, consentBlocksAll, draftRedisOnly, ssrfInsideRetryGuard, fiveArbiterVotingGate).
**Wave 3 flows (FLOW-09+) additionally require:** ALL SIX Wave 2 flows ACTIVE (not just prerequisite flow), 17+ inline event schemas written BEFORE any EngineContract seeding, phase_b_progress checkpointing in STATE.json.
**Wave 4 flows (FLOW-14+) additionally require:** Named check registry externalized (128 checks), second DPO fine-tuning run with domain-context labels for 3 active conflicts, FLOW-13 ACTIVE, Wave 4 pre-allocation confirmed.

**Plan ambiguity check:** The plan must not contain unresolved ambiguities.
Flag any instruction that contradicts another instruction in the same plan.
Example: FLOW-05 T45 IR-5 states "revoke points → revoke badges → reset streak"
AND "LIFO compensation." These are contradictory — LIFO of award order (points→badges→streak)
= revoke in order (streak→badges→points). This ambiguity MUST be resolved before Phase A.
A plan with unresolved contradictions = REJECTED regardless of other sections.

### Section 4 — Phase Gates A–E
Required: Explicit pass criteria for all 5 phases:
- **A (INJECT):** What documents must be seeded (contracts, prompts, RAG patterns, BFA rules,
  topology docs, arbiter fixtures). For Wave 2+ flows: pre-allocation guard script must be listed.
- **B (GENERATE):** Score targets per task type (numeric: `quality_score >= X.XX`).
  First-cycle score predictions from learning spec must be present.
- **C (JUDGE):** Score bands with named actions (≥0.85 promote, 0.70–0.84 minimal patch,
  0.60–0.69 prompt patch, <0.60 escalate — do NOT run another cycle).
- **D (INTEGRATE):** Lint gates (no `t4*.ts` prefix, no `generated/` path), test count delta,
  FlowStateSnapshot verification for user-facing flows.
- **E (PROMOTE):** DPO minimum (number), pattern documentation requirements,
  lifecycle → ACTIVE write, bundle version check (required for Wave 2+ flows in any bundle).

Underspecified if: any one of the 5 phases lacks explicit criteria.

### Section 5 — Expected Results
Required per task type:
- **Level 2 (Planning):** `plan_completeness` target (≥0.90), `gate_detection` target (1.0),
  `cross_flow_accuracy` (1.0)
- **Level 1 (Code):** `iron_rule_pass_rate` (1.0), `dna_compliance` (1.0),
  `quality_score` target (≥0.85)
- First-cycle score prediction per task type (e.g., "0.65 cycle 1 — LIFO is new pattern")
- Cross-flow dependency accuracy: for each consumed event, the emitting flow and task type
  must be named. Forward dependencies (consuming from a future wave flow) must be flagged.

Underspecified if: targets are "TBD", "see contract", or missing for any task type.

### Section 6 — Positive Flows
Required: At minimum 1 happy-path scenario per task type.
Each scenario must show: trigger → processing steps → final state → downstream events emitted.

Underspecified if: any task type has no positive scenario, or scenarios lack trigger/final-state.

### Section 7 — Negative Flows
Required: At minimum 1 failure or edge-case scenario per task type.
Each negative scenario must name the **adaptation map entry** it exercises (by failure class name).

Underspecified if: negative scenarios exist but do not reference the adaptation map,
or any task type has no negative scenario at all.

**Additional check — MACHINE vs FREEDOM conflicts:**
If any task type has a MACHINE constant (must be hardcoded), the negative scenario must include
a test case where config.get() is used — and it must score 0.
If any task type has FREEDOM config values, the negative scenario must include a hardcoded
literal — and it must score 0.
A plan that declares a MACHINE constant without a negative scenario testing the config.get()
violation = underspecified.

### Section 8 — Arbiters per Node
Required: For every node in the flow's topology, an explicit arbiters list.
Format: `node_id → ['dna', 'fabric', 'tenant', 'security::pii', ...]`

Underspecified if: arbiters list is "same as T47" (must be explicit per node),
or any node in the topology is missing an arbiter declaration.

**Additional check:** Every arbiter must have a corresponding named check in the arbiter registry.
If an arbiter references a check ID that does not exist in Check 3.2 above (7 evaluator patterns
covering 30+ named checks), that check is a new infrastructure gap. Report it.

### Section 9 — Self-Testing Strategy
Required:
- Which test node type runs (e.g., `test-generate`)
- Minimum test scenario coverage (number of scenarios per task type)
- What constitutes a passing test cycle for this flow
- virtualClock test identified where TTL/time-window logic exists
- Concurrent request test identified where atomic operations exist (SETNX, locks)

Underspecified if: section exists but only says "tests will be generated" without specifying
node type, coverage target, or virtualClock/concurrent requirements.

### Section 10 — Communication Protocol
Required: The exact FLOW-XX-RESULTS.md schema this flow will produce at Phase E, including:
- Metrics to capture (plan_completeness, archetype_accuracy, gate_detection, BFA_detection,
  cycle_count, DPO_triples, pattern_transfer_rate)
- RAG health check (retrieval precision target ≥0.80)
- Training data check (DPO triples ≥ expected minimum)
- Readiness signal (what triggers local model readiness consideration)
- Pattern transfer rate from prior flow (N new patterns transferred / N total new patterns)

Underspecified if: section only says "produce results document" without schema.

### Section 11 — Adaptation Map
Required: For each anticipated failure class, a 4-column entry:
`failure_class → root_cause_location → fix_action → verification_command`

Root cause locations must use the canonical set:
- `planning` = decompose.handler archetype template
- `prompt` = genesis prompt in xiigen-prompts
- `code` = validate.handler named check / score.handler gate evaluator
- `RAG` = missing or low-quality RAG arch pattern

For each new pattern in Section 2: the adaptation map MUST include at least one entry for
the expected first-cycle failure of that pattern. If a pattern is new, cycle 1 WILL fail —
the adaptation map must know why and what to do.

Underspecified if: failure classes are listed without root cause location or fix action,
or a new pattern from Section 2 has no adaptation map entry.

### Section 12 — DPO Expectations
Required:
- Minimum DPO triples to capture during this flow
- Which score bands generate contrast pairs (e.g., "0.60–0.69 vs ≥0.85 creates high-contrast triple")
- Cumulative DPO total after this flow (vs. prior flows)
- Which new patterns from Section 2 are expected to generate DPO triples

Underspecified if: DPO count is "TBD" or contrast pair source is not declared.

---

## Gate 1 Rejection Protocol

If **any** section scores ❌:

```
PLAN REJECTED — INCOMPLETE
────────────────────────────────────────────────────────────────────
Flow: [flow_id or UNKNOWN]
Infrastructure: READY (Gate 0 passed)
Plan completeness: [N] of 12 required sections are missing or underspecified.

Missing sections:
  ❌ [Section name]: [exact statement of what is missing]
  ❌ [Section name]: [exact statement of what is missing]
  ...

Unresolved ambiguities:
  ⚠️ [task type] [IR-N]: [description of contradiction] — resolve before Phase A

Action required: Complete the above sections and resubmit.
────────────────────────────────────────────────────────────────────
Do NOT proceed with execution.
```

**Do NOT attempt to infer, fill in, or assume missing sections.**
**Do NOT proceed to Phase A.**
**Do NOT begin any seeding, generation, or scaffolding work.**

---

## Full Approval Output

If Gate 0 passes AND all 12 sections score ✅:

```
INFRASTRUCTURE READY + PLAN APPROVED — flow-plan-review v2.0.0 COMPLETE
═════════════════════════════════════════════════════════════════════════
Flow:                [flow_id] | Wave: [N] | Task Types: [N] ([T-XX, T-XX, ...])
Prerequisite Flows:  [list or NONE]
New Patterns:        [comma-separated PAT-NNN list]
New Archetypes:      [list — each must have a template in registry]
New Infra Gaps:      [list of new gaps this flow introduces, or NONE]
Bundle Membership:   [bundle IDs or N/A]

Infrastructure Gate:
  Phase 1 (Foundation):    ✅ P26 fixes | ✅ dead files deleted (4 deleted, af-pipeline.ts refactored) | ✅ 12 ES indices (9 Track 1 + xiigen-checkpoint-reports + xiigen-alerts + xiigen-training-data from S2)
  Phase 2 (Core engine):   ✅ Bootstrapper (archetype: ContractArchetype | string — console.warn not error; JSON schema "type": "string" no enum — Change 8) | ✅ 7 handlers (includes route.handler) | ✅ TopologyStore (Task 19a — reads xiigen-flow-definitions by taskTypeId) | ✅ Executor | ✅ PromptLibrary | ✅ DPO triple schema has domain/entityType/conflictType/ftId/productScope (all 5 fields — PLAN-FINAL + Change 7)
  Phase 3 (Config):        ✅ [N] archetype templates (42 required) | ✅ NamedCheckRegistry loaded (219 checks (FLOW-01=11, FLOW-02=5, FLOW-06=7, FLOW-32=18; net +5 vs original; final total 219)) | ✅ 48 gate evaluators
  Phase 4 (APIs):          ✅ 6 endpoints present
  Phase 5 (Extensions):    ✅ E3 multi-CONSUMES | ✅ E4 route node | ✅ E5 forward dep | ✅ E6 ordering | ✅ E7 inline model | ✅ E8 pure function | ✅ E9 wave-prereq-check | ✅ E10 scheduled job | ✅ E11 JSONPath dynamic binding | ✅ E12 hybrid sync/async | ✅ E13 5-arbiter voting gate | ✅ E14 meta-adapter hybrid mode
  Schema extensions:        ✅ machineConstants | ✅ compensationChain | ✅ enumConstraint | ✅ discriminatedPayload | ✅ DUAL | ✅ source_resolution | ✅ order | ✅ scopeDimensions | ✅ authorizationGate | ✅ executionModel | ✅ inlineInvokes | ✅ twoPhaseGate | ✅ crossFlowFactoryDependencies | ✅ softDependencies | ✅ machineFormula | ✅ privacyConstraints | ✅ twoPhaseReservation | ✅ atomicGroupOperation | ✅ retryPolicy | ✅ failureBehavior | ✅ pureFunction | ✅ crossWaveTriggers | ✅ moderationPaths | ✅ uncertaintyBehavior | ✅ aggregation/AggregationSpec | ✅ crossFlowReadDependencies | ✅ conditionalReEntry | ✅ absoluteOverrides | ✅ graphDirection | ✅ removalStrategy | ✅ namedModes | ✅ inlineInvocationSpecs | ✅ financialTypeConstraints | ✅ zeroNullDistinctFields | ✅ state_machine machineFreedom type | ✅ SCHEDULED entry type | ✅ factorySource/dependencyType | ✅ multiLayerSecurityGate | ✅ irreversibleOperation | ✅ schemaEvolutionPolicy | ✅ backpressure | ✅ ep4_saga_cycle_order machineFreedom | ✅ zone_promotion_order machineFreedom | ✅ scd2_immutability machineFreedom | ✅ platformOnly factory flag | ✅ batch_status BatchStatusSpec | ✅ cryptographicExchange | ✅ securityComparisons | ✅ eventSourcedState | ✅ storageConstraints | ✅ keyVersioning | ✅ durableSaga | ✅ ep5OutboxRelay | ✅ idempotencyKeyRegistry | ✅ DB_UNIQUE_constraint machineFreedom | ✅ derived_at_query_time_never_stored machineFreedom | ✅ multiModelConsensus | ✅ featureFlagRequired | ✅ compensationSaga/CompensationSagaSpec | ✅ crossTaskValidations | ✅ executionModel: request_response | ✅ sloMs | ✅ prerequisiteStages | ✅ invariants | ✅ machineFixedOrdering | ✅ fanoutPosition | ✅ accessMode | ✅ dagPosition | ✅ qualityThreshold | ✅ envelopeTarget | ✅ hybridSyncAsync | ✅ executionModel: hybrid-sync-async | ✅ appendOnlyPattern | ✅ safetyGateTokenRequired | ✅ timezoneSource | ✅ externalConnectors | ✅ storageMode | ✅ pgWriteForbidden | ✅ virusScanRequired | ✅ circuitBreakerThreshold | ✅ circuitBreakerWindow | ✅ af11FeedbackRequired | ✅ debounceWindowMs | ✅ completionMode | ✅ dualTenantEvent | ✅ crossTaskReadDependencies | ✅ implementationMode: hybrid | ✅ layerCoupling

Phase Gate Summary:
  A (INJECT):    [what must be seeded — contracts, prompts, RAG (22 files for FLOW-01), arbiters, topology, 12 event schemas]
  B (GENERATE):  [score targets per task type + cycle-1 predictions]
  C (JUDGE):     [score bands and actions]
  D (INTEGRATE): [lint/test/FlowStateSnapshot gates]
  E (PROMOTE):   [DPO minimum, pattern docs, lifecycle INJECTED → ACTIVE, bundle version check]
  F (REGISTER):  [cross-flow registration — PUT lifecycle ACTIVE + store dependency RAG pattern for downstream flows + BFA collision check]

Arbiters by Node:
  [node_id]: [arbiter list — named check IDs included]

Ambiguities resolved: [list or NONE DETECTED]
DPO Target:    [N] triples minimum | Contrast source: [bands]
Cumulative:    [N] triples after this flow
Pattern transfer: [N]/[total] from prior flow ([rate]%) — [HEALTHY ≥70% / LOW <70%]
Self-Test:     [test node type] | Coverage: [N scenarios per task type] | virtualClock: [Y/N]
═════════════════════════════════════════════════════════════════════════
PROCEED TO: Phase A — INJECT
```

Immediately after the approval block, append the Two-Level Cycle reminder:

```
REMINDER — Two-Level Cycle applies to every task type in this flow:
  Level 2 (Planning): plan_completeness ≥ 0.90 | gate_detection = 1.0 | cross_flow_accuracy = 1.0
  Level 1 (Code):     iron_rule_pass_rate = 1.0 | dna_compliance = 1.0 | quality_score ≥ 0.85
Level 2 must pass before Level 1 begins.
A flow is COMPLETE only when both levels pass for all task types.

MACHINE vs FREEDOM reminder for this flow:
  MACHINE constants (hardcode = correct, config = score-0): [list from machineConstants[] or NONE]
  FREEDOM values (config = correct, hardcode = score-0): [list from ironRules or ALL]
```

---

## Hard Rules

**Infrastructure gate:**
- **NEVER** proceed to Gate 1 if Gate 0 has any ❌
- **NEVER** advise "build the infrastructure while running the flow" — infrastructure must be complete first
- **NEVER** treat infrastructure checks as advisory — each is a hard PASS/FAIL

**Plan completeness:**
- **NEVER** skip the completeness check because the flow "looks complete" or "is similar to FLOW-01"
- **NEVER** infer arbiter lists — they must be explicit in the plan for every node
- **NEVER** proceed if Section 3 (Missing Infrastructure) is absent
- **NEVER** approve a plan with unresolved contradictions between iron rules
- **NEVER** treat any of the 5 phase gates as optional or combinable
- **NEVER** substitute "TBD", "see contract", or "same as previous flow" for explicit numeric targets
- **NEVER** approve a plan where negative flows (Section 7) do not reference the adaptation map
- **NEVER** approve a plan where DPO expectations (Section 12) lack a contrast pair source
- **NEVER** approve a plan that declares a MACHINE constant without a negative scenario testing the config.get() violation
- **NEVER** approve a plan for a Wave 2+ flow where pre-allocation ranges still contain ⛔ REQUIRED

**Architecture integrity:**
- **NEVER** approve a plan that requires a hardcoded switch in decompose.handler — new archetypes = new JSON fixture templates
- **NEVER** approve a plan that requires adding a new TypeScript function to the validate.handler NAMED_CHECKS record — new checks = new arbiter fixture with evaluationPattern
- **NEVER** approve a plan where a score.handler gate evaluator uses contract-unaware logic for a task type that has machineConstants[]
- **NEVER** approve a plan where an inline-only service (executionModel: "inline") is registered as a queue event consumer — inline services use @Injectable() only, never @EventPattern/@MessagePattern
- **NEVER** approve a plan with a two-phase gate (twoPhaseGate in contract) that only checks at one phase — both generation-time AND delivery-time checks are mandatory and cannot be skipped because the other phase already ran
- **NEVER** approve a plan where audit-first ordering (T79-class) places any business logic (moderation, price check, SETNX) before the audit write — F[audit].write() must appear as step 1 in the execution order
- **NEVER** approve a plan where moderation failure leads to DataProcessResult.failure() — rejected-by-moderation must set domain status (e.g., DRAFT) and return success with status field, not a failure result
- **NEVER** approve a plan where price=0 is treated as invalid when the flow supports free listings — zero price is valid (free listing), only negative price is invalid
- **NEVER** approve a plan where a cross-flow factory dependency (crossFlowFactoryDependencies[]) is absent from the EngineContract schema — the decompose handler cannot inject the factory without this declaration
- **NEVER** approve a plan where aggregate-only analytics (privacyConstraints: MUST_NOT_PERSIST) generates a per-user record field (viewerIds, userId in view record) — only aggregate counter writes are valid
- **NEVER** approve a plan where a MACHINE formula (machineFormula schema field) is read from config.get() — formula must appear as a literal computation in the generated code
- **NEVER** approve a FAIL_OPEN service (failureBehavior: FAIL_OPEN) that returns DataProcessResult.failure() in the catch block — F283 outage must return success with serviceUnavailable: true (FLOW-09 T113)
- **NEVER** approve a pure function inline service (pureFunction: true) that emits queue events or stores documents — pure functions return a value only, never call this.queue.enqueue() or this.db.storeDocument()
- **NEVER** approve a two-phase seat reservation (twoPhaseReservation) where payment capture precedes seat reservation — seat must be held BEFORE payment pipeline trigger (financial critical path, oversell risk)
- **NEVER** approve a group atomic operation (atomicGroupOperation: ALL_OR_NOTHING) that uses try/catch+continue to skip failed items — any failure must trigger full rollback of the group
- **NEVER** approve a Wave 3 flow plan (wave: 3) where the prerequisite check lists only a single flow — Wave 3 requires ALL SIX Wave 2 flows ACTIVE
- **NEVER** approve a Wave 3 flow plan where inline event schemas are not written before EngineContract seeding — Phase A STEP 0 must confirm all missing schemas exist before seeding begins
- **NEVER** approve a three-path moderation task type (moderationPaths[] declared) where UNCERTAIN outcome routes to rejection — UNCERTAIN must route to a human review queue with status PENDING, never auto-reject
- **NEVER** approve an aggregate task type with `aggregation.removeEvents[]` declared (bidirectional aggregate) that lacks a retraction handler — both add-event and remove-event paths are mandatory; missing the retraction path = partial implementation
- **NEVER** approve a cross-flow runtime read dependency (crossFlowReadDependencies[]) that calls write methods on the peer flow — `accessPattern: 'GET_ONLY'` is enforced; any create/update/delete call to the peer service is a hard violation
- **NEVER** approve a legal hold implementation (absoluteOverrides[] with `prohibits: ["ttl_parameter"]`) that includes any TTL parameter on the hold store call or reads hold duration from config.get() — the ENTIRE TTL behavior must be absent from generated code, not just use a machine constant value
- **NEVER** approve a UNIDIRECTIONAL graph task type (graphDirection: 'UNIDIRECTIONAL') that generates a B→A adjacency write — unidirectional means single-edge A→B only; the bidirectional_graph_single_transaction named check must NOT fire for unidirectional contracts
- **NEVER** approve a shadow-ban task type (removalStrategy: 'SHADOW_BAN') that generates a delete or destroy call — shadow-ban hides content but RETAINS it; the factory injection for F334 (or equivalent shadow factory) must be present, with no hard-delete code
- **NEVER** approve a block+mute handler (namedModes[] declared) that treats block and mute as identical operations — block requires bidirectional content suppression on BOTH sides before event emits; mute requires notification suppression ONLY with content still visible; these are distinct code paths, not aliases
- **NEVER** approve FLOW-10 T-[+3] (or any flow with conditionalReEntry) until the product decision on re-entry strategy has been made (CLEAR_SETNX vs NEW_KEY_VARIANT vs REVISION_FLAG) — GAP-NEW-46 is a ⛔ PRODUCT DECISION that Claude Code cannot resolve unilaterally
- **NEVER** approve a financial task type where price values are stored or operated on as floats — price must always be integer cents (999 not 9.99); any `price * taxRate`, `price / 100`, or `parseFloat(price)` operation in generated code is a hard violation (financialTypeConstraints[], GAP-NEW-56)
- **NEVER** approve a state machine task type (machineFreedom.machine[].type === "state_machine") where the transition map or states list is loaded from config.get() — the transition map MUST be hardcoded; the machine_state_machine evaluator checks for this; missing transition guard also = score-0 (GAP-NEW-55)
- **NEVER** approve a SCHEDULED task type (entry.type: "SCHEDULED") without verifying E10 executor capability exists — SCHEDULED requires Bull/BullMQ delayed job registration, NOT @EventPattern and NOT HTTP handler; if E10 not in GenericNodeExecutor, this is a ⛔ BLOCKER (GAP-NEW-58)
- **NEVER** approve a billing or financial task type where billing charge (or subscription activation) is emitted BEFORE the billing schedule record is persisted — billing schedule must exist in DB before any downstream event emits (same outbox principle as seat-before-payment in FLOW-09)
- **NEVER** approve a cross-wave-hard factory dependency without verifying the source flow is ACTIVE — `dependencyType: "cross-wave-hard"` blocks Phase A if source flow not ACTIVE; this is a hard prerequisite, not a soft dependency (factorySource + dependencyType fields, GAP-NEW-59)
- **NEVER** approve an ETL/SCD-2 task type (machineFreedom.machine[].key === "scd2_immutability") where generated code contains UPDATE operations on dimension tables — ONLY close-old + open-new in single transaction is valid; any UPDATE = DR-62 violation (FLOW-14 T195)
- **NEVER** approve a zone promotion task type (machineFreedom.machine[].key === "zone_promotion_order") where data skips zones — raw MUST exist before staging; raw → staging → core → mart is MACHINE-FIXED ordering; zone skip = CF-192 violation (FLOW-14)
- **NEVER** approve a webhook authentication task type without verifying constant-time HMAC comparison — standard string `===` or `.includes()` is a timing attack vulnerability; CF-211 requires `crypto.timingSafeEqual()` or equivalent (FLOW-14 T191 IR-3)
- **NEVER** approve a mart-write task type without verifying PII classification precedes the write — F462 PLATFORM-ONLY classification BEFORE any mart write; no tenant opt-out; mart write without classification = score-0 (FLOW-14 T196 IR-1)
- **NEVER** approve a purge/deletion task type (irreversibleOperation in contract) where the purge event contains rawContent — DataPurged must emit ONLY tombstoneRef + tenantId; any raw data in purge event payload = score-0 (FLOW-13 T186; GAP-NEW-61)
- **NEVER** approve a query-serving task type without verifying multi-layer security gate order — quota check FIRST (cheapest), RLS SECOND, PII masking LAST; any reordering = different error code behavior + score-0 (FLOW-13 T173; GAP-NEW-60)
- **NEVER** start FLOW-14 Phase A before all 4 pre-Wave-4 blockers are resolved: (1) named check registry externalized (128 checks after FLOW-17), (2) second DPO fine-tuning run with domain-context labels for 3 active DPO conflicts, (3) bundle B-001/02/03/04 complete, (4) FLOW-13 ACTIVE
- **NEVER** approve a cross-wave factory dependency (factoryDependencies[].dependencyType === "cross-wave-hard") without verifying the source flow is ACTIVE — cross-wave-hard blocks Phase A entirely; this is distinct from same-wave soft dependencies which are non-blocking
- **NEVER** approve a financial saga task type (ESCROW_SAGA archetype) where the ledger entry (S4) has a compensation step that deletes or reverses it — the ledger is APPEND-ONLY; LIFO compensation covers steps S1-S3 (C3→C2→C1) but cannot undo S4; S4+S5 must be in the same PG transaction (FLOW-17 T236)
- **NEVER** approve an EP-5 transactional outbox task type (ep5OutboxRelay in contract) where financial events are published directly to the queue without first writing to the PG outbox table — outbox write and business op must be in the SAME database transaction; direct publish = at-most-once delivery (FLOW-16 GAP-F16-01)
- **NEVER** approve a financial task type without verifying F578 IIdempotencyKeyRegistry is called BEFORE every financial factory call (F571/F572/F574/F575) — missing idempotency registration = potential double-spend; this is DNA-9 enforcement at financial boundary (FLOW-16 GAP-F16-02)
- **NEVER** approve a reputation task type (REPUTATION archetype, derived_at_query_time_never_stored MACHINE value) that stores the computed score — score must be derived at query time from the immutable journal; any persist/store/save on computed score = score-0 (FLOW-17 T245, GAP-F17-02)
- **NEVER** approve an evidence capture task type (EVIDENCE_CAPTURE archetype) where binary screenshot data is stored in the application database or event payload — only S3 key / blob URL reference is permitted; base64/Buffer/binary storage = BUILD_FAILURE (CF-293); activity tracking must be numeric counts ONLY — no keystroke content, no mouse events = BUILD_FAILURE (CF-294) (FLOW-17 T243, GAP-F17-03/04)
- **NEVER** approve a financial token task type (token::idempotent-spend arbiter) that uses Redis SETNX as sole idempotency mechanism for financial operations — Redis SETNX is volatile on restart; DB UNIQUE constraint (INV-17-3) is required for financial ops; Redis SETNX alone = insufficient (FLOW-17 T231, GAP-F17-01)
- **NEVER** approve a multi-model AI consensus task type (3-model parallel AI) where model disagreement leads to majority vote — unanimous consensus OR escalate to human review queue; binary majority vote = score-0 (FLOW-16 T219/T220, GAP-F16-06)
- **NEVER** approve a computation-only task type (T226-class, zero writes, zero events) that generates storeDocument or enqueue calls — computation tiers are read-only; any write or emit in computation tier = score-0 (FLOW-16, GAP-F16-13)
- **NEVER** approve a PKCE OAuth task type (cryptographicExchange declared) where code_verifier is cached, static, or read from config — verifier must be generated fresh PER REQUEST; static verifier = security vulnerability (FLOW-15 T202, GAP-NEW-65)
- **NEVER** approve a task type with securityComparisons[] declared where string `===` or `.includes()` is used to compare secrets/tokens/signatures — `crypto.timingSafeEqual()` is required; timing-safe comparison prevents timing attacks (FLOW-15 T203, GAP-NEW-66)
- **NEVER** approve an event-sourced state task type (eventSourcedState declared) that stores computed state as a mutable field — state MUST be derived from event log; any mutable state field = DPO Conflict #3 violation (FLOW-15 T212, GAP-NEW-67)
- **NEVER** generate single-model output when contract.multiModelConsensus === true — 3-model parallel execution required; single-model = IR-251-1 score-0 (FLOW-18 T251, GAP-18-02)
- **NEVER** inject code without feature flag when featureFlagRequired is declared — flagId must exist via F682 before injection proceeds (FLOW-18 T253, GAP-18-05, CF-307)
- **NEVER** apply IaC without stored compensation plan — storeCompensation/storeDestroy must appear BEFORE apply/provision/terraform in generated code; missing compensation = irrecoverable infrastructure (FLOW-19 T272, DD-152)
- **NEVER** approve political content without human review gate — political-dual-gate requires BOTH AI + human review; no auto-approve path; any single-gate implementation = score-0 (FLOW-20 T295, review::political-dual-gate)
- **NEVER** store raw PAN in any field, log, event, or error message — PCI zero-PAN applies to every code path including error handlers and debug logs; IMMEDIATE BUILD FAILURE (FLOW-20 T290, IR-1, pci::no-raw-pan)
- **NEVER** use PG/ORM in auction service critical path — no PostgreSQL/TypeORM/Prisma/knex/sequelize imports in T292 auction service; Redis-only for sub-50ms SLO (FLOW-20, DD-166, auction::stateless-redis-only)
- **NEVER** take higher AI quality score on model divergence >10% — take lower score; Math.max on diverging scores = score-0 for content safety contexts (FLOW-20, DD-175, scoring::conservative-multi-model)
- **NEVER** inline-retry in recipe/automation engines — DLQ only; `while(retry)` or `setTimeout(() => retry())` in generated T321 code = score-0 (FLOW-21 CF-393, dlq_only_retry)
- **NEVER** generate signed URL before virus scan completes — virusScan/scanFile must appear BEFORE signedUrl/presignedUrl in generated T324 code; signed URL without scan = BUILD FAILURE (FLOW-21 DR-141, virus_scan_before_signed_url)
- **NEVER** generate ETag mismatch handler that throws — DataProcessResult.Conflict only; throwing ConflictException violates DNA-3; client needs structured result for diff UI (FLOW-22 DD-196, etag_conflict_no_throw)
- **NEVER** mutate page tree without prior snapshot — snapshot MUST be taken BEFORE any page tree mutation; rollback has nothing to restore without pre-mutation snapshot (FLOW-22 CF-403, snapshot_before_mutation)
- **NEVER** skip CDN invalidation after publish — every T336 publish MUST invalidate CDN cache; any publish code without ICacheInvalidationService reference = score-0 (FLOW-22 CF-421, cdn_invalidation_mandatory)

**FLOW-23 HARD RULES:**
- **NEVER** place T360 anywhere but STEP 1 (node[0]) in a DAG template — tenant isolation is the first gate; any template where T360 is not the first node = BLOCKER (step1_template_ordering check)
- **NEVER** swap F953 ILayoutSolverService with an AI call — F953 is PURE COMPUTATION (deterministic, no AI); F954 is the AI advisor; swapping them breaks determinism guarantees
- **NEVER** call queue.publish() directly from generated code — ALL async events must be wrapped by F969 CloudEvents envelope; direct publish bypasses PLATFORM-ONLY enforcement
- **NEVER** read role from request.body — role MUST come from auth context only (JWT/session); body.role = privilege escalation vulnerability (DD-216, OWASP API1)

**FLOW-24 HARD RULES:**
- **NEVER** generate T340 grading code without SafetyGateToken as a mandatory argument — the cryptographic handoff (DR-168) is not optional; any grade() call without the token = BUILD FAILURE
- **NEVER** generate synchronous gamification score update — game progress MUST be async after grade confirmed; sync gamification creates false score on AI-rejected answers
- **NEVER** accept client-side score in T341 — server-side grading only; client-submitted score = score-0 for educational integrity contexts
- **NEVER** derive timezone from request headers or IP — timezone MUST come from user profile; header/IP timezone = score-0 (FLOW-24 CF-xxx, timezone_from_profile)
- **NEVER** allow any action to bypass consent gate — consent-blocks-ALL means even admin/platform actions are blocked until consent is confirmed

**FLOW-28 HARD RULES:**
- **NEVER** store user content before XSS sanitization — sanitization MUST happen BEFORE storeDocument(); raw content in DB = stored XSS vulnerability (FLOW-28 GAP-F28-07, xss_before_storage)
- **NEVER** place SSRF validation after the retry loop — SSRF check MUST happen before any outbound call including retries; SSRF inside retry = exponential attack surface
- **NEVER** promote draft to production state — drafts are Redis-TTL ephemeral only; any draft→PG write = BUILD FAILURE (FLOW-28 GAP-F28-13, draft_never_pg)
- **NEVER** fire fanout before checking maxFanout limit — fanout gate must be first check in any multi-recipient delivery; unlimited fanout = amplification attack
- **NEVER** use a non-Redis AI circuit breaker — circuit breaker state MUST be Redis-backed for per-tenant isolation; in-memory circuit breaker leaks state across tenants

**FLOW-32 HARD RULES:**
- **NEVER** mix business logic and settlement data in the same DAG node — pure data transformation and business decisions must be separate task types; co-mingling breaks auditability
- **NEVER** embed a secret value in a factory contract — use secret-ref indirection only; any literal secret in contract config = security score-0 (FLOW-32 GAP-32-03)
- **NEVER** use floating-point arithmetic for financial settlement — integer arithmetic (cents/satoshis) only; float settlement = rounding vulnerability (FLOW-32 GAP-32-05)
- **NEVER** auto-approve transactions above fraud threshold without human review — fraud_human_review_required check must block auto-approval path
- **NEVER** add a new queue consumer to a shared topic without BFA revalidation — all existing consumers must be re-validated after any new consumer registration (FLOW-32 CF-xxx)

**FLOW-34 HARD RULES:**
- **NEVER** put database access, business logic, or HTTP calls in a meta-adapter — adapters are THIN; any DB/business/HTTP import in an adapter file = BUILD FAILURE (thin_adapter_compliance check)
- **NEVER** invoke Mode A (direct execution) from within an adapter — Mode A calls MUST go via queue only; direct Mode A invocation from adapter = architectural violation
- **NEVER** embed secrets or credentials in adapter configuration — adapter config is tenant-visible; secret access goes through ISecretsService only
- **NEVER** proceed to deployment with fewer than 4/5 arbiters approving — 5-arbiter ≥4/5 voting gate (E13) is mandatory; 3/5 approval = BLOCKED (FLOW-34 CF-xxx, five_arbiter_voting_gate)

---

## Planning Pipeline Position

This skill is **event-triggered**, not sequentially loaded.
It does NOT appear in the planning pipeline load order (steps ⓪–⑨).
It fires on document detection — before `implementation-mode-gate`, before `planning-session-startup`.

If a flow plan document is submitted during a planning session already in progress,
pause all other work, run **flow-plan-review**, then return to the planning session only after approval.

Gate 0 failure ends the session. No flow work proceeds on missing infrastructure.
