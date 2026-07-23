---
name: investigation-handoff
sk_number: SK-433
version: "1.0.0"
priority: HIGH
load_order: 99
category: session-output
author: luba
updated: "2026-03-24"
contexts: ["web-session", "claude-code"]
description: >
  Investigation sessions discover facts that future sessions need. This skill
  defines the handoff format: discoveries[] (verified facts), rejected_claims[]
  (wrong claims caught), open questions, and numbers established. Without this,
  the next session re-derives what was already established.
triggers:
  - "investigation complete"
  - "analysis done"
  - "merge plan ready"
  - "end of analysis session"
  - "discoveries"
  - "rejected claims"
  - "what did we find"
---

# Investigation Handoff Skill v1.0

## WHEN TO INVOKE

At the end of any session that analyzed external artifacts, compared branches,
debugged a complex state, or discovered facts not already in STATE.json.

Always write to `/mnt/user-data/outputs/` AND reference in STATE.json under `investigations[]`.

---

## REQUIRED OUTPUT FORMAT

```markdown
# INVESTIGATION-HANDOFF-{SESSION-NAME}.md
## Session: {date} | Produced by: {Claude Code | Web session} | For: {next session}

## CONTEXT
{2-3 sentences: what problem was investigated, what approach was taken,
what was the starting state}

---

## DISCOVERIES

DISCOVERY-1:
  fact:        [precise factual statement — no hedging, no "probably"]
  verified_by: [exact command that confirmed it]
  implication: [what this means for any session that touches this area]
  action:      RESOLVED: {what was done}
             | DEFERRED: {why and what triggers resolution}

DISCOVERY-2:
  ...

---

## REJECTED CLAIMS

REJECTED-1:
  claim:       [exact wrong statement that was made]
  source:      [who/what made it: review document / model / prior session]
  truth:       [what is actually true]
  verified_by: [command that disproved it]
  risk:        [what would have gone wrong if accepted]

REJECTED-2:
  ...

---

## OPEN QUESTIONS REQUIRING HUMAN DECISION

OPEN-1:
  question:  [precise question requiring Luba's decision]
  context:   [why this can't be decided automatically]
  options:   [2-3 concrete options with tradeoffs]
  blocked:   [what cannot proceed until this is answered]

---

## NUMBERS ESTABLISHED THIS SESSION

| Artifact | Verified Value | Verified By |
|----------|---------------|-------------|
| Next T   | T580          | grep -r taskTypeId .../engine-contracts/ \| sort \| tail -1 |
| Next F   | F1508         | grep -r factoryId .../engine-contracts/ \| sort \| tail -1  |
| Next Family | 206        | grep -r familyId .../engine-contracts/ \| sort \| tail -1   |

---

## WHAT COMES NEXT

1. {task} — MAINTENANCE SESSION | PLANNING SESSION | CLAUDE CODE SESSION
2. ...
```

---

## discoveries[] IN STATE.json

Also write discoveries to STATE.json continuously during investigation — not just at the end.
A session that compacts before writing the handoff loses everything.

```json
{
  "current_phase": "analysis",
  "discoveries": [
    {
      "found_at": "step-4",
      "fact": "T567-T573 consumed by FLOW-36",
      "verified_by": "grep -r taskTypeId feature-registry-contracts.ts | tail -7",
      "implication": "FLOW-0A must start at T574 or later",
      "action_taken": "RESOLVED — renumbering map updated to T577-T579"
    }
  ],
  "rejected_claims": [
    {
      "claim": "Skills_Creation_Claude test count is 4,429",
      "source": "branch analysis document",
      "truth": "4,393 — 36 tests rolled back with FLOW-01 service files",
      "verified_by": "sessions/FLOW-01/STATE.json test_baseline field"
    }
  ],
  "investigations": [
    "INVESTIGATION-HANDOFF-branch-merge-2026-03-24.md"
  ]
}
```

---

## REAL EXAMPLE — Branch Merge Session 2026-03-24

```
DISCOVERY-1:
  fact:        T567-T573 consumed by FLOW-36 (FeatureExtractor through FeaturePortabilityAnalyzer)
  verified_by: grep taskTypeId server/src/engine-contracts/feature-registry-contracts.ts
               | grep -oP "'T\d+'" | sort -t'T' -k2 -n | tail -7
  implication: Any new flow starting after FLOW-36 must begin T assignments at T574+
  action:      RESOLVED — heyrovsky renumbering map updated to T577-T579

DISCOVERY-2:
  fact:        bfa-conflict-arbitration/ has 14 services (superset of heyrovsky's 12)
  verified_by: ls server/src/engine/flows/bfa-conflict-arbitration/ | wc -l
  implication: heyrovsky FLOW-25 files are NOT missing — Skills_Creation_Claude has them
  action:      RESOLVED — FLOW-25 files removed from merge plan

REJECTED-1:
  claim:       "Skills_Creation_Claude test count is 4,429"
  source:      branch analysis document
  truth:       4,393 — 36 tests were rolled back when FLOW-01 service files were removed
  verified_by: cat sessions/FLOW-01/STATE.json | jq .test_baseline
  risk:        Gate check would have passed at wrong baseline, missing 36 regressions

REJECTED-2:
  claim:       "Renumber F1339 → F1492"
  source:      verification document renumbering map
  truth:       F1492-F1501 already consumed by FLOW-36 + FLOW-00
  verified_by: grep -r factoryId feature-registry-contracts.ts | sort | tail -5
               + grep -r factoryId bundle-activation-contracts.ts | sort | tail -5
  risk:        Silent factory ID collision, runtime confusion on service resolution
```

---

## ANTI-PATTERNS

```
❌ Writing the handoff only at the end of a long session
   → Context compaction destroys discoveries made in hours 1-3
   → Write to STATE.json discoveries[] after every major find

❌ "See above" as verified_by
   → Not a command. Not reproducible. Not useful to Claude Code.

❌ Discoveries without implications
   → "T567-T573 consumed" with no implication = incomplete
   → The implication is what future sessions need

❌ Omitting rejected claims
   → Wrong claims resurface in future sessions if not recorded
   → "I already checked this — FLOW-25 services DO exist" needs to be findable
```

---

## INTEGRATION

```
Invoke at:   end of investigation, analysis, or merge session
Output to:   /mnt/user-data/outputs/INVESTIGATION-HANDOFF-{name}.md
             STATE.json discoveries[] field (continuously during session)
Read by:     next session's first step — before any analysis begins
References:  planning--claim-verification-SKILL.md
             planning--problem-decomposition-SKILL.md
```
