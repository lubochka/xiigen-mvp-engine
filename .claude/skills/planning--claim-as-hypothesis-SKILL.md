---
name: claim-as-hypothesis
version: "1.0.0"
sk_number: SK-531
priority: MANDATORY
load_order: 3
category: planning
updated: "2026-04-16"
contexts: ["web-session", "claude-code"]
---

# SK-531 Claim-as-Hypothesis — User statements about existing state require verification

A user's assertion about what exists ("the design is done," "X already works") is a hypothesis, not a fact. Planning built on unverified hypotheses is structurally unsafe. This skill captures, verifies, and gates on every such claim.

## Origin

Extracted from XIIGEN-GOVERNANCE-AUTHORING-R1 (2026-04-16). Luba stated "we already produced the proper teaching sets, and the design flows." The session treated this as established fact and started planning how to USE the teaching sets. A parallel Claude instance treated the same statement as a hypothesis and ran verification — 14 topology contracts, 10 with `nodes: []`. The claim was documentarily true (files existed) and operationally false (content missing). Plans built on the documentary version were wrong. SK-531 forces the verification step that distinguishes the two.

## When to Invoke

- At session start, during reconnaissance — capture every user assertion about existing state
- When the user makes a new claim during the session (trigger phrases in Section 2)
- Before any plan step that depends on "X exists / works / is done"
- At every ⛔ STOP — verify no PENDING_VERIFICATION claims remain

Zero pending claims at STOP = zero "we built on sand" cycles during execution.

---

## Section 1 — Purpose and Failure Pattern

Users make assertions about their own systems confidently, because from their vantage point the assertions are true. The assertions can still be wrong in ways that matter for the session's scope:

- **Documentarily true, operationally false**: a file exists at the path the user described, but its fields are empty. The user sees "the file is there"; the session that depends on its contents sees nothing.
- **True at design, false at implementation**: the user designed feature X; the user's memory of the design is accurate; the implementation was never written. Plans that "use feature X" find nothing to call.
- **Partially true**: 9 of 14 flows are implemented; the user says "flows are implemented." The session proceeds assuming all 14, a third of the work fails silently.
- **True last month, false now**: feature Y existed and was later removed / deprecated / broken. The user's memory is stale.

Each pattern is invisible from the user side. Each is catastrophic when a plan depends on it. SK-531 installs verification as a mandatory gate — the session does not treat user claims as facts without doing the read.

---

## Section 2 — Trigger Phrases

Any user message containing one of these patterns produces a PENDING_VERIFICATION entry in STATE.claims:

- **Existence claims**: "X already exists" / "we have X" / "X is in [location]"
- **Completion claims**: "the design is done / documented / complete / finished"
- **Operational claims**: "X works" / "X already works" / "this already does Y"
- **Production claims**: "we already produced Y" / "we generated Z"
- **Implementation claims**: "[flow / feature / service] is implemented / deployed / live"
- **Readiness claims**: "[artifact] is ready" / "we're ready on X" / "the pipeline is set up"
- **Integration claims**: "X is wired to Y" / "X calls Y" / "we have X going into Y"
- **Any assertion about state** that, if wrong, would change the session's scope or plan shape

The list is not exhaustive. The underlying rule: if the user is telling the session what the state of the system is, that's a claim. If the claim being wrong would matter, it must be verified.

**Trigger phrases that do NOT produce claim entries:**
- Goals ("I want X") — goals are handled by SK-536, not SK-531
- Preferences ("I prefer Y") — preferences are not about existing state
- Opinions ("I think Z is better") — opinions are not claims about state
- Past-tense narrative about decisions ("we decided X last month") — decision history is distinct from current state (though it may warrant a claim like "X was implemented")

---

## Section 3 — STATE.claims Schema

Every captured claim lives in STATE.claims as a structured entry. The entry transitions through a lifecycle:

```
PENDING_VERIFICATION → VERIFIED | DISCONFIRMED | PARTIAL | DEFERRED
```

```json
{
  "claims": [
    {
      "id": "C1",
      "statement": "[verbatim user assertion — exact quote]",
      "statementSource": "Luba message at turn N",
      "capturedAt": "2026-04-16T07:35:00Z",
      "status": "PENDING_VERIFICATION",
      "verificationAction": "[specific command or file read that will verify]",
      "importance": "BLOCKING | INFORMATIONAL",
      "verifiedAt": null,
      "verdict": null,
      "evidence": null
    }
  ]
}
```

After verification:

```json
{
  "id": "C1",
  "statement": "we already produced the proper teaching sets",
  "status": "PARTIAL",
  "verifiedAt": "2026-04-16T07:40:00Z",
  "verdict": "44 design-reasoning files exist with content; 10 of 14 topology contracts have nodes:[] — teaching SETS exist, topologies empty for most",
  "evidence": "ls fixtures/design-reasoning/*.json → 44 files; grep -l 'nodes:\\s*\\[\\]' contracts/topologies/ → 10 matches of 14"
}
```

### Status definitions

- **PENDING_VERIFICATION**: claim captured, verification action queued, not yet executed
- **VERIFIED**: verification ran; evidence matches the claim as stated
- **DISCONFIRMED**: verification ran; evidence contradicts the claim
- **PARTIAL**: verification ran; evidence matches for some subset and not others (the most common result in practice)
- **DEFERRED**: Luba explicitly approved leaving the claim unverified for this session (rare — recorded with Luba-approval timestamp and reason)

### Importance

- **BLOCKING**: if the claim is wrong, the session's plan fundamentally changes. Cannot ⛔ STOP without resolution.
- **INFORMATIONAL**: if the claim is wrong, the plan still holds (the claim was incidental context). Can ⛔ STOP with acknowledgment that the claim is unverified.

---

## Section 4 — Verification Protocol

Verification is a read action, not a reasoning action. The session does not "assess" whether a claim is likely true; it runs a specific command and records the result.

### Per claim type

| Claim shape | Verification action |
|-------------|---------------------|
| "X file exists at [path]" | `ls [path]` or `find . -path [path]` — record presence / absence |
| "X contains Y" | `grep -c [pattern] [path]` — record hit count, first 3 matches |
| "X is populated" | read file, parse if JSON/YAML, report field state per SK-537 Check 2 |
| "X is wired to Y" | grep codebase for the wiring call, report presence / absence |
| "X is implemented" | `find [service-dir] -name '*X*'` + line count, report |
| "X works end-to-end" | requires actual test run or SK-533 round-trip step verification |
| "X is deployed / live" | cannot be verified from codebase alone; defer to Luba for evidence source |

### mvp (TypeScript) verification commands (universal pattern, stack-adapted)

The verification action must be a real mvp command, not a .NET one:

| Claim shape | mvp verification action | Verdict signal |
|-------------|-------------------------|----------------|
| "X is implemented (not a stub)" | `rg "throw new Error\('not implemented'\)\|TODO\|FIXME\|@todo\|not_ready" server/src client/src` against X | 0 stub markers on X = real |
| "X service is wired" | `rg "X" server/src/**/*.module.ts` (provider in a `@Module`) | provider present |
| "X tests pass" | `npx jest --testPathPatterns "<spec>"` (Jest has no `--filter`; by test name use `-t "<name>"`) | `0 failed` |
| "UI does Y" | `npx playwright test <spec>.spec.ts` | `0 failed` |
| "type-check is clean for X" | `npx tsc --noEmit` | exit 0 |

(R5/R6 boundary: `.xiigen` / manifest claims are verified by LOADING through the
loader/locator, never by file presence alone — common models stay in
`llm_mvp_core`, mvp consumes via manifest.)

### What does not count as verification

- **Memory**: "I know from training that X likely exists" — not verification
- **Prior session**: "a prior session discussed X" — not verification (state changes between sessions)
- **Project knowledge search alone**: summarizes and excerpts but does not count
- **Assumption from file path**: "the path suggests X exists" — not verification
- **User confirmation**: Luba saying "yes it exists" does not verify Luba's original claim (that's the claim under verification; doubling it doesn't add evidence)

The only valid verification is: a specific command or file read, producing a specific observable result, recorded verbatim in the evidence field.

---

## Section 5 — Gate Enforcement

### Before first synthesis output

1. Every claim from the user's initial messages captured in STATE.claims with status PENDING_VERIFICATION
2. BLOCKING claims have a queued verification action before synthesis proceeds
3. Synthesis that depends on a claim references the claim by id (C1, C2, ...) — forward references are tracked

### Before ⛔ STOP

1. **No BLOCKING claim remains in PENDING_VERIFICATION** — all are VERIFIED, DISCONFIRMED, PARTIAL, or explicitly DEFERRED with Luba-approval recorded
2. **Synthesis output that depends on a claim has the verdict integrated** — "Plan assumes X [VERIFIED C1]" or "Plan is scoped around X being incomplete [DISCONFIRMED C1]"
3. **DEFERRED claims carry a carry-forward flag** — downstream sessions inherit the deferral and the risk

### Deferral rule

Only Luba can defer a claim. The session cannot self-defer ("let's skip verification to save time"). Deferral requires explicit approval recorded in the STATE entry:

```json
{
  "status": "DEFERRED",
  "deferredAt": "2026-04-16T07:50:00Z",
  "deferredBy": "LUBA",
  "deferralReason": "Verification requires access to production ES cluster; defer to follow-up session with API key",
  "carryForwardFlag": true
}
```

---

## Section 6 — Worked Examples

### Example A — PARTIAL (from XIIGEN-GOVERNANCE-AUTHORING-R1)

**User message (Luba, turn ~6):** "During the flow design we already produced the proper teaching sets, and the design flows."

**Claim captured:**
```json
{
  "id": "C1",
  "statement": "we already produced the proper teaching sets, and the design flows",
  "statementSource": "Luba message at turn ~6",
  "status": "PENDING_VERIFICATION",
  "importance": "BLOCKING",
  "verificationAction": "ls fixtures/design-reasoning/*.json | wc -l; ls contracts/topologies/*.json | wc -l; grep -l 'nodes:\\s*\\[\\]' contracts/topologies/"
}
```

**Verification ran (in a later turn, after codebase upload):**
- `ls fixtures/design-reasoning/*.json | wc -l` → 44
- `ls contracts/topologies/*.json | wc -l` → 14
- `grep -l 'nodes:\s*\[\]' contracts/topologies/*.json | wc -l` → 10

**Verdict update:**
```json
{
  "status": "PARTIAL",
  "verifiedAt": "2026-04-16T07:40:00Z",
  "verdict": "Teaching SETS exist (44 design-reasoning files). Design FLOWS partially exist — 14 topology files, but 10 of 14 have empty nodes[] (design started, not completed)",
  "evidence": "ls design-reasoning 44 | ls topologies 14 | grep empty 10 of 14"
}
```

**Consequence**: the plan reframed. Instead of "use the 14 design flows," the plan became "enrich the 10 empty topology files as Task 1 of the wiring work." Without SK-531, the plan would have treated all 14 as complete inputs and 10 tasks would have silently failed.

### Example B — DISCONFIRMED

**User message (hypothetical):** "The marketplace auto-publish is already wired — master tenant flows go to the marketplace on save."

**Claim captured:**
```json
{
  "id": "C2",
  "statement": "marketplace auto-publish is already wired",
  "status": "PENDING_VERIFICATION",
  "importance": "BLOCKING",
  "verificationAction": "grep -rn 'publish' engine-bootstrapper.ts; grep -rn 'marketplace' engine-bootstrapper.ts"
}
```

**Verification:**
- `grep -rn 'publish' engine-bootstrapper.ts` → 0 hits
- `grep -rn 'marketplace' engine-bootstrapper.ts` → 0 hits
- MarketplacePackageController.publish() exists but is never invoked at bootstrap

**Verdict:**
```json
{
  "status": "DISCONFIRMED",
  "verdict": "Marketplace publish endpoint exists but bootstrap does not call it. Flows are authored and go to xiigen-flow-templates but not to marketplace.",
  "evidence": "grep engine-bootstrapper.ts: 0 hits for publish, 0 hits for marketplace; MarketplacePackageController.publish() is orphaned"
}
```

**Consequence**: "bootstrap auto-publish" becomes a task in the plan. Without SK-531, the plan would have assumed the wiring existed and the round-trip test would have failed at round-trip step 3 during execution.

### Example C — VERIFIED

**User message (hypothetical):** "MarketplacePackageController exists and has the publish endpoint."

**Claim captured:**
```json
{
  "id": "C3",
  "statement": "MarketplacePackageController exists and has publish endpoint",
  "status": "PENDING_VERIFICATION",
  "importance": "INFORMATIONAL",
  "verificationAction": "ls server/src/api/marketplace-package.controller.ts; grep -n 'publish' server/src/api/marketplace-package.controller.ts"
}
```

**Verification:**
- File exists, 217 lines
- `publish(@Body() dto: PublishDto)` at line 115

**Verdict:**
```json
{
  "status": "VERIFIED",
  "verdict": "Controller exists at expected path. publish() endpoint present at line 115.",
  "evidence": "file exists (217 lines); publish endpoint at server/src/api/marketplace-package.controller.ts:115"
}
```

**Consequence**: plan can reference the controller. The endpoint is real.

---

## Section 7 — Integration Notes

- **SK-529 Reconnaissance Gate (load_order 0):** reconnaissance actions count as verification actions. When the session runs `grep -c pattern path` during reconnaissance, the hit count can serve as evidence for a captured claim about the same pattern. STATE.recon and STATE.claims cross-reference by the specific command run.

- **SK-535 Session Mode Declaration:** claims are captured in every mode, but BLOCKING threshold varies. ARCHITECT claims are often INFORMATIONAL (the decision doesn't require exact state); MATERIALIZATION claims are almost always BLOCKING (the wiring depends on exact state).

- **SK-536 Goal Context Persistence:** the user's goal may itself contain implicit claims ("make X visible" implicitly claims X exists). These implicit claims are captured alongside explicit ones.

- **SK-537 Design Artifact Completeness:** SK-531 handles user claims. SK-537 handles filesystem claims (files that exist but are empty). Both run during reconnaissance. When a user claim is about an artifact, both skills may verify the same target — SK-531 from the user-claim side, SK-537 from the artifact-integrity side. They produce the same verdict via different paths, which is a useful cross-check.

- **SK-534 Goal Delivery Completeness Arbiter:** reads VERIFIED / DISCONFIRMED / PARTIAL verdicts when evaluating whether a plan delivers the user goal. A goal statement with DISCONFIRMED support claims is a harder goal to deliver — the arbiter scopes accordingly.

- **Rule 27 in SESSION-LOAD-PLAN-v23:** formalizes SK-531 as mandatory. Phase 08 installs Rule 27.

- **FC-1 (Count Drift) in SK-410:** claim verdicts often involve counts ("14 files, 10 empty"). These counts are subject to FC-1 — if the plan references the count, the count must match STATE.claims evidence exactly.

---

## Section 8 — Anti-patterns

1. **"The user confirmed it, that's enough"** — user confirmation of a claim doubles the assertion but does not verify it. Verification is the command that reads the state of the system, not another message from the person whose claim is under review.

2. **"I'll trust this claim because it's low-stakes"** — importance classification (BLOCKING vs INFORMATIONAL) determines the STOP gate behavior, not whether to verify. All captured claims get verified; only verification verdicts can be actioned.

3. **"The claim is obviously true"** — obviousness is memory, not evidence. The 10-of-14-empty topology finding was not obvious — every mention of "we produced the design flows" sounded obviously true until the actual files were read.

4. **"Skip verification to save time"** — verification is the highest-ROI token spend. A 30-second grep prevents a 3-round plan retry. The time saved by skipping verification is borrowed at high interest.

5. **"The claim is partially true, call it VERIFIED"** — PARTIAL is a distinct verdict from VERIFIED. Collapsing them hides the gap. 9 of 14 flows implemented is PARTIAL, not VERIFIED — the 5 missing flows will surface during execution if called VERIFIED.

6. **"Infer the verification from related reconnaissance"** — inference from adjacent reads is not verification. If the claim is about file X, run the command against file X, not against file Y that "probably tells us about X."

7. **"Verify once, assume forever"** — codebase state changes. Claims from three sessions ago may be stale. Each session re-captures and re-verifies claims that matter to its scope.

---

## END OF SK-531
