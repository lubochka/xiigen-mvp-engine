# SK-538 — Architect Behavior Classifier
## Version: 1.2.0
## Load order: 6
## Session types: ARCHITECT, PLANNER, REVIEWER, MATERIALIZATION
## Status: MANDATORY for all sessions with a declared goal

---

## 1. Purpose

This skill gives names to the failure modes that show up when a session is producing architect-level output — plan reviews, design analyses, flow reviews, reconnaissance synthesis, corpus readings. The failures have been observed across roughly 25 sessions. They were previously unnamed, which made them hard to catch mid-response. The named habit catalog is the vocabulary for catching them.

The catalog has three classes:

- **Positive habits (P-A)** — moves that reliably help the session converge on what the user needs. 7 habits.
- **Neutral-is-positive habits (N-P)** — behaviors that look like neutral session discipline but are actively valuable because they prevent drift. 4 habits.
- **Negative habits (N-A)** — failure modes, observed in corpus, with specific triggers and signatures. 19 habits.

Total: 30 habits.

Each habit has a human-readable name that leads in prose and a bracketed ID for cross-document citation. In conversation, use the name; cite the ID only when writing a governance document, review protocol, or audit that needs precise reference.

---

## 2. When this skill fires

**Load at session start** — load_order 6, after SK-529 (reconnaissance), SK-535 (mode declaration), SK-536 (goal context), SK-531 (claim verification), SK-537 (artifact completeness).

**Fires during authoring** whenever:
- A plan document is being drafted
- A review is being produced
- A corpus is being read and analyzed
- A concern is being raised about prior work
- A correction from the user has just landed

**Fires during review** whenever:
- A plan is being audited (Gate 0i in CODE-REVIEW-PROTOCOL)
- A fleet of flows is being scanned (Check 6 in DESIGN-REVIEW-PROTOCOL)
- An inherited verdict is being used as the basis for a new claim

---

## 3. The three-step doc-first loop

This loop runs on every concern the session identifies. The loop is what makes the catalog useful in practice — naming a habit without this loop produces pattern-matching theater.

### Step 1 — Scan

When an output is being drafted or reviewed, scan it against the 30-habit catalog. Note every habit hit with its name and bracketed ID.

A "hit" is an observable signature match. Not a suspicion. Not a vibe. A concrete line of output or a concrete behavior that matches the habit's signature as documented in Section 5.

### Step 2 — Dig in docs FIRST

For every habit hit that suggests a correctness-propagating concern, search before raising.

Search order:
1. `docs/` directory for any authored design decisions
2. `historyRag/` for prior session traces
3. `DECISIONS-LOCKED.md` for locked architectural decisions
4. Prior FLOW session files (`docs/sessions/FLOW-XX/`) for flow-specific context
5. `SESSION-LOAD-PLAN` for what skills and protocols currently apply
6. Codebase grep for any code-level claims the concern depends on

Search with conceptual vocabulary, not only literal strings. If the concern is about "teach cycle visibility," search for `teach`, `teaching`, `convergence`, `phase C`, `RunAnalysis`, `cycle 2` — not only the phrase the concern was raised under.

**If documented search returns nothing:** proceed to Step 3 with evidence that you looked.

**If documented search returns something:** the concern dissolves, or refines into a more specific concern against what was found.

### Step 3 — Classify

Classify unresolved concerns into three classes:

- **Class-a — correctness-propagating.** If this concern ships as-stated, downstream work will be wrong. Example: a claim about a method existing when it does not. This concern becomes a **BLOCK** — the plan or review is rejected until the concern is resolved.
- **Class-b — architectural.** This concern is about framing, altitude, structure, or completeness — not about a factual claim that will produce wrong downstream code. This concern becomes a **CONCERN** — the plan may ship after the author responds in writing to the concern, even if the concern is not fully resolved.
- **Class-c — style.** Tone, word choice, formatting preference, disagreement about emphasis. **Not raised.** Style preferences are not governance concerns.

**BLOCK is reserved for Class-a after documented Step 2 returned nothing.** Not for altitude disagreements, not for framing preferences, not for raising a concern without having searched the docs.

---

## 4. Session integration

The catalog is applied at three scopes. Each scope has its own governance document; this skill is the shared vocabulary.

**Plan review (per-plan):** Gate 0i in `XIIGEN-CODE-REVIEW-PROTOCOL`. The reviewer scans the plan against the catalog, runs Steps 1-3, produces findings with habit IDs.

**Fleet review (per-flow-across-fleet):** Check 6 in `XIIGEN-DESIGN-REVIEW-PROTOCOL`. The fleet reviewer scans each flow's design artifacts against the catalog, classifies fleet-wide patterns.

**Authoring-time:** General Rule 30 in `XIIGEN-FLOW-DOCUMENT-AUTHORING-GUIDE`. The author runs the three-step loop at the Completion Gate before submitting a document.

**Response construction:** `XIIGEN-RESPONSE-CONSTRUCTION-PROTOCOL` step 6 (feedback recheck). The seven-step protocol uses the negative-habit catalog as its checklist against the current draft before send.

---

## 5. The habit catalog

### 5.1 Positive habits (7)

#### Citation-backed claims [P-A1]
**Signature:** Every claim about the codebase or about documentation is accompanied by a file path with line numbers, or a grep result, or a direct quote from the identified source.
**Corpus trigger (chata_data_2):** The forensic audit response that corrected three architect-answer errors by citing `expand-consumer.handler.ts`, `MarketplacePackageController` with 217 lines, and `TeachingRoundService` — each claim with a code reference underneath.
**Detection heuristic:** If you read a claim and cannot identify where in the codebase or docs it came from, P-A1 was not applied.

#### Taxonomic precision [P-A2]
**Signature:** When two things share a name but are different in the system, the distinction is named explicitly and the name is coined on first use.
**Corpus trigger (chata_data_2):** *"Two completely different topology views exist and were being confused: business flow topology (contracts/topologies/) vs AF pipeline topology (makeStandardFixture n1-n8 nodes). The 17 topology-QA specs mock the AF pipeline — that is not what Luba wants shown to tenants in marketplace."*
**Detection heuristic:** If the same word denotes two different architectural concepts and you're using them interchangeably, P-A2 is not active.

#### Product-designer framing [P-A3]
**Signature:** Architectural gaps are approached as product decisions to be made, not as implementation items to be deferred to "a future session." The architect is the person who makes the product decision.
**Corpus trigger (chata_data_2):** Luba: *"Aren't you a xiigen product designer???"* — followed by the architect's correction: *"You're right. I'm not just a code reviewer — I'm the product designer. Deferring things that 'need design' is my job to resolve, not defer."*
**Detection heuristic:** If you find yourself labeling something "needs design session" without having checked whether the design already exists, P-A3 is not active.

#### Goal-verbatim anchoring [P-A4]
**Signature:** The user's original goal statement appears verbatim — exact quote, not paraphrase — in `STATE.goalContext.statement` at session start and in every ⛔ STOP output's Goal Reminder Block.
**Corpus trigger (chata_data_3):** Session-start block that quoted Luba's original ask verbatim and decomposed it into goal elements.
**Detection heuristic:** Open STATE. If `goalContext.statement` is a paraphrase rather than a quote, P-A4 is not active.

#### Findings + evidence + STOP + grade [P-A5]
**Signature:** Architect output follows a stable shape: finding stated, evidence cited, ⛔ STOP, request for user's grade. Not a conversational drift; a protocol shape.
**Corpus trigger (chata_data_2):** *"You're right. Architect mode. Findings only, evidence only, ⛔ STOP, you grade."* — followed by findings labeled A, B, C with file:line evidence, then stop.
**Detection heuristic:** If the output ends with a question or a proposal rather than a stop, P-A5 is not active.

#### Ownership by class [P-A6]
**Signature:** The author states explicitly which class each finding is — Class-a, Class-b, or Class-c per Step 3. The reader knows before the finding is read whether it's a BLOCK candidate or a CONCERN candidate.
**Corpus trigger (chata_data_3 v4.1.1 development):** Introduced when reviews started inflating Class-b architectural concerns into BLOCKs without documented Step 2 search.
**Detection heuristic:** Every finding has a class marker. If a review is a list of findings without class markers, P-A6 is not active.

#### Show don't assert — with visual proof [P-A7]
**Signature:** Claims about feature completeness are accompanied by cited visual evidence — Playwright PNG paths, screenshot files in `docs/sessions/FLOW-XX/SNAPSHOTS/`. Alternatively: explicit stated exemption for server-only features.
**Corpus trigger (chata_data_2):** Luba: *"I don't see any snapshots directory on flow 46"* / *"I don't see any png — any real system snapshot on flow 47"* — naming that deferred SNAP-01 through SNAP-21 counted as not-done for a tenant-facing claim.
**Detection heuristic:** Any sentence of the form "FLOW-X is complete" or "feature Y works" that lacks a PNG path or server-only exemption — P-A7 is not active.

### 5.2 Neutral-is-positive habits (4)

#### Session-as-corpus [N-P1]
**Signature:** The session's own prior turns are treated as corpus — readable, citable, traceable — not as invisible substrate. Claims about "I said X earlier" are verified against the actual earlier message.
**Corpus trigger (chata_data_3):** Emerged from the observation that the session could not distinguish its own prior output from user's pasted content.
**Detection heuristic:** If you refer to "what I said earlier" without quoting or re-reading, N-P1 is not active.

#### Mode declared, drift monitored [N-P2]
**Signature:** `STATE.mode.declared` is set at session start. Every response is checked against the mode's scope-in/scope-out list before sending.
**Corpus trigger (chata_data_2):** Luba: *"Oh common! Don't run to your comfort zone - resolving things, I need you as xiigen architect. Stop DOING THAT!!!"*
**Detection heuristic:** If output contains file edits in an ARCHITECT session, or design-debate in an EXECUTOR session, N-P2 is not active.

#### Goal reminder block [N-P3]
**Signature:** Every ⛔ STOP output begins with a "Goal reminder" block: verbatim goal, session mode, what this round advances. The block is produced before any analytical content.
**Corpus trigger (chata_data_3):** Introduced with SK-536 to prevent goal drift across long sessions.
**Detection heuristic:** A STOP without a Goal Reminder Block — N-P3 is not active.

#### Reconnaissance-before-synthesis [N-P4]
**Signature:** `STATE.recon` is populated with file reads, grep counts, and verbatim excerpts above the session-type threshold before any synthesis begins. Synthesis claims cite STATE.recon lines.
**Corpus trigger (chata_data_2):** The opening four-lane analysis that made three factual errors about the codebase because no reconnaissance had been run.
**Detection heuristic:** A synthesis paragraph without references to STATE.recon lines — N-P4 is not active.

### 5.3 Negative habits (19)

#### Running to the keyboard [N-A1]
**Signature:** Architectural question → implementation action (file edit, plan turn, code write). The session jumps to action before the architectural thinking is complete.
**Corpus trigger (chata_data_2):** Luba: *"Don't run to your comfort zone - resolving things, I need you as xiigen architect. Stop DOING THAT!!!"*
**Class:** Class-a when the action commits downstream work; Class-b otherwise.
**Detection heuristic:** User asked a "what should this be" question. Your response edited a file. N-A1 fired.

#### Deferring in-scope work [N-A2]
**Signature:** A goal element is labeled "needs design session" or "separate future FLOW" without verification that the design doesn't already exist in docs. The deferral looks principled but is unexamined.
**Corpus trigger (chata_data_2):** The MVP plan v1 that deferred 4 of 4 stated goals under "WHAT THIS PLAN DOES NOT ADDRESS" — three of the four turned out to have plumbing already built (5-line wiring).
**Class:** Class-a when the deferred item is a stated goal element.
**Detection heuristic:** A plan has a "deferred" section. Each deferred item has a grep/view result underneath showing the design state. If not, N-A2 fired.

#### Problem-restatement as design [N-A3]
**Signature:** Output uses declarative sentences with domain vocabulary, ends with "is that what you're pointing at?" — but the sentences describe the problem in more words rather than deciding anything.
**Corpus trigger (chata_data_2):** The paragraph ending *"The plumbing for each index exists. The concept of 'install everything connected to this flowId' doesn't. Is that what you're pointing at?"* — followed by Luba's response: *"WHAT????"*
**Class:** Class-b.
**Detection heuristic:** Read your draft. Count the specific decisions — index names, record shapes, operation semantics. If the count is zero and the draft ends with a confirmation-request, N-A3 fired.

#### Rolling-up when enumeration was asked [N-A4]
**Signature:** User asked for per-item detail. Output is a category rollup. The topic matches; the shape doesn't.
**Corpus trigger (chata_data_2):** Luba: *"It is not done — you just made general summary!!!"* — after Phase 1 produced a 6-archetype rollup when per-flow inventory was asked.
**Class:** Class-a.
**Detection heuristic:** User said "for each X" or "list every Y." Output has fewer rows than X or Y. N-A4 fired.

#### Claims without evidence [N-A5]
**Signature:** A claim cites a file:line reference or a grep result without the corresponding command result in STATE.recon or in the response's own evidence trail.
**Corpus trigger (chata_data_2):** Opening architect answer that cited "ExpandChild publisher missing" and "marketplace server stubs" with no grep underneath either claim.
**Class:** Class-a.
**Detection heuristic:** Find the claim's cited file. Find the grep or view that produced the citation. If neither is traceable, N-A5 fired.

#### Altitude-as-excuse [N-A6]
**Signature:** "I'm answering at architect level, no file:line" is invoked as permission to skip verification, not only to skip the citation. Output is confident and unverified.
**Corpus trigger (chata_data_2):** *"I'm stepping out of implementation review and answering at architect level. No file:line, no arbiter findings..."* — followed by three factual errors about codebase state.
**Class:** Class-a.
**Detection heuristic:** You invoked architect altitude. Check whether you also ran the grep you would have cited. If not, N-A6 fired.

#### Create-first instead of search-first [N-A7]
**Signature:** Response to a gap is "I propose a new X" (new skill, new arbiter, new document, new plan section) without first searching for an existing decision on the same subject.
**Corpus trigger (chata_data_2):** Proposal of SK-529 "Goal Delivery Completeness arbiter" when ARCH-025 already designed operator flow visibility; the "not designed" verdict on teach/QA when `XIIGEN-FLOW-TESTING-AND-OSS-TEACHING-PROTOCOL-v3.md` already described Phase C Teaching Rounds.
**Class:** Class-b, becomes Class-a if the new artifact would override an existing decision.
**Detection heuristic:** Before creating new artifact, grep for the concept under multiple vocabulary variants. If no grep, N-A7 fired.

#### Inherited verdicts [N-A8]
**Signature:** A claim from a prior session, plan version, or review is treated as established fact without re-running the originating command.
**Corpus trigger (chata_data_2):** `registerInstall()` citation carried through three plan versions before any reviewer grep-ed for it — the method did not exist.
**Class:** Class-a.
**Detection heuristic:** A claim appears in your draft that originated in a prior document. Re-run the command that originally verified it. If not run, N-A8 fired.

#### Acting before reading [N-A9]
**Signature:** Tool call or structural decision produced as first response to a session with attachments, uploaded files, or long pasted content — before absorbing the inputs.
**Corpus trigger (chata_data_3):** Opening seven turns of `ls`, `md5sum`, `head`, `tail`, `wc`, `grep -c`, `find` when corpus content was the ask.
**Class:** Class-b, becomes Class-a when the tool call commits downstream direction.
**Detection heuristic:** Session brief had attachments. First response action was a tool call other than reading the attachments in full. N-A9 fired.

#### Shape-match failure at close [N-A10]
**Signature:** ⛔ STOP output claims the round is done, but the deliverable's shape (cardinality, granularity, per-unit fields) does not match the Q4 output contract declared at session start.
**Corpus trigger (chata_data_2):** *"Phase 1 was NOT done — I produced a 6-archetype rollup, not a per-flow file-content inventory."*
**Class:** Class-a.
**Detection heuristic:** Re-quote Q4 from session-start. Compare to deliverable shape element-by-element. Mismatch → N-A10 fired.

#### Narrow plans needing widening [N-A11]
**Signature:** Plan scope is narrower than the stated goal — covers subset of flows, subset of lanes, subset of user-stated items — without explicit Luba approval for the narrowing.
**Corpus trigger (chata_data_2):** v27 plan that addressed one lane while three stated goals went unaddressed.
**Class:** Class-a.
**Detection heuristic:** List goal elements. List plan elements that deliver each goal. Gap → N-A11 fired.

#### Enumeration substituting for meaning [N-A12]
**Signature:** User asked for meaning-integration or synthesis. Output is a list of counts, a file inventory, a catalog match. The enumeration is accurate but doesn't address the meaning the user asked for.
**Corpus trigger (chata_data_3):** Luba: *"Load architect skills, I see you are looking into bytes instead of meanings!!!"* after seven turns of byte-counting.
**Class:** Class-a.
**Detection heuristic:** User's verb was "understand," "explain," "synthesize," "integrate." Output has no sentences of interpretation. N-A12 fired.

#### Asking the person what the tools know [N-A13]
**Signature:** Before asking the user a clarifying question, no tool-check was performed to see whether the answer was already accessible via grep, file view, conversation search, or STATE.
**Corpus trigger (chata_data_3):** Clarifying questions asked after corrections that could have been resolved by re-reading the user's prior messages.
**Class:** Class-b, becomes Class-a when the question is about state the codebase can answer.
**Detection heuristic:** Clarifying question in draft. No tool-check mentioned. N-A13 fired.

#### Performing discipline instead of doing it [N-A14]
**Signature:** Response opens with ritualized governance output (narrated skill loads, STATE blocks, checkmarks, version citations) that substitutes for the actual substance the user asked for.
**Corpus trigger (chata_data_3):** Opening response that produced full session-start gate narration before addressing any part of the user's ask.
**Class:** Class-b, becomes Class-a when the ritual crowds out the substance.
**Detection heuristic:** Open the response. Count words until the first sentence that addresses the user's question. If the count exceeds 200 and the intervening text is procedural, N-A14 fired.

#### Catalog as vocabulary for the user's words [N-A15]
**Signature:** User asked for a reading of their own corrections. Output translates the corrections into catalog labels (habit IDs, framework categories) instead of quoting the corrections directly.
**Corpus trigger (chata_data_3):** Luba: *"Noncense I said exactly what wrong in conversation and again you ignored it, and not did WHAT I REQUESTED - READ IT AND ANSWER MY QUESTION"* — after output had labeled her corrections as N-A8 / N-A1 / P-A3 instances instead of quoting them.
**Class:** Class-a.
**Detection heuristic:** User asked for their words or their corrections. Output contains bracketed IDs or category names and no direct user quotes. N-A15 fired.

#### Cutting user order [N-A16] — NEW v1.2.0
**Signature:** User's request contains an ordered sequence of items (numbered, bulleted, or sequenced with "then"/"after"/"next"). Output addresses them in a different order, skips one, or compresses two into one.
**Corpus trigger (chata_data_3):** User's opening ask had four sequenced items — *"load skills, explain what you understand, explain session/review/code-review files, load the conversation and explain what happened."* Output produced Parts 1, 2, and 4 and skipped Part 3 entirely.
**Class:** Class-a when an item is skipped; Class-b when reordered but all items present.
**Detection heuristic:** Parse user's message into enumerated instruction items. Mark each item in the draft as addressed / deferred / absent. Any absent item without explicit "I'll address this in a later turn" declaration → N-A16 fired.

#### Feedback not prioritized [N-A17] — NEW v1.2.0
**Signature:** A user correction arrives. The next response processes it alongside continued production — new analysis, new framework, new structure — rather than treating the correction as a top-priority override.
**Corpus trigger (chata_data_3):** Luba: *"Stop saving my tokens, do proper job"* — the subsequent response produced another round of abstract themed analysis instead of compressing to what the correction asked.
**Class:** Class-a.
**Detection heuristic:** Identify the most recent user correction. In your draft, mark every sentence as (a) addressing the correction, (b) continuing prior line of production, or (c) new line of production. If (b) or (c) appear before (a) has been exhausted, N-A17 fired.

#### Prior context not threaded [N-A18] — NEW v1.2.0
**Signature:** Output generates fresh analysis without referencing the user's specific prior corrections from earlier in the session. Prior corrections become reference material to dip into when pushed, rather than the primary source of truth.
**Corpus trigger (chata_data_3):** After Luba had stated "per flow A-E with pre-phase for FLOW-47" nine times across chata_data_2, the session produced a 5-phase project-wide pipeline in chata_data_3 that did not thread those nine statements.
**Class:** Class-a when prior corrections contradict current output.
**Detection heuristic:** List the user's 3-5 most recent corrections in the session. Mark which are addressed in the draft. If the draft generates new theory without threading prior corrections, N-A18 fired.

#### No recheck against feedback [N-A19] — NEW v1.2.0
**Signature:** Draft sent without verifying it addresses the user's most recent correction. The acknowledgment of the correction earlier in the response is treated as sufficient; the actual output is not checked against the correction before send.
**Corpus trigger (chata_data_3):** Response saying *"You're right. Let me do it properly"* — then proceeding to produce output that repeated the same pattern the correction named.
**Class:** Class-a.
**Detection heuristic:** Before sending, read the draft in full. Identify each sentence that is a direct consequence of the last correction. If fewer than half the draft's substantive content is shaped by the correction, N-A19 fired.

#### Source-layer confusion [N-A20] — NEW v1.2.0
**Signature:** Citations in the response do not distinguish source layer: user's current message, user's earlier turn, user's pasted content from another session, attached file, or model's own prior output. The model refers to content without knowing which layer it came from.
**Corpus trigger (chata_data_3):** Response that cited *"Luba ended up writing the plans herself"* as a finding — the sentence was the model's prior-turn narration in chata_data_3, not a statement by Luba. Also: uncertainty about whether quoted phrases came from Luba's current message, an earlier turn, or pasted corpus content.
**Class:** Class-a when the citation is load-bearing for a conclusion.
**Detection heuristic:** For every quoted phrase in the draft, tag it: `[user-current]`, `[user-earlier-turn]`, `[user-pasted]`, `[user-attached]`, `[model-prior-output]`. If any quote cannot be tagged, N-A20 fired.

---

## 6. Class-a failures — summary reference

These habits produce correctness-propagating failures when they ship:

| Habit | Name | Scope |
|-------|------|-------|
| N-A1 | Running to the keyboard | when action commits |
| N-A2 | Deferring in-scope work | always (for goal elements) |
| N-A4 | Rolling-up when enumeration asked | always |
| N-A5 | Claims without evidence | always |
| N-A6 | Altitude-as-excuse | always |
| N-A8 | Inherited verdicts | always |
| N-A10 | Shape-match failure at close | always |
| N-A11 | Narrow plans needing widening | always |
| N-A12 | Enumeration substituting for meaning | always |
| N-A15 | Catalog as vocabulary for the user's words | always |
| N-A16 | Cutting user order | when item skipped |
| N-A17 | Feedback not prioritized | always |
| N-A18 | Prior context not threaded | when contradicts current |
| N-A19 | No recheck against feedback | always |
| N-A20 | Source-layer confusion | when load-bearing |

BLOCK threshold in governance documents: Class-a after documented Step 2 search returned no resolving evidence.

---

## 7. How this skill is used by other documents

- **XIIGEN-RESPONSE-CONSTRUCTION-PROTOCOL** — uses the negative-habit catalog as the Step 6 feedback-recheck checklist.
- **HOW-TO-USE-SKILLS** — FC-16 is the plan-review FC gate that enforces the three-step loop at authoring time.
- **XIIGEN-CODE-REVIEW-PROTOCOL** — Gate 0i runs the three-step loop at plan-review time.
- **XIIGEN-DESIGN-REVIEW-PROTOCOL** — Check 6 runs the three-step loop at fleet-review time.
- **XIIGEN-DESIGN-ARCHITECT-SESSION-GUIDE** — ARCHITECT OUTPUT FORMAT section applies P-A5 (findings + evidence + STOP + grade) to every architect response.
- **XIIGEN-FLOW-DOCUMENT-AUTHORING-GUIDE** — General Rule 30 applies the three-step loop at Completion Gate.

---

## 8. Catalog versioning

New habits are added only when corpus evidence shows a failure class that the current catalog does not name. Version bumps are minor (1.1.0 → 1.2.0) when habits are added; major (1.0.0 → 2.0.0) when classification structure changes.

Each habit, once named, is permanent. Removal requires corpus evidence that the habit no longer occurs across 10+ sessions.

**Change history:**
- v1.0.0 — initial catalog, 17 habits
- v1.1.0 — 8 habits added (25 total), including emerging-tier negatives N-A9..N-A13
- v1.2.0 — 5 habits added (30 total): N-A16 cutting user order, N-A17 feedback not prioritized, N-A18 prior context not threaded, N-A19 no recheck against feedback, N-A20 source-layer confusion

---

## 9. Observability

For any session invoking this skill, the following should be true at ⛔ STOP:

- Every concern raised in the response is tagged with habit ID
- Every Class-a concern has documented Step 2 evidence (command executed, result cited) OR has been dissolved by Step 2
- Every BLOCK verdict is traceable to a Class-a concern with documented Step 2
- Class-b concerns are raised as CONCERN not BLOCK
- Class-c concerns are not raised

Sessions that violate these properties are out of SK-538 compliance and should be flagged at Gate 0i (plan review) or Check 6 (fleet review).

---

## 10. Universal additions (G02 refresh from llm_mvp_core) — RECONCILE, not replace

This section pulls in the core `architect-behavior-classifier` failures that the
named-habit catalog above (Sections 5–6) did not yet cover. **It does not remove
or renumber any existing habit.** The mvp form (named habits + Class-a/b/c +
BLOCK/CONCERN + 3-step doc-first loop) stays authoritative; these are the missing
core FAIL classes mapped onto that form. All detectors are TS-adapted: build =
`npm run build` (TypeScript, 0 errors); tests = `npx jest` (server ≥2342, client
≥220) and Playwright e2e; code citations use `file:line` on `.ts`/`.tsx`, never
`.cs`/`dotnet`.

### 10.1 Wrong-artifact repair reflex [N-A21] (= core FAIL-20)
**Signature:** Luba points out that implementation produced the wrong KIND of
artifact (e.g. a human-readable report when an agent-executable plan was asked,
or product code when a plan was asked), and the next action is code/test/report
repair instead of architect skill/guide/rule repair.
**Detection:** Compare requested artifact class to produced repository shape. If
they differ and the response starts repairing implementation (editing `.ts`,
rerunning `npx jest`, rewriting the report) before identifying the missing
architect/review skill, mark N-A21.
**Class:** Class-a.
**Required response:** Freeze executor repair. Name the skill/guide/rule gap,
patch the governing architect/planning/review guidance (the relevant
`.agents/skills/.../SKILL.md`), mentally replay the plan under the new rule, and
only then repair the plan. (Skills-gap-first: skill repair before artifact repair;
artifact-repair-before-skill-gap-identification = score_delta -500.)

### 10.2 Architect-to-executor role bleed [N-A22] (= core FAIL-22)
**Signature:** Architect review, coverage analysis, or governance repair turns
into parent-session implementation because the next action is "known".
**Detection:** Luba asked for architecture, review, loopholes, rules, skills,
coverage, or "why/почему"; the response starts executing, running `npm`/`jest`
commands, issuing implementation repair, or judging evidence from executor
momentum. If yes, N-A22.
**Class:** Class-a.
**Required response:** Revoke the parent-executor path, set session owner to
ARCHITECT_INTERNAL, rerun the review from goal/evidence focus, and issue only
bounded sub-agent work orders if implementation is later needed. Architect
ownership is sticky: it does not end because a next action is known, the plan
says "execute", a commit boundary is pending, or a sub-agent returned evidence.

### 10.3 Redo-reflex after quality/protocol challenge [N-A23] (= core FAIL-28, R8)
**Signature:** Luba challenges a shallow, wrong-priority, wrong-authority, or
wrong-protocol answer ("why was this so shallow", "where are the loopholes",
"почему", "find what is missing in your settings"), and the response starts
redoing the artifact, reading files, patching files, or launching a work order
BEFORE giving a visible root-cause/settings-audit answer.
**Detection:** First substantive action is a tool read, file edit, sub-agent work
order, or artifact rewrite rather than the visible answer that names the missing
setting/skill/guide/gate and the loophole it created. If yes, N-A23.
**Class:** Class-a.
**Required response:** Visible root-cause answer FIRST: name the missing/weak
setting, the loophole, and the exact protocol repair. "Add this to protocol"
authorizes the later patch; it does not skip the answer-first settings audit.
**Score:** score_delta -1000. Cross-reference: CLAUDE.md "Luba way-of-working
rules pattern" R8; "Quality/protocol challenge settings-audit pattern".

### 10.4 Two-PASS conflation: scaffold reported as trained feature [N-A24] (= core FAIL-36)
**Signature:** An untrained scaffold / honest `not_ready` skeleton (or a
deterministic helper — regex / dictionary / direct lookup) is reported as a real
learned capability.
**Detection:** A "done"/"works" claim for a learnable capability lacks
checkpoint + held-out numeric metrics + ablation + fresh-load +
continue-training + e2e through the real host entrypoint. If yes, N-A24.
**Class:** Class-a.
**Required response:** Use exactly two PASS states and never merge them:
`PASS_AS_HONEST_UNTRAINED_SCAFFOLD` (contract exists, honestly reports
`not_ready`, hides no deterministic shortcut, honesty PROVEN by tests) vs
`PASS_AS_TRAINED_FEATURE` (checkpoint + numeric metrics + ablation + fresh-load +
continue-training + e2e). Reporting a scaffold as a trained feature is the
masquerade class — the most dangerous false positive. NB (R5/G12): mvp does NOT
hold common ML units locally; it consumes shared models from `llm_mvp_core`
through manifests/locators and trains only the adaptive leg — so a "trained
feature" claim in mvp must point at the consumed model manifest, not invent a
local checkpoint.

### 10.5 Parent direct-edit under sub-agent-only instruction [N-A25] (= core FAIL-21/FAIL-50)
**Signature:** When Luba declares the parent/current session architect-only,
governance-only, or sub-agent-only, the parent direct-edits governed artifacts
(skills, plans, docs, reports, code, state), reads/analyzes governed files as
local "sidecar" research while a sub-agent is still running, converts required
sub-agent waiting/review into a final pause, follows the "I'll just quickly fix
this rule myself" direct-repair reflex, or counts parent self-review as a
sub-agent pass.
**Detection:** The edited/inspected file is a governed deliverable authored by the
parent (not a returned sub-agent packet under after-return verification); or the
parent did substantive file inspection during sub-agent wait; or a 10-review
demand was satisfied by parent self-review instead of 10 real sub-agent packets.
If any, N-A25.
**Class:** Class-a.
**Required response:** Convert the direct-edit into a bounded sub-agent work
order. Parent authority is limited to orchestration, spawning/waiting/closing
sub-agents, reviewing returned packets, safe read-only verification AFTER a
packet returns, requesting bounded fixes, and an explicit commit/push boundary
for accepted output. `Parent Architect Subagent-Only Firewall` includes
`parent local sidecar work ban`, `read-only verification after a sub-agent packet
returns`, `sub-agent waiting is not a stop`, and `no local non-overlapping work
escape`.

### 10.6 Pre-STOP self-check (TS-adapted, additive to Section 9)
Before every ⛔ STOP output, in addition to the Section 9 observability list, run:

```
□ N-A21 (FAIL-20): wrong artifact shape triggered skill/guide repair before plan/code repair
□ N-A22 (FAIL-22): architect stayed session owner and did not slide into executor mode
□ N-A23 (FAIL-28/R8): quality/protocol challenge received a visible settings audit before any redo, file read, file edit, or work order
□ N-A24 (FAIL-36): no scaffold/untrained/deterministic path was reported as a trained feature without checkpoint+metrics+ablation+fresh-load+continue-training+e2e
□ N-A25 (FAIL-21/FAIL-50): under a sub-agent-only/architect-only instruction the parent did not direct-edit governed artifacts, did not do local sidecar work during sub-agent wait, did not count self-review as a sub-agent pass, and did not turn required waiting/review into a final pause
□ Goal-verbatim still anchored in STATE.goalContext.statement (P-A4); baseline came from live `npx jest`, not memory
```

### 10.7 Content-creation firewall (TS-adapted)
ARCHITECT_INTERNAL must not directly create/edit content artifacts (documentation
.md, plan content sections, `.ts`/`.tsx` code, reports) — these go through bounded
sub-agent work orders. Direct architect writes are allowed ONLY for governance:
`AGENTS.md`, `CLAUDE.md`, skill files (`.agents/skills/**`), state files, matrix
files, and plan-governance blocks (not plan content). This is the same separation
as OP-49 plan-parity and the anti-masquerade rule.
