# PHASE 10 — Human Action Checklist
## Date: 2026-04-21 | CFI-13 tracking

This is the only phase that requires human action. No Claude output. Two steps:
upload the output files, then update the project instruction.

---

## STEP 1 — Upload all Phase output files to Claude.ai project knowledge

Claude.ai project → Knowledge → Add content

Upload each file below. For files that already exist in project knowledge,
replace the old version. For new files, add them fresh.

| # | File | Action | Phase |
|---|------|--------|-------|
| 1 | `HOW-TO-USE-SKILLS.md` | REPLACE existing v3.2.0 | Phase 8 → v4.6.0 |
| 2 | `FLOW-DESIGN-SKILL-INDEX.md` | REPLACE existing v3.2.0 | Phase 1 → v4.0+ |
| 3 | `XIIGEN-DESIGN-ARCHITECT-SESSION-GUIDE-v1.9.md` | ADD new file | Phase 2 |
| 4 | `XIIGEN-SESSION-START-PROMPT-v5.0.md` | ADD new file | Phase 3 |
| 5 | `XIIGEN-SESSION-SETUP-LIBRARY.md` | REPLACE existing | Phase 4 |
| 6 | `XIIGEN-RESPONSE-CONSTRUCTION-PROTOCOL-v1.md` | REPLACE existing | Phase 5 |
| 7 | `planning--reconnaissance-gate-SKILL.md` | REPLACE existing v2.0.0 | Phase 6 → v2.1.0 |
| 8 | `XIIGEN-SESSION-LOAD-PLAN-v32.md` | ADD new file | Phase 7 |
| 9 | `SESSION-STATE-SNAPSHOT-ARCHITECT-INFRASTRUCTURE.md` | ADD new file | Phase 9 |
| 10 | `ARCHITECT-SESSION-INFRASTRUCTURE-FIX-PLAN-v9.1.md` | REPLACE existing | Updated plan |

**Critical files (most likely to cause silent failure if missing or stale):**
Items 1, 2, 3, 7 — the start prompt explicitly references v4.6.0 HOW-TO-USE,
v4.0+ FLOW-DESIGN-SKILL-INDEX, v1.9 architect guide, and SK-529 v2.1.0.
If any of these are absent or at old versions, ARCHITECT sessions will
reference documents that don't exist and fail silently.

Do NOT proceed to Step 2 until all 10 files above are in project knowledge.

---

## STEP 2 — Update project instruction to v5.0

Claude.ai project → Settings → Project instructions → Edit

Replace the entire current content with the content of:
  `XIIGEN-SESSION-START-PROMPT-v5.0.md`

Save.

---

## STEP 3 — Verify

Open a new session in this project. Type any message — "hello" is enough.

**PASS:** First response is a plain-English paraphrase of what you asked.
  One paragraph. No tables. No skill-load list. No STATE block. No RECON REPORT.

**FAIL:** First response contains a governance wall, skill-load table, or
  STATE/RECON block before the paraphrase.
  → Check that Step 2 saved correctly (the new instruction starts with
    `# XIIGEN SESSION START PROMPT — v5.0`).
  → Check that PRE-Q0 section is present in the saved instruction.

---

## TRACKING

CFI-13 in `XIIGEN-SESSION-LOAD-PLAN-v32.md` — mark CLOSED when Step 3 passes.

Update the CFI-13 entry:
```
CFI-13 — CLOSED [date]: Claude.ai project custom instruction updated to v5.0.
  Verified: new session opened with plain-English paraphrase, no governance wall.
```
