---
name: skill-injection
sk_number: SK-471
version: "1.0.0"
priority: HIGH
load_order: 2
category: code-execution
author: luba
updated: "2026-06-29"
contexts: ["claude-code"]
description: >
  The skill-injection contract for bounded sub-agent work orders in xiigen mvp.
  A work order must NAME the skills/guides the sub-agent loads (not only the
  files it may touch), the returned packet must CONFIRM them, and trainable /
  phase-done claims must carry SK-VERIFY. Universal capability ported from
  llm_mvp_core skill-injection-SKILL; TS-mapped onto the existing mvp registry
  (skill-advisor skill-blocks SK-PLAN/SK-DNA/SK-TEST + the .agents/.claude skill
  trees). Unifies the competing indices into one selection algorithm. SK-DPO is
  conditional and does NOT activate for mvp (common models train in
  llm_mvp_core per R5/R6).
triggers:
  - "write a work order"
  - "which skills does the sub-agent load"
  - "skill injection"
  - "SK-VERIFY"
  - "is this phase-done claim backed"
  - "bounded sub-agent boundary"
---

# Skill Injection Skill (SK-471)

## Why This Skill Exists

A bounded sub-agent only knows the skills its work order names. If the work order
lists files but not skills, the sub-agent improvises the discipline — and a
trainable/phase-done claim ships without verification. This skill makes skill
selection a **named, capped, confirmable contract**, and folds the mvp's
competing registries (`agent-constitution/rules/skill-registry.md`, the
`skill-advisor` skill-blocks, and `how-to-prepare-a-plan`) into one selection
algorithm.

This is the mvp-local extension of the `skill-advisor` blocks: skill-advisor
defines the injectable *content* (SK-PLAN/SK-DNA/SK-TEST prompt blocks);
SK-471 defines *which* blocks a given work order must carry and how the packet
proves they were loaded.

---

## The Injection Blocks (core cap = 3) + Mandatory-Additional

Pick **at most 3** core blocks for the work order's primary axis, then add the
mandatory-additional blocks that apply. The cap keeps the injected prompt under
budget; the mandatory-additional blocks are not counted against the cap.

### Core blocks (cap 3) — choose by the work order's primary axis

| Block | When to inject | mvp mapping (TS) |
|-------|----------------|------------------|
| **SK-PLAN** | planning / decomposition work order | `how-to-prepare-a-plan`, `planning-skill`, `naming-conventions-enforcer` |
| **SK-DNA** | any code that creates/edits a `.ts` service/station | `dna-compliance-guard` (9 DNA), skill-advisor SK-DNA block |
| **SK-FAB** | fabric / provider / DI-port work | `xiigen-engine` fabric section; DI interfaces (`IApprovalService`, `IAnthropicClient`, …) |
| **SK-REVIEW** | generated-code / DPO-candidate review | `generated-code-review` (Layer 1-5) |
| **SK-TEST** | any work order that must add/keep tests | `three-level-verification`, `test-integrity`, skill-advisor SK-TEST block (Jest L1/L2/L3 + Playwright) |
| **SK-DOCS** | behavior/contract/manifest change | `documentation-sync` |

### Mandatory-additional (always on for the matching claim — NOT capped)

| Block | Always required when… | mvp mapping (TS) |
|-------|-----------------------|------------------|
| **SK-VERIFY** | the work order makes a **trainable / model / algorithmic / phase-done** claim | `verification-before-completion` + `generated-code-review` Layer-5 (numeric metrics, not UNKNOWN) |
| **SK-QA** | the change is user-facing (UI/API surface) | Playwright e2e + UX-label check (human labels, error clarity, no jargon on the primary path) |
| **SK-ARCH** | the change touches a fabric contract, DNA rule, or flow topology | `xiigen-core-principles` + `code-examination` (understand-before-touching) |
| **SK-INTENT** | the work order responds to a Luba challenge / governance repair | `conversation-intent-and-self-reflection` |

### SK-DPO — CONDITIONAL, and OFF for mvp

SK-DPO (DPO triple authoring / reward-margin / checkpoint) activates **only** for
a trainable/DPO work order. Per R5/R6 and the G12 boundary, common models and
trainable logic live in `llm_mvp_core`, not in mvp. **For xiigen mvp work orders,
SK-DPO is not injected.** If a phase claims a trained capability inside mvp, that
is a boundary violation — the trainable unit belongs in core and is consumed via
manifest/locator, not built here.

---

## The Contract: Work Order Lists → Packet Confirms

### Work order MUST state (skill axis)

```
loaded_skills:            [SK-DNA, SK-TEST, SK-VERIFY]      # named, cap-3 core + additional
required_guides:          [dna-guard-patterns.md, test-integrity-rules/*]
injection_blocks:         [SK-DNA, SK-TEST]                  # actual prompt blocks injected
trainable_or_done_claim:  true|false                        # if true, SK-VERIFY is mandatory
```

### Returned packet MUST confirm (or the phase stays open)

```
skills_loaded_confirmed:      [SK-DNA, SK-TEST, SK-VERIFY]   # echoes what was actually loaded
guides_loaded_confirmed:      [...]
injection_blocks_applied:     [...]
layer5_evidence:              numeric metrics OR "n/a — honest-untrained scaffold"
evidence_is_real_code_path:   true   # NOT only JSON / report / static validator presence
numeric_metrics_present:      true   # UNKNOWN/static/validation-only => rejected for a done claim
```

Architect review rejects the packet if: skills are unlisted; a trainable/done
claim lacks SK-VERIFY; Layer-5 numeric metrics are UNKNOWN/static/validation-only;
or evidence is only JSON/PowerShell/report/contract-check presence without the
real code path. A missing row means the phase remains open — produce the missing
implementation-reality evidence; do not mark complete.

---

## Bounded Sub-Agent Git / Commit Boundary (required fields)

Every artifact/code work order carries these boundary fields. Defaults are the
safe values; only a commit-only work order with an explicit quote flips them.

```
allowed_git_commands = NONE
commit_push_authorized = false
parent_will_perform_commit_push_after_review = true
git_authority = forbidden            # forbidden | parent_only | allowed_with_exact_quote
must_stop_after_report = true
may_derive_next_phase = false
max_active_time_minutes <= 10
protocol_evidence_report_required = true
```

The receiving sub-agent is already the executor: it edits its scoped files
directly and returns a packet. It must not nest-delegate (no invoking another
AI/CLI to satisfy "through sub-agents"). If a sub-agent commits/pushes/stages
without exact authority, its artifact is quarantine-pending-parent-validation
even if useful, and the git violation is recorded before reuse.

---

## One Selection Algorithm (folds the competing registries)

```
1. Identify the work order PRIMARY AXIS (plan | code | fabric | review | test | docs).
2. Inject the matching CORE block (cap 3). Resolve names via this table — do NOT
   re-derive from a second registry. (skill-advisor blocks = the content source.)
3. Add every MANDATORY-ADDITIONAL block whose condition is true.
4. If trainable_or_done_claim => SK-VERIFY is mandatory (non-negotiable).
5. mvp => never inject SK-DPO (R5/R6 — training lives in core).
6. Write loaded_skills/required_guides/injection_blocks into the work order.
7. On return, verify the packet's *_confirmed rows. Missing => phase open.
```

When two indices disagree on a skill name, this skill's table wins for the
injection decision; reconcile the duplicate index separately (e.g.
`agent-output-format` vs `agent-output-format-skill`,
`code-examination` vs `code-examination-skill`) — duplicates are a reconcile
task, not two competing authorities.

---

## What This Skill Prevents

- Work orders that list files but not skills, so the sub-agent improvises.
- A trainable/phase-done claim shipped without SK-VERIFY / numeric metrics.
- mvp accidentally building/training a common model that belongs in core.
- Sub-agents committing/pushing their own artifacts without a commit-only order.
- Two competing registries producing two different skill selections for the same
  work order.

---

## Integration

```
skill-injection
  → skill-advisor (skill-blocks)  : the injectable CONTENT (SK-PLAN/SK-DNA/SK-TEST)
  → dna-compliance-guard          : SK-DNA target
  → generated-code-review         : SK-REVIEW + Layer-5 evidence for SK-VERIFY
  → three-level-verification / test-integrity : SK-TEST target
  → documentation-sync            : SK-DOCS target
  → verification-before-completion: SK-VERIFY backbone
```
