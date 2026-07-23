---
name: plan-review-skill
version: "2.0.0"
sk_number: SK-410
priority: MANDATORY
load_order: 8
---

# Plan Review Skill — FC-1..FC-12, FC-22..FC-31 + 3-Gate Approval (v2.0.0)

A plan with count drift costs more to fix than to prevent. This skill prevents it.

## Origin

Extracted from the XIIGen skill migration planning session (March 2026). The plan went through 7 review rounds and 23 corrections before reaching consistency. All 12 failure classes below were found repeatedly — not once — meaning they are structural failure modes, not one-off mistakes.

## When to Invoke

- BEFORE handing any plan to Claude Code
- BEFORE declaring a plan "ready for approval"
- AFTER any plan edit that touches a number, a phase, or a skill list

One pass of this skill before handoff = zero "fix the count" cycles during execution.

---

## The Failure Classes (FC-1..FC-12, FC-22..FC-31 — v2.0.0)

### FC-1: Count Drift
A number is updated in one place but not in all places that reference the same count.

**Detection:**
```bash
grep -n "19\b\|20\b\|23\b" PLAN.md | grep -i "skill\|yaml\|governance\|references all"
# Every hit must be the same target number
```

### FC-2: Path Errors
File paths in the plan don't match actual codebase convention.

**Detection:**
```bash
grep -n "claude-skill\|\.claude/skills" PLAN.md | head -10
find . -type d -name "skills" | head -5  # verify actual path
```

### FC-3: Phantom Skills
A skill appears in the numbered load order but no phase creates it.

**Detection:**
```python
# For each skill in load order 1–N, verify a phase creates it
# grep -c "skill-name" PHASE_MAP — if 0 matches → PHANTOM
```

### FC-4: Duplicate Numbers
The same position number appears twice in a numbered list.

**Detection:**
```bash
grep -n "^[ ]*[0-9]\+\." PLAN.md | awk '{print $1}' | sort | uniq -d
# Any output = duplicate numbers
```

### FC-5: Missing Items in Lists
A skill exists in the plan but is absent from one or more required lists.

**Skill presence matrix (every cell must be filled):**

| skill-name | Phase Map | Deliverable | Load Order | B-0 List | Count |
|------------|-----------|-------------|------------|----------|-------|

### FC-6: Stale Numbers
A number in the plan references an older version of live data.

**Detection:**
```bash
# Check: artifact numbers from plan file vs live CLAUDE.md
# Check: test baseline is npx jest COUNT, not file count
# Check: line counts match wc -l output
```

### FC-7: Phase Placement Errors
A skill is in one phase in the Phase Map but a different phase in the deliverable block.

**Phase assignment matrix (all three must agree):**

| skill-name | Phase Map | Deliverable block | SESSION file |

### FC-8: Format Violations + Session File Self-Containment (expanded S4)
Plan is formatted for human reading, not Claude Code execution.

**Claude Code handoff checklist:**
- [ ] `STATE.json` exists with `current_session: 0`
- [ ] `SESSION-N-*.md` files exist (one per phase)
- [ ] Each SESSION file has: STEP N, exact paths, code blocks, SESSION GATE, ⛔ STOP
- [ ] REFERENCE plan is labeled "Do not execute"
- [ ] No single file mixes analysis with execution

**Session file self-containment checks (7 detection commands — all must return 0 hits):**

```bash
# Check 1: no cross-references
grep -n "see \|follow \|per the \|reference plan\|see skill\|apply P[0-9]" SESSION-*.md
# Expected: 0 hits

# Check 2: no undefined variables
grep -oP "\$\{[^}]+\}" SESSION-*.md | sort -u > /tmp/vars_used.txt
grep -oP "export [A-Z_]+=" SESSION-*.md | grep -oP "[A-Z_]+" | sort -u > /tmp/vars_defined.txt
comm -23 /tmp/vars_used.txt /tmp/vars_defined.txt
# Expected: empty (all vars defined in same file)

# Check 3: no principle references (must be quoted inline, not named)
grep -n "apply P[0-9]\|per P[0-9]\|see P[0-9]" SESSION-*.md
# Expected: 0 hits

# Check 4: no placeholders
grep -n "<[A-Z_]" SESSION-*.md | grep -v "Content-Type\|<!--"
# Expected: 0 hits

# Check 5: gate commands are literal (not prose descriptions)
grep -n "verify that\|check whether\|ensure the" SESSION-*.md
# Expected: 0 hits (gates use literal commands, not English descriptions)

# Check 6: no references to other skill files (Claude Code cannot load mid-execution)
grep -n "see.*SKILL\.md\|load.*SKILL\|per.*SKILL" SESSION-*.md
# Expected: 0 hits

# Check 7: API calls have full request body (no <placeholders>)
grep -n "<insert\|<fill\|<contract here\|<full " SESSION-*.md
# Expected: 0 hits
```

**FAIL if:** any check above returns hits. Non-conforming session files produce
hallucinated execution — Claude Code fills gaps with training data.

### FC-9: Requirement Ambiguity
A delivery requirement exists in the plan but has no project-specific "done" definition.

**Required definitions for XIIGen:**
- R1 compile + tests → `cd server && npm run build && npm test ≥ 2,342`
- R2c UI e2e → `@testing-library/react + @nestjs/testing = established convention`
- R2d docker → `fabric-coverage-matrix: ES+PG+SQS+LocalStack containers`
- R8 tracker → `ITrackerService + local-file default, FREEDOM swap`

### FC-10: Cross-Document Propagation Failure
A fix is applied to one document but the same fact exists in other documents that were not updated.

**After EVERY correction, sweep ALL documents:**
```bash
OLD="old_value"
for f in PLAN.md SESSION-*.md docs/*.md .claude/skills/**/*.md; do
    count=$(grep -c "$OLD" "$f" 2>/dev/null || echo 0)
    if [ "$count" -gt "0" ]; then
        echo "STALE in $f: $count occurrence(s)"
    fi
done
```

### FC-11: Overview-Detail Phase Mismatch
The overview description of a phase lists different skills than the detailed deliverable block for the same phase.

**Detection:**
```python
import re
# For each phase: extract header skill list vs deliverable folder tree
# They must match exactly
```

### FC-12: Foundational Principles Compliance (M1-M5 + P1-P22)
The plan does not explicitly answer the mission and implementation principle gate questions.
Updated in S4 (C-1) to cover M1-M5 (mission layer) and P1-P22 (implementation layer).

**Detection:**
```bash
for p in M1 M2 M3 M4 M5 P1 P2 P3 P4 P5 P6 P7 P8 P9 P10 P11 P12 P13 P14 P15 P16 P17 P18 P19 P20 P21 P22; do
    count=$(grep -c "${p}" PLAN.md || echo 0)
    if [ "$count" -eq "0" ]; then
        echo "FC-12: ${p} not addressed in plan"
    fi
done
# Note: M1-M5 in plan may appear as "every run must improve" etc. — principle
# name need not appear verbatim, but the concept must be addressed.
```

**Gate passes when:** All M1-M5 + P1-P22 principles are addressed or have Luba-signed N/A.

### FC-22: Learning Signal Check (LEARNING-001)

Every topology in `capabilityRouting[]` with `decision: FLOW` must satisfy all
three conditions:

1. `feedback.handler` node is present as the final node (or on every terminal branch)
2. `feedback.handler.learning_signals[]` is non-empty — minimum one OUTCOME signal
3. `LEARNING-001` check present in `topology.qualityGates[]`

**Detection:**
```bash
# Check 1: every FLOW topology has feedback.handler
for topo in $(grep -o 'flow-[0-9]*[a-z]-[a-z-]*' PLAN.md | sort -u); do
    if ! grep -q "feedback.handler" "contracts/topologies/${topo}.topology.json" 2>/dev/null; then
        echo "FC-22 FAIL: ${topo} missing feedback.handler"
    fi
done

# Check 2: feedback.handler has non-empty learning_signals[]
python3 -c "
import json, glob, sys
fails = 0
for f in glob.glob('contracts/topologies/**/*.topology.json', recursive=True):
    d = json.load(open(f))
    for node in d.get('nodes', {}).values():
        if node.get('handler') == 'feedback.handler':
            signals = node.get('learning_signals', [])
            if not signals:
                print(f'FC-22 FAIL: {f} feedback.handler has empty learning_signals[]')
                fails += 1
            elif not any(s.get('type') == 'OUTCOME' for s in signals):
                print(f'FC-22 FAIL: {f} feedback.handler missing OUTCOME signal')
                fails += 1
if fails == 0: print('FC-22 PASS: all topologies have OUTCOME learning signal')
sys.exit(fails)
"

# Check 3: LEARNING-001 in qualityGates
python3 -c "
import json, glob, sys
fails = 0
for f in glob.glob('contracts/topologies/**/*.topology.json', recursive=True):
    d = json.load(open(f))
    gates = d.get('qualityGates', [])
    if not any('LEARNING-001' in g for g in gates):
        print(f'FC-22 FAIL: {f} missing LEARNING-001 in qualityGates[]')
        fails += 1
if fails == 0: print('FC-22 PASS: all topologies have LEARNING-001 quality gate')
sys.exit(fails)
"
```

**Gate passes when:** Every FLOW topology has feedback.handler, OUTCOME signal,
and LEARNING-001 in qualityGates. A flow without learning signals is a static
function that cannot improve — this check ensures the improvement loop stays closed.

---

## The Review Protocol (steps cover FC-1..FC-12, FC-22..FC-31)

**Step 1** — Build the Skill Presence Matrix (FC-5)
**Step 2** — Verify Phase Assignments (FC-7)
**Step 3** — Count All Numbers (FC-1)
**Step 4** — Verify Paths (FC-2)
**Step 5** — Check Load Order (FC-3, FC-4)
**Step 6** — Verify Source of Numbers (FC-6)
**Step 7** — Format Check (FC-8)
**Step 8** — Requirement Definitions (FC-9)
**Step 9** — Cross-Document Propagation Sweep (FC-10)
**Step 10** — Overview-Detail Match (FC-11) + Principles Compliance (FC-12)

---

## Passing Criteria — Three Gates Required

A plan is ready for Claude Code execution only after ALL THREE gates pass:

**Gate A — FC Checks** (Claude Code runs Steps 1–10 in SESSION-0)
Gate A passes when:
```
✅ FC-1:  Count grep — single number, all occurrences match
✅ FC-2:  Path grep — zero wrong-convention paths
✅ FC-3:  Phantom skills — every numbered skill has a creating phase
✅ FC-4:  Duplicate numbers — no number appears twice
✅ FC-5:  Skill Presence Matrix — zero empty cells
✅ FC-6:  Stale numbers — every live-state number has live-read protocol
✅ FC-7:  Phase placement — Phase Map = Deliverable = SESSION file
✅ FC-8:  Format — self-containment, no cross-refs, all tables inline (expanded S4)
✅ FC-9:  Requirement definitions — every req has a project-specific done-definition
✅ FC-10: Propagation sweep — zero old-value hits across ALL documents
✅ FC-11: Overview-detail match — phase header list = deliverable block contents
✅ FC-12: Principles compliance — M1-M5 + P1-P22 (updated S4)
✅ FC-22: Learning signal check — every topology has OUTCOME signal
✅ FC-23: NODE completeness (v1.0.3)
✅ FC-24: Architecture decisions captured (v1.0.3)
✅ FC-25: Stack portability coverage (v1.0.3)
✅ FC-26: Arbiter panel completeness — min arbiters per archetype (v2.0.0)
✅ FC-27: Teaching data quality — curriculumTier + cross-model provenance (v2.0.0)
✅ FC-28: Session file self-containment — no cross-refs, all tables inline (v2.0.0)
✅ FC-29: Zero known defects gate — absolute test gate per P19 (v2.0.0)
✅ FC-30: Principles arbiter present in every panel — isolated (v2.0.0)
✅ FC-31: Machine constants in schemas/templates — no hardcoded model names (v2.0.0)
```

**Gate B — AI Cross-Review** (2 independent models, different from the plan author)
Different models catch different things. This is the CROSS_VALIDATE pattern from skill-advisor-skill applied to plan review.

**Gate C — Luba Written Approval**
Luba reviews Gate A results + Gate B findings. Writes explicit approval. Session 1 does NOT start without this.

---

## Anti-Patterns Table

| Anti-pattern | FC | Real cost |
|---|---|---|
| "I updated the count" (in one place) | 1 | 4 re-review rounds |
| Copying a path from memory | 2 | 42 files in wrong location |
| Conceptual placeholder in numbered list | 3 | Claude Code loads non-existent skill |
| Numbers from update targets mixed with new | 4 | Load order appears to have 24 skills instead of 18 |
| Adding a skill without updating all lists | 5 | Count says 23, B-0 generates 22 skill.yaml files |
| Using plan-time estimates for live counts | 6 | Gate passes on wrong baseline |
| Moving a skill without updating all three locations | 7 | SESSION builds in Phase 1; plan says Phase 3 |
| Sending a 1,100-line merged doc to Claude Code | 8 | Claude Code commits it as reference and stops |
| Generic requirement ("UI e2e") | 9 | Claude Code invents wrong definition |
| Fix in one doc, stale in others | 10 | Most frequent failure mode (30% of issues) |
| Phase header says 2 skills, deliverable has 3 | 11 | Count drift + phantom in execution |
| M1-M5 + P1-P22 not answered | 22 | Principles violations shipped to production |

---

## v1.0.3 ADDITIONS — Architectural Rethinking Checks (FC-23, FC-24, FC-25)

> Added: 2026-03-24 | Source: XIIGEN-ARCHITECTURAL-RETHINKING.md + XIIGEN-SKILLS-GAP-DOCUMENT.md

---

### FC-23: NODE Completeness

For every task type in `capabilityRouting[]` with `decision=FLOW`:

**Detection:**
```bash
# Every task type with decision=FLOW must have a node: block in the reference plan
python3 -c "
import re, sys
text = open('FLOW-XX-REFERENCE-PLAN.md').read()
task_ids = re.findall(r'decision.*?FLOW.*?(T\d+)', text)
for tid in task_ids:
    if 'node:' not in text[text.find(tid):text.find(tid)+2000]:
        print(f'FC-23 FAIL: {tid} missing node representation')
"
```

**Checklist:**
```
□ NODE representation exists in FLOW-XX-REFERENCE-PLAN.md for each task type
□ NODE has all four properties: structure, intent, constraints, quality
□ intent.domainConcepts[] is non-empty (stack-neutral concepts named)
□ constraints[] reference CF-N rules (not prose)
□ quality.scoringCriteria[] matches topology qualityGates[]
□ stackProfiles has entry for each target stack
□ No stack has tier=INCOMPATIBLE without a mitigation field
```

**FAIL if:** any task type missing NODE, or any NODE missing a required property.

---

### FC-24: Architecture Decisions Captured

For each significant design decision made in this planning session:

**Detection:**
```bash
ls FLOW-XX-ARCHITECTURE-DECISIONS.json 2>/dev/null || echo "FC-24 FAIL: file missing"
python3 -c "
import json
d = json.load(open('FLOW-XX-ARCHITECTURE-DECISIONS.json'))
for dec in d.get('decisions', []):
    missing = [f for f in ['type','teachingPoint','principleApplied'] if not dec.get(f)]
    if missing: print(f'FC-24 FAIL: {dec[\"decisionId\"]} missing {missing}')
"
```

**Checklist:**
```
□ FLOW-XX-ARCHITECTURE-DECISIONS.json exists
□ Contains entry for each: Q1-Q4 reclassification, INCOMPATIBLE reclassification,
  wave assignment (if non-obvious), iron rule derived from domain analysis,
  fabric interface introduced, cross-flow dependency identified
□ Each entry has: type, context, proposedRepresentation, challenges[],
  resolutions[], finalRepresentation, teachingPoint, principleApplied
□ Seeding command included in Phase A seeding script
```

**FAIL if:** file missing or any entry incomplete.

---

### FC-25: Stack Portability Coverage

For each task type with `tier: INCOMPATIBLE` on any stack:

**Detection:**
```bash
# Any INCOMPATIBLE without mitigation or abstraction-level review is a flag
grep -r "INCOMPATIBLE" server/src/engine-contracts/FLOW-XX-*.ts \
  | grep -v "mitigation\|IScheduler\|IQueue\|design-level\|mechanism-level" \
  | wc -l
# Any result > 0 warrants review
```

**Checklist:**
```
□ For each INCOMPATIBLE verdict: was the question asked:
  "Is this incompatibility at the mechanism level or the design level?"
□ Mechanism level → fabric interface exists or is planned (ISchedulerService, etc.)
□ Design level → documented in NODE.intent.domainConcepts[] with explanation
□ No task type has tier=INCOMPATIBLE on the primary target stack without
  explicit human decision
```

**FAIL if:** INCOMPATIBLE verdict exists without documented review of abstraction level.

---

## Updated Gate A — v1.0.3 and v2.0.0
> **Authoritative Gate A is the "Passing Criteria — Three Gates Required" block
> in the section above.** It contains the complete FC-1..FC-31 list.
> This section is preserved for historical reference only.
> v1.0.3 covered FC-1..FC-25. v2.0.0 adds FC-26..FC-31.

---

## v2.0.0 ADDITIONS — Arbiter Panel, Teaching Quality, Session Governance (FC-26, FC-27, FC-30)

> Added: 2026-03-25 | Source: XIIGen Skills Overhaul — Session 2

---

### FC-26: Arbiter Panel Completeness (P17)

For every topology with an `ai-generate.handler`, `multi-generate.handler`, or
`score.handler` node:

**Detection:**
```bash
python3 -c "
import json, glob, sys
fails = 0
archetype_minimums = {
    'ROUTING': ['business_logic','key_principles','iron_rules'],
    'DATA_PIPELINE': ['business_logic','security','key_principles','iron_rules'],
    'VALIDATION': ['business_logic','key_principles','iron_rules','completeness'],
    'TRANSACTION': ['business_logic','security','skills_patterns','prompts_compliance',
                    'key_principles','iron_rules','completeness'],
    'ORCHESTRATION': ['business_logic','security','skills_patterns','prompts_compliance',
                      'key_principles','iron_rules','completeness'],
    'SCHEDULED': ['business_logic','security','key_principles','iron_rules','completeness'],
}
for f in glob.glob('contracts/topologies/**/*.topology.json', recursive=True):
    try:
        d = json.load(open(f))
        archetype = d.get('archetype','ORCHESTRATION')
        required = archetype_minimums.get(archetype, archetype_minimums['ORCHESTRATION'])
        for nid, node in d.get('nodes', {}).items():
            if node.get('handler') in ('multi-generate.handler','score.handler'):
                arbiters = node.get('arbiters', {})
                present = list(arbiters.keys()) if isinstance(arbiters, dict) else []
                for req in required:
                    if req not in present:
                        print(f'FC-26 FAIL: {f} node {nid} missing {req} arbiter (archetype={archetype})')
                        fails += 1
                # Check principles arbiter isolation
                if 'key_principles' in arbiters:
                    if not arbiters['key_principles'].get('isolated'):
                        print(f'FC-26 FAIL: {f} node {nid} key_principles arbiter missing isolated:true')
                        fails += 1
    except Exception as e:
        print(f'FC-26 ERROR: {f}: {e}')
        fails += 1
if fails == 0: print('FC-26 PASS')
sys.exit(fails)
"
```

**Checklist:**
```
□ Every multi-generate.handler node has generators: [] with >= 2 entries
□ Every arbiter entry has: { model_token, expertise, blind: true }
□ key_principles arbiter has isolated: true (P20)
□ blockSemantics: ANY_BLOCK_CLASS_REJECTS present on arbiter-panel nodes
□ escalation arbiter entry present (or escalation orchestrator declared)
□ Minimum arbiters met for the contract's archetype (per SK-442 table)
□ contract.arbiterConfig field present (PATCH--contract-template-arbiter-config.md)
```

**FAIL if:** any required arbiter missing, or key_principles arbiter not isolated,
or arbiters block absent from a multi-generate/score node.

---

### FC-27: Teaching Data Quality (P18)

For every plan that includes Phase E:

**Detection:**
```bash
python3 -c "
import re, glob, sys
fails = 0
for f in glob.glob('sessions/**/SESSION-*.md', recursive=True):
    text = open(f).read()
    if 'xiigen-training-data' in text or 'DPO_TRIPLE' in text:
        # Check curriculumTier assigned
        if 'curriculumTier' not in text:
            print(f'FC-27 FAIL: {f} has DPO_TRIPLE signal but no curriculumTier assignment')
            fails += 1
        # Check cross-model provenance planned
        if 'modelComparison' not in text and 'chosen.model' not in text:
            print(f'FC-27 FAIL: {f} has DPO_TRIPLE signal but no cross-model provenance')
            fails += 1
if fails == 0: print('FC-27 PASS')
import sys; sys.exit(fails)
"
```

**Checklist:**
```
□ curriculumTier assignment is explicit per task type (use P18 tier table)
  T47=ROUTING=Tier1, T48=SCHEDULED=Tier5, T49=ORCHESTRATION=Tier4
□ Cross-model provenance plan visible: which providers run (min 2)
□ modelComparison field declared in feedback.handler DPO_TRIPLE signal
□ DPO validity gate referenced: chosen.model != rejected.model enforced
□ Shadow run placeholder creation step present (xiigen-shadow-runs)
□ V9-003 (curriculumTier non-null) not skipped
```

**Inline reference (self-containment):**
```
DPO REQUIRED FIELDS (P17+P18 — inline in every session file):
  curriculumTier:         integer in [1,2,3,4,5] — NEVER null
  chosen.model:           model family string — MUST differ from rejected.model
  rejected.model:         model family string — MUST differ from chosen.model
  modelComparison.shuffleWasApplied: true
  prompt.system:          full genesis prompt text — non-null
  targetModelFamily:      from FREEDOM config xiigen.oss_target_model
  instructionFormat:      'deepseek-coder' | 'chatml' | 'alpaca'
  distillationReadiness:  'READY' | 'TOO_COMPLEX' | 'PENDING_SIMPLIFICATION'
```

**FAIL if:** curriculumTier not assigned, no cross-model provenance plan,
or V9 checks marked as skipped.

---

### FC-30: Principles Arbiter Present in Every Arbiter Panel (P20)

For every topology with an `arbiter-panel.handler` node:

**Detection:**
```bash
python3 -c "
import json, glob, sys
fails = 0
for f in glob.glob('contracts/topologies/**/*.topology.json', recursive=True):
    try:
        d = json.load(open(f))
        for nid, node in d.get('nodes', {}).items():
            if node.get('handler') == 'arbiter-panel.handler':
                arbiters = node.get('arbiters', {})
                if 'key_principles' not in (arbiters.keys() if isinstance(arbiters, dict) else []):
                    print(f'FC-30 FAIL: {f} node {nid} missing key_principles arbiter — P20 violated')
                    fails += 1
                elif not (arbiters.get('key_principles', {}).get('isolated')):
                    print(f'FC-30 FAIL: {f} node {nid} key_principles arbiter not isolated — P20 violated')
                    fails += 1
    except Exception as e:
        print(f'FC-30 ERROR: {f}: {e}')
if fails == 0: print('FC-30 PASS')
sys.exit(fails)
"
```

**Checklist:**
```
□ key_principles arbiter present in every arbiter-panel.handler node
□ key_principles.isolated: true — no domain context in its package
□ key_principles.expertise: "M1-M5 + P1-P22 + DNA-1..9 full text"
□ BLOCK verdict class (not ADVISORY) declared for key_principles
□ contract.arbiterConfig.evaluatorArbiters.key_principles present
□ Principles Arbiter context does NOT include iron_rules, RAG patterns,
  security patterns, or task type / archetype / flow ID
```

**FAIL if:** any arbiter-panel node missing key_principles, or isolation not declared.

---

### FC-28: Session File Self-Containment (P-plan — S4)

Ensures every Claude Code session file is executable in isolation, with no reference
to any other document.

**Detection (run against every SESSION-N.md before delivery):**
```bash
# All 7 checks from FC-8 self-containment section above apply here.
# FC-28 additionally checks that MANDATORY INLINE REFERENCES are present:

# Check: DPO required fields inlined (for any session touching generation)
grep -l "flow/execute\|training-data" SESSION-*.md | while read f; do
    for term in "curriculumTier" "modelComparison" "chosen.model" "targetModelFamily"; do
        grep -q "$term" "$f" || echo "FC-28 FAIL: $f missing inline DPO field: $term"
    done
done

# Check: curriculum tier table inlined
grep -q "ROUTING.*Tier\|Tier.*ROUTING" SESSION-*.md ||     echo "FC-28 FAIL: curriculum tier table not inlined in session files"

# Check: arbiter panel inlined (for any session with arbiter configuration)
grep -q "arbiterConfig\|evaluatorArbiters" SESSION-*.md || true  # optional if no arbiter work
```

**Checklist:**
```
□ Zero cross-references to other documents (FC-8 checks pass)
□ DPO triple required fields (P17+P18) inlined in every session touching generation
□ Curriculum tier table inlined where curriculumTier is assigned
□ Arbiter panel configuration inlined where arbiterConfig is written
□ Score bracket table inlined in every Phase B session
□ All principles invoked are quoted inline, not referenced by name
```

**FAIL if:** any session file requires reading another document to execute.

---

### FC-29: Zero Known Defects Gate (P19 — S4)

Every session plan must include ISSUE INVENTORY and use absolute test gate (not delta).

**Detection:**
```bash
# Check: ISSUE INVENTORY step present before every ⛔ STOP
for f in SESSION-*.md; do
    if grep -q "⛔ STOP" "$f" && ! grep -q "ISSUE INVENTORY" "$f"; then
        echo "FC-29 FAIL: $f has ⛔ STOP but no ISSUE INVENTORY step"
    fi
done

# Check: test gate uses absolute pass (failures === 0), not delta (no regressions)
grep -n "no regressions\|no new failures\|baseline" SESSION-*.md | grep -v "record.*baseline\|establish.*baseline"
# Expected: 0 hits (should use: failures === 0)
```

**Checklist:**
```
□ ISSUE INVENTORY step is present before every ⛔ STOP marker
□ ISSUE INVENTORY format: issue | FIXED | DEFERRED (reason) | Guard added
□ Test gate uses failures === 0 (absolute), not "no regressions" (delta)
□ Each test skip has documented justification
□ "pre-existing" banned as a status — only FIXED or DEFERRED with reason
```

**FAIL if:** any session file's ⛔ STOP has no preceding ISSUE INVENTORY, or any
test gate uses delta semantics instead of absolute.

---

### FC-31: Machine Constants in Schemas and Templates (D-EXT-009 — S4)

No schema definition, fixture template, or prompt template contains a hardcoded
model name, provider name, or API endpoint URL.

**Detection:**
```bash
grep -rn "deepseek\|gpt-4\|claude-opus\|claude-sonnet\|gemini-pro\|api\.anthropic\.com\|openai\.com\|googleapis\.com\|localhost:[0-9]{4,5}/api/" \
  .claude/skills/ fixtures/ contracts/ \
  | grep -v "FREEDOM config\|xiigen\.\|default:\|# Expected\|# Check" \
  | grep -v ".spec."
# Expected: 0 hits
```

**Checklist:**
```
□ All model names in schemas read from FREEDOM config key with default fallback
□ All provider names in fixtures reference token constants (AI_ENGINE), not strings
□ No hardcoded API endpoint URLs in session files or prompts
□ D-EXT-009 pattern: freedomConfig.get('xiigen.key') ?? 'fallback-value'
□ FC-31 scope clarification: score thresholds (0.85, 0.90) are candidates too —
  add FREEDOM config keys for score thresholds if they appear as literals
```

**FAIL if:** any literal model name, provider name, or API endpoint appears in a
schema, template, or fixture without a FREEDOM config reference.

---

### PATCH FORMAT STANDARD (applies to all PATCH--*.md files)

Every `PATCH--*.md` that instructs code changes must follow this structure:

```
## HOW TO APPLY

### Pre-flight (verify before touching any code)
□ [Dependency]: verify import resolves → command to check
□ [Dependency]: verify token is registered → command to check

### Change 1 — [File name]
[exact change instructions]

### Change 2 — [File name]
[exact change instructions]

### Post-flight (verify after all changes)
□ npx tsc --noEmit → 0 new errors in changed files
□ pnpm test → failures === 0 AND each skip documented (HEALTH-001 absolute gate)
□ [Specific functionality check]
```

**FAIL if:** any `PATCH--*.md` has `## HOW TO APPLY` but no explicit `### Pre-flight`
and `### Post-flight` sections.

---

## Updated Gate A — Full Passing Criteria (v2.0.0)

```
✅ FC-1:  Count grep
✅ FC-2:  Path grep
✅ FC-3:  Phantom skills
✅ FC-4:  Duplicate numbers
✅ FC-5:  Skill Presence Matrix
✅ FC-6:  Stale numbers
✅ FC-7:  Phase placement
✅ FC-8:  Format (self-containment — expanded in S4)
✅ FC-9:  Requirement definitions
✅ FC-10: Propagation sweep
✅ FC-11: Overview-detail match
✅ FC-12: Principles compliance (M1-M5 + P1-P22 — updated in S4)
✅ FC-22: Learning signal check
✅ FC-23: NODE completeness (v1.0.3)
✅ FC-24: Architecture decisions captured (v1.0.3)
✅ FC-25: Stack portability coverage (v1.0.3)
✅ FC-26: Arbiter panel completeness (v2.0.0)
✅ FC-27: Teaching data quality — curriculumTier + cross-model (v2.0.0)
✅ FC-28: Session file self-containment (v2.0.0)
✅ FC-29: Zero known defects gate (v2.0.0)
✅ FC-30: Principles arbiter present in every panel (v2.0.0)
✅ FC-31: Machine constants in schemas/templates (v2.0.0)
```
