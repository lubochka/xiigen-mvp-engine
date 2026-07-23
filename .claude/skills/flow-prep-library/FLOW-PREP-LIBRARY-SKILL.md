---
name: flow-prep-library
version: "1.0.0"
priority: MANDATORY
load_order: 0
updated: "2026-04-20"
contexts: ["web-session", "claude-code"]
---

# Flow Preparation Library — Master Entry Point

## What this library does

Translates a flow's functional specification into the complete set of session
documentation files (`docs/sessions/FLOW-XX/`) that Claude Code needs to
integrate, generate, and operate the flow in the XIIGen engine.

**50 guidance files** (GUIDE-B01..B50), each producing exactly one output
file type. Apply this library to any new flow specification to get proper
List B documentation for that flow.

## Library structure

```
flow-prep-library/
  FLOW-PREP-LIBRARY-SKILL.md       ← this file (entry point)
  SKILL-INDEX.md                   ← full index of all files
  prompt-to-claude.md              ← copy-paste prompt for applying the library

  guidance/
    GUIDE-B01..B50.md              ← one file per List B output type
    GUIDE-B46..B50 (Phase 7)       ← role-enriched, UI/UX-aware files

  ui-ux/
    flow-ui-examination-protocol-SKILL.md    (SK-542)
    planning--product-design-context-SKILL.md (SK-540)
    planning--screen-craft-audit-SKILL.md    (SK-541)
    planning--business-flows-registry.md     (reference lookup)

  governance/
    XIIGEN-FLOW-DOCUMENT-AUTHORING-GUIDE-v1.16.md
    XIIGEN-DESIGN-ARCHITECT-SESSION-GUIDE-v1.8.md

  library-meta/
    LIBRARY-GENERATION-ORDER.md
    FLOW-PREP-LIBRARY-README.md
    FLOW-PREP-LIBRARY-FINAL-INDEX.md
    UIUX-INTEGRATION-ANALYSIS.md
```

## How to load this library

### For a new flow preparation session:

1. Read `prompt-to-claude.md` — contains the complete copy-paste prompt
2. Read `FLOW-PREP-LIBRARY-README.md` — explains generation order, clusters,
   failure patterns
3. For Phase 7 (role-enriched files): load `flow-ui-examination-protocol-SKILL.md`
   (SK-542) first, then `planning--product-design-context-SKILL.md` (SK-540)

### For a React pages session:

Load order is strict:
```
SK-542 (5.3) → SK-540 (5.4) → SK-539 (5.5) → [implementation] → SK-541 (Phase 7)
```

### Quick skill trigger reference:

| Trigger | Load |
|---------|------|
| "generate flow docs for FLOW-XX" | This library + prompt-to-claude.md |
| "writing first React page for a flow" | SK-542 → SK-540 |
| "Phase 7 UX review" | SK-541 |
| "what grammar does FLOW-XX use?" | planning--business-flows-registry.md |
| "examine existing screen" | SK-542 (orchestrator) |
| "FLOW-04 / FLOW-09 / FLOW-34 UI" | ⛔ CFI-12 HALT — await Luba spec resolution |

## Generation order constraint

```
Phase 7 MUST start with B50, then B46 → B47 → B48 → B45 → B49.
B50 (role-screen-matrix) defines which roles exist.
B46/B47/B48 depend on B50's role definitions.
Generating B46 before B50 = C35 violation.
```

## Validation status

50/50 guidance files SELF-SUFFICIENT against FLOW-48 (Cluster 1 universal,
all 10 personas). Validated across Clusters 1-5 + EXEMPT. List A coverage:
897/897 files.
