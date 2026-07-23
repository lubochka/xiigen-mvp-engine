---
name: documentation-sync
sk_number: SK-422
version: "2.0.0"
author: luba
updated: "2026-03-19"
description: >
  Session-end canonical doc sync for the XIIGen engine. Maps TypeScript file changes
  to the canonical docs that must be updated in the same commit. Prevents stale
  ARCHITECTURE_GUIDE.md, KNOWLEDGE_DIGEST.md, or CLAUDE.md after code changes.
---

# Documentation Sync Skill v2.0

> Session-end canonical doc sync — never commit code without syncing the docs that describe it.

## PURPOSE

Invoke at **phase completion** — after all TypeScript changes are written and tests pass,
BEFORE saving STATE-Pn.json or issuing ⛔ STOP.

This skill is a **mandatory phase-completion gate** (item 5 in session-completeness.md).
The phase is NOT complete until this skill runs and all sync gaps are resolved.

For each file changed this session, look up the matching canonical doc in the
Sync Map and verify the entry exists, is accurate, and will be included in the
same commit as the code change.

**Do NOT invoke mid-session.** Sync once — at the phase boundary, before STATE-Pn.json.

---

## SYNC MAP — File → Canonical Docs

| File Changed | Canonical Docs to Update | Specific Update |
|-------------|--------------------------|-----------------|
| `server/src/engine-contracts/*.ts` | `ARCHITECTURE_GUIDE.md` + `CLAUDE.md` | Factory list, contract shape, artifact numbers |
| `server/src/factories/*.ts` | `ARCHITECTURE_GUIDE.md` + `KNOWLEDGE_DIGEST.md` | Factory ID, task type, family mapping |
| `server/src/af-stations/*.ts` | `ARCHITECTURE_GUIDE.md` | Station responsibilities, input/output spec |
| `server/src/fabrics/**/*.ts` | `ARCHITECTURE_GUIDE.md` | Provider list, fabric type map |
| `server/src/fabrics/*/provider-registry.ts` | `ARCHITECTURE_GUIDE.md` | Provider key list (case-sensitive) |
| New task type (T-XXX) | `KNOWLEDGE_DIGEST.md` + `CLAUDE.md` | T-XXX name, factory ID, flow(s) |
| New factory ID (F-XXXX) | `ARCHITECTURE_GUIDE.md` + `CLAUDE.md` | fabricType, taskTypes[], bfaRegistration |
| `CLAUDE.md` artifact number section | `KNOWLEDGE_DIGEST.md` | Confirm next-available numbers match |
| `.claude/skills/*/SKILL.md` added | Deferred — Phase 12 packaging | No action during Phase 11 |

---

## WORKFLOW

### Phase 1: PRE-CONDITION

| Step | Action | Tool |
|------|--------|------|
| 1.1 | Confirm `npm run build` → 0 errors | Bash |
| 1.2 | Confirm test count ≥ session-start baseline | Bash |

If either fails → STOP. Fix build/tests first. Sync after.

### Phase 2: PER-FILE SYNC

For each TypeScript file modified this session:

| Step | Action | Tool |
|------|--------|------|
| 2.1 | Look up file in Sync Map above | — |
| 2.2 | Open the target canonical doc | Read |
| 2.3 | Grep for the factory/station/type entry | Grep |
| 2.4 | Verify entry: ID, file:line, description are current | Read |
| 2.5 | If missing or stale → update now, before commit | Edit |

### Phase 3: ARTIFACT NUMBER AUDIT

| Step | Action | Tool |
|------|--------|------|
| 3.1 | If new F-XXXX assigned: confirm `CLAUDE.md` `nextFactory` incremented | Read |
| 3.2 | If new T-XXX assigned: confirm `CLAUDE.md` `nextTaskType` incremented | Read |
| 3.3 | If new SK-XXX assigned: confirm skill registry in `.claude/` updated | Read |

### Phase 4: COMMIT GATE

| Step | Action | Tool |
|------|--------|------|
| 4.1 | Run `git diff` — all doc updates must be staged | Bash |
| 4.2 | Confirm code changes + doc updates are in the SAME commit | Bash |

---

## RULES

| Rule | Implementation |
|------|----------------|
| Same-commit | Doc updates and code changes belong in one commit — never split |
| No deferred sync | "Phase 12 will fix it" is NOT valid — Phase 12 packages docs, not writes them |
| Grep-verifiable | Every entry must have a file:line reference that `grep` can confirm |
| Count accuracy | If a doc says "10 AF stations", grep the code and confirm the count |
| Artifact numbers | nextFactory/nextTaskType in CLAUDE.md must reflect true next-available |

---

## ERROR HANDLING

| Error | Cause | Response |
|-------|-------|----------|
| Build fails | Broken import, type error | Fix build before sync |
| Test count drops | Regression introduced | Fix regression before sync |
| Entry not in doc | New factory/station not documented | Add entry now |
| Stale file:line ref | File was moved or renamed | Update reference path |
| Stale count field | Added station but count not updated | Update count in doc |
| Artifact number not advanced | Forgot to bump CLAUDE.md | Advance nextFactory/nextTaskType |

---

## WHAT "SYNCED" MEANS

| ✅ Synced | ❌ Not Synced |
|-----------|--------------|
| Every factory/station added this session has a doc entry | New F-XXXX has no entry in ARCHITECTURE_GUIDE.md |
| Every entry has a grep-verifiable file:line reference | Entry still points to old path after rename |
| Count fields match code reality | "9 AF stations" when there are 10 |
| nextFactory/nextTaskType = true next available | nextFactory is pre-session value |
| Code + doc updates are in the same commit | Doc update is a separate commit or missing |

---

## ANTI-PATTERNS

| Anti-Pattern | Why It Fails |
|--------------|-------------|
| "I'll update docs in Phase 12" | Phase 12 packages — it doesn't write from scratch |
| "The code is self-documenting" | Canonical docs are machine-readable context for future sessions |
| "I updated CLAUDE.md but not ARCHITECTURE_GUIDE.md" | One file change often touches 2–3 docs — check the Sync Map |
| "The doc update is a separate commit" | Creates a window where code is ahead of docs |

---

## VERIFICATION

```
☐ npm run build → 0 errors
☐ npm test → count ≥ session-start baseline
☐ For each TS file modified: Sync Map lookup done, target doc verified
☐ CLAUDE.md artifact numbers advanced (if F-XXXX or T-XXX assigned)
☐ git diff confirms doc updates staged alongside code changes
☐ All changes committed together in one commit
```

---

<!-- SKILL v2.0.0 | SK-422 | Updated: 2026-03-19 -->
