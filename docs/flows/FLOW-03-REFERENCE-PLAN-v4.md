# FLOW-03: EVENT CREATION & MANAGEMENT — REFERENCE PLAN v4
## Stack coupling annotations integrated (SK-431 + FLOW-00.2 prerequisite)
## V29/V30/V31 added to SK-418 checklist (31/31 ✅)
## Updated: 2026-03-22 (v4)
## Prerequisites: FLOW-02 complete + FLOW-00.2 complete ← NEW v4

---

## WHAT CHANGED FROM v3

| What v3 had | What v4 adds |
|-------------|-------------|
| Prerequisite: FLOW-00.1 complete | Prerequisite: FLOW-00.2 complete |
| SK-418 checklist: V1–V28 | SK-418 checklist: V1–V31 (31 items) |
| SESSION-0: FC-1 through FC-18 | SESSION-0: FC-19, FC-20, FC-21 added |
| No stackCoupling on T59/T60/T61/T62 | stackCoupling v2 on all task types |
| No WordPress INCOMPATIBLE flags | T60 php-wordpress INCOMPATIBLE (atomic transaction) |
| No Angular state notes | StateArchitectureNotes on event-creation (draft state) node |
| STATE.json: no stackTargets | STATE.json: stackTargets + clientTargets added |

---

## STATE.json (v4)

```json
{
  "flow_id": "FLOW-03",
  "flow_name": "Event Creation & Management",
  "stackTargets": ["node-nestjs"],
  "clientTargets": ["react-web"],
  "parallel_wave": null,
  "wave": 2,
  "current_phase": "session-0",
  "completed_phases": [],
  "test_baseline": null
}
```

---

## SESSION-0 ADDITIONS (FC-19, FC-20, FC-21)

### FC-19: stackCoupling present on all FLOW-03 task types (V29)
All T59/T60/T61/T62 must have `entries: { 'node-nestjs:server': { ... } }` structure.

### FC-20: T60 php-wordpress INCOMPATIBLE flagged (V30)
T60 EventRegistrationManager requires atomic transactions — WordPress $wpdb does not support them reliably.

### FC-21: Angular stateNotes on event-creation (draft state) node (V31)
The event-creation wizard node must declare `stateNotes` with stateHolderType, stateScope, propagationRisk.
`canDeactivateRequired: true` — draft recovery prompt on navigation away.

---

## STACK COUPLING ANNOTATIONS FOR FLOW-03 TASK TYPES

### T59 — EventCreationOrchestrator (IMPL_VARIES)

```typescript
stackCoupling: {
  entries: {
    'node-nestjs:server': {
      tier: 'IMPL_VARIES',
      stackCategory: 'web-framework',
      dimensions: ['SERVER_DI_FRAMEWORK', 'SERVER_LANGUAGE'],
      neutralConcepts: [
        'Orchestrate multi-step event creation — persist each step before emitting completion',
        'requiresDraftState: true — partial form persisted server-side between steps',
        'DNA-8: storeDocument() BEFORE enqueue() on every step',
        'DNA-5: tenantId scope',
      ],
      implementationNotes: 'Generate NestJS @Injectable() extending MicroserviceBase. Inject factory deps via constructor. Return Promise<DataProcessResult<EventCreationResult>>.',
    },
  },
  supportedServerStacks: ['node-nestjs'],
},
```

### T60 — EventRegistrationManager (STACK_COUPLED — atomic transaction)

```typescript
stackCoupling: {
  entries: {
    'node-nestjs:server': {
      tier: 'STACK_COUPLED',
      stackCategory: 'web-framework',
      dimensions: ['SERVER_DATA_ACCESS', 'SERVER_LANGUAGE'],
      neutralConcepts: [
        'Capacity check AND registration creation MUST be atomic — no phantom reads',
        'RegistrationFailed emitted if capacity already full at check time',
        'No PII in RegistrationCreated event',
        'DNA-8: storeDocument() BEFORE enqueue()',
      ],
      implementationNotes: 'Generate NestJS @Injectable() extending MicroserviceBase. Use TypeORM transaction() or Prisma $transaction() to atomically check capacity and create registration. Return Promise<DataProcessResult<RegistrationResult>>.',
    },
    'php-wordpress:server': {
      tier: 'INCOMPATIBLE',
      stackCategory: 'cms-plugin',
      dimensions: ['SERVER_DATA_ACCESS'],
      neutralConcepts: [],
      implementationNotes: '',
      incompatible: true,
      incompatibleReason: 'WordPress $wpdb does not support reliable atomic transactions across multiple tables. The capacity check + registration creation cannot be made atomic, creating race conditions under load.',
      mitigation: 'Use php-laravel stack: DB::transaction(fn() => { Event::lockForUpdate()->find($id); Registration::create(...); }) with Eloquent. Full ORM transaction support available.',
    },
  },
  supportedServerStacks: ['node-nestjs'],
},
```

### T61 — EventStatusBroadcaster (STACK_COUPLED — realtime push)

```typescript
stackCoupling: {
  entries: {
    'node-nestjs:server': {
      tier: 'STACK_COUPLED',
      stackCategory: 'web-framework',
      dimensions: ['SERVER_DI_FRAMEWORK', 'SERVER_LANGUAGE'],
      neutralConcepts: [
        'Broadcast EventStatusUpdated to all registered attendees when status changes',
        'DNA-8: storeDocument() BEFORE push',
      ],
      implementationNotes: 'Generate NestJS @Injectable() extending MicroserviceBase. Inject F-REF IEventBroadcastService via QUEUE FABRIC. Return Promise<DataProcessResult<BroadcastResult>>.',
    },
    'php-wordpress:server': {
      tier: 'INCOMPATIBLE',
      stackCategory: 'cms-plugin',
      dimensions: ['SERVER_ASYNC_MODEL'],
      neutralConcepts: [],
      implementationNotes: '',
      incompatible: true,
      incompatibleReason: 'WordPress cannot maintain persistent connections for realtime broadcast. wp_cron cannot reliably push status updates to many clients.',
      mitigation: 'External realtime service (Pusher/Ably) required as platform dependency.',
    },
  },
  supportedServerStacks: ['node-nestjs'],
},
```

### T62 — EventMediaProcessor (IMPL_VARIES)

```typescript
stackCoupling: {
  entries: {
    'node-nestjs:server': {
      tier: 'IMPL_VARIES',
      stackCategory: 'web-framework',
      dimensions: ['SERVER_DI_FRAMEWORK', 'SERVER_LANGUAGE'],
      neutralConcepts: [
        'Process uploaded event media (images, videos) — compress and CDN-store',
        'Media URLs stored in DATABASE FABRIC, never hardcoded',
        'DNA-8: storeDocument() BEFORE enqueue()',
      ],
      implementationNotes: 'Generate NestJS @Injectable() extending MicroserviceBase. Inject media processing factory via constructor. Return Promise<DataProcessResult<MediaResult>>.',
    },
  },
  supportedServerStacks: ['node-nestjs'],
},
```

---

## EVENT-CREATION TOPOLOGY NODE — Angular State Notes (V31)

**Note on EventRegistrationManager:** The v3 plan documented the `EventRegistrationManager`
class name exception (it uses a noun-first pattern rather than verb-first). This exception
stands in v4 — the naming convention note from v3 is unchanged.

Add to the `event-creation` (wizard) node in FLOW-03 topology.json:

```json
"stackCoupling": {
  "entries": {
    "angular:client": {
      "tier": "STACK_COUPLED",
      "stackCategory": "client-spa",
      "dimensions": ["CLIENT_FRAMEWORK", "CLIENT_STATE_MODEL", "CLIENT_LIFECYCLE", "CLIENT_ROUTING"],
      "neutralConcepts": ["multi-step form state", "draft persistence", "step navigation"],
      "stateNotes": {
        "stateHolderType": "BehaviorSubject",
        "stateHolderTypeReason": "Multi-step form state must survive step navigation. BehaviorSubject in WizardFormService provides current form state to each step component.",
        "stateScope": "feature-scoped",
        "stateScopeReason": "Event creation form is confined to EventCreationModule. Root scope would persist partial form state across unrelated navigation.",
        "propagationRisk": "MEDIUM",
        "propagationRiskReason": "3 subscribers: EventDetailsComponent, EventPricingComponent, EventMediaComponent (one per step).",
        "routeGuardRequired": false,
        "exitGuardRequired": true,
        "note": "CanDeactivate guard required for recovery prompt when user navigates away from draft. Angular equivalent of React Router's useBlocker. WizardFormService must implement ngOnDestroy to reset form state on module unload."
      }
    }
  }
}
```

---

## SK-418 v1.3 CHECKLIST — FLOW-03 ASSESSMENT

V1–V28: All pass (inherited from v3).

**V29:** T59/T60/T61/T62 all have stackCoupling v2. ✅ PASS
**V30:** T60 php-wordpress INCOMPATIBLE (atomic transaction). T61 php-wordpress INCOMPATIBLE (realtime push). Both have reason + mitigation. ✅ PASS
**V31:** event-creation node has Angular stateNotes (BehaviorSubject, feature-scoped, MEDIUM risk, exitGuardRequired: true for draft recovery). ✅ PASS

**SK-418 v1.3 score: 31/31 ✅**
