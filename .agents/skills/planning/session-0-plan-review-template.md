# SESSION-0 — Plan Review Template

Run this template at the start of every new session before any code is written.
Three gates required. Stop after Gate A report. Do not proceed to Gate B without Luba review.

## Why SESSION-0 Exists

Claude Code can execute a broken plan at full speed. SESSION-0 is the last check before execution begins. It catches the 12 failure classes that survived content validation.

---

## STEP 1 — FC-1: Count Drift

```bash
# Find all skill/file count occurrences — all must be the same target number
grep -n "skill\|yaml\|files\|governance" dreamy-pondering-map.md \
  | grep -E "\b[0-9]+\b" \
  | grep -v "^Binary"
```

Expected: every count reference = 23 (skills) or consistent per category.
**FAIL if:** any count reference disagrees with the plan's stated totals.

---

## STEP 2 — FC-2: Path Errors

```bash
# Check for wrong path convention
grep -n "claude-skill\b" dreamy-pondering-map.md
grep -n "\.cursorrules" dreamy-pondering-map.md
# Should return 0 results
```

Expected: zero hits on wrong paths.

---

## STEP 3 — FC-3: Phantom Skills

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
```

---

## STEP 4 — FC-4: Duplicate Numbers

```python
import re
from collections import Counter

with open('dreamy-pondering-map.md') as f:
    content = f.read()

numbers = re.findall(r'^\s*(\d+)\.\s+\w', content, re.MULTILINE)
counts = Counter(numbers)
duplicates = {n: c for n, c in counts.items() if c > 1}
if duplicates:
    print(f"FC-4 DUPLICATES: {duplicates}")
else:
    print("FC-4: PASS")
```

---

## STEP 5 — FC-5: Skill Presence Matrix

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
```

---

## STEP 6 — FC-6: Stale Numbers

```bash
# Verify live-read protocol for artifact numbers
grep -n "READ_FROM_LIVE_DOCS\|live canonical docs" dreamy-pondering-map.md
# Should appear for all artifact numbers in STATE.json template
```

Verify test baseline is test COUNT (not file count):
```bash
grep -n "2342\|2,342\|spec files" dreamy-pondering-map.md
# Should not see "98 spec files" — should see ≥ 2,342 tests
```

---

## STEP 7 — FC-7: Phase Placement

```bash
# For skill-advisor-skill (moved to Phase 1 in Rev 3.1)
grep -n "skill-advisor-skill" dreamy-pondering-map.md
# Phase Map entry: Phase 1
# Deliverable block: Phase 1
# SESSION file: SESSION-1

# For xiigen-core-principles-skill (Phase 2, Rev 3.2)
grep -n "xiigen-core-principles" dreamy-pondering-map.md
```

All three references must agree on the same phase.

---

## STEP 8 — FC-8: Format Check

```bash
# Check REFERENCE label exists
grep -n "REFERENCE\|Do NOT execute" dreamy-pondering-map.md

# Check STATE Recovery Protocol section exists
grep -n "State Recovery Protocol\|current_session" dreamy-pondering-map.md
```

---

## STEP 9 — FC-9: Requirement Definitions

```python
requirements = ["R1", "R2a", "R2b", "R2c", "R2d", "R3", "R4", "R5", "R6", "R7", "R8"]

with open('dreamy-pondering-map.md') as f:
    content = f.read()

for req in requirements:
    if req not in content:
        print(f"FC-9: {req} not in plan")
    else:
        # Check it has a project-specific definition
        idx = content.find(req)
        snippet = content[idx:idx+200]
        if "npm\|nestjs\|@testing\|docker\|ITracker" not in snippet.lower():
            print(f"FC-9 CHECK: {req} may lack project-specific definition")
```

---

## STEP 10 — FC-10: Propagation Sweep

```bash
# After any fix, sweep for old values
# Common stale values to check:
grep -rn "98 spec files\|yarn build\|yarn test\|claude-skill/" \
  dreamy-pondering-map.md \
  .claude/skills/ 2>/dev/null
# Should return 0 results
```

---

## STEP 11 — FC-11: Overview-Detail Match

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

    header_skills = re.findall(r'`([\w-]+)`\s+\((?:ADAPT|PORT|NEW|DRAFT)', section[:400])
    print(f"Phase {phase_num}: header mentions {len(header_skills)} skills: {header_skills}")
```

---

## STEP 12 — FC-12: Principles Compliance

```bash
# Verify all 8 P-gate questions are addressed
for p in P1 P2 P3 P4 P5 P6 P7 P8; do
    count=$(grep -c "${p}:" dreamy-pondering-map.md || echo 0)
    if [ "$count" -eq "0" ]; then
        echo "FC-12 FAIL: ${p} not addressed"
    else
        echo "FC-12 PASS: ${p} present (${count} references)"
    fi
done
```

---

## SESSION-0 Delivery

After running all 12 steps, produce:

```markdown
## Gate A Report — [plan name] — [date]

| FC | Status | Detail |
|----|--------|--------|
| FC-1  | ✅ PASS / ❌ FAIL | [count found] |
| FC-2  | ✅ PASS / ❌ FAIL | [paths found] |
| FC-3  | ✅ PASS / ❌ FAIL | [phantoms found] |
| FC-4  | ✅ PASS / ❌ FAIL | [duplicates found] |
| FC-5  | ✅ PASS / ❌ FAIL | [missing cells] |
| FC-6  | ✅ PASS / ❌ FAIL | [stale numbers] |
| FC-7  | ✅ PASS / ❌ FAIL | [mismatches] |
| FC-8  | ✅ PASS / ❌ FAIL | [format issues] |
| FC-9  | ✅ PASS / ❌ FAIL | [ambiguous reqs] |
| FC-10 | ✅ PASS / ❌ FAIL | [stale propagations] |
| FC-11 | ✅ PASS / ❌ FAIL | [mismatches] |
| FC-12 | ✅ PASS / ❌ FAIL | [missing principles] |

### Gate A Result: [PASS / FAIL]
If FAIL: fix all failures before Gate B.

### ⛔ STOP — Present this report to Luba before Gate B
```
