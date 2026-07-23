# Self-Implementation Planning Skill v1.0
## For: XIIGen flows that generate their own implementation code
---
name: self-implementation-skill
version: "1.0.0"
description: >
  Governs sessions where XIIGen generates its own infrastructure code
  through the AF pipeline instead of Claude Code writing it manually.
  Defines the boundary: what Claude Code does (infrastructure, bootstrap,
  contracts) vs what XIIGen generates (service code, tests, configs).
  First flow using this skill: FLOW-0 (RAG Benchmark Self-Implementation).
author: luba
updated: "2026-03-19"
priority: HIGH
triggers:
  - "self-implementation"
  - "engine generates its own"
  - "self-building"
  - "use xiigen to implement"
  - "AF pipeline generates"
  - "bootstrap engine contracts"
---

## When to Invoke

**BEFORE** any session where the engine will generate code for itself.
**BEFORE** writing EngineContracts for self-referential tasks.
**AFTER** infrastructure is in place (ES running, prompts seeded).

## The Boundary Rule

> **Claude Code builds the SCAFFOLD. XIIGen generates the CODE.**
>
> If the task is "install software" or "create a config file" → Claude Code.
> If the task is "generate a Python service from a specification" → XIIGen AF pipeline.
> If the task is "write the specification" → Claude Code (Phase 0 bootstrap).

## The 4-Phase Pattern

Every self-implementation flow follows this sequence:

```
Phase 0: INJECT (Claude Code)
  - Write EngineContracts (task type JSON documents)
  - Write initial AF prompts (genesis, review, judge)
  - Seed to ES (xiigen-engine-contracts + xiigen-prompts)
  - This is manual bootstrap — the engine can't decompose plans yet

Phase 1: GENERATE (XIIGen AF Pipeline)
  - Submit contracts to FlowOrchestrator
  - AF-1 Genesis generates code from contract + RAG context + prompts
  - AF-5 Multi-model runs competing generations (if enabled)
  - Output: generated code files

Phase 2: JUDGE (XIIGen AF-6/7/8/9)
  - AF-6 Code Review: structure, style, error handling
  - AF-7 Compliance: DNA patterns + P1-P8 principles
  - AF-9 Judge: 5-component scoring (correctness/quality/compliance/perf/cost)
  - Output: verdict + score + improvement suggestions

Phase 3: IMPROVE (XIIGen FLOW-30 PromptOps)
  - If score >= 80: promote to INJECTED, capture training data
  - If score 60-79: PromptOps generates PromptPatch, re-generate
  - If score < 60: escalate to Luba
  - Output: improved prompts, improved next-generation quality
```

## EngineContract Template (Phase 0)

Every self-implementation task type needs this contract:

```json
{
  "taskType": "T{N}",
  "taskName": "{DescriptiveName}",
  "archetype": "{PROCESSING|INTELLIGENCE|DATA_TRANSFORMATION|ORCHESTRATION}",
  "entry": "EngineContract with {what}",
  "purpose": "{what AF-1 generates}",
  "distinctFrom": ["{similar task types}"],
  "factoryDependencies": {
    "F{N}": "I{Interface} — {fabric}"
  },
  "afConfiguration": {
    "af1_genesis": "{what to generate}",
    "af3_promptLibrary": "{which prompts to retrieve}",
    "af4_ragContext": "{what patterns to search for}",
    "af6_review": "{what to check}",
    "af7_compliance": "{DNA + principle checks}",
    "af9_judge": "{scoring criteria + threshold}",
    "af11_feedback": "{what to capture}"
  },
  "ironRules": ["{non-negotiable constraints}"],
  "qualityGates": ["{specific test commands}"],
  "positiveExample": "{reference to correct output}",
  "negativeExample": "{reference to incorrect output}"
}
```

## Prompt Seeding Pattern (Phase 0)

For each task type, seed these 4 prompts via P22 standard:

```python
# {domain}.prompts.py
PROMPTS = [
    {
        "promptId": "{domain}::T{N}::genesis",
        "taskType": "T{N}",
        "role": "genesis",
        "content": "Generate a Python class that implements...",
        "version": 1
    },
    {
        "promptId": "{domain}::T{N}::review",
        "taskType": "T{N}",
        "role": "review",
        "content": "Review this Python code for...",
        "version": 1
    },
    {
        "promptId": "{domain}::T{N}::compliance",
        "taskType": "T{N}",
        "role": "compliance",
        "content": "Check DNA compliance: dict not typed models...",
        "version": 1
    },
    {
        "promptId": "{domain}::T{N}::judge",
        "taskType": "T{N}",
        "role": "judge",
        "content": "Score 0-100 on 5 dimensions...",
        "version": 1
    }
]
```

## Anti-Patterns

| Anti-Pattern | What Goes Wrong |
|-------------|----------------|
| Claude Code writes the service code directly | Bypasses AF pipeline — no judgment, no training data, no improvement |
| Skip Phase 0, try to generate without contracts | AF-1 has no specification — generates garbage |
| Hardcode prompts in AF-1 instead of seeding to ES | No PromptOps improvement possible (P3 violation) |
| Skip AF-9 judgment on self-generated code | No quality signal — can't improve, can't train local models |
| Use generated code before Luba reviews (Phase 2 → Phase 4 skip) | Self-referential training data from unvalidated code |

## Checklist — Run Before Every Self-Implementation Session

- [ ] Infrastructure ready? (ES running, indices created)
- [ ] EngineContracts written and seeded? (Phase 0 complete)
- [ ] Initial prompts seeded to xiigen-prompts? (P22 standard)
- [ ] POSITIVE-NEGATIVE-EXAMPLES available for AF-7/AF-9?
- [ ] RAG patterns seeded for AF-4 to search?
- [ ] FlowOrchestrator can accept contract submission?
- [ ] AF-9 threshold set? (default: 70 for first round)
- [ ] PromptOps connected? (FLOW-30 can receive AF-9 verdicts)
- [ ] Training data pipeline connected? (P8, if localModelEnabled)
- [ ] Luba approval gate defined? (when to escalate vs auto-improve)
