# Functional Spec — FLOW-30 Tenant Lifecycle Manager

**Grammar:** G6 Dashboard + G3 Card list (tenants)
**Primary role tiers:** PLATFORM_OPS. Engine-internal.
**Current state:** **Designed** — 0 services.

## 1. Summary

A platform admin provisions, suspends, archives, and deletes tenants. Watches health, usage, billing status across the fleet. This is the platform operator's primary dashboard.

## 2. Roles & modes

| Role | Route | What |
|---|---|---|
| **PLATFORM_OPS** | `/admin/engine/tenants/` | Full lifecycle management |
| **PLATFORM_SUPPORT** | Same, read-only | Audit / answer support |

**Modes:** List / individual tenant detail / provisioning wizard / suspend-reason / archive-reason.

## 3. User stories

### Story 3.1 — Admin provisions a new tenant

**Screens:** `/admin/engine/tenants/new` → wizard → provisioned.

1. Wizard: (1) Identity (name, slug, owner email); (2) Plan + billing; (3) Initial bundles (FLOW-00 integration); (4) Review.
2. Submit → progress strip of provisioning; on complete: owner invite email sent + tenant live.

### Story 3.2 — Admin reviews tenant health

**Screens:** `/admin/engine/tenants/` dashboard.

1. Metric tiles: total tenants, active last 30d, at-risk, suspended, revenue.
2. Filter bar: plan, state, region, signup cohort.
3. Card list of tenants (G3): each with avatar, name, plan badge, MRR, active users 30d, last-activity, state badge.

### Story 3.3 — Admin suspends a tenant for policy violation

**Screens:** tenant detail → Actions → Suspend.

1. Confirm modal with reason field + duration (7 days / 30 days / until-review).
2. Owner notified via email with reason + appeal link.
3. Tenant users see a clear banner: *"This workspace is temporarily suspended. Contact support."*

### Story 3.4 — Admin archives / deletes

1. Archive: freeze tenant (read-only for 90 days) → then auto-delete or manual reactivate.
2. Delete: triple confirm + type-tenant-name + manual key.

## 4. Screen structure

- **Fleet dashboard** — G6 metric tiles + trend chart + tenant card list.
- **Tenant detail** — identity + billing + usage + members + audit log + actions bar.
- **Provisioning wizard** — 4-step + provisioning progress strip.

## 5. Edge cases

| Case | Behaviour |
|---|---|
| Tenant owner leaves company | Admin can transfer ownership; audit logged. |
| Billing delinquent | Auto-transition to "At risk" state; owner emailed. |
| Suspended tenant tries to log in | Banner with reason + support contact. |
| Mass-deprovisioning (many tenants at once) | Queue + confirm each; no single bulk delete without individual confirms. |

## 6. Problematic states

- **Empty fleet** → *"Provision your first tenant."*
- **Loading** — skeleton tiles + cards.
- **Tenant detail fails to load** → retry; don't crash dashboard.
- **Suspend fails** (downstream dependency) → retry + rollback.
- **Dangerous delete** → triple confirm.

## 7. Visual direction

**Grammar:** G6 Dashboard + G3 cards.

**Feel:** *Authoritative · Audited · Careful*. Operator holds the keys to tenants' businesses.

**Colour world:** neutral chrome; state badges (Active green / At-risk amber / Suspended red / Archived grey).

**Signature:** the **audit log** on each tenant detail — every admin action traced with who + when + why.

**Anti-patterns:**
- Bulk delete without individual confirms.
- Suspend without reason field.

## 8. Acceptance criteria

- [ ] Fleet dashboard with metric tiles + filterable card list.
- [ ] Provisioning wizard + progress strip.
- [ ] Suspend / archive / delete with reason + appeal path.
- [ ] Ownership transfer with audit.
- [ ] Audit log per tenant.
- [ ] All 5 problematic states covered.
