# Flow UI examination — FLOW-16 marketplace-payments

## Date: 2026-04-20 · Run: RUN-57 · Batch: C (Grammar 5 Checkout + Grammar 3 Escrow list)

## One-sentence spec (F1)
> When a payment is initiated on the XIIGen marketplace, write the outbox
> entry before enqueuing, enforce idempotency via DNA-9, execute the
> compensation chain on failure, and confirm all 14 named checks pass.

## Roles (F3 — `ROLE-ANALYSIS-BATCH-04.md`)
**Broadest role coverage in fleet — 10 roles:** anonymous (guest checkout), public-mkt-visitor, tenant-user (primary buyer), tenant-admin (payments config + refund queue), referral-user, freelancer (escrow payee), business-partner (B2B payer), event-organiser (split payout), platform-admin (platform fees), platform-support (read-only).

## Grammar (compound)
- **G5 Kiosk** for CheckoutPage (single "Pay $X" primary action)
- **G3 Card List with State Badge** for EscrowDashboardPage (funds held per milestone)
- **G3 Card List** for Admin refund queue

## Reference
**Stripe Checkout** (checkout), **Stripe Connect** (escrow), **Stripe Dashboard** (admin refunds).

## Classification
- **Q1 CRUD?** 🟡 2 pages (CheckoutPage / EscrowDashboardPage). Needs PNG inspection.
- **Q2 Error/empty?** P0 HIGH RISK — "Cart ID field" appeared in pre-RUN-47 PNGs (per REPAIR-GUIDANCE table). Needs confirmation checkout is now order-summary + payment-form, not a Cart-ID input.
- **Q3 Engineering leak?** "Outbox entry", "DNA-9 idempotency", "compensation chain", "14 named checks" must NOT appear in user-facing checkout.
- **Q4 Role-correct?** ❌ 2 pages for 10 roles = likely insufficient branching; particularly guest checkout (anonymous) needs dedicated variant.

**Primary finding:** likely NEEDS_PURPOSE_BUILT_UI (P0) for checkout (Stripe-style two-column) + NEEDS_ROLE_BRANCH for 10 roles.

## 6 existing PNGs

## Planned fixes
- **Checkout two-column**: left order summary (item / qty / price / subtotal / tax / total), right payment form (card input + trust badges)
- Single "Pay $X" button (with $X interpolated; never just "Pay")
- Guest-checkout variant (anonymous) with "Create account to earn referral credit" upsell at bottom, no pressure to convert
- **Escrow dashboard** per payee role: freelancer sees milestones held + release history; business-partner sees escrow-funded hires; event-organiser sees split payments
- **Admin refund queue** Grammar 3: per-refund card with Approve / Deny inline actions
