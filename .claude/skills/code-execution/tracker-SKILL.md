# Tracker Skill — XIIGen Project Tracker Adapter

> OPTIONAL — loaded when `TRACKER_PROVIDER` env is configured. Defaults to local-file mode.

**SK Number:** SK-406
**Load Order:** Optional (loaded when tracker is configured)

---

## What This Skill Does

Documents how to use the project tracker adapter to create and update cards for each session's work. The adapter follows the same FREEDOM/MACHINE split as the engine's fabric providers — the interface is MACHINE (fixed), the provider is FREEDOM (swappable).

---

## Interface (MACHINE — never changes)

```typescript
interface IProjectTrackerService {
  createCard(
    phase: string,       // 'P1', 'P2', etc.
    session: string,     // 'session-1', 'session-2', etc.
    tenantId: string,    // multi-tenant scoping
    title: string,
    description?: string
  ): Promise<DataProcessResult<{ cardId: string }>>;

  updateStatus(
    cardId: string,
    status: 'IN_PROGRESS' | 'COMPLETE' | 'BLOCKED',
    tenantId: string,
    note?: string
  ): Promise<DataProcessResult<void>>;

  addComment(
    cardId: string,
    comment: string,
    tenantId: string
  ): Promise<DataProcessResult<void>>;
}
```

All methods return `DataProcessResult<T>` — never throw. Multi-tenant: every call scoped by `tenantId`. Tenant-A cards are invisible to Tenant-B.

---

## Provider Configuration (FREEDOM — configurable)

| Provider | Config | When to Use |
|----------|--------|-------------|
| `local-file` (default) | No env var needed | No external tracker configured |
| `jira` | `TRACKER_PROVIDER=jira` + `JIRA_URL` + `JIRA_TOKEN` | Jira configured |
| `trello` | `TRACKER_PROVIDER=trello` + `TRELLO_KEY` + `TRELLO_TOKEN` | Trello configured |
| `linear` | `TRACKER_PROVIDER=linear` + `LINEAR_API_KEY` | Linear configured |

Default is always `local-file`. Zero configuration needed — starts working immediately.

---

## Local File Provider

Writes to `.claude/tracker/{tenantId}/cards.json`.

```json
{
  "cards": [
    {
      "cardId": "P1-session-1-001",
      "phase": "P1",
      "session": "session-1",
      "tenantId": "default",
      "title": "Build agent-constitution skill",
      "status": "COMPLETE",
      "createdAt": "2026-03-18T22:00:00Z",
      "updatedAt": "2026-03-18T23:30:00Z",
      "comments": ["Session gate passed: 2342/220 tests"]
    }
  ]
}
```

File format is human-readable and durable — if the tracker fails, Luba can inspect the JSON directly.

---

## Provider Swap Protocol

When Luba provides external tracker credentials:

1. Set env var: `TRACKER_PROVIDER=jira` (or `trello`, `linear`)
2. Set auth env vars (see table above)
3. Restart the NestJS server — the FREEDOM config layer picks up the new provider
4. Existing local-file cards are NOT migrated (they stay in `.claude/tracker/`)
5. New cards from this point forward go to the external tracker

This follows the same pattern as the engine's database fabric: changing `DB_PROVIDER=postgresql` switches the provider without changing any application code.

---

## Session Usage Protocol

At the start of each session:
```
createCard('P1', 'session-1', tenantId, 'Phase 1: Governance skills build')
→ returns cardId 'P1-session-1-001'
```

During session (when starting each skill):
```
addComment(cardId, 'Starting agent-constitution skill', tenantId)
```

At session end (gate passed):
```
updateStatus(cardId, 'COMPLETE', tenantId, 'Gate: 2342 server / 220 client tests passing')
```

At session end (blocked):
```
updateStatus(cardId, 'BLOCKED', tenantId, 'BLOCKED: [reason]')
```

---

## Multi-Tenant Scoping

The tracker is multi-tenant. When running in single-tenant mode (no tenant configured), use `tenantId: 'default'`.

In multi-tenant production mode, each tenant gets their own card namespace. Tenant-A's Phase 1 cards are completely separate from Tenant-B's Phase 1 cards.

---

## Anti-Patterns

1. **Updating tracker before session gate passes** — mark COMPLETE only after both build and test gates pass
2. **Storing secrets in card descriptions** — tracker is logged, never put API keys in comments
3. **Sharing cardIds between tenants** — always pass tenantId explicitly
4. **Using tracker as the only session record** — STATE-Pn.json is the source of truth; tracker is observability only

---

## When This Skill Is NOT Loaded

If `TRACKER_PROVIDER` env var is not set and no tracker config exists: this skill is silently not loaded. Sessions still complete normally — the tracker is observability tooling, not a blocking dependency.

The agent-constitution session end protocol still applies regardless of whether tracker is active.
