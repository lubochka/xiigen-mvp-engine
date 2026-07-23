# FLOW-40: CLIENT PUSH INFRASTRUCTURE
## Domain: client-push
## Wave: -1 (infrastructure — before any Wave 0 user-facing flow)
## Prerequisite: FLOW-35 (queue fabric active), FLOW-00.2 (stack coupling base)
## Unblocks: FLOW-01 through FLOW-24 (all flows with SLA-bearing steps)
## Date: 2026-03-24

---

## WHY THIS FLOW EXISTS

Every user-facing flow from FLOW-01 onward has at least one SLA-bearing waiting
step. FLOW-01 T48 waits up to 24h for email verification. Without a push
mechanism, every client polls every few seconds for 24 hours. With SSE, the
server pushes exactly when the state changes.

This cannot live inside FLOW-01 because:
- FLOW-02 through FLOW-24 all need the same infrastructure
- Importing push infrastructure from FLOW-01's domain creates the wrong
  dependency direction (user-facing flow → auth flow)
- The ISseConnectionPool interface must be registered in the fabric layer
  before any user-facing flow contract can reference it

---

## FLOW-VS-SERVICE GATE

Applying Q1-Q4 from `planning--flow-vs-service-gate-SKILL.md`:

| Capability | Q1 (learns?) | Q2 (branches per tenant?) | Q3 (flow registry?) | Decision |
|-----------|-------------|--------------------------|--------------------|---------:|
| SseConnectionManager | YES — connection strategy improves with load data | YES — auth, tenant isolation | YES | FLOW |
| FlowEventBridge | YES — event routing improves with pattern data | YES — different flows emit different events | YES | FLOW |
| SseKeepaliveScheduler | NO — fixed interval | YES — per-connection timing | YES | FLOW |

All three: FLOW. None on bootstrap list.

---

## STATE.json

```json
{
  "flow_id": "FLOW-40",
  "flow_name": "Client Push Infrastructure",
  "domain": "client-push",
  "implementationMode": "hybrid",
  "implementationModeReason": "Phase A: manual bootstrap — ISseConnectionPool interface + ES index. Phase B-D: af-pipeline — 3 topology contracts generated through AF pipeline.",
  "bootstrapBoundary": "Phase A only",
  "afPipelineStartsAt": "Phase B",
  "wave": -1,
  "pre_allocated_ranges": {
    "T": "⛔ REQUIRED — 3 task types. Run INFRA-AUDIT-1.",
    "F": "⛔ REQUIRED — 3 factories. Run INFRA-AUDIT-1.",
    "CF": "⛔ REQUIRED — 2 BFA rules. Run INFRA-AUDIT-1.",
    "Family": "⛔ REQUIRED — 1 family: client-push-infrastructure"
  }
}
```

---

## THE THREE TASK TYPES

### T-[NEXT+0]: SseConnectionManager

```json
{
  "taskTypeId": "T-[NEXT+0]",
  "name": "SseConnectionManager",
  "archetype": "ROUTING",
  "purpose": "Accept SSE connections from clients. Authenticate via tenantId+correlationId. Register active connection in the ISseConnectionPool. Route to keepalive or push sub-handlers.",
  "ironRules": [
    "Every connection MUST carry both tenantId and correlationId (DNA-5)",
    "Connection registration in pool MUST precede any event push (DNA-8)",
    "Connections with expired correlationId are rejected with 404, not 500"
  ],
  "qualityGates": [
    "AF-9: tenant isolation — connection A cannot receive events for connection B's correlationId",
    "AF-9: auth validation runs BEFORE pool registration",
    "LEARNING-001: feedback.handler has OUTCOME signal"
  ]
}
```

### T-[NEXT+1]: FlowEventBridge

```json
{
  "taskTypeId": "T-[NEXT+1]",
  "name": "FlowEventBridge",
  "archetype": "DATA_PIPELINE",
  "purpose": "Subscribe to queue events from user-facing flows (email.verified, verification.expired, onboarding.step.completed, etc.). Fan out to matching active SSE connections in the pool. Transform queue event shape into SSE event shape.",
  "ironRules": [
    "FlowEventBridge MAY consume but MUST NOT emit events in user-facing flow domains (CF-[NEXT])",
    "Fan-out MUST be tenant-scoped — never push cross-tenant (DNA-5)",
    "If connection not found in pool: log and discard — NEVER queue the push for retry"
  ],
  "qualityGates": [
    "AF-9: read-only — no UserRegistrationInitiated or EmailVerified events produced by this service",
    "AF-9: tenant isolation verified by test with two concurrent connections in different tenants",
    "LEARNING-001: feedback.handler has OUTCOME signal"
  ]
}
```

**Why DATA_PIPELINE not PROCESSING:** FlowEventBridge transforms data between
two systems (queue → SSE channel). DATA_PIPELINE is the correct archetype for
services that move and transform data between integration points. PROCESSING is
for services that compute or validate within a single domain.

### T-[NEXT+2]: SseKeepaliveScheduler

```json
{
  "taskTypeId": "T-[NEXT+2]",
  "name": "SseKeepaliveScheduler",
  "archetype": "SCHEDULED",
  "purpose": "Every 30 seconds, emit a keepalive event to all active SSE connections. Detect connections that have not acknowledged in > 90 seconds. Clean up dropped connections from the pool.",
  "ironRules": [
    "Keepalive interval from FREEDOM config — never hardcoded (IR-1)",
    "Dropped connection cleanup MUST remove from pool BEFORE emitting any more events (DNA-8)",
    "Dropped connection is NOT an error — log at INFO level only"
  ],
  "qualityGates": [
    "AF-9: keepalive interval reads from config.sseKeepaliveIntervalMs",
    "AF-9: cleanup threshold reads from config.sseDroppedConnectionThresholdMs",
    "LEARNING-001: feedback.handler has OUTCOME signal"
  ]
}
```

---

## THE FABRIC INTERFACE

### ISseConnectionPool

This interface must be created in Phase A and registered in the fabric layer.
All FLOW-01 through FLOW-24 generated services that need push capability
import ONLY this interface — never the concrete SseController.

```typescript
// server/src/fabrics/interfaces/sse-connection-pool.interface.ts

export const SSE_CONNECTION_POOL = 'SSE_CONNECTION_POOL';

export interface SseEvent {
  event: string;           // 'email-verified' | 'verification-expired' | 'keepalive' | ...
  data: Record<string, unknown>;
  id?: string;             // optional event ID for client-side deduplication
}

export interface ConnectionInfo {
  tenantId: string;
  correlationId: string;
  connectedAt: string;     // ISO timestamp
  lastAcknowledgedAt: string;
}

export interface ISseConnectionPool {
  /**
   * Register an active SSE connection.
   * Called by SseConnectionManager when a client connects.
   * Must be called before any pushEvent to this correlationId.
   */
  registerConnection(
    tenantId: string,
    correlationId: string,
    response: Response,    // NestJS ServerResponse
  ): void;

  /**
   * Push an event to a specific client connection.
   * Silently discards if connection is not in pool.
   * Never throws — returns false if connection not found.
   */
  pushEvent(
    tenantId: string,
    correlationId: string,
    event: SseEvent,
  ): boolean;

  /**
   * Remove a connection from the pool.
   * Called on client disconnect OR keepalive timeout.
   */
  closeConnection(tenantId: string, correlationId: string): void;

  /**
   * List all active connections for a tenant.
   * Used by SseKeepaliveScheduler for cleanup sweep.
   */
  getActiveConnections(tenantId: string): ConnectionInfo[];
}
```

**Fabric registration in Phase A:**
```typescript
// server/src/fabrics/fabrics.module.ts — add:
{
  provide: SSE_CONNECTION_POOL,
  useClass: InMemorySseConnectionPool,  // Phase A default; swap for Redis pool in production
}
```

---

## BFA RULES

### CF-[NEXT+0]: FlowEventBridge read-only constraint

```json
{
  "ruleId": "CF-[NEXT+0]",
  "flowId": "FLOW-40",
  "taskTypeId": "T-[NEXT+1]",
  "type": "CROSS_DOMAIN_READ",
  "constraint": "FLOW-40 FlowEventBridge MAY subscribe to events in domains: user-registration, content-management, social, commerce, learning, chat. FLOW-40 MUST NOT emit events into any of these domains.",
  "reason": "SSE bridge is a read-through layer. It consumes business events but does not originate them. Emitting events into user-facing flow domains would create circular dependencies and unpredictable flow state.",
  "violationCheck": "grep the generated FlowEventBridge service for any emit() call targeting xiigen.user-registration.*, xiigen.content.*, etc. Any such call is a BUILD_FAILURE.",
  "violationSeverity": "BUILD_FAILURE"
}
```

### CF-[NEXT+1]: SSE connection pool tenant isolation

```json
{
  "ruleId": "CF-[NEXT+1]",
  "flowId": "FLOW-40",
  "taskTypeId": "T-[NEXT+0]",
  "type": "TENANT_ISOLATION",
  "constraint": "ISseConnectionPool.pushEvent MUST scope lookups by tenantId. A push call with tenantId=A MUST NOT deliver to connections registered with tenantId=B, even if correlationIds match.",
  "reason": "Multi-tenant isolation — same correlationId format could appear across tenants.",
  "violationCheck": "Run tenant isolation test: register connections for tenant-A and tenant-B with same correlationId. Push to tenant-A. Verify tenant-B receives nothing.",
  "violationSeverity": "BUILD_FAILURE"
}
```

---

## EXECUTION ORDER IN FLOW-01

After FLOW-40 is ACTIVE, FLOW-01 Phase A adds `ISseConnectionPool` as a
factory dependency of T48:

```typescript
// In T48 EngineContract factoryDependencies:
{
  factoryId: 'F-[FLOW40-NEXT+2]',
  interfaceName: 'ISseConnectionPool',
  fabricType: FabricType.FLOW_ENGINE,   // SSE pool is a flow engine concern
  providerHint: 'in-memory',
  description: 'Push email.verified and verification.expired events to waiting client',
}
```

The AF-1 genesis prompt for T48 then includes:
```
When the EmailVerified event is received, call:
  ssePool.pushEvent(tenantId, correlationId, {
    event: 'email-verified',
    data: { currentStep: 'email-verified', nextStep: 'onboarding' }
  })

The push MUST occur after the FlowStateSnapshot is written (DNA-8).
```

This is the fabric-first pattern: T48's generated service imports
`ISseConnectionPool`, never `SseController` or any HTTP transport directly.

---

## PHASE A — BOOTSTRAP

Phase A scope (manual, bootstrap boundary):

```bash
# 1. Create ISseConnectionPool interface file
# 2. Create InMemorySseConnectionPool implementation
# 3. Register in fabrics.module.ts
# 4. Create xiigen-sse-connections ES index (for persistent tracking if needed)
# 5. Register ISseConnectionPool factory (F-[NEXT+2]) in factory-registry.ts
# 6. Seed BFA rules CF-[NEXT+0] and CF-[NEXT+1] to xiigen-arbiters

# Verify:
ls server/src/fabrics/interfaces/sse-connection-pool.interface.ts
grep -c "SSE_CONNECTION_POOL" server/src/fabrics/fabrics.module.ts
curl -s localhost:9200/xiigen-sse-connections | jq .
curl -s "localhost:9200/xiigen-arbiters/_count?q=flowId:FLOW-40" | jq .count
# Expected: 2

pnpm test  # zero regressions
```

**Expected test delta Phase A: +4 to +8**
(ISseConnectionPool interface tests + InMemorySseConnectionPool unit tests)

⛔ STOP. Package outputs. Wait for "yes".

---

## PHASES B-D — AF PIPELINE

Phase B: Submit T-[NEXT+0] SseConnectionManager contract to AF pipeline
Phase C: Submit T-[NEXT+1] FlowEventBridge contract to AF pipeline
Phase D: Submit T-[NEXT+2] SseKeepaliveScheduler contract to AF pipeline

Each phase follows standard INJECT → GENERATE → JUDGE → IMPROVE → PROMOTE.
Score target: ≥ 0.85 within 3 cycles.

BFA check at each phase: verify generated service does not emit user-facing
domain events (CF-[NEXT+0] enforcement).

---

## CLIENT-SIDE CONTRACT

SSE endpoint consumed by clients:

```
GET /api/flow/{flowId}/events?correlationId=X&tenantId=Y
Accept: text/event-stream

Server pushes:
  event: email-verified      data: { currentStep, nextStep }
  event: verification-expired data: { currentStep, availableActions }
  event: onboarding-step-N   data: { step, currentStep }
  event: keepalive            data: {}

Client behavior:
  - On connect: show current state with local countdown
  - On push event: update UI immediately, no poll needed
  - On connection drop (no keepalive for 90s): fall back to 30s polling
  - On app background/reopen: close SSE, query FlowStateSnapshot once,
    reconnect SSE if still in waiting state
```

Polling fallback interval (30s on SSE drop) is now a concrete contract,
not a per-developer guess. This is the critical efficiency gain — without
FLOW-40, every developer implementing FLOW-01 through FLOW-24 chooses
their own polling strategy.
