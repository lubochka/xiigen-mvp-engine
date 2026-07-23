# SEO and GitHub Metadata — Recommendations

> Reference for the repository owner to set GitHub About / topics / social preview;
> not auto-applied.
>
> Nothing in this file is applied automatically. Apply these settings only after this
> branch is published or merged into the public repository. On this branch the
> relicensing has already landed (`LICENSE` carries the AGPL text; the `server` and
> `client` manifests declare `AGPL-3.0-only`), so the description and the `agpl-3-0`
> topic are accurate.

## Short description (GitHub About, one line)

One tight line (target: under ~120 characters) for the repository About field:

    Self-building AI code generation engine that generates application flows instead of implementing them. AGPL-3.0.

## Longer description (2–4 sentences)

For the README lead, an announcement, or a longer About value where the platform
allows it:

XIIGen is a fabric-first engine that generates application flows instead of
implementing them: it produces flow definitions, generated services, configuration
documents and cross-flow validations. Six fabric interfaces — database, queue, AI
model, RAG strategy, secrets store and flow orchestrator — make every provider
swappable through configuration. Generated code is checked by nine structural DNA
rules and scored by a separate judge model. XIIGen is the application layer of the
planned xiigen-open-llm open core; it does not train model weights.

## Website

Leave empty until an official XIIGen project site exists.

## Topics (max 20)

GitHub allows at most 20 topics, so every slot is spent on a word backed by code or
docs in this repository:

- xiigen
- agent-skills
- ai-agents
- claude
- claude-code
- codex
- cursor
- code-generation
- agentic-workflows
- flow-orchestration
- dag
- ai-pipelines
- rag
- graphrag
- multi-agent
- multi-tenancy
- agpl-3-0
- typescript
- nestjs
- react

Evidence, in short: `.claude/skills/` and `.agents/skills/` (agent skill library);
`CLAUDE.md`, `AGENTS.md`, `.cursorrules` (the repository targets Claude, Codex and
Cursor); `server/src/engine/flows/` (flow generation); `contracts/topologies/*.topology.json`
(DAG topologies); `server/src/fabrics/interfaces/` including `graph-rag.interface.ts`
(fabric interfaces and graph RAG); `server/src/kernel/multi-tenant/` (multi-tenancy);
`server/src/guardrails/dna-validator.ts` (DNA-1 … DNA-9, the nine structural rules);
`server/package.json` (NestJS, TypeScript) and `client/package.json` (React, Vite);
`LICENSE` after relicensing (AGPL-3.0). The `agent-skills` topic also matches the
companion repository xiigen-general-skills, so both repositories surface on the same
GitHub topic page.

## Deliberately excluded topics

Honest omissions — each would advertise something the code does not deliver:

- `mcp` — there is no Model Context Protocol code in this repository.
- `local-llm`, `local-models` — a local Ollama provider (`server/src/fabrics/ai-engine/ollama.provider.ts`)
  exists but is NOT registered as a configuration-selectable provider type: the AI provider
  enum in `server/src/fabrics/ai-engine/base.ts` is `mock/anthropic/openai/google/grok`, and
  `server/src/fabrics/ai-engine/ai-engine.module.ts` registers only those five. The Ollama
  provider is used only on the OSS-calibration path (`server/src/engine/calibration/oss-curriculum-runner.service.ts`,
  referenced in `server/src/learning/model-teaching-matrix.ts`). These topics are excluded to
  avoid implying a ready, configuration-selectable local-inference option.
- `llm-training`, `fine-tuning`, `dpo` — this repository builds and cleans training
  signal; it does not train model weights.
- `autonomous-agents`, `self-improving` — agent actions are stored as drafts and
  proposals, not applied automatically.
- `apache-2-0` — removed by the relicensing; this repository is `AGPL-3.0-only`.
- maturity or hype topics (e.g. `enterprise`, `battle-tested`) — there are no tagged
  releases and no measured public deployments.
- `xiigen-open-llm` — the companion repository does not exist yet; the relationship is
  described in prose, never linked.

## Social preview (positioning)

The repository ships no brand image — no logo, no favicon, no `.svg` — and its only
images are run screenshots that may contain tenant or personal data, so those must not
be used as a social card. If the owner wants a card, a plain text card is enough:

- Wordmark: `XIIGen`, in a monospace or plain grotesque face; no invented logo.
- Subtitle (must match the About line): `Fabric-first flow-generation engine`, or the
  longer positioning line below.
- Third line: `AGPL-3.0`.
- Solid dark background; no screenshots, no numbers, no hype words, no tenant names.

One-line positioning (for project lists and directories):

    XIIGen — AGPL-3.0 engine that generates application flows: swappable provider
    interfaces, generated code checked by machine rules and a separate judge model,
    plus the agent skill library used to build it.

If no card is provided, GitHub composes a preview from the repository name, description
and owner avatar. That is acceptable — an empty card is more honest than a misleading
one, and a social card is decoration, not a condition of publishing.

## Badges — honest note

Keep badges to claims that a file or a real run can back:

- A license badge (AGPL v3) may be added once `LICENSE` carries the AGPL text.
- A CI status badge may be added, but only after the first green pipeline run on the
  published repository. The workflow triggers on push and pull_request to `main`; until
  real history lands on `main`, the pipeline does not run and the badge would read
  "no status". If the first run is red, fix it — do not hide it.
- State the runtime as text rather than as a badge: **Node.js 20 LTS or newer
  (CI runs on Node 24)**.
- Do not add test-count, coverage, or version badges: test counts are not re-measured
  here, no coverage report is published, and there are no release tags — a `v1.0.0`
  badge next to zero releases misleads.

Both the license badge and the CI status image are served by external services; a
README that embeds them breaks visibly when those services are unreachable. Two or
three badges at most.
