# UX Review — Subscription Billing (`subscription-billing`)

**PNGs reviewed:** 9 | **Blockers:** 0 | **High:** 1 | **Medium:** 3 | **Low:** 5
**Overall verdict:** ✅ Shippable

## Summary

Real working flow: Subscription Plans create-form, Billing Dashboard (MRR $9.99, three invoices with PAID/FAILED/VOIDED states + dunning retry info), and Subscribe page with payment-method vault reference. Validation triggers inline errors ("priceCents must be a positive integer", "Plan is required"). The "01" PNG has a state-fidelity mismatch, and r-03-after lost its sidebar chrome. Biggest issue: the "Price (integer cents)" field is counter-intuitive — users will type "9.99" and get an error.

## Per-PNG findings

| # | File | Severity | Axis | Finding (user-perspective) | Suggested fix |
|--:|------|:-------:|------|----------------------------|---------------|
| 1 | `01-subscriptionanalyticsaggregator-data-pip.png` | 🟠 | State fidelity | Filename = analytics aggregator; shows Subscription Plans create form | Capture the Billing Dashboard or an analytics view |
| 2 | `r-02-before.png` | 🔵 | Form | Plans create-form, placeholders clear | — |
| 3 | `r-02-after.png` | 🟡 | Validation | Typing 9.99 into integer-cents → "priceCents must be a positive integer" | Either accept decimals + convert, or relabel to "Price in cents (e.g. 999 = $9.99)" prominently |
| 4 | `r-03-before.png` | 🟡 | Redundant | Identical to r-02-before | Drop |
| 5 | `r-03-after.png` | 🔵 | Regression | Success toast — but sidebar chrome style reflowed; navbar text became invisible | Visual polish issue — check container width |
| 6 | `r-05-before.png` | 🔵 | Form | Subscribe form — two fields, clear | — |
| 7 | `r-05-after.png` | 🔵 | Validation | "Plan is required" fires correctly | — |
| 8 | `r-06-before.png` | 🟡 | Redundant | Identical to r-05-before | Drop |
| 9 | `r-06-after.png` | 🔵 | Success | "Subscription created! Status: TRIALING, Trial ends 5/3/2026" — excellent | — |

## Cross-PNG patterns (flow-level)

- Billing Dashboard is a standout: invoices with states, dunning message, MRR header. This is the strongest billing UX in the batch.
- Plan-creation price-in-cents UX trap will trip every first-time user.
- Two redundant "before" captures per form — drop one pair.

## Business-logic phase coverage

**Visually covered:** plan create form + validation + success, subscribe form + validation + trialing success, billing dashboard with MRR + invoices + failed-dunning.
**Missing:** no cancel/pause flow, no plan-change/upgrade, no past-due/churn state, no invoice detail view.
