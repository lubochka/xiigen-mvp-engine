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

### Step 0.5 — RAG Semantic Readiness Check (v1.0.3)

Before reading artifact numbers, verify the RAG can be used semantically.
A RAG that returns 0 results for domain queries is being used as a database.

```bash
# Check 1: Does a semantic query return anything?
curl -sf -X POST localhost:3000/api/rag/search \
  -H "Content-Type: application/json" \
  -d '{"query":"duplicate registration idempotency check before write","topK":3}' \
  | jq '{count: .hits.total.value, topScore: .hits.hits[0]._score}'
# Expected: count >= 1, topScore > 0.7
# If count = 0: RAG not semantically indexed — patterns stored but not embedded

# Check 2: Are ARTIFACT_RANGE documents present?
curl -sf "localhost:9200/xiigen-rag-patterns/_count" \
  -H "Content-Type: application/json" \
  -d '{"query":{"term":{"patternType.keyword":"ARTIFACT_RANGE"}}}' | jq .count
# Expected: >= number of ACTIVE flows

# Check 3: Are ARCHITECTURE_DECISION patterns present?
curl -sf "localhost:9200/xiigen-rag-patterns/_count" \
  -H "Content-Type: application/json" \
  -d '{"query":{"term":{"patternType.keyword":"ARCHITECTURE_DECISION"}}}' | jq .count
# If 0: no design reasoning captured yet
```

If RAG semantic check fails: note as DEFERRED_SEMANTIC_RAG in STATE.json.
Proceed with structured queries. Do not block.

---

### Step 1 — Extract Live Artifact Boundaries

```bash
grep -E "Factory:|Task Type:|Skill:|BFA Rule:|Design Record:" server/CLAUDE.md | tail -10
grep -E "nextFactory|nextTaskType|nextSkill" server/CLAUDE.md | head -5
```

Also check:
```bash
grep -r "F[0-9]{4}" server/src/engine-contracts/ | tail -5   # last factory in contracts
grep -r "T[0-9]{3}" server/src/engine-contracts/ | tail -5   # last task type
```

Record: `nextFactory`, `nextTaskType`, `nextBfaRule`, `nextSkill`, `nextFamily`.

---

### Step 1.5 — Artifact Number Reconciliation (v1.0.3)

Compare CLAUDE.md claimed numbers against RAG query results.
If they disagree, the RAG query wins. CLAUDE.md is a rendered view, not a source.

```bash
# Query RAG for highest assigned task type
HIGHEST_T=$(curl -sf "localhost:9200/xiigen-rag-patterns/_search" \
  -H "Content-Type: application/json" \
  -d '{"query":{"term":{"patternType.keyword":"ARTIFACT_RANGE"}},
       "sort":[{"taskTypes.next.keyword":"desc"}],"size":1}' \
  | jq -r '.hits.hits[0]._source.taskTypes.next // "UNKNOWN"')

CLAUDE_T=$(grep "Next Task Type" CLAUDE.md | grep -oP 'T\d+')
[ "${HIGHEST_T}" != "${CLAUDE_T}" ] && \
  echo "⚠️  MISMATCH — use RAG value (${HIGHEST_T}), queue CLAUDE.md update" || \
  echo "✅ Numbers consistent"
```

Priority order: 1. RAG ARTIFACT_RANGE  2. Live file scan  3. CLAUDE.md (last resort)

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
grep -i "pattern-name" .claude/skills/v17-skill-library-reference/SKILL.md
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
