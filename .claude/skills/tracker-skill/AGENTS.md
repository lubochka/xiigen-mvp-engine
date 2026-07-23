# Tracker Skill — Agent Instructions

This skill is OPTIONAL — only load if `TRACKER_PROVIDER` is set OR Luba explicitly asks about tracking.

## Prerequisite Check (Run Once Per Project Setup)

At the start of Phase 1 (first time only):
```
Do you have Jira, Trello, or Linear configured for this project?
  YES → set TRACKER_PROVIDER env var and auth tokens, then use external provider
  NO  → use local-file mode (default, zero config)
```

For this migration project: **local-file mode** (Luba has not configured an external tracker).

## Session Card Lifecycle

```
1. Session starts → createCard(phase, session, tenantId, title)
   → saves cardId for this session

2. During session → addComment(cardId, progress note, tenantId) [optional]

3. Session end (gate passes) → updateStatus(cardId, 'COMPLETE', tenantId, gate results)

4. Session end (blocked) → updateStatus(cardId, 'BLOCKED', tenantId, reason)
```

## Do NOT Use Tracker For

- Storing architecture decisions (use DECISIONS.md)
- Storing session state (use STATE-Pn.json)
- Tracking test counts (use session gate output)
- Tracking file changes (use git log)

## Local File Location

`.claude/tracker/default/cards.json` (for single-tenant / default tenant)

This file is human-readable. Luba can review it directly.
