# Planning Skills Package — v4.0 (Unified)
## For: Web sessions producing plans for Claude Code + XIIGen flows

---

## What's in This Package — 17 Skills, ~65 Files

### Planning Pipeline (5 skills — run in order)

**1. `agent-output-format-skill/` (v2.0)**
Enforces FORMAT — every deliverable structured for its stated consumer.

**2. `xiigen-core-principles-skill/` (v1.0)**
Gate 0 — the 8 non-negotiable architectural principles (P1–P8).

**3. `how-to-prepare-a-plan-skill/` (v2.0)** ← ORCHESTRATOR
Sequences the pipeline in correct order with correct gates.

**4. `plan-review-skill/` (v2.0)** ← UPDATED
Validates CONSISTENCY — 15 FC classes + 7 SFA checks. Three gates required.

**5. `v17-skill-library-reference/` (v1.0)** ← REFERENCE COMPANION
Maps 64 existing skills. Consulted during infrastructure-discovery.

### Review Quality (5 skills — extend FC battery + Gate B)

**6. `chain-arithmetic-audit/` (v1.0)** ← NEW
Extends FC-1: baseline + Σ(deltas) = final for every tracked metric.

**7. `blast-radius-tagger/` (v1.0)** ← NEW
Tags deliverables TEST-ONLY/GOVERNANCE/PRODUCTION-CI/SOURCE. Extra gates for CI files.

**8. `api-shape-verification/` (v1.0)** ← NEW
Verifies every import in test code against actual source export shape before writing.

**9. `audit-protocol/` (v1.0)** ← NEW
10-point checklist for Gate B cross-model reviews. Defines what "deep audit" means.

**10. `plan-execution-feedback/` (v1.0)** ← NEW
Tracks planned vs actual write-time fixes. Feeds back into planning quality.

### Operational (3 skills — runtime session management + debugging)

**11. `context-overflow-skill/` (v1.0)** ← NEW
Three-threshold context window management (>35% normal, ≤35% warning, ≤25% critical).

**12. `debug-session-skill/` (v1.1)** ← NEW
Persistent debug file protocol + 4-phase systematic debugging + verification gate.
Orchestrates the 4 debug sub-skills below.

**13. `docker-debugger/` (v2.0)** ← NEW
Docker debugging for WordPress + MySQL + Playwright test stack. 10 failure patterns
with Symptoms → Diagnostic → Fixes. References: docker-basics, docker-compose, systematic-debugging.

### Debug Sub-Skills (4 skills — invoked by debug-session-skill)

**14. `systematic-debugging/` (v2.1)** ← NEW (from claudekit)
4-phase framework: Root Cause → Pattern → Hypothesis → Implementation.
Iron law: NO FIXES WITHOUT ROOT CAUSE INVESTIGATION FIRST.

**15. `root-cause-tracing/` (v1.1)** ← NEW (from claudekit)
Trace bugs backward through call stack to original trigger. Includes find-polluter.sh.

**16. `defense-in-depth/` (v1.1)** ← NEW (from claudekit)
Validate at every layer (entry → business logic → environment → debug instrumentation).

**17. `verification-before-completion/` (v1.1)** ← NEW (from claudekit)
Iron law: NO COMPLETION CLAIMS WITHOUT FRESH VERIFICATION EVIDENCE.

### Debugging (5 skills — methodology + Docker stack)

**13. `systematic-debugging/` (v2.1)** ← NEW
Four-phase framework: Root Cause Investigation → Pattern Analysis → Hypothesis Testing → Implementation. Iron Law: no fixes without root cause investigation first.

**14. `root-cause-tracing/` (v1.1)** ← NEW
Trace bugs backward through the call stack to find the original trigger. Includes find-polluter.sh for test pollution.

**15. `defense-in-depth/` (v1.1)** ← NEW
Validate at every layer data passes through. Four layers: Entry Point → Business Logic → Environment Guards → Debug Instrumentation.

**16. `verification-before-completion/` (v1.1)** ← NEW
Evidence before claims, always. No "should pass" — run the command, read the output, then claim.

**17. `docker-debugger/` (v2.0)** ← NEW
Docker debugging for xiigen-dynamic-forms WordPress test stack. 10 failure patterns, 7 known issues from Phases 1-3. Covers WordPress 6.7, MySQL 8, wp-cli, Playwright.

---

## The 5-Step Workflow

```
1. agent-output-format-skill   ← "Who is the consumer?" — FIRST, always
2. xiigen-core-principles-skill ← 8 principles check (P1–P8, 32 items)  
3. infrastructure-discovery    ← Verify paths, counts, artifact numbers live
4. planning-skill (8 gates)    ← Architecture, DNA, fabric, tests, DR entries
5. plan-review-skill (15 FCs)  ← Counts, paths, phases, principles, arithmetic
     + chain-arithmetic-audit  ← baseline + Σ(deltas) = final
   └── Gate A: SESSION-0 automated (15 FC + 7 SFA)
   └── Gate B: 2 AI models using audit-protocol 10-point checklist
   └── Gate C: Human written approval
```

---

## The 8 Foundational Principles (must be in every plan)

| # | Principle | Source | Gate Question |
|---|-----------|--------|---------------|
| P1 | Multi-tenant by design | multi-tenant-support.md | tenant_id on every artifact? No leak paths? |
| P2 | Safe config storage | multi-tenant-support.md | All configs via fabric? Per-tenant secrets? |
| P3 | Always improve prompts | Flow 30 | Prompts versioned? Judge+improve cycle? |
| P4 | RAG storage (global+local) | Flows 29, 32 | Knowledge in RAG? Local RAG for testing? |
| P5 | Self-developing engine | Flow 26 | Engine gets better, not just output? |
| P6 | Plan and arbitrate (BFA) | Flow 25 | Decisions arbitrated? Cross-flow conflicts? |
| P7 | Local testability | Flow 33 | Unit + sim + Docker for every component? |
| P8 | Open source model training | Flows 29, 30 | Cost tracked? Training captured? Routing? |

---

## The 15 FC Classes (plan-review-skill)

| FC | Class | Most Common Cause |
|----|-------|------------------|
| FC-1 | Count Drift | Added item, forgot 4/5 summary locations |
| FC-2 | Path Errors | Copied path from memory, not from codebase |
| FC-3 | Phantom Skills | Conceptual placeholder left in numbered list |
| FC-4 | Duplicate Numbers | Two list sections used overlapping numbers |
| FC-5 | Missing Items | Skill added to one list, not all required lists |
| FC-6 | Stale Numbers | Used estimate instead of live codebase value |
| FC-7 | Phase Placement | Moved skill, forgot to update all three locations |
| FC-8 | Format Violations | Mixed analysis + execution in one document |
| FC-9 | Requirement Ambiguity | "UI e2e" undefined for this project's stack |
| FC-10 | Propagation Failure | Fixed in one doc, stale in 2-3 others |
| FC-11 | Overview-Detail Mismatch | Phase header says 2 skills, deliverable has 3 |
| FC-12 | Principles Compliance | Plan exists without addressing P1–P8 |
| FC-13 | Chain Arithmetic | baseline + Σ(deltas) ≠ final expected count |
| FC-14 | Blast Radius Untagged | CI file edited with no YAML validation gate |
| FC-15 | API Shape Assumed | Test imports symbol without verifying export shape |

---

## File Inventory

```
.claude/skills/
├── agent-output-format-skill/
│   ├── SKILL.md, AGENTS.md, skill.yaml
│   └── references/foundational-principles.md
│
├── xiigen-core-principles-skill/
│   ├── SKILL.md, AGENTS.md, skill.yaml
│
├── plan-review-skill/
│   ├── SKILL.md                    (15 FC classes, review protocol, 3 gates)
│   ├── AGENTS.md, skill.yaml
│   ├── SESSION-0-PLAN-REVIEW-TEMPLATE.md  (16 steps + SFA checks)
│   └── references/
│       ├── foundational-principles.md, failure-class-catalog.md
│       ├── root-cause-analysis.md, detection-commands.md
│       └── session-file-audit.md   (7 SFA patterns)
│
├── how-to-prepare-a-plan-skill/
│   ├── SKILL.md, AGENTS.md, skill.yaml
│
├── v17-skill-library-reference/    ← REFERENCE COMPANION
│   ├── SKILL.md, AGENTS.md, skill.yaml
│
├── chain-arithmetic-audit/         ← NEW (extends FC-1)
│   ├── SKILL.md, AGENTS.md, skill.yaml
│
├── blast-radius-tagger/            ← NEW (extends G0)
│   ├── SKILL.md, AGENTS.md, skill.yaml
│
├── api-shape-verification/         ← NEW (extends G0 step 5)
│   ├── SKILL.md, AGENTS.md, skill.yaml
│
├── audit-protocol/                 ← NEW (defines Gate B)
│   ├── SKILL.md, AGENTS.md, skill.yaml
│
├── plan-execution-feedback/        ← NEW (session-end feedback)
│   ├── SKILL.md, AGENTS.md, skill.yaml
│
├── context-overflow-skill/         ← NEW (runtime context management)
│   ├── SKILL.md, AGENTS.md, skill.yaml
│
├── debug-session-skill/            ← NEW (persistent debug files + methodology)
│   ├── SKILL.md, AGENTS.md, skill.yaml
│   └── references/
│       ├── root-cause-tracing.md, defense-in-depth.md
│       └── verification-before-completion.md
│
└── docker-debugger/                ← NEW (Docker test stack debugging)
    ├── SKILL.md, AGENTS.md, skill.yaml
    └── references/
        ├── docker-basics.md, docker-compose.md
        └── systematic-debugging.md

├── systematic-debugging/           ← NEW (from claudekit — 4-phase framework)
│   ├── SKILL.md, AGENTS.md, skill.yaml
│
├── root-cause-tracing/             ← NEW (from claudekit — backward tracing)
│   ├── SKILL.md, AGENTS.md, skill.yaml, find-polluter.sh
│
├── defense-in-depth/               ← NEW (from claudekit — multi-layer validation)
│   ├── SKILL.md, AGENTS.md, skill.yaml
│
└── verification-before-completion/ ← NEW (from claudekit — evidence gate)
    ├── SKILL.md, AGENTS.md, skill.yaml
```

Total: ~65 files

---

## Artifact Boundaries (post FLOW-33 — verify against live canonical docs)

```
Next Factory:   F641    Next Family:   86
Next Task Type: T254    Next CF Rule:  CF-307
Next Skill:     SK-154
```

---

## What v4.0 Added (vs v3.0)

| Item | v3.0 | v4.0 |
|------|------|------|
| Plan review FCs | 12 | 15 (FC-13 chain arithmetic, FC-14 blast radius, FC-15 API shape) |
| SESSION-0 steps | 13 (12 FC + SFA) | 16 (15 FC + SFA) |
| Review quality skills | 0 | 5 (chain-arithmetic, blast-radius, api-shape, audit-protocol, feedback) |
| Operational skills | 0 | 3 (context-overflow, debug-session, docker-debugger) |
| Debug sub-skills | 0 | 4 (systematic-debugging, root-cause-tracing, defense-in-depth, verification) |
| Gate B definition | "2 AI models review" | "2 AI models use audit-protocol 10-point checklist" |
| Session file audit | Not present | 7 SFA patterns (V5 addition) |
| planning-skill gates | 7 (stale in docs) | 8 (Gate 7: P1–P8 — fixed everywhere) |
| Total skills | 5 | 17 |
