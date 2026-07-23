# Functional Spec — FLOW-16 Marketplace Payments (Checkout + Escrow)

**Grammar:** G5 Kiosk (checkout) + G3 Card list (escrow dashboards + admin refunds)
**Primary role tiers:** PUBLIC (guest checkout), TENANT_CONSUMER (buyer), multi-party for escrow
**Current state:** **Designed** — 4 services, 2 pages scaffolded. Not wired to payment infrastructure.
**Primary unblock:** Stripe-style checkout + role-specific escrow dashboards + admin refund queue.

---

## 1. Summary

The payments layer. Buyers check out (guest or authenticated). Escrow holds funds for B2B + freelancer + event-organiser use cases, releasing at milestones. Admins handle refunds + disputes. The richest role-coverage spec in the whole corpus — **10 distinct roles** touch this flow with different needs.

---

## 2. Roles & modes — 10 personas

| # | Role | Mode | Primary need |
|---|---|---|---|
| 1 | **Anonymous / guest checkout** | Public → ephemeral | Pay without creating an account. Referral credit prompt post-pay. |
| 2 | **Public marketplace visitor** (signed out but marketplace-browsing) | Public | Single-product permalink checkout. |
| 3 | **Tenant user (buyer)** | Authenticated | Primary checkout path. Saved cards. Order history. |
| 4 | **Tenant admin (payments config)** | Authenticated + elevated | Configure payout methods, refund policy. Handle refund queue. |
| 5 | **Referral user** (invited by someone else) | Authenticated, new | Sees referral credit applied at checkout. |
| 6 | **Freelancer (escrow payee)** | Authenticated | Dashboard of milestones held + release history. |
| 7 | **Business partner (B2B payer)** | Authenticated | Invoicing mode, PO numbers, net-30 terms. |
| 8 | **Event organiser (split payout)** | Authenticated | See split-payout arrangements per event. |
| 9 | **Platform admin (fees)** | Authenticated + platform | Platform fee config, revenue dashboard. |
| 10 | **Platform support** (read-only) | Authenticated + platform | Audit. |

**Modes:**
- Stripe-style two-column checkout (left order summary, right payment form).
- Guest vs authenticated — checkout UI same, but guest sees post-pay account prompt.
- Escrow dashboards per payee type — different fields matter for each (freelancer sees milestones; event organiser sees splits; B2B sees POs).

---

## 3. User stories

### Story 3.1 — Buyer checks out (single-product, signed in)

**Screens:** marketplace product → cart → checkout → success.

**Happy path:**
1. Click **Buy** on product card → cart shelf appears with item + summary.
2. Click **Checkout** → `/checkout` page loads.
3. **Left column** — order summary: item thumbnail + name + qty + price; subtotal; platform fee; tax; total.
4. **Right column** — payment form: name, address (if physical), card (Stripe Elements) with trust badges below.
5. Submit → processing state on button; on success → `/order/:id/confirmation` with a celebratory card + receipt + next-actions (*"Keep shopping"* / *"Track your order"*).

**UI elements:**
- Single "Pay $X" button with $X interpolated (never just "Pay").
- Trust badges (Stripe, Visa, Mastercard, PCI) subtle below form.
- Order summary always visible (doesn't collapse on desktop, sticky at top on mobile).

### Story 3.2 — Anonymous guest checkout

**Trigger:** unauthenticated visitor clicks **Buy** on a public marketplace listing.

**Happy path:**
1. Same checkout layout as Story 3.1.
2. Above the form: *"Checking out as a guest — no account needed."*
3. Email field required (for receipt).
4. Post-success: on the confirmation page, non-pressuring upsell *"Create an account to earn ${amount} referral credit on your next purchase."*

### Story 3.3 — Freelancer sees milestones held in escrow

**Screens:** `/workspace/earnings` → escrow dashboard.

**Happy path:**
1. Dashboard shows card list of escrow arrangements. Each card: client name, total amount, milestones (progress strip), release schedule, total paid, pending.
2. Per-milestone: state (Pending / Released / Disputed), release amount, release date.
3. Actions per milestone: **Request release** (if condition met) / **View contract**.

### Story 3.4 — Admin handles a refund request

**Screens:** `/admin/payments/refunds` → refund queue → refund detail → decision.

**Happy path:**
1. Refund queue: G3 card list of pending refund requests. Each: customer, amount, original order, reason (from customer), days-since-request.
2. Click card → detail view: full order history, customer's message, similar refund precedents.
3. Actions: **Approve refund** (full / partial amount) / **Offer store credit instead** / **Reject with reason**.
4. On approve: refund processed via Stripe; customer notified; card moves to "Completed".

### Story 3.5 — Event organiser sets up split payout

**Trigger:** event organiser publishes a paid event with multi-party payout (e.g., 60% to venue, 30% to organiser, 10% to platform).

**Happy path:**
1. Event payout wizard inside the event setup: add recipients + % split; live preview of how a $100 ticket divides.
2. On event publish: escrow holds ticket revenue until event completion; auto-releases per schedule.
3. Event organiser dashboard shows per-event escrow state.

### Story 3.6 — B2B buyer checks out with PO + net-30

**Trigger:** tenant-admin buyer with B2B role checks out on behalf of a client.

**Happy path:**
1. Checkout shows B2B mode: PO number field, billing address as company, payment method = Invoice (net-30) instead of card.
2. Submit → order created with Invoice-pending state; invoice emailed to billing contact.
3. After 30 days or on payment received, order transitions to Paid.

---

## 4. Screen structure

### 4.1 `/checkout` two-column Stripe-style

Left (order summary, sticky) + Right (payment form). Single "Pay $X" CTA at bottom of right column.

### 4.2 `/workspace/earnings` (freelancer escrow dashboard)

Card list of arrangements. Progress-strip-per-milestone within each card.

### 4.3 `/admin/payments/refunds` (refund queue)

G3 card list with filter bar. Side-panel detail. Approve / Offer credit / Reject actions.

### 4.4 Event payout wizard (embedded in event creation)

Split configuration with live preview of how money flows per sale.

### 4.5 Platform revenue dashboard (`/admin/engine/payments`)

Metric tiles (GMV, platform revenue, refund rate, chargeback rate) + trend charts + per-tenant breakdown.

---

## 5. Edge cases

| Case | Expected behaviour |
|---|---|
| Card declined | Inline error: *"Your card was declined — try a different card or Paypal?"* + alternative payment methods visible. |
| Payment processor timeout mid-submit | Idempotent retry; show *"Still processing — please don't close this page"* with progress dots. On failure, rollback + clear message. |
| Duplicate submission (user refreshes mid-pay) | Idempotency keys prevent double-charge. Second submit returns first result. |
| Partial refund larger than remaining amount | Blocked at form level with max-amount indicator. |
| Fraud detection flags purchase | Hold state *"Reviewing — we'll email you in 10 minutes"*; legitimate purchases auto-clear. |
| Tax calculation fails | Block checkout with specific error; never guess tax. |
| Split-payout recipient has no payout account | Event publish blocked with *"Recipient X needs to connect payout account first"*. |
| Escrow release condition disputed | Milestone state → *Disputed*; both parties get a mediation link. |
| Chargeback received | Order marked *Chargeback*; funds pulled; admin sees in refund-queue with dispute sub-state. |

---

## 6. Problematic states

| State | What the user sees |
|---|---|
| **Unauthenticated** on escrow dashboard | Redirect with return path. |
| **Permission denied** | `/404`. |
| **Session expired on checkout** | Modal *"Your session expired — sign in again"*; cart preserved. |
| **Network offline on submit** | Banner *"You're offline — we didn't charge your card"*. |
| **Payment processor down** | Banner: *"Payments temporarily unavailable — try again in a minute. Your cart is saved."* |
| **Refund fails (processor)** | Admin sees failed-refund state with retry; customer not yet notified. |
| **Dispute in progress** | Banner on order: *"This order is in dispute — we'll update you within 7 days."* |
| **Fraud hold** | User-facing: *"Reviewing your purchase — we'll email you shortly."* (never scary). |
| **Invoice (B2B) overdue** | Dunning reminder emails + banner on tenant dashboard. |
| **Danger-zone: cancel order with refund** | Triple confirm + amount breakdown. |

---

## 7. Visual direction

**Grammar:** G5 Kiosk (checkout) + G3 Card list (escrow + refund queue) + G6 Dashboard (platform revenue).

**Feel:** *Trustworthy · Professional · Calm*. Payments require absolute clarity and confidence.

**Reference UIs:** Stripe Checkout, Stripe Connect, Stripe Dashboard.

**Colour world:**
- Neutral chrome; brand accent only for primary CTA
- Green for successful payment + released funds
- Amber for pending / processing / escrow-held
- Red reserved for declined / chargeback / dispute — NEVER anywhere else in checkout (pro-max rule: "FAILED never dominant anchor")

**Signature element:** the **single "Pay $X" button** with $X interpolated. Removes ambiguity better than any trust badge. Combined with visible order summary, buyer knows exactly what they're paying.

**Anti-patterns:**
- Hidden fees surfacing only at final step (taxes, shipping must show before submit).
- Pre-checked "store my card" without asking.
- Engineering terms ("outbox entry", "DNA-9 idempotency", "14 named checks") anywhere near user copy.
- Dark-pattern "continue without refund" buttons in dispute flows.

---

## 8. Acceptance criteria

- [ ] `/checkout` two-column layout Stripe-style; sticky order summary; single "Pay $X" CTA.
- [ ] Guest + authenticated + B2B + referral + event-split modes all supported.
- [ ] Escrow dashboards per role (freelancer milestones, event splits, B2B invoices, admin refunds).
- [ ] Refund queue with G3 card list + detail view + approve/credit/reject actions.
- [ ] Platform revenue dashboard with metric tiles + trend charts.
- [ ] Idempotency keys prevent duplicate charges on retry.
- [ ] Fraud hold state is user-friendly (not accusatory).
- [ ] Split-payout recipients must have payout accounts.
- [ ] Dispute flow mediation link for both parties.
- [ ] All 10 problematic states documented treatment.
- [ ] Zero engineering terminology in checkout / escrow user copy.
- [ ] Trust badges visible but subtle.
- [ ] WCAG AA on all form fields; tab order logical; autofill works.
