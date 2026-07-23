# How does this relate to today's trends — local LLMs, agent frameworks, AI gateways?

_Last verified: 2026-07-23_

In short: the AI-gateway cost accounting is already built in, graph-style retrieval is
wired in as a sidecar, and a self-hostable local core is a planned connection through
the provider interface, not a shipped feature.

Where the code actually backs a trend, this answer points at the code; where it does
not, it says so.

The "AI gateway" pattern is built in. A cost tracker accumulates token usage and cost
per tenant and per model, and a token budget does a pre-flight check against a
per-tenant limit and a per-request cap, failing a request that would go over budget
rather than silently running it.

Graph-style retrieval is wired as a sidecar: a separate graph-RAG server with its own
Dockerfile and Python entry point, with a matching provider inside the engine behind
the shared retrieval interface. Retrieval quality has its own bench — a runner plus
seed scripts that populate patterns per business flow.

On local models: the provider interface is the seam where a self-hostable open core is
*planned* to plug in (`xiigen-open-llm`). That is a planned connection, not a shipped
local model, and the engine's default configuration is an offline mock provider — not
a local model server. On MCP: there is no MCP server or client in this repository, so
this FAQ does not claim one.

**In this repo:**
- `server/src/fabrics/ai-engine/cost-tracker.ts` — token usage and cost tracked per tenant and per model
- `server/src/fabrics/ai-engine/token-budget.ts` — pre-flight per-tenant limit and per-request cap
- `server/src/fabrics/ai-engine/provider-registry.ts` — the seam where any provider, including a future open core, is registered
- `nano-graphrag-server/server.py` — the graph-RAG sidecar server
- `rag-benchmark/benchmark_runner.py` — the retrieval-quality bench runner

[← All ten questions](./README.md)
