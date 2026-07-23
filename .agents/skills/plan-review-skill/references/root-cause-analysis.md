# Root Cause Analysis — Why Plan Failures Recur

## The Single Underlying Mechanism

> A fact is written as a static copy of a derived value. When the source changes, only 1 of N copies gets updated.

Every failure class in the catalog is an instance of this one mechanism. The same value (a count, a path, a phase assignment, a requirement definition) appears in N locations throughout the plan document. When the value changes:

1. The writer updates 1 location (the one they're focused on)
2. The other N-1 locations are not updated (they are not in focus)
3. Human reading follows the writer's path and misses the other N-1
4. Automated scanning (grep/python) checks all N at once in 5 seconds

This is why 7 rounds of careful human review still missed issues that a single `grep -n "old_value"` would have caught.

---

## Why Each Failure Class Exists

### FC-1 — Counts are caches, not sources

A count like "23 skills" appears in:
- Summary table
- B-0 batch list
- Phase headers (sum of per-phase counts)
- Load Order section
- STATE.json `totalNewSkills`
- SKILLS_INDEX.md header

None of these are the source. The source is the actual list of skills. Every count is a manually maintained cache of that list. When a skill is added, the list gets one new item, but 6 caches need invalidation. Manual invalidation misses on average 5 of 6.

**Fix:** After adding/removing any skill, grep for all count references. Update every occurrence.

---

### FC-2 — Memory ≠ reality

Paths are written from the writer's mental model of the codebase. Mental model has latency — it reflects what the codebase looked like the last time the writer was in it, not the current state.

`claude-skill/` was the old convention. `.claude/skills/` is current. The mental model held the old value. The plan was written from memory, not from `find . -name "SKILL.md" | head -3`.

**Fix:** Every path claim in a plan must come from a live `find` or `ls` output, not from memory.

---

### FC-3 — Phantom skills: conceptual items become numbered without implementation

Skills get named and numbered before phases are written. The naming is a planning act. The phase assignment is a separate implementation act. If the phase is never assigned, the skill exists in the load order as a ghost — referenced but never created.

`af-pipeline-verification` was added to the load order as a conceptual entry before it was clear which phase would create it. It never got a phase. It became a phantom.

**Fix:** The load order is a deliverable manifest. Only add a skill to the load order when its phase is assigned. Use an explicit "out-of-scope" section for conceptual follow-on skills.

---

### FC-4 — Duplicate numbers: separate namespaces with colliding ranges

Factory IDs (F-xxx), task types (T-xxx), and skill numbers (SK-xxx) are maintained by different roles in different documents. When two sessions run without sharing state, they both claim the next available number from their local view of what "next" means.

**Fix:** STATE.json records reserved ranges. Every session reads the live canonical docs, not the plan file, to determine next-available numbers.

---

### FC-5 — Missing items: addition without full-matrix update

A skill is added to one section (say, the load order) but not to all required sections (phase map, deliverable block, B-0 batch list, summary count). The addition is partial.

This happens because the writer thinks "I've added the skill" after adding it to one location. The mental model now says "done." The matrix is not consulted.

**Fix:** Treat the skill presence matrix (Phase Map × Load Order × B-0 × Summary) as a truth table. Every skill must have a 1 in every cell. Check after every addition.

---

### FC-6 — Stale numbers: plan-time values vs runtime values

Numbers that are correct at plan-creation time become stale as the codebase advances. The plan says F1484; the codebase is now at F1512. The plan was not wrong when written — it became wrong as time passed.

**Fix:** Replace all static artifact numbers with a live-read protocol. The plan says "READ_FROM_LIVE_DOCS." The session's first step reads the live canonical docs to get current numbers. Plan-file numbers are never used directly.

---

### FC-7 — Phase placement: move = delete + add, only add happens

Moving a skill from Phase 3 to Phase 1:
1. Writer adds skill-advisor-skill to Phase 1 ✓
2. Writer does not remove skill-advisor-skill from Phase 3 ✗ (it's no longer in focus)
3. Both phases now claim the same skill
4. Total skill count appears inflated (same skill counted twice)

**Fix:** After every phase move, grep for the skill name. Every reference must agree on the new phase. Delete the old reference explicitly.

---

### FC-8 — Format violations: web sessions produce documents, not incremental steps

Plans written in conversational sessions accumulate sections organically. The REFERENCE header, Do NOT execute warning, and State Recovery Protocol are added to a template — but when sections are rewritten in later sessions, the template markers get dropped.

**Fix:** The plan template defines required sections. FC-8 verification is a grep for these markers. If they're absent, the document is not a valid plan.

---

### FC-9 — Requirement ambiguity: human language ≠ machine execution

"UI e2e tests" is a requirement statement. It does not specify: what test framework, which files, what level of isolation, whether Playwright is required, or what counts as passing.

A requirement without a concrete, tech-specific definition is ambiguous. Different readers will implement it differently. At session time, Claude Code will choose an interpretation — which may not be Luba's intent.

**Fix:** Every requirement must specify the framework, file path pattern, and pass criterion. "R2c: NestJS TestingModule (phase9-lifecycle.spec.ts) = server e2e" is a definition. "UI e2e tests" is not.

---

### FC-10 — Propagation failure: generalization of FC-1 for any value

FC-1 is about counts. FC-10 is about ANY value that appears in multiple locations. The underlying mechanism is identical: 1 of N copies updated.

The most common failure class (30% of issues). Appears in:
- "yarn" → "npm" (updated in session gate, not in agent-constitution steps)
- "9-step protocol" → "10-step protocol" (updated in one place, not in 3 cross-references)
- "11 failure classes" → "12 failure classes" (updated in SKILL.md, not in 9 cross-references across 5 files)

**Fix:** After every value change, grep for the OLD value. Zero occurrences must remain. This is the 5-second check that replaces 7 review rounds.

---

### FC-11 — Overview-detail drift: two views of one plan, detail is source

Every phase has an overview (header: "Skills: X, Y") and a detail (body: full deliverable description). These are two representations of the same fact. The detail is the source of truth. The overview is a summary cache.

When the detail is updated (skill added, file count changed), the overview is not in focus and does not get updated.

**Fix:** After every detail change, re-read the overview. Does it still accurately summarize the detail? If not, update the overview. Detail → overview, never the other way.

---

### FC-12 — Principles not checked: gate added after plan was written

The 8 foundational principles (P1–P8) were added as mandatory gates in Rev 3.2. Plans written before Rev 3.2 do not address them. Even plans written after Rev 3.2 can miss them if the writer doesn't consult the gate checklist.

The root cause is structural: there is no mandatory checkpoint that forces every plan to answer all 8 questions before proceeding.

**Fix:** FC-12 is the checkpoint. SESSION-0 Step 12 is the execution. Planning-skill Gate 7 is the pre-code gate. All three enforce the same requirement from different angles.

---

## The 5-Second Fix That Replaces 7 Review Rounds

After ANY change to a plan or skill file:

```bash
grep -rn "OLD_VALUE" plan.md .claude/skills/ 2>/dev/null
```

Expected: zero results.

This single grep catches:
- FC-1: stale counts with old number
- FC-6: stale artifact IDs
- FC-7: old phase assignment not removed
- FC-10: any value not fully propagated

The reason 7 review rounds missed these issues: human reading follows the writer's path. Grep has no path — it checks every line of every file simultaneously.

---

## Prevention Protocol (Three Rules)

**Rule 1: No static copies of derived values.**
If a value can be computed from another value, don't write it down as a literal. Write the derivation instead. If you must write the literal, track all N locations.

**Rule 2: After every change, grep for the old value.**
Before closing a session: `grep -rn "old_value" .` — zero results required.

**Rule 3: Detail is source of truth, overview is cache.**
When detail and overview conflict, detail wins. Update the overview to match the detail, never the reverse.
