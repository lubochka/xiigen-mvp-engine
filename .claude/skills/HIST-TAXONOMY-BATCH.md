# HIST-TAXONOMY-BATCH
## Phase R4b — Taxonomy Conversion Batch Report (Batches E + F + G + H + I + J + K)
## Date: 2026-04-19 | Status: ✅ COMPLETE
## Written: 54 actions (53 new files + 1 append) | Errors: 0

---

## §1 — Summary

| Batch | Source | Actions | Dest |
|---|---|---|---|
| E | `docs/decisions/DECISIONS.md` DR-P8 | 3 new files | `historical/hist_dr_p8_*.json` |
| F | FLOW-07 DR-07-G | 1 append | `design-reasoning/friend-request-social-feed-design-decisions.json` (now 7 records) |
| G | `docs/decisions/` DECALT + DR-242 + ADR-18 | 5 new files | `historical/hist_decalt_*.json`, `hist_dr_242.json`, `hist_adr_flow18_topology.json` |
| H | SESSION-TEACH-WHY-* (FLOW-02) | 7 new files | `historical/hist_tw_flow02_*.json` |
| I | XIIGEN-GAP-REVIEW-2026-04-01.md | 5 new files | `historical/hist_gap_review_*.json` |
| J | DECISIONS-LOCKED.md | 25 new files | `historical/hist_locked_*.json` |
| K | docs/architecture/ DELIVERY_DOC §7 + KNOWLEDGE_DIGEST §18-19 | 8 new files | `historical/hist_arch_delivery_*.json` |
| **Total** | | **54 actions** | |

Validation errors: **0** | All 8 checks: **PASS** for all 53 new files

---

## §2 — Count Note

`fixtures/design-reasoning/historical/` total: **124 files** (not 125 as stated in R9 plan).
Recount: B=35 + C=24 + D=12 + E=3 + G=5 + H=7 + I=5 + J=25 + K=8 = **124**.
Batch F (DR-07-G) appends to `fixtures/design-reasoning/` (not `historical/`) — correctly counted separately.
Total decisions covered: 61 rag-patterns + 124 historical + 1 updated DR file = **186** ✓

---

## §3 — Spot-Checks by Batch

**Batch E — DR-P8-001:** fabricType bug = TWO classes (CLASS F for contract, CLASS A for registry normalization). connectionType=SESSION_GOVERNANCE.

**Batch F — DR-07-G:** Appended as 7th record in friend-request-social-feed-design-decisions.json. Teaching: notification dispatch best-effort, same principle as D-03-4.

**Batch G — hist_adr_flow18_topology:** Read-path extension over dual-write when write guards (BOLA/OCC) are carefully ordered. Option b LOCKED.

**Batch H — D-02-FAN-01:** FAN_IN allSettled vs Promise.all. allSettled captures partial results; Promise.all discards them on first rejection.

**Batch I — GAP-2 (hist_gap_review_002):** NODE = {structure, intent, constraints, quality} is the canonical unit of work. Not a taskTypeId string. curriculumTier=5, qualityScore=0.95.

**Batch J — D-STACK-3 (hist_locked_stack_3):** Execution boundary clause — session files contain ONLY priority stacks + INCOMPATIBLE flags. Other stacks in FUTURE STACKS APPENDIX only. qualityScore=0.97.

**Batch K — ARCH-DI-1 (hist_arch_delivery_di_1):** @Optional() + @Inject(TOKEN) required pair for interface injection. NestJS erases interface types to Object at runtime.

---

## §4 — Final Fixture Inventory After R4b

```
fixtures/rag-patterns/
  hist_arch_*.json   40  (Batch A-1 — R2)
  hist_fd_*.json     21  (Batch A-2 — R2)
  ──────────────────────────────────────
  Subtotal:          61

fixtures/design-reasoning/
  friend-request-social-feed-design-decisions.json  (updated — DR-07-G appended, now 7 records)

fixtures/design-reasoning/historical/
  hist_fd_dr_*.json         35  (Batch B — R3)
  hist_eng_*.json           24  (Batch C — R3)
  hist_flow_*.json          12  (Batch D — R4a)
  hist_dr_p8_*.json          3  (Batch E — R4b)
  hist_decalt_*.json         3  (Batch G — R4b)
  hist_dr_242.json           1  (Batch G — R4b)
  hist_adr_flow18_topology   1  (Batch G — R4b)
  hist_tw_flow02_*.json      7  (Batch H — R4b)
  hist_gap_review_*.json     5  (Batch I — R4b)
  hist_locked_*.json        25  (Batch J — R4b)
  hist_arch_delivery_*.json  8  (Batch K — R4b)
  ──────────────────────────────────────────────
  Subtotal:                124

Total decisions covered:   186 ✓
```

---

## §5 — Next: Post-Conversion Gate

```bash
python3 validate_all_fixtures.py   # gate: 124 historical + 61 rag-patterns
python3 lookup_test.py             # 19 assertions
```
