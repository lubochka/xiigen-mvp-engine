# Is this a hybrid architecture, or a wrapper around one model?

_Last verified: 2026-07-23_

It is hybrid in the boring, checkable sense: the things that usually get hardcoded
are separate files behind shared interfaces. Several model providers implement one
`IAiProvider` contract. Storage is Elasticsearch, PostgreSQL or in-memory. Retrieval
has several interchangeable backends. Service code never imports a provider SDK; it
asks for the interface and gets whatever the configuration resolved.

The default is deliberately offline — a mock model provider and in-memory database,
queue, RAG and secrets — so the engine starts with no API keys. Swapping in a real
cloud provider is a configuration change, not a refactor.

Hybrid also means models can compete instead of taking turns. The dispatcher runs
several models in parallel with a per-model timeout, collects whatever succeeded,
scores the outputs, returns the best one and sums the cost across all attempts. When
every model fails it says so, with the list of errors, rather than returning an empty
answer that looks like a result.

The practical consequence is mundane and useful: mixing a cheap model with an
expensive judge model is a configuration decision (see the dedicated judge provider
in [answer 1](./does-the-agent-actually-check-its-own-work.md)), not a rewrite.

**In this repo:**
- `server/src/fabrics/interfaces/ai-provider.interface.ts` — the one contract every model provider implements
- `server/src/fabrics/ai-engine/dispatcher.ts` — parallel generation, per-model timeout, scoring, cost aggregation
- `server/src/fabrics/ai-engine/anthropic.provider.ts` — one of several model providers behind that interface
- `server/src/fabrics/database/` — Elasticsearch / PostgreSQL / in-memory behind one database interface
- `server/src/fabrics/rag/` — multiple retrieval backends behind one RAG interface

**Related:** the planned `xiigen-open-llm` core is designed to plug in through this
same provider interface — no engine change is required to run it as one more
provider.

[← All ten questions](./README.md)
