/**
 * Bundle Activation — Genesis Seed Prompts (FLOW-00)
 * Seeded to AF-3 PromptAsset store at Phase A.
 */

export interface BundleActivationGenesisPrompt {
  taskTypeId: string;
  flowId: string;
  flowName: string;
  prompt: string;
  promptVersion: string;
}

export const BUNDLE_ACTIVATION_SEED_PROMPTS: BundleActivationGenesisPrompt[] = [
  {
    taskTypeId: 'T574',
    flowId: 'FLOW-00',
    flowName: 'Bundle Activation',
    promptVersion: '1.0.0',
    prompt: `You are generating BundleValidator (T574) for FLOW-00 Bundle Activation.

PURPOSE: Validate a solution bundle before any tenant provisioning begins.
Given a bundleId, verify: all requiredFlows exist in flow-lifecycle, no BFA
conflicts across the bundle, all flows are ACTIVE or have no blocking unmet
dependencies. Return BundleValidationReport.

IRON RULES (violation = immediate score 0):
1. Never throw for business validation failures — return DataProcessResult.failure()
2. BFA cross-check MUST include all requiredFlows — never a subset
3. estimatedActivationMs is always populated, even for invalid bundles
4. tenantId is read from AsyncLocalStorage — never passed as parameter
5. All ES queries use BuildSearchFilter — no raw query objects`,
  },
  {
    taskTypeId: 'T575',
    flowId: 'FLOW-00',
    flowName: 'Bundle Activation',
    promptVersion: '1.0.0',
    prompt: `You are generating BundleActivationOrchestrator (T575) for FLOW-00 Bundle Activation.

PURPOSE: Provision all required flows for a tenant in dependency order.
For each flow in requiredFlows[]: call T536 BootstrapOrchestrator DRY_RUN,
then FULL. Update flow-lifecycle to ACTIVE. Pre-populate FREEDOM config
additively. Emit BundleActivated with flowVersionsAtActivation.

IRON RULES (violation = immediate score 0):
1. DRY_RUN MUST complete successfully before FULL is called — no skip
2. Dependency order MUST be respected — FLOW-01 first, then others in numeric order
3. FREEDOM config is ADDITIVE — never overwrite existing tenant values
4. storeDocument() BEFORE enqueue() (DNA-8) — no exceptions
5. tenantId from AsyncLocalStorage — never passed as parameter
6. Idempotent resume on app-reopen — skip already-ACTIVE flows`,
  },
  {
    taskTypeId: 'T576',
    flowId: 'FLOW-00',
    flowName: 'Bundle Activation',
    promptVersion: '1.0.0',
    prompt: `You are generating BundleStatusTracker (T576) for FLOW-00 Bundle Activation.

PURPOSE: Monitor active bundles and detect degradation when a required flow is
regenerated with a version below the bundle minimum. Emit BundleDegraded or
BundleRestored as appropriate.

IRON RULES (violation = immediate score 0):
1. Subscribe via QUEUE FABRIC only — never poll flow-lifecycle directly
2. Check ALL bundles for a regenerated flow — never stop at first match
3. Persist status change BEFORE emitting event (DNA-8)
4. Tenant isolation: one tenant's bundle degradation must not query other tenants
5. tenantId from AsyncLocalStorage — never passed as parameter`,
  },
];
