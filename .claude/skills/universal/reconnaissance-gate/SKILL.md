---
title: Reconnaissance Gate
purpose: Inspect the current state before planning edits or making review judgments.
source-boundary: Universal process guidance only. Excludes source architecture, algorithms, design patterns, training, DPO, source domains, source classes, and source-specific paths.
status: active
---

# Reconnaissance Gate

## Purpose
Use this to prevent wrong-file edits, stale assumptions, and accidental overwrites.

## When to Use
Invoke before modifying files, before reviewing unfamiliar code, and after discovering unexpected repository state.

## Actions
- List the files and directories relevant to the task.
- Read governing docs and nearby examples before editing.
- Check whether target files already exist and whether they appear user-modified.
- Identify active constraints: allowed paths, excluded areas, generated files, or concurrent agents.
- Summarize what was learned before choosing edits.

## XIIGen Adaptation
- When exploring XIIGen code, inspect interfaces and local patterns before introducing services, APIs, search behavior, providers, or injection-token changes.
- When exploring documentation-only skills, verify the target docs tree and index state before creating files.

## Avoid
- Do not edit based only on file names or memory.
- Do not overwrite unrelated changes.
- Do not import source architecture, algorithms, design patterns, training, DPO, source domains, source classes, or source-specific paths.

## Completion Signal
- The relevant current state is known well enough to edit or review without guessing.

---

## G08 universal addition from llm_mvp_core — evidence threshold, layer tags, RECON REPORT

The actions above are a checklist. The core `reconnaissance-gate` standard makes recon a
measurable *evidence threshold by session type* with a written RECON REPORT, plus
evidence-layer tags so a claim's authority is never confused with its provenance. This is
the home for the universal version (it extends, not replaces, the rich mvp
`planning--reconnaissance-gate-SKILL.md` and `infrastructure-discovery`).

### 1. Evidence threshold by session type (minimum before any synthesis)

```
EXECUTOR     : read every file you will edit IN FULL + the failing test that defines done.
PLANNING     : entry-point map + 1 grep count per claim + verbatim excerpt of each cited rule.
REVIEW       : the artifact under review + the literal gate text it must satisfy, side by side.
ARCHITECT    : governing docs + nearby precedent + the exact prior decision being extended.
```

Synthesis before the threshold is met is the failure this gate exists to stop. "I think the
file does X" with no read is not recon — it is a guess wearing recon's name.

### 2. Evidence-layer tags (provenance ≠ authority)

Tag every fact you carry forward so a design intention is never quoted as if it were shipped
behavior:

```
DESIGN_DOC      — a plan/spec/manifest says it should be so (intent, not proof)
IMPLEMENTATION  — actual code:  *.ts / *.tsx (server/client) or *.py (rag sidecar)
TEST            — *.spec.ts (Jest) or *.e2e.ts (Playwright) or test_*.py (pytest)
RECONCILIATION  — a STATE/registry/index file asserting current status
```

A `DESIGN_DOC` claim may NOT be reported as an `IMPLEMENTATION` fact. When they disagree,
code (`IMPLEMENTATION`/`TEST`) wins and the gap is itself a finding.

### 3. RECON REPORT — write it before choosing edits

```
RECON REPORT
  task:            <what this session will edit/review>
  files_read:      <exact paths read IN FULL, with line counts>
  grep_counts:     <command → count, for each claim>
  verbatim:        <short exact excerpts of governing rules cited>
  active_limits:   <allowed paths / excluded areas / generated files / concurrent agents>
  unknowns:        <what is still unread → CONTEXT_INSUFFICIENT if it blocks the edit>
  learned:         <one-paragraph summary of current state before any edit>
```

### 4. Subagent-firewall sentinels (mvp)

When recon runs under a sub-agent-only / architect-only instruction: recon is read-only
verification *after* a returned packet, not a license for parallel local research while a
sub-agent runs. Record `git_authority_seen` and that no edit was made during the wait.

### Note-only (NOT ported — stays in G12, R5)

The High-Risk Recon Library Gate's ML-arbiter coupling (trainable-unit recon for
DPO/checkpoint authority) stays in `llm_mvp_core`; here recon stops at the contract/manifest
boundary to the shared model.
