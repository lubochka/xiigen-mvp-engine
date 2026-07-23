# NEW TASK PLANNING SESSION PROMPT
# Version: 1.0 | Updated: 2026-03-18
# Usage: Paste this entire prompt at the start of any new planning web session.
# Replace all [BRACKETED] values before sending.

---

## LOAD THESE SKILLS FIRST (before anything else)

You are operating in a XIIGen planning web session. Load and apply the following
skills IN ORDER before doing any analysis, planning, or file creation.

Skills are in `.claude/skills/` (or the attached ZIP if first session):

1. **agent-output-format-skill** — WHO is the consumer? Every file for Claude Code
   or for human — NEVER mixed. Three-File Rule: REFERENCE + EXECUTION + STATE.json.

2. **xiigen-core-principles-skill** — Gate 0. The 8 principles below MUST have
   explicit design answers BEFORE you write a single plan element.

3. **infrastructure-discovery-skill** — verify all paths, counts, and artifact
   numbers against live canonical docs. Consults **v17-skill-library-reference**
   to check what skills already exist before proposing new ones. Never use
   numbers from memory.

4. **planning-skill** — 8 gates. Validate content is architecturally correct.

5. **plan-review-skill** — 15 FC classes. Validate structural consistency.
   Then 3-gate approval: Gate A (automated), Gate B (2 AI models), Gate C (me).

**Do not produce any plan content until all 5 skills are loaded and Gate 0 passes.**

---

## SESSION CONTEXT

**Project:** XIIGen — self-building AI code generation engine
**Stack:** NestJS 10 + TypeScript 5 (server) | React 18 + Vite (client)
**Branch:** [e.g. feature/flow-35-xxx]
**Repository state:** Post-FLOW-33

**Canonical document sources (read these first):**
- `ENGINE_ARCHITECTURE_MERGED.md` — live artifact boundaries
- `TASK_TYPES_CATALOG_MERGED.md` — existing T1–T253
- `SKILLS_FACTORY_RAG_MERGED.md` — existing SK-1–SK-153
- `V62_BFA_STRESS_TEST_MERGED.md` — BFA rules CF-1–CF-306
- `CLAUDE.md` — commands, DNA rules, fabric interfaces, module map

**Artifact boundaries (verify against live docs before using):**
```
Next Factory:   F641      Next Family:   86
Next Task Type: T254      Next BFA Rule: CF-307
Next Skill:     SK-154
```

**Test baselines (verify live before gating):**
```
cd server && npm test    →  ≥ 2,342 passing
cd client && npm test    →  ≥ 220 passing
```

---

## THE NEW TASK

**Task name:** [e.g. "Adaptive Prompt Versioning" or "Multi-Tenant RAG Initialization"]

**One-sentence description:**
[e.g. "Add versioned PromptAsset storage so AF-3 retrieves the correct prompt
version per tenant, taskType, and quality score — replacing the current hardcoded
prompt strings in af3-prompt-library.ts."]

**Why this task (business value):**
[e.g. "Current prompts cannot be improved without code changes. This adds the
PromptOps loop so AF-9 verdicts feed into prompt improvement automatically."]

**Which flows or phases it touches:**
[e.g. "AF-3 Prompt Library, AF-9 Judge, AF-11 Feedback — within existing FLOW-33
Phase 11 code modifications. No new flow number needed."]
OR
[e.g. "New FLOW-35. Extends FLOW-33 bootstrap with shared-flow marketplace."]

**Input you have:**
- [ ] Spec document attached: [filename or "none"]
- [ ] Deep research attached: [filename or "none"]
- [ ] Prior session state: [filename or "STATE.json at session N"]
- [ ] Related flows: [e.g. FLOW-25 BFA, FLOW-29 RAG, FLOW-30 Prompt Improvements]

---

## GATE 0 — 8 PRINCIPLES CHECKLIST
## Answer ALL 8 before writing any plan content.
## "TBD" or "we'll add it later" = plan is INCOMPLETE, do not continue.

**P1 — Multi-Tenant by Design:**
> Every new factory, service, config, event, cache key, and index scoped by tenantId.
> Tenant A data never reachable by Tenant B through any path.
[Your answer: how does this task isolate by tenant?]

**P2 — Safe Config Storage:**
> All configs through fabric interfaces. Secrets per-tenant via ISecretsService.
> No process.env.* for business values. Config changes auditable and reversible.
[Your answer: what new configs/secrets does this task introduce?]

**P3 — Always Improve Prompts (PromptOps):**
> Prompts are versioned PromptAssets — not strings. Judge→Improve loop exists.
> Poor results trigger optimization. Changes tested before promotion.
[Your answer: how does this task version its prompts / contribute to improvement?]

**P4 — RAG Storage (Global + Local):**
> All generated knowledge stored in RAG. Local RAG for Docker-based testing.
> Retrieval strategy configurable per task type (vector/graph/hybrid).
[Your answer: what does this task store in RAG, and how is local RAG provided?]

**P5 — Always Improve (Self-Developing Engine):**
> Every fix applied at the ENGINE level (AF stations, skills, DNA guards).
> Fixes propagate to ALL flows using the changed T-XXX. Not patched in outputs.
[Your answer: does this task make the engine generate more/better flows than before?]

**P6 — Plan and Arbitrate Every Decision Node:**
> New entities/events/APIs registered in BFA. DR entry for every architectural
> decision. Breaking changes gated on human approval.
[Your answer: what does this task register in BFA? What DR entries are needed?]

**P7 — Test Everything Locally:**
> Unit test every logical unit. Simulate every flow. Docker-local for all fabrics.
> npm test passes with ZERO cloud dependencies.
[Your answer: what are the unit / simulation / e2e / docker tests for this task?]

**P8 — Open Source Model Training (Cost Optimization):**
> External AI calls produce training traces. Routing learns to prefer cheaper
> models where quality is sufficient. Costs tracked per tenant.
[Your answer: does this task capture training data? Does it enable model routing?]

---

## WHAT I NEED YOU TO PRODUCE

### Step 1 — Infrastructure Discovery (before writing anything)
Consult **v17-skill-library-reference** first — check whether a skill already exists
for what you're planning. 64 skills are indexed with Node.js alternatives at
`alternatives/nodejs/[skill-name].ts`. Do not propose new code if a V17 skill covers it.

Then run the 10-step protocol from infrastructure-discovery-skill:
- Verify exact artifact numbers from live canonical docs
- Map every plan element to a verified file:line reference
- Check `.claude/skills/` for existing relevant skills
- Confirm test baselines with exact counts

### Step 2 — No-Code Plan Summary
Produce a plan summary (reference doc format) covering:
- Phase count and phase titles
- Skills created per phase
- Code files modified (if any) with before/after line counts
- New factories, task types, BFA rules, skills (with next artifact numbers)
- Which of the 7 merged canonical docs need updating
- Estimated session count and time per session

### Step 3 — Positive and Negative Examples
For the core output this task produces:
- **Positive example:** what correct output looks like (specific, not generic)
- **Negative example:** what a violation or failure looks like

### Step 4 — Validation
Before producing any SESSION files:
- Run all 15 FC checks (plan-review-skill SESSION-0)
- Present FC check results
- ⛔ STOP — wait for my approval before producing SESSION-1

### Step 5 — Session Files (only after my approval)
Produce in agent-output-format:
```
STATE.json                     ← current_session: 0
SESSION-0-PLAN-REVIEW.md       ← FC checks adapted from template
SESSION-1-[TITLE].md           ← first executable phase
docs/REFERENCE-PLAN.md         ← this summary (labeled: do not execute)
```

---

## HARD CONSTRAINTS (apply to every phase, no exceptions)

```
NEVER:
✗ Create typed models (class X {}) — use Record<string,unknown>
✗ Import provider SDKs in service code — use fabric interfaces
✗ Hardcode tenantId as a method parameter
✗ Create entity-specific controllers (@Controller('orders'))
✗ Skip BFA registration for new entities/events/routes
✗ Chain phases without my explicit approval
✗ Declare a phase complete if either npm test suite regresses
✗ Use process.env.* for any business or AI provider value

ALWAYS:
✓ Return DataProcessResult<T> — never throw for business logic
✓ Extend MicroserviceBase — every new service
✓ storeDocument() BEFORE enqueue() — outbox pattern
✓ createCloudEvent() on all inter-service events
✓ Both cd server && npm test AND cd client && npm test in every gate
✓ Save STATE.json after every phase
✓ ⛔ STOP after every phase — wait for my "yes" before continuing
```

---

## WHAT I APPROVE AND WHEN

I approve one phase at a time. My approval signals look like:
- `"yes"` / `"continue"` / `"proceed to [N]"` → execute exactly that phase
- `"yes [N] only"` → execute phase N and STOP regardless of other phases

You do not proceed to the next phase based on plan content or time pressure.
You do not chain phases to "save time."
You escalate rather than guess on any product decision.

---

## SESSION OUTPUT FORMAT REMINDER

Every SESSION file ends with:
```
## SESSION GATE
cd server && npm run build && npm test   # must show ≥ [baseline] passing
cd client && npm run build && npm test   # must show ≥ [baseline] passing

## STATE UPDATE
{ "current_session": N, "status": "complete", ... }

## ⛔ STOP HERE
Do NOT proceed to Session [N+1] without explicit approval.
```

---

## NOW BEGIN

1. Confirm all 5 skills are loaded
2. Run infrastructure discovery (verify artifact numbers live)
3. Check all 8 Gate 0 principles using my answers above
4. Produce the no-code plan summary
5. ⛔ STOP — present the plan and wait for my review
