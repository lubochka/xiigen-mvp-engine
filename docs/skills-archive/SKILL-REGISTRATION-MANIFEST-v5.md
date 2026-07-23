# XIIGEN PLANNING SKILLS — REGISTRATION MANIFEST v5
## Date: 2026-03-22 — adds SK-430, SK-431, SK-432; upgrades SK-418 v1.3, SK-419 v1.1
## SK-416–429, SK-434–436: register in FLOW-35 Phase A / Phase I (unchanged)
## SK-430: register in FLOW-00.1 Phase D
## SK-431, SK-432: register in FLOW-00.2 Phase B
## Feature Registry skills: SK-431–434 provisional (verify at FLOW-36 Phase A)

---

## ⚠️ NAMESPACE WARNING

```
FT-001+ is RESERVED for Feature Registry artifacts (D-FT-1).
SK-430 = NamingConventionsEnforcer (registered FLOW-00.1).
SK-431 = StackCouplingAuditor (registered FLOW-00.2).
SK-432 = HybridPromptBuilder (registered FLOW-00.2).
Feature Registry skills shift to SK-433+ — verify at FLOW-36 Phase A.
```

---

## NEW IN v5: SK-430, SK-431, SK-432

### SK-430 NamingConventionsEnforcer
```python
{
  "id": "SK-430",
  "name": "NamingConventionsEnforcer",
  "layer": "planning",
  "path": ".claude/skills/SK-430/SKILL.md",
  "requires": ["SK-416"],
  "complements": ["SK-418", "SK-423", "SK-429"],
  "weight": 0.95,
  "triggerKeywords": [
    "naming review", "file name", "does this naming comply",
    "flowName", "flow_name", "engine-contracts", "engine/flows",
    "jira comment", "domain name", "lint:naming"
  ]
}
# Edges:
SK-416 → SK-430
SK-430 → SK-423
SK-418 ← SK-430  (ordering: naming runs before completeness check output)
SK-429 ← SK-430  (Jira template must satisfy Rule 5)
# Register in: FLOW-00.1 Phase D
```

### SK-431 StackCouplingAuditor
```python
{
  "id": "SK-431",
  "name": "StackCouplingAuditor",
  "layer": "planning",
  "path": ".claude/skills/SK-431/SKILL.md",
  "requires": ["SK-416"],
  "complements": ["SK-418", "SK-419", "SK-420", "SK-432"],
  "weight": 0.90,
  "triggerKeywords": [
    "stack audit", "stack coupling", "CONCEPT_NEUTRAL", "IMPL_VARIES",
    "STACK_COUPLED", "INCOMPATIBLE", "does this work on Angular",
    "does this work on Python", "does this work on WordPress",
    "stateNotes", "propagationRisk", "stateHolderType",
    "stackCategory", "StackKey", "neutralConcepts"
  ]
}
# Edges:
SK-416 → SK-431
SK-431 → SK-418  (audit before completeness — V29/V30/V31)
SK-431 → SK-432  (audit enables builder)
SK-431 → SK-419  (coupling aware of event neutrality)
# Register in: FLOW-00.2 Phase B
```

### SK-432 HybridPromptBuilder
```python
{
  "id": "SK-432",
  "name": "HybridPromptBuilder",
  "layer": "planning",
  "path": ".claude/skills/SK-432/SKILL.md",
  "requires": ["SK-416", "SK-431"],
  "complements": ["SK-419"],
  "weight": 0.85,
  "triggerKeywords": [
    "genesis prompt", "hybrid prompt", "convert prompt",
    "neutral iron rules", "Section 1", "Section 4",
    "stackImplementations", "generation frame", "Pass 7"
  ]
}
# Edges:
SK-431 → SK-432
SK-432 → SK-419  (hybrid prompt building uses event contract skill)
# Register in: FLOW-00.2 Phase B
```

---

## UPDATED SKILLS IN v5

### SK-418 → v1.3 (upgrade from v1.2)
Archive `SKILL.md` as `SKILL-v1_2-archived.md` before installing v1.3.
New items: V29 (stackCoupling on all task types), V30 (INCOMPATIBLE flags),
V31 (stateNotes on client nodes with reactive state).
Checklist: 28 → 31 items.

### SK-419 → v1.1 (minor update)
Add stack-neutral event contract check: verify CONSUMES/EMITS/BOUNDARY
contain no TypeScript types, no HTTP endpoints, no framework references.
Archive old version before installing.

---

## FULL SKILL GRAPH (v5)

```
Planning layer:
  SK-416 → SK-417, SK-418, SK-419, SK-423, SK-424, SK-430, SK-431
  SK-419 → SK-420 → SK-421
  SK-418 ← SK-419, SK-420, SK-421, SK-430, SK-431, SK-434, SK-436
  SK-430 → SK-423
  SK-431 → SK-432 → SK-419
  SK-431 → SK-418  (ordering edge)
  SK-429 ← SK-430  (Jira template constraint)
  SK-424 → SK-435
  SK-422 → SK-423, SK-424, SK-435

Meta layer:
  SK-422 → SK-424, SK-423
  SK-425 → SK-422

Session output layer:
  SK-427 → SK-428 → SK-429
  SK-427 → SK-426
```

---

## REGISTRATION ORDER

```
FLOW-35 Phase A:  SK-416–425, SK-434–436
FLOW-35 Phase I:  SK-426–429
FLOW-00.1 Phase D: SK-430
FLOW-00.2 Phase B: SK-431, SK-432
FLOW-36 Phase A:  SK-433+ (Feature Registry skills — verify numbers)
```

---

## AGENTS.md ADDITION (append after FLOW-00.2 Phase B)

```markdown
## Stack Coupling Skills (SK-431, SK-432) — registered in FLOW-00.2

**SK-431 StackCouplingAuditor** — step 9 of the 9-step planning pipeline.
Classifies every element as CONCEPT_NEUTRAL / IMPL_VARIES / STACK_COUPLED / INCOMPATIBLE.
Run for ALL flows — even single-stack plans produce minimal annotations.
Fills V29, V30, V31 of SK-418 v1.3 checklist.
Trigger: any new genesis prompt, any planning session after FLOW-00.2.

**SK-432 HybridPromptBuilder** — Option C hybrid genesis prompt structure.
Section 1 neutralIronRules[]: XIIGen vocab only, no framework names.
Section 4 stackImplementations: per "{stackType}:{side}" key.
Trigger: Pass 7 of any flow reexamination, "genesis prompt", "convert prompt".

Key invariant enforced by SK-432:
"Can a developer who knows only the business domain (no specific tech)
read every rule in Section 1 and know exactly what to enforce?"
If NO → the sentence belongs in Section 4, not Section 1.

## Naming Conventions Skill (SK-430) — registered in FLOW-00.1
[existing AGENTS.md entry — unchanged]
```
