# XIIGEN Response Construction Protocol
## Version: 1.0
## Status: MANDATORY for every response in ARCHITECT, PLANNER, REVIEWER, MATERIALIZATION sessions
## Load order: 7 (after SK-538 at load_order 6)
## Applies: between session-start gate and ⛔ STOP gate — every response, not only at STOP

---

## 1. Purpose

Existing governance has two enforcement points: session-start (Q0-Q4, mode declaration, goal capture) and ⛔ STOP (mandatory checks before closing a round). Between these two points, responses are constructed freely. The failures that show up during construction — cutting user order, deprioritizing corrections, not threading prior context, skipping the recheck, confusing source layers — have no governance layer that catches them mid-response.

This protocol is that layer. It defines seven steps that every response passes through before being sent. Each step has an observable signal that says it was performed. Steps 1 and 3 happen before drafting; step 4 is the draft itself; steps 5 and 6 happen after drafting and before sending; steps 2 and 7 are continuous.

The protocol is cheap when inputs are simple (a short question, no attachments, no prior correction). It is expensive and necessary when inputs are complex (multi-part request, pasted content, corrections stacking across turns). The protocol detects which case applies in Step 1 and scales effort accordingly.

---

## 2. When the protocol runs

**Every response.** Not only at ⛔ STOP.

The protocol has a light mode and a full mode. Light mode applies when Step 1 determines the user's request is a simple single-item question with no prior corrections active. Full mode applies otherwise.

Light-mode gates: Step 1 (decomposition), Step 5 (source-layer tagging if any citations), Step 7 (send). Steps 2, 3, 4, 6 still run, but as inline checks rather than explicit artifacts.

Full-mode gates: all seven steps produce explicit artifacts in the response's internal draft before send.

---

## 3. The seven steps

### Step 1 — Instruction decomposition

Before drafting, parse the user's current message into enumerated instruction items. Each item is a distinct action the user has asked for.

**Artifact produced (internal, not shown to user):**
```
Instruction items, in user's stated order:
  I1 — [verbatim or close paraphrase of first ask]
  I2 — [verbatim or close paraphrase of second ask]
  I3 — ...

Correction signal: YES | NO
  If YES: what correction? [verbatim quote of correction]

Mode: LIGHT | FULL
  LIGHT if: single item, no correction signal, no attachments to absorb
  FULL if: multiple items, correction signal, or attachments present
```

**Signals for detecting multiple items:**
- Numbered list in user's message (1, 2, 3)
- Bulleted list
- Sequencing words: "then," "after," "next," "finally"
- Multiple imperative verbs: "load skills, explain what you understand, then analyze the conversation"
- Compound requests: "produce X and then apply Y"

**Signals for detecting correction:**
- User's message begins with or contains: "nope," "no," "wrong," "bad," "stop," "you didn't," "you missed"
- User quotes a prior request back ("I asked you to...")
- User restates a prior instruction with emphasis ("I said exactly...")
- User expresses frustration: "OMG," "I don't know what to do," "stop saving my tokens"
- User names a failure mode: "you're doing X again"

**Failure mode:** If this step is skipped, instruction items get cut or reordered → maps to N-A16 (cutting user order).

**Failure mode:** If correction signal is missed, correction gets processed alongside continued production → maps to N-A17 (feedback not prioritized).

### Step 2 — Absorption

When Step 1 declared FULL mode, the response's first action is absorption of all inputs before any synthesis.

**Inputs to absorb:**
- Attached files (full read, not sampled)
- Long pasted content in user's current message
- Referenced prior turns in the conversation
- STATE fields (goalContext, recon, claims, mode)
- Project knowledge skills loaded in the Claude.ai project are inputs that must
  be absorbed before codebase files are read.

A session that reads codebase files before reading relevant project knowledge
skills has not completed Step 2 absorption. Skills are inputs. The codebase
is the verification layer.

**Artifact produced (internal):**
```
Absorption summary:
  Attached files: [list with one-sentence paraphrase of each]
  Pasted content in current message: [one-sentence paraphrase]
  Referenced prior turns: [list of turns + what each said]
  STATE fields consulted: [which ones, what they contained]

Absorption revealed: [what the inputs actually ask for, in the user's framing]
```

**Rule:** No tool call beyond reading the inputs may happen in a FULL-mode response before absorption is complete. Searching, synthesizing, producing structure — all blocked until absorption artifact exists.

**Failure mode:** If this step is skipped, response begins with tool calls that commit direction before inputs are read → maps to N-A9 (acting before reading).

**Failure mode:** If absorption is byte-counting rather than meaning-integration (file sizes, line counts, file presence-checks), the step is a miss → maps to N-A12 (enumeration substituting for meaning).

### Step 3 — Prior-correction thread

Before drafting, list the user's 3-5 most recent corrections in the session. Each must have a declared status in this response: addressed, deferred-with-reason, or obsolete.

**Artifact produced (internal):**
```
Prior corrections in session:
  C1 — [verbatim quote of correction from turn N-1 or N-2]
       Status: addressed in this response by [how] | deferred because [reason] | obsolete because [reason]
  C2 — [verbatim quote of correction from turn N-3 or earlier]
       Status: ...
  C3 — ...
```

**Rule:** Every correction in the list must have one of the three statuses. "Implicit" is not a status. "I assume it still applies" is not a status.

**Rule:** If a prior correction has status "addressed by," the draft must contain a sentence or structural element that demonstrably addresses it. The status is verified in Step 6.

**Rule:** When a correction arrives that names a whole-session failure (see ARCHITECT-SESSION-GUIDE v1.9 §4.6 for detection signals), declare it as the session's new declared job — not as one item in the thread:

  "[verbatim correction] — Status: SESSION-RESTART. Prior trajectory stops."

The response's content is the restart. Not analysis that incorporates the correction.

**Failure mode:** If this step is skipped, prior corrections stop threading through, fresh analysis takes over → maps to N-A18 (prior context not threaded).

### Step 4 — Draft

Produce the response, in the user's stated order from Step 1, with every correction from Step 3 threaded through.

**Rules during draft:**
- Address I1 before I2 before I3. Reorder only with explicit declared reason.
- Every citation (user's words, attached-file content, prior-turn content, STATE content, model's own prior output) is tagged in draft with source layer. See Step 5 for tag vocabulary.
- Every claim that a prior correction is addressed produces a sentence or structural element the Step 6 check can find.
- Claims about codebase or docs produce evidence (grep result, file view, direct quote) cited inline, not implied.

**Failure modes the draft step itself introduces if not disciplined:**
- Restating the problem as if deciding it → N-A3 (problem-restatement as design)
- Using catalog labels where user asked for direct reading → N-A15 (catalog as vocabulary for user's words)
- Ritualized governance narration that delays substance → N-A14 (performing discipline instead of doing it)

### Step 5 — Source-layer check

After drafting, before sending, every citation and every substantive claim is tagged with its source layer.

**Tag vocabulary:**
- `[user-current]` — user's current message in this turn
- `[user-earlier-turn]` — user's message in a prior turn of this session
- `[user-pasted]` — content the user pasted inline from another session or source
- `[user-attached]` — content in a file the user attached
- `[model-prior-output]` — the model's own output in an earlier turn of this session
- `[state]` — content from STATE fields (goalContext, recon, claims, mode)
- `[tool-result]` — content returned by a tool call in this turn

**Rule:** Every quoted phrase in the draft has exactly one tag. If the tag cannot be determined confidently, the quote is either removed or explicitly marked `[unknown-source]` with a stated reason.

**Rule:** Claims that depend on source layer for their weight — "you said X" vs "I said X" vs "the attached file says X" — have the tag placed adjacent to the claim in the draft text, visible in the user-facing output, not only in internal notes.

**Failure mode:** If this step is skipped, citations collapse across layers → maps to N-A20 (source-layer confusion).

### Step 6 — Feedback recheck

After drafting, before sending, read the draft in full against the corrections listed in Step 3.

**Artifact produced (internal):**
```
Feedback recheck:
  Correction C1: "[verbatim quote]"
    Addressed by draft sentence/element: [exact quote from draft OR "not addressed"]
    Verdict: ADDRESSED | NOT ADDRESSED — revise

  Correction C2: "[verbatim quote]"
    Addressed by: [exact quote from draft OR "not addressed"]
    Verdict: ...
```

**Rule:** Every correction with status "addressed" in Step 3 must be matched to a specific sentence or structural element in the draft. If the match cannot be made, revise the draft before Step 7.

**Rule:** The recheck is line-by-line against the draft, not a summary judgment. The verdict "addressed" requires pointing to a specific passage.

**Failure mode:** If this step is skipped, drafts ship where the acknowledgment of the correction was real but the actual output didn't address it → maps to N-A19 (no recheck against feedback).

### Step 7 — Send

Only after Steps 1-6 pass. Send the response.

**Rule at send time:**
- Light mode: verify Step 1 decomposition captured the single item, Step 5 tagged any citations, Step 7 fires.
- Full mode: verify all seven step artifacts exist and are consistent with the final draft.

**Failure mode:** Sending before Step 6 passes → draft ships with unaddressed corrections. Maps to N-A19.

---

## 4. Protocol compliance at ⛔ STOP

At every ⛔ STOP gate, in addition to the existing mandatory checks (1-13 in HOW-TO-USE-SKILLS), check 14 is added:

**Mandatory Check 14 — Response construction protocol compliance.** For the response being closed with this STOP:
- Step 1 decomposition artifact exists (even if light mode, the mode declaration itself is the artifact)
- Step 2 absorption artifact exists if full mode
- Step 3 prior-correction thread exists if full mode
- Step 5 source-layer tags present on all citations
- Step 6 feedback recheck verdict is ADDRESSED for every correction declared addressed in Step 3

If any of the above fail, the STOP does not fire. The response is revised and re-checked.

---

## 5. Failure-mode mapping (protocol step → SK-538 habit)

| Protocol step | Failure mode if skipped | Maps to SK-538 habit |
|---------------|-------------------------|----------------------|
| Step 1 — decomposition | User order cut; correction missed | N-A16, N-A17 |
| Step 2 — absorption | Action before reading; byte-counting | N-A9, N-A12 |
| Step 3 — correction thread | Fresh analysis replaces prior corrections | N-A18 |
| Step 4 — draft | Problem-restatement, catalog substitution, ritual | N-A3, N-A14, N-A15 |
| Step 5 — source-layer check | Citations collapse across layers | N-A20 |
| Step 6 — feedback recheck | Unaddressed corrections ship | N-A19 |
| Step 7 — send | Premature close | (gate failure, not habit) |

The protocol's value is in the mapping: each step exists because a named failure class in SK-538 shows up when the step is skipped. The protocol is not abstract discipline — it is the anti-procedure for documented corpus failures.

---

## 6. Worked examples

### Example 1 — corpus reading request (chata_data_3 opening)

**User message:** *"I need you as an architect load the architect skills then load the architect session explain in your words what you understand, then session, review and code review files, and explain as an architect. Then load the conversation and explain as architect what happened there."*

**Step 1 — decomposition:**
```
Instruction items, in user's stated order:
  I1 — load the architect skills
  I2 — explain in your words what you understand (about the skills)
  I3 — (load) session, review and code review files, and explain as an architect
  I4 — load the conversation and explain as architect what happened there

Correction signal: NO
Mode: FULL (multiple items, attachments referenced)
```

**Step 2 — absorption (required before drafting):**
Read all attached files (session files zip, review protocols, conversation corpus) in full. Produce absorption summary.

**Step 3 — prior-correction thread:**
First response in session, no prior corrections. Thread artifact: "no prior corrections to thread."

**Step 4 — draft:**
Address I1 (load), I2 (explain skills), I3 (explain session/review/code-review files), I4 (explain conversation) — in that order. Source-layer tag every citation.

**What went wrong in corpus:** I3 was skipped entirely. Step 1 would have caught it (item present in decomposition but absent in draft). Step 6 would have caught it (no sentence addresses I3).

### Example 2 — correction-laden response (chata_data_3 round 5)

**User message:** *"Noncense I said exactly what wrong in conversation and again you ignored it, and not did WHAT I REQUESTED - READ IT AND ANSWER MY QUESTION"*

**Step 1 — decomposition:**
```
Instruction items:
  I1 — Read the conversation (not analyze it abstractly)
  I2 — Answer the original question (what Luba said was wrong in conversation)

Correction signal: YES
  Correction: "I said exactly what wrong in conversation and again you ignored it"
  Meaning: prior response translated user's words into catalog vocabulary; user wants direct quotes of what she said

Mode: FULL (correction signal present)
```

**Step 3 — prior-correction thread:**
```
Prior corrections in session:
  C1 — (prior turn) User asked for analysis of plans, said not to assume uploaded plans were the ones meant
       Status: obsolete — user has now redirected to "what I said in conversation"
  C2 — (this turn) "READ IT AND ANSWER MY QUESTION"
       Status: must be addressed by quoting user's actual words, not catalog labels

Correction priority: C2 is the active override. Draft must produce direct quotes.
```

**Step 4 — draft:**
Quote Luba's corrections from conversation verbatim. No catalog IDs. No SK-538 labels. No abstract categorizations.

**Step 6 — feedback recheck:**
For each quote in draft, tag source: `[user-pasted-in-corpus]` or `[user-earlier-turn]`. Verify draft contains actual Luba sentences, not descriptions of Luba sentences.

**What went wrong in corpus:** the response continued producing catalog-style analysis with some quotes mixed in. Step 3 would have declared C2 the active override. Step 6 recheck would have caught that draft content was still mostly abstract framing with quotes as decoration.

### Example 3 — light-mode response

**User message:** *"what's the load order for SK-536?"*

**Step 1 — decomposition:**
```
Instruction items:
  I1 — state the load order for SK-536

Correction signal: NO
Mode: LIGHT
```

**Steps 2, 3, 4 collapse to:** look up SK-536 load order in skill file, state it.

**Step 5:** cite source (`[state]` or `[user-attached]` depending on where SK-536 definition lives).

**Step 7:** send.

Light mode takes one or two sentences of response. The protocol overhead is minimal because the input is simple.

---

## 7. What this protocol does not do

The protocol governs how a response is constructed. It does not govern:

- The content of the response (what claims to make — that's SK-538 for failure modes, SK-529 for reconnaissance threshold, SK-534 for goal coverage)
- The session's scope (what mode applies — that's SK-535)
- The plan's correctness (what gates run — that's the CODE-REVIEW-PROTOCOL gates)
- The fleet's coherence (what signals aggregate — that's DESIGN-REVIEW-PROTOCOL)

The protocol is composition-layer discipline. It ensures that whatever content the session chooses to produce, it is produced in the right order, with correction priority, threaded from prior context, with sources tagged, rechecked before send.

---

## 8. Detection and enforcement

### During authoring

The author of a response (Claude, in an architect session) runs Steps 1-7 as internal discipline. The artifacts are internal; what the user sees is the Step 4 draft after Steps 5-6 have verified it.

### At ⛔ STOP (Mandatory Check 14)

When a STOP gate fires, the response's protocol artifacts are audited. Missing artifacts → STOP does not fire → response revised.

### At plan review (Gate 0j in CODE-REVIEW-PROTOCOL)

When a plan is reviewed, the reviewer checks whether the plan document itself was constructed per the protocol:
- Did the plan author decompose the user's request in plan's intro section?
- Does the plan reference the specific user corrections that shaped it?
- Does the plan's structure follow the user's stated order?

A plan that fails Gate 0j is revised before plan-correctness review begins (Gates 0a-0i).

### At fleet review (Check 6 in DESIGN-REVIEW-PROTOCOL)

When the fleet of flows is reviewed, protocol compliance is a fleet signal: how many flows' most recent plan documents show protocol artifacts. Fleet-level drift on this signal indicates the protocol has stopped being applied at authoring time.

---

## 9. Versioning

This is version 1.0 — initial protocol. Change history begins here.

Future versions add steps only when corpus evidence shows a construction-time failure mode not covered by the current seven steps. Removing steps requires evidence that the failure mode they guard against has not occurred across 10+ sessions.

**Change history:**
- v1.0 — initial protocol, 7 steps, mapping to SK-538 v1.2.0 habits

---

## 10. Observability

For any session applying this protocol, the following should be true at every ⛔ STOP:

- Every response in the session has a declared mode (LIGHT or FULL)
- Every FULL-mode response has Step 1, 2, 3, 5, 6 artifacts in internal draft
- Every LIGHT-mode response has Step 1 decomposition and Step 5 tagging where applicable
- No response sent with Step 6 recheck verdict of NOT ADDRESSED
- Mandatory Check 14 has fired at every STOP in the session

Sessions that violate these properties are out of protocol compliance and should be flagged at Gate 0j (plan review) or the fleet signal (design review).
