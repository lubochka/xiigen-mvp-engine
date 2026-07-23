---
name: work-scope-inventory
version: "1.0.0"
sk_number: SK-543
priority: MANDATORY
load_order: 0
category: planning
updated: "2026-04-21"
contexts: ["web-session", "claude-code"]
---

# SK-543 Work Scope Inventory — Denominator before numerator

A session that improves 5 flows without knowing there are 48 has not made
fleet-level progress. It has made local progress on an unknown fraction of the work.
This skill installs the denominator before any work begins.

## Origin

Extracted from the session corpus where a session reported "22 to 8 offenses,
-63.6%" after examining 5 of 48 flows using grep pattern counts against TypeScript
source. Three failure modes compounded: no denominator established, wrong measurement
unit used, and CFI-07 showed FLOW-32 was blocked — the session improved it anyway.
The -63.6% claim was not wrong about what it measured. It was wrong about what it
meant. This skill prevents the scope from being undefined when work begins.

## When to Invoke

- Before any UI/UX session touches an individual flow
- Before any fleet-level improvement claim
- Before any ⛔ STOP that reports a percentage reduction in offenses, errors, or defects
- At session start for any MATERIALIZATION or GENERATION session touching React pages

One run of this skill before work begins = no overclaimed fleet-level improvement claims.

---

## Section 1 — The STATE.scope Block

Before any file in `client/src/pages/` or `docs/screen-examination/` is touched,
the session produces a STATE.scope block and saves it to STATE.

```json
{
  "scope": {
    "totalFlows": 48,
    "doneCount": 0,
    "partialCount": 0,
    "blockedCount": 0,
    "notStartedCount": 0,
    "thisSessionCovers": [],
    "denominator": "N of 48 flows (M blocked → N of (48-M) eligible)",
    "capturedAt": "turn 1"
  }
}
```

**Rule:** A session that cannot produce STATE.scope is not permitted to claim
improvement at the fleet level. It can claim improvement at the individual flow
level only for flows it has fully audited in this session.

---

## Section 2 — The Six-Count Protocol

Before the first file is touched, establish all six counts.

### Count 1 — Total item count

The fleet is always 48 flows (per `planning--business-flows-registry.md`).
If scope is narrower (e.g., a single batch), state the batch total explicitly:
"This session covers BATCH-08: 6 flows (FLOW-35..FLOW-40)."
The fleet total of 48 remains the denominator for any fleet-level claim.

### Count 2 — Done count

A flow is done when its examination record exists AND contains an APPROVED grade.

```bash
# Count flows with examination records
ls docs/screen-examination/*-examination.md 2>/dev/null | wc -l

# Count flows with APPROVED grade
grep -l "^grade: APPROVED\|Grade: APPROVED\|overall_grade.*APPROVED" \
  docs/screen-examination/*-examination.md 2>/dev/null | wc -l
```

### Count 3 — Partial count

A flow is partial when an examination record exists but does not contain APPROVED.

```bash
# Partial = has examination record but not APPROVED
TOTAL=$(ls docs/screen-examination/*-examination.md 2>/dev/null | wc -l)
APPROVED=$(grep -l "APPROVED" docs/screen-examination/*-examination.md 2>/dev/null | wc -l)
echo "Partial: $((TOTAL - APPROVED))"
```

### Count 4 — Blocked count

A flow is blocked when an open CFI explicitly prevents work on it.

Blocked flows as of 2026-04-21 (from CFI-12 in SESSION-LOAD-PLAN v32):
- FLOW-04 (F1 spec gap — event attendance vs. DPO capture)
- FLOW-09 (F1 spec gap — ticketing vs. RAG pattern extraction)
- FLOW-34 (F1 spec gap — plugin marketplace vs. AI Agent Orchestration)

```bash
# Check current CFI-12 status before assuming block list is current
grep -A 10 "CFI-12" XIIGEN-SESSION-LOAD-PLAN-v32.md | head -12
```

Update the blocked count if CFIs have been resolved since this skill was authored.

### Count 5 — Not-started count

```
not_started = total - done - partial - blocked
```

### Count 6 — The denominator

State explicitly what fraction of the fleet this session covers:

```
Denominator: [thisSessionFlowCount] of [48 - blockedCount] eligible flows
             ([thisSessionFlowCount / (48 - blockedCount) * 100]% of eligible fleet)
```

---

## Section 3 — STATE.scope Template

```markdown
## STATE.scope — Work Scope Inventory (SK-543)

Fleet total:      48 flows
Done (APPROVED):  [N] flows
Partial:          [N] flows
Blocked (CFI):    [N] flows — [list flow IDs]
Not started:      [N] flows

This session covers: [list flow IDs or batch name]
Session count:    [N] of [48 - blocked] eligible flows
Denominator:      [N / (48 - blocked_count) * 100]% of eligible fleet

Claim authority:
  Fleet-level:    NOT ESTABLISHED (session covers < 20% of eligible fleet)
  OR
  Fleet-level:    ESTABLISHED (session covers ≥ 20% of eligible fleet per SK-546)
  Flow-level:     ESTABLISHED for [list flows fully audited this session]
```

---

## Section 4 — Claim Authority Rules

The STATE.scope block determines what claims the session is permitted to make
at ⛔ STOP.

| Session covers | Permitted claim |
|---------------|-----------------|
| 1 flow, fully audited | "FLOW-XX UI improved" |
| N flows, all fully audited | "These N flows improved" |
| ≥ 20% of eligible fleet, all fully audited | "UI/UX fleet is improving" (per SK-546) |
| < 20% of eligible fleet | Flow-level claims only — no fleet-level claims |
| Any session without STATE.scope | No improvement claims at any level |

**"Fully audited" means:** SK-541 four-layer audit complete (accessibility, AI slop,
Nielsen, grammar) + FC-18 Audit Trail produced + .impeccable.md present.

A session that ran SK-541 on 3 of 5 flows it touched has fully audited 3 flows,
not 5. Partial audit within a session does not count.

---

## Section 5 — Integration with SK-544, SK-546, SK-547

STATE.scope feeds three downstream skills:

**SK-544 (improvement-measurement-protocol):** Uses STATE.scope to determine
whether a Layer 2 observable delta is required before an improvement claim is
permitted. Fleet-level claims require Layer 2 for every flow in scope.

**SK-546 (coverage-completeness-gate):** Uses STATE.scope denominator to check
whether coverage thresholds are met before a claim fires at ⛔ STOP.

**SK-547 (output-skepticism):** Uses STATE.scope in the scope validity check
(skeptic question 2): "Does the evidence I have cover the scope I am claiming?"

SK-543 runs first. If STATE.scope is absent when SK-544, SK-546, or SK-547 fire,
those skills emit: "STATE.scope missing — run SK-543 before this gate."

---

## Section 6 — Anti-patterns

1. **"I'll establish scope after I see what there is"** — scope is established
   before work begins, not discovered during work. Discovery during work means
   the denominator changes as the session runs, making any claim a moving target.

2. **"I only need the denominator if I'm making a fleet claim"** — the denominator
   is established at session start regardless of what claims the session expects
   to make. Sessions that don't plan to make fleet claims often end up making them
   when they find the work is going well. The denominator must already exist.

3. **"CFI-12 flows are blocked but I can still work on them"** — blocked means
   blocked. A session that improves a blocked flow has spent tokens on work that
   will be discarded when the CFI resolves and the correct direction is known.

4. **"The examination record exists so the flow is done"** — done means APPROVED
   grade, not merely existence of a record. A partial record counts as partial.

5. **"We improved 5 flows — that's meaningful progress"** — it is meaningful
   at the flow level. At the fleet level it requires the denominator: 5 of 45
   eligible flows (11%) is not fleet-level progress by SK-546 thresholds.

---

## Section 7 — Failure Mode This Skill Prevents

| Failure mode | How scope inventory catches it |
|--------------|-------------------------------|
| Fleet claim without denominator | STATE.scope required before any claim |
| -63.6% improvement on 5 of 48 flows | Session count in denominator makes fraction explicit |
| Working on CFI-blocked flow | Count 4 explicitly lists blocked flows before work starts |
| Partial audit counted as full audit | Done count requires APPROVED grade, not just record existence |
| Fleet-level claim on < 20% coverage | Claim authority table blocks fleet claims below threshold |

---

## Changelog

- **v1.0.0** — initial skill. Six-count protocol; STATE.scope schema; claim authority
  table; integration notes for SK-544/SK-546/SK-547; anti-patterns 1–5; failure-mode table.
  Origin: session corpus where -63.6% improvement was claimed on 5 of 48 flows.

---

## END OF SK-543
