# FLOW-48 i18n-translation — P10 Server-Side Edge Case Specifications

## Purpose

Each of the four SERVER_REQUIRED edge cases promoted from P9 is spelled out here as a spec
block ready for P11 implementation. Every block names the owning task node, the HTTP contract
touched, the plain-English business rule, the new BFA rule with its CF number and consumption
accounting, idempotency classification, and the concrete test oracle the spec must assert.

## Source

- `FLOW-48-PLAN-P1-P14.md` §P10
- `docs/flow-coverage/i18n-translation/P9-edge-cases.md` — rows 1, 2, 3, 11

## CF boundary

CF-810, CF-811, CF-812 are consumed by the iron rules locked in R2 design. Next available at
the start of P10: **CF-813**. This document consumes CF-813 through CF-816.

---

### EC-1: Concurrent translation write for the same moduleId and locale

```
Node: T668 (TenantTranslationWriter)
HTTP contract: GET /api/translations/:moduleId/:locale (handled by T666; write path runs
               in T668)
Business rule: CAS storage is hash-addressed and therefore idempotent by construction.
               The translation lookup document is keyed by
               docId = "${tenantId}::${moduleId}::${locale}" and protected by optimistic
               concurrency control. A second concurrent writer observes the existing ref
               before writing and short-circuits to returning the cached result.
BFA rule: CF-813 "Concurrent translation requests for the same moduleId/locale produce
           exactly one CAS blob. Second writer finds ref already present and returns the
           cached result."
  CF consumed: CF-813. Next available: CF-814.
Idempotency: yes — CAS hash-addressing plus lookup-ref OCC by composite docId
Test oracle: fire two concurrent GET /api/translations/:moduleId/:locale requests for a
             moduleId + locale that has never been translated before; assert the
             xiigen-translation-refs index contains exactly one document for that key and
             the CAS index contains exactly one blob for the resulting content hash; the
             second response returns the cached translation, not a fresh AI call.
```

---

### EC-2: Malformed acceptLanguage in AccountCreated

```
Node: T665 (TranslationRequestRegistrar)
HTTP contract: not an HTTP endpoint — handler runs off the AccountCreated queue event
Business rule: BCP-47 normalisation is applied to the raw acceptLanguage value; if the
               normaliser returns null the registrar performs no write — no translation
               request document, no freedom-config mutation, no downstream event.
BFA rule: CF-814 "If acceptLanguage normalises to null, TranslationRequestRegistrar
           writes nothing and emits no event. enabledLocales is not modified."
  CF consumed: CF-814. Next available: CF-815.
Idempotency: n/a (no write occurs)
Test oracle: emit an AccountCreated event with acceptLanguage = 'xyz-invalid'; assert the
             xiigen-translation-requests index document count is unchanged and the tenant's
             freedom-config i18n.enabledLocales value is byte-identical before and after
             the event is processed.
```

---

### EC-3: AI provider returns invalid JSON

```
Node: T666 (TranslationResolverService)
HTTP contract: GET /api/translations/:moduleId/:locale
Business rule: IAiProvider.generateStructured() applies a JSON schema validator to the
               provider response; if the payload is not a valid key-value object the
               validator rejects it and the pipeline falls through to the CF-812 absolute
               fallback branch. No partial result is persisted to CAS and no lookup ref is
               written.
BFA rule: CF-815 "If IAiProvider.generateStructured() returns a payload that fails JSON
           schema validation, pipeline falls through to CF-812 fallback. No partial
           translation is written to CAS."
  CF consumed: CF-815. Next available: CF-816.
Idempotency: n/a (failure path writes nothing)
Test oracle: mock IAiProvider.generateStructured() to return the string "not a json object";
             fire a GET /api/translations/:moduleId/:locale request for a non-English
             locale that has never been translated; assert HTTP 200 with response body
             { fallback: true, locale: 'en' } and assert the xiigen-translation-refs index
             document count is unchanged (no partial write leaked into storage).
```

---

### EC-4: MarketplaceTranslationCacheJob concurrent execution

```
Node: T667 (MarketplaceTranslationCacheJob)
HTTP contract: not an HTTP endpoint — handler runs off the marketplace-cache-miss queue
               event under MASTER_TENANT_ID CLS context
Business rule: the job consumer acquires a SETNX idempotency key with pattern
               idem:translate:master:${moduleId}:${locale} at ORDER 1 (DNA-7). If the key
               is already set a duplicate job instance skips the translation step entirely
               and returns { skipped: true }. Only the first instance performs the AI
               translation and writes the marketplace master CAS blob plus its lookup ref.
BFA rule: CF-816 "MarketplaceTranslationCacheJob uses SETNX idempotency at ORDER 1.
           Concurrent job instances for the same moduleId/locale produce exactly one
           master CAS blob. Duplicate job returns { skipped: true }."
  CF consumed: CF-816. Next available: CF-817.
Idempotency: yes — SETNX at ORDER 1 (DNA-7 idempotency pattern)
Test oracle: enqueue the MarketplaceTranslationCacheJob twice concurrently for the same
             moduleId + locale that has no existing master cache entry; assert exactly one
             CAS write occurred and exactly one lookup-ref document exists under
             MASTER_TENANT_ID scope; assert the second job invocation returned
             { skipped: true } and did not call IAiProvider.generateStructured().
```

---

## Next CF available after P10

**CF-817** is the next available BFA rule number after this document. CF-810..CF-816 are
consumed: CF-810..CF-812 by the design iron rules and CF-813..CF-816 by the four EC blocks
above.

---

Produces artifact at: docs/flow-coverage/i18n-translation/P10-server-specs.md
