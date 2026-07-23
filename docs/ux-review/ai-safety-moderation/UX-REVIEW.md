# UX Review — AI Safety & Moderation (`ai-safety-moderation`)

**PNGs reviewed:** 17 | **Blockers:** 9 | **High:** 3 | **Medium:** 3 | **Low:** 2
**Overall verdict:** 🚫 Not representative

## Summary

FLOW-24 captures the same generic Name/Status/Notes/Actions admin CRUD list that every other
ENGINE_INTERNAL flow in this batch ships, plus six "mock state" cards that surface engineering
acceptance criteria. Eight of the seventeen captures are byte-identical, and none show what a
moderator actually sees: a moderation queue, a flagged-item review surface, gate decisions,
appeal paths, or IRON RULE outcomes. For a flow whose whole point is "keep unsafe content
out", it's particularly damning that not one capture shows a safety decision being made.

## Per-PNG findings

| # | File | Severity | Axis | Finding (user-perspective) | Suggested fix |
|--:|------|:-------:|------|----------------------------|---------------|
| 1 | `default.png` | 🔴 | State fidelity | Generic admin CRUD titled "AI Safety & Moderation" with 4 placeholder rows (`ui-…`, `debug-…`). No moderation queue, no flagged-content panel, no safety gate UI. | Capture the actual moderator surface once it exists. |
| 2 | `01-every-task-type-in-t421-t460-has-at-leas.png` | 🔴 | State fidelity | Identical PNG. | Drop duplicate. |
| 3 | `02-every-plan-step-is-scoped-to-a-single-re.png` | 🔴 | State fidelity | Identical PNG. | Drop duplicate. |
| 4 | `03-no-step-imports-provider-sdks-directly-f.png` | 🔴 | State fidelity | Identical PNG. | Drop duplicate. |
| 5 | `04-no-step-creates-entity-specific-controll.png` | 🔴 | State fidelity | Identical PNG. | Drop duplicate. |
| 6 | `05-all-steps-return-dataprocessresult-t.png` | 🔴 | State fidelity | Identical PNG. | Drop duplicate. |
| 7 | `06-focus-areas-covered-cf-465-iron-rule-saf.png` | 🔴 | State fidelity | Identical PNG; filename references "CF-465 IRON RULE" — zero user-facing depiction of this rule in action. | Build a Safety Decision surface; capture it firing. |
| 8 | `c-03-before.png` | 🔴 | State fidelity | Identical PNG. | Drop duplicate. |
| 9 | `crud-initial-load.png` | 🔴 | State fidelity | Identical PNG. | Keep one, drop the rest. |
| 10 | `crud-after-create.png` | 🔴 | State fidelity | Identical to default — claims a created record was rendered but the PNG does not visually show proof of creation. | Wait for the new row to render, then capture. |
| 11 | `crud-list-with-test-row.png` | 🟡 | Copy | 5th row shows `created by ai-safety-moderation-crud.spec.ts` in the Notes column. Spec file path leaking into tenant-visible copy. | Replace with a neutral note. |
| 12 | `state-1-every-task.png` | 🟠 | Information appropriateness | "State 1 — Every task type in T421-T460 has at least one plan step". T-numbers and "plan step" are engine jargon. | Remove from tenant surface. |
| 13 | `state-2-every-plan.png` | 🟠 | Information appropriateness | "Every plan step is scoped to a single responsibility". Internal. | Remove. |
| 14 | `state-3-no-step.png` | 🟡 | Copy | "No step imports provider SDKs directly (fabric-first)". Developer language. | Hide. |
| 15 | `state-4-no-step-2.png` | 🟡 | Copy | "No step creates entity-specific controllers". | Hide. |
| 16 | `state-5-all-steps.png` | 🟡 | Copy | "All steps return DataProcessResult<T>". Return-type language in a product surface. | Hide. |
| 17 | `state-6-focus-areas.png` | 🟠 | Information appropriateness | "Focus areas covered: CF-465 IRON RULE, SafetyGateToken, 8 named checks, gamifica…" — truncated and loaded with internal term names that expose the system's IRON RULE identifier rather than explaining it. | Replace with a moderator-friendly summary: "What we check, why, and what happens when content is blocked." |

## Cross-PNG patterns (flow-level)

- **9 near-identical CRUD-list captures** across the 01..06 + default + c-03-before + crud-*
  set. The filenames promise distinct phases; the pixels do not deliver.
- **Six "state-N" cards** surface engineer acceptance text to the UI. A moderator reading
  "SafetyGateToken" or "T421-T460" has no actionable signal.
- **No moderation workflow is shown**. For a safety flow, the absence of a "queue → review
  → decide → appeal" surface is the single most meaningful gap.

## Business-logic phase coverage

Topology nodes for FLOW-24: content arrives → safety scan → classification → gate decision
→ human review (if borderline) → action (allow / block / suspend) → appeal.

Covered: 0 of 7 phases visually. Every capture is either the admin CRUD list or an
acceptance-criterion placeholder.
