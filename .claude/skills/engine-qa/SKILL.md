---
name: engine-qa-skill
sk_number: SK-413
version: "1.0.0"
status: APPROVED
load_order: 11
priority: RECOMMENDED
author: luba
updated: "2026-03-18"
phase_8_approved: true
description: >
  Provides bug classification taxonomy (Class A–F) for XIIGen engine bugs,
  a stable FIX template for all bug reports, and the known-violations registry.
  Taxonomy finalized and approved in Phase 8 review session.
---

# Engine QA Skill

---

## Bug Classification Taxonomy (6 Classes — APPROVED Phase 8)

| Class | Name | Description | Example |
|-------|------|-------------|---------|
| A | Fabric Provider | Provider returns wrong DataProcessResult shape or wrong data | `ElasticsearchProvider.search()` returns `{ hits: [] }` instead of `DataProcessResult<SearchResult>` |
| B | Queue Coordination | Consumer group lag, DLQ overflow, event ordering violations, dedup failures | SQS consumer group processes same event twice; DLQ fills up due to missing dedup ID |
| C | DNA Pattern | Generated code violates one or more of DNA-1 through DNA-9 — violation found in output | Generated service contains `class OrderModel {}` — DNA-1 violation found by dna-compliance-guard |
| D | AF Pipeline | An AF station uses stale, wrong, or missing data from upstream — OR root cause of a DNA violation is traceable to a specific AF station | AF-9 reads `qualityScores` from wrong path; AF-1 uses wrong archetype prompt causing DNA violation |
| E | BFA Conflict | Two flows publish or consume the same event/entity, causing duplicates or collisions | FLOW-32 + FLOW-08 both publish `order.completed` — downstream consumers process twice |
| F | Engine Contract | A factory contract (F-XXXX) is missing required fields or has wrong types | F1339 missing `bfaRegistration.events`; fabricType: 'ELASTICSEARCH' (wrong case) in contract |

---

## Taxonomy Decision Rules (APPROVED Phase 8)

### Q1 — fabricType mismatch: CLASS F or CLASS A?

**Two separate bugs:**
- **CLASS F** (fix now): wrong `fabricType` value in the factory contract. Fix the contract.
- **CLASS A** (separate improvement): provider registry does not normalize casing. File separately if/when registry normalization is desired. Do not conflate with the CLASS F contract fix.

### Q2 — DNA violation in generated output: CLASS C or CLASS D?

**C = what ("the violation"), D = why ("the cause"):**
- **CLASS C**: violation found in generated output by dna-compliance-guard scan. Fix the generation template or DNA guard.
- **CLASS D**: root cause is traceable to a specific AF station decision (e.g. AF-1 Genesis used wrong archetype prompt → allowed DNA-1 violation through). Fix the station.
- Same underlying bug can be filed as C (output fix) then D (engine fix) — or directly as D if root cause is immediately clear.

### Q3 — Skill injection caused DNA violation: CLASS D or new class?

**Subtype of CLASS D.** AF-4 selecting wrong skill block → AF-1 generating bad output is an AF Pipeline failure. Field `D-skill-injection` as the subtype in the FIX template's ROOT CAUSE field. Six classes remain — no Class G.

---

## FIX Template (STABLE)

Every engine bug report uses this format. All 8 fields are required.

```
BUG-ENGINE-NN: <one-sentence description of the wrong behavior>
CLASS: A | B | C | D | E | F
ROOT CAUSE: <mechanism — what the code did wrong, not just symptoms>
WRONG ASSUMPTION: <what the code assumed that was false>
FIX: <what changed in the ENGINE — file:line — not just the output>
DNA PATTERNS AFFECTED: DNA-N (or N/A)
FILES: <file:line of the fix>
REGRESSION RISK: <which existing flows could be affected — FLOW-XX or N/A>
TESTS: unit + simulation + e2e (see bug-to-tests-skill for protocol)
```

### Worked Example

```
BUG-ENGINE-001: AF-9 reads quality score from wrong task type, returns stale cross-validation
CLASS: D
ROOT CAUSE: af9-judge.ts reads qualityScores from StationInput.context.qualityScores
  but af4-rag-context.ts writes to StationInput.qualityScores (top-level).
  AF-9 always sees undefined and falls back to default 0.5 threshold.
WRONG ASSUMPTION: Quality scores are nested under context; they are top-level.
FIX: judgment-engine.ts — change `input.context?.qualityScores` → `input.qualityScores`
DNA PATTERNS AFFECTED: N/A
FILES: server/src/af-stations/judgment-engine.ts (hypothetical example — see actual line when bug is filed)
REGRESSION RISK: FLOW-25 (BFA arbitration uses af9 output), FLOW-26 (self-developing engine)
TESTS: unit + simulation + e2e
```

---

## When to Invoke

- When a confirmed bug needs to be classified before using bug-to-tests-skill
- When reviewing a fix to ensure it addresses the correct class of failure
- When building the known-violations-registry (Phase 11 code modifications)

---

## Integration

```
engine-qa-skill
  → bug classification → bug-to-tests-skill (3 failing tests before fix)
  → fix applied        → three-level-verification (unit + sim + e2e)
  → fix propagated     → retroactive-development (re-validate all flows using T-XXX)
```

---

## Known Violations Registry

See `known-violations-registry.md` in this skill directory.
Populated during Phase 11 code modifications.

---

## Reference

- `bug-to-tests-skill/SKILL.md` — test-first protocol for bug fixes
- `three-level-verification/SKILL.md` — 3-level fix verification
- `retroactive-development/SKILL.md` — engine-level fix propagation (Phase 9)
