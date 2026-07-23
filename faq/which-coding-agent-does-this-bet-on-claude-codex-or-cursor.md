# Which coding agent does this bet on — Claude, Codex, or Cursor?

_Last verified: 2026-07-23_

None of them, on purpose. The project is built so the host is swappable and thin, and
the durable logic stays in the repository rather than in any one tool.

Host adapters live apart from the engine: fourteen of them — Figma, Canva, Miro,
Webflow, Framer, n8n, Notion, Shopify, Stripe, Wix, Monday, Atlassian, Google
Workspace and Chrome — each with the same small shape of one adapter file plus its
types and index. Engine logic does not migrate into an adapter.

The model "race" is settled by configuration rather than rewriting: providers are
registered in a registry and resolved through a factory, so changing which model runs
is a config change, not a code change.

The agent context itself is just files at the repository root that any compatible host
reads, and the skills are kept in two libraries so different hosts can load the same
rules. The point is to avoid picking a winner in a race that is still running.

**In this repo:**
- `adapters/` — fourteen thin host adapters, all the same shape
- `adapters/stripe/FT-ST1/src/stripe-adapter.ts` — one adapter, as an example of the shape
- `server/src/fabrics/ai-engine/provider-registry.ts` — models registered and resolved through a factory
- `.agents/skills/` — one skill library hosts load
- `.claude/skills/` — the second skill library, for a different host

[← All ten questions](./README.md)
