---
name: session-execution-log-schema
sk: SK-426
description: >
  Defines the structured execution log Claude Code writes after every phase.
  Captures files changed, prompts used, costs per model, arbiter scores,
  test delta, and DPO triples in a machine-readable format that feeds back
  into the meta-arbitration layer and enables session recovery.
layer: session-output
version: 1.0.0
createdAt: 2026-03-20
requires: []
complements: [SK-427, SK-428]
---

# SessionExecutionLogSchema [SK-426]

## Purpose

Every phase Claude Code executes produces a structured execution log.
This log is the single source of truth for what happened in a phase —
what files changed, which prompts were used, what things cost, which
arbiters passed or failed, and what tests moved. The meta-arbitration
layer reads it. The web session reads it. Audit trails reference it.

## When Claude Code Writes This

After every phase gate passes — never before. If the gate fails (tests
regress, tsc errors), the execution log is NOT written. A log only exists
for a phase that completed successfully.

## File Location and Name

```
sessions/FLOW-XX/EXECUTION-LOG-{phase-letter}.json

Examples:
  sessions/FLOW-35/EXECUTION-LOG-A.json
  sessions/FLOW-01/EXECUTION-LOG-B.json
```

## Schema

```typescript
interface ExecutionLog {
  // Identity
  flow_id: string;              // "FLOW-35"
  phase: string;                // "A" | "B" | "C" | ...
  phase_title: string;          // "Foundations [FLOW-35-A]"
  session_file: string;         // "SESSION-FLOW-35-A.md"
  completed_at: string;         // ISO timestamp
  duration_minutes: number;

  // Baseline tracking
  test_baseline_entry: number;  // tests passing at phase start
  test_baseline_exit: number;   // tests passing at phase end
  test_delta: number;           // exit - entry (must be ≥ 0)
  tsc_errors: 0;                // always 0 — gate would have failed otherwise

  // Files
  files_changed: FileChange[];
  files_created: string[];      // paths of new files
  files_deleted: string[];      // paths of deleted files

  // Artifacts registered
  artifacts: {
    task_types?: string[];      // ["T565", "T566"]
    factories?: string[];       // ["F1484", "F1485", ...]
    skills?: string[];          // ["SK-402", "SK-403", ...]
    bfa_rules?: string[];       // ["CF-789", "CF-790", ...]
    archetypes?: string[];      // ["META_COLLECTION", "META_DECISION"]
  };

  // AI cost (if phase involved AI generation rounds)
  ai_cost?: {
    total_usd: number;
    by_model: Record<string, number>;  // { "claude-sonnet": 0.42, ... }
    rounds_run: number;
    final_decision: string;            // "ACCEPT" | "RETRY" | "ESCALATE" | ...
  };

  // Arbiter results (if generation ran)
  arbiter_results?: {
    round_number: number;
    model_id: string;
    composite_score: number;
    passing_arbiters: string[];
    failing_arbiters: string[];
    score_0_violations: string[];
  }[];

  // Training data
  dpo_triples_captured: number;   // 0 if no AI generation this phase

  // Gate result
  gate_passed: true;              // always true — log only written on pass
  gate_checks: GateCheck[];
}

interface FileChange {
  path: string;
  type: "modified" | "created" | "deleted";
  lines_before?: number;   // only for modified
  lines_after?: number;    // only for modified
  summary: string;         // one-line description of what changed
}

interface GateCheck {
  check: string;           // "npx tsc --noEmit = 0 errors"
  passed: true;
  value?: string;          // "3,978 tests passing"
}
```

## Writing Rules

```
1. Write AFTER the gate passes — never speculatively
2. All number fields must be exact — no estimates or "approximately"
3. test_delta must equal exit - entry — if negative, gate should have failed
4. files_changed must list every file touched during the phase
5. ai_cost is omitted entirely if no AI generation ran this phase
6. dpo_triples_captured is always present (0 if none)
7. completed_at is the timestamp of the gate passing, not phase start
```

## Positive Example

```json
{
  "flow_id": "FLOW-35",
  "phase": "B",
  "phase_title": "SpendAndSecurity [FLOW-35-B]",
  "session_file": "SESSION-FLOW-35-B.md",
  "completed_at": "2026-03-21T14:32:00Z",
  "duration_minutes": 47,
  "test_baseline_entry": 3968,
  "test_baseline_exit": 3978,
  "test_delta": 10,
  "tsc_errors": 0,
  "files_changed": [
    {
      "path": "server/src/engine/meta-arbitration/spend-governor.ts",
      "type": "created",
      "lines_after": 187,
      "summary": "SK-402 SpendGovernorPattern implementation"
    }
  ],
  "files_created": [
    "server/src/engine/meta-arbitration/spend-governor.ts",
    "server/src/engine/meta-arbitration/security-circuit-breaker.ts",
    "server/test/flow35/spend-governor.spec.ts",
    "server/test/flow35/security-circuit-breaker.spec.ts"
  ],
  "files_deleted": [],
  "artifacts": {
    "skills": ["SK-402", "SK-403"]
  },
  "dpo_triples_captured": 0,
  "gate_passed": true,
  "gate_checks": [
    { "check": "npx tsc --noEmit", "passed": true, "value": "0 errors" },
    { "check": "npm test", "passed": true, "value": "3,978 passing" },
    { "check": "SK-402 registered in MetaArbiterRegistry", "passed": true },
    { "check": "SK-403 registered in MetaArbiterRegistry", "passed": true },
    { "check": "HALT cannot be overridden (CF-790)", "passed": true }
  ]
}
```

## Negative Example

```
WRONG: Writing the log before the gate runs
  → Log exists but tests actually regressed — now the log is a lie

WRONG: Estimated test counts
  "test_baseline_exit": "approximately 3,978"
  → Must be the actual number from npm test output

WRONG: Missing files_changed
  "files_changed": []  when 4 files were actually modified
  → Every touched file must appear in files_changed

WRONG: Omitting ai_cost when generation ran
  → If AfPipeline ran at all this phase, ai_cost section is required
```

## Integration

```
requires:    [] — written by Claude Code directly after gate passes
complements: SK-427 (PhaseCompletionPackager — reads this log to build PHASE-COMPLETE.md)
             SK-428 (WebSessionHandoff — reads this log for SESSION-BRIEF.md)
```
