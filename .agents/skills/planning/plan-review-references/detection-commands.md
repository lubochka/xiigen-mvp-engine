# Detection Commands — Reusable Templates

Bash and Python templates for detecting all 12 failure classes. Adapt by replacing: file paths, skill names, section markers, counts, paths, and requirements for your project.

---

## FC-1: Count Drift — Find All Count References

```bash
# Find all count references in the plan
grep -n "skill\|yaml\|files\|governance" dreamy-pondering-map.md \
  | grep -E "\b[0-9]+\b" \
  | grep -v "^Binary"

# Verify all count references equal the expected total (e.g., 23 skills)
grep -n "23\|new skill\|skill.yaml" dreamy-pondering-map.md
# Every count reference must agree — any disagreement = FC-1 FAIL
```

**Adapt for your project:** Replace `dreamy-pondering-map.md` with your plan file. Replace `23` with your actual skill count. The pattern `\b[0-9]+\b` finds any number — filter to your domain.

---

## FC-2: Path Convention Check

```bash
# Check for wrong path convention (adapt old/new paths for your project)
grep -n "claude-skill\b" dreamy-pondering-map.md
grep -n "\.cursorrules" dreamy-pondering-map.md
# Should return 0 results — both are wrong conventions for XIIGen

# Verify actual path convention from live codebase
find . -name "SKILL.md" | head -5
# Output shows actual convention — compare to plan references
```

**Adapt for your project:** Replace `claude-skill` with whatever wrong-path convention your project might inherit from a previous project. Run `find` to get the ground truth.

---

## FC-3: Phantom Skill Detection

```python
import re

with open('dreamy-pondering-map.md') as f:
    content = f.read()

# Extract numbered load order skills
load_order = re.findall(r'^\s*(\d+)\.\s+([\w-]+)', content, re.MULTILINE)

# For each, check a phase creates it
for num, skill in load_order:
    count = content.count(f'`{skill}`') + content.count(f"'{skill}'")
    phase_ref = bool(re.search(rf'Phase \d.*{skill}|{skill}.*Phase \d', content))
    if not phase_ref:
        print(f"FC-3 POSSIBLE PHANTOM: #{num} {skill}")
    else:
        print(f"FC-3 OK: #{num} {skill} (phase assigned)")
```

**Adapt:** Replace `dreamy-pondering-map.md` with your plan file. The regex `Phase \d.*{skill}` catches "Phase 1 — skill-name". Adjust the pattern if your phase headings use different format.

---

## FC-4: Duplicate Number Detection

```python
import re
from collections import Counter

with open('dreamy-pondering-map.md') as f:
    content = f.read()

# Find numbered list items (e.g., "1. skill-name")
numbers = re.findall(r'^\s*(\d+)\.\s+\w', content, re.MULTILINE)
counts = Counter(numbers)
duplicates = {n: c for n, c in counts.items() if c > 1}

if duplicates:
    print(f"FC-4 DUPLICATES: {duplicates}")
else:
    print("FC-4: PASS — no duplicate numbers")
```

**Adapt:** This checks numbered lists. For SK-numbers specifically: `re.findall(r'SK-(\d+)', content)`. For factory IDs: `re.findall(r'F(\d+)', content)`.

---

## FC-5: Skill Presence Matrix

```python
# For each of the 23 new skills, verify presence in:
# Phase Map, Deliverable block, Load Order, B-0 list, Summary count
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

with open('dreamy-pondering-map.md') as f:
    content = f.read()

for skill in skills:
    count = content.count(skill)
    if count < 3:
        print(f"FC-5 POSSIBLY MISSING: {skill} (only {count} references)")
    else:
        print(f"FC-5 OK: {skill} ({count} references)")
```

**Adapt:** Replace the `skills` list with your actual skill names. Threshold `< 3` assumes: phase header + load order + B-0 list = minimum 3 references. Increase threshold if your plan has more required sections.

---

## FC-6: Stale Numbers — Live-Read Protocol Verification

```bash
# Verify live-read protocol is in place (not static numbers)
grep -n "READ_FROM_LIVE_DOCS\|live canonical docs" dreamy-pondering-map.md
# Should appear for all artifact numbers in STATE.json template

# Verify test baseline is test COUNT (not file count)
grep -n "2342\|2,342\|spec files" dreamy-pondering-map.md
# Should NOT see "98 spec files" — should see ≥ 2,342 tests

# Check for old version artifact IDs
grep -n "F1484\|T565\|SK-302" dreamy-pondering-map.md
# Should return 0 — these are wrong version numbers
```

**Adapt:** Replace `2342`, `F1484`, `T565`, `SK-302` with whatever stale values you want to detect. The key check: `READ_FROM_LIVE_DOCS` should appear in STATE.json for every artifact number field.

---

## FC-7: Phase Placement Verification

```bash
# For skill-advisor-skill (moved to Phase 1 in Rev 3.1)
grep -n "skill-advisor-skill" dreamy-pondering-map.md
# Phase Map entry: Phase 1
# Deliverable block: Phase 1
# SESSION file: SESSION-1 (if separate session files exist)

# For xiigen-core-principles-skill (Phase 2, Rev 3.2)
grep -n "xiigen-core-principles" dreamy-pondering-map.md
# All references must say Phase 2

# For plan-review-skill (Phase 2, Rev 3.2)
grep -n "plan-review-skill" dreamy-pondering-map.md
# All references must say Phase 2
```

**Adapt:** For each skill that was moved between phases, verify all references agree on the final phase. Old phase references should be absent (zero hits).

---

## FC-8: Format Check — Required Structural Markers

```bash
# Check REFERENCE label exists (prevents Claude treating plan as executable script)
grep -n "REFERENCE\|Do NOT execute" dreamy-pondering-map.md

# Check State Recovery Protocol section exists
grep -n "State Recovery Protocol\|current_session\|currentPhase" dreamy-pondering-map.md

# Check ⛔ STOP markers exist (one per phase)
grep -c "⛔ STOP" dreamy-pondering-map.md
# Should equal number of phases (12 for this plan)
```

**Adapt:** Required markers depend on your plan template. At minimum: REFERENCE header, State Recovery Protocol, ⛔ STOP per phase.

---

## FC-9: Requirement Definitions — No TBD or Generic Phrases

```python
requirements = ["R1", "R2a", "R2b", "R2c", "R2d", "R3", "R4", "R5", "R6", "R7", "R8"]

with open('dreamy-pondering-map.md') as f:
    content = f.read()

# Project-specific terms that indicate a concrete definition
project_terms = ['npm', 'nestjs', '@testing', 'docker', 'itracker', 'jest',
                 'testing-library', 'spec.ts', 'dataprocessresult']

for req in requirements:
    if req not in content:
        print(f"FC-9 FAIL: {req} not in plan")
        continue
    idx = content.find(req)
    snippet = content[idx:idx+300].lower()
    found_terms = [t for t in project_terms if t in snippet]
    if found_terms:
        print(f"FC-9 PASS: {req} — has project-specific terms: {found_terms}")
    else:
        print(f"FC-9 CHECK: {req} — may lack project-specific definition (no tech terms found near definition)")
```

**Adapt:** Replace `requirements` with your requirement IDs. Replace `project_terms` with technology-specific terms from your stack. The check finds whether a concrete tech term appears near each requirement definition.

---

## FC-10: Propagation Sweep — After Every Fix

```bash
# ALWAYS run this after any fix. Replace OLD_VALUE with the actual old value.
grep -rn "OLD_VALUE" dreamy-pondering-map.md .claude/skills/ 2>/dev/null
# Expected: 0 results

# Common stale values to check (XIIGen-specific):
grep -rn "98 spec files\|yarn build\|yarn test\|claude-skill/" \
  dreamy-pondering-map.md .claude/skills/ 2>/dev/null

grep -rn "11 failure classes\|9-step protocol\|9 steps" \
  dreamy-pondering-map.md .claude/skills/ 2>/dev/null

grep -rn "F1484\|T565\|SK-30[0-9]\b" \
  dreamy-pondering-map.md .claude/skills/ 2>/dev/null

# Expected for all: 0 results
```

**Adapt:** Add your project's stale values. This sweep should run after EVERY value change — not just at review time. The cost is 2 seconds. The benefit is catching what human review misses.

---

## FC-11: Overview-Detail Match

```python
import re

with open('dreamy-pondering-map.md') as f:
    content = f.read()

# For each phase, extract header skill list and count deliverable folders
for phase_num in range(1, 13):
    ph_start = content.find(f'### Phase {phase_num}')
    if ph_start == -1:
        continue
    ph_end = content.find(f'### Phase {phase_num+1}', ph_start)
    if ph_end == -1:
        ph_end = len(content)
    section = content[ph_start:ph_end]

    # Skills listed in the header (within first 400 chars of the section)
    header_skills = re.findall(r'`([\w-]+)`\s+\((?:ADAPT|PORT|NEW|DRAFT)', section[:400])
    print(f"Phase {phase_num}: header mentions {len(header_skills)} skills: {header_skills}")

    # Count skill mentions in body (anywhere after header)
    body_skills = re.findall(r'`([\w-]+)`\s+\((?:ADAPT|PORT|NEW|DRAFT)', section[400:])
    if len(body_skills) != len(header_skills):
        print(f"  ⚠️  FC-11 MISMATCH: header={len(header_skills)}, body={len(body_skills)}")
```

**Adapt:** Replace `### Phase {phase_num}` with your section heading format. Adjust the regex `ADAPT|PORT|NEW|DRAFT` to match your skill status tags.

---

## FC-12: Principles Compliance

```bash
# Verify all 8 P-gate questions are addressed in the plan
for p in P1 P2 P3 P4 P5 P6 P7 P8; do
    count=$(grep -c "${p}:" dreamy-pondering-map.md 2>/dev/null || echo 0)
    if [ "$count" -eq "0" ]; then
        echo "FC-12 FAIL: ${p} not addressed in plan"
    else
        echo "FC-12 PASS: ${p} present (${count} references)"
    fi
done
```

```python
# Extended FC-12: verify P1-P8 have project-specific answers (not just mentioned)
principles = {
    'P1': ['tenantid', 'asynclocalstorage', 'tenant'],
    'P2': ['isecretsservice', 'freedom', 'machine'],
    'P3': ['promptasset', 'af-9', 'judge'],
    'P4': ['ragservice', '19200', 'local rag'],
    'P5': ['af-11', 'skillsactive', 'scoredelta'],
    'P6': ['bfa', 'flow-25', 'bfaregistration'],
    'P7': ['npm test', 'docker', 'nestjs/testing'],
    'P8': ['otel', 'token', 'ollama']
}

with open('dreamy-pondering-map.md') as f:
    content = f.read().lower()

for principle, terms in principles.items():
    found = [t for t in terms if t in content]
    if not found:
        print(f"FC-12 CHECK: {principle} — no project-specific terms found ({terms})")
    else:
        print(f"FC-12 PASS: {principle} — found terms: {found}")
```

**Adapt:** Replace the `principles` dict values with technology terms from your stack that prove each principle has a project-specific answer.

---

## Combined Quick Sweep (run before every Gate A report)

```bash
#!/bin/bash
# FC-2, FC-6, FC-10 combined — most common automated catches

PLAN="dreamy-pondering-map.md"
SKILLS=".claude/skills"

echo "=== FC-2: Path convention ==="
grep -n "claude-skill\b" "$PLAN" && echo "FAIL" || echo "PASS"

echo "=== FC-6: Stale test metric ==="
grep -n "98 spec files\|yarn build\|yarn test" "$PLAN" && echo "FAIL" || echo "PASS"

echo "=== FC-10: Propagation sweep ==="
grep -rn "11 failure classes\|9-step protocol" "$PLAN" "$SKILLS" 2>/dev/null && echo "FAIL" || echo "PASS"

echo "=== FC-12: Principles gate ==="
for p in P1 P2 P3 P4 P5 P6 P7 P8; do
    count=$(grep -c "${p}:" "$PLAN" 2>/dev/null || echo 0)
    [ "$count" -eq "0" ] && echo "FC-12 FAIL: ${p}" || echo "FC-12 PASS: ${p} (${count}x)"
done
```

Run this sweep before producing any Gate A report. Expected: all PASS, zero FAIL lines.
