# FLOW-36-REFERENCE-PLAN — Amendment Addendum
## Applies to: FLOW-36-REFERENCE-PLAN-v2.md
## Date: 2026-03-20
## Reason: FEATURE-REGISTRY-S1 v2 produced a more complete schema than v2 assumed

---

## WHAT CHANGED AND WHY

FLOW-36-REFERENCE-PLAN-v2.md was written assuming feature-manifest.schema.json
would be upgraded from v1.0 → v2.0 in FLOW-36 Phase A. FEATURE-REGISTRY-S1 v2
produces v2.0 directly in S1-A — with productScope, xiigen variants, MODE-B-full,
and XIIGEN_VARIANT signals already in the schema. Three amendments result.

---

## AMENDMENT 1 — Phase A: Schema upgrade step is removed

### Old gate item (remove):
```
□ Upgrade feature-manifest.schema.json v1.0 → v2.0
  (portingCandidate + MODE discriminator added)
```

### New gate item (replace with):
```
□ Verify feature-manifest.schema.json is v2.0 (produced by FEATURE-REGISTRY-S1)
  Assert: schemaVersion const = "2.0"
  Assert: productScope field present in Feature definition
  Assert: xiigen-saas/oss/enterprise/lean present in platformId enum
  Assert: XIIGEN_VARIANT present in FeatureSignals.mode enum
  If v2.0 not found: STOP — FEATURE-REGISTRY-S1 did not complete. Do not proceed.
```

### Also in Phase A gate (unchanged — still applies):
```
□ Resolve TBD canonicalImplementation links
□ Back-fill ftId on FLOW-01, FLOW-02, FLOW-33 training traces
```

### New Phase A gate item (add — from xiigen self-scan):
```
□ Update feature-manifest-xiigen-capabilities-v1.json:
  For each FLOW-35 task type now known (T565 RoundSummaryProcessor,
  T566 MetaDecisionEngine, SK-402..406 meta-arbiters):
    - Set canonicalImplementation.taskTypeId to actual task type ID
    - Update xiigen-saas status from "not-started" → "implemented"
  Assert: all FLOW-35 capabilities have taskTypeId populated (no TBD-FLOW-35 values)
```

---

## AMENDMENT 2 — Phase B: FeatureExtractor handles both productScopes

The FeatureExtractor (T-[+0]) genesis prompt needs one addition:

```
EXISTING IRON RULE (unchanged):
  Extract capabilities at the feature boundary level, not function level.

NEW IRON RULE:
  Set productScope based on source:
    - Source is a client flow (FLOW-01..24): productScope = "client-capability"
    - Source is a XIIGen infra flow (FLOW-25..36): productScope = "xiigen-capability"
    - Source is the Figma plugin or other platform adapter: productScope = "client-capability"

  For xiigen-capability entries extracted from infra flows:
    Set adapterMode = "MODE-A" for the xiigen-saas platform entry.
    Set all other platform entries (oss/enterprise/lean) to status="planned".
    Signals.mode = "XIIGEN_VARIANT" for all xiigen-capability entries.
```

New Phase B test:
```
test_productscope_assigned_correctly()
  # Client flow source → productScope = "client-capability"
  # Infra flow source → productScope = "xiigen-capability"
  # Signals.mode matches productScope (client→MODE_B, infra→XIIGEN_VARIANT)
```

---

## AMENDMENT 3 — Phase F: reference-package/ in bundle export

The bundle export format (FlowBundle from NEW-E1) should include a
`reference-package/` section to support enterprise runtime reimplementation:

```
FlowBundle/
  schemas/                    ← event contracts (already in v2 plan)
  freedom-config/             ← default FREEDOM config values
  test-matrix/                ← FLOW-XX.test-matrix.json
  api-specs/                  ← FlowStateSnapshot OpenAPI specs per flow
  iron-rules/                 ← task type iron rules extracted from genesis prompts
  reference-package/          ← NEW
    implementations/
      nestjs/                 ← generated NestJS reference (guidance only — see D-34-1)
    arbiter-prompts/
      five-arbiter-consensus/ ← SK-420..424 prompts for local quality validation
    readme.md                 ← "This is guidance, not the runtime"
```

Add to Phase F gate:
```
□ reference-package/ included in FlowBundle export
□ readme.md explicitly references D-34-1: "NestJS implementation is guidance.
  MODE-B-full runtime reimplementation is out of scope for FLOW-34."
□ FlowBundle validates against solution-bundle.schema.json v1.0
  (targetVariants field specifies which xiigen variants this bundle supports)
```

---

## SUMMARY OF GATE CHANGES

| Phase | Old | New |
|-------|-----|-----|
| A | Schema upgrade v1.0→v2.0 | Verify schema is already v2.0 + update xiigen capability stubs |
| B | Extract only client-capability | Extract both scopes + productScope assignment rule |
| F | Bundle export = schemas only | Bundle export includes reference-package/ |

All other phases unchanged from FLOW-36-REFERENCE-PLAN-v2.md.
