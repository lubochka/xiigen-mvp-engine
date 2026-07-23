# Self-Verification Skill — Agent Instructions

## When to Invoke

Apply before declaring any change done:
- Fix written → run this checklist before calling it complete
- Phase gate → run before session-end self-verification loop
- Generated file produced → Rule 5 (non-renderable) is mandatory

---

## 6 Rules — Quick Reference

| # | Rule | Question to Ask |
|---|------|-----------------|
| 1 | `fresh-fixtures` | Does my L2 test use `sample-contracts.ts` fixtures? |
| 2 | `categorize` | Is this MACHINE / FREEDOM / BACKWARD_COMPAT / NEW_ARTIFACT? |
| 3 | `right-level` | Does the blast radius require L1 only, or also L2 and L3? |
| 4 | `cascade` | What reads the thing I changed? Have I tested each downstream? |
| 5 | `non-renderable` | Did I build + run the generated code — not just inspect it? |
| 6 | `predict` | Did I predict all effects before changing and verify all predictions? |

---

## Categorization Decision Tree

```
Is this change to an engine invariant (DNA pattern, fabric contract, station routing)?
  YES → MACHINE_CHANGE → L1 + L2 + L3 mandatory
  NO  ↓

Is this change to configurable behavior (thresholds, provider selection, templates)?
  YES → FREEDOM_CHANGE → L1 + L2; L3 if cross-tenant affected
  NO  ↓

Does this change add new behavior without modifying existing?
  YES → BACKWARD_COMPAT → L1; verify existing L2/L3 still pass
  NO  ↓

Is this a new factory, task type, or flow?
  YES → NEW_ARTIFACT → L1 + L2 + BFA validation
```

---

## Right Level — Blast Radius Map

| Changed component | Minimum verification level |
|------------------|--------------------------:|
| DNA guard logic | L1 unit |
| Fabric provider logic | L2 integration |
| Multi-tenant path | L3 e2e (2 tenants) |
| Engine contract field | L2 + BFA validation |
| AF station wiring | L2 (NestJS TestingModule) |
| Generated service output | DNA audit + L1 build + L2 run |
| Skill block selector | L1 + L2 (skill injection confirmed) |
| Quality scorer weights | L1 + L2 (score output confirmed) |

---

## Cascade Checklist

For any change, answer:
```
☐ Upstream: what feeds the thing I changed?
☐ Downstream: what reads the output of the thing I changed?
☐ Sibling: is there a sibling station/provider that needs the same change?
☐ BFA: does any BFA-registered flow use this?
☐ AF-9: does the quality gate still pass with the new behavior?
☐ Flows: which of FLOW-01 through FLOW-31 are in the blast radius?
```

---

## Pre-Change Predict Checklist

```
☐ DNA patterns affected: DNA-N (or N/A)
☐ AF stations in blast radius: list them
☐ Flows potentially affected: FLOW-XX (or N/A)
☐ AF-9 quality gate: still passes? (yes / verify required)
☐ BFA validation: still passes for all registered flows? (yes / verify required)
☐ Fabric providers in blast radius: list them
☐ Sibling stations needing same change: list or N/A
```

---

## Red Flags

- "L1 passes so I'm done" — check Rule 3: is L2 required?
- "I looked at the code and it's correct" — check Rule 5: did you build + run?
- "It's a small change, cascade is N/A" — check Rule 4: fabric changes affect all stations using that fabric
- "The test still passes" — check Rule 1: is the test using `sample-contracts.ts` fixtures or hand-crafted inputs?
- "I'll predict effects after the change" — Rule 6: predict BEFORE, verify AFTER

---

## XIIGen-Specific Predict Template

```
CHANGE: [one-line description]
CATEGORY: MACHINE_CHANGE | FREEDOM_CHANGE | BACKWARD_COMPAT | NEW_ARTIFACT

PRE-CHANGE PREDICTIONS:
  DNA patterns affected:    DNA-N / N/A
  AF stations in blast:     af-N-name.ts / N/A
  Flows at risk:            FLOW-XX / N/A
  AF-9 quality gate:        PASS predicted / VERIFY required
  BFA validation:           PASS predicted / VERIFY required
  Sibling guard parity:     checked in [sibling] / N/A

POST-CHANGE VERIFICATION:
  L1 unit:   [file:test] → PASS
  L2 sim:    [file:test] → PASS
  L3 e2e:    [file:test] → PASS | N/A
  Cascade:   all downstream confirmed → PASS
  Prediction accuracy: [correct / deviation: explain]
```
