# Failure Class Catalog — 12 Classes, Real Examples

This catalog documents the 12 failure classes (FC-1 through FC-12) with real examples from the XIIGen skill migration (March 2026). 23 issues found across 7 review rounds. The plan was declared "done" after Round 1 but was not complete until Round 7.

Use this catalog to calibrate detection — each entry shows what the failure looks like in the wild.

---

## FC-1: Count Drift

**Definition:** A numeric count in the plan disagrees with the actual number of items.

**Root cause:** Counts are cached copies of derived values. When a skill is added/removed, only 1 of N count references gets updated.

**Real examples (3 found):**
1. Summary row "20 new skills" not updated after adding xiigen-core-principles, plan-review-skill, how-to-prepare-a-plan — count should be 23
2. B-0 skill.yaml list said "20 skill.yaml files" — same source, same error
3. Phase 6 header listed 1 skill but load order showed 2 (code-examination-skill missing from header)

**Detection:**
```bash
grep -n "new skill\|skill.yaml\|governance skill" plan.md | grep -E "\b[0-9]+\b"
# Every count reference must equal 23 (or consistent per category)
```

**Fix:** Find ALL count references with grep. Update every occurrence. Then run FC-10 propagation sweep.

---

## FC-2: Path Errors

**Definition:** File paths in the plan use the wrong convention for the actual codebase.

**Root cause:** Path written from memory, not from live `find` output. Memory holds the wrong path.

**Real examples (2 found):**
1. `.claude-skill/` used throughout — actual codebase uses `.claude/skills/` (hyphen vs slash, no "s")
2. `.cursorrules` referenced — actual file is at project root with no subdirectory (minor, but wrong assumption)

**Detection:**
```bash
grep -n "claude-skill\b\|\.claude-skill" plan.md
# Expected: 0 results (wrong path convention)
grep -rn "claude-skill" .claude/skills/ 2>/dev/null
# Expected: 0 results
```

**Fix:** Verify actual path with `find . -name "SKILL.md" | head -5`. Replace all occurrences of wrong path.

---

## FC-3: Phantom Skills

**Definition:** A skill appears in the load order (numbered list) but no phase creates it.

**Root cause:** Skills are added conceptually (numbered, named) without assigning them to a phase. The load order grows but the phase map does not.

**Real examples (1 found):**
1. `af-pipeline-verification` appeared in load order with a number but no phase had it as a deliverable — it was a "follow-on" skill not in this migration scope

**Detection:**
```python
import re

with open('plan.md') as f:
    content = f.read()

load_order = re.findall(r'^\s*(\d+)\.\s+([\w-]+)', content, re.MULTILINE)
for num, skill in load_order:
    phase_ref = bool(re.search(rf'Phase \d.*{skill}|{skill}.*Phase \d', content))
    if not phase_ref:
        print(f"FC-3 POSSIBLE PHANTOM: #{num} {skill}")
```

**Fix:** Either assign the skill to a phase or move it to an explicit "out of scope / follow-on" section not numbered in the load order.

---

## FC-4: Duplicate Numbers

**Definition:** Two different items share the same number in the same namespace.

**Root cause:** Separate numbering sequences (phases, skills, requirements) collide when items are inserted without renumbering the sequence.

**Real examples (0 found in this migration — prevented by sequential SK assignment):**
- Hypothetical: SK-407 assigned to both infrastructure-discovery and a second skill added later

**Detection:**
```python
import re
from collections import Counter

with open('plan.md') as f:
    content = f.read()

numbers = re.findall(r'^\s*(\d+)\.\s+\w', content, re.MULTILINE)
counts = Counter(numbers)
duplicates = {n: c for n, c in counts.items() if c > 1}
if duplicates:
    print(f"FC-4 DUPLICATES: {duplicates}")
else:
    print("FC-4: PASS")
```

**Fix:** Renumber the conflicting items. Check that STATE.json artifact number ranges don't overlap across sessions.

---

## FC-5: Skill Presence Matrix

**Definition:** A skill exists (named, numbered, described) but is missing from one or more required locations: phase map, deliverable block, load order, B-0 list, summary count.

**Root cause:** Skills are added to one section (e.g., load order) but the corresponding phase deliverable, B-0 entry, or count is not updated.

**Real examples (1 found):**
1. `how-to-prepare-a-plan-skill` was in the load order but missing from the B-0 batch generation list

**Detection:**
```python
skills = [
    "agent-constitution", "no-product-decisions", "dev-safety",
    "skill-advisor-skill", "tracker-skill",
    "infrastructure-discovery", "planning-skill",
    "xiigen-core-principles-skill", "plan-review-skill",
    "agent-output-format", "how-to-prepare-a-plan-skill",
    "engine-qa", "test-integrity", "bug-to-tests", "three-level-verification",
    "code-examination-skill", "mental-debug", "self-verification",
    "dna-compliance-guard", "retroactive-development", "artifact-numbering",
    "docker-local-testing", "documentation-sync"
]

with open('plan.md') as f:
    content = f.read()

for skill in skills:
    count = content.count(skill)
    if count < 3:
        print(f"FC-5 POSSIBLY MISSING: {skill} (only {count} references)")
```

**Fix:** For each skill, verify it appears in: (1) Phase N header, (2) Phase N deliverable block, (3) Load Order, (4) B-0 list, (5) Summary count.

---

## FC-6: Stale Numbers

**Definition:** Artifact numbers (factory IDs, task type IDs, SK numbers, test counts) are written as static values that have drifted from live reality.

**Root cause:** Numbers are read at plan-creation time and written into the plan as literals. By session execution time, the live codebase has moved.

**Real examples (3 found):**
1. Test baseline: plan said "98 spec files" — should be "2,342 tests" (wrong metric type entirely)
2. Factory ID F1484 in plan — live CLAUDE.md showed F1339 at plan creation (wrong version used)
3. Task type T565 in plan — live CLAUDE.md showed T516 (same source error)

**Detection:**
```bash
grep -n "READ_FROM_LIVE_DOCS\|live canonical docs" plan.md
# Should appear for all artifact numbers in STATE.json template

grep -n "2342\|2,342\|spec files" plan.md
# Should NOT see "98 spec files" — should see ≥ 2,342 tests
```

**Fix:** Replace all static artifact numbers with live-read protocol: "Claude Code reads canonical docs at session start." STATE.json template should have `"READ_FROM_LIVE_DOCS"` not literal numbers.

---

## FC-7: Phase Placement

**Definition:** A skill is assigned to the wrong phase, or a moved skill still appears in its old phase.

**Root cause:** Moving a skill = delete from old phase + add to new phase. Only the add happens. Old reference becomes a phantom duplicate.

**Real examples (3 found):**
1. `skill-advisor-skill` was in Phase 3 in Rev 2 but moved to Phase 1 in Rev 3. Old Phase 3 reference not removed → appeared in both phases
2. `xiigen-core-principles-skill` load order position didn't match its phase placement
3. `plan-review-skill` deliverable count in Phase 2 header didn't match the actual file list

**Detection:**
```bash
grep -n "skill-advisor-skill" plan.md
# Phase Map entry, Deliverable block, and SESSION file must ALL say Phase 1

grep -n "xiigen-core-principles" plan.md
# All references must agree on Phase 2
```

**Fix:** After moving a skill, grep for its name and verify every reference agrees on the new phase.

---

## FC-8: Format Check

**Definition:** The plan document is missing required structural markers: REFERENCE label, Do NOT execute warning, State Recovery Protocol section, or `current_session` key in STATE template.

**Root cause:** Web-session plans (produced conversationally) lack the structural discipline of template-produced plans. Markers get dropped when sections are rewritten.

**Real examples (0 found — template enforced):**
- Hypothetical: plan produced without "DOCUMENT TYPE: REFERENCE" header → Claude Code treats it as executable script

**Detection:**
```bash
grep -n "REFERENCE\|Do NOT execute" plan.md
# Both must be present in the document header

grep -n "State Recovery Protocol\|current_session" plan.md
# State Recovery section must exist
```

**Fix:** Add the REFERENCE header and State Recovery Protocol section. Verify STATE.json template has `currentPhase` and `phaseStatus` keys.

---

## FC-9: Requirement Definitions

**Definition:** A requirement (R1–R8) exists but lacks a project-specific definition. Phrases like "TBD", "as needed", or "standard approach" are not definitions.

**Root cause:** Requirements copied from a generic template without being grounded in the actual tech stack. "UI e2e" means something different in NestJS than in React Native.

**Real examples (2 found):**
1. R2c "UI e2e" — undefined until Rev 3.0 post-review correction confirmed: NestJS TestingModule (phase9-lifecycle.spec.ts) = server e2e; @testing-library/react = client. No Playwright.
2. R8 "document in git" — no protocol until project-tracker-adapter added in Phase 1

**Detection:**
```python
requirements = ["R1", "R2a", "R2b", "R2c", "R2d", "R3", "R4", "R5", "R6", "R7", "R8"]

with open('plan.md') as f:
    content = f.read()

for req in requirements:
    if req not in content:
        print(f"FC-9: {req} not in plan")
    idx = content.find(req)
    snippet = content[idx:idx+200].lower()
    if any(term in snippet for term in ['npm', 'nestjs', 'testing-library', 'docker', 'itracker']):
        print(f"FC-9 PASS: {req} has project-specific definition")
    else:
        print(f"FC-9 CHECK: {req} may lack project-specific definition")
```

**Fix:** For each requirement, verify there is a concrete, technology-specific definition. "Unit tests" is not enough. "Jest unit tests in test/af-stations/*.spec.ts" is enough.

---

## FC-10: Propagation Failure

**Definition:** A fix was applied in one location but not propagated to all other locations containing the same value.

**Root cause:** Same value as FC-1 (caches), but generalized: applies to any repeated value, not just counts. The most common failure class (30% of all issues found).

**Real examples (7 found — most common failure class):**
- "98 spec files" fixed in overview but still present in Phase 12 session gate (×2)
- "9-step protocol" not updated to "10-step protocol" in infrastructure-discovery after Rev 3.3 added Step 0 (×2)
- "yarn build" not replaced with "npm run build" in 2 phase session gates
- "11 failure classes" not updated to "12" after FC-12 added — appeared in 9 cross-references across 5 files

**Detection:**
```bash
# After fixing "old_value" to "new_value":
grep -rn "old_value" plan.md .claude/skills/ 2>/dev/null
# Expected: 0 results

# Common stale values to check:
grep -rn "98 spec files\|yarn build\|yarn test\|claude-skill/\|11 failure classes" \
  plan.md .claude/skills/ 2>/dev/null
```

**Fix:** After every fix: grep for the OLD value across ALL files. Zero occurrences must remain. This is the 5-second check that catches what 7 rounds of reading missed.

---

## FC-11: Overview-Detail Match

**Definition:** A phase overview (header skill list) disagrees with its detail section (deliverable block, file list, or step count).

**Root cause:** Overview is written first (summary intent). Detail is written later (implementation reality). When implementation expands, only the detail gets updated.

**Real examples (3 found):**
1. Phase 6 header: "Skills: mental-debug" — detail showed both mental-debug AND code-examination-skill
2. Phase 2 header: "4 skills" — detail had 5 (v17 companion counted incorrectly)
3. Phase 3 file count: "Files: 2 SKILL.md + 2 AGENTS.md" — detail showed 2 SKILL.md + 2 AGENTS.md + 2 skill.yaml (missed skill.yaml in header count)

**Detection:**
```python
import re

with open('plan.md') as f:
    content = f.read()

for phase_num in range(1, 13):
    ph_start = content.find(f'### Phase {phase_num}')
    if ph_start == -1:
        continue
    ph_end = content.find(f'### Phase {phase_num+1}', ph_start)
    if ph_end == -1:
        ph_end = len(content)
    section = content[ph_start:ph_end]
    header_skills = re.findall(r'`([\w-]+)`\s+\((?:ADAPT|PORT|NEW|DRAFT)', section[:400])
    print(f"Phase {phase_num}: header mentions {len(header_skills)} skills: {header_skills}")
```

**Fix:** Re-read the detail section, then update the overview header to match. Detail is the source of truth.

---

## FC-12: Principles Compliance

**Definition:** The plan does not explicitly address all 8 foundational principles (P1–P8), or addresses them with "TBD" / "not applicable" without Luba sign-off.

**Root cause:** Principles added after plan was written. New plans don't pick them up because there is no mandatory checklist gate.

**Real examples (added as FC-12 in Rev 3.2 — first plan to include it):**
- Pre-Rev 3.2 plans: no P1 multi-tenant check → tenantId scope absent from new indexes
- Pre-Rev 3.2 plans: no P7 test path definition → "test locally" interpreted as "run npm test once"
- Pre-Rev 3.2 plans: no P3 PromptOps → new prompts hardcoded as static strings

**Detection:**
```bash
for p in P1 P2 P3 P4 P5 P6 P7 P8; do
    count=$(grep -c "${p}:" plan.md || echo 0)
    if [ "$count" -eq "0" ]; then
        echo "FC-12 FAIL: ${p} not addressed"
    else
        echo "FC-12 PASS: ${p} present (${count} references)"
    fi
done
```

**Fix:** Add a Principles Gate section to the plan answering all 8 questions. Any "N/A" requires explicit Luba sign-off that the principle is out of scope for this specific plan.

---

## Summary: 23 Issues Found, 7 Review Rounds

| Round | Issues Found | FC Classes |
|-------|-------------|-----------|
| 1 | 8 (paths, counts, test metric) | FC-1, FC-2, FC-6, FC-10 |
| 2 | 5 (phase placement, requirement gaps) | FC-7, FC-9, FC-10 |
| 3 | 4 (overview-detail, phantom) | FC-3, FC-11, FC-10 |
| 4 | 2 (propagation) | FC-10 |
| 5 | 2 (stale propagation from FC-12 add) | FC-10 |
| 6 | 1 (v17 companion not registered) | FC-5 |
| 7 | 1 (step count not propagated after Rev 3.3) | FC-10 |

**Key insight:** FC-10 (propagation) is the most common class (30% of issues). A single grep-for-old-value after every fix would have caught 7 of 23 issues immediately.
