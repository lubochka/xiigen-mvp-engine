/**
 * Feature Registry — Genesis Seed Prompts (FLOW-36)
 * Seeded to AF-3 PromptAsset store at Phase A.
 *
 * Covers T567–T573. Amendment 2 productScope assignment rules incorporated into T567 prompt.
 */

export interface FeatureRegistryGenesisPrompt {
  taskTypeId: string;
  flowId: string;
  flowName: string;
  prompt: string;
  promptVersion: string;
}

export const FEATURE_REGISTRY_SEED_PROMPTS: FeatureRegistryGenesisPrompt[] = [
  {
    taskTypeId: 'T567',
    flowId: 'FLOW-36',
    flowName: 'Feature Registry',
    promptVersion: '1.0.0',
    prompt: `You are generating FeatureExtractor (T567) for FLOW-36 Feature Registry.

PURPOSE: Extract Feature Table (FT) entries from source code or design input.
Given a codebase ZIP or design reference, identify distinct capabilities at the
feature boundary level — not function level. Each capability becomes one FT entry
with portingCandidate classification and productScope assignment.

IRON RULES (violation = immediate score 0):
1. Extract at feature boundary level — not function level. One FT per well-bounded capability.
2. productScope assignment (MACHINE — not tenant-tunable):
   - Source is client flow (FLOW-01..24) or platform adapter: productScope = "client-capability"
   - Source is XIIGen infra flow (FLOW-25..36): productScope = "xiigen-capability"
3. portingCandidate classification (MACHINE — not tenant-tunable):
   - portingCandidate = false when:
     a. The capability IS the generation engine or sub-component (arbiters, consensus gates, bootstrap, regression analysis)
     b. The capability requires access to XIIGen's internal state to function
     c. Exporting would expose XIIGen architectural internals to an untrusted platform runtime
   - portingCandidate = true when:
     a. Well-bounded service with defined inputs/outputs runnable in reduced-privilege sandbox
     b. Business logic wrappable by thin adapter without exposing internal state
     c. Maps to a recognized platform plugin pattern
4. For xiigen-capability entries: set adapterMode = "MODE-A" for xiigen-saas platform entry;
   Signals.mode = "XIIGEN_VARIANT" for all xiigen-capability entries.
5. All output MUST validate against feature-manifest.schema.json v2.0 before commit.
6. RAG dedup check MUST run before creating new FT entry — avoid duplicate FT IDs.
7. tenantId is read from AsyncLocalStorage — never passed as parameter.
8. All ES queries use BuildSearchFilter — no raw query objects.`,
  },
  {
    taskTypeId: 'T568',
    flowId: 'FLOW-36',
    flowName: 'Feature Registry',
    promptVersion: '1.0.0',
    prompt: `You are generating FeatureSignalAggregator (T568) for FLOW-36 Feature Registry.

PURPOSE: Aggregate usage signals per FT per platform. Route to MODE_A or MODE_B
based on ftRecord.platforms array. Evaluate porting threshold formulas.

IRON RULES (violation = immediate score 0):
1. Signal routing is MACHINE — determined by ftRecord.platforms array:
   - platforms[] empty → MODE_A (engine execution telemetry metrics)
   - platforms[] has adapters → MODE_B (platform marketplace metrics)
2. MODE_A fields: executionCount, successRate, avgCostPerRunUsd, avgLatencyMs, tenantAdoption, improvementVelocity
3. MODE_B fields: installs, activeUsers30d, likes, citations, signalScore
4. Porting threshold weights MUST come from FREEDOM config — never hardcoded.
5. MODE_A formula: mode_a_score = (w1*normalize(tenantAdoption) + w2*successRate + w3*improvementVelocity) * 100
6. MODE_B formula: signal_score = (w1*normalize(installs) + w2*normalize(activeUsers30d) + w3*normalize(likes) + w4*normalize(citations)) * 100
7. tenantId from AsyncLocalStorage — never passed as parameter.
8. storeDocument() BEFORE enqueue() (DNA-8).`,
  },
  {
    taskTypeId: 'T569',
    flowId: 'FLOW-36',
    flowName: 'Feature Registry',
    promptVersion: '1.0.0',
    prompt: `You are generating PortingCostEstimator (T569) for FLOW-36 Feature Registry.

PURPOSE: Estimate porting effort for a specific FT to a target platform.
RAG retrieves platform API constraint docs and historical porting effort data.
ONLY runs when portingCandidate=true — caller (T570) enforces this.

IRON RULES (violation = immediate score 0):
1. NEVER run for portingCandidate=false FTs — this is enforced by T570 caller.
2. RAG MUST retrieve platform API surface + historical porting effort for target platform.
3. Required output fields: cost_estimate (USD), effort_days, complexity_score.
4. max_porting_cost threshold comes from FREEDOM config — not hardcoded.
5. tenantId from AsyncLocalStorage — never passed as parameter.
6. Never throw for business failures — return DataProcessResult.failure().`,
  },
  {
    taskTypeId: 'T570',
    flowId: 'FLOW-36',
    flowName: 'Feature Registry',
    promptVersion: '1.0.0',
    prompt: `You are generating PortingDecisionGate (T570) for FLOW-36 Feature Registry.

PURPOSE: Four-outcome porting decision engine. PROHIBITED guard runs FIRST.
Outcomes: APPROVE | DEFER | BLOCK | PROHIBITED.

DECISION PIPELINE (in order):
STEP 0 — portingCandidate guard (synchronous, no AI, no cost estimation):
  if ftRecord.portingCandidate === false:
    emit PortingProhibited { ftId, tenantId, reason: portingCandidateReason }
    return DataProcessResult.success({ decision: 'PROHIBITED' })
    ⛔ TERMINAL — no further evaluation

STEP 1 — incompatibility check:
  if targetPlatform in ftRecord.platformIncompatibilities: emit PortingBlocked, TERMINAL

STEP 2 — PortingCostEstimator (T569) call

STEP 3 — Signal threshold evaluation (MODE_A or MODE_B formula)

STEP 4 — APPROVE if score >= threshold AND cost <= max; DEFER if score < threshold; BLOCK if cost > max

IRON RULES (violation = immediate score 0):
1. PROHIBITED guard MUST be FIRST — before any AI call or cost estimation.
2. PortingCostEstimator MUST NOT run when portingCandidate=false.
3. PortingProhibited event (not DEFER or BLOCK) for portingCandidate=false — score-0 violation.
4. Decision MUST be stored before event emitted (DNA-8).
5. APPROVE/DEFER/BLOCK thresholds from FREEDOM config — not hardcoded.
6. tenantId from AsyncLocalStorage — never passed as parameter.`,
  },
  {
    taskTypeId: 'T571',
    flowId: 'FLOW-36',
    flowName: 'Feature Registry',
    promptVersion: '1.0.0',
    prompt: `You are generating PlatformAdapterGenerator (T571) for FLOW-36 Feature Registry.

PURPOSE: Generate thin adapter code for target platform after PortingDecisionGate APPROVE.
Adapter is Mode B only — zero business logic, only platform-specific UI and API calls.
Business logic stays in Mode A canonical implementation.

IRON RULES (violation = immediate score 0):
1. Belt-and-suspenders: refuse to generate adapter for portingCandidate=false FTs.
2. Generated adapter MUST contain zero business logic — only platform API calls.
3. Canonical service MUST be called via QUEUE FABRIC event — never direct HTTP.
4. Adapter path written to FT record before PortingComplete event (DNA-8).
5. PromptPatch retry on simulator failure — max 3 rounds.
6. tenantId from AsyncLocalStorage — never passed as parameter.`,
  },
  {
    taskTypeId: 'T572',
    flowId: 'FLOW-36',
    flowName: 'Feature Registry',
    promptVersion: '1.0.0',
    prompt: `You are generating PlatformSimulator (T572) for FLOW-36 Feature Registry.

PURPOSE: Execute generated adapter against mock platform runtime.
Supported platforms: Figma (mock-figma-api.ts), Canva (mock-canva-api.ts).
PASS → update FT record status to "implemented".
FAIL → trigger PromptPatch retry cycle (max 3 rounds via T571).

IRON RULES (violation = immediate score 0):
1. Simulator MUST run with zero cloud credentials — local mock only.
2. FAIL MUST trigger PromptPatch retry — max 3 rounds.
3. FT record status MUST NOT be set to "implemented" until simulator PASS.
4. PortingComplete event MUST be emitted after status update (DNA-8).
5. Simulator is LOCAL-ONLY — no external API calls permitted.`,
  },
  {
    taskTypeId: 'T573',
    flowId: 'FLOW-36',
    flowName: 'Feature Registry',
    promptVersion: '1.0.0',
    prompt: `You are generating FeaturePortingOrchestrator (T573) for FLOW-36 Feature Registry.

PURPOSE: Orchestrate the full porting pipeline for one FT.
Entry point: PortingRequested event.
Coordinates T570 → T569 → T571 → T572 in dependency order.

PIPELINE ORDER:
1. portingCandidate guard → T570 (PROHIBITED guard is first in T570)
2. T569 PortingCostEstimator (only if portingCandidate=true)
3. T570 PortingDecisionGate (APPROVE/DEFER/BLOCK)
4. T571 PlatformAdapterGenerator (only if APPROVE)
5. T572 PlatformSimulator (only if adapter generated)

IRON RULES (violation = immediate score 0):
1. Steps MUST execute in dependency order.
2. Each step checkpoint stored before next step — idempotent resume on app-reopen.
3. correlationId + tenantId + traceparent on every emitted event (DNA-9).
4. TERMINAL steps (PROHIBITED, BLOCKED, DEFERRED, COMPLETE) stop pipeline.
5. Per-step progress events emitted for FlowStateSnapshot visibility.
6. storeDocument() BEFORE enqueue() (DNA-8).`,
  },
];
