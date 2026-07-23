---
name: reconnaissance-gate
version: "2.4.0"
sk_number: SK-529
priority: MANDATORY
load_order: 0
category: planning
updated: "2026-04-21"
contexts: ["web-session", "claude-code"]
---

# SK-529 Reconnaissance Gate — Evidence before synthesis

A plan, review, or architect-level answer that was produced before the session read the files is an essay, not an analysis. This skill prevents that.

## Origin

Extracted from the session that authored XIIGEN-GOVERNANCE-MASTER-PLAN v1.0.0 (2026-04-16). The session's first architect answer was "four lanes with structural gaps" — zero file:line references, zero N-of-M counts, zero verbatim excerpts. A parallel Claude instance asked the same question produced "14 of 20 topology contracts, 10 with nodes: [], line 147 hardcoded disabled" — and arrived at a concrete 4-task plan in two minutes. The difference was reconnaissance. This skill installs it as a mandatory gate.

## When to Invoke

- At session start, BEFORE SK-528 Pipeline Position Check (load_order 0 — runs first)
- BEFORE any plan output
- BEFORE any plan-review verdict
- BEFORE any architect-level synthesis
- When the user signals wide-scope work (Rule 26 in SESSION-LOAD-PLAN) — thresholds double

One run of this skill before synthesis = zero "write from memory, correct from evidence" cycles during the session.

---

## Section 1 — Purpose and Placement

SK-529 is literally load-order-0 because every downstream governance skill assumes an evidence base exists to check against:

- SK-528 Pipeline Position Check cannot answer Q0a/Q0b/Q0c/Q0d without evidence about upstream and downstream stages.
- SK-526 Scope Isolation Arbiter cannot check index access patterns without reading which indices the session actually touches.
- SK-443 Session File Authoring cannot reference the user goal without the goal being captured from reconnaissance.
- SK-410 Plan Review's failure classes (FC-1 count drift, FC-2 path errors, FC-3 skill inversion) are all fundamentally evidence checks — they fail closed if the reviewer is reading from memory.

Reconnaissance is the root. Every other gate depends on it. This skill makes it mandatory and threshold-gated.

---

## Section 2 — Thresholds per Session Type

A session cannot emit its first synthesis output until the reconnaissance threshold is met AND STATE.recon is saved.

| Session type | File reads | Grep counts | Verbatim excerpts |
|--------------|-----------:|------------:|------------------:|
| EXECUTOR | 5 | 2 | 3 |
| PLANNING | 10 | 3 | 5 |
| REVIEW | 15 | 5 | 8 |
| ARCHITECT | 20 | 8 | 10 |
| MATERIALIZATION | 20 | 8 | 10 |

Rule 26 (wide-scope mode in SESSION-LOAD-PLAN) doubles all thresholds. Triggers for wide-scope: user says "see the whole picture" / "don't save tokens" / "load the real state"; user uploads ≥5 files or ≥100 KB total.

**Counts are orthogonal.** "15 file reads but 0 grep counts" fails the threshold — each dimension is a separate gate. Distribution matters because each type of evidence catches a different class of failure:

- File reads catch "that file doesn't exist at that path"
- Grep counts catch "how many of X are there and how many are populated"
- Verbatim excerpts catch "the code actually says Y, not what I remembered"

**Threshold vs. coverage fraction.** *(NEW v2.3.0)* Meeting the threshold confirms the session read *enough files to have evidence*. It does not confirm the session read *enough of the relevant domain to make system-level claims*. A session that reads 20 files from a domain of 200 has met the threshold and has 10% coverage — both facts must be declared. See Section 3 domain universe block and Section 5 gate 4.

---

## Section 3 — RECON REPORT Template

Before first synthesis, session produces a RECON REPORT and saves it to STATE.recon.

```markdown
# RECON REPORT — Session [ID]

## Session type: [EXECUTOR | PLANNING | REVIEW | ARCHITECT | MATERIALIZATION]
## Wide-scope: [YES | NO]
## Threshold: [N] file reads / [M] grep counts / [K] excerpts
## Actual: [n] file reads / [m] grep counts / [k] excerpts
## Threshold met: [PASS | FAIL — short of threshold in dimension X]

### Domain universe declaration  *(v2.3.0 — required for ARCHITECT and MATERIALIZATION)*
Entity type being examined: [flows | services | client pages | topology files | other]
Total universe: [N] — source: [file or command that establishes this count]
Examined in this session: [n]
Coverage fraction: [n/N = X%]

Unread and material:
- [entity name] — [one sentence: why it could change a synthesis claim if read]
- [entity name] — [one sentence: why it could change a synthesis claim if read]
(If all material entities were examined, state: "none — all material entities examined.")

Unread and not yet known to be material: [count]
Resolution: [how the session will handle these — "deferred to next session" |
            "out of scope for this goal" | "examined if any synthesis claim is
            challenged" — one of these three, no others]

### Raw counts
- [Artifact type]: [count] files at [path glob]
- Of those matching [condition]: [count]
- Of those not matching [condition]: [count]

### File inventory
- [filepath]: [size bytes], [line count] lines — [one-line summary of contents]
- [filepath]: [size bytes], [line count] lines — [one-line summary of contents]
- ...

### Grep findings
- Pattern "[regex]" in [path scope]: [N] hits
  - [file:line] [excerpt showing the hit]
  - [file:line] [excerpt showing the hit]
- Pattern "[regex]" in [path scope]: [N] hits
  - ...

### Specific references (verbatim)  *(v2.2.0 — evidence-layer tag required on every entry)*
- [filepath:line-range]: "[verbatim text as it appears in file]"
  Evidence layer: [DESIGN_DOC | IMPLEMENTATION | TEST | RECONCILIATION]

- [filepath:line-range]: "[verbatim text]"
  Evidence layer: [DESIGN_DOC | IMPLEMENTATION | TEST | RECONCILIATION]

Evidence layer definitions:
  DESIGN_DOC     — file describes intended behavior; not evidence that the
                   behavior exists in running code. Includes: design simulation
                   docs, implementation plans, STEP-1-INVARIANTS, session briefs,
                   ADAPTER-CICD-BRIDGE-DESIGN and similar planning documents.
  IMPLEMENTATION — file is source code; evidence of what the system actually does.
                   Includes: *.service.ts, *.handler.ts, *.controller.ts, *.tsx,
                   *.ts source files, package.json dependency lists.
  TEST           — file is a test suite; evidence of what has been verified to
                   work under the test conditions. Includes: *.spec.ts, *.test.ts,
                   e2e test fixtures, test run outputs.
  RECONCILIATION — file is a state record that describes current implementation
                   status; may be stale. Treat every RECONCILIATION excerpt as
                   PENDING_VERIFICATION per SK-531 until cross-checked against
                   IMPLEMENTATION evidence. Includes: CURRENT-STATE.json,
                   RECONCILIATION-STATE.md, 47-FLOW-CURRENT-STATE-MASTER.md,
                   INFRASTRUCTURE-FLOWS-STATE-v6.json.

### Hypotheses to be tested  *(v2.4.0 — mandatory before instance 1 when N ≥ 5)*
- H1: [specific hypothesis about state of codebase]
  Confirms if: [observable that would be found in [file type] if H1 holds]
  Refutes if: [observable that would be found instead if H1 fails]
  Scenario step: [which goal step this hypothesis tests, or "cross-cutting"]
- H2: [...]

Multi-entity rule: when the session will examine N ≥ 5 instances of the same entity
type (flows, services, client pages, topology files), hypotheses MUST be declared
here before examining instance 1. Hypotheses formed after reading the first instances
carry confirmation bias from those reads. The declaration here is the gate: no
per-instance examination begins until hypotheses are recorded in this section.

Single-entity rule (N < 5): hypotheses encouraged but not blocking. May be populated
during reconnaissance and refined before synthesis.
```

The report is factual only. Interpretation, recommendation, and synthesis do not belong here — they belong in the session output that cites this report.

---

## Section 4 — STATE.recon Schema

```json
{
  "recon": {
    "sessionType": "ARCHITECT",
    "wideScope": true,
    "threshold": {
      "fileReads": 40,
      "grepCounts": 16,
      "excerpts": 20
    },
    "actual": {
      "fileReads": 42,
      "grepCounts": 18,
      "excerpts": 24
    },
    "thresholdMet": true,
    "completedAt": "2026-04-16T07:45:00Z",
    "domainUniverse": {
      "entityType": "flows",
      "totalUniverse": 49,
      "universeSource": "ls docs/sessions/ | grep FLOW | wc -l",
      "examinedThisSession": 8,
      "coverageFraction": "8/49 = 16%",
      "unreadAndMaterial": [
        {
          "entity": "FLOW-32",
          "reason": "owns marketplace packaging (T516) — synthesis claims about package format depend on this flow"
        },
        {
          "entity": "FLOW-47",
          "reason": "owns module lifecycle — synthesis claims about version management depend on this flow"
        }
      ],
      "unreadNotYetKnownMaterial": 39,
      "resolution": "deferred to next session — 49-flow examination protocol planned"
    },
    "fileInventory": [
      {
        "path": "server/src/api/marketplace-package.controller.ts",
        "bytes": 8847,
        "lines": 217,
        "summary": "REST controller for marketplace package operations"
      }
    ],
    "grepFindings": [
      {
        "pattern": "nodes:\\s*\\[\\]",
        "scope": "contracts/topologies/",
        "hits": 10,
        "sample": ["topology-1.json:45", "topology-2.json:45"]
      }
    ],
    "excerpts": [
      {
        "filepath": "client/src/pages/FlowLibraryPage.tsx",
        "lines": "145-152",
        "text": "disabled title=\"Fork available after FLOW-18 marketplace wiring (Turn 15)\"",
        "evidenceLayer": "IMPLEMENTATION"
      }
    ],
    "hypotheses": [
      {
        "id": "H1",
        "statement": "10 of 14 topology files are empty",
        "status": "CONFIRMED",
        "evidence": "grepFinding[0]"
      }
    ]
  }
}
```

Every synthesis output cites STATE.recon entries. The "Evidence Index" block in the output lists which STATE.recon entries back which synthesis claims.

---

## Section 5 — Gate Enforcement

### Before first synthesis output

1. **STATE.recon exists?** — if no, reject output, run reconnaissance first.
2. **STATE.recon meets threshold?** — if no, expand reconnaissance before synthesis.
3. **Synthesis references STATE.recon?** — if no, reject output, add Evidence Index.

### Before ⛔ STOP

1. **Every synthesis claim has a STATE.recon reference?** — if no, reject the STOP.
2. **Unreferenced prose allowed at most 20% of total word count** — framing and transitions are permitted; claims of fact are not.
3. *(NEW v2.2.0)* **Every synthesis claim that asserts something "works", "exists as implemented", or "is running" cites at least one excerpt tagged IMPLEMENTATION or TEST.** A claim backed only by DESIGN_DOC excerpts may assert intent, not existence. If the only evidence for a "works" claim is DESIGN_DOC layer, the claim must be reworded to "was designed to work" or "is intended to work."
4. *(NEW v2.3.0)* **For ARCHITECT and MATERIALIZATION sessions: STATE.recon.domainUniverse block is present.** Coverage fraction is declared. Any synthesis claim using universal quantifiers ("no flow", "all services", "every", "nowhere", "anywhere") must either (a) be scoped to the examined fraction — "among the [n] [entities] examined" — or (b) demonstrate coverage fraction ≥ 50% in STATE.recon. A universal claim at coverage below 50% without a scope qualifier fails this gate.
5. *(NEW v2.4.0)* **For sessions examining N ≥ 5 instances of the same entity type: hypotheses were declared in STATE.recon before instance 1 was examined.** Check STATE.recon.hypotheses[]. If the array is empty or was populated after the first instance read (detectable because the first instance's result record predates any hypothesis entry), this gate fails. Synthesis that draws on per-instance verdict patterns without pre-declared hypotheses is not hypothesis-driven examination — it is post-hoc pattern matching.

These gates are enforced by the session itself (Claude checks its own output) and by the reviewer (Gate 0d in CODE-REVIEW-PROTOCOL spot-verifies 3 random claims against STATE.recon).

---

## Section 6 — Worked Examples

### Example A — FAIL (from the session this skill was produced in)

- **Session type:** ARCHITECT
- **Threshold:** 20/8/10 — **Actual:** 0/0/0 — **Threshold met:** NO
- **Synthesis produced:** "Four lanes with structural gaps."
- **Verdict:** REJECTED — zero evidence base, essay not analysis.

### Example B — PASS (from the parallel instance's analysis)

- **Session type:** MATERIALIZATION
- **Threshold:** 20/8/10 — **Actual:** 42/18/24 — **Threshold met:** YES
- **Domain universe:** 14 topology files examined / 14 total = 100% coverage for this entity type
- **Synthesis produced:** "14 of 20 topology contracts, 10 with nodes: []. Bootstrap never calls publish. FlowLibraryPage.tsx:147 hardcoded disabled."
- **Verdict:** PASS — threshold exceeded, coverage complete for the targeted entity type, all claims grounded in IMPLEMENTATION excerpts.

### Example C — PASS (XIIGen ARCHITECT session, Tier-0 executed) *(NEW v2.0.0)*

- **Session type:** ARCHITECT — **Threshold met:** YES (18/8/11)
- **Domain universe:** 1 flow (FLOW-07) examined / 1 flow in scope = 100% for this session's declared scope
- **Synthesis:** "FLOW-07: 10 services confirmed at server path, Track C ALL_PASS, 2 client pages unrouted in App.tsx."
- **Verdict:** PASS — Tier-0 completed, flow-specific reads added evidence, coverage fraction valid for single-flow scope.

### Example D — FAIL (evidence-layer violation) *(NEW v2.2.0)*

- **Session type:** ARCHITECT — **Threshold met:** YES (20/8/12)
- **All 12 excerpts:** DESIGN_DOC layer
- **Synthesis claim:** "The AdapterDeploymentBridge pushes generated code to external repos via GitHub API."
- **Gate 3 check:** "pushes" asserts implementation reality. Zero IMPLEMENTATION excerpts. Gate fails.
- **Required fix:** Reword to "was designed to push..." OR read the service file and record an IMPLEMENTATION excerpt.
- **Verdict:** REJECTED at gate 3.

### Example E — FAIL (system-level claim without coverage fraction) *(NEW v2.3.0)*

- **Session type:** ARCHITECT — **Threshold met:** YES (20/8/10)
- **Domain universe block:** ABSENT
- **Entities examined:** 4 flows out of 49 total (coverage: 8%, undeclared)
- **Synthesis claim:** "No flow has a git repository reference in any data structure. No field repoUrl, gitRef, or equivalent anywhere."
- **Gate 4 check:** Universal quantifier ("no flow", "anywhere"). Domain universe block absent. Coverage fraction not declared. Even if declared, 8% < 50% threshold for universal claims.
- **Required fix (choose one):** (a) Add domain universe block declaring 4/49 = 8% coverage; narrow claim to "Among the 4 flows examined, no git reference field was found." (b) Expand examination to ≥ 25 flows (≥50%) before making the universal claim. (c) Route to SK-552 per-entity examination protocol to cover all 49 flows systematically.
- **Verdict:** REJECTED at gate 4.

### Example F — FAIL (post-hoc hypothesis in multi-entity session) *(NEW v2.4.0)*

- **Session type:** ARCHITECT — **Threshold met:** YES (20/8/10)
- **Domain universe:** flows (49 total) — **Entities examined:** 12 of 49 (24%)
- **STATE.recon.hypotheses[]:** populated at turn 4, after flows 1–3 were already examined at turns 1–3
- **What happened:** Session read three flows, noticed that all three had Category B imports from `bootstrap/`. At turn 4, recorded: "H-1: services import from bootstrap/. Let's verify across remaining flows."
- **Gate 5 check:** STATE.recon.hypotheses[] was empty when instances 1–3 were examined. The hypothesis was formed from the first three instances and then used to examine the remaining nine. Flows 4–12 were examined expecting to find bootstrap/ imports. The finding "9 of 12 flows examined have Category B imports" cannot be trusted as unbiased — the examiner already expected this finding before looking.
- **Required fix:** Restart the multi-entity examination. Declare all hypotheses before examining instance 1. For this domain: what would confirm H-1? What would refute it? State both before reading any service file. Then examine all 49 flows in sequence.
- **Verdict:** REJECTED at gate 5. Per-instance verdicts produced after post-hoc hypothesis formation are inadmissible as evidence for system-level claims.

---

## Section 7 — Anti-patterns

1. **"I already know this"** — reconnaissance is not optional based on confidence. A session's internal certainty is not evidence; files are.

2. **"I read the project knowledge"** — project_knowledge_search returns summaries, not counts. STATE.recon requires actual file reads and grep counts.

3. **"I'll count when I need to"** — counts go in the RECON REPORT upfront, not on-demand during synthesis.

4. **"The user told me X exists"** — user claims about existing state require SK-531 verification. Taking a claim as evidence skips the verification loop.

5. **"Saving tokens"** — reconnaissance is the highest-ROI token spend. Every token upfront prevents ~10x tokens of correction downstream.

6. **"Reconnaissance is for the next round"** — synthesis before reconnaissance creates a commitment trap. Round 2 reconnaissance then either confirms (lucky) or contradicts (sunk cost). Reconnaissance precedes the first synthesis.

7. **"I've seen this codebase before"** — codebase state changes between sessions. The RECON REPORT is a current-session snapshot, not a memory retrieval.

8. **"Tier-0 is optional for small questions"** *(NEW v2.0.0)* — Tier-0 is unconditional for every ARCHITECT session in XIIGen. There is no "small enough to skip Tier-0" threshold.

9. **"DESIGN_DOC evidence proves implementation"** *(NEW v2.2.0)* — a design document shows what was intended. A source file shows what exists. Every "works" or "exists" claim in synthesis must trace to at least one IMPLEMENTATION or TEST excerpt. If every excerpt is DESIGN_DOC-tagged, the session has no implementation evidence.

10. **"Threshold met means the picture is complete"** *(NEW v2.3.0)* — the threshold confirms minimum evidence was gathered. It does not confirm the relevant domain was covered. A session reading 20 files from a universe of 200 has met the threshold at 10% coverage. System-level claims ("no flow has X", "all services do Y") cannot be made from 10% coverage without a scope qualifier. Meeting the file-read threshold and declaring the coverage fraction are two separate requirements. Anti-pattern signal: STATE.recon has no `domainUniverse` block but synthesis output contains "no", "all", "every", "nowhere", or "anywhere."

11. **"I'll declare the hypothesis after I see what the data shows"** *(NEW v2.4.0)* — for sessions examining N ≥ 5 instances, hypotheses declared after reading the first instances are shaped by those instances. The hypothesis then appears to be confirmed by the remaining instances because the examiner is looking for what the early evidence primed them to find. The gate does not care whether the hypothesis feels natural after the first few reads — it requires the hypothesis to be stated before instance 1 is opened. Anti-pattern signal: STATE.recon.hypotheses[] is empty at the time per-instance examination records begin to appear, then is populated mid-session.

---

## Section 8 — Integration Notes

- **SK-528 Pipeline Position Check (load_order 0.5):** runs immediately after SK-529. SK-528 Q0a/b/c/d assumes STATE.recon exists.

- **SK-535 Session Mode Declaration:** uses the threshold table (Section 2) to set per-mode expectations. ARCHITECT and MATERIALIZATION declare higher thresholds.

- **SK-536 Goal Context Persistence:** STATE.goalContext loads alongside STATE.recon. The goal statement drives which files are candidates for reconnaissance.

- **SK-531 Claim-as-Hypothesis:** user assertions about existing state require reconnaissance verification. Verification actions count toward threshold. RECONCILIATION-layer excerpts are themselves SK-531 claims — a RECONCILIATION record stating "10 services present" requires an IMPLEMENTATION read to confirm.

- **SK-532 Materialization Session Type:** triggers 20/8/10 threshold plus wide-scope doubling. *(v2.3.0: MATERIALIZATION sessions also require the domain universe gate — "what exists" must be quantified before claiming inventory is complete.)*

- **SK-530 Specificity Calibration:** counts file:line references, N-of-M claims, and verbatim excerpts in synthesis. SK-530 is the downstream check that reconnaissance evidence landed in the synthesis output.

- **SK-552 Per-Entity Examination Protocol (load_order 5.9):** *(NEW v2.3.0 cross-reference)* when the domain universe block shows N ≥ 5 unread entities that are material to synthesis claims, SK-552 governs how to structure their systematic examination. The domain universe block is the routing signal that activates SK-552.

- **Rule 25 in SESSION-LOAD-PLAN:** formalizes SK-529 as load_order 0 and makes the threshold table canonical.

- **Gate 0d in CODE-REVIEW-PROTOCOL:** reviewer spot-checks 3 random synthesis claims against STATE.recon. *(v2.2.0: reviewer checks that "works" claims cite IMPLEMENTATION or TEST excerpts.)* *(v2.3.0: reviewer checks that universal claims are either scoped to coverage fraction or backed by ≥50% coverage in STATE.recon.domainUniverse.)*

- **Section 10 (NEW v2.0.0):** XIIGen-specific Tier-0 search list. Tier-0 reads count toward the Section 2 threshold.

- **XIIGEN-CODEBASE-ORIENTATION-MAP:** full question-class → file-path table and commands. Consult when Tier-0 does not answer the question.

---

## Section 8.1 — When hypotheses must precede examination *(NEW v2.4.0)*

The RECON REPORT Hypotheses section serves two different functions depending on session scope. The distinction matters because the order of operations is different in each case.

**Single-entity sessions (N < 5 instances):** Hypotheses emerge during reconnaissance and are refined before synthesis. The session reads files, notices patterns, and forms hypotheses about what the patterns mean. Hypotheses are recorded in STATE.recon as they emerge. This is the normal flow.

**Multi-entity sessions (N ≥ 5 instances of the same entity type):** Hypotheses must be declared before examining instance 1. The session states what it expects to find — and what would confirm or refute each expectation — before opening any instance file. Then every instance examination is structured to test the declared hypotheses and produce a per-instance verdict (`CONSISTENT | INCONSISTENT | PARTIAL | NOT_TESTABLE`) for each.

**Why the order is different for N ≥ 5:** If hypotheses are formed after examining instances 1–3, they are already shaped by what those instances showed. Instances 4–N are then examined with confirmation bias embedded. The examiner finds what they already expect. The per-instance verdicts cluster around the early hypotheses because the early hypotheses were formed from the early evidence. The aggregate looks like rigor but is circular.

When hypotheses precede instance 1, each instance either confirms, refutes, or cannot test the hypothesis — and the examiner cannot retroactively adjust the hypothesis to fit an inconvenient instance. The 49-flow examination protocol that emerged from the module-separation session corpus was rigorous precisely because the six hypotheses were declared before any flow was read. That discipline is what this section installs as structural, not accidental.

**What a pre-declared hypothesis looks like:**

```
H-1 — The fabric interface boundary hypothesis.
Claim: Every service file imports only from fabric interfaces, never from concrete
       engine implementation classes.
Confirms if: Zero imports from kernel/, engine/core/, or bootstrap/ found in any
             *.service.ts file for this flow.
Refutes if:  Any import from kernel/, engine/core/, or bootstrap/ found in any
             *.service.ts file — one is sufficient.
Scenario step: Step 2 (tenant adapts flow in own repo) — extraction is only feasible
               if services have no engine-core coupling.
```

**What a post-hoc hypothesis looks like (forbidden for N ≥ 5):**

```
After reading FLOW-01, FLOW-32, and FLOW-47:
"It seems like the main issue is that services import from bootstrap/. Let's
call that H-1 and check the other flows for it."
```

This is post-hoc labeling. The hypothesis was derived from the evidence that was supposed to test it. The remaining 46 flows will be examined with the expectation already planted. Gate 5 catches this — STATE.recon.hypotheses[] is empty at the time the first instance read was recorded means hypotheses came after, not before.

**The routing gate:** When the domain universe block (v2.3.0) shows N ≥ 5 unread material entities, and the Hypotheses section is empty, the session must stop and declare hypotheses before examining any instance. This is the routing signal to SK-552 Per-Entity Examination Protocol (load_order 5.9), which governs the full multi-entity examination structure.

---

## Section 9 — Failure Modes This Skill Prevents

| Failure mode | How reconnaissance catches it |
|---|---|
| Essay-over-evidence | Threshold not met before synthesis → output rejected |
| File claims without real paths | RECON REPORT file inventory requires actual paths |
| Counts pulled from memory | Grep counts require actual grep command with hit counts |
| Paraphrased quotes | Verbatim excerpts section demands exact character match |
| Confidence substituting for evidence | Anti-pattern 1 — "I already know this" forbidden |
| Wide-scope without broad reconnaissance | Rule 26 wide-scope doubles thresholds |
| Round 1 synthesis without reconnaissance | Gate enforces reconnaissance BEFORE first synthesis |
| User claim accepted without verification | SK-531 verification actions count toward reconnaissance |
| "Seen this codebase before" assumption | RECON REPORT is per-session, not retrieved |
| Locked decision violated unknowingly | Tier-0 item 4: DECISIONS-LOCKED.md read before synthesis |
| Stale artifact ID causing collision | Tier-0 item 6: INFRASTRUCTURE-FLOWS-STATE read before ID consumed |
| Flow state misread (design vs. built) | Tier-0 item 5: 47-FLOW-CURRENT-STATE-MASTER read before flow claim |
| DESIGN_DOC cited as proof of implementation *(v2.2.0)* | Evidence-layer tag on every excerpt; gate 3 rejects "works" claims without IMPLEMENTATION or TEST evidence |
| System-level claim from partial coverage *(v2.3.0)* | Domain universe block required; gate 4 rejects universal claims at <50% coverage without explicit scope qualifier |
| Post-hoc hypothesis in multi-entity examination *(v2.4.0)* | Hypotheses section requires confirm/refute observables; gate 5 rejects per-instance verdicts when hypotheses were absent at instance 1 read time |

---

## Section 10 — XIIGen ARCHITECT Tier-0 Search List *(NEW v2.0.0)*

This section applies when the session is operating on the XIIGen codebase
(`xiigen-mvp-claude-vigorous-margulis` or successor). It defines 8 files that
MUST be read before any other file at the start of every ARCHITECT session.

The purpose of Tier-0 is to front-load the 8 highest-signal-to-noise files in
the codebase — the files that between them answer the most common failure modes:
acting on a stale counter, violating a locked decision, misreading a flow's
implementation state, or producing synthesis without knowing the product goal.

### 10.1 — The Tier-0 List

| # | File | What to read | Counts toward threshold | What it prevents |
|---|------|-------------|------------------------|-----------------|
| T0-1 | `docs/architecture/QUICK_REFERENCE.md` | Full file | 1 file read | Acting on stale commands, wrong DNA pattern |
| T0-2 | `docs/architecture/KNOWLEDGE_DIGEST.md` | §1–§5 | 1 file read | Misunderstanding engine structure, fabric misuse |
| T0-3 | `CLAUDE.md` | §The 16 Rules | 1 file read | Rule violation in plan, wrong documentation gate |
| T0-4 | `docs/decisions/DECISIONS-LOCKED.md` | Full file + grep | 1 file read + 1 grep | Proposing something already locked |
| T0-5 | `docs/sessions/47-FLOW-CURRENT-STATE-MASTER.md` | Full matrix | 1 file read | Claiming a flow is ready when Track A/B/C say otherwise |
| T0-6 | `docs/state/INFRASTRUCTURE-FLOWS-STATE-v6.json` | Full file + next-ID fields | 1 file read + 1 grep | Assigning a colliding counter |
| T0-7 | `docs/XIIGEN_PRODUCT_SPECS.md` §FLOW-XX *(if flow named)* | Flow-specific section | 1 file read | Misreading product intent |
| T0-8 | `docs/sessions/FLOW-XX/FLOW-XX-RECONCILIATION-STATE.md` *(if flow named)* | Full file | 1 file read | Planning work already done; missing work not yet done |

**If no specific flow is named:** replace T0-7 and T0-8 with:
- `docs/architecture/ARCHITECTURE_GUIDE.md` §2–§3
- `docs/XIIGEN_PRODUCT_SPECS.md` §How to Read This Document + first 2 flow entries

**Total Tier-0 contribution:** 8 file reads (40% of ARCHITECT threshold) + 2 grep counts (25% of ARCHITECT threshold).

### 10.2 — Tier-0 Grep Commands

```bash
# T0-4: Locked decision count and IDs
grep -n "^## D-\|^D-[A-Z].*Status: LOCKED" docs/decisions/DECISIONS-LOCKED.md

# T0-6: Canonical next-ID counters
python3 -c "
import json
d = json.load(open('docs/state/INFRASTRUCTURE-FLOWS-STATE-v6.json'))
print('version:', d.get('version'))
print('lastUpdated:', d.get('lastUpdated'))
flows = d.get('flows', {})
print('flow count:', len(flows))
complete = [k for k,v in flows.items() if isinstance(v, dict) and v.get('status') == 'COMPLETE']
print('COMPLETE flows:', len(complete))
"
```

### 10.3 — Tier-0 in STATE.recon

```json
{
  "recon": {
    "tier0": {
      "completed": true,
      "flowNamed": "FLOW-07",
      "filesRead": [
        "docs/architecture/QUICK_REFERENCE.md",
        "docs/architecture/KNOWLEDGE_DIGEST.md",
        "CLAUDE.md",
        "docs/decisions/DECISIONS-LOCKED.md",
        "docs/sessions/47-FLOW-CURRENT-STATE-MASTER.md",
        "docs/state/INFRASTRUCTURE-FLOWS-STATE-v6.json",
        "docs/XIIGEN_PRODUCT_SPECS.md",
        "docs/sessions/FLOW-07/FLOW-07-RECONCILIATION-STATE.md"
      ],
      "grepResults": {
        "lockedDecisions": "8 entries found",
        "nextCounters": "T650, F1601, CF-809, SK-539"
      },
      "thresholdContribution": {
        "fileReads": 8,
        "grepCounts": 2,
        "excerpts": 4
      }
    }
  }
}
```

### 10.4 — Tier-0 is not a substitute for full reconnaissance

Tier-0 satisfies 40% of the ARCHITECT file-read threshold and 25% of the grep threshold. The remaining 60% of reads and 75% of greps are flow-specific or task-specific. Both are required. Tier-0 runs first; flow-specific reconnaissance runs after.

### 10.5 — Reference

Full question-class → file-path table and bash commands: `XIIGEN-CODEBASE-ORIENTATION-MAP.md` §2 and §3. When Tier-0 does not answer the question, consult the ORIENTATION-MAP to find which file does.

---

## Changelog

- **v1.0.0** — initial skill, §1–§9, reconnaissance threshold gate, RECON REPORT template, Examples A and B, anti-patterns 1–7, integration notes, failure-mode table
- **v2.0.0** — Example C added; anti-pattern 8 added; §8 two integration notes added; §9 three new failure-mode rows; §10 NEW — Tier-0 Search List
- **v2.2.0** — Evidence-layer tags (Gap 5, 2026-04-21): §3 verbatim excerpts require `Evidence layer:` tag with four defined values; §4 `evidenceLayer` field in excerpt schema; §5 gate 3 — "works" claims require IMPLEMENTATION or TEST evidence; §6 Example D added; §7 anti-pattern 9 added; §8 SK-531 and Gate 0d notes extended; §9 new failure-mode row. Note: v2.1.0 skipped.
- **v2.3.0** — Coverage fraction (Gap 2, 2026-04-21): §2 note added distinguishing threshold from coverage fraction; §3 domain universe declaration block added to RECON REPORT template (entity type, total universe with source, examined count, coverage fraction, unread-and-material list with per-entity reasons, unread-unknown-material count, resolution); §4 `domainUniverse` object added to STATE.recon schema with full populated example; §5 gate 4 added — ARCHITECT and MATERIALIZATION sessions require domain universe block; universal quantifier claims require coverage ≥50% or explicit scope qualifier; §6 Example E added (FAIL — universal claim at 8% coverage, no domain universe block); §7 anti-pattern 10 added; §8 SK-532 note extended, SK-552 cross-reference added, Gate 0d note extended; §9 new failure-mode row added.
- **v2.4.0** — Mandatory hypothesis declaration for multi-entity sessions (Gap 4, 2026-04-21): §3 Hypotheses section in RECON REPORT template restructured — mandatory confirm/refute observable format added; multi-entity rule (N ≥ 5: hypotheses before instance 1) and single-entity rule (N < 5: encouraged not blocking) stated explicitly; §5 gate 5 added — multi-entity sessions require hypotheses in STATE.recon before instance 1 examined; §6 Example F added (FAIL — post-hoc hypothesis after reading first 3 flows, confirmation bias embedded); §7 anti-pattern 11 added ("I'll declare the hypothesis after I see what the data shows" — FORBIDDEN for N ≥ 5); §8.1 NEW — "When hypotheses must precede examination": single-entity vs multi-entity distinction, why order matters, what a correct pre-declared hypothesis looks like, what a post-hoc hypothesis looks like (forbidden), routing gate to SK-552; §9 new failure-mode row added.

---

## END OF SK-529
