# Session Completeness Under No-Product-Decisions Constraint

## What "Done" Means in This Context

A session is complete only when ALL of the following are true:

1. **No unresolved product decisions were made** — if you identified a product decision and could not resolve it, there must be a DECISIONS.md entry for it
2. **No thresholds were silently changed** — grep confirms no numeric constants changed in guardrail/scorer files without a corresponding DECISIONS.md entry
3. **Baseline still holds** — test count ≥ session-start baseline; no existing test assertions changed
4. **Every "almost did it" is logged** — even decisions you correctly avoided get an AVOIDED-PRODUCT-DECISION log entry

## What "Done" Does NOT Mean

- "I documented the product decision" — documentation is not the same as resolution
- "I left a TODO comment in the code" — TODOs are not escalation protocol
- "I'll fix the product decision impact in the next session" — each session ends clean

## Incomplete Session Protocol

If you reach the session end gate and a product decision is unresolved:

1. DO NOT change the code to work around it
2. Write the DECISIONS.md entry
3. State the decision clearly with OPTIONS A/B/C
4. Mark session status in STATE-Pn.json as `BLOCKED_ON_PRODUCT_DECISION`
5. ⛔ STOP — do not proceed to the next phase

The next session begins with Luba reviewing and resolving the product decision, then explicit "yes" to continue.

## Anti-Pattern: The Silent Fix

The most dangerous no-product-decisions violation is the "silent fix":
- Code has a threshold of `0.7`
- Engine is producing results Luba hasn't complained about
- You notice `0.7` seems arbitrary and change it to `0.75` "for better accuracy"
- Tests still pass because thresholds aren't tested directly
- Four flows now behave differently but nobody notices for weeks

**Detection:** After ANY change to a file in `guardrails/` or `learning/`, grep for numeric literals changed:
```bash
git diff server/src/guardrails/ server/src/learning/ | grep "^[+-]" | grep -E "[0-9]+\.[0-9]+"
```
If any number changed: verify each one has a DECISIONS.md entry or escalate.
