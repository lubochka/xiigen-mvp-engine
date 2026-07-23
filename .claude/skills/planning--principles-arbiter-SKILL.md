---
name: principles-arbiter
sk_number: SK-444
version: "1.0.0"
priority: CRITICAL
load_order: 0
category: planning
author: luba
updated: "2026-03-25"
contexts: ["web-session", "claude-code"]
description: >
  Operating manual for the Key Principles Arbiter — the mandatory, isolated member
  of every arbiter panel whose sole expertise is M1-M5 + P1-P22 + DNA-1..9.
  Covers what it receives, what it explicitly does NOT receive, how its context
  grows as new principles are added, and how to maintain it.
triggers:
  - "principles arbiter"
  - "key principles"
  - "principles enforcement"
  - "P20"
  - "isolated arbiter"
  - "principles context"
  - "update principles arbiter"
  - "add new principle"
---

# Key Principles Arbiter Skill (SK-444) v1.0

## WHY THIS ARBITER EXISTS

AI models systematically forget principles that were stated earlier in their context.
A genesis prompt that says "DNA-8: store before enqueue" will sometimes produce code
that enqueues before storing. The Business Logic Arbiter will not catch this — not its
domain. The Security Arbiter may miss it — it is a consistency issue, not a
vulnerability. Only an arbiter whose ENTIRE context is the principles document, and
whose ONLY task is checking compliance, reliably catches violations.

This is P20. The Key Principles Arbiter is the structural solution to the meta-problem:
principles exist but aren't enforced because the evaluating AI forgot them.

---

## THE ISOLATION RULE

**The Key Principles Arbiter receives ONLY:**
1. Full text of M1-M5 (mission principles)
2. Full text of P1-P22 (implementation principles)
3. Full text of DNA-1 through DNA-9 with concrete violation examples
4. The fabric interface registry (what IScopedMemoryService replaces, etc.)
5. The generated code being evaluated

**The Key Principles Arbiter does NOT receive:**
- Iron rules for this task type (that is Business Logic Arbiter's domain)
- RAG-retrieved patterns (that is Skills Arbiter's domain)
- Security vulnerability patterns (that is Security Arbiter's domain)
- Task type name, archetype, or flow ID
- Any other arbiter's verdict
- The genesis prompt text (that is Prompts Arbiter's domain)

**Why the isolation is mandatory:**
If the Principles Arbiter knows it is evaluating T47 (ROUTING archetype), it may
implicitly assume DNA-5 is less critical for registration flows. If it knows the
task type is SCHEDULED, it may focus on SLA patterns and miss P3 violations. The
isolation removes these cognitive biases. The arbiter has one context, one task.

**Any addition to the context package is a contamination that reduces reliability.**

---

## VERDICT FORMAT

```json
{
  "verdictClass": "BLOCK_OR_PASS",
  "violations": [
    {
      "principle": "DNA-3",
      "clause": "No throws in business logic — return DataProcessResult.failure()",
      "evidence": "throw new Error('Registration failed') at line 47",
      "severity": "BLOCK"
    },
    {
      "principle": "P3",
      "clause": "Fabric-first: service code never imports provider SDKs",
      "evidence": "import Redis from 'ioredis' at line 3",
      "severity": "BLOCK"
    }
  ],
  "passed": [
    "M1", "M2", "M3", "M4", "M5",
    "DNA-1", "DNA-2", "DNA-3", "DNA-4", "DNA-5",
    "DNA-6", "DNA-7", "DNA-8", "DNA-9",
    "P1", "P2", "P4", "P5", "P6", "P7", "P8",
    "P9", "P10", "P11", "P12", "P13", "P14",
    "P15", "P16", "P17", "P18", "P19", "P20", "P21", "P22"
  ]
}
```

**The passed list MUST include every principle checked.** Not just violations.
Not a summary count. Every principle, explicitly listed as passed or violated.
A missing entry means "not checked" — which is the same problem as "forgotten."

**Verdict class is always BLOCK_OR_PASS.** Never ADVISORY. If a principle is
violated: BLOCK. If all pass: PASS. There is no middle ground.

---

## SELF-REINFORCEMENT RULE

The Principles Arbiter checks whether the current run's contract includes a
Principles Arbiter entry in `arbiterConfig.evaluatorArbiters`. This is how P17
and P20 enforce themselves:

```json
// In the principles check, the arbiter evaluates:
{
  "principle": "P17",
  "clause": "Every AI station that makes a quality-affecting decision runs a panel...",
  "check": "contract.arbiterConfig.evaluatorArbiters.key_principles exists AND isolated: true",
  "evidence": "arbiterConfig.evaluatorArbiters.key_principles present with isolated: true",
  "result": "PASS"
}
```

If `key_principles` entry is absent from `arbiterConfig`: BLOCK — P20 violated.
If `key_principles` entry exists but `isolated: true` is missing: BLOCK — P20 violated.

---

## GROWTH RULE

When a new principle is added to the principles document (P23, M6, etc.):

1. The next run of the Principles Arbiter will include it automatically — the context
   package is loaded fresh at runtime from the current principles document
2. No code change is required
3. The `passed` list in the verdict will include the new principle on the next run
4. If the new principle catches a violation that previous runs missed: this is expected
   behavior — the arbiter is improving with the principles document

**This is the compound return:** Every principle added makes the Principles Arbiter
more capable on the next run without any additional wiring.

---

## FIXTURE FILE FORMAT

The Principles Arbiter's prompt lives at:
`fixtures/prompts/principles-arbiter--v1.0.0.prompt.json`

```json
{
  "arbiterId": "key-principles",
  "version": "1.0.0",
  "role": "You are the Key Principles Arbiter. Your sole task is to verify that
           the provided code complies with every XIIGen mission and implementation
           principle listed below. You have no other context about the task type,
           archetype, or business domain. You check only principles.",
  "contextInstructions": "Load at runtime: full M1-M5 text + P1-P22 text + DNA-1..9 with examples",
  "task": "For each principle: state explicitly whether the code PASSES or VIOLATES it.
           For violations: cite the specific clause and the exact code evidence.
           List every principle in your response — not just violations.
           Do not comment on iron rules, RAG patterns, or security vulnerabilities
           unless they are P-principle violations.",
  "outputFormat": {
    "verdictClass": "BLOCK_OR_PASS",
    "violations": [{"principle": "...", "clause": "...", "evidence": "...", "severity": "BLOCK"}],
    "passed": ["...every passing principle..."]
  },
  "isolationNote": "You have received only the principles document and the code.
                   This is intentional. Do not request additional context."
}
```

---

## MAINTENANCE PROTOCOL

When updating principles (adding P23, revising P18, etc.):

1. Update the principles document (`PATCH--xiigen-core-principles-*.md`)
2. Apply the patch to `planning--xiigen-core-principles-SKILL.md`
3. The Principles Arbiter fixture does NOT need to be updated — it loads the
   principles at runtime
4. Run one verification pass: ask the Principles Arbiter to check a known-clean
   code file and verify the new principle appears in `passed[]`
5. If the new principle catches violations in existing code: this is correct behavior.
   Do not suppress it. Fix the violations.

**Do NOT:**
- Hardcode the principles list in the fixture (defeats the growth rule)
- Summarize or abbreviate the principles for "efficiency" (loses the detail needed
  to catch violations)
- Add domain context to the fixture "to help it evaluate better" (breaks isolation)

---

## WHAT THIS SKILL PREVENTS

- Principles stated in planning sessions forgotten by Claude Code during execution
- P3 (fabric-first) violations passing review because the judge was focused on business logic
- DNA-8 violations scoring 0.92 overall because iron rules scored 0.99
- New principles added but Principles Arbiter not refreshed (growth rule prevents this)
- Principles Arbiter context contaminated with domain information (isolation rule)
- P17/P20 violations going undetected (self-reinforcement rule catches them)
