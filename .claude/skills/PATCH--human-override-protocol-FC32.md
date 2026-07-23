# PATCH — Human Override Protocol (FC-32 + Document Authority Map)
## Date: 2026-03-25 | Source: HOW-TO-USE v2.2.0 + SK-439 v2.0
## Canonical home: `planning--plan-review-SKILL.md` (FC-32 section)
##                 `DOCUMENT-AUTHORITY-MAP.md` (canonical homes table)

---

## HOW TO APPLY

### Pre-flight (verify before touching any code)
```bash
# Confirm FC-32 does not already exist
grep -n "FC-32" .claude/skills/plan-review-skill/*.md
# Expected: 0 hits

# Confirm DOCUMENT-AUTHORITY-MAP exists
ls .claude/skills/ | grep -i "document-authority\|authority-map"
# Expected: file found (or check FLOW-DESIGN-SKILL-INDEX.md for its location)
```

---

### Change 1 — planning--plan-review-SKILL.md
### Add FC-32 section after FC-31

**Insert after the FC-31 section** (after the line "FAIL if: any literal model
name, provider name, or API endpoint appears...") and before
"### PATCH FORMAT STANDARD":

```markdown
---

### FC-32: Human Instruction Alignment (H0 — v2.2.0)

When any session contained a moment where Luba's instruction contradicted a
skill, rule, FC check, or principle, the session must record it correctly.

**Detection (run at every ⛔ STOP when a contradiction occurred this session):**
```bash
# Check 1: Was the contradiction noted in ISSUE INVENTORY?
grep -n "EXCEPTION\|contradicts\|skill.*gap\|gap.*skill" PHASE-COMPLETE-*.md SESSION-*.md 2>/dev/null
# If a contradiction occurred this session: must have >= 1 hit

# Check 2: Was an exception or update recorded?
grep -n "EXCEPTION:\|FIXED.*gap\|updated.*skill\|skill.*updated" PHASE-COMPLETE-*.md SESSION-*.md 2>/dev/null
# Must have an entry for every contradiction that occurred
```

**Checklist:**
```
□ Was every instruction that contradicted a rule executed BEFORE any governance discussion?
□ Was each contradiction stated in one sentence (not defended, not explained)?
□ For each contradiction: was it classified as EXCEPTION, FIXED (skill gap), or DEFERRED?
□ For permanent updates: did change-propagation-SKILL.md (SK-440) run to find all affected docs?
□ Is the ISSUE INVENTORY updated with the correct status?
```

**FAIL if:**
- A direct instruction was not executed because it contradicted a rule
- A contradiction was noted but not classified (EXCEPTION / FIXED / DEFERRED)
- Luba was asked "are you sure?" before executing a direct instruction
- A skill gap was identified but the skill was not updated (and no DEFERRED with authorization)

**PASS if:**
- No contradictions occurred this session: FC-32 passes automatically
- All contradictions are classified in ISSUE INVENTORY with correct status

**Note:** FC-32 does NOT require contradictions to occur. It requires that
when they do occur, they are handled correctly. A session with zero contradictions
passes FC-32 by default.
```

---

### Also update the Gate A passing criteria table at the end of the file

**Find the table:**
```
✅ FC-31: Machine constants in schemas/templates (v2.0.0)
```

**Replace with:**
```
✅ FC-31: Machine constants in schemas/templates (v2.0.0)
✅ FC-32: Human instruction alignment — contradictions classified (v2.2.0)
```

---

### Change 2 — DOCUMENT-AUTHORITY-MAP.md
### Add human override content homes to the canonical table

**Find the CANONICAL HOME TABLE section.**
Find the last row of the table (currently ending with something about codebase
source files or architecture decisions).

**Add these rows to the table:**

```markdown
| Human override — one-time exceptions | ISSUE INVENTORY of the session where it occurred (`EXCEPTION: [reason]`) | — |
| Human override — permanent skill updates | The skill file that was updated | CARRY-FORWARD-ISSUES.md tracks until applied |
| Skill gaps discovered through human contradiction | The updated skill file + CARRY-FORWARD-ISSUES.md | ISSUE INVENTORY of discovery session |
| H0 protocol (execute-first rule) | `HOW-TO-USE-SKILLS-v2.2.0.md` | Session start prompt summary |
| Human contradiction handling (SK-439 Part 1) | `planning--level-correction-response-SKILL.md` v2.0 PART 1 | HOW-TO-USE skill activation table |
```

**Also add to CONFLICT RESOLUTION RULE section, after the existing 4-step rule:**

```markdown
### Human Override Exception

When Luba's instruction conflicts with a canonical document:
1. The instruction takes precedence immediately (execute)
2. The canonical document must be updated to reflect the decision
3. If the update is deferred, CARRY-FORWARD-ISSUES.md is the tracking home
4. The canonical home table above remains the authority for document content —
   but it is downstream of Luba's decisions, not upstream of them
```

---

### Post-flight (verify after all changes)
```bash
# FC-32 exists in plan-review
grep -n "FC-32" .claude/skills/plan-review-skill/*.md
# Expected: >= 3 hits (section header + checklist items + Gate A table)

# Document authority map updated
grep -n "one-time exception\|skill gap\|Human override\|H0 protocol" \
  .claude/skills/DOCUMENT-AUTHORITY-MAP.md 2>/dev/null || \
  grep -n "one-time exception\|skill gap\|Human override\|H0 protocol" \
  DOCUMENT-AUTHORITY-MAP.md
# Expected: >= 3 hits

# No tests to run — these are documentation-only changes
```

---

## WHAT FC-32 PREVENTS

| Without FC-32 | With FC-32 |
|---------------|------------|
| Contradictions silently absorbed — skill gap never recorded | Every contradiction is classified and tracked |
| Luba repeats the same instruction next session | Skill is updated; instruction is encoded |
| Two conflicting records (skill says X, Luba said Y) | One record: updated skill says Y |
| "Pre-existing" used for skill gaps | FIXED (gap added) is the correct status |

## RELATIONSHIP TO EXISTING RULES

FC-32 does not replace any existing FC check. It adds the missing check for
human-governance interaction.

FC-29 (zero known defects): ensures code issues are tracked in ISSUE INVENTORY.
FC-32 (human alignment): ensures governance contradictions are tracked in ISSUE INVENTORY.

They use the same ISSUE INVENTORY table; FC-32 adds the EXCEPTION status that
FC-29 does not have. Both must pass before every ⛔ STOP.
