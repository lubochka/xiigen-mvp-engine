# Functional Spec — FLOW-40 Client Push Notifications

**Grammar:** G3 Card list with state badge (delivery log) + G7 Settings tabs (user notification preferences)
**Primary role tiers:** TENANT_CONSUMER (end user, notification recipient), TENANT_OPS (campaign author), PLATFORM_OPS (delivery monitor)
**Current state:** **Half-built** — 3 services running delivery infrastructure. Purpose-built `ClientPushScreen` orphaned. Page wrapper renders `AdminCrudPanel`.
**Primary unblock:** FLOW-45 RUN-52 page rewrite + user notification preferences page.

---

## 1. Summary

The platform sends push notifications (browser push, mobile push, in-app) to users for events they care about — a friend request, a marketplace update, a completion reminder. Three audiences: end users manage what they receive at `/settings/notifications`; tenant admins craft targeted broadcasts; platform admins watch delivery health (success rate, provider errors, opt-out rate). Service infrastructure exists; none of the three user-facing surfaces do.

---

## 2. Roles & modes

| Role | Route | What they do |
|---|---|---|
| **TENANT_CONSUMER** | `/settings/notifications` | See categories, toggle per category, set quiet hours |
| **TENANT_OPS** | `/admin/notifications/broadcasts` | Compose and schedule broadcasts to their tenant |
| **PLATFORM_OPS** | `/admin/engine/client-push/` | Monitor delivery health, provider status, opt-out trends |

**Modes:**
- **First permission request:** custom prompt *before* the browser's permission prompt, explaining what pushes we'll send.
- **Permission denied:** soft state — show the in-app inbox fallback, don't nag.
- **Quiet hours:** user-configured; respect tenant default; override per-category if user wants.
- **Critical vs routine:** some pushes (security alerts, payment failures) bypass quiet hours by policy.

---

## 3. User stories

### Story 3.1 — User manages notification preferences *(TENANT_CONSUMER, G7)*

**Screens:** Profile menu → `/settings/notifications`.

**Happy path:**
1. Page loads with settings-tabs chrome.
2. **Channels** section: Browser push / Mobile push / Email / In-app inbox — toggle per channel. If a channel has permission denied at the OS level, show *"Blocked in browser/device settings"* + link to a help article.
3. **Categories** section: card list per category (Security alerts, Payment notices, Friends + messages, Event invitations, Marketplace activity, Product updates, Tips + tricks). Each category has: toggle, quiet-hours override, frequency cap.
4. **Quiet hours** global: default set (e.g., 22:00–07:00 local); can adjust.
5. **Critical overrides** card at bottom: lists which categories can break quiet hours (security, payment). Explained in plain language.
6. User changes any toggle → saved immediately with subtle toast *"Saved"* + undo.

**UI elements:**
- Toggle per channel + per category.
- Quiet-hours time picker.
- Frequency cap picker ("max 3 per day" / "max 1 per hour" / "no cap").

### Story 3.2 — First-time permission request *(TENANT_CONSUMER)*

**Trigger:** user lands on a page where push would add value (e.g., after first friend request sent).

**Happy path:**
1. Custom non-blocking toast: *"Want friend-request updates in real time? Turn on notifications — we'll only send what you said yes to."* with **Turn on** / **Not now**.
2. On **Turn on**: trigger browser's native permission prompt.
3. If granted: success toast + auto-enable the relevant category.
4. If denied: graceful — show *"No worries. You can turn them on anytime in Settings › Notifications."*
5. Don't re-ask for at least 14 days after denial.

### Story 3.3 — Tenant admin composes a broadcast *(TENANT_OPS)*

**Screens:** `/admin/notifications/broadcasts` → **New broadcast** → composer → schedule.

**Happy path:**
1. Broadcast composer: recipient audience picker, channel picker (push / email / in-app), message editor (title + body + action URL), preview panel, send-now or schedule.
2. Audience picker: all tenant users / specific segment / individual users. Live count: *"This will reach ~1,247 users."*
3. Preview panel shows the notification as it would appear on browser, mobile, and in-app.
4. Submit → broadcast queued; delivery log updates live.

### Story 3.4 — Platform admin watches delivery health *(PLATFORM_OPS)*

**Screens:** `/admin/engine/client-push/` dashboard.

**Happy path:**
1. Dashboard loads `ClientPushScreen` with metric tiles — Delivery rate, Open rate, Opt-out rate, Provider error rate — and trend charts.
2. Below: delivery log (G3 card list) — each card shows recent broadcast or transactional push with state badge (Sent / Delivered / Opened / Failed / Suppressed-quiet-hours).
3. Filter bar: by tenant, by channel, by outcome.
4. Per-card click → detail view with per-recipient delivery log.

---

## 4. Screen structure & UI elements

### 4.1 `/settings/notifications` (TENANT_CONSUMER)

Settings-tabs layout. Sections: Channels · Categories · Quiet hours · Critical overrides.

### 4.2 `/admin/notifications/broadcasts` (TENANT_OPS)

Broadcast composer with audience picker, channel picker, preview, scheduling.

### 4.3 `/admin/engine/client-push/` (PLATFORM_OPS)

Dashboard: metric tiles + trend chart + delivery log card list.

### 4.4 Notification card (in delivery log)

```
┌─────────────────────────────────────────────────────────┐
│ [channel-icon] "New friend request from Anna"           │
│ Sent 12:04 · Delivered · Opened 12:06 · Clicked 12:07   │
│ To: tenant-user-xyz · Category: Friends + messages      │
└─────────────────────────────────────────────────────────┘
```

---

## 5. Edge cases

| Case | Expected behaviour |
|---|---|
| User has permission denied at OS level | Show *"Blocked in browser settings"* with link to help article; don't attempt to re-request from JS. |
| User in quiet hours receives a critical push | Push delivers; post-delivery log notes *"Bypassed quiet hours — Security category"*. |
| Broadcast targeting audience of 0 | Composer blocks send with *"This audience is empty — refine the filter."* |
| Provider (FCM / APNs / WebPush) down | Failed pushes queued for retry with exponential backoff (max 3 retries over 2 hours). After that, mark as "Failed — provider unavailable" and surface in platform-admin dashboard. |
| User has email notifications enabled but no email on file | Inline warning in `/settings/notifications`: *"Add an email address to receive emails"*. |
| User changes quiet hours across timezone | Respect local timezone; recalculate quiet-hours mask on save. |

---

## 6. Problematic states

| State | What the user sees |
|---|---|
| **Unauthenticated** | Redirect. |
| **Permission denied at OS level** | Inline helper: *"Push is blocked in browser settings — here's how to turn it on"* + link. No nag. |
| **Network offline on toggle save** | Toggle visually flips; yellow dot marks "pending sync"; auto-retry on reconnect. |
| **Server error on broadcast send** | Composer banner *"Couldn't send — retry?"* with **Retry**. |
| **Provider failure mid-broadcast** | Delivery log shows partial: *"247 of 1,247 delivered — 1,000 queued for retry"*. |
| **Empty broadcast log** | *"No broadcasts yet — compose your first."* |
| **Empty category** (user unsubscribed from everything) | Reassuring copy: *"You won't receive notifications in any category. Change anytime above."* |
| **Conflict** (user toggled category off just as admin sent broadcast) | Admin broadcast respects the user's latest setting — if user opted out, push suppressed. Suppression logged. |

---

## 7. Visual direction

**Grammar:** G7 settings (user) + G3 card list (delivery log) + G6 dashboard (platform admin).

**Feel:** *Gentle · Respectful · Reliable*. Notifications are permission-based; the UI must earn trust.

**Colour world:**
- Blue for active channels
- Grey for inactive / denied
- Amber for "quiet hours override"
- Green for successful delivery
- Red only for failed delivery

**Signature:** the **critical-overrides** card at the bottom of the user settings — a clear, plain-language explanation of which pushes can break quiet hours and why, so the user knows what they're agreeing to.

**Anti-patterns:**
- Pre-enabled pushes that the user has to find and disable
- Browser permission prompt without a custom explainer first
- Provider-specific terminology ("FCM token", "APNs", "service-worker") in user-facing copy
- Using red as the dominant colour (notifications aren't errors)

---

## 8. Acceptance criteria

- [ ] `ClientPushPage.tsx` wraps `ClientPushScreen` via FLOW-45 RUN-52 template.
- [ ] `/settings/notifications` renders with channels + categories + quiet hours + critical overrides.
- [ ] Custom pre-prompt fires before browser permission request.
- [ ] Permission denial path is graceful + waits ≥14 days before re-asking.
- [ ] Broadcast composer: audience picker with live count, channel picker, preview panel, schedule.
- [ ] Platform-admin dashboard renders metric tiles + trend chart + delivery log.
- [ ] Delivery log card shows per-recipient detail on click.
- [ ] Provider failures surface with retry mechanism visible to admin.
- [ ] All 8 problematic states (§6) documented treatment.
- [ ] Zero provider-specific terminology in user-facing copy.
- [ ] Quiet hours + critical overrides honoured by the delivery layer.
