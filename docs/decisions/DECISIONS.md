# Architecture Decisions — XIIGen Skill Migration

---

## DR-P8-001: fabricType mismatch classification

**Date:** 2026-03-18
**Phase:** 8 (Bug Taxonomy Review)
**Decided by:** Luba

**Question:** If a factory contract has `fabricType: 'ELASTICSEARCH'` (wrong case) instead of `'elasticsearch'`, is this CLASS A (Fabric Provider) or CLASS F (Engine Contract)?

**Decision:** Both — two separate bugs:
- **CLASS F** — fix the contract now. The wrong value is in the factory contract field. The provider-registry matching is working correctly.
- **CLASS A** (separate, optional) — registry normalization (case-insensitive matching) is a separate improvement. File as CLASS A only if/when registry normalization is explicitly desired. Do not conflate with the CLASS F contract fix.

**Rationale:** The contract is the source of truth for factory behavior. A wrong field value in the contract is a contract bug. Provider registry behavior is a separate concern.

---

## DR-P8-002: DNA violation in generated output classification

**Date:** 2026-03-18
**Phase:** 8 (Bug Taxonomy Review)
**Decided by:** Luba

**Question:** If generated `.ts` output contains a DNA violation (e.g. `class OrderModel {}`), is this CLASS C (DNA Pattern) or CLASS D (AF Pipeline)?

**Decision:** Split — **C = what, D = why:**
- **CLASS C** — violation found in output by dna-compliance-guard scan → fix the generation template or DNA guard.
- **CLASS D** — root cause traceable to a specific AF station decision (e.g. AF-1 Genesis used wrong archetype prompt, allowing DNA-1 violation through) → fix the station.

Same underlying bug can be classified as C (output observation) initially, then escalated to D when root cause is determined. Or classified directly as D if root cause is immediately clear.

**Rationale:** C = the observable violation in output. D = the pipeline decision that allowed it. Both can be valid entry points for the same bug; the distinction drives where the fix lives (template/guard vs AF station).

---

## DR-P8-003: Skill injection bug classification

**Date:** 2026-03-18
**Phase:** 8 (Bug Taxonomy Review)
**Decided by:** Luba

**Question:** If AF-4 injects wrong skill block (e.g. SK-PLAN) into AF-1, causing a DNA violation in the generated output, is this a new class or subtype of CLASS D?

**Decision:** **Subtype of CLASS D — AF Pipeline.** AF-4 skill selector → AF-1 generator is an AF pipeline data flow. A wrong skill block causing wrong output is a pipeline failure. Use `D-skill-injection` as the subtype note in the ROOT CAUSE field of the FIX template. Six classes remain — no Class G.

**Rationale:** Skill injection is not architecturally distinct from other inter-station data flow failures. It uses the same AF-4 → AF-1 channel. Adding Class G for one subtype of D would fragment the taxonomy prematurely. Revisit if Phase 11 reveals multiple distinct skill-injection failure patterns.
