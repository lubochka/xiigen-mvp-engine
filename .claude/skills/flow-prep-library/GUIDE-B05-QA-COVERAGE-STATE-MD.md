# GUIDE-B05 — How to Produce `FLOW-XX-QA-COVERAGE-STATE.md`
## Library guidance file — FLOW-PREP-LIBRARY-MASTER-PLAN v6.1-FINAL
## Produced: Round 15 | Phase 4 (Guidance File Authoring)
## Date: 2026-04-20
## Note: Round 14 (GUIDE-B04 — QA-COVERAGE-STATE.json) was skipped per operator instruction.
##       GUIDE-B05 references GUIDE-B04 as its data source but can be read independently.

---

## FINAL GOAL (re-read before authoring any FLOW-XX-QA-COVERAGE-STATE.md):
> "Taking the produced library as a result of this plan run — same size as list B —
> and applying on new flow specs, we will get proper list B for this flow."

---

## WHAT THIS FILE IS

`FLOW-XX-QA-COVERAGE-STATE.md` is the **human-readable companion** to
`FLOW-XX-QA-COVERAGE-STATE.json` (B-04). It presents the same Q1-Q6 QA category
verdicts as a concise markdown table, readable by a person without parsing JSON.

**Key rule: always produce B-05 immediately after B-04.** The `.md` and `.json` files
carry the same verdicts and evidence — they are a pair, not independent documents.
If one is updated, the other must be updated at the same time.

**Authoring schema reference:** ZIP-01 `XIIGEN-FLOW-DOCUMENT-AUTHORING-GUIDE-v1.15.md`
§companion markdown format; six Q-category definitions.

---

## LIST A SOURCES FOR THIS GUIDANCE FILE

| ZIP | Role | Specific files |
|-----|------|----------------|
| ZIP-01 | PRIMARY + STRUCTURE | AUTHORING-GUIDE v1.15 §companion markdown format; Q1-Q6 category definitions; overall readiness verdict values |
| ZIP-11 | FIXTURE | FLOW-47 QA-COVERAGE-STATE.md (post-implementation, mixed verdicts); FLOW-46 QA-COVERAGE-STATE.md (PASS-dominant); FLOW-25 QA-COVERAGE-STATE.md (BLOCKED — platform-only flow); FLOW-09 QA-COVERAGE-STATE.md (pre-implementation, all TBD) |

---

## OUTPUT FILE SPECIFICATION

**Target path:** `docs/sessions/FLOW-XX/FLOW-XX-QA-COVERAGE-STATE.md`
**File size range:** 0.5–1.5 KB (always small — it is a summary, not a full report)
**When authored:** Immediately after producing `FLOW-XX-QA-COVERAGE-STATE.json` (B-04)
**Production rule:** B-05 is derived from B-04 — never populate independently

---

## FOUR FORMAT VARIANTS (observed in the wild)

Four distinct formatting styles exist. All are valid — the important thing is that
the Q1-Q6 verdicts and the overall readiness are present.

### Variant A — Minimal (FLOW-46/FLOW-47 pattern) — PREFERRED

```markdown
# FLOW-XX QA Coverage — {YYYY-MM-DD}

| Q | Verdict | Highlights |
|---|---------|------------|
| Q1 unit_tests | **{VERDICT}** | {one-line evidence: test count + commit hash} |
| Q2 client_ui | **{VERDICT}** | {one-line evidence: page/route presence or gap} |
| Q3 design_simulation | **{VERDICT}** | {one-line evidence: DC spec or deferred items} |
| Q4 marketplace_ui | **{VERDICT}** | {one-line evidence: applicability + status} |
| Q5 cross_tenant_install | **{VERDICT}** | {one-line evidence: scope model or N/A} |
| Q6 bfa_validation | **{VERDICT}** | {one-line evidence: CF rules + suite result} |

**Overall readiness:** {READY | READY_WITH_GAPS | READY_WITH_CAVEATS | BLOCKED}.
See `FLOW-XX-QA-COVERAGE-STATE.json` and `FLOW-XX-RECONCILIATION-STATE.md`.
```

### Variant B — With category column (FLOW-25 pattern) — for complex flows

```markdown
# FLOW-XX QA COVERAGE — {YYYY-MM-DD}

Slug: `{slug}` | Branch: `{branch}` | Schema: `qcs-v1`

## Overall readiness
**{VERDICT}** — {one-sentence reason}

## Q-Category verdicts

| Q | Category | Verdict | Notes |
|---|----------|---------|-------|
| Q1 | Unit tests | {VERDICT} | {evidence} |
| Q2 | Client UI | {VERDICT or NOT_APPLICABLE} | {evidence or reason} |
| Q3 | Design simulation | {VERDICT} | {evidence} |
| Q4 | Marketplace UI | {VERDICT or NOT_APPLICABLE} | {evidence or reason} |
| Q5 | Cross-tenant install | {VERDICT or NOT_APPLICABLE} | {evidence or reason} |
| Q6 | BFA validation | {VERDICT} | {evidence} |

## Blockers
{N blockers listed, or "None"}
```

### Variant C — Pre-implementation scaffolding (FLOW-09 early pattern)

Used when the flow exists in the plan but implementation hasn't started yet.

```markdown
# FLOW-XX QA Coverage — {slug} (Scaffold)

| Category | Scope | Status / Count | Verdict |
|----------|-------|----------------|---------| 
| Q1 unit tests | {server test path} | {count if known, else TBD} | TBD |
| Q2 client UI | React pages + ui-reflection state | {page count or TBD} | TBD |
| Q3 design simulation | Topology fixture + topology-qa.spec | {status} | TBD |
| Q4 marketplace UI | {applicability} | {status} | TBD |
| Q5 cross-tenant install | scope-isolation arbiter | {status} | TBD |
| Q6 BFA validation | contract binding + cross-flow rules | {count or TBD} | TBD |

Companion: `FLOW-XX-QA-COVERAGE-STATE.json`. All verdicts TBD until Phase 3 evaluation.
```

**Rule:** Variant A (Minimal) is preferred for all new flows. Use Variant B when the flow
has NOT_APPLICABLE categories that need explicit explanation. Use Variant C only at the
very beginning (scaffold) before any implementation evidence exists.

---

## VERDICT VALUES — COMPLETE REFERENCE

### Per-Q verdict values:

| Verdict | Meaning |
|---------|---------|
| `PASS` | Category fully met — evidence confirms requirements satisfied |
| `PASS_WITH_CAVEATS` | Requirements met with known minor deviations (e.g., weakened assertions) |
| `PARTIAL_GAP` | Partially met — some requirements satisfied, identified gaps remain |
| `TBD` | Not yet evaluated — implementation not at the stage for this category |
| `PARTIAL` | Synonym for PARTIAL_GAP (both appear in observed examples) |
| `NOT_APPLICABLE` | This category does not apply to this flow (e.g., platform-only flows for Q2/Q4/Q5) |
| `BLOCKED` | Implementation issue prevents evaluation |

### Overall readiness values:

| Value | Meaning | When to use |
|-------|---------|------------|
| `READY` | All applicable Q-categories pass | All Q verdicts are PASS |
| `READY_WITH_GAPS` | Core requirements met; non-blocking gaps remain | Mix of PASS and PARTIAL_GAP |
| `READY_WITH_CAVEATS` | Requirements met with known limitations | Mix of PASS and PASS_WITH_CAVEATS |
| `BLOCKED` | Blocking issue prevents readiness | Any Q verdict is BLOCKED, or critical Q is PARTIAL with blocking impact |
| `IN_PROGRESS` | Implementation ongoing | Multiple TBD verdicts, active implementation session |

---

## STEP-BY-STEP AUTHORING INSTRUCTIONS FOR CLAUDE CODE

### Pre-condition

B-05 is derived from B-04. Before authoring:

```bash
# Confirm B-04 exists
ls docs/sessions/FLOW-XX/FLOW-XX-QA-COVERAGE-STATE.json
# Read the Q1-Q6 verdicts and overallReadiness from B-04
python3 -c "
import json
d = json.load(open('docs/sessions/FLOW-XX/FLOW-XX-QA-COVERAGE-STATE.json'))
cats = d.get('qCategories', {})
for k, v in cats.items():
    print(k, ':', v.get('verdict'), '—', v.get('evidence', [''])[0][:60])
print('Overall:', d.get('overallReadiness'))
" 2>/dev/null
```

### Step 1: Choose the variant

- Variant A (Minimal): default for all flows with evidence
- Variant B (Extended): use when ≥2 categories are NOT_APPLICABLE
- Variant C (Scaffold): only when starting from scratch before any implementation

### Step 2: Write the header

```markdown
# FLOW-XX QA Coverage — {YYYY-MM-DD}
```

The date is today's date (same as B-04's `createdAt`).
No branch or slug needed in Variant A (keep it compact).

### Step 3: Populate the 6-row table

For each Q category, derive the row from B-04:

```
B-04 field → B-05 table column
qCategories.Q1_unit_tests.verdict → Q1 Verdict (bold)
qCategories.Q1_unit_tests.evidence[0] → Q1 Highlights (condensed to one line)
qCategories.Q1_unit_tests.claimedCount + actualCount → include in highlights if relevant
```

**One-line highlight rules:**
- Q1 (unit_tests): include the test count and the commit hash. Format: `{N} tests green per commit {hash}`
- Q2 (client_ui): include the key UI presence/absence fact. Format: `{route} registered; {page} on disk` or `{gap description}`
- Q3 (design_simulation): include DC spec status. Format: `DC-01..DC-10 spec {passing N/N | deferred | absent}`
- Q4 (marketplace_ui): include applicability. Format: `{APPLICABLE/NOT_APPLICABLE} — {reason or status}`
- Q5 (cross_tenant_install): include scope model. Format: `{scope model name} verified` or `N/A — platform-only`
- Q6 (bfa_validation): include CF rule range and suite result. Format: `CF-{N}..CF-{N+K} unique; BFA suite {N}/{N} pass`

**Bold the verdict** with double asterisks: `**PASS**`, `**PARTIAL_GAP**`, etc.

### Step 4: Write the overall readiness footer

```markdown
**Overall readiness:** READY_WITH_GAPS.
See `FLOW-XX-QA-COVERAGE-STATE.json` and `FLOW-XX-RECONCILIATION-STATE.md`.
```

Rules:
- The value must match `overallReadiness` from B-04 exactly (same string, same case)
- Always include the cross-reference links to `.json` and `RECONCILIATION-STATE.md`
- No period after the cross-reference sentence (it is a list of links)

---

## COMPLETED EXAMPLES ACROSS FLOW STATES

### Example 1 — All PASS (FLOW-46 pattern)

```markdown
# FLOW-46 QA Coverage — 2026-04-17

| Q | Verdict | Highlights |
|---|---------|------------|
| Q1 unit_tests | **PASS** | 58 server (48 services + 10 design-contract) + 10 client = 68 tests pass |
| Q2 client_ui | **PASS** | /chat route registered at App.tsx:164; ChatPage + ActionCard + useAgentSession on disk |
| Q3 design_simulation | **PASS** | DC-01..DC-10 spec passing 10/10; SNAP-01..21 + INT-1..4 deferred |
| Q4 marketplace_ui | TBD | Meta-flow; marketplace story not documented |
| Q5 cross_tenant_install | **PASS** | MASTER_TENANT_ID + TenantScopeGateway (AD-1/AD-2/AD-13/AD-11) |
| Q6 bfa_validation | **PASS** | CF-839/840/841 unique; BFA suite 32/360 pass; event/index namespaces unique |

**Overall readiness:** READY_WITH_CAVEATS (only verified end-to-end flow in 37-47 range).
See `FLOW-46-QA-COVERAGE-STATE.json` and `FLOW-46-RECONCILIATION-STATE.md`.
```

### Example 2 — Mixed verdicts (FLOW-47 pattern)

```markdown
# FLOW-47 QA Coverage — 2026-04-17

| Q | Verdict | Highlights |
|---|---------|------------|
| Q1 unit_tests | **PASS_WITH_CAVEATS** | 86 tests green per commit 2d7ef07 |
| Q2 client_ui | **PARTIAL_GAP** | T661 stub instead of real API |
| Q3 design_simulation | TBD | No DC-01..DC-10 spec |
| Q4 marketplace_ui | **PARTIAL_GAP** | ironRules + arbiterConfigIds zero-populated |
| Q5 cross_tenant_install | **PARTIAL_GAP** | T661 stub blocks real provisioning |
| Q6 bfa_validation | **PASS** | CF-832..CF-838 introduced |

**Overall readiness:** READY_WITH_GAPS.
See `FLOW-47-QA-COVERAGE-STATE.json` and `FLOW-47-RECONCILIATION-STATE.md`.
```

### Example 3 — Platform-only flow with NOT_APPLICABLE categories (FLOW-25 pattern)

```markdown
# FLOW-25 QA COVERAGE — 2026-04-17

Slug: `bfa-cross-flow-governance` | Branch: `claude/vigorous-margulis` | Schema: `qcs-v1`

## Overall readiness
**BLOCKED** — IMPL-STATE inconsistent with code, topology JSON missing.

## Q-Category verdicts

| Q | Category | Verdict | Notes |
|---|----------|---------|-------|
| Q1 | Unit tests | PARTIAL | 30 server test files exist; IMPL-STATE claims 0 |
| Q2 | Client UI | NOT_APPLICABLE | Internal-only flow; no tenant UI required |
| Q3 | Design simulation | PARTIAL | Full design-sim text; JSON topology file missing |
| Q4 | Marketplace UI | NOT_APPLICABLE | Platform-only governance flow |
| Q5 | Cross-tenant install | NOT_APPLICABLE | Platform-only — not packaged |
| Q6 | BFA validation | TBD | CF-473..CF-479 referenced; wiring unverified |

## Blockers
1. IMPL-STATE NOT_STARTED contradicts 14 services + 30 tests on disk
```

### Example 4 — Pre-implementation scaffold (early FLOW-09 pattern)

```markdown
# FLOW-09 QA Coverage — transactional-event-participation (Scaffold)

| Category | Scope | Status / Count | Verdict |
|----------|-------|----------------|---------|
| Q1 unit tests | server/test/transactional-event-participation/ | 5 phase, 40 it-blocks | TBD |
| Q2 client UI | React pages + ui-reflection state | 5 pages; inventory incomplete | TBD |
| Q3 design simulation | Topology fixture + topology-qa.spec | Topology PRESENT, qa-spec present | TBD |
| Q4 marketplace UI | Marketplace storefront surface | APPLICABLE (ticket purchase) | TBD |
| Q5 cross-tenant install | scope-isolation arbiter | APPLICABLE; arbiter PRESENT (FC-32) | TBD |
| Q6 BFA validation | contract binding + cross-flow rules | 20 contracts defined; binding TBD | TBD |

Companion: `FLOW-09-QA-COVERAGE-STATE.json`. All verdicts TBD until Phase 3 evaluation.
```

---

## SELF-CHECK BEFORE SAVING

```
□ One row per Q category: Q1 through Q6 — exactly six rows, no extras, no missing
□ Verdict is bolded for non-TBD/non-NOT_APPLICABLE values: **PASS**, **PARTIAL_GAP**, etc.
□ Highlights are one line only — not a paragraph, not a bullet list
□ Overall readiness value exactly matches overallReadiness in the companion B-04 JSON
□ Cross-reference links at the bottom point to the correct file names for this flow
□ File saved to docs/sessions/FLOW-XX/FLOW-XX-QA-COVERAGE-STATE.md
□ B-04 JSON and B-05 markdown both updated in the same session (never one without the other)
```

**SILENT_FAILURE RISK:** The most common error is producing B-05 with verdict values that
don't match B-04. Since B-05 is derived from B-04, any discrepancy between them means one
was updated and the other wasn't. Always use the Python snippet in the pre-condition to
read B-04 verdicts before writing B-05.

---

## THE COMPANION RULE

B-04 and B-05 are always authored together. The authoring sequence is:

```
1. Run bash evidence commands → populate B-04 (FLOW-XX-QA-COVERAGE-STATE.json)
2. Read B-04 verdicts → produce B-05 (FLOW-XX-QA-COVERAGE-STATE.md) from them
3. Save both files in the same session
```

If a future session updates QA verdicts (e.g., after fixing a Q2 client_ui gap), it
must update BOTH B-04 and B-05. Updating one without the other creates a split state
where the human-readable file disagrees with the machine-readable source.

---

## Q-CATEGORY REFERENCE

| Q | Category name | What it evaluates | NOT_APPLICABLE condition |
|---|---------------|------------------|-------------------------|
| Q1 | unit_tests | Server jest + e2e test count, baseline vs actual | Never N/A — all flows have some tests |
| Q2 | client_ui | UI-REFLECTION verdicts per task type; React pages present | Platform-only flows with no tenant UI (e.g., FLOW-25, FLOW-33, FLOW-41) |
| Q3 | design_simulation | Design contract spec (DC-01..DC-10); DPO triple check | Flows that use a simplified design process |
| Q4 | marketplace_ui | Marketplace package applicability; ironRules + arbiterConfigIds populated | Platform-only flows not packaged for marketplace |
| Q5 | cross_tenant_install | Scope-isolation arbiter; scope portability tests | Platform-only flows that are never installed cross-tenant |
| Q6 | bfa_validation | CF rule presence and uniqueness; BFA cross-flow validator suite result | Never N/A — all flows must pass BFA validation |

**Rule for NOT_APPLICABLE:** The Q category is NOT_APPLICABLE if and only if the flow
is `INTERNAL_ONLY` or `ENGINE_INTERNAL` in its classification AND the category concerns
a surface that cannot exist for such a flow (e.g., no tenant UI for a pure engine flow).
When in doubt, use TBD rather than NOT_APPLICABLE — only use NOT_APPLICABLE when the
reason is explicit and documented.

---

## C30/C38 SOURCE SPLIT NOTE

The QA-COVERAGE-STATE.md schema is **universal** — same structure for all 49 flows.
For FLOW-41 (`adapter-ci-cd-bridge`): Q2/Q4/Q5 are likely NOT_APPLICABLE (no user UI,
platform-only, engine-internal). Use Variant B with NOT_APPLICABLE rows.
For FLOW-00 and FLOW-48: use the same schema; verdicts derived from ZIP-17 fleet data.

---

## AUTHORING QUALITY GATE

This guidance file is SELF-SUFFICIENT if a Claude Code session can produce a correct
`FLOW-XX-QA-COVERAGE-STATE.md` using only:
1. This guidance file
2. The companion `FLOW-XX-QA-COVERAGE-STATE.json` (B-04) for the verdict values

---
*GUIDE-B05 | Round 15 | Phase 4 — Guidance File Authoring*
*Round 14 (GUIDE-B04) skipped per operator instruction*
*Sources: ZIP-01 (P+S), ZIP-11 (F — four examples used: FLOW-09, FLOW-25, FLOW-46, FLOW-47)*
*Next: GUIDE-B06 — FLOW-XX-RECONCILIATION-STATE.md (Round 16)*
