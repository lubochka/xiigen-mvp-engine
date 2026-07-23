# INTEGRATION INSTRUCTIONS — v3.0.0
## Supersedes: v2.0.0 (2026-03-25)
## Date: 2026-03-26
## What's new: 6 URGENT skill files, plan-review patch (FC-13..FC-21),
##             updated session start prompt, updated skill index

---

## STEP 1: COPY NEW SKILL FILES

```bash
cd /path/to/xiigen-mvp

# URGENT tier — copy first, needed before Phase B
cp code-execution--score-interpretation-SKILL.md      .claude/skills/code-execution/
cp code-execution--prompt-patch-authoring-SKILL.md    .claude/skills/code-execution/
cp code-execution--test-failure-triage-SKILL.md       .claude/skills/code-execution/
cp code-execution--generated-code-review-SKILL.md     .claude/skills/code-execution/
cp code-execution--score-zero-investigation-SKILL.md  .claude/skills/code-execution/
cp planning--qa-session-type-SKILL.md                 .claude/skills/planning/
```

---

## STEP 2: APPLY PLAN-REVIEW PATCH

Apply `PATCH--plan-review-FC-13-to-FC-21.md` to insert FC-13..FC-21 into
`planning--plan-review-SKILL.md`. Follow the HOW TO APPLY section in the patch
file exactly.

```bash
# After applying, verify
for i in 13 14 15 16 17 18 19 20 21; do
  grep -c "^### FC-${i}:" .claude/skills/planning/planning--plan-review-SKILL.md \
    | grep -q "^[1-9]" \
    && echo "✅ FC-${i}" || echo "❌ FC-${i} MISSING — re-apply patch"
done

# Verify version bump
grep "^version:" .claude/skills/planning/planning--plan-review-SKILL.md
# Expected: "2.1.0"
```

---

## STEP 3: REPLACE INDEX AND SESSION PROMPT

```bash
# Replace skill index
cp FLOW-DESIGN-SKILL-INDEX-v3.0.0.md .claude/skills/FLOW-DESIGN-SKILL-INDEX.md

# Replace session start prompt
cp XIIGEN-SESSION-START-PROMPT-v4.md .claude/XIIGEN-SESSION-START-PROMPT.md
```

---

## STEP 4: UPDATE AGENTS.MD

Add to `.claude/AGENTS.md` skill loading section (after v2.5.0 entries):

```markdown
## v3.0.0 FLOW DESIGN SKILLS — URGENT TIER
## Load before Phase B of any flow

load_order  0: code-execution--score-zero-investigation-SKILL.md  (score-0 found)
load_order  0: code-execution--test-failure-triage-SKILL.md        (test failures)
load_order  0: planning--qa-session-type-SKILL.md                  (phase approval)
load_order  2: code-execution--score-interpretation-SKILL.md       (Phase B score output)
load_order  3: code-execution--prompt-patch-authoring-SKILL.md     (before PromptPatch)
load_order  3: code-execution--generated-code-review-SKILL.md      (after Phase B generates)
```

---

## STEP 5: VERIFY INSTALLATION

```bash
# All 6 URGENT skills present
for skill in score-interpretation prompt-patch-authoring test-failure-triage \
  generated-code-review score-zero-investigation qa-session-type; do
  find .claude/skills -name "*${skill}*" | head -1 \
    && echo "✅ ${skill}" \
    || echo "❌ MISSING: ${skill}"
done

# Session start prompt updated
grep "Next available SK: SK-492" .claude/XIIGEN-SESSION-START-PROMPT.md \
  && echo "✅ Session prompt SK number correct" \
  || echo "❌ Session prompt still shows wrong SK number"

# plan-review version
grep "version: \"2.1.0\"" .claude/skills/planning/planning--plan-review-SKILL.md \
  && echo "✅ plan-review patched" \
  || echo "❌ plan-review not patched"

# Skill index updated
grep "v3.0.0" .claude/skills/FLOW-DESIGN-SKILL-INDEX.md \
  && echo "✅ Skill index is v3.0.0" \
  || echo "❌ Skill index is old version"
```

---

## DEFERRED ITEMS — v3.0.0 (not in this package)

| Item | Depends on | Unblocks |
|------|-----------|---------|
| SK-476 test-strategy-design | None — author now | Phase D test authoring |
| SK-477 behavioral-test-generation | SK-476 | Phase D correct test authoring |
| SK-478 cross-flow-regression | FLOW-01 ACTIVE | Wave 2 regression detection |
| SK-479 training-data-quality-audit | Phase E triples exist | DPO semantic quality |
| SK-480 genesis-prompt-authoring | None — author now | Phase B generation quality |
| SK-481 (QA) HOW-TO-USE update | This package | HOW-TO-USE v2.6.0 |
| SK-482 acceptance-criteria-derivation | None — author now | Pre-implementation criteria |
| SK-483 review-cycle-management | None — author now | All correction cycles |
| SK-484..SK-486 | None | Debug/contract authoring |
| SK-487 design-to-code-verification | Feature C-4 (IFigmaService) | Figma compliance |
| SK-488..SK-491 | Phase 9 React Native | Client development |
| HOW-TO-USE v2.6.0 | SK-481 + SK-483 session type additions | Complete governance chain |
