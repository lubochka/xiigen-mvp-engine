# AGENTS.md — Code Examination Skill (load order 15)

## Invoke When
- Before modifying any AF station, fabric provider, DNA guard, or skill block
- Before any Phase 11 code modification gate
- When a bug report references a file not yet read this session
- Any time the approach is "find the bug and fix it" without first reading the file

## The 5-Step Protocol

```
Step 1: Read the target file completely (no skipping)
Step 2: Map upstream callers (grep for callers)
Step 3: Map downstream consumers (what uses this file's output?)
Step 4: Form a hypothesis BEFORE reading tests
         "This code does X. If I change Y, Z will break."
Step 5: Read the test file — does it confirm your model?
         If not: fix your model first, then proceed
```

## Diagnostic Routing (symptom → mental-debug rule)

| Symptom | First Rule | Second Rule |
|---------|-----------|-------------|
| DNA violation in generated code | pattern-recognition-verdicts | generated-service-audit |
| Fabric returns wrong result | boundary-data-lifecycle | fabric-resolution-trace |
| Tenant isolation broken | tenant-scope-leak | boundary-data-lifecycle |
| Pipeline quality flatlines | contextual-gap | mental-execution |
| BFA false positive | boundary-message-map | sibling-guard-parity |
| Silent wrong output (no error) | error-silent-catch | mental-execution |

## Red Flags

| Signal | Problem |
|--------|---------|
| Modifying a line found by grep without reading the full file | AP-1: grepping without context |
| Reading test file before reading implementation | AP-2: contract before mechanism |
| "I know this file already" — no re-read | AP-3: stale mental model |
| No written hypothesis before edit | AP-4: modify by guess |

## One Rule

> Read → Map callers → Map consumers → Hypothesize → Verify → Then touch.
