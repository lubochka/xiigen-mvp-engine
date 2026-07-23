---
title: Audit Branch Reachability After Guard Changes
impact: CRITICAL
tags: guard, reachability, dead-code, AF-station, DNA, BFA, sibling-parity
---

## Audit Branch Reachability After Guard Changes

**Impact: CRITICAL**

Every time a guard condition is added or tightened in an AF station, it reduces
the set of inputs that can reach downstream branches. When multiple guards exist
in sequence (e.g. DNA check followed by BFA conflict check), their intersection
can produce the empty set for specific branches — meaning no valid input can
reach them. The branch becomes dead code.

Also applies to sibling station parity (FM-4): a DNA guard added to
`af1-genesis.ts` must be audited for presence in all sibling stations
(`af11-feedback.ts`, `af2-planning.ts`, etc.) that process the same input types.

**Diagnostic question:**
> "For each branch downstream of this guard, what is the set of inputs that
> satisfies ALL guards required to reach it? Is that set empty?"

---

## The Audit Procedure

### Part A — Single Station Guard Chain Audit

Run this any time a guard condition is added or tightened in an AF station.

#### Step 1 — Map the guard chain

For the AF station being changed, draw the full guard chain from entry to each
branch. Include every condition that must be true:

```
af1-genesis.ts entry
  → [G1] input.taskType registered in factory registry
  → [G2] DNA-1 check: no typed model class in generated output
  → [G3] BFA conflict check: no existing flow publishes same event
  → [G4] fabric.resolve(input.fabricType) returns valid provider
      → BRANCH: generation_success (DataProcessResult.success = true)
      → BRANCH: generation_failed (DataProcessResult.failure)
```

#### Step 2 — For each terminal branch, write the input requirements

State what a real EngineContract must look like to reach each branch:

```
BRANCH: generation_success
  Requires:
  - taskType is registered (G1 passes)
  - generated output contains no typed model classes (G2 passes)
  - no BFA conflict for the events this flow publishes (G3 passes)
  - fabricType resolves to a real provider (G4 passes)

  The problem: if G2 (DNA-1) and G3 (BFA check) both guard the same
  input path and their conditions are additive, a valid task that has
  no DNA violation but DOES have a BFA conflict is correctly blocked.
  But: if G3 was added to guard ALL generation attempts (not just
  those with events), it may block task types that never publish events.
  → G3 must be scoped: only apply BFA check when bfaRegistration.events is non-empty
```

#### Step 3 — Check the changed guard specifically

For the guard that was changed, identify which branches it affects:

```
Changed guard: G2 (DNA-1 added)

Branches downstream of G2:
  - generation_success: now requires DNA-compliant output → still reachable ✓
  - generation_failed: reachable when DNA check fires → still reachable ✓

New dead-code risk: if G2 and G3 have conflicting conditions for any
  task type, generation_success becomes unreachable for that type.
  → Check: is there any task type where both G2 and G3 would always fire?
```

#### Step 4 — For each dead branch found, make an explicit decision

**Option A — Remove the branch**: No valid inputs reach it. Document why and
remove the code. Update any tests that reference it.

**Option B — Fix the guard interaction**: Scope one guard so it doesn't apply
to all inputs. Example: scope BFA check to only run when bfaRegistration.events
is non-empty.

**Option C — Accept as future work**: Document the prerequisite explicitly in
DECISIONS.md with a reference to the blocking condition.

---

### Part B — Sibling Station Parity Audit (FM-4)

Run this any time a DNA guard is added to one AF station.

#### Step 1 — Identify the sibling group

Find all AF stations that process the same StationInput structure:

```
DNA-3 guard added to: af1-genesis.ts (throws errors in business logic → REJECT)

Sibling stations (same StationInput type):
  - af2-planning.ts     ← processes StationInput before af1
  - af9-judge.ts        ← processes StationInput for quality scoring
  - af11-feedback.ts    ← processes StationInput for feedback capture

Each sibling may generate code or call external services — same DNA-3 risk.
```

#### Step 2 — Check each sibling for the same guard

For each sibling station, scan for equivalent guard logic:

```
af2-planning.ts   — DNA-3 check: PRESENT ✓
af9-judge.ts      — DNA-3 check: MISSING ✗  ← gap found
af11-feedback.ts  — DNA-3 check: MISSING ✗  ← gap found
```

#### Step 3 — Apply the guard to siblings or document why it doesn't apply

For each sibling missing the guard:

**Option A — Apply the same guard**: The sibling processes the same input type
and has the same risk. Add the DNA guard. Add a matching test.

**Option B — Document why it doesn't apply**: The sibling doesn't generate
code or call services that could violate this DNA rule. Write a comment in
DECISIONS.md explaining the exception.

Never leave a sibling gap undocumented.

---

## Guard Interaction Matrix

When two or more guards exist in sequence, fill this matrix before changing
either one. Rows = Guard 1 conditions. Columns = Guard 2 conditions.

**Example for af1-genesis.ts DNA-1 + BFA guard:**

| | BFA check blocks (conflict found) | BFA check passes |
|--|----------------------------------|-----------------|
| **DNA-1 blocks (typed model found)** | generation_failed (DNA error) | generation_failed (DNA error) |
| **DNA-1 passes** | generation_failed (BFA conflict) | generation_success ✓ |

Reading: generation_success is only reachable when BOTH DNA-1 and BFA pass.
If either fires, generation_failed is reached. Both guards are correctly
independent — no dead code created.

---

## Checklist

Before changing any guard condition:

- [ ] Drew the full guard chain for the AF station
- [ ] For each terminal branch: listed the required input constraints
- [ ] For the changed guard: identified which branches are newly unreachable
- [ ] Filled the guard interaction matrix for guards in sequence
- [ ] Made Option A/B/C decision for each dead branch; documented in DECISIONS.md
- [ ] Wrote a reachability test for each branch confirmed reachable
- [ ] Part B (if DNA guard added): audited all sibling AF stations for parity
- [ ] Each sibling: guard applied or exception documented in DECISIONS.md
