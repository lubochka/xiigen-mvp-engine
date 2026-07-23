# UX Review — Marketplace Payments (`marketplace-payments`)

**PNGs reviewed:** 6 | **Blockers:** 1 | **High:** 2 | **Medium:** 1 | **Low:** 1
**Overall verdict:** 🚫 Not representative

## Summary

All 6 PNGs show the IDENTICAL "Checkout" page with a single "Cart ID" text field (placeholder `cart-xxxxxxxx`) and a "Place Order" button. No cart line items, no total, no payment method selector, no shipping address — this does not look like a real checkout to any end user. Filenames encode assertion rules (Outbox, DNA-9 Idempotency) and promise quite a bit of architecture evidence, yet the UI shows none of it.

## Per-PNG findings

| # | File | Severity | Axis | Finding (user-perspective) | Suggested fix |
|--:|------|:-------:|------|----------------------------|---------------|
| 1 | `01-every-task-type-in-t241-t268-has-at-leas.png` | 🔴 | State fidelity | Labeled as task-coverage evidence; shows a bare Cart-ID form | Rename and capture the real coverage UI |
| 2-5 | `02..05-*` | 🟡 | Redundant | Byte-identical to #01 | Replace with cart-with-items, payment-method-selection, order-confirmed, refund-initiated |
| 6 | `06-focus-areas-covered-ep-5-outbox-dna-9-id.png` | 🟡 | Redundant | Byte-identical; filename promises Outbox / idempotency evidence | Capture the Outbox monitor and an idempotency retry state |
| — | Checkout UI | 🔴 | Information appropriateness | "Checkout" with ONLY a Cart ID input — no items, no total, no address, no payment method — fails the user's core question "what am I paying for?" | Show line items, subtotal, taxes, shipping address selector, payment method selector |
| — | Checkout UI | 🟠 | Affordances | "Place Order" is a full-width blue button with no disabled state visible; form validation rules not shown | Disable until Cart ID is syntactically valid; inline error for unknown cart |
| — | Checkout UI | 🟠 | Copy | "cart-xxxxxxxx" placeholder suggests the user should type the cart ID — but a real user would never type a cart ID; the UI should carry the cart forward from the basket screen | Remove input; display read-only Cart ID from URL/route state |
| — | Chrome | 🔵 | Banner | Yellow provider-keys banner eats 48px vertical | Dismissable |

## Cross-PNG patterns (flow-level)

- **All 6 PNGs are byte-identical.** 5 redundant captures.
- Checkout UI is a placeholder scaffold, not a real checkout — should not ship in this form.
- None of the architecture features advertised in filenames (Outbox, idempotency, DNA-9) are visible to the user.

## Business-logic phase coverage

Marketplace-payments expected phases:
- ✅ Empty-cart placeholder (if that's what this is) — captured
- ❌ Cart with items → totals
- ❌ Payment-method selection
- ❌ Order placed → confirmation
- ❌ Refund / dispute
- ❌ Idempotency retry (duplicate submission blocked)
