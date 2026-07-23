# Functional Spec — FLOW-15 SaaS Multi-tenancy (Workspace Settings)

**Grammar:** G7 Settings tabs
**Primary role tiers:** TENANT_OPS (tenant admin), TENANT_CONSUMER (view-only slices), PLATFORM_OPS (provisioning)
**Current state:** **Designed** — 4 services, 2 pages exist as stubs; tabs-plus-danger-zone layout not built.
**Primary unblock:** settings-tabs page + Members tab + Billing tab + Integrations tab + Advanced tab.

---

## 1. Summary

Every tenant has a workspace. A tenant admin configures it: name/slug/logo, team members + roles, billing + plan, connected integrations, advanced options, and a danger zone. Linear / Notion / Vercel / GitHub / Stripe set the reference — left-rail tabs, focused panels, clear hierarchy.

---

## 2. Roles & modes

| Role | Route | What they do |
|---|---|---|
| **TENANT_OPS** (admin) | `/workspace/settings` | Full edit: name, logo, team, billing, integrations, advanced, delete |
| **TENANT_CONSUMER** | `/workspace/settings` read-only | See workspace name/logo + members list |
| **PLATFORM_OPS** | `/admin/engine/tenants/:id` | Cross-tenant provisioning dashboard |

**Modes:**
- **Owner** vs **admin** vs **member** within the tenant — permissions scoped per tab.
- **Paid** vs **free** tier: billing tab differs.
- **Mobile**: tabs collapse to accordion.

---

## 3. User stories

### Story 3.1 — Owner updates workspace name and logo

**Screens:** `/workspace/settings` → General tab.

**Happy path:**
1. General tab shows: workspace name (inline-edit), slug (read-only + "request change"), description (inline-edit), logo (upload / replace / remove), default timezone.
2. User edits name; Save button enables; click Save; toast *"Updated"*.
3. Logo upload: drag-drop or file picker; preview shows how it looks in the sidebar. Accepted formats + size shown.

### Story 3.2 — Owner invites a team member

**Screens:** Members tab → **Invite** → email + role selector → confirm.

**Happy path:**
1. Members tab: table of current members with avatar, name, email, role (Owner / Admin / Member), joined date, actions (remove, change role).
2. **Invite** button → modal: email address + role + optional personal note.
3. Submit → invitation sent; appears in "Pending invites" sub-section with "Resend" / "Cancel" actions.
4. Invitee clicks email link → joins workspace → moves from Pending to Members.

### Story 3.3 — Admin manages billing

**Screens:** Billing tab → plan card → upgrade wizard → Stripe portal redirect.

**Happy path:**
1. Billing tab shows: current plan card with features + price + next renewal date + **Manage** CTA.
2. Below: invoice history, payment methods, billing address.
3. **Upgrade** → plan comparison; click Pro → Stripe-portal redirect (FLOW-12 integration) → back to XIIGen with confirmation.

### Story 3.4 — Admin connects an integration

**Screens:** Integrations tab → available integrations card list → OAuth → connected integration detail.

**Happy path:**
1. Integrations tab: two sub-sections — *Connected* and *Available*. Available shows 20+ integrations (Slack, Zapier, Stripe, Salesforce, GitHub, Google Workspace, …).
2. Click **Connect** on Slack → OAuth → on approval, Slack moves from Available to Connected with config panel.
3. Per-integration config panel: channel mapping, event filters, remove connection.

### Story 3.5 — Admin danger-zone actions

**Screens:** Advanced tab → Danger zone section at the bottom.

**Happy path:**
1. Bottom of Advanced tab (visually separated by rule + red-tinted border): Danger zone.
2. Actions: **Transfer ownership** / **Archive workspace** / **Delete workspace**.
3. Each requires triple confirm (modal + type-workspace-name + email verification).

---

## 4. Screen structure & UI elements

### 4.1 `/workspace/settings` left-rail tabs

General / Members / Billing / Integrations / Advanced. Each tab opens a scrollable right pane with section cards.

### 4.2 General tab

Sections: *Identity · Branding · Timezone · Locale*.

### 4.3 Members tab

Table of members + Pending invites + Invite CTA + Role management.

### 4.4 Billing tab

Current plan card + Invoices list + Payment methods + Billing address. **Manage** CTA bounces to Stripe portal.

### 4.5 Integrations tab

Connected card list + Available card list per integration.

### 4.6 Advanced tab

Config switches (SSO, custom domain, audit log export) + Danger zone at the bottom.

---

## 5. Edge cases

| Case | Expected behaviour |
|---|---|
| Slug change requested | Queue for platform review (impacts URLs, SEO); admin sees "Pending review". |
| Invite sent to already-member | Toast *"{email} is already a member."* |
| Owner tries to leave without transferring ownership | Blocked with *"Transfer ownership before leaving."* + **Transfer** inline. |
| Plan downgrade causes over-quota (e.g., too many members) | Blocked with *"Downgrade requires removing X members first."* |
| Integration provider revokes access externally | Connected card shows *"Connection lost — reconnect"*. |
| Danger-zone delete mid-way | Each confirm step must succeed; on abort, no partial state. |

---

## 6. Problematic states

| State | What the user sees |
|---|---|
| **Unauthenticated** | Redirect. |
| **Permission denied** (member on admin tab) | Read-only view with *"Only admins can edit this"*. |
| **Session expired** mid-edit | Toast + sign-in; draft preserved. |
| **Network offline on save** | Inline banner with queue-and-retry. |
| **Save fails (server)** | Inline error + retry. |
| **Invite delivery fails** | Toast *"Invitation email failed — resend?"* |
| **Stripe portal unreachable** | Banner: *"Couldn't open billing portal — try again in a minute."* |
| **Integration OAuth fails** | Modal *"Connection failed — {provider} rejected the request"* with help link. |
| **Dangerous delete** | Triple confirm + email verification. |
| **Stale data** (other admin edited) | Banner: *"Anna updated this 1 min ago — reload?"* |

---

## 7. Visual direction

**Grammar:** G7 Settings tabs.

**Feel:** *Quiet · Organised · Trustworthy*.

**Reference UIs:** Linear, Notion, Vercel, GitHub, Stripe — workmanlike settings with clear hierarchy.

**Colour world:** Neutral chrome, brand accent for primary buttons, amber for warnings, red ONLY in Danger zone (not anywhere else in settings).

**Signature:** the **Danger zone** block — visually separated with rule + red-tinted border + distinct spacing. Makes destructive actions unmistakable without scaring the user on the rest of the page.

**Anti-patterns:**
- Red buttons outside Danger zone (scary).
- Buried danger actions (must be at bottom with visual separation).
- Generic admin sidebar where tabs should be.

---

## 8. Acceptance criteria

- [ ] Left-rail tabs: General / Members / Billing / Integrations / Advanced.
- [ ] Collapse to accordion under 640px.
- [ ] General tab edits persist with toast + undo.
- [ ] Members tab with invite / resend / cancel / role change.
- [ ] Billing tab integrates with Stripe portal (FLOW-12).
- [ ] Integrations tab supports OAuth connect/disconnect.
- [ ] Danger zone requires triple confirm with type-name + email verification.
- [ ] All 10 problematic states documented.
- [ ] Engineering terminology never appears in user copy ("40 contracts", "52 CloudEvent schemas").
