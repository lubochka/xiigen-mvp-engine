---
name: blast-radius-assessor
sk_number: SK-427
version: "1.0.0"
priority: MANDATORY
load_order: 25
---

# Blast Radius Assessor Skill

Before touching any file, assess **how far the change propagates**. A change that
looks isolated — "just rename this param" — may break every consumer of a public
contract. The Assessor makes the reach visible *before* any edit, assigns a level,
finds every dependent, and pins the protection gates.

This is the partner of `blast-radius-tagger` (SK-425): the **tagger** categorizes
*files before writing* (TEST-ONLY / GOVERNANCE / PRODUCTION-CI / INTERFACE /
SOURCE); when the tagger assigns **INTERFACE**, it hands the change to this
**Assessor**, which measures propagation. Tagger → INTERFACE → Assessor.

## When to Invoke

- Whenever a file/edit is tagged **INTERFACE** by `blast-radius-tagger`.
- Before changing any public TS `interface`, NestJS DI token, exported DTO, or
  exported `zod` contract used outside its own module.
- Before changing a shared base class, a widely-injected provider's constructor,
  or any cross-module type.
- Any time you are about to claim a change is "isolated" — run the grep first.

---

## Classification Levels

```
CRITICAL — change reaches all consumers across the whole repo
  Triggers: public interface signature change, DI token contract change,
            exported DTO / zod schema change, shared Result-union shape change,
            DNA rule change, CLAUDE.md / AGENTS.md fundamental change
  Impact:   every module/provider that depends on the contract
  Protocol: full baseline before & after; read EVERY consumer; human review before commit

HIGH — change reaches all consumers in ONE module/feature
  Triggers: provider constructor signature change, new required DI dependency,
            shared base class change, cross-feature type change
  Impact:   all callers in the affected NestJS module/feature folder
  Protocol: grep all callers; run that module's tests before & after

MEDIUM — change reaches one class or one method
  Triggers: method signature change within a class, new private helper,
            implementation change (NOT a public contract change)
  Impact:   the changed class and its direct tests
  Protocol: run tests for the changed class; check its direct callers

LOW — change reaches only future code, not existing consumers
  Triggers: new file, new method added to a class, new test, doc/skill update
  Impact:   no existing code affected
  Protocol: standard gate (build + tests)
```

---

## Assessment Procedure

### Step 1 — Identify change type & location (TS-adapted default reach)

| Location / kind | Default blast radius |
|-----------------|----------------------|
| `.claude/skills/`, `.agents/skills/` (skill files) | LOW |
| `*.spec.ts`, `*.test.tsx` only | LOW |
| A concrete `server/src/**` impl file (no exported contract) | MEDIUM |
| A public `interface` / DI token / exported DTO / `zod` schema | **CRITICAL** |
| A widely-injected provider's constructor | HIGH |
| A shared base class | HIGH |
| `CLAUDE.md` / `AGENTS.md` (governs all sessions) | HIGH |
| `package.json` / build config / tsconfig | HIGH |

### Step 2 — Find ALL dependents (never assume "isolated")

```bash
# Every reference to the changed identifier across server + client
grep -rn "IRankingService\|RANKING_SERVICE" server/src client/src --include="*.ts" --include="*.tsx" | sort

# All implementations of a changed interface
grep -rn "implements IRankingService" server/src --include="*.ts"

# All injection sites of a DI token
grep -rn "@Inject(RANKING_SERVICE)\|RANKING_SERVICE" server/src --include="*.ts"

# All subclasses of a changed base class
grep -rn "extends RankingServiceBase" server/src --include="*.ts"
```

Compiler-truth confirmation (catches consumers grep misses):

```bash
npx tsc --noEmit   # after the change: every broken consumer surfaces as a type error
```

Never claim "this is isolated" without running the grep AND `tsc --noEmit`.

### Step 3 — Protection gates by level

```
CRITICAL:
  □ Record full Jest (+ Playwright e2e where the contract is user-facing) baseline before
  □ Read EVERY consumer file in full
  □ Update every implementation + every caller
  □ Re-run full suite after — pass count must be ≥ before (+ new tests)
  □ Human review before commit

HIGH:
  □ Record the affected module's test count before
  □ Read all callers in that module
  □ Run that module's tests after

MEDIUM:
  □ Run the changed class's tests before & after
  □ Check direct callers of the changed method

LOW:
  □ build: 0 errors (npx tsc --noEmit)
  □ test: 0 failed
```

### Step 4 — Write the Impact Summary (before touching any file)

```
Change: add `searchRange(query: number[], radius: number)` to IRankingService

Blast radius: CRITICAL
  Reason: public interface change — every implementation and caller is affected.

Dependents found:
  Implementations: InMemoryRankingService (server/src/ranking/in-memory-ranking.service.ts:14)
                   ElasticRankingService  (server/src/ranking/elastic-ranking.service.ts:11)
  Callers:         FeedController          (server/src/feed/feed.controller.ts:38)

Protection gates:
  □ Jest baseline before: <run, record N>
  □ Read all 3 dependents in full
  □ Add searchRange to both implementations
  □ Jest after: ≥ N (+ new searchRange tests)

Estimated impact: 2 implementations + 1 caller + their test files
```

---

## Special Cases

### Public interface / DI-token change (CRITICAL)

```
Adding a method to an existing interface:
  → every implementation must add it; every caller may need updating.
  → NEVER add a method to an interface with 3+ implementations without listing
    all implementations first.

Removing a method:
  → even higher reach — every caller fails to compile. Requires Luba approval.
```

### Constructor signature change (HIGH)

```
Adding a required constructor param to an @Injectable() provider:
  → every DI registration/module providers[] entry must be updated
  → every `new Service(...)` in tests must be updated
  → grep all instantiation + injection sites before changing.
```

### DNA rule change (CRITICAL)

```
Changing which DNA rules apply or how they are enforced:
  → affects every code review/commit in all future sessions.
  → update CLAUDE.md / AGENTS.md and dna-compliance-guard simultaneously.
  → requires explicit Luba approval.
```

---

## Anti-Patterns

1. **"It's just a small change."** Run the grep + `tsc --noEmit` before assuming small.
2. **Changing an interface without listing all implementations first.** List before touching.
3. **Claiming LOW on an interface/DI-token/DTO change.** Public contract changes are CRITICAL.
4. **No baseline before the change.** You cannot measure the delta without it.
5. **Treating an INTERFACE-tagged file as ordinary SOURCE.** That skips this Assessor.

---

## Integration

- `blast-radius-tagger` (SK-425) — categorizes files before writing; its INTERFACE
  tag triggers this Assessor.
- `planning--change-propagation-SKILL.md` (SK-440) — once reach is known, propagate
  the change to every derived view (BOTH skill catalogs, indexes, interfaces doc).
- `planning--service-boundary-design-SKILL.md` — the 3-consumer "promote to a
  class behind an interface" line is exactly where a change becomes CRITICAL here.
