---
name: debug-session-skill
version: "1.0.0"
sk_number: SK-430
priority: ADVISORY
load_order: 30
---

# Debug Session Skill

Maintains a persistent debug session file that survives `/clear`. Every hypothesis, eliminated path, and confirmed API shape is appended — so new sessions know exactly where debugging stopped and what NOT to re-investigate.

## The Problem

When a write-time fix fails at execution (e.g., `getQueueDepth` is async but plan assumed sync), Codex has no protocol. It guesses, stalls, or writes a comment. In the next session, the same investigation restarts from scratch. The debug file prevents this.

## Debug Session File

**Location:** `.Codex/debug/active-session.md`
**Lifecycle:** Created when a fix fails. Appended to throughout the investigation. Archived (renamed to `YYYY-MM-DD-description.md`) when the fix is confirmed working.

## File Format

```markdown
# Debug Session: [issue title]
**Date:** YYYY-MM-DD
**Session:** S[N]
**Step:** Step [N] of SESSION-[N]
**Issue:** [one-line description]

## Hypotheses

### H1: [hypothesis title]
**Status:** ELIMINATED / CONFIRMED / INVESTIGATING
**Evidence for:** [what supports this]
**Evidence against:** [what disproves this]
**Elimination command:**
\`\`\`bash
[command that proved/disproved this]
\`\`\`
**Result:** [exact output]

### H2: [next hypothesis]
...

## Confirmed Facts (do NOT re-investigate)
- [symbol]: export shape is [shape], params: [params], returns: [return type] (line [N] of [file])
- [API]: is [sync/async], signature: [exact signature]

## Current Best Theory
[What we currently believe is happening]

## Next Action
[Exact next step to take when this session resumes]
```

## When to Create the File

1. A WF fix fails during execution (test fails after applying the fix)
2. An API shape differs materially from the plan (WF-3 stop condition triggered)
3. A TypeScript error cannot be resolved in ≤ 2 attempts

## When to Append to the File

After every hypothesis test: record the command, the result, and the new status.

## When to Archive the File

When the fix is confirmed working: rename to `.Codex/debug/YYYY-MM-DD-[issue].md`.

## When to Load the File

At the START of any session where debugging was in progress:
```bash
ls .Codex/debug/active-session.md  # check if debug session is active
# If exists: read it BEFORE reading STATE.json
```

## Integration

- Invoked by self-verification (SK-416) when a fix attempt fails
- Invoked by code-examination-skill (SK-415) before modifying a file with a known issue
- Pairs with context-overflow-skill (SK-428): if context emergency stop occurs mid-debug, the debug file preserves the investigation state

## XIIGen Example — S3 ElasticsearchProvider Issue

```markdown
# Debug Session: ElasticsearchProvider constructor API
**Issue:** Plan uses `new ElasticsearchProvider(mockCls, {url})` but this fails

## Confirmed Facts
- ElasticsearchProvider constructor: `(cls: ClsService, client: IAsyncElasticsearchClient, config?)`
- `{url}` is NOT a valid second arg — must be a client implementing IAsyncElasticsearchClient
- `@elastic/elasticsearch` is NOT installed — fetch-based wrapper is correct approach
- `IAsyncElasticsearchClient` is defined in `server/src/fabrics/database/base.ts`
- `delete()` returns `Promise<Record<string,unknown>>` — NOT a typed result struct
```
