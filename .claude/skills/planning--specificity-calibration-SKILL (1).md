---
name: specificity-calibration
version: "1.0.0"
sk_number: SK-530
priority: MANDATORY
load_order: 5
category: planning
updated: "2026-04-16"
contexts: ["web-session", "claude-code"]
---

# SK-530 Specificity Calibration — Architect output is MORE concrete, not less

An architect answer with no file:line references, no integer counts, and no verbatim excerpts is an essay. This skill makes concreteness a mechanically scored property and rejects output below threshold.

## Origin

Extracted from XIIGEN-GOVERNANCE-AUTHORING-R1 (2026-04-16). The session's first architect answer was "four lanes with structural gaps." Zero file:line references. Zero N-of-M counts. Zero verbatim excerpts. The parallel Claude instance, asked the same question with the same codebase access, produced "14 of 20 topology contracts, 10 with nodes:[], line 147 hardcoded disabled, 217-line MarketplacePackageController, bootstrap never calls publish — 0 grep hits." Both outputs were labeled "architect-level analysis." Only one was. The difference was measurable in specific tokens. SK-530 makes it mechanically testable.

## When to Invoke

- Before every ⛔ STOP gate — self-score the output before closing the session
- Before emitting any architect-level synthesis
- Before handing any plan to plan-review
- As the measurement behind Rule 26 wide-scope mode (wide-scope doubles thresholds)
- At plan review time — Gate 0d of CODE-REVIEW-PROTOCOL-v1.3 scores the plan's evidence base

One self-score before STOP = zero "your answer is too abstract" correction cycles.

---

## Section 1 — Purpose

Three common senses of "specificity" are often conflated:

1. **Word count** — more words, longer paragraphs. Not specificity; often the opposite.
2. **Narrow scope** — answering a smaller question. Orthogonal to specificity; a narrow answer can still be abstract.
3. **Concreteness** — pointing at specific things. This is specificity.

SK-530 measures #3. Concreteness means the output points at **specific existing things**: a file at a path, a count with a numerator and denominator, a verbatim string from somewhere. Abstract output references categories without instances ("the files," "some gaps," "a coverage issue"). Concrete output names instances ("14 of 20 topology files," "contracts/topologies/subscription.topology.json line 45," `"nodes: []"`).

An architect answer's value scales with concreteness. An abstract architect answer is a frame for thinking; a concrete architect answer is a frame + the first layer of specifics the thinker will need. The concrete version saves the next person from doing the reconnaissance the architect already has access to.

---

## Section 2 — The Scoring Formula

Every architect output or plan-review output is scored on three orthogonal dimensions. The dimensions are orthogonal because each type of specificity catches a different failure of abstract output.

### Dimension 1 — file:line references

What counts as ONE reference:
- Exact file path + line number: `server/src/api/marketplace-package.controller.ts:115`
- Exact file path + function or class name: `engine-bootstrapper.ts::authorFlow()`
- Exact file path + range: `FlowLibraryPage.tsx:145-152`

What does NOT count:
- Directory only: `server/src/api/` — no file, no line
- Category: "the marketplace controllers" — no specific entity
- Hypothetical path: "something like `controllers/marketplace.ts`" — not verified against reality

Catches: "referenced the right thing" failures. Without file:line, the architect has pointed at an idea, not an artifact.

### Dimension 2 — N-of-M integer claims

What counts as ONE claim:
- Concrete count with numerator and denominator: "10 of 14 empty", "4 populated of 14"
- Concrete count with scope: "388 uses of FLOW_SCOPED", "0 hits for 'publish' in engine-bootstrapper.ts", "217 lines"
- Before/after counts: "was 4, is now 14"

What does NOT count:
- "many" / "several" / "a lot of" / "most"
- "a few" / "some" — no number
- "roughly half" — no specific count
- Ratios without bases: "50% coverage" with no denominator count

Catches: "claim about quantity without doing the count" failures. The count is the verification.

### Dimension 3 — Verbatim Quoted Excerpts

What counts as ONE excerpt:
- Direct quote from file content with exact characters: `"FLOW_SCOPED documents must have empty tenant_id"`
- Direct quote from output: `"nodes: []"`, `"disabled title='Fork available after...'"`
- Error message verbatim: `"TypeError: Cannot read properties of undefined"`

What does NOT count:
- Paraphrase: "the file says flow scoped documents should have empty tenant" (not verbatim)
- Summary: "the validator requires empty tenant_id" (summary, not quote)
- Character-shifted: swapping single/double quotes or rewording preserves meaning but loses verbatim status
- Claim without quotation: "the config specifies X" without showing the string

Catches: "what does the code actually say" failures. Verbatim excerpts force the reader to confront exact characters, which is where surprises live.

### Total score

Score = count(file:line refs) + count(N-of-M claims) + count(verbatim excerpts).

Each reference counts once regardless of how many times restated. "Line 147 is disabled" mentioned 5 times in the output counts as 1 file:line reference, not 5.

---

## Section 3 — Thresholds per Session Type and Output

Different sessions need different total concrete references. Architect-level synthesis doesn't need the fine-grained specificity of a plan review, but both need concreteness above their type's minimum.

| Output type | file:line | N-of-M | verbatim | Total minimum |
|-------------|----------:|-------:|---------:|--------------:|
| EXECUTOR turn output | 5 | 2 | 3 | 10 |
| ARCHITECT answer | 5 | 3 | 3 | 11 |
| PLAN-REVIEW report | 10 | 5 | 5 | 20 |
| MATERIALIZATION plan | 10 | 5 | 5 | 20 |
| DESIGN-REVIEW output | 15 | 8 | 5 | 28 |

Totals are the primary gate. The per-dimension counts are illustrative — what matters is the total AND at least one reference in each dimension (an output with 11 file:line refs and zero counts is unbalanced; it passes the total but fails the dimension-diversity check).

**Wide-scope mode (Rule 26) doubles all thresholds.** Triggers: "see the whole picture" / "don't save tokens" / uploads ≥5 files.

---

## Section 4 — Self-Check Protocol

Before ⛔ STOP, the session runs the count on its own output:

```markdown
## Specificity self-check (SK-530)

Output being scored: [session output from the most recent response]

- file:line references: [N]
  [list each: "path:line" and purpose in 3 words]
- N-of-M integer claims: [M]
  [list each: "N of M — what"]
- verbatim quoted excerpts: [K]
  [list each: `"quote"` — source]

Total: [N+M+K]
Threshold for [session type]: [threshold]
Dimension diversity check: [≥1 per dimension? YES / NO]

Verdict: [PASS | FAIL — reason]
```

If FAIL: output rejected. Session adds specifics (running more reconnaissance if needed), re-runs the count, retries. The session does not ⛔ STOP on a FAIL.

If PASS: the self-check block is included in the output (or logged to STATE), showing receipts.

---

## Section 5 — Anti-gaming Rules

Scoring without anti-gaming rules produces gaming. These rules prevent inflation:

1. **Same file:line, multiple mentions = 1 reference**
   Mentioning `FlowLibraryPage.tsx:147` five times does not score 5.

2. **Same count, multiple phrasings = 1 claim**
   "10 of 14 empty" in paragraph 1 and "10 of the 14 have empty nodes" in paragraph 3 count as 1.

3. **Verbatim requires exact characters**
   Changing `"nodes: []"` to `nodes: []` (removing quotes) or `"nodes:[]"` (removing space) breaks verbatim status. Copy exactly.

4. **Path references must be real paths in the actual codebase**
   `server/src/non-existent.ts:45` does not score — the path must be verifiable by `ls`. Hallucinated paths are worse than no reference (they're wrong specificity).

5. **Counts must be from reconnaissance, not from memory**
   "I recall there were about 14 files" is not a count. Count from a `ls` or `grep` output recorded in STATE.recon.

6. **Verbatim excerpts must come from sources touched by reconnaissance**
   Quotes pulled from training data memory are not verbatim. They are plausible strings. Verbatim means from a file actually read this session.

7. **Generic code snippets do not count as verbatim**
   `function foo() { return 42; }` is not a verbatim excerpt of anything specific. Verbatim requires a specific source file with specific content.

8. **Placeholder refs (`[file]:123`) score 0**
   If the output has unfilled placeholders, the score is zero on those — placeholders signal the session never actually looked.

---

## Section 6 — Worked Examples

### Example A — FAIL (this session, early architect output)

**Output (verbatim from session R1 early turns):** "Four lanes with structural gaps. Lane A is partial. Lane B is missing. The plan has coverage issues. Arbiter panel missed completeness dimension."

**Scoring:**
- file:line references: 0 — no paths, no lines
- N-of-M claims: 0 — "4 lanes" has no denominator (it's a label, not a count); "partial" / "missing" are not counts
- verbatim excerpts: 0 — no quoted strings
- Total: **0 of 11 required for ARCHITECT**

**Verdict: FAIL.** Below threshold on every dimension. The output labels abstractions; it does not point at specific artifacts.

**What fixes it:** reconnaissance expanded, verbatim quotes captured, file paths identified. Count from `ls contracts/topologies/` becomes "4 of 14 populated." The 4-lane frame becomes "4 of 14 flows reach step 2 of round-trip; 10 blocked by empty topology files at `contracts/topologies/[flow].topology.json` with `nodes: []`."

### Example B — PASS (parallel instance's answer)

**Output excerpt:** "14 of 20 topology contract files, 10 with `nodes: []`. FlowLibraryPage.tsx:147 has hardcoded `disabled` attribute with title `'Fork available after FLOW-18 marketplace wiring (Turn 15)'`. MarketplacePackageController at `server/src/api/marketplace-package.controller.ts:115` is 217 lines. `engine-bootstrapper.ts`: `grep -n 'publish' | wc -l` returns 0 hits."

**Scoring:**
- file:line references: 3 — `FlowLibraryPage.tsx:147`, `server/src/api/marketplace-package.controller.ts:115`, `engine-bootstrapper.ts` with specific grep
- N-of-M claims: 4 — "14 of 20", "10 with nodes:[]", "217 lines", "0 hits"
- verbatim excerpts: 3 — `"nodes: []"`, `"disabled"`, `"Fork available after FLOW-18 marketplace wiring (Turn 15)"`
- Total: **10**

Still below ARCHITECT threshold of 11. Adding one more specific — say, quoting the exact `return 'empty tenant_id'` validator text — brings the score to 11+. The parallel instance's full analysis included 20+ concrete references.

**Verdict: PASS** (once total ≥ 11).

### Example C — FAIL on dimension diversity

Hypothetical output: "The plan has 15 turns, including 7 infrastructure turns, 3 adapter turns, 4 marketplace turns, 1 session file turn. Turns 3, 5, 7, 11, 13 are cross-cutting. Turns 8, 9, 12 lack verification."

**Scoring:**
- file:line references: 0 (no paths)
- N-of-M claims: 10+ ("15 turns", "7 of 15", "3 of 15", etc.)
- verbatim excerpts: 0
- Total: 10+ on N-of-M alone

**Verdict: FAIL on dimension diversity.** The total passes but file:line = 0 and verbatim = 0. The output is structurally numeric without being evidence-grounded. 15 turns could be invented; without file:line anchors and verbatim excerpts, the counts are self-referential.

**What fixes it:** add path references for the turn targets ("Turn 3 touches `client/src/pages/FlowLibraryPage.tsx`"), and quote the verification steps verbatim.

---

## Section 7 — Integration Notes

- **SK-529 Reconnaissance Gate (load_order 0):** SK-530 scores the output; SK-529 produces the evidence base the output should cite. A session that passes SK-530 without a corresponding STATE.recon has gamed the score — synthesized specifics without reading them. Gate 0d of CODE-REVIEW-PROTOCOL-v1.3 verifies the evidence base.

- **SK-535 Session Mode Declaration:** thresholds per session type are derived from mode. ARCHITECT → 11. PLAN-REVIEW → 20. MATERIALIZATION → 20. Mode declaration determines the SK-530 threshold the output must meet.

- **SK-536 Goal Context Persistence:** the Goal Reminder Block's "This round advances the goal by" field must itself meet a per-session-type specificity minimum. Abstract round-progress statements ("made progress on goals") fail SK-530 at the block level.

- **SK-531 Claim-as-Hypothesis:** claim verdicts must reach SK-530 threshold. A claim verdict of "seems partially verified" is abstract; "14 files, 10 empty, evidence: `grep 'nodes:\s*\[\]' contracts/topologies/ returns 10 hits`" is concrete.

- **SK-532 Materialization Session Type:** wiring gap identification (Step 2 of MATERIALIZATION process) must meet MATERIALIZATION threshold (20 total). The wiring gap is the core architectural finding — abstract wiring gaps produce abstract wiring plans.

- **SK-533 MVP Round-Trip Verification:** per-step verification commands are themselves a form of concreteness (specific curl commands are verbatim). Round-trip nominations naturally score well on SK-530 if honestly done.

- **SK-534 Goal Delivery Completeness Arbiter:** evaluates plans. Its own output (the verdict table) must meet PLAN-REVIEW threshold (20). Abstract arbiter verdicts ("plan seems to cover goals") fail both SK-530 and the arbiter's own purpose.

- **Rule 26 in SESSION-LOAD-PLAN-v23:** wide-scope mode doubles thresholds.

- **Gate 0d in CODE-REVIEW-PROTOCOL-v1.3:** spot-verifies 3 random concrete references against STATE.recon and against the actual codebase. Catches hallucinated specifics.

---

## Section 8 — Anti-patterns

1. **"My answer is clearly correct, specificity doesn't matter"** — correctness and specificity are orthogonal. An answer can be correct and abstract (frame without instances); it can be wrong and concrete (wrong instances). Correctness without specificity leaves the reader to do the reconnaissance.

2. **"Adding file:line references just bloats the output"** — the references are load-bearing. They transform the answer from "trust me" to "verify me." The bloat is epistemic weight, not filler.

3. **"I can't find a verbatim excerpt for this claim"** — if no verbatim excerpt exists, the claim may not be grounded. Either find one, reconnaissance harder, or retract the claim.

4. **"14 out of 20 is obvious enough, I don't need 'of 20'"** — bare numbers without denominators are not counts. "14 files" is a claim about existence; "14 of 20" is a claim about proportion. Different claims.

5. **"I'll quote later when someone asks"** — deferred quoting means the output goes out without verification. The reader has to ask, which means the output didn't do its job.

6. **"My paraphrase is cleaner than the original"** — cleaner paraphrase loses verbatim status. The "mess" in the original may encode constraints. Quote first, interpret second.

7. **"This is ARCHITECT mode, we don't do specifics"** — ARCHITECT has the LOWEST total threshold (11) but still has a threshold. Zero-specificity ARCHITECT answers are failing the mode, not meeting its scope.

---

## END OF SK-530
