---
name: naming-conventions-enforcer
sk_number: SK-447
version: "1.0.0"
priority: HIGH
load_order: -1
category: planning
author: luba
updated: "2026-03-25"
contexts: ["web-session", "claude-code"]
description: >
  Applies the universal naming-conventions skill to XIIGen communication.
  Trigger: any moment a letter+number identifier (T583, SK-442, G3A, FC-31)
  would appear as the primary label in output to the architect.
  Also surfaces architectural implications hidden inside code-level findings.
triggers:
  - "naming"
  - "T583"
  - "SK-"
  - "G3A"
  - "FC-"
  - "session output"
  - "step 8"
  - "naming conventions enforcer"
  - "before presenting to architect"
---

# Naming Conventions Enforcer (SK-447) v1.0

## THIS SKILL EXTENDS naming-conventions

The universal naming-conventions skill applies everywhere.
This skill applies it specifically to one pattern that recurs in XIIGen:
**letter+number identifiers used as primary communication to the architect**.

From naming-conventions core principle:
> "Names should reveal intent and domain, not implementation."
> "Names are for humans, not compilers."

`T583`, `SK-442`, `G3A`, `FC-31` are registry keys. They reveal nothing about
intent. They are for the artifact registry, not for the architect.

---

## THE TRIGGER

**Whenever output contains a letter+number identifier as the primary label**,
apply naming-conventions before delivering.

This includes:
- `T[number]` — task registry entries
- `SK-[number]` — skill registry entries
- `G[number]` or `SESSION-G[x]` — gap-fix session codes
- `FC-[number]` — failure class checks
- `FLOW-[number]` — flow registry entries (use the flow's name)
- CamelCase type names as primary identifiers (`LoopInput`, `NodeHandlerContext`)

---

## HOW TO APPLY

Directly from naming-conventions:

> **Variables pattern:** Descriptive nouns — domain language, not data structures.
> **Functions pattern:** Verb + noun — describe the action.
> **Classes pattern:** Singular noun — domain concept, not technical role.

For XIIGen identifiers, the equivalent:

| Registry key | Apply naming-conventions → |
|---|---|
| `T583` | what the task **does**: "the context arbiter implementation" |
| `SK-442` | what the skill **governs**: "the arbiter panel design rules" |
| `SESSION-G3A` | what the session **fixes**: "the session that wires model config to FREEDOM config" |
| `FC-31` | what the check **prevents**: "the hardcoded model name check" |
| `LoopInput` | the object's role: "the arbitration loop's configuration contract" |
| `GenericNodeExecutor` | what it does: "the engine component that runs each node in sequence" |
| `FreedomConfigManager` | what it does: "the component that reads admin-configurable settings" |

The registry key moves to parenthetical — `(T583)`, `(SK-442)` — after the human name.

---

## THE ARCHITECTURAL IMPLICATION EXTENSION

naming-conventions says:
> "Naming forces design thinking. If you can't name it, you don't understand what it does."

This extension adds: **if a finding is hard to name, it is probably hiding an architectural implication.**

When a finding sounds like a code correction (`runId not in LoopInput`) but is
actually a system fact (`the arbitration loop has been running without knowing
which run it belongs to`), the code-level name is obscuring the architectural significance.

### The test

Before delivering any finding that involves adding a field to an interface,
changing which component owns something, fixing a scope or ownership mismatch,
or revealing that a component was operating without context it needed — ask:

**Can I name this in one sentence using domain language, not code language?**

If the domain-language name is significantly different from the code-language name:
that gap = an architectural implication that must be stated.

### Format

```
ARCHITECTURAL IMPLICATION: [domain-language description of what the system
was doing wrong and what it means going forward]

FIX: [code-level change, registry key parenthetical]
```

**Wrong:**
```
runId not in LoopInput in T583 — fixed: add readonly runId: string
```

**Correct:**
```
ARCHITECTURAL IMPLICATION: The arbitration loop has been operating without
knowing which run it belongs to. The engine component that sequences nodes
generates run identity but does not share it downstream. Any feature that
needs to scope its results to a specific run — training data, pool entries,
shadow runs — must receive the run identifier explicitly. This is a context
seam that will recur every time a new run-scoped feature is added.

FIX: Add run identifier to the arbitration loop's configuration contract.
The flow runner generates this identifier and passes it in.
(LoopInput.runId — fixed in the context arbiter session, T583 Step 5d)
```

---

## WHAT CHANGED WHEN THIS SKILL IS ACTIVE

**Before:** Architect receives a bullet point with `T583` and a one-line fix.
Must translate the code change, assess scope, decide if significant.

**After:** Architect receives a domain-language description of what was wrong
at the system level, plus the code fix labeled parenthetically. Whether this
requires further architectural work is immediately visible.

---

## FC-32 — ARCHITECTURAL IMPLICATION SURFACE

Add to `planning--plan-review-SKILL.md` operative Gate A:

```
FC-32: Architectural Implication Surface
For any ISSUE INVENTORY entry that adds a field to an interface, changes
component ownership, or fixes a scope/ownership problem:
  □ Is there an ARCHITECTURAL IMPLICATION statement in domain language?
  □ Does it describe the impact of the wrong behavior (not just the fix)?
  □ Is the registry key (Txxx, SK-xxx) parenthetical, not primary?

FAIL if: any interface-field or scope-change finding is delivered with a
registry key as the primary identifier and no ARCHITECTURAL IMPLICATION.
```

---

## WHAT THIS SKILL PREVENTS

- Architect reviews session findings without visibility into which ones reveal system-level gaps
- Infrastructure adaptation decisions made implicitly inside code corrections without architect input
- Silent feature degradation delivered as "works" because the scope mismatch is named as a field fix
- The "looked like a minor fix" failure mode where a one-line interface change reflects a weeks-old architectural omission that will require further adaptation later

---

## INTEGRATION

```
Extends:    naming-conventions (universal — load that skill first)
Load order: -1 (applies to all output, before any ⛔ STOP)
Enforced:   FC-32 in planning--plan-review-SKILL.md
Blast radius on addition:
  □ HOW-TO-USE-SKILLS.md — add SK-447 to triggers table + prevents table
  □ FLOW-DESIGN-SKILL-INDEX.md — fill step ⑧ entry (was placeholder)
  □ planning--plan-review-SKILL.md — add FC-32 to operative Gate A checks
```
