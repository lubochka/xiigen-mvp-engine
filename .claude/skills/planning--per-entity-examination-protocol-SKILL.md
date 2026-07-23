---
name: per-entity-examination-protocol
version: "1.0.0"
sk_number: SK-552
priority: HIGH
load_order: 5.9
category: planning
updated: "2026-04-21"
contexts: ["web-session", "claude-code"]
---

# SK-552 Per-Entity Examination Protocol — Systematic examination of N instances before synthesis

When an architect session must examine multiple instances of the same entity type to answer a system-level question, the order of operations matters. Hypotheses declared after seeing the first instances carry the bias of those instances. Synthesis produced before all instances are examined carries the gaps of the unread ones. This skill installs the protocol that makes multi-entity examination rigorous: declare hypotheses first, examine all instances in sequence, synthesize last.

## Origin

Extracted from the module-separation session corpus (2026-04-21). The session corpus contains approximately fifteen architect sessions working on the same brief: how to plan XIIGen supporting different repos for different modules. Every session that read 3–5 flows and synthesized conclusions received the correction "you're concluding before examining all the flows." The one protocol that produced rigorous architecture was the 49-flow examination plan produced in session 2's final STOP — six hypotheses declared before examining flow 1, a fixed five-step examination procedure per flow, a structured result record format, and a synthesis session after all 49 flows were complete. That protocol emerged from Luba's correction pressure, not from the governance stack. This skill installs it as structural discipline.

## When to Invoke

- Any ARCHITECT, PLANNING, or INVESTIGATION session that must examine N ≥ 5 instances of the same entity type to answer a system-level question
- Triggered by the domain universe block in SK-529 v2.3.0 when N ≥ 5 unread entities are material to synthesis claims
- Triggered by SK-529 v2.4.0 Gate 5 when STATE.recon.hypotheses[] is empty at the time per-instance examination begins

Entity types this protocol governs: flows, services, client pages, topology contracts, adapter packages, task type contracts, BFA rules, arbiter configurations, session documents, test specifications. Any entity type of which N ≥ 5 instances exist in the domain being examined.

**Sessions not in scope:** EXECUTOR sessions making targeted file edits; MATERIALIZATION sessions inventorying a single flow; sessions where the question is about one specific instance, not the system-level behavior across N instances.

---

## Section 1 — The Mandatory Protocol

Seven steps. All seven apply to every multi-entity examination session. No step may be skipped. No step may be reordered.

### Step 1 — Declare the entity type and universe size (N)

Before reading any instance file, state:

```
Entity type: [flows | services | client pages | topology files | other]
Total universe (N): [integer] — source: [file or command that established this count]
Universe source command:
  [the exact bash command or file read that produced N]
```

N is not estimated. N is counted. The command that produces N is recorded in STATE.recon.domainUniverse.universeSource so the count is reproducible.

If N cannot be established before examination begins: state why it cannot, name the file that would establish it, read that file first, then state N. Do not begin examining instances against an unknown universe.

### Step 2 — Declare hypotheses (minimum 1, maximum 8) before instance 1

Before opening any instance file, state every hypothesis in this format:

```
H-[N] — [short name]
Claim: [one sentence stating what H-N asserts about the entity type as a whole]
Confirms if: [the specific observable that would be found in [file type] for an
             instance where H-N holds — precise enough that the examiner can
             record YES or NO without judgment]
Refutes if: [the specific observable that would be found instead if H-N fails
            for an instance — one counter-observable is sufficient to make the
            verdict INCONSISTENT for that instance]
Scenario step: [which goal step or architectural question this hypothesis tests,
               or "cross-cutting" if it applies to all steps]
```

**Why before instance 1:** hypotheses formed after reading instances 1–N carry the bias of those reads. The session already expects what the first instances showed. Every subsequent instance is examined through that expectation. Pre-declaration removes the feedback loop. The hypothesis is committed before any evidence exists to shape it.

**Why maximum 8:** more than 8 hypotheses per examination create a per-instance result record that is too long to fill out consistently across all N instances. If more than 8 hypotheses are proposed, consolidate before beginning. Hypotheses that test the same underlying question should be merged.

**Why minimum 1:** zero hypotheses means the examination has no question to answer. An examination without a question produces a catalog of observations. A catalog of observations is not the input the synthesis session needs.

### Step 3 — Define the per-instance examination step sequence (maximum 5 steps)

Before examining instance 1, define the fixed step sequence that every instance will go through. The same steps apply to every instance in the same order. No instance gets a different procedure because it "looks different."

```
Per-instance step sequence:
  Step 0 — Inventory: [what files to list without reading — establishes what exists]
  Step 1 — [name]: [what to read, what question it answers, which hypotheses it tests]
  Step 2 — [name]: [what to read, what question it answers, which hypotheses it tests]
  Step 3 — [name]: [what to read, which hypotheses it tests]
  Step 4 — [name]: [what to read, which hypotheses it tests]
  Step 5 — Verdict: [how per-instance H verdicts are assembled from steps 1–4]
```

Step 0 is always inventory — listing what files exist for this instance without reading them. Step 0 findings determine which subsequent steps have material to examine. A step with no material records `NOT_APPLICABLE` with the reason. This is a finding, not a shortcut.

Maximum 5 steps (not counting Step 0) ensures the per-instance procedure is executable without consuming a full context window per instance. If more than 5 steps are required, the session scope is too wide for a single examination session — decompose into multiple sessions.

### Step 4 — Define the result record format

Before examining instance 1, define every field in the result record. No field may be added mid-examination. No field may be omitted in any instance's result record.

```
RESULT RECORD FORMAT:
  ENTITY_ID: [the identifier for this instance — flow number, service name, file path]
  TITLE: [human-readable name from the instance's documentation]
  SLUG: [canonical identifier used in file paths]

  STEP_0_INVENTORY:
    [list the inventory items from Step 0 with YES / NO / [count] values]

  H_VERDICTS:
    H-1 ([name]): [CONSISTENT | INCONSISTENT | PARTIAL | NOT_TESTABLE] — [one sentence of evidence]
    H-2 ([name]): [CONSISTENT | INCONSISTENT | PARTIAL | NOT_TESTABLE] — [one sentence of evidence]
    [... one row per hypothesis]

  [any step-specific fields defined in Step 3]

  OPEN_QUESTIONS:
    [each question that this instance raised, with format:]
    Q[N]: [the question] — raised by: [the specific finding that raised it]
          SK-506 resolution ladder: [CONVENTION | ADAPTATION | EXTENSION | NEW_FLOW | NEW_INFRA]
```

**Verdict vocabulary** — four values, no others:
- `CONSISTENT` — the instance's evidence supports the hypothesis. Cite the specific file:line.
- `INCONSISTENT` — the instance's evidence contradicts the hypothesis. Cite the specific finding.
- `PARTIAL` — the hypothesis holds for part of this instance but not all. Name which part holds and which does not.
- `NOT_TESTABLE` — this instance does not have enough implemented code or design documentation to test the hypothesis. This is not a shortcut. It is a specific finding about the instance's current implementation state. NOT_TESTABLE is only valid when Step 0 found no service files AND no design documents with content relevant to the hypothesis.

**OPEN_QUESTIONS** — every gap identified during examination is pre-classified on the SK-506 resolution ladder before being recorded. This prevents the synthesis session from receiving an undifferentiated list of gaps. The examiner classifies; the synthesis session decides.

### Step 5 — Examine all N instances in declared sequence

Examine instances in the declared sequence. No instance is skipped. No instance receives a reduced procedure because it "seems similar to a previous one." The sequence is not reordered based on what early instances reveal.

**The sequence must be stated before examination begins.** For flows: numerical order (FLOW-00, FLOW-01, FLOW-02...). For services: alphabetical or as listed in the module registry. The sequence is arbitrary but fixed.

**NOT_APPLICABLE and NOT_TESTABLE are valid findings.** An instance with no service files and no design documentation produces a result record where most fields say `NOT_APPLICABLE` or `NOT_TESTABLE`. This is correct. It is a finding about that instance's current state. It is not a reason to skip the instance.

### Step 6 — Running tally after every 10 instances

After every 10th instance result record is complete, produce a running tally:

```
RUNNING TALLY — after instance [N]
[Hypothesis name]:  CONSISTENT: [n]  INCONSISTENT: [n]  PARTIAL: [n]  NOT_TESTABLE: [n]
[Hypothesis name]:  CONSISTENT: [n]  INCONSISTENT: [n]  PARTIAL: [n]  NOT_TESTABLE: [n]
[...]
No conclusions drawn. Tally only.
```

The tally is counts. No analysis language. No "looking strong" or "not viable." The synthesis session receives the tally alongside the complete result records and performs all analysis. The tally is a navigation aid for the synthesis session, not an early synthesis by the examining session.

### Step 7 — Synthesis only after all N instances are complete

No synthesis claim about system-level behavior may be made until all N instances have result records with all mandatory fields populated. The examining session does not produce synthesis. The examining session produces result records, a running tally, and an open question list.

The synthesis session is a separate session. It receives:
- All N result records
- The final running tally
- The open question list with SK-506 pre-classifications
- The domain universe block from STATE.recon

The synthesis session draws architectural conclusions. The examining session does not.

---

## Section 2 — Examiner vs. Synthesis Session — strict separation

| Role | What they produce | What they do NOT produce |
|------|-------------------|--------------------------|
| **Examiner** | Per-instance result records, running tally, open question list | Architectural conclusions, design proposals, remediation plans |
| **Synthesis session** | Verdict matrix, architectural recommendations, hypothesis verdicts across all N | Per-instance re-examination, new instance reads |

This separation is not just conceptual. It prevents the failure pattern from the module-separation corpus where synthesis was produced after 4 of 49 flows and then had to be retracted. The examiner cannot produce synthesis; the synthesis session cannot re-examine instances.

When the examining session notices a pattern forming after 10 instances, the correct response is to record it in the running tally comment section as a provisional observation — not to produce a synthesis paragraph. The pattern may not hold across the remaining instances.

---

## Section 3 — Gate-out conditions

The examination is complete when all three conditions hold simultaneously:

1. Every instance in the declared universe has a result record
2. Every result record has all mandatory fields populated (`NOT_APPLICABLE` and `NOT_TESTABLE` are populated values — they are not omissions)
3. The final running tally reflects all N instances

A session that stops at N-3 because "the pattern is clear" has not completed the examination. The tally requires N complete records. Three instances may be the only three that break the pattern.

---

## Section 4 — STATE.recon integration

The per-entity examination protocol operates as an extension of SK-529 reconnaissance. STATE.recon tracks examination progress:

```json
{
  "recon": {
    "domainUniverse": {
      "entityType": "flows",
      "totalUniverse": 49,
      "universeSource": "ls docs/sessions/ | grep FLOW | wc -l",
      "examinedThisSession": 12,
      "coverageFraction": "12/49 = 24%",
      "unreadAndMaterial": [...],
      "unreadNotYetKnownMaterial": 37,
      "resolution": "continuing examination — SK-552 active"
    },
    "hypotheses": [
      {
        "id": "H-1",
        "name": "fabric interface boundary",
        "claim": "Every service file imports only from fabric interfaces, never from concrete engine classes",
        "confirmsIf": "Zero imports from kernel/, engine/core/, or bootstrap/ in any *.service.ts",
        "refutesIf": "Any import from kernel/, engine/core/, or bootstrap/ in any *.service.ts",
        "scenarioStep": "Step 2 — tenant adapts flow in own repo",
        "declaredBeforeExamination": true,
        "declaredAt": "turn 3 — before any flow was read"
      }
    ],
    "perEntityExamination": {
      "sk552Active": true,
      "stepSequenceDeclared": true,
      "resultRecordFormatDeclared": true,
      "instancesComplete": 12,
      "instancesRemaining": 37,
      "lastTallyAt": 10,
      "openQuestionsCount": 8
    }
  }
}
```

`declaredBeforeExamination: true` is the field SK-529 Gate 5 checks. If this field is false or absent on any hypothesis when per-instance records exist, the gate fails.

---

## Section 5 — Worked example — correct pre-declaration

**Session context:** ARCHITECT session examining all 49 XIIGen flows to determine which support a module separation architecture.

**Step 1 — Universe declared:**
```
Entity type: flows
Total universe (N): 49
Universe source: ls docs/sessions/ | grep "^FLOW" | wc -l → 49
```

**Step 2 — Hypotheses declared before FLOW-00:**
```
H-1 — fabric interface boundary
Claim: Every service file for this flow imports only from fabric interfaces,
       never from concrete engine classes (kernel/, engine/core/, bootstrap/).
Confirms if: Zero imports matching /kernel\/|engine\/core\/|bootstrap\// in
             any *.service.ts in server/src/engine/flows/{slug}/
Refutes if:  Any single import matching that pattern in any service file.
Scenario step: Step 2 — extraction to external repo is feasible only if
               services have no engine-core coupling.

H-2 — MicroserviceBase portability
Claim: The MicroserviceBase that every service extends can be provided as a
       standalone package without the full NestJS module graph.
Confirms if: Service extends MicroserviceBase and uses no engine components
             beyond the 19-component base contract.
Refutes if:  Service imports or uses any engine class beyond MicroserviceBase
             and the 19 components it provides.
Scenario step: Step 2 — cross-cutting; affects all flows.

H-3 — thin-surface adaptation
Claim: The portion of this flow a super-tenant would adapt (visual decisions,
       business rule changes) is identifiable and separable from the invariant core.
Confirms if: STEP-1-INVARIANTS has ≥1 FREEDOM row classifiable as Profile 2
             (super-tenant structural choice, not runtime tenant configuration).
Refutes if:  All FREEDOM rows are Profile 1 (runtime config) or all rows are
             MACHINE with no Profile 2 candidates.
Scenario step: Step 2 (adaptation) and Step 4 (distribution).
```

**Step 3 — Per-instance step sequence declared:**
```
Step 0 — Inventory: list all files in docs/sessions/FLOW-{N}/ and
         server/src/engine/flows/{slug}/; count *.service.ts, *.tsx, *.spec.ts;
         check topology file and marketplace package record.
Step 1 — Identity: read STEP-1-INVARIANTS (or fallback: IMPL-STATE.json);
         extract user_intent, FREEDOM/MACHINE table, scenario step relevance.
Step 2 — Server coupling: read every *.service.ts; classify all imports
         A/B/C/D; record Category B details; produce H-1 and H-2 verdicts.
Step 3 — Client coupling: read every *.tsx in client/src/pages/{slug}/;
         classify imports; record Category B details; produce portability verdict.
Step 4 — FREEDOM surface: read FREEDOM/MACHINE table; classify each FREEDOM
         row as Profile 1/2/3; produce H-3 and H-6 verdicts.
Step 5 — Verdict: assemble H-1 through H-[N] verdicts and OPEN_QUESTIONS.
```

**Step 4 — Result record format declared** (see Section 1 Step 4 template — filled in for this session).

**Step 5 — FLOW-00 examination begins.** (Not shown here — the format is declared; execution follows.)

---

## Section 6 — Worked example — incorrect post-hoc declaration (FAIL)

**What happened:**
Session opens FLOW-01 service files. Notices that all imports are from `fabrics/interfaces/`. Opens FLOW-32 service files. Same pattern. Opens FLOW-47. Same. At turn 4, records:

```
H-1 — It seems like services import only from fabric interfaces. Let's call
       this H-1 and check the other flows.
```

**Why this fails (SK-529 v2.4.0 Gate 5):**
STATE.recon.hypotheses[].declaredBeforeExamination is `false`. The first three instance result records were produced before H-1 existed. H-1 was formed from the evidence of instances 1–3 and then used to examine instances 4–N. Instances 4–N were examined expecting to find fabric-clean imports because the first three instances showed fabric-clean imports. The verdict "all flows are fabric-clean" cannot be trusted as unbiased evidence — it is a self-fulfilling examination.

**What to do:** Stop. Declare all hypotheses before examining any instance. Read no flow files until hypotheses exist with `Confirms if` and `Refutes if` specified. Then restart the examination from FLOW-00.

---

## Section 7 — Integration notes

- **SK-529 v2.3.0 (domain universe block):** provides the trigger. When `domainUniverse.unreadAndMaterial` contains N ≥ 5 entries, SK-552 activates. The domain universe block is the routing signal. SK-552 governs what happens after routing.

- **SK-529 v2.4.0 (Gate 5):** enforces the pre-declaration requirement. STATE.recon.hypotheses[].declaredBeforeExamination must be `true` for every hypothesis when per-instance result records exist. SK-552 §1 Step 2 is what produces the `declaredBeforeExamination: true` entries.

- **SK-529 v2.4.0 (§8.1):** explains the single-entity vs. multi-entity distinction and why order matters. SK-552 is the protocol §8.1 routes to for multi-entity sessions.

- **SK-547 Output Skepticism:** runs at ⛔ STOP for the synthesis session, not the examining session. The examining session does not produce results claims — it produces result records. SK-547's three questions apply when the synthesis session produces architectural conclusions from the result records.

- **SK-546 Coverage Completeness Gate:** the examining session's coverage fraction (recorded in STATE.recon.domainUniverse) is the input SK-546 uses to validate synthesis claims. An examining session that completes all N instances produces 100% coverage — SK-546's coverage gate passes.

- **SK-506 Self — gap-to-proposal:** governs OPEN_QUESTIONS pre-classification. Every gap identified during examination is classified on the SK-506 resolution ladder (CONVENTION / ADAPTATION / EXTENSION / NEW_FLOW / NEW_INFRA) before being recorded. The synthesis session receives pre-classified gaps, not raw gaps.

- **ARCHITECT-GUIDE v2.2.0 §4.6 (TRAJECTORY class):** a correction saying "you're concluding before examining all instances" is a TRAJECTORY correction, not LOCAL. SK-552 is the structural response to that correction class when the domain involves N ≥ 5 instances.

- **Load order 5.9:** activates after SK-539 (UI/UX compliance, 5.5) and SK-542 (flow examination protocol, 5.3/5.4). SK-552 is independent of the UI/UX examination chain — it governs any multi-entity examination, not only UI/UX flows. Load order 5.9 places it as the last pre-draft planning skill before SK-538 architect habits (load_order 6).

---

## Section 8 — Anti-patterns

1. **"The pattern is obvious after 5 instances — synthesis now"** — the whole point of the protocol is that patterns visible after 5 instances are not system-level patterns. They are 5-instance patterns. FLOW-41 through FLOW-45 showed apparently external-repo architecture. FLOW-01 through FLOW-37 showed monolith architecture. Drawing conclusions from FLOW-41–45 without reading FLOW-01–37 produces wrong architecture. The 5-instance pattern was a cluster, not the system.

2. **"NOT_TESTABLE is a shortcut"** — NOT_TESTABLE is a finding. It means: this instance has no service files and no design documentation with content relevant to the hypothesis. That is architectural information. An ARCHITECT session that encounters N instances labeled NOT_TESTABLE learns that N flows are at the same early implementation state — which is itself a system-level finding for the synthesis session.

3. **"The synthesis session can re-examine instances"** — no. The synthesis session receives result records. If a result record is incomplete, the examining session is not done. The synthesis session does not supplement incomplete records with new reads. The examining session returns to the incomplete instance and finishes it.

4. **"I'll define the result record format as I go"** — result record formats defined mid-examination produce inconsistent records. Instance 7's record has different fields than instance 3's record. The synthesis session cannot aggregate them. Format is defined before instance 1 and does not change.

5. **"The step sequence can vary per instance"** — the step sequence is fixed. An instance that "looks different" goes through the same steps. Step 0 inventory will show what exists. Steps that find nothing record NOT_APPLICABLE with the reason. Varying the procedure per instance introduces the same bias as post-hoc hypotheses: the examiner starts applying judgment about which steps matter for which instance, and that judgment is shaped by what the first instances showed.

---

## Changelog

- **v1.0.0** — initial skill (2026-04-21). Origin: module-separation session corpus; the 49-flow examination protocol produced in session 2 as the correct response to TRAJECTORY corrections about premature synthesis. §1 seven-step protocol (universe declaration, hypothesis pre-declaration, step sequence definition, result record format, all-N examination, running tally, synthesis-only-after-complete); §2 examiner vs. synthesis session separation table; §3 gate-out conditions (three simultaneous requirements); §4 STATE.recon integration with `declaredBeforeExamination` field; §5 worked example PASS (H-1 correctly pre-declared before FLOW-00); §6 worked example FAIL (H-1 formed from instances 1–3, Gate 5 catches it); §7 integration notes (SK-529 v2.3.0/v2.4.0, SK-547, SK-546, SK-506, ARCHITECT-GUIDE §4.6, load order); §8 anti-patterns 1–5.

---

## END OF SK-552
