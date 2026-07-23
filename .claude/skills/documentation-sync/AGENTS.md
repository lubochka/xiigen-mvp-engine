# Documentation Sync — Quick Reference

## Trigger

Invoke at **session end**, after all TypeScript changes are written and tests pass. Not mid-session.

---

## File → Doc Sync Map

| File Changed | Canonical Docs to Update |
|-------------|--------------------------|
| `server/src/engine-contracts/*.ts` | ENGINE_ARCHITECTURE_MERGED + CLAUDE.md |
| `server/src/factories/*.ts` | ENGINE_ARCHITECTURE_MERGED + TASK_TYPES_CATALOG_MERGED |
| `server/src/af-stations/*.ts` | ENGINE_ARCHITECTURE_MERGED |
| `server/src/fabrics/**/*.ts` | ENGINE_ARCHITECTURE_MERGED |
| `server/src/fabrics/*/provider-registry.ts` | ENGINE_ARCHITECTURE_MERGED (provider key list) |
| New task type (T-XXX) | TASK_TYPES_CATALOG_MERGED + CLAUDE.md |
| New factory (F-XXXX) | ENGINE_ARCHITECTURE_MERGED + CLAUDE.md |
| New skill (.claude/skills/) | SKILLS_INDEX.md (Phase 12 only) |

---

## Session-End Gate (5 items)

```
☐ Build passes (npm run build → 0 errors)
☐ Tests pass (count ≥ session-start baseline)
☐ For each TS file modified: matching canonical doc update verified (table above)
☐ Artifact numbers in CLAUDE.md reflect true next-available (not pre-session values)
☐ Code changes + doc updates in SAME commit — never separate
```

---

## What "Synced" Means

| ✅ Synced | ❌ Not Synced |
|-----------|--------------|
| Doc entry exists for every factory/station added | No entry for new F-XXXX |
| file:line references are grep-verifiable | Old file path (file was moved) |
| Count fields match code reality ("10 AF stations" = 10) | Stale count ("9 AF stations") |
| nextFactory/nextTaskType = true next available | nextFactory is pre-session value |

---

## Red Flags

```
⛔ TypeScript committed but no canonical doc update in same commit
⛔ "I'll update docs in Phase 12" — Phase 12 packages docs, not writes them
⛔ CLAUDE.md artifact numbers not updated after F-XXXX or T-XXX assignment
⛔ ENGINE_ARCHITECTURE_MERGED missing new factory entry
⛔ TASK_TYPES_CATALOG_MERGED missing new task type entry
```
