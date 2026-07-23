# Does this engine train models, or use new training methods?

_Last verified: 2026-07-23_

Honest answer first: this engine does not train model weights. What it does is
produce and clean a training *signal*, and consume finished models through the
provider interface. The trainable core is a separate, planned open project
(`xiigen-open-llm`); the engine itself does no gradient training.

The training data is born from disagreement, not scraping. When a super-judge
overrides an earlier verdict — upgrading a block to a pass, or downgrading a pass to
a block — and only then, it writes a preference triple to a training-data index. It
refuses to do so unless the model named the discriminating constraint that made one
option better; an empty constraint fails with `EMPTY_DISCRIMINATING_CONSTRAINT`. When
no platform patterns match, the judge does not even call a model — it defers at zero
cost. Nothing is collected "just in case".

The signal is cleaned before it is used. The preference-triple pipeline selects only
triples captured while retrieval was healthy and carrying no quality flags, so
examples taken under a degraded RAG never pollute the set.

And "improvement" here is memory, not weights. A promoter takes high-scoring triples
(score ≥ 8.5) and promotes the chosen answer into the RAG pattern index — explicitly
"promotion scan only, no AI generation", and described as idempotent. A separate
handoff record bundles the cycle score, calibration triples and propagation signals
into its own index: a clean seam for an external trainer to pick up.

**In this repo:**
- `server/src/engine/flows/platform-agent/super-judge-arbiter.service.ts` — triple written only on override; `EMPTY_DISCRIMINATING_CONSTRAINT`; zero-cost defer when nothing matches
- `server/src/learning/dpo-training-pipeline.service.ts` — selects only healthy, unflagged triples
- `server/src/engine/flows/rag-quality-feedback/dpo-to-rag-promoter.service.ts` — promotes score ≥ 8.5 answers into RAG patterns, "no AI generation"
- `server/src/learning/learning-handoff.service.ts` — the handoff record: a seam for an external trainer
- `server/src/engine/dpo-training-data.service.ts` — training-data handling
- `fixtures/event-schemas/history-bootstrap/dpo-triple-created.schema.json` — the shape of a produced triple

**Related:** the trainable core is planned as `xiigen-open-llm`. This engine feeds it
a cleaned signal and consumes finished models through the provider interface — it does
not train them here.

[← All ten questions](./README.md)
