# FLOW-35: META-ARBITRATION ENGINE
## REFERENCE PLAN v2 — DO NOT EXECUTE
## Date: 2026-03-20 (updated from v1)
## Status: AMENDED — visibility plan additions applied (FLOW-EXECUTION-VISIBILITY-PLAN.md)

---

## WHAT CHANGED FROM v1

| What v1 had | What v2 adds |
|-------------|-------------|
| Phase A: 7 factories (F1484–F1490), no lifecycle index | Phase A: IFlowLifecycleService (F1491) + flow-lifecycle ES index + two-seed operation (Addition 4) |
| Phase F: arbitration loop wiring, watcher update | Phase F: test:flow-matrix + test:cross-flow scripts + FlowMatrixRunner + edge test stubs + engine-health panel (Addition 2) |
| Phase F test count: ≥ 4,024 | Phase F test count: ≥ 4,034 (+10 additional) |

Phases B, C, D, E, G, H, I are unchanged from v1.
Phase A gate: 1 new factory, 2 new seed operations, 3 new gate items.
Phase F gate: 2 new scripts, edge test stubs, 1 new dashboard panel, 10 new gate items.

**Source of amendments:** FLOW-EXECUTION-VISIBILITY-PLAN.md (Tier 3 addendum)

---

## WHAT THIS FLOW BUILDS (unchanged)

FLOW-35 implements the meta-arbitration layer: the engine that decides what
to do with each generation round's arbiter scores. After FLOW-35:
- Every generation round produces a structured `RoundDecision` (not raw scores)
- Meta-arbiters apply cross-cutting policies (spend limits, security gates,
  improvement detection, model fitness, round control)
- ESCALATE/HALT decisions produce `EscalationBriefing` with options for Claude Code
- The engine can modify itself via SK-407–SK-415 protocols (Phase H)
- Session output is structured: EXECUTION-LOG + PHASE-COMPLETE + SESSION-BRIEF

---

## NAMING TABLE (verify at session start per SK-416)

| Type | ID | Name | Format |
|------|----|------|--------|
| Task | T565 | RoundSummaryProcessor | `RoundSummaryProcessor [T565]` |
| Task | T566 | MetaDecisionEngine | `MetaDecisionEngine [T566]` |
| Factory | F1484 | IMetaArbiterRegistryService | — |
| Factory | F1485 | ISpendGovernorService | — |
| Factory | F1486 | ISecurityCircuitBreakerService | — |
| Factory | F1487 | IImprovementDetectorService | — |
| Factory | F1488 | IModelFitnessService | — |
| Factory | F1489 | IDecisionLogService | — |
| Factory | F1490 | IEscalationBriefingService | — |
| **Factory** | **F1491** | **IFlowLifecycleService** | **[NEW v2 — Addition 4]** |
| Skill | SK-402 | SpendGovernorPattern | — |
| Skill | SK-403 | SecurityCircuitBreakerPattern | — |
| Skill | SK-404 | ImprovementDetectorPattern | — |
| Skill | SK-405 | ModelFitnessPattern | — |
| Skill | SK-406 | RoundControllerPattern | — |
| Skill | SK-407–415 | Engine modification protocols | — |
| Skill | SK-416–425 | Planning session skills | — |
| Skill | SK-426–429 | Session output skills | — |
| Phase | FLOW-35-A | Foundations | `Foundations [FLOW-35-A]` |
| Phase | FLOW-35-B | SpendAndSecurity | `SpendAndSecurity [FLOW-35-B]` |
| Phase | FLOW-35-C | ImprovementDetector | `ImprovementDetector [FLOW-35-C]` |
| Phase | FLOW-35-D | ModelFitness | `ModelFitness [FLOW-35-D]` |
| Phase | FLOW-35-E | RoundController | `RoundController [FLOW-35-E]` |
| Phase | FLOW-35-F | IntegrationWiring | `IntegrationWiring [FLOW-35-F]` |
| Phase | FLOW-35-G | EndToEnd | `EndToEnd [FLOW-35-G]` |
| Phase | FLOW-35-H | SelfModification | `SelfModification [FLOW-35-H]` |
| Phase | FLOW-35-I | SessionOutput | `SessionOutput [FLOW-35-I]` |

**⛔ STOP — F1491 is new in v2. Verify live boundaries confirm F1491 is available.**

---

## BFA CF RANGE (unchanged)

CF-789–CF-795 (7 rules) — seeded in Phase A.

---

## PHASE A — FOUNDATIONS + LIFECYCLE INDEX (~2.5h)

**What gets built:**
- Add `META_COLLECTION` and `META_DECISION` to `ContractArchetype` enum
- Create EngineContracts: T565 (RoundSummaryProcessor), T566 (MetaDecisionEngine)
- Register F1484–F1490 factory interfaces in factory registry
- **[NEW v2]** Register F1491 IFlowLifecycleService factory interface
- Seed CF-789–CF-795 to bfa_rules_index
- Initialize MetaArbiterRegistry (separate from ArbiterRegistry, `layer="meta"`)
- Register SK-402–SK-406 stubs in skill graph (implementations in Phases B–E)
- Register DR-267 (meta-arbitration architecture decision record)
- Seed data structure schemas to ES: RoundSummary, ModelRoundResult, RoundDecision,
  RetryConfig, EscalationBriefing
- **[NEW v2]** Create and seed `flow-lifecycle` Elasticsearch index (two seed operations)
- Take baseline snapshot: `FLOW-35-A-baseline.json`
- **[NEW — bundle amendment]** Create runbook stub: `docs/runbooks/FLOW-LIFECYCLE-runbook.md`
  *(stub only — populated during FLOW-35 Phase A execution)*
  Contents: debug commands for lifecycle state, bundle degradation alerts, escalation steps

**[NEW v2 — Addition 4] flow-lifecycle ES index:**

Create `flow-lifecycle` index with mapping. One document per flow per tenant.

Document structure:
```json
{
  "flowId": "FLOW-01",
  "tenantId": "tenant-uuid",
  "status": "NOT_STARTED | GENERATED | TESTING | PROMOTED | ACTIVE | REGRESSED | DEPRECATED",
  "generationHistory": [
    {
      "runId": "uuid",
      "triggeredBy": "FLOW-33 Phase C",
      "arbitersUsed": 84,
      "roundsToAccept": 4,
      "promotedAt": "ISO",
      "promotedBy": "claude-code-session-XYZ",
      "promptVersions": { "T47": "v3", "T48": "v2", "T49": "v4" }
    }
  ],
  "currentGeneration": {
    "runId": "uuid",
    "status": "ACTIVE",
    "testMatrixLastRun": "ISO",
    "testMatrixResult": "PASS | FAIL | NOT_RUN",
    "lastRegressionCheck": "ISO",
    "blastRadiusLastComputed": "ISO"
  },
  "dependsOn": ["FLOW-25", "FLOW-33"],
  "downstreamFlows": ["FLOW-02"],
  "featureIds": ["FT-047", "FT-048", "FT-049"],
  "bundle_activations": [
    {
      "bundleId": "B-001",
      "bundleVersion": "1.0",
      "activatedAt": "ISO",
      "flowVersionAtActivation": "v2"
    }
  ]
}
```

**Two mandatory seed operations in Phase A:**

```
Seed 1 — Retroactive (infra flows already complete, seeded as ACTIVE):
  Flows: FLOW-25, FLOW-27, FLOW-29, FLOW-30, FLOW-26, FLOW-31, FLOW-33
  status: ACTIVE
  generationHistory: populated from PHASE-COMPLETE files in sessions/FLOW-XX/
  featureIds: [] (FLOW-36 Phase B fills retroactively via FeatureExtractor)
  downstreamFlows: per dependency graph in FLOW-EXECUTION-VISIBILITY-PLAN.md

Seed 2 — Forward (user flows not yet generated, seeded as NOT_STARTED):
  Flows: FLOW-01 through FLOW-24, FLOW-34, FLOW-35, FLOW-36
  status: NOT_STARTED
  generationHistory: []
  dependsOn: per dependency graph below
  downstreamFlows: per dependency graph below
```

**Dependency graph for forward seed (NOT_STARTED flows):**
```
FLOW-01: dependsOn=[], downstreamFlows=[FLOW-02, FLOW-03, FLOW-04, FLOW-05]
FLOW-02: dependsOn=[FLOW-01], downstreamFlows=[FLOW-03, FLOW-04, FLOW-05, FLOW-07]
FLOW-03: dependsOn=[FLOW-02], downstreamFlows=[]
FLOW-04: dependsOn=[FLOW-02], downstreamFlows=[]
FLOW-05: dependsOn=[FLOW-02], downstreamFlows=[]
FLOW-07: dependsOn=[FLOW-02], downstreamFlows=[]
FLOW-34: dependsOn=[FLOW-36], downstreamFlows=[]
FLOW-35: dependsOn=[FLOW-33], downstreamFlows=[FLOW-36, FLOW-34]
FLOW-36: dependsOn=[FLOW-35], downstreamFlows=[FLOW-34]
# FLOW-06, FLOW-08 through FLOW-24: verify from each flow's reference plan prerequisites
# Populate at Phase A session time — not hardcoded here
```

**Lifecycle state transitions:**
```
NOT_STARTED
  ↓ Phase A DRY_RUN passes (D-VIS-2)
GENERATED
  ↓ Phase B–D gates pass
TESTING
  ↓ test:flow-matrix passes + manual review where required
PROMOTED
  ↓ deployed to tenant runtime
ACTIVE
  ↓ T521 blast radius from upstream regeneration exceeds threshold
REGRESSED  ← triggers 3-case escalation protocol (FLOW-33 Phase D)
  ↑ re-generation + re-promotion back to PROMOTED
```

**IFlowLifecycleService interface:**
```typescript
interface IFlowLifecycleService {
  // Existing methods (unchanged):
  getStatus(flowId: string, tenantId: string): Promise<FlowLifecycleRecord>
  updateStatus(flowId: string, tenantId: string, status: FlowStatus,
    metadata?: Record<string, unknown>,
    expectedCurrentStatus?: FlowStatus): Promise<{ success: boolean; actualStatus: FlowStatus }>
  appendGenerationRun(flowId: string, tenantId: string, run: GenerationRunRecord): Promise<void>
  getDownstreamFlows(flowId: string, tenantId: string): Promise<string[]>
  queryByStatus(status: FlowStatus, tenantId: string): Promise<FlowLifecycleRecord[]>

  // NEW — bundle support:
  recordBundleActivation(
    flowId: string,
    tenantId: string,
    activation: { bundleId: string; bundleVersion: string; flowVersionAtActivation: string }
  ): Promise<void>

  getBundleActivations(
    flowId: string,
    tenantId: string
  ): Promise<Array<{ bundleId: string; bundleVersion: string; flowVersionAtActivation: string; activatedAt: string }>>
}
```

**Gate (updated v2):**
```
□ 2 enum entries added (META_COLLECTION, META_DECISION)
□ 2 EngineContracts (T565, T566) in ES
□ 7 factories registered (F1484–F1490)
□ [NEW v2] F1491 IFlowLifecycleService registered
□ 7 BFA rules (CF-789–CF-795) in bfa_rules_index
□ MetaArbiterRegistry initialized with 5 empty slots
□ 14 SK stubs in skill graph (SK-402–SK-415)
□ 10 planning skills registered (SK-416–SK-425)
□ [NEW — skills package v3] Register SK-434, SK-435, SK-436 in SkillGraphService
  alongside SK-416–425 registration.
  Use registration commands from SKILL-REGISTRATION-MANIFEST-v3.md.
  Total skills in planning layer after Phase A:
    SK-402–415 (14 meta-arbitration + modification)
    SK-416–425 (10 planning session)
    SK-426–429 stubs (4 session output — implemented Phase I)
    SK-434–436 (3 visibility + bundle)
    Total stubs registered in Phase A: 31
□ Data structure schemas valid (JSON Schema Draft 7)
□ [NEW v2] flow-lifecycle index created with correct mapping
□ [NEW v2] Seed 1: 7 infra flows seeded as ACTIVE (count verified)
□ [NEW v2] Seed 2: FLOW-01..24 + FLOW-34/35/36 seeded as NOT_STARTED (count = 27)
□ [NEW v2] GET /lifecycle/flows?status=NOT_STARTED returns 27 records
□ [NEW v2] GET /lifecycle/flows?status=ACTIVE returns 7 records
□ [NEW — bundle amendment] flow-lifecycle document structure includes bundle_activations[]
□ [NEW — bundle amendment] IFlowLifecycleService has recordBundleActivation() method
□ [NEW — bundle amendment] IFlowLifecycleService has getBundleActivations() method
□ [NEW — bundle amendment] Test: recordBundleActivation stores correct version metadata
□ [NEW — bundle amendment] Test: getBundleActivations retrieves for tenant-scoped query
□ npx tsc --noEmit = 0 errors
□ Tests: ≥ 3,968 (entry 3,963 + 5 schema tests + [NEW v2] +5 lifecycle seed tests)
         → updated entry baseline: ≥ 3,973 after Phase A
```

---

## PHASES B, C, D, E — UNCHANGED FROM v1

These phases implement the 5 meta-arbiters (SK-402–SK-406):
- Phase B: SpendGovernorPattern (SK-402) + SecurityCircuitBreakerPattern (SK-403)
- Phase C: ImprovementDetectorPattern (SK-404)
- Phase D: ModelFitnessPattern (SK-405)
- Phase E: RoundControllerPattern (SK-406) + T565 + T566

See v1 for full specifications. No amendments in these phases.

Test baselines (updated for Phase A change):
```
After Phase A:  ≥ 3,973 (updated from 3,968 — 5 lifecycle seed tests added)
After Phase B:  ≥ 3,983
After Phase C:  ≥ 3,991
After Phase D:  ≥ 4,001
After Phase E:  ≥ 4,019
```

---

## PHASE F — INTEGRATION WIRING + TEST INFRASTRUCTURE (~3.5h)

**Jira:** `IntegrationWiring [FLOW-35-F]`
**Branch:** `flow/meta-arbitration/integration-wiring`

**What gets wired (from v1 — unchanged):**

1. **Arbitration loop hook:** After last standard arbiter writes score to ES,
   emit `ArbitersComplete` → T565 consumes → assembles RoundSummary → T566 runs
   meta-arbiters → writes RoundDecision → watcher reads RoundDecision.

2. **Decision log:** F1489 writes every RoundDecision to
   `sessions/FLOW-XX/round-decisions.jsonl` (append-only, CF-792).

3. **DPO triple export hook:** ACCEPT → T2-S4 TrainingTraceWriter.

4. **Watcher service update:** reads RoundDecision from ES (backward compatible).

**New arbiters for FLOW-35 (registered Phase A, tested Phase F — unchanged):**
```
meta::spend-governor-compliance
meta::decision-log-immutable
meta::no-credentials-in-briefing
```

**[NEW v2 — Addition 2] Test infrastructure: two npm scripts + FlowMatrixRunner:**

Add to `package.json` (server):
```json
"scripts": {
  "test:flow-matrix": "ts-node scripts/run-flow-matrix.ts",
  "test:cross-flow":  "jest contracts/tests/cross-flow/ --testPathPattern=edge.spec"
}
```

**FlowMatrixRunner class** (`src/engine/testing/flow-matrix-runner.ts`):
```typescript
// Usage:
// npm run test:flow-matrix -- --flow=FLOW-01
// npm run test:flow-matrix -- --flow=FLOW-01 --scenario=FLOW-01-T005
// npm run test:flow-matrix -- --flow=FLOW-01 --virtual-clock

class FlowMatrixRunner {
  constructor(options: {
    flowId: string
    scenarioFilter?: string
    virtualClockEnabled: boolean
    matrixPath: string     // contracts/tests/${flowId}.test-matrix.json
  }) {}

  async runAll(): Promise<MatrixRunResult>
}

interface MatrixRunResult {
  flowId: string
  scenariosTotal: number
  passed: number
  failed: number
  skipped: number        // STUB files automatically skipped
  virtualClockUsed: number
  failedScenarios: string[]
}
```

`FlowMatrixRunner` reads the test-matrix JSON, executes each scenario against
the running service using existing E2E infrastructure, and injects the virtual
clock adapter for `virtualClock: true` scenarios. It is a thin runner — not a
new test framework.

**script file** (`scripts/run-flow-matrix.ts`):
```typescript
import { FlowMatrixRunner } from '../src/engine/testing/flow-matrix-runner';

const args = parseArgs(process.argv.slice(2));
const runner = new FlowMatrixRunner({
  flowId: args.flow,
  scenarioFilter: args.scenario,
  virtualClockEnabled: args['virtual-clock'] ?? false,
  matrixPath: `contracts/tests/${args.flow}.test-matrix.json`,
});

const results = await runner.runAll();
printResults(results);
process.exit(results.failed > 0 ? 1 : 0);
```

**[NEW v2 — Addition 2] Cross-flow edge test stubs:**

Create directory and stub files for the full FLOW-01..24 dependency graph.
One file per dependency arrow. Stubs only in Phase F — implementations fill in
during each downstream flow's Phase E.

```
contracts/tests/cross-flow/
  FLOW-01_to_FLOW-02.edge.spec.ts
  FLOW-02_to_FLOW-03.edge.spec.ts
  FLOW-02_to_FLOW-04.edge.spec.ts
  FLOW-02_to_FLOW-05.edge.spec.ts
  FLOW-02_to_FLOW-07.edge.spec.ts
  ... one file per arrow in dependency graph
  (remaining edges populated from flow reference plan prerequisites)
```

Each stub follows this pattern (detected by `test:cross-flow`, auto-skipped):
```typescript
describe('FLOW-01 → FLOW-02 boundary', () => {
  // STUB — implemented when FLOW-02 generates T50
  it('UserOnboardingCompleted triggers T50 ParallelProfileEnricher', async () => {
    expect(true).toBe(true); // STUB
  });
  it('tenant isolation: FLOW-01 event for tenant-A does not trigger FLOW-02 for tenant-B', async () => {
    expect(true).toBe(true); // STUB
  });
});
```

`test:cross-flow` skips files that contain only STUB assertions, runs only
files with real assertions. No false passes accumulate while downstream flows
are NOT_STARTED. Stubs transition to real implementations in each flow's Phase E.

**[NEW v2] Engine health meta-dashboard panel:**

Append to `infrastructure/monitoring/engine-dashboard.json` as new row
"Engine Health Overview" with 5 panels:
```
Panel 1: Flow Lifecycle State Distribution
  Type: piechart
  Query: flow-lifecycle index | agg: terms(status)
  Shows: NOT_STARTED / GENERATED / TESTING / PROMOTED / ACTIVE / REGRESSED counts

Panel 2: Arbiter Round Rate (last 24h)
  Type: timeseries
  Query: round-decisions index | date_histogram(1h, count)

Panel 3: Prompt Promotion Velocity (last 7 days)
  Type: stat
  Query: prompt-versions index | filter: event=PROMOTED | date_histogram(1d)

Panel 4: Token Spend Rate (USD/day)
  Type: timeseries
  Query: round-decisions index | date_histogram(1d, sum(cost_usd))

Panel 5: Flows Needing Attention
  Type: table
  Query: solution-bundles index | filter: status = DEGRADED
         + flow-lifecycle index | filter: status = REGRESSED
  Fields: bundleId (or flowId), status, degradationReason, activeTenants
  (Merges bundle degradation and flow regression into single operator-facing view)
```

**Required tests (v1 + new v2):**
```python
# From v1 (unchanged):
test_arbiters_complete_triggers_t565()
test_t566_fires_after_t565()
test_decision_written_before_return()
test_dpo_triple_on_accept()
test_watcher_reads_round_decision()
test_backward_compat_no_round_decision()
test_append_only_log()
test_decision_log_jsonl_valid()
test_decision_log_survives_crash()
test_all_three_meta_arbiters_pass()

# New in v2:
test_flow_matrix_runner_executes_scenarios()    # runner reads JSON, fires scenarios
test_flow_matrix_runner_injects_virtual_clock() # virtualClock: true scenario uses clock
test_flow_matrix_runner_skips_stubs()          # STUB files don't produce false passes
test_cross_flow_runner_skips_stub_files()       # test:cross-flow skips STUB-only files
test_engine_health_dashboard_panels_valid()     # 5 panel queries return results
```

**Gate (updated v2):**
```
From v1 (unchanged):
□ ArbitersComplete → T565 → T566 pipeline wired and tested
□ F1489 decision log confirmed append-only
□ DPO triple export wired to ACCEPT path
□ Watcher backward compatibility confirmed
□ 3 meta-layer arbiters registered and passing
□ All 10 v1 tests pass

New in v2:
□ [NEW v2] test:flow-matrix script present and executable
□ [NEW v2] test:cross-flow script present and executable
□ [NEW v2] FlowMatrixRunner class in src/engine/testing/flow-matrix-runner.ts
□ [NEW v2] npm run test:flow-matrix -- --flow=FLOW-01 runs without error
           (FLOW-01 matrix doesn't exist yet — script exits 0 with "no matrix found")
□ [NEW v2] npm run test:cross-flow runs without error (stubs all skip → 0 failures)
□ [NEW v2] edge test stub files present for all known dependency arrows
□ [NEW v2] engine-health dashboard panel valid (5 panels, all ES queries parse)
□ [NEW v2] 5 additional tests pass (matrix runner + cross-flow + dashboard)

Tests: ≥ 4,034 (previous ≥ 4,024 + 10 new tests)
```

---

## PHASES G, H, I — UNCHANGED FROM v1

Phase G: End-to-end simulation
Phase H: Self-modification protocols (SK-407–SK-415)
Phase I: Session output infrastructure (SK-426–SK-429)

Updated test baselines:
```
After Phase F:  ≥ 4,034  (was 4,024 in v1)
After Phase G:  ≥ 4,046  (was 4,036)
After Phase H:  ≥ 4,060  (was 4,050)
After Phase I:  ≥ 4,070  (Phase I unchanged — SK-426–429)
```

---

## KEY FACTS (updated v2)

```
New factory in v2: F1491 IFlowLifecycleService (verify available at session start)
Phase F test delta: +10 (was +10 in v1, now +20 total in Phase F — 10 from v1 + 10 new)
Phase A test delta: +10 (was +5 in v1, now +10 — 5 schema + 5 lifecycle seed tests)

ArbiterRegistry (standard):  78 → 81 (adds 3 meta-compliance arbiters in Phase F)
MetaArbiterRegistry (meta):   0 → 5 (SK-402–SK-406, registered Phase B–E)
IFlowLifecycleService:        +1 factory (F1491, Phase A)

Decisions locked in FLOW-EXECUTION-VISIBILITY-PLAN.md (apply before Phase A):
  D-VIS-1 through D-VIS-4 (see that document)
```

---

## SESSION FILES TO PRODUCE (updated v2)

```
FLOW-35-STATE.json
SESSION-FLOW-35-A.md    ← enum (2) + 2 contracts + 8 factories (F1484–F1491) + 14 SK stubs
                           + flow-lifecycle index + two seed operations [AMENDED v2]
SESSION-FLOW-35-B.md    ← SK-402 + SK-403
SESSION-FLOW-35-C.md    ← SK-404
SESSION-FLOW-35-D.md    ← SK-405
SESSION-FLOW-35-E.md    ← SK-406 + T565 + T566
SESSION-FLOW-35-F.md    ← integration wiring + 3 arbiters
                           + test:flow-matrix + test:cross-flow + stubs [AMENDED v2]
SESSION-FLOW-35-G.md    ← end-to-end simulation
SESSION-FLOW-35-H.md    ← SK-407–SK-415 self-modification protocols
SESSION-FLOW-35-I.md    ← SK-426–SK-429 session output skills + AGENTS.md update
docs/FLOW-35-REFERENCE.md
```

Every SESSION file ends with Phase Completion Package (SK-427).

⛔ STOP — verify live artifact boundaries before Phase A (especially F1491).
Read FLOW-EXECUTION-VISIBILITY-PLAN.md before producing Phase A or Phase F session files.
