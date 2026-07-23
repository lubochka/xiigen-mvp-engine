---
name: claim-verification
sk_number: SK-431
version: "1.0.0"
priority: HIGH
load_order: 0
category: planning
author: luba
updated: "2026-03-24"
contexts: ["web-session", "claude-code"]
description: >
  Before accepting any factual claim from a review document, model, or prior session,
  classify it as VERIFIED / INFERRED / ASSUMED and run the appropriate check.
  Renumbering maps, file existence, test counts, and artifact assignments must
  always be verified — never accepted on inference.
triggers:
  - "verify this"
  - "is this correct"
  - "before we proceed"
  - "review document"
  - "renumbering map"
  - "artifact numbers"
  - "test count"
  - "check this claim"
  - "load the state"
  - "what is the current state"
  - "before we start"
  - "what's the latest state"
  - "establish state"
---

# Claim Verification Skill v1.0

## SESSION-OPENING STATE PROTOCOL

**Fires at the START of every analysis or planning session.**
Before any claim arrives. Before any file is proposed for reading.
Do not skip this because "we know the state" — state is verified from files, not memory.

### Step 1: Read STATE.json files — ordered by last-modified

STATE files contain the last verified execution position.
Never rely on memory or the conversation for numbers.
STATE files beat source files for position information.

```bash
# Find all STATE.json files and sort by modification time
find . -name "STATE.json" -exec ls -lt {} + | head -10

# Read the most recently modified ones first
cat sessions/FLOW-XX/STATE.json | jq '{current_phase, test_baseline, discoveries}'
```

### Step 2: Cross-check the three artifact number sources

```bash
# Source 1: CLAUDE.md (human-maintained)
grep -A 10 "artifact" CLAUDE.md | grep -E "Next [TF]|Family|CF|SK"

# Source 2: INFRASTRUCTURE-FLOWS-STATE
cat INFRASTRUCTURE-FLOWS-STATE-*.json | jq '.artifactBoundaries'

# Source 3: Live grep (authoritative — what the code actually contains)
grep -rh "taskTypeId" server/src/engine-contracts/ | grep -oP "'T\d+'" | sort -t'T' -k2 -n | tail -3
grep -rh "factoryId"  server/src/engine-contracts/ | grep -oP "'F\d+'" | sort -t'F' -k2 -n | tail -3
```

If all three agree: proceed.
If any disagree: flag explicitly before proceeding. Do not average or guess.
The live grep is authoritative for what is actually in the code.

### Step 3: Build the STATE TABLE before the first substantive response

```
| Component | Status | Blocker | Verified by |
```

- **Status:** COMPLETE | IN_PROGRESS | PENDING_REPLAN | BLOCKED
- **Blocker:** the specific thing that must complete first, or "none"
- **Verified by:** the one command that confirms the status (not "see above")

### Step 4: Treat all status claims as ASSUMED until verified

```
"Heyrovsky merge is complete"
  → verify: artifact numbers in CLAUDE.md match post-merge boundaries
  → command: grep "Next T" CLAUDE.md  → expected: T580

"FLOW-01 is PENDING_REPLAN"
  → verify: sessions/FLOW-01/STATE.json current_phase field
  → command: cat sessions/FLOW-01/STATE.json | jq .current_phase
```

**Rule:** Never begin analysis with "based on what you described."
Always verify state from files before reporting it.

---

## WHEN TO INVOKE

When a review document arrives. When a renumbering map is proposed. When a
model states an artifact number. Before using any factual claim in a plan.
And always at the START of every analysis or planning session (see above).

---

## CLAIM CLASSIFICATION

For every factual claim in a received document:

### VERIFIED
The reviewer provides the exact command that confirmed it.
```
Action: spot-check one data point from the verification
Example: "T567-T573 consumed by FLOW-36 (verified: grep taskTypeId
         feature-registry-contracts.ts | sort | tail -7)"
→ Run: grep taskTypeId server/src/engine-contracts/feature-registry-contracts.ts \
       | grep -oP "'T\d+'" | sort -t'T' -k2 -n | tail -3
→ Confirm highest matches before accepting the map
```

### INFERRED
Reasonable deduction, derivation shown but not independently verified.
```
Action: run the verification command yourself
Example: "T574-T576 are free (inferred: FLOW-36 used T567-T573)"
→ Run: grep -r "T574\|T575\|T576" server/src/engine-contracts/
→ If any result: the inference was wrong
```

### ASSUMED
Stated as fact, no derivation shown.
```
Action: treat as hypothesis, verify before using
Example: "FLOW-25 services do not exist in Skills_Creation_Claude"
→ Run: ls server/src/engine/flows/bfa-conflict-arbitration/
→ Before accepting "missing" verdict: check with your own eyes
```

---

## RENUMBERING MAPS — MANDATORY THREE-CHECK PROTOCOL

Never accept a renumbering map without running all three:

```bash
# Check 1: Are the SOURCE numbers actually used where claimed?
grep -r "T567" server/src/engine-contracts/ | wc -l
# Expected: > 0 (if 0, the source doesn't need renaming)

# Check 2: Are the TARGET numbers actually free?
grep -r "T574\|T575\|T576" server/src/engine-contracts/ | wc -l
# Expected: 0 (if any match, collision will occur)

# Check 3: Are there OTHER numbers in the same range that also need mapping?
grep -r "F1339\|F1340\|F1341\|F1342\|F1343\|F1344" server/src/engine-contracts/ | wc -l
# If numbers exist but aren't in the map: the map is incomplete
```

---

## TEST COUNT VERIFICATION

```bash
# Never accept a test count from a document — always read fresh
cd server && npx jest --passWithNoTests 2>&1 | tail -3
# Or: npx jest --silent 2>&1 | tail -5
```

---

## FILE EXISTENCE VERIFICATION

```bash
# Never accept "file X doesn't exist" without checking
find server/src -name "*pattern*" -type f | head -5
ls server/src/engine/flows/flow-name/ 2>/dev/null | wc -l
```

---

## RECORD ALL VERIFICATIONS

Add to `discoveries[]` in STATE.json or SESSION-BRIEF.
Add rejected claims to `rejected_claims[]`.

Future sessions read these BEFORE re-deriving what was already established.

```json
"discoveries": [
  {
    "found_at": "step-4",
    "fact": "T567-T573 consumed by FLOW-36 in feature-registry-contracts.ts",
    "verified_by": "grep -r taskTypeId server/src/engine-contracts/feature-registry-contracts.ts | tail -7",
    "implication": "FLOW-0A must start at T577 or later (T574-576 also taken)",
    "action_taken": "RESOLVED — renumbering map updated"
  }
],
"rejected_claims": [
  {
    "claim": "T574-T576 are free",
    "source": "branch analysis document",
    "truth": "T574-T576 consumed by bundle-activation FLOW-00",
    "verified_by": "grep -r 'T574\\|T575\\|T576' server/src/engine-contracts/bundle-activation-contracts.ts",
    "risk_if_accepted": "artifact collision — two task types with same ID"
  }
]
```

---

## HIGH-RISK CLAIMS — ALWAYS VERIFY BY COMMAND, NEVER BY MEMORY (universal, from core)

Every claim is a hypothesis until a command confirms it. These claim classes are
high-risk and MUST be checked with the named TS command (not recalled):

| Claim type | mvp verification command | Pass = |
|------------|--------------------------|--------|
| Class/export exists | `rg "export class X" server/src` | ≥1 match |
| Method exists on a class | `rg "X\s*\(" server/src/path/file.ts` | present |
| Service is DI-wired (NestJS) | `rg "@Injectable\(\)" server/src` + `rg "providers:\s*\[.*X" server/src/**/*.module.ts` | provider in a `@Module` |
| Controller route exists | `rg "@Get\|@Post\|@Put\|@Delete" server/src/**/*.controller.ts` | route present |
| React component exists | `rg "export (default )?function X\|const X" client/src` | present |
| Test count | `npx jest --listTests \| wc -l` / `npx jest 2>&1 \| tail -3` | fresh count |
| Specific test passes | `npx jest --testPathPatterns "X"` (Jest has `-t` for name) | `0 failed` |
| UI behavior | `npx playwright test path.spec.ts` | `0 failed` |
| File exists / absent | Glob / `test -f path` | confirmed |
| Manifest/`.xiigen` claim | load it through the loader/locator | loaded, not just present |

Never accept "file X is wired", "the count is N", or "the route exists" from a
document, prior session, or memory — run the command in THIS message.

## COMPLETION-CLAIM REJECTION RULES (universal, from core)

A completion/done claim is itself a claim and is rejected when its evidence is:

```text
validation_only: true
metric_type contains static / contract / mixed
cpu_ms / ram_mb / accuracy = UNKNOWN
build- or static-contract-check only, without runtime/library integration
```

Count/actor honesty for review claims:
- `independent_evidence_count < count_claimed` → downgrade to the narrow truth
  (N ledger rows ≠ N cycles; a generated table ≠ a review).
- `subagent_id = NONE` → it was not a sub-agent review; say the parent did it.
- A round can finish only with the architect/owner FINAL verdict present, not
  from an executor self-claim.

## HISTORICAL FAILURES THIS SKILL PREVENTS

From the 2026-03-24 branch merge session — three wrong claims accepted without verification:

| Claim | Wrong Value | Correct Value |
|-------|-------------|---------------|
| Test count | 4,429 | 4,393 (36 rolled back) |
| FLOW-25 missing | "no services" | 14 services in bfa-conflict-arbitration/ |
| Renumber target | F1492 | F1502 (F1492-1501 taken by FLOW-36 + FLOW-00) |

Each would have caused a collision or test failure in Claude Code.

---

## INTEGRATION

```
Invoke after:  receiving any review document, renumbering map, or model claim
Produces:      verified facts → discoveries[] in session handoff
References:    session-output--investigation-handoff-SKILL.md
               planning--problem-decomposition-SKILL.md
```
