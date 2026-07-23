# FLOW-10 — P6: NOTIFICATION HUB
## CMS + Commerce + Multi-Tenant Platform Engine
## Family 37 | F320–F324 | Save Point: FLOW10:MERGE:P6
## Merge Target: ENGINE_ARCHITECTURE_MERGED.md
## Sequence: F315–F319 complete (P5). This file: F320–F324 (FINAL factory family).

---

# ═══════════════════════════════════════════════════
# FAMILY 37 — NOTIFICATION HUB
# F320–F324 | Event-driven, template-based notifications
# ═══════════════════════════════════════════════════

## Family Overview

**Purpose:** All outbound notifications to end users and admins.
Email, SMS, push notifications. Event-driven — notification services
consume domain events from QUEUE FABRIC, never called directly by domain services.
Template management supports versioning and AI-assisted personalization.
Email/SMS providers are fabric-resolved (never SendGrid/SES/Twilio directly).

**Notification trigger chain:**
```
  Domain event (order.created)
    → QUEUE FABRIC consumer
      → F321:INotificationDispatchService
        → resolves template (F320)
        → resolves channel (F322/F323)
        → delivers
        → tracks (F324)
```

**Key principle:** Domain services NEVER call notification services directly.
They emit events via F307 (outbox). Notification consumers subscribe to relevant
topics. This decoupling ensures domain write path latency is unaffected by
notification provider latency (ESP calls: 200ms–2s). See DR-36.

**Composition with FLOW-08 (not duplication):**
  - F245 ITenantConfigService — ESP/SMS provider bindings per tenant
  - F251 ITenantEntitlementService — AI template generation entitlement gate
  - F250 ITenantAuditService — notification preference changes audited
  - F260 IIdempotencyKeyService — deduplication on all sends

**Composition with FLOW-10:**
  - F307 IOutboxEventService (Family 34) — domain event source
  - F294 IOrderService (Family 32) — order event source
  - F298 IContentWorkflowService (Family 33) — content event source
  - F292 ICheckoutService (Family 32) — checkout event source

**Fabrics used:**
  - QUEUE FABRIC (Skill 04) → Redis Streams (event consumption + dispatch)
  - AI ENGINE FABRIC (Skill 06/07) → template personalization (optional) + ESP/SMS providers
  - DATABASE FABRIC (Skill 05) → Elasticsearch (template store) + PostgreSQL (delivery records)

---

## F320: INotificationTemplateService

**Description:**
  Versioned template management for all notification types.
  Templates are config documents (FREEDOM) — tenants can customize
  platform defaults. AI-assisted template generation and optimization
  is opt-in via F251 entitlement. Templates support variable substitution
  (e.g., {{order.number}}, {{customer.firstName}}).

  Template resolution chain: tenant-specific override → platform default → error.
  Locale fallback: requested locale → tenant default locale → "en" → error.

**FABRIC:** DATABASE FABRIC (Skill 05) → Elasticsearch provider
**RESOLUTION:** CreateAsync(FactoryResolutionContext{tenantId, environment})

**METHODS:**
```
CreateTemplateAsync(tenantId: string, payload: Dictionary<string,object>)
  → DataProcessResult<Dictionary<string,object>>
  payload: templateKey (e.g., "order.created.customer"),
           channel (email|sms|push), subject (email only),
           bodyHtml, bodyText, variables[], locale, status="draft"
  Returns: templateId, versionId, templateKey, status

ActivateTemplateAsync(tenantId: string, templateKey: string, versionId: string)
  → DataProcessResult<bool>
  Deactivates previous version. Immutable once activated.
  Only one active version per templateKey+locale at any time.

GetTemplateAsync(tenantId: string, templateKey: string, locale: string)
  → DataProcessResult<Dictionary<string,object>>
  Returns active template for key+locale.
  Fallback chain: tenant override → platform default → requested locale → default locale

RenderTemplateAsync(tenantId: string, templateKey: string,
                    variables: Dictionary<string,object>, locale: string)
  → DataProcessResult<Dictionary<string,object>>
  Resolves variable substitutions ({{varName}} → value from variables dict).
  AI personalization applied if F251.IsFeatureEnabledAsync("ai_notifications")
  Returns: renderedSubject, renderedBodyHtml, renderedBodyText

ListTemplatesAsync(tenantId: string, filter: Dictionary<string,object>)
  → DataProcessResult<List<Dictionary<string,object>>>
  filter: channel, locale, status — BuildSearchFilter

GenerateTemplateWithAiAsync(tenantId: string, context: Dictionary<string,object>)
  → DataProcessResult<Dictionary<string,object>>
  context: eventType, channel, tone, brandVoice{}
  AI generates template draft via AI ENGINE FABRIC.
  Requires human review before activation (status="ai_draft").
  Gated by F251 entitlement ("ai_notifications").
```

**DNA COMPLIANCE:**
| Pattern | Enforcement | Status |
|---------|-------------|--------|
| DNA-1 ParseDocument | Templates = Dictionary<string,object> | ✅ |
| DNA-2 BuildSearchFilter | ListTemplatesAsync: filter fields optional | ✅ |
| DNA-3 DataProcessResult<T> | All methods return wrapped result | ✅ |
| DNA-4 MicroserviceBase | NotificationTemplateServiceImpl extends MicroserviceBase | ✅ |
| DNA-5 Scope Isolation | tenantId on all template queries + resolution | ✅ |
| DNA-6 DynamicController | DynamicController handles template endpoints | ✅ |
| DNA-7 BuildQueryFilters | ObjectProcessor on template list filter | ✅ |
| DNA-8 (as applicable) | AI generation gated by entitlement; human review required | ✅ |
| DNA-9 Saga Compensation | Template versioning is append-only — no rollback needed | ✅ |

---

## F321: INotificationDispatchService

**Description:**
  Routing engine for all notifications. Receives domain events from QUEUE FABRIC,
  resolves the correct template (F320), resolves the correct channel
  (email/SMS/push based on user preference + F245 config), and dispatches
  to the appropriate delivery service (F322, F323).
  Handles notification preferences (opt-out, channel preference, quiet hours).

  Dispatch decision tree:
  1. Check recipient preferences → opt-out? → suppress (log + return)
  2. Check quiet hours → defer? → schedule via F306 timer
  3. Resolve template (F320) + render with event payload
  4. Route to channel delivery service (F322 email / F323 SMS)
  5. Record dispatch in F324 tracking

**FABRIC:** QUEUE FABRIC (Skill 04) → Redis Streams (event consumption)
  DATABASE FABRIC (Skill 05) → Redis (preference cache) + PostgreSQL (preferences)
**RESOLUTION:** CreateAsync(FactoryResolutionContext{tenantId, environment})
**COMPOSES:** F320 (INotificationTemplateService) for template resolution, F322 (IEmailDeliveryService) for email channel, F323 (ISmsDeliveryService) for SMS channel, F324 (IDeliveryTrackingService) for analytics, F306 (IWorkflowTimerService) for quiet-hour deferral, F260 (IIdempotencyKeyService) for dispatch deduplication

**METHODS:**
```
DispatchNotificationAsync(tenantId: string, event: Dictionary<string,object>)
  → DataProcessResult<Dictionary<string,object>>
  event: eventType, recipientId, recipientType (customer|admin), payload{}
  Resolves: template from F320, channels from preferences, delivery from F322/F323
  Returns: dispatched[], suppressed[] (opt-out/quiet-hours), notificationId

GetNotificationPreferencesAsync(tenantId: string, recipientId: string)
  → DataProcessResult<Dictionary<string,object>>
  Returns: channels{email:{enabled,address}, sms:{enabled,phone}, push:{enabled}},
           quietHours{}, unsubscribedTopics[]

UpdatePreferencesAsync(tenantId: string, recipientId: string,
                        patch: Dictionary<string,object>)
  → DataProcessResult<bool>
  Partial update. Emits preference.updated event. Audited via F250.

UnsubscribeAsync(tenantId: string, recipientId: string, topic: string)
  → DataProcessResult<bool>
  SYNCHRONOUS (not queued) — GDPR requires immediate opt-out enforcement.
  Invalidates preference cache immediately. Logs unsubscribe event.

GetDispatchHistoryAsync(tenantId: string, filter: Dictionary<string,object>)
  → DataProcessResult<Dictionary<string,object>>
  filter: recipientId, eventType, channel, dateFrom, dateTo — BuildSearchFilter
```

**DNA COMPLIANCE:**
| Pattern | Enforcement | Status |
|---------|-------------|--------|
| DNA-1 ParseDocument | Dispatch events = Dictionary<string,object> | ✅ |
| DNA-2 BuildSearchFilter | GetDispatchHistoryAsync: filter fields optional | ✅ |
| DNA-3 DataProcessResult<T> | All methods return wrapped result | ✅ |
| DNA-4 MicroserviceBase | NotificationDispatchServiceImpl extends MicroserviceBase | ✅ |
| DNA-5 Scope Isolation | tenantId on all preference + history records | ✅ |
| DNA-6 DynamicController | DynamicController handles notification endpoints | ✅ |
| DNA-7 BuildQueryFilters | ObjectProcessor on dispatch history filter | ✅ |
| DNA-8 (as applicable) | Opt-out/unsubscribe honored before dispatch (GDPR) | ✅ |
| DNA-9 Saga Compensation | Dispatch is fire-and-forget — no compensation needed | ✅ |

---

## F322: IEmailDeliveryService

**Description:**
  Transactional email delivery via fabric-resolved ESP (Email Service Provider).
  ESP (SendGrid, AWS SES, Postmark, SMTP) resolved via F245.GetProviderBindingAsync("email").
  Never imports ESP SDK directly. Supports single send, batch, and delivery tracking.

**FABRIC:** AI ENGINE FABRIC (Skill 06/07) → ESP provider via F245 binding
  DATABASE FABRIC (Skill 05) → PostgreSQL (delivery records)
**RESOLUTION:** CreateAsync(FactoryResolutionContext{tenantId, environment})
**COMPOSES:** F245 (ITenantConfigService) for ESP provider binding, F260 (IIdempotencyKeyService) for send deduplication, F324 (IDeliveryTrackingService) for status updates

**METHODS:**
```
SendEmailAsync(tenantId: string, payload: Dictionary<string,object>,
               idempotencyKey: string)
  → DataProcessResult<Dictionary<string,object>>
  payload: to, from (from F245 config), subject, htmlBody, textBody,
           headers{}, attachments[] (refs, not binary)
  IDEMPOTENT via F260 — same idempotencyKey never sends twice
  Returns: messageId, status, provider, sentAt

SendBatchAsync(tenantId: string, messages: List<Dictionary<string,object>>)
  → DataProcessResult<Dictionary<string,object>>
  Each message has its own idempotencyKey.
  Returns: sent (int), failed (int), messageIds[]

GetDeliveryStatusAsync(tenantId: string, messageId: string)
  → DataProcessResult<Dictionary<string,object>>
  Returns: status (sent|delivered|bounced|spam), events[], openedAt, clickedAt

HandleWebhookAsync(tenantId: string, providerEvent: Dictionary<string,object>)
  → DataProcessResult<bool>
  Receives ESP webhook (bounce, delivery, open, click events).
  Updates F324:IDeliveryTrackingService.
  Webhook validation: verifies ESP signature before processing.
```

**IRON RULE: NO ESP SDK IMPORT**
  AF-7 (Compliance) rejects any generated code containing `sendgrid`, `aws-ses`,
  `postmark`, `ses-client`, or `nodemailer` as direct imports. All ESP communication
  flows through AI ENGINE FABRIC with F245 provider binding. Violation = BUILD FAILURE.

**DNA COMPLIANCE:**
| Pattern | Enforcement | Status |
|---------|-------------|--------|
| DNA-1 ParseDocument | Email records = Dictionary<string,object> | ✅ |
| DNA-2 BuildSearchFilter | N/A — keyed by messageId | ✅ |
| DNA-3 DataProcessResult<T> | All methods return wrapped result | ✅ |
| DNA-4 MicroserviceBase | EmailDeliveryServiceImpl extends MicroserviceBase | ✅ |
| DNA-5 Scope Isolation | tenantId on all delivery records | ✅ |
| DNA-6 DynamicController | DynamicController handles email management endpoints | ✅ |
| DNA-7 BuildQueryFilters | ESP provider resolved via AI ENGINE FABRIC | ✅ |
| DNA-8 (as applicable) | SendEmailAsync idempotent via F260 | ✅ |
| DNA-9 Saga Compensation | Email send is fire-and-forget — bounce handled async | ✅ |

---

## F323: ISmsDeliveryService

**Description:**
  SMS delivery via fabric-resolved SMS provider (Twilio, AWS SNS, Vonage).
  Provider resolved via F245.GetProviderBindingAsync("sms").
  Handles: order confirmations, password reset OTPs, shipping notifications,
  two-factor authentication codes. Respects opt-out lists (TCPA compliance).

**FABRIC:** AI ENGINE FABRIC (Skill 06/07) → SMS provider via F245 binding
  DATABASE FABRIC (Skill 05) → PostgreSQL (SMS delivery records)
**RESOLUTION:** CreateAsync(FactoryResolutionContext{tenantId, environment})
**COMPOSES:** F245 (ITenantConfigService) for SMS provider binding, F260 (IIdempotencyKeyService) for send deduplication, F324 (IDeliveryTrackingService) for status updates

**METHODS:**
```
SendSmsAsync(tenantId: string, payload: Dictionary<string,object>,
             idempotencyKey: string)
  → DataProcessResult<Dictionary<string,object>>
  payload: to (E.164 format), body (max 160 chars or auto-split), from (virtual number from F245)
  IDEMPOTENT via F260. OTP sends have short idempotency TTL (5 min).
  Returns: messageId, status, provider, segments (int), sentAt

GetDeliveryStatusAsync(tenantId: string, messageId: string)
  → DataProcessResult<Dictionary<string,object>>
  Returns: status (sent|delivered|failed|opted_out), deliveredAt, failureReason

HandleCarrierWebhookAsync(tenantId: string, providerEvent: Dictionary<string,object>)
  → DataProcessResult<bool>
  Updates delivery status from carrier receipt notifications.
  Webhook validation: verifies carrier signature.

IsOptedOutAsync(tenantId: string, phoneNumber: string)
  → DataProcessResult<bool>
  Checks opt-out list before any send. TCPA compliance.
  Called internally by SendSmsAsync — NOT optional.
```

**IRON RULE: NO SMS SDK IMPORT**
  AF-7 rejects generated code containing `twilio`, `aws-sns`, `vonage`, `nexmo`
  as direct imports. All SMS communication via AI ENGINE FABRIC + F245 binding.

**DNA COMPLIANCE:**
| Pattern | Enforcement | Status |
|---------|-------------|--------|
| DNA-1 ParseDocument | SMS records = Dictionary<string,object> | ✅ |
| DNA-2 BuildSearchFilter | N/A — keyed by messageId | ✅ |
| DNA-3 DataProcessResult<T> | All methods return wrapped result | ✅ |
| DNA-4 MicroserviceBase | SmsDeliveryServiceImpl extends MicroserviceBase | ✅ |
| DNA-5 Scope Isolation | tenantId on all SMS records + opt-out lists | ✅ |
| DNA-6 DynamicController | DynamicController handles SMS management endpoints | ✅ |
| DNA-7 BuildQueryFilters | SMS provider resolved via AI ENGINE FABRIC | ✅ |
| DNA-8 (as applicable) | Opt-out checked BEFORE every send (TCPA) | ✅ |
| DNA-9 Saga Compensation | SMS is fire-and-forget — failure handled by carrier webhook | ✅ |

---

## F324: IDeliveryTrackingService

**Description:**
  Unified delivery analytics and compliance tracking across all channels
  (email, SMS, push, webhook). Stores delivery events, computes deliverability
  metrics, and provides data for GDPR data subject requests.
  All notification delivery status updates funnel through here.

  GDPR requirements:
  - GetRecipientHistoryAsync: data subject access request (DSAR)
  - DeleteRecipientDataAsync: right to erasure (PII removed, delivery records anonymized)
  - Legal hold: some records retained per compliance requirements (anonymized)

**FABRIC:** DATABASE FABRIC (Skill 05) → Elasticsearch (delivery analytics, aggregations)
  DATABASE FABRIC (Skill 05) → PostgreSQL (compliance + GDPR records)
**RESOLUTION:** CreateAsync(FactoryResolutionContext{tenantId, environment})

**METHODS:**
```
RecordDeliveryEventAsync(tenantId: string, event: Dictionary<string,object>)
  → DataProcessResult<bool>
  event: messageId, channel, eventType (sent|delivered|bounced|opened|clicked|spam|opted_out),
         recipientId, timestamp, metadata{}
  Append-only log. All channels feed into this single tracking service.

GetDeliveryMetricsAsync(tenantId: string, filter: Dictionary<string,object>)
  → DataProcessResult<Dictionary<string,object>>
  filter: channel, eventType, dateFrom, dateTo, templateKey — BuildSearchFilter
  Returns: sent, delivered, bounced, opened, clicked, spamRate, deliverabilityRate

GetRecipientHistoryAsync(tenantId: string, recipientId: string)
  → DataProcessResult<List<Dictionary<string,object>>>
  GDPR data subject access request: returns all notifications sent to a recipient.
  Includes all channels, all event types.

DeleteRecipientDataAsync(tenantId: string, recipientId: string)
  → DataProcessResult<Dictionary<string,object>>
  GDPR right-to-erasure: removes PII from delivery records.
  Anonymizes recipientId, email address, phone number in records.
  Returns: deleted (int), anonymized (int), retained (int, legal hold)

GetBounceListAsync(tenantId: string, filter: Dictionary<string,object>)
  → DataProcessResult<List<Dictionary<string,object>>>
  filter: dateFrom, dateTo — BuildSearchFilter
  Returns hard-bounced email addresses for suppression list management.
  Bounce suppression applied automatically by F322 before send.
```

**DNA COMPLIANCE:**
| Pattern | Enforcement | Status |
|---------|-------------|--------|
| DNA-1 ParseDocument | Delivery events = Dictionary<string,object> | ✅ |
| DNA-2 BuildSearchFilter | GetDeliveryMetricsAsync: all filter fields optional | ✅ |
| DNA-3 DataProcessResult<T> | All methods return wrapped result | ✅ |
| DNA-4 MicroserviceBase | DeliveryTrackingServiceImpl extends MicroserviceBase | ✅ |
| DNA-5 Scope Isolation | tenantId on ALL delivery records — GDPR scoping | ✅ |
| DNA-6 DynamicController | DynamicController handles delivery analytics endpoints | ✅ |
| DNA-7 BuildQueryFilters | ObjectProcessor on all metric filters | ✅ |
| DNA-8 (as applicable) | GDPR erasure path implemented — PII deletable on demand | ✅ |
| DNA-9 Saga Compensation | N/A — append-only log + anonymization (no undo) | ✅ |

---

# ═══════════════════════════════════════════════════
# DESIGN RECORD — DR-36
# ═══════════════════════════════════════════════════

## DR-36: Notification Fan-Out via Queue, Not Direct Call

**CONTEXT:** Domain services (checkout, order, content publish) need to trigger
notifications (email confirmations, SMS alerts). Two approaches: direct call
vs. event-driven queue consumption.

**Decision:** Domain services NEVER call F321:INotificationDispatchService
directly. They emit events to QUEUE FABRIC via F307 (outbox). Notification
consumers subscribe and call the dispatch service asynchronously.

**Why queue, not direct call:**
  - Domain write path latency must not be affected by ESP latency (200ms–2s)
  - Direct call would cascade ESP timeouts into checkout/publish/order latency
  - ESP outages would block core business operations
  - Template rendering errors would fail business writes

**Consequence:** Notifications are eventually consistent (not synchronous).
Order confirmation email may arrive 1–3 seconds after checkout confirm response.
This is acceptable and expected behavior.

**Acceptable latency:** 1–5 seconds normal, up to 30 seconds under load.
SLA for notification delivery is separate from domain operation SLA.

**GDPR exception:** Unsubscribe requests (F321.UnsubscribeAsync) are SYNCHRONOUS
because GDPR requires that a recorded opt-out is immediately honored.
The async dispatch path checks preferences before every send.

---

# ═══════════════════════════════════════════════════
# DESIGN DECISIONS — DD-48, DD-49
# ═══════════════════════════════════════════════════

## DD-48: Notification Delivery is Eventually Consistent (By Design)

**Decision:** Notifications are decoupled from the domain write path via QUEUE
FABRIC. This means order confirmation email is NOT guaranteed to arrive before
the HTTP response to the checkout confirm call.

**What this enables:** Checkout confirm is fast (200ms target). ESP timeouts,
ESP outages, template rendering errors, recipient validation failures — none
of these block the core commerce operation.

**Tradeoff accepted:** Occasional 1–5s delay in notification delivery.
User sees "Order confirmed" immediately, email arrives moments later.

## DD-49: GDPR Compliance — Synchronous Unsubscribe, Async Everything Else

**Decision:** All notification dispatches are async (through queue), EXCEPT
unsubscribe operations which are synchronous.

**Rationale:** GDPR Article 7(3) requires that withdrawal of consent be as
easy as giving it, and must be honored immediately. If unsubscribe were async,
a notification already in the queue might be delivered after opt-out — violating
the regulation.

**Implementation:**
  - F321.UnsubscribeAsync: synchronous → writes to PostgreSQL → invalidates Redis cache
  - F321.DispatchNotificationAsync: checks preference cache BEFORE every dispatch
  - Even if cache is stale (race window), PostgreSQL check catches it
  - Audit trail: unsubscribe event logged via F250 with timestamp

---

# ═══════════════════════════════════════════════════
# FAMILY 37 SUMMARY
# ═══════════════════════════════════════════════════

| Interface | F# | Fabric | Primary Purpose | Composes |
|-----------|-----|--------|----------------|----------|
| INotificationTemplateService | F320 | DATABASE (ES) | Template management + AI generation | F251 |
| INotificationDispatchService | F321 | QUEUE + DATABASE | Routing + preferences + quiet hours | F320, F322, F323, F324, F306, F260 |
| IEmailDeliveryService | F322 | AI ENGINE (ESP binding) | Transactional email | F245, F260, F324 |
| ISmsDeliveryService | F323 | AI ENGINE (SMS binding) | SMS delivery (TCPA compliant) | F245, F260, F324 |
| IDeliveryTrackingService | F324 | DATABASE (ES + PG) | Analytics + GDPR DSAR/erasure | — |

**Total Methods:** 5 interfaces × ~5 methods avg = **~25 methods**
**DNA Compliance Total:** 5 interfaces × 9 patterns = **45/45 ✅**
**Design Records:** DR-36
**Design Decisions:** DD-48, DD-49
**Composition Dependencies:** F245, F250, F251, F260 (FLOW-08), F294, F298, F306, F307 (FLOW-10)

---

# ═══════════════════════════════════════════════════
# ALL FLOW-10 FACTORY FAMILIES COMPLETE (P1–P6)
# ═══════════════════════════════════════════════════

| Phase | Family | F# Range | Interfaces | DNA Checks | Status |
|-------|--------|----------|-----------|------------|--------|
| P1 | 32 — Commerce Engine | F288–F296 | 9 | 81/81 ✅ | ✅ |
| P2 | 33 — CMS Engine | F297–F303 | 7 | 63/63 ✅ | ✅ |
| P3 | 34 — Workflow Lifecycle | F304–F308 | 5 | 45/45 ✅ | ✅ |
| P4 | 35 — Extensibility Platform | F309–F314 | 6 | 54/54 ✅ | ✅ |
| P5 | 36 — Search & Discovery | F315–F319 | 5 | 45/45 ✅ | ✅ |
| P6 | 37 — Notification Hub | F320–F324 | 5 | 45/45 ✅ | ✅ |
| **TOTAL** | **6 families** | **F288–F324** | **37** | **333/333 ✅** | **✅** |

**Design Records (P1–P6):** DR-29 through DR-36 (8 records)
**Design Decisions (P1–P6):** DD-38 through DD-49 (12 decisions)
**Methods (P1–P6):** ~192 estimated

---

## Factory Numbering Sequence (Complete):
```
  F1-F224   [through Family 24]
  F225-F233 [FLOW-06 Marketplace, Family 25]
  F234-F243 [FLOW-07 Friend Request & Feed, Family 26]
  F244-F271 [FLOW-08 Multi-Tenant Families 27-29]
  F272-F287 [FLOW-09 Event Participation Families 30-31]
  F288-F296 [FLOW-10 Commerce Engine, Family 32]
  F297-F303 [FLOW-10 CMS Engine, Family 33]
  F304-F308 [FLOW-10 Workflow Lifecycle, Family 34]
  F309-F314 [FLOW-10 Extensibility Platform, Family 35]
  F315-F319 [FLOW-10 Search & Discovery, Family 36]
  F320-F324 [FLOW-10 Notification Hub, Family 37]            ← FINAL
```

---

## MERGE INSTRUCTIONS

When merging into ENGINE_ARCHITECTURE_MERGED.md:

1. Append Family 37 after Family 36 (Search & Discovery)
2. Update the merge audit table with:
   ```
   | 2026-02-26 | FLOW-10 P6 merge | F320-F324 (+5) | — | — | Family 37, DR-36, DD-48-DD-49, 45/45 DNA |
   ```
3. Update system state:
   ```
   FACTORIES:  F1-F324 (324 total)
   FAMILIES:   1-37 (37 total)
   ```

---

## PHASE 6 COMPLETE: Family 37 (F320-F324), 5 factories, ~25 methods, DR-36, DD-48+DD-49, 45/45 DNA ✅
## ALL FACTORY FAMILIES (P1-P6) COMPLETE ✅

---
## SAVE POINT: FLOW10:MERGE:P6 ✅
## Next: Phase 7a — Task Types T103-T113 (first batch of engine contracts)
## Recovery: "Continue FLOW-10 from P7a" → Start P7a
