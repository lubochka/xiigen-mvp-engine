---
name: documentation-sync-skill
sk_number: SK-422
version: "1.0.0"
load_order: null
priority: OPTIONAL
author: luba
updated: "2026-03-18"
description: >
  Session-end canonical documentation sync for the XIIGen engine. Maps TypeScript
  file changes to the canonical docs that must be updated. Prevents the failure mode
  where code changes are committed but ENGINE_ARCHITECTURE_MERGED, TASK_TYPES_CATALOG_MERGED,
  or AGENTS.md are left stale. Invoked at session end — not at session start.
---

# Documentation Sync Skill v1.0

## When to Invoke

At the **end** of any session where TypeScript files were modified. Specifically:
- After any Phase 11 code modification before the final commit
- After adding a new factory, task type, or AF station
- After adding or removing a fabric provider
- After any engine contract change

**Do NOT invoke mid-session.** Sync at the end once — not after every file.

---

## Maintenance Rules: File → Canonical Docs

| File Changed | Docs to Sync | Specific Update |
|-------------|-------------|----------------|
| `server/src/engine-contracts/*.ts` | ENGINE_ARCHITECTURE_MERGED, AGENTS.md | Update factory list, contract shape, artifact numbers |
| `server/src/factories/*.ts` | ENGINE_ARCHITECTURE_MERGED, TASK_TYPES_CATALOG_MERGED | Update factory ID, task type, family mapping |
| `server/src/af-stations/*.ts` | ENGINE_ARCHITECTURE_MERGED | Update station responsibilities, input/output spec |
| `server/src/fabrics/**/*.ts` | ENGINE_ARCHITECTURE_MERGED | Update provider list, fabric type map |
| `server/src/fabrics/*/provider-registry.ts` | ENGINE_ARCHITECTURE_MERGED | Update provider key list (case-sensitive) |
| New task type (T-XXX) registered | TASK_TYPES_CATALOG_MERGED, AGENTS.md | Add entry: T-XXX name, factory ID, flow(s) |
| New factory ID (F-XXXX) registered | ENGINE_ARCHITECTURE_MERGED, AGENTS.md | Add entry with fabricType, taskTypes[], bfaRegistration |
| `AGENTS.md` artifact number section | STATE-Pn.json reservedThisSession | Confirm numbers match what was committed |
| `.agents/skills/*/SKILL.md` added or changed | `.agents` SKILL index **AND** the `.claude/skills/` mirror **AND** `.claude/skills/SKILL-INDEX.md` | Both catalogs must reflect the same skill — see "Two-catalog sync" below |
| Public `interface` / DI token / exported DTO changed | the single interfaces/events source-of-truth doc | One canonical contract doc — no second divergent list |

---

## Two-Catalog Sync (mvp-specific, binding)

mvp ships **two** skill catalogs — `.agents/skills/` (~65) and `.claude/skills/`
(~358). They are parallel projections of the same skill set. At session end, a
skill that was added or changed in one catalog MUST be reflected in the other (or
its single-catalog scope stated explicitly):

```
☐ For every SKILL.md added/changed this session:
    ☐ present & current in .agents/skills/   (+ .agents index/AGENTS.md)
    ☐ present & current in .claude/skills/   (+ row in .claude/skills/SKILL-INDEX.md), OR
      a one-line note recording it is intentionally single-catalog and why
☐ Interfaces/events have ONE source of truth — verify no second list drifted
  (a contract added to a module README but missing from the canonical interfaces
   doc is "NOT synced").
```

A skill present in only one catalog with no recorded reason is catalog drift — the
same defect class as a stale doc count. This sync is part of "synced", not a
Phase-12 deferral.

---

## Sync Checklist (Session End)

```
☐ npm run build → 0 errors (pre-condition for sync — broken build = sync not done yet)
☐ npm test → baseline count unchanged

For each TypeScript file modified this session:
  ☐ Look up file in Maintenance Rules table above
  ☐ Open the target canonical doc
  ☐ Verify the entry exists and is accurate (factory ID, task type, file:line, description)
  ☐ If entry is missing or stale → update now, before commit

Artifact number audit:
  ☐ If new F-XXXX or T-XXX was assigned: confirm AGENTS.md shows updated next-available number
  ☐ If new SK-XXX was assigned: confirm agent-constitution/SKILL.md skill registry is updated
  ☐ STATE-Pn.json reservedThisSession[] matches what was actually committed

Final:
  ☐ git diff — all canonical doc updates are staged
  ☐ Commit includes BOTH TypeScript changes AND doc updates in the same commit
```

---

## What "Synced" Means

A document is **synced** when:
- Every factory/task-type/station added this session has an entry in the canonical doc
- Every modified entry shows the correct file:line reference (grep-verifiable)
- No stale count remains (e.g., "9 AF stations" when there are now 10)
- Artifact number fields (nextFactory, nextTaskType) reflect the true next-available value

A document is **NOT synced** if:
- Code was changed but the doc has no corresponding update
- Doc still references an old file path (file was renamed/moved)
- Count in doc ("6 fabric types") doesn't match code reality

---

## Anti-Patterns

1. **"I'll update the docs in Phase 12."** Phase 12 packages the docs — it doesn't write them from scratch. If Phase 11 changes are not synced by the end of Phase 11, Phase 12 packaging produces stale docs.

2. **"The code is self-documenting."** The canonical docs are machine-readable context for future Codex sessions. Stale docs cause stale plans, which cause stale artifact numbers, which cause collisions.

3. **"I updated AGENTS.md but not ENGINE_ARCHITECTURE_MERGED."** Use the maintenance rules table — multiple docs often need the same update. One file change can touch 2–3 docs.

4. **"The doc update is a separate commit."** Doc updates and the code changes that necessitate them belong in the same commit. Separate commits create a window where the code is ahead of the docs — a future session starting in that window reads stale docs.
