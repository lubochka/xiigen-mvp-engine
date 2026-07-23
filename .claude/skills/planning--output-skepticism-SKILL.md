---
name: output-skepticism
version: "1.0.0"
sk_number: SK-547
priority: MANDATORY
load_order: 5
category: planning
updated: "2026-04-21"
contexts: ["web-session", "claude-code"]
---

# SK-547 Output Skepticism — Challenge your own result before reporting it

SK-429 (self-questioning) installs skepticism at generation time: the model asks
itself questions about design flaws before the AF-9 judge sees the output. SK-547
installs the same discipline at report time: the session asks itself questions about
claim validity before ⛔ STOP fires. The same principle — challenge your own output
before it leaves — applied to a different layer.

## Origin

Extracted from the session corpus where a session reported "-63.6% improvement"
and stopped. No question was asked: "Is this the right metric for what Luba asked?"
No question was asked: "Would a reader of the captured PNGs see what I'm claiming?"
No question was asked: "Does 5 flows cover the scope I'm implying?" The result
shipped unfalsified and unfalsifiable. This skill installs the three questions that
would have caught all three failures before STOP fired.

## Relationship to SK-429

SK-429 governs generation handlers: every ai-generate.handler prompt must include
a QUESTION YOURSELF section. The model asks 3+ questions about design flaws,
answers each, and modifies the output before returning. The downstream
validate.handler confirms questions were asked.

SK-547 is the planning and audit session equivalent:
- SK-429 fires inside an AF pipeline node before the judge sees the output
- SK-547 fires at a session's ⛔ STOP before Luba sees the claimed result
- Both require answers, not just questions — listing questions without answering
  them is the anti-pattern both skills name explicitly

## When to Invoke

Any session claiming a result. Runs before ⛔ STOP.

Trigger: any claim of improvement, completion, reduction, or progress in the
response draft. Same trigger phrases as SK-546:
- improvement / reduced / fixed / resolved / addressed
- percentage reductions or comparisons
- completion claims: done / complete / finished
- progress claims: improving / significant progress / major improvement

If the response draft contains none of these trigger phrases, SK-547 runs as
a light-mode check: "No result claims detected — SK-547 N/A."

---

## Section 1 — The Three Skeptic Questions

Answer all three before sending. For each question: the answer must be a specific
statement, not a reassurance. "I believe so" is not an answer. "I read the PNG at
path X and it shows Y" is an answer.

### Question 1 — Refutation evidence

"What observable evidence would prove this result wrong? Have I looked for that evidence?"

Sub-questions by result type:

**For UI/UX improvement claims:**
"If I opened the PNG I captured for this flow's populated state, would I see what
I am claiming changed? Have I opened it?"

Expected answer format:
```
Refutation evidence:
  Evidence that would refute: PNG shows same layout as before.
  Did I look: YES — PNG at [path] shows [observable description]
              NO  — Visual refutation not checked. Downgrade claim per SK-544.
```

**For metric improvement claims:**
"Is the metric I used the right metric for the goal Luba stated in
STATE.goalContext.statement? Could the metric improve while the goal does not?"

Expected answer format:
```
Refutation evidence:
  Metric used: [grep count / TypeScript errors / test pass rate / other]
  Goal stated: "[verbatim from STATE.goalContext.statement]"
  Metric → goal connection: [explicit sentence linking metric to goal]
  Could metric improve while goal doesn't: YES / NO — [reason]
```

**For architectural claims:**
"What specific file, when read, would most likely contradict this claim?
Have I read it?"
(This maps to Q3 of the Stage 3 commitment gate in
XIIGEN-DESIGN-ARCHITECT-SESSION-GUIDE v1.9 §2c — SK-547 extends that question
to all session types, not just ARCHITECT.)

### Question 2 — Scope validity

"Does the evidence I have cover the scope I am claiming?"

Use SK-543 STATE.scope and SK-546 coverage gate to answer:

```
Scope validity:
  Scope claimed: [what the claim implies — one flow / N flows / fleet / batch]
  Evidence scope: [N of M eligible flows examined this session]
  SK-543 denominator: [N_examined / (48 - N_blocked)]
  SK-546 coverage threshold: [required % for this claim type]
  Coverage sufficient: YES / NO
    If NO: downgrade claim to match evidence scope per SK-546 Section 3.
```

### Question 3 — Proxy check

"Am I measuring a proxy that could have improved without the underlying thing improving?"

A proxy is a metric that correlates with improvement without being the improvement.
The proxy can change while the thing it represents stays the same.

Common proxies in UI/UX sessions:

| Proxy metric | Underlying thing | Can proxy improve without underlying? |
|-------------|-----------------|--------------------------------------|
| Grep pattern count | Screen renders correctly | YES — pattern removed by changing wrong thing |
| TypeScript errors | User sees correct UI | YES — compiler happy, runtime broken |
| AdminCrudPanel references | Page shows right grammar | YES — reference removed, page still CRUD-shaped |
| FC-18 checks pass | User experience is good | YES — structural gates pass, UX is poor |
| Test pass rate | Feature works for users | YES — tests relaxed, feature broken |

Expected answer format:
```
Proxy check:
  Internal metric: [what was measured]
  User-facing observable: [what should have changed for the user]
  Connection: [one sentence linking metric change to observable change]
  Verified: YES — [observable confirmed in PNG/output]
             NO  — [state explicitly: observable not verified]
```

If NO: the claim stands as Layer 1 only. Pair with SK-544 Layer 2 statement or
declare "visual improvement unverified."

### mvp (TypeScript/RAG) proxy table (universal proxies, stack-adapted)

| Proxy metric | Underlying thing | Can proxy improve without underlying? |
|-------------|-----------------|--------------------------------------|
| `npx tsc --noEmit` 0 errors | jest passes | YES — type-check clean, tests still fail |
| `npm run build` clean | runtime works | YES — builds, crashes/no-ops at runtime |
| Playwright headless green | real UX is good | YES — headless passes, real UX poor |
| `passed:true` in a JSON file | end-to-end works | YES — JSON row written, e2e never ran |
| `rg` match count down | logic correct | YES — pattern removed by changing the wrong thing |
| One `--testPathPatterns` run green | full suite green | YES — one spec passes, suite has failures |

---

## Section 1b — COUNT / ACTOR Honesty Check (universal, from core)

Before STOP, in addition to the three skeptic questions, run a count/actor check
whenever the draft claims a NUMBER of cycles/reviews/passes or sub-agent work:

```
COUNT check:
  count_claimed:            [N cycles / reviews / passes]
  independent_evidence_count: [how many independently-inspectable records exist]
  Verdict: if independent_evidence_count < count_claimed → state the NARROW truth
           (a ledger row, a checklist, or a generated table is NOT a cycle)

ACTOR check:
  subagent_claimed:         [yes/no]
  subagent_id:              [id/nickname or NONE]
  Verdict: if subagent_id = NONE → it was the parent, not a sub-agent.
           Parent self-review is not a sub-agent review.
```

Proxy guards: `build clean ≠ tests pass`; `grep 0 ≠ logic correct`;
`N ledger rows ≠ N cycles`; `parent self-review ≠ sub-agent review`.

---

## Section 2 — Format Before STOP

The three checks produce a compact block that appears in the response's internal
Step 6 artifact (Response Construction Protocol), not in the output to Luba.

```
OUTPUT SKEPTICISM CHECK (SK-547):

Q1 — Refutation evidence:
  [What would refute this + whether I looked]

Q2 — Scope validity:
  [N of M scope covered + SK-543 denominator + SK-546 verdict]

Q3 — Proxy check:
  [Internal metric] → [user-facing observable] — verified / not verified

Overall verdict:
  ALL PASS → ⛔ STOP may fire with original claims
  ANY FAIL → revise claim per failing question before STOP
```

If any check fails: revise the claim. Do not suppress the output. Revise the
specific claim that failed. The rest of the output is unaffected.

---

## Section 3 — Worked Examples

### Example A — PASS (correct usage)

Session examined FLOW-36 (feature-registry). Built FeatureMatrixScreen replacing
AdminCrudPanel. Claims: "FLOW-36 UI improved."

```
Q1 — Refutation evidence:
  Evidence that would refute: PNG shows same table layout as before.
  Did I look: YES — PNG at docs/ux-review/feature-registry/populated-state.png
              shows FeatureMatrixScreen with 6 FT-record cards, porting badges,
              cost estimates. Previous PNG showed Name/portingCandidate table.
  Verdict: PASS

Q2 — Scope validity:
  Scope claimed: FLOW-36 (single flow)
  Evidence scope: FLOW-36 fully audited this session (SK-541 four layers)
  SK-543 denominator: 1 of 45 eligible flows
  SK-546 threshold: 100% of claimed flow's screen states — MET
  Verdict: PASS

Q3 — Proxy check:
  Internal metric: AdminCrudPanel references removed (0 in feature-registry)
  User-facing observable: Screen shows CARD_LIST with FT-record cards, not table
  Connection: AdminCrudPanel removal forces FeatureMatrixScreen which renders cards
  Verified: YES — populated-state.png shows card layout
  Verdict: PASS

Overall: ALL PASS → STOP may fire.
```

### Example B — FAIL → revised (corpus failure)

Session examined 5 flows. Grep offense count: 22 → 8. Claims: "-63.6% improvement."

```
Q1 — Refutation evidence:
  Evidence that would refute: PNGs show same layout as before the grep changes.
  Did I look: NO — No PNGs captured this session.
  Verdict: FAIL

Q2 — Scope validity:
  Scope claimed: implied fleet (-63.6% sounds fleet-level)
  Evidence scope: 5 of 45 eligible flows (11.1%)
  SK-543 denominator: 5 / 45 = 11.1%
  SK-546 threshold: ≥ 20% for fleet claim — NOT MET
  Verdict: FAIL

Q3 — Proxy check:
  Internal metric: grep pattern count (22 → 8)
  User-facing observable: screens render with correct grammar, not CRUD tables
  Verified: NO — no PNGs read
  Verdict: FAIL

Overall: ALL FAIL → revise all claims.

Revised claim: "Grep offense count reduced from 22 to 8 in these 5 flows
(Layer 1 structural). Visual improvement unverified — no PNGs captured.
Fleet coverage: 5 of 45 eligible flows (11.1%). Fleet-level trend not established."
```

---

## Section 4 — Integration with SK-429

SK-429 installs self-questioning in generation prompts. SK-547 installs it at
session report time. The discipline is identical; the invocation point differs.

Sessions that author genesis prompts must embed SK-429 in the prompt.
Sessions that claim results at STOP must run SK-547 before the STOP fires.

Neither substitutes for the other. A session that runs SK-429 correctly during
generation and SK-547 correctly at report time has challenged its own output at
both the generation layer and the reporting layer.

---

## Section 5 — Integration with SK-543, SK-544, SK-546

SK-547 is the upstream check that runs at draft time (Step 4 of the Response
Construction Protocol). SK-543, SK-544, and SK-546 are the downstream gates
that run at Step 6. If SK-547 ran correctly during drafting, the downstream
gates should find nothing to catch.

The relationship:
```
Step 4 (Draft)  → SK-547 asks the three questions during drafting
Step 6 (Recheck) → SK-543 verifies denominator exists
                 → SK-544 verifies Layer 2 observable delta
                 → SK-546 verifies coverage fraction
```

SK-547 is prevention; SK-543/544/546 are detection. Both are required.
A session that runs SK-547 and produces clean claims will pass SK-543/544/546
automatically. A session that skips SK-547 and relies on SK-543/544/546 will
catch failures at Step 6 but has already drafted a flawed claim that requires
revision — more expensive than catching it at Step 4.

---

## Section 6 — Anti-patterns

1. **"I answered the questions in my head"** — answers must appear in the Step 6
   artifact. An answer that exists only in the model's reasoning is not verifiable
   by Luba or a future reviewer. Write it down.

2. **"I listed the questions but didn't answer them"** — this is the anti-pattern
   SK-429 names explicitly: "listing self-questions without answering them." The
   questions are not a formality. Each requires a specific, falsifiable answer.

3. **"Q1 answer: I believe the improvement is real"** — belief is not evidence.
   Q1 asks for observable evidence that would refute the result and whether it was
   examined. "I believe" addresses neither.

4. **"Q3 answer: the metric and the outcome are related"** — relatedness is not
   sufficiency. The proxy check asks specifically whether the proxy could improve
   without the underlying thing improving. Answer that question directly.

5. **"The session ran SK-546 so SK-547 is redundant"** — SK-546 is a gate at
   Step 6. SK-547 is a self-challenge at Step 4. Running only the gate means
   every overclaimed draft reaches Step 6 before being caught. SK-547 prevents
   the overclaimed draft from being written in the first place.

---

## Section 7 — Failure Modes This Skill Prevents

| Failure mode | How output skepticism catches it |
|--------------|----------------------------------|
| Unfalsifiable improvement claim | Q1 requires naming the evidence that would refute — if none named, claim is not grounded |
| Wrong metric for stated goal | Q1 metric sub-question: "Is this the right metric for the goal Luba stated?" |
| Fleet claim from 5 flows | Q2 scope validity: coverage fraction computed before claim is written |
| Grep count as improvement evidence | Q3 proxy check: grep count is a proxy; observable must be named |
| No PNGs read but improvement claimed | Q1: "Did I look?" → NO → downgrade before drafting |

---

## Changelog

- **v1.0.0** — initial skill. Three skeptic questions with sub-questions by result
  type; format before STOP; two worked examples (PASS and FAIL→revised drawn from
  corpus); relationship to SK-429 (generation vs. report-time skepticism); integration
  chain (SK-547 at Step 4, SK-543/544/546 at Step 6); anti-patterns 1–5; failure-mode table.

---

## END OF SK-547
