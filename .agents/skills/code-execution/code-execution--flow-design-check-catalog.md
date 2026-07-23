---
name: flow-design-check-catalog
version: "2.0.0"
priority: HIGH
category: code-execution
author: luba
updated: "2026-03-25"
description: >
  Named checks for validate.handler nodes in flow topologies. Each check has an
  ID, description, what it tests, severity, and example usage. Use these when
  writing validate.handler nodes in topology contracts.
triggers:
  - "validate.handler"
  - "named checks"
  - "CAP-001"
  - "RAG-001"
  - "LEARNING-001"
---

# Flow Design Check Catalog v2.0 (S4 additions)

## WHEN TO INVOKE

**Claude Code:** When writing any validate.handler node in a topology contract.
Reference this catalog to find the correct check ID and configuration.

---

## CHECK ID FORMAT

```
{CATEGORY}-{NUMBER}

Categories:
  CAP     → Capability checks (file exists, skill registered)
  RAG     → RAG pattern checks (freshness, tier, count)
  LEARNING → Learning signal checks (OUTCOME present, DPO format)
  SELF-Q  → Self-questioning checks (questions present, modifications documented)
  TOPO    → Topology structure checks (feedback.handler exists, naming)
  SCORE   → Score threshold checks (bracket routing)
  CONFIG  → Configuration checks (FREEDOM config, no hardcoded values)
```

---

## CAPABILITY CHECKS (CAP-xxx)

### CAP-001 — File exists
```json
{
  "id": "CAP-001",
  "check": "file-exists",
  "target": "${input.skillPath}",
  "config": {},
  "severity": "score-0",
  "description": "Required skill file exists on disk"
}
```

### CAP-002 — Skill registered
```json
{
  "id": "CAP-002",
  "check": "skill-registered",
  "target": "${input.skillId}",
  "config": { "index": "xiigen-skills" },
  "severity": "score-0",
  "description": "Skill is registered in xiigen-skills index"
}
```

### CAP-003 — Service injectable
```json
{
  "id": "CAP-003",
  "check": "service-injectable",
  "target": "${input.serviceName}",
  "config": { "module": "${input.moduleName}" },
  "severity": "BUILD_FAILURE",
  "description": "Service can be resolved via NestJS DI"
}
```

---

## RAG PATTERN CHECKS (RAG-xxx)

### RAG-001 — Pattern freshness
```json
{
  "id": "RAG-001",
  "check": "pattern-freshness",
  "target": "${n1.patterns}",
  "config": { "maxAgeHours": 168, "minQualityScore": 0.30 },
  "severity": "score-reduce-20",
  "description": "Retrieved patterns are fresh and have minimum quality"
}
```

### RAG-002 — Pattern count minimum
```json
{
  "id": "RAG-002",
  "check": "pattern-count",
  "target": "${n1.patterns}",
  "config": { "minimum": 3 },
  "severity": "score-reduce-10",
  "description": "At least 3 patterns were retrieved"
}
```

### RAG-003 — FLOW_DESIGN tier present
```json
{
  "id": "RAG-003",
  "check": "pattern-type-present",
  "target": "${n1.patterns}",
  "config": { "patternType": "FLOW_DESIGN" },
  "severity": "score-reduce-30",
  "description": "At least one FLOW_DESIGN pattern retrieved"
}
```

### RAG-004 — PROVEN_SOLUTION tier present
```json
{
  "id": "RAG-004",
  "check": "pattern-tier-present",
  "target": "${n1.patterns}",
  "config": { "tier": "PROVEN_SOLUTION" },
  "severity": "score-reduce-10",
  "description": "At least one PROVEN_SOLUTION tier pattern retrieved"
}
```

---

## LEARNING SIGNAL CHECKS (LEARNING-xxx)

### LEARNING-001 — OUTCOME signal present
```json
{
  "id": "LEARNING-001",
  "check": "outcome-signal-present",
  "target": "${feedback.handler.learning_signals}",
  "config": { "requiredType": "OUTCOME" },
  "severity": "BUILD_FAILURE",
  "description": "feedback.handler must have OUTCOME signal"
}
```

### LEARNING-002 — patternsRetrieved in OUTCOME
```json
{
  "id": "LEARNING-002",
  "check": "field-present",
  "target": "${feedback.handler.learning_signals[?type=='OUTCOME'].data}",
  "config": { "requiredField": "patternsRetrieved" },
  "severity": "BUILD_FAILURE",
  "description": "OUTCOME signal must include patternsRetrieved field"
}
```

### LEARNING-003 — DPO triple format (updated S4/C-4a — P17+P18 fields)
```json
{
  "id": "LEARNING-003",
  "check": "dpo-triple-format",
  "target": "${output.dpoTriple}",
  "config": {
    "requiredFields": [
      "prompt.system", "chosen", "rejected", "teachingPoint",
      "curriculumTier", "targetModelFamily", "instructionFormat", "modelComparison"
    ]
  },
  "severity": "BUILD_FAILURE",
  "description": "DPO triple must have complete P17+P18 fields. See DPO VALIDITY GATE in learning-signal-capture-SKILL.md"
}
```

### LEARNING-004 — Cross-model DPO provenance (P17)
```json
{
  "id": "LEARNING-004",
  "check": "dpo-cross-model-provenance",
  "target": "${output.dpoTriple}",
  "config": { "rule": "chosen.model != rejected.model" },
  "severity": "BUILD_FAILURE",
  "description": "DPO triple chosen and rejected must come from different model families. Same-model cycle comparison is not DPO — it is intra-model style drift that teaches nothing."
}
```

### LEARNING-005 — Arbiter expertise coverage (P17)
```json
{
  "id": "LEARNING-005",
  "check": "arbiter-expertise-coverage",
  "target": "${topology.nodes[score.handler | arbiter-panel.handler]}",
  "config": { "rule": "each evaluator domain mapped to separate arbiter token" },
  "severity": "BUILD_FAILURE",
  "description": "Every score.handler evaluator domain must have its own arbiter. Shared single-judge across all evaluators has no expertise specialization."
}
```

### LEARNING-006 — OSS teaching fields present (P18)
```json
{
  "id": "LEARNING-006",
  "check": "dpo-oss-fields-present",
  "target": "${output.dpoTriple}",
  "config": {
    "requiredFields": ["curriculumTier", "targetModelFamily", "instructionFormat", "distillationReadiness"]
  },
  "severity": "BUILD_FAILURE",
  "description": "DPO triple must include OSS teaching fields (P18). FLOW-39 will not add these retroactively. targetModelFamily must read from FREEDOM config, not hardcoded."
}
```

### LEARNING-007 — curriculumTier not null (P18)
```json
{
  "id": "LEARNING-007",
  "check": "field-not-null",
  "target": "${output.dpoTriple.curriculumTier}",
  "config": { "allowedValues": [1, 2, 3, 4, 5] },
  "severity": "BUILD_FAILURE",
  "description": "curriculumTier must be assigned at store time from the archetype tier table. null = triple is unusable for curriculum fine-tuning."
}
```

---

## HEALTH CHECKS (HEALTH-xxx)

### HEALTH-001 — Absolute test gate (P19)
```json
{
  "id": "HEALTH-001",
  "check": "absolute-test-gate",
  "target": "${session.testResults}",
  "config": {
    "rule": "failures === 0",
    "skippedPolicy": "each-skip-documented",
    "deltaGateInsufficient": true
  },
  "severity": "BUILD_FAILURE",
  "description": "Test suite must have zero failures — not 'zero new failures.' Delta gate (no regressions) is necessary but not sufficient. Each skipped test requires documented justification."
}
```

---

## ISSUE CHECKS (ISSUE-xxx)

### ISSUE-001 — No unresolved issues in session log (P19/M4)
```json
{
  "id": "ISSUE-001",
  "check": "no-unresolved-issues-in-log",
  "target": "${session.executionLog}",
  "config": {
    "bannedPhrases": [
      "pre-existing",
      "unrelated to this session",
      "not introduced by",
      "out of scope",
      "known issue"
    ],
    "requiredResolution": "FIXED | AWAITING_LUBA_DISPOSITION"
  },
  "severity": "BUILD_FAILURE",
  "description": "Every issue found during a session must be resolved or explicitly escalated. Labeling as pre-existing is not a resolution — it is a deferral that requires Luba authorization."
}
```

---

## ARBITER CHECKS (ARBITER-xxx)

### ARBITER-001 — Principles arbiter isolated (P20)
```json
{
  "id": "ARBITER-001",
  "check": "principles-arbiter-isolated",
  "target": "${topology.nodes[arbiter-panel.handler].arbiters.key_principles}",
  "config": { "requiredField": "isolated", "requiredValue": true },
  "severity": "BUILD_FAILURE",
  "description": "Key Principles Arbiter must have isolated: true. Its context package contains only M1-M5+P1-P22+DNA-1..9 — no iron rules, RAG patterns, or domain context."
}
```

### ARBITER-002 — Escalation arbiter present (P17)
```json
{
  "id": "ARBITER-002",
  "check": "escalation-arbiter-present",
  "target": "${topology.nodes[arbiter-panel.handler]}",
  "config": { "requiredField": "escalationGate" },
  "severity": "BUILD_FAILURE",
  "description": "Every arbiter-panel.handler node must have an escalationGate block defining block/accept/cycle/human rules. Without it, BLOCK verdicts are averaged instead of enforced."
}
```

### ARBITER-003 — Block semantics not averaged (P17)
```json
{
  "id": "ARBITER-003",
  "check": "block-semantics-not-averaged",
  "target": "${topology.nodes[arbiter-panel.handler]}",
  "config": { "requiredField": "blockSemantics", "requiredValue": "ANY_BLOCK_CLASS_REJECTS" },
  "severity": "BUILD_FAILURE",
  "description": "arbiter-panel.handler must declare blockSemantics: ANY_BLOCK_CLASS_REJECTS. A principle violation cannot be diluted by high scores from other arbiters."
}
```

---

## SELF-QUESTIONING CHECKS (SELF-Q-xxx)

### SELF-Q-001 — Questions present
```json
{
  "id": "SELF-Q-001",
  "check": "self-questions-present",
  "target": "${n-generate.output.selfQuestions}",
  "config": { "minimum": 3 },
  "severity": "score-reduce-20",
  "description": "ai-generate output must include 3+ self-questions"
}
```

### SELF-Q-002 — Answers match questions
```json
{
  "id": "SELF-Q-002",
  "check": "array-length-match",
  "target": ["${n-generate.output.selfQuestions}", "${n-generate.output.answers}"],
  "config": {},
  "severity": "score-reduce-10",
  "description": "answers[] length must equal selfQuestions[] length"
}
```

### SELF-Q-003 — Modifications documented
```json
{
  "id": "SELF-Q-003",
  "check": "modifications-documented",
  "target": "${n-generate.output}",
  "config": {},
  "description": "If any answer reveals flaw, modificationsFromQuestioning not empty",
  "severity": "BUILD_FAILURE"
}
```

---

## TOPOLOGY STRUCTURE CHECKS (TOPO-xxx)

### TOPO-001 — Topology ID format
```json
{
  "id": "TOPO-001",
  "check": "regex-match",
  "target": "${topology.topologyId}",
  "config": { "pattern": "^flow-[0-9]{1,2}[a-z]-[a-z-]+$" },
  "severity": "BUILD_FAILURE",
  "description": "topologyId must match flow-{XX}{letter}-{name} format"
}
```

### TOPO-002 — feedback.handler exists
```json
{
  "id": "TOPO-002",
  "check": "node-exists",
  "target": "${topology.nodes}",
  "config": { "handler": "feedback.handler" },
  "severity": "BUILD_FAILURE",
  "description": "Topology must have a feedback.handler node"
}
```

### TOPO-003 — No hardcoded if/else
```json
{
  "id": "TOPO-003",
  "check": "no-inline-conditionals",
  "target": "${topology.nodes}",
  "config": {},
  "severity": "score-reduce-30",
  "description": "Branching must use route.handler, not inline if/else"
}
```

### TOPO-004 — Iron rules declared
```json
{
  "id": "TOPO-004",
  "check": "field-present",
  "target": "${topology}",
  "config": { "requiredField": "ironRules" },
  "severity": "score-reduce-10",
  "description": "Topology must declare ironRules[]"
}
```

---

## SCORE CHECKS (SCORE-xxx)

### SCORE-001 — Score bracket routing
```json
{
  "id": "SCORE-001",
  "check": "bracket-routing",
  "target": "${n-score.value}",
  "config": {
    "brackets": [
      { "min": 0, "max": 49, "route": "structural-failure" },
      { "min": 50, "max": 64, "route": "prompt-patch-heavy" },
      { "min": 65, "max": 84, "route": "prompt-patch-targeted" },
      { "min": 85, "max": 100, "route": "pass" }
    ]
  },
  "severity": "score-0",
  "description": "Score must route to correct bracket handler"
}
```

---

## CONFIGURATION CHECKS (CONFIG-xxx)

### CONFIG-001 — No hardcoded thresholds
```json
{
  "id": "CONFIG-001",
  "check": "no-hardcoded-literals",
  "target": "${topology.nodes[*].config}",
  "config": { "literalTypes": ["number"] },
  "severity": "score-reduce-20",
  "description": "Numeric thresholds must be in config, not hardcoded"
}
```

### CONFIG-002 — FREEDOM config referenced
```json
{
  "id": "CONFIG-002",
  "check": "config-source",
  "target": "${topology.nodes[*].config}",
  "config": { "allowedSources": ["FREEDOM", "STATE", "input"] },
  "severity": "score-reduce-10",
  "description": "Configurable values must come from FREEDOM config"
}
```

---

## SEVERITY LEVELS

| Severity | Effect | When to use |
|----------|--------|-------------|
| `BUILD_FAILURE` | Topology cannot deploy | Missing required structure (LEARNING-001, LEARNING-004, HEALTH-001, ISSUE-001, ARBITER-001) |
| `score-0` | Run fails immediately | Critical capability missing |
| `score-reduce-N` | Score reduced by N points | Non-critical issue that degrades quality |

---

## INTEGRATION

```
Used by:      topology-structure-SKILL.md (validate.handler format)
              learning-signal-capture-SKILL.md (LEARNING-xxx checks)
              self-questioning-SKILL.md (SELF-Q-xxx checks)
Executed by:  GenericNodeExecutor validate.handler implementation
```
