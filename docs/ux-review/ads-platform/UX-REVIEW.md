# UX Review — Ads Platform (`ads-platform`)

**PNGs reviewed:** 6 | **Blockers:** 2 | **High:** 2 | **Medium:** 1 | **Low:** 1
**Overall verdict:** 🚫 Not representative

## Summary

The 6 PNGs split into TWO distinct real pages (both with live error states), but the 6 filenames do NOT describe them. Some show an "Auction Dashboard" with a red "Failed to fetch auction data" banner; others show "Ad Consent Preferences" with "Failed to fetch consent status: Bad Request". Both pages are surfacing live 400-level fetch failures to the user — a shipping blocker. Filenames 01-06 encode DNA assertion rules, not states.

## Per-PNG findings

| # | File | Severity | Axis | Finding (user-perspective) | Suggested fix |
|--:|------|:-------:|------|----------------------------|---------------|
| 1 | `01-every-task-type-in-t287-t306-has-at-leas.png` | 🔴 | Screenshot integrity | Shows "Ad Consent Preferences" page with live error banner "Failed to fetch consent status: Bad Request"; filename promises task-coverage evidence | Fix the underlying fetch + rename |
| 2 | `02-every-plan-step-is-scoped-to-a-single-re.png` | 🔴 | Error state in captured UI | "Auction Dashboard" showing "Failed to fetch auction data" in pink banner with $0 / 0 / $0 metrics below — shipping this state to users is unacceptable | Resolve fetch failure; capture populated dashboard |
| 3 | `03-no-step-imports-provider-sdks-directly-f.png` | 🟡 | Redundant | Same auction dashboard error-state as #02 | Remove |
| 4 | `04-no-step-creates-entity-specific-controll.png` | 🟡 | Redundant | Same auction dashboard error-state | Remove |
| 5 | `05-all-steps-return-dataprocessresult-t.png` | 🟡 | Redundant | Same "Ad Consent Preferences" error-state as #01 | Remove |
| 6 | `06-focus-areas-covered-request-response-spe.png` | 🟡 | Redundant | Same "Ad Consent Preferences" error-state | Remove |
| — | Auction Dashboard | 🟠 | Error message | "Failed to fetch auction data" is vague — no error code, no retry CTA, no help link | Structured error with retry button and support link |
| — | Ad Consent Preferences | 🟠 | Error message | "Failed to fetch consent status: Bad Request" is a raw HTTP 400 message leaked to the user; "No consent record found" below contradicts the error (is it missing OR failing?) | Distinguish "no consent yet" (empty state) from genuine fetch failure; hide raw HTTP codes |
| — | Metrics cards | 🔵 | Design | $0.00 / 0 / $0.00 shown with full weight despite the data fetch having failed — misleads the user into thinking these are real | Grey-out / skeleton the cards when the banner shows an error |

## Cross-PNG patterns (flow-level)

- **2 distinct pages, 6 nearly-identical captures across them** — 4 of 6 are redundant.
- **BOTH captured pages are in an error state.** Neither is a working happy-path representation.
- No capture of a real auction, a bid placement, or granted consent.
- The contradictory "error + empty" combination (error banner + "No consent record found") would confuse any user.

## Business-logic phase coverage

Ads-platform expected phases:
- ❌ Auction happy-path (budget, active auctions list, bids) — failed fetch instead
- ❌ Consent granted state (green) + consent revoked state (amber)
- ❌ Bid placed → accepted / lost
- ❌ Real-time update (T626 AuctionBidProcessor mentioned in footer)
