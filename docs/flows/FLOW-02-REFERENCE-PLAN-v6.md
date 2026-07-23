# FLOW-02: BUSINESS ONBOARDING INTELLIGENCE — REFERENCE PLAN v6
## Stack coupling annotations integrated (SK-431 + FLOW-00.2 prerequisite)
## V29/V30/V31 added to SK-418 checklist (31/31 ✅)
## Updated: 2026-03-22 (v6)
## Prerequisites: FLOW-01 complete + FLOW-00.2 complete (D-STACK-1 through D-STACK-8 locked) ← NEW v6

---

## WHAT CHANGED FROM v5

| What v5 had | What v6 adds |
|-------------|-------------|
| Prerequisite: FLOW-00.1 complete | Prerequisite: FLOW-00.2 complete |
| SK-418 checklist: V1–V28 | SK-418 checklist: V1–V31 (31 items) |
| SESSION-0: FC-1 through FC-18 | SESSION-0: FC-19, FC-20, FC-21 added |
| No stackCoupling on T50/T51/T52 | stackCoupling v2 on all task types |
| No WordPress INCOMPATIBLE flags | T50 php-wordpress INCOMPATIBLE |
| No Angular state notes | StateArchitectureNotes on matching-in-progress node |
| STATE.json: no stackTargets | STATE.json: stackTargets + clientTargets added |

---

## STATE.json (v6)

```json
{
  "flow_id": "FLOW-02",
  "flow_name": "Business Onboarding Intelligence",
  "stackTargets": ["node-nestjs"],
  "clientTargets": ["react-web"],
  "parallel_wave": null,
  "wave": 1,
  "current_phase": "session-0",
  "completed_phases": [],
  "test_baseline": null
}
```

---

## SESSION-0 ADDITIONS (FC-19, FC-20, FC-21)

### FC-19: stackCoupling present on all FLOW-02 task types (V29)
Verify all T50/T51/T52 contracts have `entries: { 'node-nestjs:server': { ... } }` structure.

### FC-20: T50 php-wordpress INCOMPATIBLE flagged (V30)
```bash
grep -A 3 "php-wordpress" server/src/engine-contracts/business-onboarding-intelligence-contracts.ts 2>/dev/null \
  || grep -A 3 "php-wordpress" server/src/engine-contracts/flow-02*.ts 2>/dev/null
# Expected: incompatible: true + incompatibleReason
```

### FC-21: Angular stateNotes on matching-in-progress node (V31)
The `matching-in-progress` topology node must have `entries['angular:client'].stateNotes` with
stateHolderType, stateScope, propagationRisk all declared.

---

## STACK COUPLING ANNOTATIONS FOR FLOW-02 TASK TYPES

### T50 — ParallelProfileEnricher (STACK_COUPLED — fan-in pattern)

```typescript
stackCoupling: {
  entries: {
    'node-nestjs:server': {
      tier: 'STACK_COUPLED',
      stackCategory: 'web-framework',
      dimensions: ['SERVER_ASYNC_MODEL', 'SERVER_LANGUAGE'],
      neutralConcepts: [
        'ALL enrichment branches must complete (or time out) before T50 emits ProfileEnrichmentCompleted',
        'A single source timeout or failure MUST NOT halt T50 — continue with remaining sources',
        'Enrichment source list MUST come from FREEDOM config — never hardcoded',
        'DNA-8: storeDocument(enrichmentResult) BEFORE emitting any completion event',
        'DNA-5: All database queries scoped to tenantId',
      ],
      implementationNotes: 'Generate NestJS @Injectable() extending MicroserviceBase. Inject F184 IEnrichmentSourceService via constructor. Parallel: const results = await Promise.allSettled(sources.map(s => this.svc.fetch(tenantId, s))). Filter rejected results without re-throwing. Return Promise<DataProcessResult<ProfileEnrichmentResult>>.',
    },
    'python-fastapi:server': {
      tier: 'STACK_COUPLED',
      stackCategory: 'web-framework',
      dimensions: ['SERVER_ASYNC_MODEL', 'SERVER_LANGUAGE'],
      neutralConcepts: [],
      implementationNotes: '[Stub — FLOW-37] results = await asyncio.gather(*[s.fetch(tenant_id) for s in sources], return_exceptions=True). Filter Exception instances.',
    },
    'php-wordpress:server': {
      tier: 'INCOMPATIBLE',
      stackCategory: 'cms-plugin',
      dimensions: ['SERVER_ASYNC_MODEL'],
      neutralConcepts: [],
      implementationNotes: '',
      incompatible: true,
      incompatibleReason: 'WordPress has no native parallel execution. Fan-in of N parallel async operations (IR-1: all branches run) cannot be implemented within a WordPress page request.',
      mitigation: 'Use php-laravel stack: Bus::batch([EnrichJob::dispatch($src) for $src in $sources])->then(...)->dispatch(). Laravel Horizon required.',
    },
  },
  supportedServerStacks: ['node-nestjs'],
},
```

### T51 — MatchStatusPusher (STACK_COUPLED — realtime push)

```typescript
stackCoupling: {
  entries: {
    'node-nestjs:server': {
      tier: 'STACK_COUPLED',
      stackCategory: 'web-framework',
      dimensions: ['SERVER_DI_FRAMEWORK', 'SERVER_LANGUAGE'],
      neutralConcepts: [
        'Push MatchStatusUpdate to connected client when matching completes',
        'DNA-8: storeDocument() BEFORE push',
        'DNA-5: tenantId scope on all queries',
      ],
      implementationNotes: 'Generate NestJS @Injectable() extending MicroserviceBase. Inject F186 IRealtimePushService via QUEUE FABRIC. Emit MatchingResultsReady CloudEvent. Return Promise<DataProcessResult<PushResult>>.',
    },
    'php-wordpress:server': {
      tier: 'INCOMPATIBLE',
      stackCategory: 'cms-plugin',
      dimensions: ['SERVER_ASYNC_MODEL'],
      neutralConcepts: [],
      implementationNotes: '',
      incompatible: true,
      incompatibleReason: 'WordPress has no persistent WebSocket capability. Realtime push (T51) requires an external JS layer (Pusher, Ably, or Socket.io on a separate server).',
      mitigation: 'Add external realtime service (Pusher/Ably) as a platform dependency. Declare as "firebase-fcm:platform" equivalent in stackCoupling.',
    },
  },
  supportedServerStacks: ['node-nestjs'],
},
```

### T52 — MatchCompletionOrchestrator (IMPL_VARIES)

```typescript
stackCoupling: {
  entries: {
    'node-nestjs:server': {
      tier: 'IMPL_VARIES',
      stackCategory: 'web-framework',
      dimensions: ['SERVER_DI_FRAMEWORK', 'SERVER_LANGUAGE'],
      neutralConcepts: [
        'Orchestrate match completion — emit MatchingCompleted only after all sub-flows done',
        'DNA-8: storeDocument() BEFORE emit',
        'DNA-5: tenantId scope',
      ],
      implementationNotes: 'Generate NestJS @Injectable() extending MicroserviceBase. Inject F187 IMatchCompletionService via constructor. Return Promise<DataProcessResult<MatchResult>>.',
    },
  },
  supportedServerStacks: ['node-nestjs'],
},
```

---

## MATCHING-IN-PROGRESS TOPOLOGY NODE — Angular State Notes (V31)

Add to the `matching-in-progress` node in FLOW-02 topology.json:

```json
"stackCoupling": {
  "entries": {
    "angular:client": {
      "tier": "STACK_COUPLED",
      "stackCategory": "client-spa",
      "dimensions": ["CLIENT_FRAMEWORK", "CLIENT_STATE_MODEL", "CLIENT_ROUTING"],
      "neutralConcepts": ["matching status display", "background signal handling"],
      "stateNotes": {
        "stateHolderType": "BehaviorSubject",
        "stateHolderTypeReason": "T51 completes while user may be on any screen. FlowStateSnapshot push lands in the service — late-subscribing NavigationBadgeComponent must get current state immediately.",
        "stateScope": "feature-scoped",
        "stateScopeReason": "Matching state is specific to the onboarding flow. Root scope would leak state to other flows.",
        "propagationRisk": "HIGH",
        "propagationRiskReason": "4 potential subscribers: OnboardingWizardComponent, NavigationBadgeComponent (always in DOM), DashboardRouteGuard, MatchingResultComponent.",
        "routeGuardRequired": true,
        "stateConsumerMap": {
          "OnboardingWizardComponent": "Primary. async pipe — auto-cleanup.",
          "NavigationBadgeComponent": "Always in DOM. Must use takeUntilDestroyed or async pipe. Scope must match service scope.",
          "DashboardRouteGuard": "CanActivate. Uses first() — no ongoing subscription.",
          "MatchingResultComponent": "Late subscriber after navigation. BehaviorSubject provides current state."
        },
        "note": "DashboardRouteGuard blocks dashboard navigation until matchStatus is not 'not-started'. Must use first() to avoid ongoing subscription."
      }
    }
  }
}
```

---

## SK-418 v1.3 CHECKLIST — FLOW-02 ASSESSMENT

V1–V28: All pass (inherited from v5).

**V29:** T50/T51/T52 all have stackCoupling v2. ✅ PASS
**V30:** T50 php-wordpress INCOMPATIBLE flagged with reason + mitigation. T51 php-wordpress INCOMPATIBLE flagged. ✅ PASS
**V31:** matching-in-progress node has Angular stateNotes (BehaviorSubject, feature-scoped, HIGH risk, blast radius documented). ✅ PASS

**SK-418 v1.3 score: 31/31 ✅**
