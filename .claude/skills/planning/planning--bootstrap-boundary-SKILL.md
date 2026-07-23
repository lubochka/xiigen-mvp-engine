---
name: bootstrap-boundary
sk_number: SK-426
version: "2.0.0"
priority: CRITICAL
load_order: 0
category: planning
author: luba
updated: "2026-03-25"
contexts: ["web-session", "claude-code"]
description: >
  Defines the exact and exhaustive list of capabilities that may be implemented
  as manual TypeScript. Everything not on this list MUST be a flow topology
  submitted to the AF pipeline. Prevents the recurring pattern of planning
  manual TypeScript services for capabilities that should earn learning data.
triggers:
  - "manual mode justification"
  - "circular dependency claim"
  - "bootstrap exception"
  - "can I write this as TypeScript"
  - "should this be a service or a flow"
  - "FLOW-37 FLOW-38 architecture"
  - "hybrid mode"
  - "implementationMode manual"
---

# Bootstrap Boundary Skill v1.0

## WHEN TO INVOKE

**Web session:** Step ⓪ of every planning session, after implementation-mode-gate
confirms `hybrid` or `manual`. Before any capability is assigned to a phase,
classify it against the bootstrap list.

**Claude Code:** At the start of every hybrid-mode phase. Before writing any
`.ts` file, verify the capability is on the exhaustive list below. If it is
not, stop and redesign as a flow topology.

---


> **DPO triple required fields (v2.0.0 schema — P17+P18):** `curriculumTier`,
> `modelComparison` (chosen.model ≠ rejected.model), `targetModelFamily` (from
> FREEDOM config), `instructionFormat`, `distillationReadiness`, `prompt.system`.
> Abbreviated references in this file reflect planning context only.
> See `code-execution--learning-signal-capture-SKILL.md` for the full schema.
> (Cross-reference acceptable here — planning-session skill. Not acceptable in
> Claude Code SESSION-N.md files — inline all fields there per FC-28/SK-443.)

## WHAT THIS SKILL PREVENTS

- FLOW-37 v1/v2: 6 TypeScript services (`CapabilityGapRepository.ts`,
  `SkillIndexReader.ts`, `TraceFailureAnalyzer.ts`, etc.) that should have been
  flow topologies — they bypass AF-9 judgment, accumulate no DPO triples, and
  cannot be improved by PromptOps
- FLOW-38 v1/v2: 6 TypeScript services (`RagQualityEvolver.ts`,
  `DpoToRagPromoter.ts`, `CalibrationMemory.ts`, etc.) with hardcoded if/else
  routing that should be `route.handler` nodes configurable via FREEDOM config
- Any plan that claims "circular dependency" for a capability that simply
  touches ES or calls a fabric interface

---

## THE EXHAUSTIVE BOOTSTRAP LIST

Manual TypeScript is acceptable ONLY for components in this exact list:

| Component | Why manual | Created in |
|-----------|-----------|------------|
| `GenericNodeExecutor` | Executes flow nodes — cannot be a flow node itself | FLOW-35 |
| AF-1 through AF-11 station handlers | The AF pipeline cannot build itself | FLOW-33 |
| ES index creation (`curl -X PUT`) | Indices must exist before flows can store to them | Phase A of any flow |
| Topology JSON parser | Must exist before topology files can be read | FLOW-35 |
| Phase requirement document seeding | The phase-capability-gate topology reads this — must precede it | FLOW-37 Phase A |
| FLOW_DESIGN RAG pattern seeding | Must precede the flows that retrieve them | FLOW-37/38 Phase A |
| Bootstrap boundary skill itself | The skill that explains the rule — circular otherwise | FLOW-37 Phase A |

**This list is exhaustive. It does not grow without a new locked decision.**

---

## THE FOUR-QUESTION TEST

Apply to every capability before classifying it as manual or flow:

```
Q1: Will this capability's output quality improve with more data?
    YES → FLOW (ai-generate.handler + PromptOps improvement)
    NO  → continue to Q2

Q2: Does this capability branch based on conditions that could change
    per tenant or over time?
    YES → FLOW (route.handler nodes, FREEDOM config thresholds)
    NO  → continue to Q3

Q3: Should this capability appear in the flow registry as a traceable
    execution unit?
    YES → FLOW
    NO  → continue to Q4

Q4: Is this capability on the exhaustive bootstrap list above?
    YES → manual is acceptable for Phase A only
    NO  → FLOW (default for everything not on the bootstrap list)
```

If Q1, Q2, or Q3 is YES: the capability is a flow topology.
If only Q4 is YES: manual TypeScript is acceptable, Phase A only.
If all four are NO: this is genuinely a utility — TypeScript is fine.
But genuine utilities are rare. When uncertain, default to FLOW.

---

## capabilityRouting[] — Required in STATE.json

Every hybrid or manual flow must declare this field before Phase A begins:

```json
{
  "capabilityRouting": [
    {
      "capability": "capability-gap-scanning",
      "decision": "FLOW",
      "flowId": "FLOW-37A",
      "reasoning": "Q1=YES: remediation plan quality improves via PromptOps"
    },
    {
      "capability": "xiigen-phase-requirements index creation",
      "decision": "MANUAL",
      "phase": "A",
      "reasoning": "Q4=YES: index must exist before phase-capability-gate topology can run"
    },
    {
      "capability": "RagQualityEvolver",
      "decision": "FLOW",
      "flowId": "FLOW-38A",
      "reasoning": "Q2=YES: score threshold configurable per tenant; Q1=YES: formula improvable"
    }
  ]
}
```

If a capability is classified MANUAL but does not match a bootstrap list entry:
`⛔ STOP — challenge the plan before proceeding.`

---

## CHALLENGING A BOOTSTRAP CLAIM

When a plan claims manual mode for a capability not on the list, apply these
checks in order:

```
1. "This modifies AF-11, so it must be manual."
   → AF-11 is manual. But capabilities that USE AF-11 are flows.
   → A learning loop that TRIGGERS after AF-11 runs is a flow.

2. "This checks file existence, so it can't be a topology."
   → File existence checks are validate.handler operations.
   → "Does this skill file exist?" is: rag-retrieve.handler (read skill registry)
     → validate.handler (check file-exists)

3. "This is simpler as TypeScript."
   → Simplicity is not on the bootstrap list. Ask Q1-Q4.

4. "The threshold might change so I need to make it configurable in TypeScript."
   → Configurable thresholds belong in topology node config, read via FREEDOM config.
   → TypeScript hardcodes the change-deployment cycle.
```

---

## ANTI-PATTERNS

```
❌ "Capability gap scanning checks skill files → must be manual"
   → Checking files is validate.handler, not bootstrap work
   → Correct: phase-capability-gate topology with validate.handler

❌ "DpoToRagPromoter needs to aggregate DPO triples → needs TypeScript"
   → Aggregation is decompose.handler, condition-checking is validate.handler
   → Correct: dpo-to-rag-promotion topology with ai-generate.handler for content

❌ "CalibrationMemory just stores records → TypeScript is fine"
   → Q1: YES (guidance synthesis improves with data); Q2: YES (count threshold configurable)
   → Correct: calibration-memory topology with route.handler for count >= 3 branch

❌ "We need a runner script to execute the scanner"
   → A runner script for a capability = unregistered manual TypeScript
   → Correct: the capability is a flow; a flow has a registered topology
```

---

## TEST SCENARIOS

- `DpoToRagPromoter.ts` with `buildPatternContent()` template → Q1=YES (pattern
  content quality improves) → FLOW: `dpo-to-rag-promotion` topology with
  `ai-generate.handler` for content generation
- `CalibrationMemory.ts` with `if (records.length < 3) return hasGuidance: false`
  → Q2=YES (threshold configurable) → FLOW: `calibration-memory` topology with
  `route.handler` condition `n1.count >= 3`
- `GenericNodeExecutor.ts` → Q4=YES (on exhaustive list) → MANUAL acceptable

---

## INTEGRATION

```
Invoked by: implementation-mode-gate (Step ⓪), flow-vs-service-gate (Step ⓪.5)
Governs:    hybrid-mode Phase A boundaries
Enforced by: capability-gap-scanner (SK-436) at runtime
Locked in:  DECISIONS-LOCKED.md D-37-2
```
