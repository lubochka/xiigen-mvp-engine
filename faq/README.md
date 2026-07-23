# XIIGen — Frequently Asked Questions

_Last verified: 2026-07-23_

These answers are written to be honest about what the engine actually does, and
every one of them points at real files you can open in this repository. Where the
code backs a claim, the claim names the code. Where it does not, the answer says so.

Two honesty boundaries hold across all of the answers below:

- **XIIGen does not train model weights.** It produces and cleans a training
  *signal* — preference triples built from arbiter disagreement, good answers
  promoted into RAG patterns — and consumes finished models through one provider
  interface. The trainable core is a separate, *planned* open project,
  `xiigen-open-llm`; this engine does no gradient training.
- **The defaults are offline.** Out of the box the engine resolves a mock model
  provider and in-memory database, queue, RAG and secrets, so it starts with no API
  keys. Running a real model is a configuration change, not a code change.

1. [Does the agent actually check its own work, or does it just say it did?](./does-the-agent-actually-check-its-own-work.md)
2. [Is this a hybrid architecture, or a wrapper around one model?](./is-this-a-hybrid-architecture-or-a-wrapper-around-one-model.md)
3. [Can the AI invent the algorithm, or does it only type the code?](./can-the-ai-invent-the-algorithm-or-does-it-only-type-the-code.md)
4. [Does this engine train models, or use new training methods?](./does-this-engine-train-models-or-use-new-training-methods.md)
5. [What does "agentic" mean in this project, concretely?](./what-does-agentic-mean-in-this-project.md)
6. [How does this change the developer's role?](./how-does-this-change-the-developers-role.md)
7. [Which coding agent does this bet on — Claude, Codex, or Cursor?](./which-coding-agent-does-this-bet-on-claude-codex-or-cursor.md)
8. [Is this a real system, or a demo?](./is-this-a-real-system-or-a-demo.md)
9. [Isn't this just vibe coding with extra steps?](./isnt-this-just-vibe-coding-with-extra-steps.md)
10. [How does this relate to today's trends — local LLMs, agent frameworks, AI gateways?](./how-does-this-relate-to-local-llms-agent-frameworks-ai-gateways.md)
