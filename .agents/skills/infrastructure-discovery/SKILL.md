---
name: infrastructure-discovery
version: "1.0.0"
sk_number: SK-407
priority: MANDATORY
load_order: 5
---

# Infrastructure Discovery Skill

Run this skill before writing any plan content. Plans written from memory produce wrong paths, stale artifact numbers, and phantom factory IDs. This skill prevents that.

## The Rule

Every fact a plan states about the codebase must have a live file:line reference.

## When to Invoke

- Before writing any plan, spec, or architectural decision
- At the start of every new phase (per Phase Transition Protocol)
- Whenever a plan element references a factory ID, task type, or fabric layer

## The 10-Step Protocol

### Step 0 — Pre-existing Failure Audit (NEW — Rev 3.3)

```bash
cd server && npx jest 2>&1 | grep -E "FAIL|PASS" | head -20
cd client && npx jest 2>&1 | grep -E "FAIL|PASS" | head -20
```

Record ALL currently failing tests. Store in `preExistingFailures[]` before writing any plan element.

**Why this is step 0:** Plans must not treat pre-existing failures as goals to fix (unless Luba explicitly assigns them). The zero-regression gate measures new failures introduced by this session — not the total failure count.

**Known example:** `"index.html not found"` — Vite build artifact not in repo (gitignored). Pre-existing since repo creation. Do not add to plan scope.

---

### Step 1 — Extract Live Artifact Boundaries

```bash
grep -E "Factory:|Task Type:|Skill:|BFA Rule:|Design Record:" server/AGENTS.md | tail -10
grep -E "nextFactory|nextTaskType|nextSkill" server/AGENTS.md | head -5
```

Also check:
```bash
grep -r "F[0-9]{4}" server/src/engine-contracts/ | tail -5   # last factory in contracts
grep -r "T[0-9]{3}" server/src/engine-contracts/ | tail -5   # last task type
```

Record: `nextFactory`, `nextTaskType`, `nextBfaRule`, `nextSkill`, `nextFamily`.

**Red flag:** Plan uses artifact numbers from a previous session's STATE.json without re-reading live docs. Numbers drift. Always read live.

---

### Step 2 — Code Structure Search

```bash
find server/src/fabrics/ -name "*.ts" | sort
find server/src/engine-contracts/ -name "*.ts" | sort
find server/src/factories/ -name "*.ts" | sort
find server/src/af-stations/ -name "*.ts" | sort
find server/src/guardrails/ -name "*.ts" | sort
find server/src/kernel/ -name "*.ts" | sort
```

Map the actual directory tree. Do not assume the structure from a previous session.

---

### Step 3 — Read Canonical History Docs

Read these in order (they contain the authoritative artifact registry):
1. `server/docs/ENGINE_ARCHITECTURE_MERGED.md` — factory families, IDs, AF station wiring
2. `server/docs/TASK_TYPES_CATALOG_MERGED.md` — all T-XXX definitions
3. `server/docs/BFA_CONFLICT_REGISTRY.md` — existing CF-XXX rules

If any doc is missing: stop, escalate to Luba — do not plan without it.

---

### Step 4 — Architecture Map

Verify the 6 fabric layers are present:
```bash
ls server/src/fabrics/
```
Expected: `database/`, `queue/`, `ai-engine/`, `rag/`, `secrets/`, `flow-orchestrator/`

Verify 11 AF stations:
```bash
ls server/src/af-stations/
```
Expected: `af1-genesis`, `af2-planning`, `af3-prompt-library`, `af4-rag-context`, `af5-spec-builder`, `af6-review`, `af7-dna`, `af8-security`, `af9-judge`, `af10-deployment`, `af11-feedback`

Verify 9 DNA patterns are enforced in guardrails:
```bash
ls server/src/guardrails/
grep -r "DNA-[1-9]" server/src/guardrails/ | head -9
```

---

### Step 5 — Read Key Files in Full

For any file the plan will modify or reference, read it completely:
```bash
# Example for AF-4 modification
cat server/src/af-stations/af4-rag-context.ts
# Check exact line counts, interfaces, method signatures
wc -l server/src/af-stations/af4-rag-context.ts
```

Record: actual line count, all exported interfaces, all method signatures.

**Red flag:** Plan says "add method X" without confirming the file's current shape.

---

### Step 6 — Completeness Map

For each factory interface the plan touches, classify:

| Interface | File | Status |
|-----------|------|--------|
| IExampleService | server/src/engine-contracts/... | COMPLETE / PARTIAL / MISSING |

PARTIAL = interface exists but missing required methods.
MISSING = not yet created.

---

### Step 7 — Data Format Audit

```bash
grep -r "interface.*Model" server/src/ | grep -v "node_modules"  # should be 0 — DNA-1
grep -r ": Record<string" server/src/ | head -5                   # correct pattern
grep -r "class.*Model {" server/src/ | grep -v "test"             # DNA-1 violations
```

Flag any typed model classes. They are DNA-1 violations.

---

### Step 8 — Fabric-First Dependency Check

```bash
grep -r "import.*anthropic" server/src/ | grep -v test   # direct SDK import — violation
grep -r "import.*pg " server/src/ | grep -v test          # direct PG import — violation
grep -r "IAiProvider" server/src/ | head -5               # correct: interface only
```

Any direct SDK import in non-provider code = plan must route through fabric interface.

---

### Step 9 — Rewrite Plan Elements with Real References

Every plan element must become:
```
BEFORE: "Add skill selection to AF-4"
AFTER:  "Add selectSkillsForContext() to af4-rag-context.ts:47
         (currently 166 lines, 9 stubs). Interface: SkillBlock (new).
         Factory: none (pure function on StationInput). DNA: compliant —
         no typed models. Fabric: reads from existing RAG fabric context."
```

---

## Companion Reference: v17-skill-library-reference

Before proposing any new factory family or skill pattern, consult:
`planning-skills-v3-final/v17-skill-library-reference/`

This maps 64 existing skill patterns across 9 layers. For NestJS/TypeScript: use nodejs alternative (63 of 64 have one). Check this BEFORE adding new patterns — the pattern may already exist.

Quick lookup:
```bash
grep -i "pattern-name" .Codex/skills/v17-skill-library-reference/SKILL.md
```

---

## Red Flags — Stop and Escalate

| Red Flag | Problem | Action |
|----------|---------|--------|
| Plan references factory ID not in ENGINE_ARCHITECTURE_MERGED | Phantom factory | Remove or register first |
| Plan proposes entity-specific controller | DNA-6 violation | Use DynamicController |
| Plan proposes new fabric layer | Unnecessary — all 6 exist | Reject, use existing fabric |
| Plan has test baseline as file count | Wrong type | Use `npx jest` passing test count |
| Plan has no DR-XXX entry for architecture decision | Decision undocumented | Add to DECISIONS.md first |
| Plan proposes pattern already in v17 library | Reinventing wheel | Use v17 pattern |

---

## Anti-Patterns

**Anti-Pattern 1: Plan from Memory**
Writing "the factory registry is at server/src/factories/registry.ts" without running `find` to verify. The file may have moved or been renamed.

**Anti-Pattern 2: Stale Artifact Numbers**
Using SK-330 from a plan file created 3 sessions ago. Three other sessions may have claimed SK-331 through SK-335. Always read live.

**Anti-Pattern 3: Missing Pre-existing Audit**
Running the discovery protocol but skipping step 0. A failing test that pre-existed the session gets counted as a regression introduced by this session.

**Anti-Pattern 4: Partial Step 6**
Classifying factories as COMPLETE without actually reading the interface — just assuming because the file exists.

---

## G08 universal addition from llm_mvp_core — Gate-0 fresh recon, FastAPI RAG sidecar, single-source consolidation

The 10-step protocol above is already TS-adapted (`npx jest`, NestJS DI). This block
pins three universal `infrastructure-discovery` requirements from the core standard
that the protocol left implicit, TS-adapted for this monorepo.

### A. Gate-0 means FRESH, not cached — record a pre-existing baseline you ran THIS session

The denominator for "what changed" is the baseline you observed in *this* session, never
a number copied from a prior `STATE.json`, a previous plan, or memory.

```
Before any plan element is written:
  server : cd server && npx jest 2>&1 | grep -E "Tests:" | tail -1   → record passed/failed
  client : cd client && npx jest 2>&1 | grep -E "Tests:" | tail -1   → record passed/failed
  build  : npx tsc --noEmit                                          → record 0 errors or list
Store these in preExistingFailures[] with the exact command + timestamp.
```

A failing test that pre-existed the session is NOT a regression introduced by the session,
and a passing test you did not actually run this session is NOT evidence. "Pre-existing
baseline" without a command you ran this session is an unverified claim, not a baseline.

### B. The FastAPI RAG sidecar is a first-class discovery target

mvp is NestJS (server) + React (client) **+ a Python FastAPI RAG sidecar**. Discovery that
maps only the Node trees is incomplete. Add to Step 2 / Step 4:

```
find rag/ -name "*.py" | sort                         # RAG sidecar source tree
grep -rn "APIRouter\|@app\.\(get\|post\)" rag/        # RAG entry points / routes
test -f rag/requirements.txt && echo "py deps present"
# health probe (read-only): the sidecar exposes a health route — record its path,
# do NOT start a server as part of recon. Note CONTEXT_INSUFFICIENT if the contract
# (request/response shape the Node side expects from the sidecar) is unknown.
```

The Node↔sidecar boundary (what the NestJS RAG fabric sends the sidecar and what it
expects back) is a contract that must be discovered, not assumed. An undiscovered
sidecar contract is a blocker for any plan that touches retrieval.

### C. Single source of truth — consolidate, do not multiply

This skill currently exists as `SKILL.md` here, a `.claude/skills/infrastructure-discovery/`
copy, `PATCH--infrastructure-discovery-RAG-steps.md`, a `reference--infrastructure-discovery-additions.md`,
and `worktrees/*` copies. When you improve discovery guidance:

```
- Improve the canonical SKILL.md IN PLACE (this file). Do not fork a new patch file.
- If a PATCH-- / reference-- fragment carries a rule the canonical file lacks, fold the
  rule into the canonical file and leave the fragment as a pointer, not a competing source.
- Anchor on real mvp entry points: package.json / tsconfig.json / jest.config.js and
  server/src/main.ts (NestFactory). mvp has NO nest-cli.json — never anchor on it.
```

Two files stating two thresholds for the same gate is itself a discovery defect: a later
session cannot tell which threshold is live. One canonical source per rule.

### Note-only (NOT ported — stays in G12, R5)

The ML-engine-specific recon (factory-family/AF-station/DPO-graph topology) is a
`llm_mvp_core` concern consumed here only through `.xiigen` manifests/locators. It is
not part of this universal discovery skill.
