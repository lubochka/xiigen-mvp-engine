---
name: bundle-version-guard
sk: SK-436
description: >
  Enforces bundle version compatibility after any flow promotion.
  Scans active bundle manifests for minFlowVersions constraints,
  emits BundleDegraded when a newly promoted flow falls below a
  bundle's minimum required version, and ensures the degradation
  is recorded in the solution-bundles index before Phase E completes.
layer: planning
version: 1.0.0
createdAt: 2026-03-20
requires: []
complements: [SK-418, SK-427]
---

# BundleVersionGuard [SK-436]

## Purpose

When a flow is regenerated and promoted to a new version, it may
silently break a tenant's active bundle. The bundle manifest's
`minFlowVersions` field declares the oldest version of each required
flow that the bundle can tolerate. Without a guard, a flow promoted
from v3 back to v2 (regression) would leave a bundle that requires
v3 in an inconsistent state — running on a flow it's incompatible with,
with no operator alert.

This skill is the runtime enforcement of `minFlowVersions`. It runs
as a mandatory gate item after CASE A or CASE C promotion in the
3-case blast radius protocol (FLOW-EXECUTION-VISIBILITY-PLAN.md Addition 5).

## When to Invoke

- Phase E gate, after flow promotion (CASE A or CASE C)
- Never runs for CASE B (blast radius blocked promotion — no flow promoted)
- FLOW-33 Phase D: after any flow family re-promotion
- Any time `BundleDegraded` needs to be emitted

## Pattern

### Step 1: Find active bundles that include this flow

```
Query solution-bundles index:
  GET /bundles?requiredFlows.contains=FLOW-XX&status=ACTIVE

If no bundles found: skip remaining steps. No bundle impact.
```

### Step 2: For each bundle, check minFlowVersions

```
For each bundle B in the query result:
  requiredMin = B.minFlowVersions[flowId]  ← may be undefined
  
  If requiredMin is undefined:
    → No constraint on this flow for this bundle
    → No action

  If newFlowVersion >= requiredMin:
    → Bundle remains ACTIVE ✅
    → No action

  If newFlowVersion < requiredMin:
    → Bundle is degraded ❌
    → Emit BundleDegraded event
    → Update bundle status to DEGRADED in solution-bundles index
    → Record: { bundleId, flowId, requiredMin, actualVersion, degradedAt }
```

### Step 3: Record BundleDegraded in flow-lifecycle

```
For each degraded bundle:
  Append to flow-lifecycle record's bundle_activations[]:
    { bundleId, bundleVersion, degradedAt, reason: "version below minimum" }

  Note in Phase E report:
    "⚠️ Bundle {bundleId} degraded: requires FLOW-XX v{requiredMin},
     promoted version is v{actual}"
```

### Version comparison rule

```
Versions follow semver-style ordering where applicable.
For XIIGen flow versions (v1, v2, v3...):
  v3 >= v2 >= v1
  v2 < v3 (flow regressed — bundle degraded)

If version format is non-standard: treat as opaque string comparison.
When in doubt: flag for manual review rather than silently pass.
```

## Gate Item Text (for Phase E SESSION files)

```
□ [Bundle version guard — SK-436] After promotion:
  Query: active bundles containing FLOW-XX
  For each: verify newVersion >= bundle.minFlowVersions.FLOW-XX
  If any bundle below minimum:
    → Set bundle status = DEGRADED in solution-bundles index
    → Emit BundleDegraded event
    → Note in PHASE-COMPLETE.md
  If all bundles satisfied: ✅ no action
```

## PHASE-COMPLETE.md section (when degradation occurs)

```markdown
## Bundle Compatibility

⚠️ Bundle BUNDLE-B2B-MARKETPLACE degraded after this promotion.
  Reason: FLOW-01 promoted to v1 but bundle requires minFlowVersions.FLOW-01 = v2
  Action required: review bundle or re-promote FLOW-01 to v2+
  Bundle status: DEGRADED (set in solution-bundles index)
```

```markdown
## Bundle Compatibility

✅ All active bundles remain compatible (or no bundles include this flow).
```

## Positive Example

```
FLOW-01 promoted to v3.
Active bundles: B-001 (minFlowVersions.FLOW-01 = "v2"), B-004 (no constraint)

Step 1: found B-001 and B-004
Step 2:
  B-001: v3 >= v2 → ACTIVE ✅ no action
  B-004: no constraint → no action
Step 3: nothing to record

PHASE-COMPLETE note: ✅ All bundles compatible
```

## Negative Example

```
FLOW-01 regenerated after a regression, promoted to v1.
Active bundles: B-001 (minFlowVersions.FLOW-01 = "v2")

Step 1: found B-001
Step 2:
  B-001: v1 < v2 → DEGRADED ❌
  → Emit BundleDegraded { bundleId: "B-001", flowId: "FLOW-01",
      requiredMin: "v2", actualVersion: "v1" }
  → Set B-001 status = DEGRADED in solution-bundles index

Step 3: append degradation to FLOW-01 flow-lifecycle bundle_activations

PHASE-COMPLETE note: ⚠️ B-001 degraded — escalate or re-promote FLOW-01
```

## Flows with no bundle membership

```
FLOW-XX not in any active bundle:
  → Skip guard entirely (Step 1 returns empty)
  → Gate item passes trivially
  → Note in Phase E: "No active bundles contain FLOW-XX"

This is expected for new flows before any bundle has been activated
by a tenant.
```

## Integration

```
requires:    [] — invoked directly after 3-case blast radius protocol
complements: SK-418 (FlowCompletenessChecker — checks V23 bundle check)
             SK-427 (PhaseCompletionPackager — includes bundle status in PHASE-COMPLETE)
```

## Test

```
Given: Flow promoted to v3, bundle requires >= v2
Expected: bundle remains ACTIVE, no BundleDegraded emitted

Given: Flow promoted to v1, bundle requires >= v2
Expected: BundleDegraded emitted, bundle status = DEGRADED, Phase E note present

Given: Flow has no active bundles
Expected: guard skips, gate passes trivially

Given: Bundle has no minFlowVersions entry for this flow
Expected: no constraint → ACTIVE, no action
```
