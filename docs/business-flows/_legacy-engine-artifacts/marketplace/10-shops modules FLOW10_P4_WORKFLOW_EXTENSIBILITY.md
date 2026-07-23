# FLOW-10 — P4: WORKFLOW LIFECYCLE + EXTENSIBILITY
## CMS + Commerce + Multi-Tenant Platform Engine
## Families 30–31 | F267–F277 | Save Point: FLOW10:MERGE:P4
## Merge Target: ENGINE_ARCHITECTURE_MERGED.md
## Sequence: F258–F266 complete (P3). This file: F267–F277.

---

# ═══════════════════════════════════════════════════
# FAMILY 30 — WORKFLOW LIFECYCLE ENGINE
# F267–F271 | Durable execution + reliability infrastructure
# ═══════════════════════════════════════════════════

## Family 30 Overview

**Purpose:** Provides the reliability substrate for all FLOW-10 workflows.
All long-running, multi-step, and side-effecting operations in content
and commerce use these interfaces to guarantee:
  - At-least-once execution with exactly-once side effects (outbox)
  - Safe retries without double-charge, double-publish, or double-send
  - Durable flow execution that survives service restarts
  - Idempotency for all state-changing operations

**These interfaces are INFRASTRUCTURE — not domain services.**
They are composed inside every generated FLOW-10 service that needs reliability.

**Fabrics used:**
  - DATABASE FABRIC (Skill 05) → PostgreSQL (execution state, idempotency store)
  - DATABASE FABRIC (Skill 05) → Redis (real-time coordination)
  - QUEUE FABRIC (Skill 04) → Redis Streams (outbox event delivery)
  - FLOW ENGINE FABRIC (Skill 08/09) → EP-1, EP-2 (state machine + timers)

---

## F267: IWorkflowDefinitionService

**Description:**
  Stores, versions, and activates flow definition DAGs in Elasticsearch.
  Flow definitions are JSON documents — adding a new flow variant is a
  config operation, not a code deployment. Versioned and immutable once
  activated; new versions must be created for changes.

**FABRIC:** DATABASE FABRIC (Skill 05) → Elasticsearch provider
**RESOLUTION:** CreateAsync(FactoryResolutionContext{tenantId, environment})

**METHODS:**
```
CreateVersionAsync(tenantId: string, flowName: string,
                   definition: Dictionary<string,object>)
  → DataProcessResult<Dictionary<string,object>>
  definition: nodes[], transitions[], guards{}, metadata{}
  Returns: versionId, flowName, status="draft", checksum, createdAt
  Validates DAG structure: no cycles, all node types exist in T-catalog

ActivateVersionAsync(tenantId: string, versionId: string)
  → DataProcessResult<bool>
  Atomically deactivates previous active version, activates new one
  Previous version enters "archived" status (immutable, replayable)

GetActiveDefinitionAsync(tenantId: string, flowName: string)
  → DataProcessResult<Dictionary<string,object>>
  Returns the currently active version's full DAG

GetDefinitionByVersionAsync(tenantId: string, versionId: string)
  → DataProcessResult<Dictionary<string,object>>

ListVersionsAsync(tenantId: string, flowName: string)
  → DataProcessResult<List<Dictionary<string,object>>>
  Returns version history: versionId, semver, status, activatedAt, createdBy

ValidateDefinitionAsync(tenantId: string, definition: Dictionary<string,object>)
  → DataProcessResult<Dictionary<string,object>>
  Pre-activation validation: DAG validity, factory refs exist, BFA conflict check
  Returns: valid (bool), errors[], warnings[]
```

**DNA COMPLIANCE:**
| Pattern | Enforcement | Status |
|---------|-------------|--------|
| DNA-1 ParseDocument | Flow definitions = Dictionary<string,object> | ✅ |
| DNA-2 BuildSearchFilter | ListVersionsAsync filter fields optional | ✅ |
| DNA-3 DataProcessResult<T> | Invalid DAG → Failure, never exception | ✅ |
| DNA-4 MicroserviceBase | WorkflowDefinitionServiceImpl extends MicroserviceBase | ✅ |
| DNA-5 Scope Isolation | tenantId on all definition queries | ✅ |
| DNA-6 DynamicController | DynamicController handles flow definition endpoints | ✅ |
| DNA-7 BuildQueryFilters | ObjectProcessor on version list filter | ✅ |
| DNA-8 (as applicable) | Immutable after activation — append-only semantics | ✅ |

---

## F268: IWorkflowExecutionService

**Description:**
  Durable execution runtime. Starts, resumes, suspends, and queries
  long-running workflow instances. Each execution has persistent state
  stored in PostgreSQL. Steps communicate via QUEUE FABRIC events.
  Execution survives service restarts — state is reconstructed from
  persisted checkpoints on recovery.

**FABRIC:** DATABASE FABRIC (Skill 05) → PostgreSQL (execution state)
  QUEUE FABRIC (Skill 04) → Redis Streams (step trigger events)
**RESOLUTION:** CreateAsync(FactoryResolutionContext{tenantId, environment})

**METHODS:**
```
StartExecutionAsync(tenantId: string, flowName: string,
                    input: Dictionary<string,object>, correlationId: string)
  → DataProcessResult<Dictionary<string,object>>
  correlationId: business key (orderId, contentId) for deduplication
  Idempotent: same correlationId → returns existing execution
  Returns: executionId, flowName, status="running", startedAt, currentStep

GetExecutionStatusAsync(tenantId: string, executionId: string)
  → DataProcessResult<Dictionary<string,object>>
  Returns: executionId, currentStep, completedSteps[], status, startedAt,
           updatedAt, output (if completed), errorMessage (if failed)

ResumeExecutionAsync(tenantId: string, executionId: string,
                     resumePayload: Dictionary<string,object>)
  → DataProcessResult<bool>
  Resumes a SUSPENDED execution (e.g., waiting for external approval)
  Emits step.resume event via QUEUE FABRIC

CancelExecutionAsync(tenantId: string, executionId: string, reason: string)
  → DataProcessResult<bool>
  Cancels running execution. Triggers compensation if defined in flow.

SearchExecutionsAsync(tenantId: string, filter: Dictionary<string,object>)
  → DataProcessResult<Dictionary<string,object>>
  filter: flowName, status, correlationId, dateFrom, dateTo — BuildSearchFilter
  Returns: executions[], total for operational dashboards
```

**DNA COMPLIANCE:**
| Pattern | Enforcement | Status |
|---------|-------------|--------|
| DNA-1 ParseDocument | Execution state = Dictionary<string,object> | ✅ |
| DNA-2 BuildSearchFilter | SearchExecutionsAsync: all filter fields optional | ✅ |
| DNA-3 DataProcessResult<T> | All methods return wrapped result | ✅ |
| DNA-4 MicroserviceBase | WorkflowExecutionServiceImpl extends MicroserviceBase | ✅ |
| DNA-5 Scope Isolation | tenantId on ALL execution state records | ✅ |
| DNA-6 DynamicController | DynamicController handles execution endpoints | ✅ |
| DNA-7 BuildQueryFilters | ObjectProcessor on execution search | ✅ |
| DNA-8 (as applicable) | correlationId deduplication prevents double-start | ✅ |

---

## F269: IWorkflowTimerService

**Description:**
  Wraps EP-2 (Durable Timer Service) with workflow-specific semantics.
  Used for: scheduled content publish (F257), checkout session expiry (F262),
  inventory reservation expiry (F260), abandoned cart recovery, subscription renewals.
  All timers persist across restarts. Missed timers are replayed on recovery.

**FABRIC:** FLOW ENGINE FABRIC (Skill 08/09) → EP-2 Durable Timer Service
  QUEUE FABRIC (Skill 04) → Redis Streams (timer fire event)
**RESOLUTION:** CreateAsync(FactoryResolutionContext{tenantId, environment})

**METHODS:**
```
ScheduleTimerAsync(tenantId: string, payload: Dictionary<string,object>)
  → DataProcessResult<Dictionary<string,object>>
  payload: timerKey (idempotent), fireAt (DateTime), eventType,
           targetServiceId, targetPayload{}
  Idempotent: same timerKey → updates fireAt if not yet fired
  Returns: timerId, fireAt, status="scheduled"

CancelTimerAsync(tenantId: string, timerKey: string)
  → DataProcessResult<bool>
  Cancels scheduled timer before it fires. Idempotent.

GetTimerStatusAsync(tenantId: string, timerKey: string)
  → DataProcessResult<Dictionary<string,object>>
  Returns: timerKey, status (scheduled|fired|cancelled|missed), fireAt, firedAt

ListScheduledTimersAsync(tenantId: string, filter: Dictionary<string,object>)
  → DataProcessResult<List<Dictionary<string,object>>>
  filter: eventType, fireAtFrom, fireAtTo — optional via BuildSearchFilter

RecoverMissedTimersAsync(tenantId: string, eventType: string)
  → DataProcessResult<Dictionary<string,object>>
  Finds timers that should have fired during downtime. Fires them now.
  Returns: recovered, skipped (already processed), failed
```

**DNA COMPLIANCE:**
| Pattern | Enforcement | Status |
|---------|-------------|--------|
| DNA-1 ParseDocument | Timer records = Dictionary<string,object> | ✅ |
| DNA-2 BuildSearchFilter | ListScheduledTimersAsync: filter fields optional | ✅ |
| DNA-3 DataProcessResult<T> | All methods return wrapped result | ✅ |
| DNA-4 MicroserviceBase | WorkflowTimerServiceImpl extends MicroserviceBase | ✅ |
| DNA-5 Scope Isolation | tenantId on all timer records | ✅ |
| DNA-6 DynamicController | DynamicController handles timer endpoints | ✅ |
| DNA-7 BuildQueryFilters | ObjectProcessor on timer list filter | ✅ |
| DNA-8 (as applicable) | EP-2 durability — timers survive restarts | ✅ |

---

## F270: IIdempotencyKeyService

**Description:**
  Deduplication store for all retryable state-changing operations.
  Every POST/mutation that must not execute twice (payments, order creation,
  email sends, webhook deliveries) uses this service.
  Pattern: before executing → check key exists → if yes, return cached result →
  if no → execute → store result with key.
  Keys expire after configurable TTL (default: 24h for payments, 7d for orders).

**FABRIC:** DATABASE FABRIC (Skill 05) → Redis provider (fast key lookup)
  DATABASE FABRIC → PostgreSQL (durable key store for payment/order-critical ops)
**RESOLUTION:** CreateAsync(FactoryResolutionContext{tenantId, environment})

**METHODS:**
```
CheckAndClaimAsync(tenantId: string, idempotencyKey: string,
                   operationType: string)
  → DataProcessResult<Dictionary<string,object>>
  Returns: status ("new"|"in_progress"|"completed"), cachedResult (if completed)
  "new" → caller proceeds with operation
  "in_progress" → caller waits (another instance is processing)
  "completed" → caller returns cachedResult without re-executing

StoreResultAsync(tenantId: string, idempotencyKey: string,
                 result: Dictionary<string,object>)
  → DataProcessResult<bool>
  Called after successful operation to cache result
  Transitions key status from "in_progress" to "completed"

MarkFailedAsync(tenantId: string, idempotencyKey: string, error: string)
  → DataProcessResult<bool>
  Marks key as "failed" — next attempt will retry (claim as "new")

GetKeyStatusAsync(tenantId: string, idempotencyKey: string)
  → DataProcessResult<Dictionary<string,object>>
  Returns: key, operationType, status, createdAt, expiresAt, result (if completed)

CleanupExpiredKeysAsync(tenantId: string)
  → DataProcessResult<Dictionary<string,object>>
  Removes expired keys. Called by scheduled maintenance task.
```

**DNA COMPLIANCE:**
| Pattern | Enforcement | Status |
|---------|-------------|--------|
| DNA-1 ParseDocument | Idempotency records = Dictionary<string,object> | ✅ |
| DNA-2 BuildSearchFilter | N/A — keyed by idempotencyKey | ✅ |
| DNA-3 DataProcessResult<T> | All methods return wrapped result | ✅ |
| DNA-4 MicroserviceBase | IdempotencyKeyServiceImpl extends MicroserviceBase | ✅ |
| DNA-5 Scope Isolation | tenantId namespace on all Redis keys | ✅ |
| DNA-6 DynamicController | Internal service — no HTTP endpoint | ✅ |
| DNA-7 BuildQueryFilters | Keyed operations — not filter-based | ✅ |
| DNA-8 (as applicable) | Redis + PG dual-store for different TTL needs | ✅ |

---

## F271: IOutboxEventService

**Description:**
  Transactional outbox pattern implementation. Guarantees that a state
  change (DB write) and its downstream event (queue publish) happen atomically —
  or neither is visible to consumers.
  Prevents "ghost writes" (DB written, queue event lost on crash) and
  "ghost events" (queue event sent, DB write rolled back).
  Used by: F252 (content transitions), F264 (order events), F263 (payment events).

**FABRIC:** DATABASE FABRIC (Skill 05) → PostgreSQL (outbox table — same transaction)
  QUEUE FABRIC (Skill 04) → Redis Streams (event delivery)
**RESOLUTION:** CreateAsync(FactoryResolutionContext{tenantId, environment})

**METHODS:**
```
AppendEventAsync(tenantId: string, event: Dictionary<string,object>,
                 transactionContext: object)
  → DataProcessResult<bool>
  MUST be called within the same DB transaction as the state change.
  transactionContext: the active PostgreSQL transaction object
  event: eventType, aggregateId, aggregateType, payload{}, correlationId
  Writes event to outbox table (not yet to queue)

ProcessOutboxAsync(tenantId: string)
  → DataProcessResult<Dictionary<string,object>>
  Background processor: reads undelivered outbox events → publishes to queue
  → marks as delivered. Runs on a scheduled basis (every 1s) + on-demand.
  Returns: processed (int), failed (int), pending (int)

GetPendingEventsAsync(tenantId: string, filter: Dictionary<string,object>)
  → DataProcessResult<List<Dictionary<string,object>>>
  filter: eventType, aggregateType, olderThan — BuildSearchFilter
  Used for monitoring and manual retry tooling

MarkDeliveredAsync(tenantId: string, outboxEventId: string)
  → DataProcessResult<bool>
  Called after successful queue publish. Marks event as delivered.

GetDeliveryStatusAsync(tenantId: string, correlationId: string)
  → DataProcessResult<Dictionary<string,object>>
  Returns all outbox events for a business operation (by correlationId)
```

**DNA COMPLIANCE:**
| Pattern | Enforcement | Status |
|---------|-------------|--------|
| DNA-1 ParseDocument | Outbox events = Dictionary<string,object> | ✅ |
| DNA-2 BuildSearchFilter | GetPendingEventsAsync: filter fields optional | ✅ |
| DNA-3 DataProcessResult<T> | All methods return wrapped result | ✅ |
| DNA-4 MicroserviceBase | OutboxEventServiceImpl extends MicroserviceBase | ✅ |
| DNA-5 Scope Isolation | tenantId on all outbox table queries | ✅ |
| DNA-6 DynamicController | Internal service — no HTTP endpoint | ✅ |
| DNA-7 BuildQueryFilters | ObjectProcessor on pending event filter | ✅ |
| DNA-8 (as applicable) | Same-transaction write is the core correctness guarantee | ✅ |

---

# ═══════════════════════════════════════════════════
# FAMILY 31 — APP / PLUGIN EXTENSIBILITY PLATFORM
# F272–F277 | Tenant-isolated extension points
# ═══════════════════════════════════════════════════

## Family 31 Overview

**Purpose:** Generates the plugin/app platform that allows tenants to install
third-party apps and extend platform behavior. Apps are sandboxed:
  - Each app installation is tenant-scoped
  - Apps communicate only through defined extension points
  - Apps receive events only for their subscribed topics + their tenant's data
  - All webhook deliveries are HMAC-signed
  - App permissions are scoped (no app can read another tenant's data)

**Key principle:** An app installation is a Factory Resolution Context update.
When app "reviews-pro" is installed for tenant "acme", the engine adds
F272:IAppRegistryService + F273:IAppInstallationService bindings for that
tenant that route to the "reviews-pro" extension point handlers.

**Fabrics used:**
  - DATABASE FABRIC (Skill 05) → PostgreSQL (installations, scopes, metafields)
  - QUEUE FABRIC (Skill 04) → Redis Streams (webhook event delivery)
  - CORE FABRIC (Skill 01) → MicroserviceBase (permission enforcement)

---

## F272: IAppRegistryService

**Description:**
  App catalog management. Each app has a manifest (capabilities, required scopes,
  webhook subscriptions, extension point declarations, version, compatibility).
  Platform-level registry (not per-tenant). Apps are published by developers
  and approved by platform operators.

**FABRIC:** DATABASE FABRIC (Skill 05) → Elasticsearch provider
**RESOLUTION:** CreateAsync(FactoryResolutionContext{environment})

**METHODS:**
```
RegisterAppAsync(payload: Dictionary<string,object>)
  → DataProcessResult<Dictionary<string,object>>
  payload: appId, name, version, developer{}, manifest{}, status="pending_review"
  manifest: requiredScopes[], webhookSubscriptions[], extensionPoints[],
            configSchema{}, platformVersion

GetAppAsync(appId: string, version: string)
  → DataProcessResult<Dictionary<string,object>>

SearchAppsAsync(filter: Dictionary<string,object>)
  → DataProcessResult<Dictionary<string,object>>
  filter: category, compatibleWith, status="published" — BuildSearchFilter
  Returns: apps[], total, categories[]

PublishAppVersionAsync(appId: string, versionId: string)
  → DataProcessResult<bool>
  Platform operator action. Moves app version to "published" status.

ListAppVersionsAsync(appId: string)
  → DataProcessResult<List<Dictionary<string,object>>>
  Returns version history with status and changelog

ValidateManifestAsync(manifest: Dictionary<string,object>)
  → DataProcessResult<Dictionary<string,object>>
  Pre-publish validation: scope names valid, extension points exist,
  webhook topics recognized. Returns: valid, errors[], warnings[]
```

**DNA COMPLIANCE:**
| Pattern | Enforcement | Status |
|---------|-------------|--------|
| DNA-1 ParseDocument | App records = Dictionary<string,object> | ✅ |
| DNA-2 BuildSearchFilter | SearchAppsAsync: all filter fields optional | ✅ |
| DNA-3 DataProcessResult<T> | All methods return wrapped result | ✅ |
| DNA-4 MicroserviceBase | AppRegistryServiceImpl extends MicroserviceBase | ✅ |
| DNA-5 Scope Isolation | Platform-level (no tenantId) — scoped by appId | ✅ |
| DNA-6 DynamicController | DynamicController handles app registry endpoints | ✅ |
| DNA-7 BuildQueryFilters | ObjectProcessor on app search filter | ✅ |
| DNA-8 (as applicable) | App versions immutable after publish | ✅ |

---

## F273: IAppInstallationService

**Description:**
  Per-tenant app lifecycle. Install, configure, suspend, uninstall.
  Each installation creates a unique installation context: granted scopes,
  config values, webhook subscription bindings. Installation is a generated
  flow (Template 21) — multi-step with rollback on failure.

**FABRIC:** DATABASE FABRIC (Skill 05) → PostgreSQL provider
  QUEUE FABRIC (Skill 04) → Redis Streams (installation lifecycle events)
**RESOLUTION:** CreateAsync(FactoryResolutionContext{tenantId, environment})

**METHODS:**
```
InstallAppAsync(tenantId: string, appId: string, version: string,
                grantedScopes: List<string>, config: Dictionary<string,object>)
  → DataProcessResult<Dictionary<string,object>>
  Validates scopes against app manifest. Registers webhooks (F274).
  Creates metafield bindings (F276). Activates extension points (F277).
  Emits app.installed event via QUEUE FABRIC.
  Returns: installationId, appId, status, grantedScopes[], installedAt

GetInstallationAsync(tenantId: string, installationId: string)
  → DataProcessResult<Dictionary<string,object>>

ListInstallationsAsync(tenantId: string, filter: Dictionary<string,object>)
  → DataProcessResult<List<Dictionary<string,object>>>
  filter: status, appId, category — BuildSearchFilter

UpdateInstallationConfigAsync(tenantId: string, installationId: string,
                               config: Dictionary<string,object>)
  → DataProcessResult<bool>
  Partial config update. Validates against app's configSchema.

SuspendInstallationAsync(tenantId: string, installationId: string, reason: string)
  → DataProcessResult<bool>
  Pauses app without losing config. Webhooks paused (not deleted).

UninstallAppAsync(tenantId: string, installationId: string)
  → DataProcessResult<bool>
  Removes all webhooks, metafield bindings, extension point activations.
  Data cleanup per app's offboarding spec. Emits app.uninstalled.
```

**DNA COMPLIANCE:**
| Pattern | Enforcement | Status |
|---------|-------------|--------|
| DNA-1 ParseDocument | Installation records = Dictionary<string,object> | ✅ |
| DNA-2 BuildSearchFilter | ListInstallationsAsync: filter fields optional | ✅ |
| DNA-3 DataProcessResult<T> | All methods return wrapped result | ✅ |
| DNA-4 MicroserviceBase | AppInstallationServiceImpl extends MicroserviceBase | ✅ |
| DNA-5 Scope Isolation | tenantId on ALL installation records | ✅ |
| DNA-6 DynamicController | DynamicController handles installation endpoints | ✅ |
| DNA-7 BuildQueryFilters | ObjectProcessor on installation list filter | ✅ |
| DNA-8 (as applicable) | Installation is a generated flow (Template 21) | ✅ |

---

## F274: IWebhookDeliveryService

**Description:**
  Reliable webhook delivery with HMAC signing, retry with exponential backoff,
  and DLQ for permanently failed deliveries. Every outbound webhook is signed
  with a per-installation HMAC key. Receivers MUST validate the signature.
  Delivery attempts: 5 retries over 24h with exponential backoff + jitter.

**FABRIC:** QUEUE FABRIC (Skill 04) → Redis Streams (delivery pipeline)
  DATABASE FABRIC (Skill 05) → PostgreSQL (delivery records)
**RESOLUTION:** CreateAsync(FactoryResolutionContext{tenantId, environment})

**METHODS:**
```
RegisterWebhookAsync(tenantId: string, installationId: string,
                     subscription: Dictionary<string,object>)
  → DataProcessResult<Dictionary<string,object>>
  subscription: topic (e.g., order.created), endpoint (https), format (json)
  Generates HMAC signing key for this subscription.
  Returns: webhookId, topic, endpoint, signingKeyRef

DeliverEventAsync(tenantId: string, topic: string, payload: Dictionary<string,object>)
  → DataProcessResult<Dictionary<string,object>>
  Finds all webhook subscriptions for topic + tenant.
  Signs payload with HMAC-SHA256. Enqueues delivery via QUEUE FABRIC.
  Returns: deliveryIds[] (one per matching subscription)

GetDeliveryStatusAsync(tenantId: string, deliveryId: string)
  → DataProcessResult<Dictionary<string,object>>
  Returns: attempts[], status (delivered|failed|pending), lastAttemptAt

RetryDeliveryAsync(tenantId: string, deliveryId: string)
  → DataProcessResult<bool>
  Manual retry for permanently failed deliveries

ListDeliveriesAsync(tenantId: string, filter: Dictionary<string,object>)
  → DataProcessResult<Dictionary<string,object>>
  filter: webhookId, topic, status, dateFrom, dateTo — BuildSearchFilter

RevokeWebhookAsync(tenantId: string, webhookId: string)
  → DataProcessResult<bool>
  Deletes webhook subscription and signing key. Future events not delivered.
```

**DNA COMPLIANCE:**
| Pattern | Enforcement | Status |
|---------|-------------|--------|
| DNA-1 ParseDocument | Webhook records = Dictionary<string,object> | ✅ |
| DNA-2 BuildSearchFilter | ListDeliveriesAsync: all filter fields optional | ✅ |
| DNA-3 DataProcessResult<T> | All methods return wrapped result | ✅ |
| DNA-4 MicroserviceBase | WebhookDeliveryServiceImpl extends MicroserviceBase | ✅ |
| DNA-5 Scope Isolation | tenantId on all webhook subscriptions + delivery records | ✅ |
| DNA-6 DynamicController | DynamicController handles webhook management endpoints | ✅ |
| DNA-7 BuildQueryFilters | ObjectProcessor on delivery list filter | ✅ |
| DNA-8 (as applicable) | HMAC signing key per-installation — never shared | ✅ |

---

## F275: IScopePermissionService

**Description:**
  Fine-grained permission scope management for installed apps.
  Each installed app is granted only the scopes the tenant explicitly approves.
  Scope check is called before every API operation that an app triggers.
  Follows OWASP object-level authorization patterns — each scope check
  includes both the scope name AND the tenantId.

**FABRIC:** DATABASE FABRIC (Skill 05) → PostgreSQL provider
**RESOLUTION:** CreateAsync(FactoryResolutionContext{tenantId, environment})

**METHODS:**
```
GrantScopesAsync(tenantId: string, installationId: string,
                 scopes: List<string>)
  → DataProcessResult<bool>
  Validates each scope against allowed scope registry. Unknown scopes → Failure.

RevokeScopesAsync(tenantId: string, installationId: string,
                  scopes: List<string>)
  → DataProcessResult<bool>

CheckScopeAsync(tenantId: string, installationId: string, scopeRequired: string)
  → DataProcessResult<bool>
  Returns true only if installationId has scopeRequired AND status=active.
  This is called INSIDE every generated API handler for app-triggered operations.

GetGrantedScopesAsync(tenantId: string, installationId: string)
  → DataProcessResult<List<string>>

ValidateScopeSetAsync(scopes: List<string>)
  → DataProcessResult<Dictionary<string,object>>
  Validates scope names against platform scope registry.
  Returns: valid[], invalid[], deprecated[]
```

**DNA COMPLIANCE:**
| Pattern | Enforcement | Status |
|---------|-------------|--------|
| DNA-1 ParseDocument | Scope records = Dictionary<string,object> | ✅ |
| DNA-2 BuildSearchFilter | N/A — keyed operations | ✅ |
| DNA-3 DataProcessResult<T> | CheckScopeAsync returns wrapped bool | ✅ |
| DNA-4 MicroserviceBase | ScopePermissionServiceImpl extends MicroserviceBase | ✅ |
| DNA-5 Scope Isolation | tenantId + installationId on every scope check | ✅ |
| DNA-6 DynamicController | Internal — scope checks embedded in handlers | ✅ |
| DNA-7 BuildQueryFilters | N/A for keyed scope operations | ✅ |
| DNA-8 (as applicable) | Every app operation gate-checked before execution | ✅ |

---

## F276: IMetafieldService

**Description:**
  Custom fields (metafields) attached to any entity (product, order, customer,
  content) per tenant. Apps use metafields to store extended data.
  Metafield namespace prevents collision between apps (each app's metafields
  prefixed with installationId). Stored as dynamic sub-documents on the parent entity.

**FABRIC:** DATABASE FABRIC (Skill 05) → Elasticsearch (content/product metafields)
  DATABASE FABRIC → PostgreSQL (order/customer metafields)
**RESOLUTION:** CreateAsync(FactoryResolutionContext{tenantId, environment})

**METHODS:**
```
SetMetafieldAsync(tenantId: string, resourceType: string, resourceId: string,
                  namespace: string, key: string, value: Dictionary<string,object>)
  → DataProcessResult<bool>
  namespace = installationId (enforced — apps cannot write outside their namespace)
  value: type (string|integer|json|boolean), value, description

GetMetafieldAsync(tenantId: string, resourceType: string, resourceId: string,
                  namespace: string, key: string)
  → DataProcessResult<Dictionary<string,object>>

GetAllMetafieldsAsync(tenantId: string, resourceType: string, resourceId: string,
                       namespace: string)
  → DataProcessResult<Dictionary<string,object>>
  Returns all metafields for a resource within a namespace (app's data)

DeleteMetafieldAsync(tenantId: string, resourceType: string, resourceId: string,
                     namespace: string, key: string)
  → DataProcessResult<bool>

ListMetafieldDefinitionsAsync(tenantId: string, namespace: string)
  → DataProcessResult<List<Dictionary<string,object>>>
  Returns registered metafield definitions for schema discovery
```

**DNA COMPLIANCE:**
| Pattern | Enforcement | Status |
|---------|-------------|--------|
| DNA-1 ParseDocument | Metafields = Dictionary<string,object> | ✅ |
| DNA-2 BuildSearchFilter | ListMetafieldDefinitions: namespace filter optional | ✅ |
| DNA-3 DataProcessResult<T> | All methods return wrapped result | ✅ |
| DNA-4 MicroserviceBase | MetafieldServiceImpl extends MicroserviceBase | ✅ |
| DNA-5 Scope Isolation | tenantId + namespace (installationId) on ALL operations | ✅ |
| DNA-6 DynamicController | DynamicController handles metafield endpoints | ✅ |
| DNA-7 BuildQueryFilters | ObjectProcessor on definition list filter | ✅ |
| DNA-8 (as applicable) | namespace isolation = app sandbox enforcement | ✅ |

---

## F277: IExtensionPointService

**Description:**
  Runtime extension point management. Extension points are named hooks
  in the platform where installed apps can inject behavior.
  Examples: product.before_save, checkout.before_confirm, content.after_publish.
  Extension points are synchronous (response-modifying) or async (fire-and-forget).
  Apps register handler URLs; platform calls them with event payload + waits
  for response (sync) or just delivers (async).

**FABRIC:** QUEUE FABRIC (Skill 04) → Redis Streams (async extension delivery)
  DATABASE FABRIC (Skill 05) → PostgreSQL (extension point registrations)
**RESOLUTION:** CreateAsync(FactoryResolutionContext{tenantId, environment})

**METHODS:**
```
RegisterHandlerAsync(tenantId: string, installationId: string,
                     payload: Dictionary<string,object>)
  → DataProcessResult<Dictionary<string,object>>
  payload: extensionPoint, handlerUrl, mode (sync|async), timeout (ms),
           priority (for ordering multiple handlers)

FireExtensionPointAsync(tenantId: string, extensionPoint: string,
                         context: Dictionary<string,object>)
  → DataProcessResult<Dictionary<string,object>>
  Executes all registered handlers for this extension point + tenant.
  SYNC mode: calls handler URL, merges response into context, returns modified context
  ASYNC mode: enqueues delivery, returns immediately
  Handler timeout: default 5s (configurable). Timeout → DataProcessResult.Failure
  Partial failure policy: configurable per extension point (fail-open or fail-closed)

GetRegisteredHandlersAsync(tenantId: string, extensionPoint: string)
  → DataProcessResult<List<Dictionary<string,object>>>

DeactivateHandlerAsync(tenantId: string, installationId: string,
                        extensionPoint: string)
  → DataProcessResult<bool>
  Called by F273.UninstallAppAsync or SuspendInstallationAsync
```

**DNA COMPLIANCE:**
| Pattern | Enforcement | Status |
|---------|-------------|--------|
| DNA-1 ParseDocument | Extension context = Dictionary<string,object> | ✅ |
| DNA-2 BuildSearchFilter | N/A — keyed by extensionPoint | ✅ |
| DNA-3 DataProcessResult<T> | Timeout/failure → Failure result, never exception | ✅ |
| DNA-4 MicroserviceBase | ExtensionPointServiceImpl extends MicroserviceBase | ✅ |
| DNA-5 Scope Isolation | tenantId + installationId on all handler calls | ✅ |
| DNA-6 DynamicController | Internal — fired inside business operation handlers | ✅ |
| DNA-7 BuildQueryFilters | N/A — keyed by extensionPoint | ✅ |
| DNA-8 (as applicable) | Fail-open/closed policy is FREEDOM config per extension point | ✅ |

---

# ═══════════════════════════════════════════════════
# DESIGN RECORDS — DR-28, DR-29
# ═══════════════════════════════════════════════════

## DR-28: Transactional Outbox as the Event Reliability Contract

**Decision:** Every domain event in FLOW-10 is emitted via F271:IOutboxEventService,
never via direct QUEUE FABRIC call from business logic.

**Problem solved:** Service A writes order record to PG → crashes before publishing
order.created to Redis Streams → downstream services never get the event.
This is the "dual write problem." Without outbox, eventual consistency breaks.

**Mechanism:**
  1. Business logic calls F271.AppendEventAsync() WITHIN the PG transaction
  2. Outbox processor (background job) reads undelivered events → publishes to queue
  3. Event marked delivered in outbox table
  4. If outbox processor crashes after publish but before marking → event
     is republished on recovery. Consumers must be idempotent (they are, via F270).

## DR-29: App Sandbox Isolation — Namespace as Security Boundary

**Decision:** App isolation is enforced through namespace + tenantId on every
data access. Apps cannot access data outside their namespace.

**Enforcement layers:**
  1. F275:IScopePermissionService: scope check before every app-triggered operation
  2. F276:IMetafieldService: namespace = installationId (enforced in code)
  3. F277:IExtensionPointService: context passed to app contains only explicitly
     allowed fields (not full entity documents)
  4. DNA-5: tenantId on all queries prevents cross-tenant data access
  5. AF-8 (Security station): scans generated extension code for namespace bypass attempts

---

# ═══════════════════════════════════════════════════
# FAMILIES 30–31 SUMMARY
# ═══════════════════════════════════════════════════

## Family 30 — Workflow Lifecycle

| Interface | F# | Fabric | Primary Purpose |
|-----------|-----|--------|----------------|
| IWorkflowDefinitionService | F267 | DATABASE (ES) | Flow DAG versioning |
| IWorkflowExecutionService | F268 | DATABASE (PG) + QUEUE | Durable execution |
| IWorkflowTimerService | F269 | FLOW ENGINE (EP-2) | Durable timers |
| IIdempotencyKeyService | F270 | DATABASE (Redis + PG) | Deduplication |
| IOutboxEventService | F271 | DATABASE (PG) + QUEUE | Atomic write + event |

## Family 31 — Extensibility

| Interface | F# | Fabric | Primary Purpose |
|-----------|-----|--------|----------------|
| IAppRegistryService | F272 | DATABASE (ES) | App catalog |
| IAppInstallationService | F273 | DATABASE (PG) + QUEUE | Per-tenant install |
| IWebhookDeliveryService | F274 | QUEUE + DATABASE (PG) | HMAC-signed delivery |
| IScopePermissionService | F275 | DATABASE (PG) | Scope enforcement |
| IMetafieldService | F276 | DATABASE (ES + PG) | Custom fields |
| IExtensionPointService | F277 | QUEUE + DATABASE (PG) | Runtime hooks |

**DNA Compliance Total:** 11 interfaces × 8 patterns = **88/88 ✅**
**Next Family:** 32 (F278–F282) — Search & Discovery

---

# ═══════════════════════════════════════════════════
# DESIGN DECISIONS — DD-27, DD-28, DD-29
# ═══════════════════════════════════════════════════

## DD-27: Pull vs. Push Webhook Delivery Model

**Decision:** FLOW-10 uses **push** (server initiates delivery to registered endpoint)
via F274:IWebhookDeliveryService, NOT pull (app polls for events).

**Rationale:** Push delivery allows apps to react immediately without polling overhead.
Industry standard (Shopify, Stripe, GitHub all use push).

**Safety mechanisms:** HMAC signing on every payload so receivers can verify
authenticity. Retry with exponential backoff + DLQ for failed deliveries.
Signed delivery key per-installation ensures no app receives another tenant's events.

**Alternative rejected:** Event stream subscription (app reads from Kafka/Streams topic
directly) — rejected because it requires apps to maintain long-lived connections and
have direct infrastructure access, which breaks sandbox isolation.

## DD-28: Sync vs. Async Extension Points

**Decision:** Extension points support both SYNC and ASYNC modes, configured per
extension point definition. Default: ASYNC for all notification/analytics hooks,
SYNC only for hooks that must modify the response (e.g., `checkout.before_confirm`
applying a custom discount, `product.before_save` validating custom fields).

**Iron rule:** SYNC extension points have a hard timeout (default 5s). If the app
handler does not respond in time → DataProcessResult.Failure with fail-open/closed
policy from FREEDOM config. The primary business operation MUST NOT block indefinitely
on an app response.

## DD-29: Idempotency TTL Tiers

**Decision:** IIdempotencyKeyService (F270) applies different TTLs based on operation type:

| Operation type | TTL | Rationale |
|----------------|-----|-----------|
| Payment (authorize/capture/refund) | 24 hours | PSP may replay webhook confirmations |
| Order creation | 7 days | Fulfillment systems may retry order events |
| Email/SMS OTP send | 5 minutes | Short-lived by design (security) |
| Webhook delivery | 48 hours | Receiver retries within 24h window |
| Content publish | 1 hour | Short window; publish is not repeated |

Redis store used for <1h TTL. PostgreSQL store used for ≥24h TTL (durability required).
Dual-store is transparent to callers — F270 routes internally based on operationType.

---
## FLOW10:MERGE:P4 SAVE POINT ✅
## Next: "Start FLOW-10 P5" → FLOW10_P5_SEARCH_NOTIFICATIONS.md
