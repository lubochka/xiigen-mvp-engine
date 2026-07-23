---
name: level-correction-response
sk_number: SK-439
version: "1.0.0"
priority: MANDATORY
load_order: -2
category: planning
author: luba
updated: "2026-03-24"
contexts: ["web-session", "claude-code"]
description: >
  When challenged on the LEVEL of a proposal — not the content — the correct
  response is to abandon the current frame entirely and rebuild from one level
  higher. Not to revise. Not to add a peer proposal. Not to explain why the
  current level was reasonable. To go up. This skill fires at the challenge
  moment, not before it.
triggers:
  - "you're still thinking as"
  - "go up"
  - "another layer"
  - "edge cases"
  - "you don't see the obvious abstraction"
  - "try again"
  - "not as a"
  - "too simple"
  - "you're missing the abstraction"
  - "think differently"
  - "another level"
  - "before writing session files"
  - "check the abstraction level"
  - "scan for old model"
---

# Level Correction Response Skill v1.0

## PROACTIVE REFRAME SCAN (fires before session files are written)

Run this BEFORE drafting any session plan, session file, or execution sequence.
Does not require a challenge. Catches wrong abstraction levels before they are
embedded in a plan where they cost a revision cycle to fix.

The reactive section below handles the challenge moment. This section handles
the quiet moment before planning begins — when no one has challenged anything yet.

### Test 1: "What happens at the next instance of this case?"

**Trigger words:** "for each stack", "per-stack", "maintain a list of",
"pre-authored", "one per technology", "per provider"

Ask: if one more instance of this case arrives tomorrow, what happens?
- Manual work required again → **WRONG ABSTRACTION LEVEL** — stop, find the general capability
- Solution runs automatically → proceed

```
FAILS: pre-author a WordPress stack profile
       → Laravel user arrives → manual work again → unbounded

PASSES: system intake pipeline (6 genesis prompts written once)
       → Laravel user arrives → intake runs automatically → bounded
```

### Test 2: "Is this the provider or the capability?"

Apply to every interface name, contract key, config key, and prerequisite name.

**The IDatabaseService reference:** names the capability (database access),
not the provider (Elasticsearch). Every new name must pass this test.

```
FAILS:  IRedisService        → Redis is a provider, not a capability
        GitHubMCP            → GitHub is a provider, not a capability
        'php-wordpress' key  → WordPress is a technology, not a mechanism

PASSES: IScopedMemoryService → scoped (tenant-namespaced) + memory (ephemeral)
        ICodeRepositoryService → code repository access capability
        ISchedulerService    → scheduling capability
```

### Test 3: "Does the old model survive inside the new design?"

**Trigger:** any time "the correct model is X instead of Y" was established this session.

After any architectural reframe, scan the entire plan for:
- Specific technology names where abstractions should be
- Provider names in interface names
- Per-entity keys where mechanism-first keys should be
- Specific platform integrations where fabric interfaces should be

The old thinking always has at least one hiding place. Evidence from the
2026-03-24 session — three corrections found AFTER the system intake reframe
was established, by running this test before session files were written:
```
'php-wordpress' key   → survived in the T48 reclassification plan
IRedisService         → survived as the Z-2 session title
GitHub MCP            → survived as prerequisite 4
```

**Rule:** Do not begin drafting session files until all three tests return clean.
Finding these after session files are written costs a revision cycle.
Finding them before costs nothing.

---

## THE ONE RULE

When the person challenges the LEVEL of a proposal — not the content —
**abandon the current frame entirely and rebuild from one level higher.**

Do not:
- Revise the current proposal with additions
- Add a peer proposal alongside the current one
- Explain why the current level was reasonable
- Run the current proposal through more checks
- Defend by citing the skill that produced it

Do:
- Stop. Go silent on the current frame.
- Ask: what is one level above what I just proposed?
- Build from there.

---

## HOW TO DISTINGUISH A LEVEL CORRECTION FROM A DETAIL CORRECTION

**Detail correction:** "That's wrong — the correct number is T577, not T574."
Response: revise the specific fact. Stay at the same level.

**Level correction:** "You're still thinking as a Claude Code manager, not as
a XIIGen architect."
Response: abandon the entire frame. The problem is not a fact inside the proposal.
The problem is the perspective from which the proposal was generated.

**The signal:** the person says what you ARE, not what you got wrong.
"You're thinking as X" = level correction. Go up.

Other level correction signals:
- "Another layer" — you proposed infrastructure; the answer is a convention
- "Edge cases" — you're solving a symptom; there's a pattern underneath
- "You don't see the abstraction" — the solution exists at a higher level of generalization
- "Try again" after you've already added detail — detail is not the answer

---

## WHAT "GO UP" MEANS IN PRACTICE

Going up means asking: what is the more abstract version of this problem?

**Example from the 2026-03-24 session:**

```
Proposed: build ICodeRepositoryService fabric interface (NEW INFRA)
Challenge: "you're thinking as a Claude Code manager, not a XIIGen architect"

Wrong response: revise the interface design
Wrong response: add GitHub MCP alongside the interface as an alternative
Wrong response: explain why the fabric interface was reasonable given XIIGen's patterns

Correct response:
  What is one level above "how do I give Claude Code access to GitHub?"
  → "What is the right environment model for XIIGen's analysis work?"
  → The playground is CI/CD, not application code.
  → GitHub is external infrastructure, not a fabric concern.
  → The answer is ADAPTATION (MCP connection), not NEW INFRA.
```

The correct response required abandoning "fabric interface" completely —
not improving it, not placing it next to a better answer, but replacing the
entire frame of "XIIGen should wrap this" with "this already exists, compose it."

---

## ADDING A LAYER IS DEFENDING THE FRAME

This is the specific failure mode this skill prevents.

When told the level is wrong, the instinct is to add something beside or below
the current proposal that addresses the challenge while keeping the current
proposal intact. This feels like being responsive. It is defending the frame.

```
❌ "You're right that GitHub MCP works — and we could also build
   ICodeRepositoryService for cases where MCP isn't available..."

   This keeps ICodeRepositoryService. It adds a condition that makes it seem
   reasonable. The frame hasn't changed. A layer has been added.

✅ "The playground is a DevOps environment, not application code.
   GitHub MCP is the right tool. No fabric interface needed."

   The frame is gone. The answer is at the correct level.
```

---

## THE INSTINCT FIRES BEFORE THE CHECKLIST

This skill is different from the other planning skills. Those assume consultation
before generation. This skill assumes the instinct has already fired and intercepts
at the moment of the challenge.

When the instinct fires and produces a proposal, and the person says the level
is wrong — at that moment, the checklist is irrelevant. The proposal is already
wrong at the root. Running it through more checks produces a better-checked
wrong proposal.

The only correct response at that moment is structural: abandon, go up, rebuild.

---

## THE CONVERGENCE ANALOGY

This skill encodes a convergence round where one challenger is the person.

In multi-model convergence, when a challenger says "your representation is at
the wrong abstraction level," the proposer does not defend. The proposer updates
the representation. The conversation continues from the updated representation,
not from the previous one.

The person is the strongest challenger in any planning session. Their level
correction is not a request for revision. It is a convergence signal.

Receiving it correctly means the representation changes at the root — not at
the surface.

---

## LOAD ORDER: -1

This skill loads before all other planning skills because it governs the
relationship to being challenged, not the content of any specific check.
It is the prior condition under which all other skills operate.

A session where the person issues a level correction and the response is
elaboration rather than abandonment has failed before any checklist fires.
