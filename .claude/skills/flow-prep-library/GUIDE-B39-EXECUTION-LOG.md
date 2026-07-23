# GUIDE-B39 — How to Produce `EXECUTION-LOG.json`
## Library guidance file — FLOW-PREP-LIBRARY-MASTER-PLAN v6.1-FINAL
## Produced: Round 49 | Phase 4 (Guidance File Authoring)
## Date: 2026-04-20

---

## FINAL GOAL (re-read before authoring any EXECUTION-LOG.json):
> "Taking the produced library as a result of this plan run — same size as list B —
> and applying on new flow specs, we will get proper list B for this flow."

This file is the EXECUTION-LOG.json guidance: one of the 50 guidance files that
constitute the library. When Claude Code applies this guidance, it will produce a
correct EXECUTION-LOG.json that serves as the machine-readable audit trail of every
phase that completed successfully in a flow's implementation.

---

## WHAT THIS FILE IS

`EXECUTION-LOG.json` is governed by **SK-426** (`session-execution-log-schema`).
It is the single source of truth for what happened in a phase — what files changed,
which prompts were used, what things cost, which arbiters passed or failed, and what
tests moved. The meta-arbitration layer reads it. Web sessions read it for context.
Audit trails reference it.

**Critical rule: written AFTER the gate passes — never before.**
A log exists only for a phase that completed successfully. If tsc errors exist or
tests regress, no log is written for that phase.

**Three-file triplet (SK-426 + SK-427 + SK-428):**
Every completed implementation session produces all three:
- `EXECUTION-LOG.json` (SK-426) — machine-readable phase record
- `PHASE-COMPLETE.md` (SK-427) — human-readable structured completion record
- `SESSION-BRIEF.md` (SK-428) — 30-second handoff for next session

SK-427 reads SK-426 to build PHASE-COMPLETE.md. SK-428 reads SK-426 for SESSION-BRIEF.md.

---

## LIST A SOURCES FOR THIS GUIDANCE FILE

| ZIP | Role | Specific files |
|-----|------|----------------|
| ZIP-17 | PRIMARY | `FLOW-46/EXECUTION-LOG.json` — full implementation log (GOAL_REACHED): schemaVersion SK-426-v1, 5 phase entries (A, B+C, D, E, F), each with turns, status, evidence (specific file names and counts), gateResult PASS, commit hash, deferred items |
| ZIP-17 | PRIMARY | `FLOW-47/EXECUTION-LOG.json` — partial log (GOAL_PARTIALLY_REACHED): 9 phase entries with gateResult PASS/FAIL/PASS_WITH_CAVEAT, IMPLEMENTED_WITH_DEFECT status, failure descriptions, caveat text |
| ZIP-11 | COMPARISON | `FLOW-01/final-flow-testing/EXECUTION-LOG-B.json` — phase-scoped log: canonical SK-426 schema with flow_id, phase, files_changed[], files_created[], artifacts{}, ai_cost{}, arbiter_results[], dpo_triples_captured, gate_checks[] |
| ZIP-Project | PRIMARY | `.claude/skills/session-output/session-execution-log-SKILL.md` (SK-426) — canonical schema definition: ExecutionLog interface (15 top-level fields), FileChange interface, GateCheck interface, 7 writing rules, positive/negative examples |

---

## OUTPUT FILE SPECIFICATION

**Two path patterns exist:**

**Pattern 1 — Modern single-file (FLOW-46/47 style):**
`docs/sessions/FLOW-XX/EXECUTION-LOG.json`
One file per implementation session, covering all phases.

**Pattern 2 — Phase-scoped (FLOW-01 style, SK-426 canonical):**
`docs/sessions/FLOW-XX/EXECUTION-LOG-{phase-letter}.json`
One file per phase: `EXECUTION-LOG-A.json`, `EXECUTION-LOG-B.json`, etc.

Both patterns are valid. Modern flows use Pattern 1. The SK-426 canonical schema
describes Pattern 2. Choose based on session scope: if one session covers all phases,
use Pattern 1. If each phase is a separate session, use Pattern 2.

---

## THE TWO SCHEMA FORMATS

### Format 1 — Modern multi-phase (FLOW-46/47 style)

Used in the current codebase (FLOW-46 and newer). Combines all phases in one
document with a summary structure.

```json
{
  "flowId": "FLOW-XX",
  "slug": "[slug]",
  "schemaVersion": "SK-426-v1",
  "branch": "[branch-name]",
  "capturedAt": "YYYY-MM-DDTHH:MM:SSZ",
  "phases": [
    {
      "phase": "[A / B / B+C / D / E / F / 1..N]",
      "name": "[Phase human description]",
      "turns": ["[what ran — e.g., AF-1..AF-11, seed, admin-extension]"],
      "status": "[COMPLETE / COMPLETE_WITH_WEAKENED_ASSERTIONS / IMPLEMENTED_WITH_DEFECT]",
      "evidence": {
        "[evidence key]": "[value or count]"
      },
      "gateResult": "[PASS / PASS_WITH_CAVEAT / FAIL]",
      "commit": "[short hash]",
      "deferred": "[items deferred from this phase]",
      "note": "[optional explanatory note]",
      "failure": "[if FAIL: specific description of what failed]",
      "caveat": "[if PASS_WITH_CAVEAT: description of the caveat]"
    }
  ],
  "overallVerdict": "[GOAL_REACHED / GOAL_PARTIALLY_REACHED]",
  "artifacts": {
    "implState": "FLOW-XX-IMPL-STATE.json",
    "[other artifact keys]": "[file names]"
  }
}
```

### Format 2 — SK-426 canonical per-phase (FLOW-01 style)

The formally defined schema from SK-426. Used for per-phase logs or when detailed
tracking of files and AI costs is needed.

```json
{
  "flow_id": "FLOW-XX",
  "phase": "[A/B/C/D/E/F]",
  "phase_title": "[Phase title — FLOW-XX-[phase]]",
  "session_file": "SESSION-FLOW-XX-[phase].md",
  "completed_at": "YYYY-MM-DDTHH:MM:SSZ",
  "duration_minutes": [N],
  "test_baseline_entry": [N],
  "test_baseline_exit": [N],
  "test_delta": [N],
  "tsc_errors": 0,
  "files_changed": [
    {
      "path": "server/src/[path]",
      "type": "[modified / created / deleted]",
      "lines_before": [N],
      "lines_after": [N],
      "summary": "[one-line description of what changed]"
    }
  ],
  "files_created": ["[path]", ...],
  "files_deleted": [],
  "artifacts": {
    "task_types": ["T[NNN]", ...],
    "factories": ["F[N]", ...],
    "skills": ["SK-[N]", ...],
    "bfa_rules": ["CF-[N]", ...]
  },
  "ai_cost": {
    "total_usd": [float],
    "by_model": { "[model-name]": [float] },
    "rounds_run": [N],
    "final_decision": "[ACCEPT / RETRY / ESCALATE]"
  },
  "arbiter_results": [
    {
      "round_number": [N],
      "model_id": "[model]",
      "composite_score": [float],
      "passing_arbiters": ["[arbiter name]", ...],
      "failing_arbiters": [],
      "score_0_violations": []
    }
  ],
  "dpo_triples_captured": [N],
  "gate_passed": true,
  "gate_checks": [
    { "check": "[gate command]", "passed": true, "value": "[result]" }
  ]
}
```

---

## THE PHASE STATUS VOCABULARY

| Status | Meaning |
|--------|---------|
| `COMPLETE` | Phase fully implemented and all gates green |
| `COMPLETE_WITH_WEAKENED_ASSERTIONS` | Tests pass but assertions were weakened below plan thresholds |
| `IMPLEMENTED_WITH_DEFECT` | Code shipped but a specific invariant failed |
| `IN_PROGRESS` | Phase started but not yet completed |
| `NOT_STARTED` | Phase has not begun |

The first three are the "completed" statuses — phases with these statuses have an
entry in the log.

---

## THE GATE RESULT VOCABULARY

| GateResult | When | Effect on overallVerdict |
|-----------|------|------------------------|
| `PASS` | All gate checks green | Counts toward GOAL_REACHED |
| `PASS_WITH_CAVEAT` | Numerically passes but with known weakness | Counts toward GOAL_PARTIALLY_REACHED |
| `FAIL` | A specific invariant or count gate failed | Forces GOAL_PARTIALLY_REACHED |

---

## THE EVIDENCE FIELD — WHAT IT MUST CONTAIN

The `evidence` field in each phase entry must contain specific, verifiable facts —
not descriptions. Examples from FLOW-46:

**Phase A evidence (correct):**
```json
"evidence": {
  "designReasoningTriples": 15,
  "engineContracts": "T650-T656 (7)",
  "bfaRules": "CF-839/840/841 (3)",
  "topologyJson": "contracts/topologies/platform-agent.topology.json",
  "arbitersBulkNdjson": "fixtures/arbiters/platform-agent-arbiters.bulk.ndjson (9 records, scope_isolation last per FC-32)",
  "eventSchemas": 5,
  "esIndexFixtures": ["xiigen-agent-actions", "xiigen-agent-contributions"],
  "ragSeedScript": "rag-benchmark/seed_platform_agent_patterns.py"
}
```

**Anti-patterns (wrong):**
```
"evidence": { "description": "Phase A seeding complete" }
  → No counts, not verifiable

"evidence": { "artifacts": "all phase A artifacts" }
  → Vague, not specific
```

**Rule:** Every evidence field is verifiable by querying ES, counting files, or
running grep. If it can't be verified against the actual codebase, it's too vague.

---

## THE DEFERRED FIELD — WHAT IT MUST CONTAIN

The `deferred` field records items that were intentionally left for a later session.
Format: "[Item name] — [what it is] + [what is required to close it]"

From FLOW-46 Phase D:
```json
"deferred": "Per-tenant filter — sessions are MASTER-scoped today; would need targetTenantIds[] denormalisation or join with xiigen-agent-actions"
```

From FLOW-46 Phase E:
```json
"deferred": "SNAP-01..SNAP-21 (require buildAgentSessionSnapshot/runAgentSession helpers) + INT-1..INT-4 (require live ES + queue + AI provider) + Playwright approve/dismiss tests (require pendingActions confirmation/rollback UI on ChatPage)"
```

Note: deferred items in EXECUTION-LOG.json are what feed into PHASE-COMPLETE.md's
"Documented deferrals" section and SESSION-BRIEF.md's "Documented deferrals" section.

---

## HOW TO PRODUCE EXECUTION-LOG.JSON

### Producing Format 1 (modern multi-phase)

Write the file at the end of the session, after all phases complete and the final
gate passes. The file is never written speculatively.

```bash
node - <<'EOF'
const fs = require('fs');
const log = {
  flowId: 'FLOW-XX',
  slug: '[slug]',
  schemaVersion: 'SK-426-v1',
  branch: '[branch]',
  capturedAt: new Date().toISOString(),
  phases: [
    {
      phase: 'A',
      name: '[Phase A description]',
      turns: ['seed'],
      status: 'COMPLETE',
      evidence: {
        // Populate from actual measurements:
        // Count files created, ES records inserted, tests passing
      },
      gateResult: 'PASS',
      commit: '[git log --oneline -1 | cut -d" " -f1]'
    },
    // ... add one entry per phase
  ],
  overallVerdict: 'GOAL_REACHED', // or GOAL_PARTIALLY_REACHED
  artifacts: {
    implState: 'FLOW-XX-IMPL-STATE.json',
    phaseComplete: 'PHASE-COMPLETE.md',
    sessionBrief: 'SESSION-BRIEF.md'
  }
};
fs.writeFileSync('docs/sessions/FLOW-XX/EXECUTION-LOG.json', JSON.stringify(log, null, 2));
console.log('EXECUTION-LOG.json written');
EOF
```

### Producing Format 2 (SK-426 canonical per-phase)

Write after each phase gate passes. Use this format when sessions are phase-scoped.

```bash
# After Phase B gate passes:
BASELINE_ENTRY=$(node -e "
  const log = JSON.parse(require('fs').readFileSync('docs/sessions/FLOW-XX/EXECUTION-LOG-A.json'));
  console.log(log.test_baseline_exit);
")

BASELINE_EXIT=$(cd server && npx jest --verbose 2>&1 | grep "Tests:" | tail -1 | grep -o "[0-9]* passed" | grep -o "[0-9]*")

cat > docs/sessions/FLOW-XX/EXECUTION-LOG-B.json << EOF
{
  "flow_id": "FLOW-XX",
  "phase": "B",
  "phase_title": "[Phase B title]",
  "session_file": "SESSION-FLOW-XX-B.md",
  "completed_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "duration_minutes": [N],
  "test_baseline_entry": $BASELINE_ENTRY,
  "test_baseline_exit": $BASELINE_EXIT,
  "test_delta": $((BASELINE_EXIT - BASELINE_ENTRY)),
  "tsc_errors": 0,
  "files_changed": [],
  "files_created": [],
  "files_deleted": [],
  "artifacts": {},
  "dpo_triples_captured": 0,
  "gate_passed": true,
  "gate_checks": []
}
EOF
```

---

## ACCEPTANCE CRITERIA FOR EXECUTION-LOG.JSON

Before EXECUTION-LOG.json is considered complete:

**Format 1 (modern):**
- [ ] `schemaVersion: "SK-426-v1"` present
- [ ] `flowId`, `slug`, `branch`, `capturedAt` all present
- [ ] One entry per phase in `phases[]`
- [ ] Each phase entry has: `phase`, `name`, `turns`, `status`, `evidence`, `gateResult`
- [ ] FAIL phases have `failure` field with specific description
- [ ] PASS_WITH_CAVEAT phases have `caveat` field
- [ ] Phases with deferred items have `deferred` field
- [ ] `overallVerdict` is `GOAL_REACHED` or `GOAL_PARTIALLY_REACHED`
- [ ] `artifacts` maps to the actual files produced in this session

**Format 2 (SK-426 canonical):**
- [ ] `gate_passed: true` is literally present
- [ ] `test_delta` equals `test_baseline_exit - test_baseline_entry` (must be ≥ 0)
- [ ] `tsc_errors: 0` is literally present
- [ ] `files_changed` lists every file touched
- [ ] `ai_cost` is present if any AI generation ran; absent if not
- [ ] `dpo_triples_captured` is present (0 if none)
- [ ] `gate_checks` has at least one entry per gate that ran

---

## KEY RULES

**1. Written AFTER the gate passes — never before.**
This is SK-426's most important rule. A log exists only for a successfully completed
phase. If tests regress or tsc errors appear, no log is written. A log that exists
for a phase that failed is a lie in the audit trail.

**2. Evidence fields are specific and verifiable.**
Every evidence field is a count (integer), a file path, or a range like "T650-T656 (7)".
No descriptions like "artifacts seeded" or "services complete."

**3. test_delta must be non-negative (Format 2).**
`test_delta = test_baseline_exit - test_baseline_entry`. If negative, the gate should
have failed — the tests regressed. A negative test_delta in a log indicates a bug in
the gate check logic.

**4. FAIL gateResult forces GOAL_PARTIALLY_REACHED.**
If any phase has `gateResult: "FAIL"`, the overall verdict must be
`GOAL_PARTIALLY_REACHED`. There is no combination where `GOAL_REACHED` is valid when
a phase failed.

**5. Deferred items flow through to PHASE-COMPLETE and SESSION-BRIEF.**
The `deferred` field in the log is what SK-427 and SK-428 read to populate their
"Documented deferrals" sections. The log is the single source — don't write
different deferrals in the log vs the brief.

**6. overallVerdict is determined by gate results — not by subjective assessment.**
`GOAL_REACHED` requires all phases `PASS` or `PASS_WITH_CAVEAT` AND no
`IMPLEMENTED_WITH_DEFECT` statuses. Any `FAIL` gateResult → `GOAL_PARTIALLY_REACHED`.

---

*End of GUIDE-B39 — EXECUTION-LOG.json*
*List A sources: ZIP-17 (FLOW-46/47 EXECUTION-LOG.json production examples),*
*ZIP-11 (FLOW-01 EXECUTION-LOG-B.json per-phase example),*
*ZIP-Project (SK-426 session-execution-log-SKILL.md canonical schema definition)*
*Governed by: SK-426*
*Target B-type: B-39 — EXECUTION-LOG.json*
*Round: 49 of 72*
