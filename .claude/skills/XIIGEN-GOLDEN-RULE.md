# XIIGEN OVERHAUL — GOLDEN RULE
## Active for: Skills Overhaul Sessions S1-S7 and all subsequent sessions
## Version: v2.0.0 | Date: 2026-03-25

---

## THE GOLDEN RULE

**Every review finding is a symptom of a missing guard.**

When a review finds any issue — location error, missing verification, wrong value,
wrong format — the correct response is NOT:
1. Fix the one instance
2. Mark it resolved
3. Move on

The correct response is:
1. Fix the one instance
2. Ask: "what structural guard would have prevented this finding?"
3. If no guard exists → the guard is missing. Add it.
4. Search all other locations where the same gap applies (FC-10: propagation sweep)
5. Fix those too, or flag them explicitly with a named owner

**The instance is the symptom. The missing guard is the disease.**

---

## THE THREE SYSTEMIC GAPS FOUND IN S1 REVIEW

### Gap A: No canonical document ownership map
**Symptom:** SK registry section appeared in `PATCH--judge-model-freedom-config.md`
instead of `FLOW-DESIGN-SKILL-INDEX.md` (its canonical home).

**Root cause:** No document defines "what type of content goes in which file."
Governance content drifts into the nearest available file.

**Guard needed:** DOCUMENT AUTHORITY MAP — a reference stating which document
owns which type of governance content. Added to master plan as S6 task.

**Canonical homes (working draft — finalized in S6):**

| Content type | Canonical document |
|-------------|-------------------|
| Principle definitions (M + P) | `PATCH--xiigen-core-principles-*.md` |
| Skill numbers (SK registry) | `FLOW-DESIGN-SKILL-INDEX.md` |
| Architectural decisions (D-EXT) | `XIIGEN-EXTENSION-ARCHITECTURE-DECISIONS.json` |
| FC checks (plan review gates) | `planning--plan-review-SKILL.md` |
| Catalog checks (LEARNING, HEALTH, ISSUE, ARBITER) | `code-execution--flow-design-check-catalog.md` |
| Validation dimensions (V1-V11) | `code-execution--flow-implementation-guide-SKILL.md` |
| Session type quick-starts | `XIIGEN-SESSION-SETUP-LIBRARY.md` |
| Session state/current status | `XIIGEN-SESSION-START-PROMPT.md` |
| Claude Code execution rules | `.claude/AGENTS.md` |
| Patch application instructions | Individual `PATCH--*.md` files |
| Overarching governance rules and meta-principles | `XIIGEN-GOLDEN-RULE.md` |
| Carry-forward issues between overhaul sessions | `CARRY-FORWARD-ISSUES.md` (per-overhaul, ephemeral) |
| Master remediation plans | `XIIGEN-V2-MASTER-PLAN.md` (per-overhaul) |
| Flow session execution files | `docs/sessions/FLOW-XX/` directory |
| Skill operating manuals | Individual `planning--*-SKILL.md` or `code-execution--*-SKILL.md` |

**Check before writing any governance content:**
"Does this content type have a canonical home? Am I writing it there?"

---

### Gap B: No patch format standard
**Symptom:** Import verification note was missing from FREEDOM config patch Parts 2/3.
Every code patch will have the same omission without a mandatory pre-flight section.

**Root cause:** Patch files have `## HOW TO APPLY` sections but no standard format
requiring a `## PRE-FLIGHT CHECKLIST` before any code change instructions.

**Guard needed:** PATCH FORMAT STANDARD — every `PATCH--*.md` that instructs
code changes must follow this structure:

```
## HOW TO APPLY

### Pre-flight (verify before touching any code)
□ [Dependency 1]: verify import resolves → command to check
□ [Dependency 2]: verify token is registered → command to check
□ Expected state before change: [description]

### Change 1 — [File name]
[exact change instructions]

### Change 2 — [File name]
[exact change instructions]

### Post-flight (verify after all changes)
□ npx tsc --noEmit → 0 new errors in changed files
□ pnpm test → failures === 0 AND each skip has documented justification (HEALTH-001 absolute gate — not delta gate)
□ [Specific functionality check]
```

**This standard is retroactive.** The FREEDOM config patch already has the
pre-flight note added. All future patches in S2-S6 must follow this format.

**Important distinction for cross-references:**
- Cross-references in **planning-session skills** (web session, `planning--*.md`) are
  acceptable as pointers: "see learning-signal-capture-SKILL.md for current DPO schema."
  A human or web session Claude can follow a pointer.
- Cross-references in **Claude Code execution session files** (`SESSION-N.md`) are
  NEVER acceptable. Claude Code cannot load a second file mid-execution regardless of
  whether the reference is a pointer or an instruction. Session files must inline all
  required content. This is the enforcement rationale behind FC-28 and SK-443.

---

### Gap C: No machine-constant guard for schema definitions
**Symptom:** `targetModelFamily` in DPO_TRIPLE schema risked being hardcoded
as `'deepseek-coder-v2'` instead of reading from FREEDOM config.

**Root cause:** D-EXT-009 fixed machine constants in `fabrics.module.ts` (code).
But the same pattern — hardcoded model/provider strings — can appear in:
- Schema definitions (`learning-signal-capture-SKILL.md`)
- Prompt template fixtures
- Contract template defaults
- Session files (hardcoded model names in curl commands)

No FC check or principle currently covers these non-code locations.

**Guard needed:** FC-31 (added to `planning--plan-review-SKILL.md` in S4) —
Machine Constants in Non-Code Artifacts:

```
FC-31: Machine Constants in Schemas and Templates
For every schema definition, fixture template, and prompt template that
contains a model name, provider name, or endpoint URL string:
  □ Is this value sourced from FREEDOM config, not hardcoded?
  □ If FREEDOM config is unavailable, is there a documented fallback?
  □ Is the FREEDOM config key name documented inline?

Detection:
  grep -rn "deepseek\|gpt-4\|claude-opus\|claude-sonnet\|gemini-pro\|api\.anthropic\.com\|openai\.com\|googleapis\.com\|localhost:[0-9]" \
    .claude/skills/ fixtures/ contracts/ \
    | grep -v "FREEDOM config\|xiigen\.\|default:\|# Expected\|# Check" \
    | grep -v ".spec."
  # Any hit is a candidate FC-31 violation (covers model names AND hardcoded API endpoints)

FAIL if: any model name, provider name, or API endpoint URL appears as a literal
string in a schema, template, or fixture without a FREEDOM config reference.
```

---

## HOW TO APPLY THIS RULE IN EVERY FUTURE SESSION

Before ⛔ STOP in any session:

1. For each finding fixed in this session:
   - Write one sentence: "The structural guard that would have prevented this is: [guard]"
   - If the guard doesn't exist: add it to the master plan or the relevant skill

2. For each guard identified:
   - FC-10 propagation sweep: does the same gap exist elsewhere?
   - If yes: fix or flag with a named owner

3. Add to ISSUE INVENTORY:
   - Not just "FIXED: SK registry moved" 
   - But: "FIXED instance + GUARD ADDED: canonical document ownership map (Gap A)"

**This rule does not add sessions. It adds 10 minutes of structural thinking
to every session that catches a review finding. Those 10 minutes prevent
the same finding from appearing in sessions S3, S4, S5, S6, and S7.**
