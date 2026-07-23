# DOCUMENT AUTHORITY MAP — XIIGen v2.0.0
## Canonical homes for all overhaul governance content
## Version: v2.0.0 | Date: 2026-03-25
## Source: XIIGen Skills Overhaul Gap A — established in XIIGEN-GOLDEN-RULE.md

---

## PURPOSE

Every governance rule, canonical definition, and authoritative template has
exactly ONE canonical home. Cross-references to that home are permitted;
duplicating the canonical content is not. When content appears in two places
and they diverge, the canonical home wins.

This document is the index of canonical homes. It is itself a canonical document.
Its canonical home is: `FLOW-DESIGN-SKILL-INDEX.md` (appended at end of index).

---

## CANONICAL HOME TABLE

| Content | Canonical home | Cross-reference permitted in |
|---------|---------------|------------------------------|
| Golden Rule (fix instance + structural guard) | `XIIGEN-GOLDEN-RULE.md` | All sessions — reference by name |
| Mission principles M1-M5 | `PATCH--xiigen-core-principles-M1-M5-P17-P22.md` → applied to `planning--xiigen-core-principles-SKILL.md` | Inline quotes in session files (FC-28) |
| Implementation principles P1-P22 | Same as M1-M5 above | Same |
| FC-31 detection command | `XIIGEN-GOLDEN-RULE.md` (Gap C section) | `XIIGEN-SESSION-START-PROMPT-v2.md` must match exactly (C-8) |
| Session type classification | `HOW-TO-USE-SKILLS-v2.0.0.md` | Session start prompt summary |
| Skill activation triggers | `HOW-TO-USE-SKILLS-v2.0.0.md` | AGENTS.md (load_order only) |
| Planning pipeline step order | `HOW-TO-USE-SKILLS-v2.0.0.md` + `FLOW-DESIGN-SKILL-INDEX.md` | Both are authoritative; must stay in sync |
| Arbiter panel minimum by archetype | `planning--arbiter-panel-design-SKILL.md` (SK-442) | Inlined in SESSION-N.md files that configure arbiters (FC-28) |
| Escalation orchestrator rules | `planning--escalation-orchestrator-SKILL.md` (SK-446) | SK-442 references by name |
| Principles arbiter isolation rule | `planning--principles-arbiter-SKILL.md` (SK-444) | arbiterConfig template + SK-442 |
| DPO triple schema (P17+P18 fields) | `code-execution--learning-signal-capture-SKILL.md` (v2.0.0) | Inlined in SESSION-N.md generation sessions (FC-28); K-2 note in planning skills |
| DPO VALIDITY GATE | `code-execution--learning-signal-capture-SKILL.md` | `code-execution--flow-design-check-catalog.md` LEARNING-003/004 |
| Curriculum tier table | `code-execution--learning-signal-capture-SKILL.md` | Inlined in SESSION-N.md Phase B files (FC-28) |
| FREEDOM config pattern (D-EXT-009) | `PATCH--judge-model-freedom-config.md` | Any skill noting "use FREEDOM config" |
| V-gate definitions (V1-V12) | `code-execution--flow-implementation-guide-SKILL.md` | SESSION-N.md gate steps (inline, not referenced) |
| Named check IDs (LEARNING-xxx, HEALTH-xxx, etc.) | `code-execution--flow-design-check-catalog.md` | topology contracts via check ID string |
| ENGINE PROGRESS template | `session-output--mission-progress-SKILL.md` (SK-445) | PHASE-COMPLETE-N.md files (inline copy) |
| Session file self-containment checks (7) | `planning--session-file-authoring-SKILL.md` (SK-443) | `HOW-TO-USE-SKILLS-v2.0.0.md` SESSION FILE FORMAT GATE |
| FOUND-ISSUE PROTOCOL | `planning--session-file-authoring-SKILL.md` (SK-443) + `HOW-TO-USE-SKILLS-v2.0.0.md` | SESSION-N.md files (inlined per FC-28) |
| PHASE-COMPLETE template | `code-execution--flow-restructure-SKILL.md` | All PHASE-COMPLETE-N.md files (inline copy) |
| Skill index (SK numbers + files) | `.claude/skills/SKILL-INDEX.md` (codebase) | `FLOW-DESIGN-SKILL-INDEX.md` (this overhaul — must stay in sync via S7) |
| Patch apply order | `INTEGRATION-INSTRUCTIONS.md` | `FLOW-DESIGN-SKILL-INDEX.md` patch table |
| Gap table (overhaul rationale) | `FLOW-DESIGN-SKILL-INDEX.md` | Master plan + session start |
| SK uniqueness guard command | `XIIGEN-GOLDEN-RULE.md` (C-6) + `HOW-TO-USE-SKILLS-v2.0.0.md` | S7 verification checklist |

---

## CONFLICT RESOLUTION RULE

When two documents contain different versions of the same content:
1. Identify the canonical home from the table above
2. The canonical home's version is correct
3. The other document must be updated to match (FC-10 propagation sweep)
4. Document the divergence in CARRY-FORWARD-ISSUES.md with a session owner

---

## WHAT IS NOT IN THIS MAP

- Flow contracts (canonical home = their topology file in `contracts/topologies/`)
- Session files SESSION-N.md (no canonical home — each is self-contained by definition)
- Architecture decisions (canonical home = `FLOW-XX-ARCHITECTURE-DECISIONS.json`)
- Codebase source files (canonical home = codebase itself)
