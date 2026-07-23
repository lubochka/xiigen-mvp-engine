# Session Completeness Rule

A session is COMPLETE only when ALL of the following are true:

## Required Outputs

1. **Build passes** — `cd server && npm run build` exits with 0 errors
2. **Server tests pass** — count ≥ session-start baseline (minimum 2,342)
3. **Client tests pass** — count ≥ session-start baseline (minimum 220)
4. **No DNA violations** — new/modified files pass all 9 DNA pattern checks
5. **Documentation synced** — for every TypeScript source file modified this session, the matching canonical doc entry is updated (use documentation-sync skill sync map). MANDATORY — not deferrable to Phase 12.
6. **STATE-Pn.json saved** — with all phase outputs recorded
7. **⛔ STOP issued** — session explicitly ended, not just "done for now"

## What Does NOT Count as Complete

- Build passes but tests haven't been run
- Tests run but count decreased from baseline
- Files written but no STATE-Pn.json saved
- Saying "I'll run tests next session"
- TypeScript source files changed but canonical docs not updated ("I'll sync docs in Phase 12")

## Incomplete Session Protocol

If a session cannot complete (time, blocker, unexpected complexity):
1. Do NOT declare DONE
2. Save partial STATE-Pn.json with `status: "INCOMPLETE"` and `blockers: [...]`
3. List exactly what remains
4. Issue ⛔ STOP — Luba decides whether to continue or abandon

## Session Completeness vs Phase Completeness

- **Session complete** = the above checklist passes
- **Phase complete** = STATE-Pn.json exists + Luba has given explicit approval to proceed to next phase

A session can be complete without a phase being complete (e.g., if Luba needs to review before approving Phase N+1).

---

## Phase Completion — Next-Phase Preview (MANDATORY)

After STATE-Pn.json is saved and before issuing ⛔ STOP, Claude Code MUST:

1. **Run the next-phase planning gates** on Phase N+1 spec (from the plan file):
   - planning-skill Gates 0–7 (infrastructure discovery, DNA, fabric, tests, P1–P8)
   - plan-review-skill FC-1 through FC-12 spot-check on Phase N+1 deliverables

2. **Enter plan mode (`EnterPlanMode`) and present two sections:**

   **Section A — Phase N Execution Summary** (what was just completed):
   - Skills/files delivered this phase
   - Test gate results (server N/N passed, client N/N passed, build errors = 0)
   - Zero-regression delta (Δ = 0)
   - Any deviations from the plan spec

   **Section B — Phase N+1 Reviewed Plan:**
   - Gate table (G0–G7: PASS/FAIL/N/A)
   - FC battery results (FC-1–FC-12: PASS/FAIL/FIX-AT-WRITE)
   - Write-time fixes identified
   - Exact file count and deliverable list for Phase N+1

3. **Issue ⛔ STOP inside plan mode** — Luba reviews both sections and gives written approval

**Why:** Luba reviews the next-phase plan as part of approving phase completion. She should see the gate-reviewed plan at the STOP point, not have to ask for it separately after.

**Anti-pattern:**
```
WRONG:
  ☐ STATE-Pn.json saved
  ⛔ STOP — Phase N complete. Awaiting your "yes" to begin Phase N+1.
  [Luba: "Show me the Phase N+1 plan reviewed through planning skills"]
  [Claude: now runs gates and presents plan]

CORRECT:
  ☐ documentation-sync run — canonical docs updated for all TS changes this phase
  ☐ STATE-Pn.json saved
  ☐ Phase N+1 planning gates run (G0–G7 + FC-1–FC-12)
  ☐ Phase N+1 reviewed plan presented to Luba
  ⛔ STOP — awaiting Luba written approval of Phase N+1 plan
```
