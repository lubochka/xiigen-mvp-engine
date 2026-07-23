# PATCH: FLOW-DESIGN-SKILL-INDEX → v2.5.0
## Date: 2026-03-26
## Applies to: FLOW-DESIGN-SKILL-INDEX-v2.4.0.md → produces v2.5.0

---

## HEADER UPDATE

Replace v2.4.0 header line with:
  ## v2.5.0 — 2026-03-26 | +7 flow-planning + capability-audit skills (SK-461..SK-467)

---

## ADDITION: WHAT CHANGED IN v2.5.0

Add before "WHAT CHANGED IN v2.4.0":

## WHAT CHANGED IN v2.5.0

Source: PHASE-THREE-PREPARATION-GUIDE (1,472 lines) + codebase gap measurement

7 gaps closed — all apply immediately, no new infrastructure required.

| Gap | Description | Resolution |
|-----|-------------|------------|
| Gap 22 | Cycle budgets derived from memory — T51=2 not 3; T64=2 not 1 | RESOLVED — SK-461 |
| Gap 23 | Adaptation map re-derived per flow — Phase B starts blind | RESOLVED — SK-462 |
| Gap 24 | BUG-3 class error — 3-event FLOW-01 pattern misapplied to FLOW-02 | RESOLVED — SK-463 |
| Gap 25 | R-1 retrospective informal or skipped — Wave 2 on stale calibration | RESOLVED — SK-464 |
| Gap 26 | Capability audit re-derives methodology each session | RESOLVED — SK-465 |
| Gap 27 | Remediation grouping by inline judgment — inconsistent across sessions | RESOLVED — SK-466 |
| Gap 28 | "Generating but not learning" not detectable without loading 4 files | RESOLVED — SK-467 |

SK number collision with Doc transcripts:
  Doc assigned SK-458/459/460 to capability-measurement/remediation/learning-audit.
  This session's SK-458/459/460 are session-setup skills (established first).
  Renumbered: capability-measurement=SK-465, remediation-design=SK-466, learning-audit=SK-467.

---

## ADDITION: New rows in COMPLETE SKILL TABLE

### New in v2.5.0

| File | SK | Category | Load | When |
|------|----|----------|------|------|
| `planning--difficulty-prediction-SKILL.md` | SK-461 | planning | 0.5 | Before session file authoring for any new flow |
| `planning--adaptation-map-SKILL.md` | SK-462 | planning | 1 | After SK-461 — Phase B section design |
| `planning--cross-flow-dependency-design-SKILL.md` | SK-463 | planning | 1 | Phase F session file authoring |
| `planning--flow-retrospective-SKILL.md` | SK-464 | planning | 1 | After last sequential flow ACTIVE, before Wave 2 |
| `code-execution--capability-measurement-SKILL.md` | SK-465 | code-execution | 0 | Start of any capability audit session |
| `planning--remediation-session-design-SKILL.md` | SK-466 | planning | 1 | After SK-432 produces K root causes |
| `code-execution--learning-path-audit-SKILL.md` | SK-467 | code-execution | 0 | After SK-465 — learning signal audit |

---

## ADDITION: Gap table rows

Add to UPDATED GAP TABLE:

| Gap 22 | Cycle budgets from memory — T51=2 not 3, T64=2 not 1 | RESOLVED — SK-461 |
| Gap 23 | Adaptation map re-derived per flow | RESOLVED — SK-462 |
| Gap 24 | Cross-flow dependency structure has no design rule | RESOLVED — SK-463 |
| Gap 25 | R-1 retrospective skipped or informal | RESOLVED — SK-464 |
| Gap 26 | Capability audit methodology re-derived each session | RESOLVED — SK-465 |
| Gap 27 | Remediation grouping by inline judgment | RESOLVED — SK-466 |
| Gap 28 | Learning signal failures not auditable in one pass | RESOLVED — SK-467 |

---

## ADDITION: PLANNING PIPELINE additions

Add to planning pipeline:

After ⓪.5b wave-assignment:
```
⓪.5c   difficulty-prediction (SK-461)   ← before session files
⓪.5d   adaptation-map (SK-462)          ← Phase B design
```

After Gate C block:
```
Phase F → cross-flow-dependency-design (SK-463) ← event registration design
Wave 1 done → flow-retrospective (SK-464)        ← before Wave 2 pre-allocation
```

New pipeline block to add:
```
CAPABILITY AUDIT PIPELINE:
① capability-measurement (SK-465)      static code + paired runtime checks
② learning-path-audit (SK-467)         5 signal types audited
③ remediation-session-design (SK-466)  SK-432 root causes → ordered session plan
```

---

## NEXT AVAILABLE SK NUMBER

Update:  **SK-468**
