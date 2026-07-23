# FLOW-04: EVENT CHECK-IN & VALIDATION — REFERENCE PLAN v3
## Stack coupling annotations integrated (SK-431 + FLOW-00.2 prerequisite)
## V29/V30/V31 added to SK-418 checklist (31/31 ✅)
## Updated: 2026-03-22 (v3)
## Prerequisites: FLOW-03 complete + FLOW-00.2 complete ← NEW v3

---

## WHAT CHANGED FROM v2

| What v2 had | What v3 adds |
|-------------|-------------|
| Prerequisite: FLOW-00.1 complete | Prerequisite: FLOW-00.2 complete |
| SK-418 checklist: V1–V28 | SK-418 checklist: V1–V31 (31 items) |
| SESSION-0: FC-1 through FC-18 | SESSION-0: FC-19, FC-20, FC-21 added |
| No stackCoupling on T63/T64/T65/T66 | stackCoupling v2 on all task types |
| No WordPress/PHP-server INCOMPATIBLE flags | T65 php-server-rendered INCOMPATIBLE (QR scan) |
| No Angular state notes | StateArchitectureNotes on check-in node |
| STATE.json: no stackTargets | STATE.json: stackTargets + clientTargets added |

---

## STATE.json (v3)

```json
{
  "flow_id": "FLOW-04",
  "flow_name": "Event Check-In & Validation",
  "stackTargets": ["node-nestjs"],
  "clientTargets": ["react-web"],
  "parallel_wave": null,
  "wave": 3,
  "current_phase": "session-0",
  "completed_phases": [],
  "test_baseline": null
}
```

---

## SESSION-0 ADDITIONS (FC-19, FC-20, FC-21)

### FC-19: stackCoupling present on all FLOW-04 task types (V29)
All T63/T64/T65/T66 must have `entries: { 'node-nestjs:server': { ... } }` structure.

### FC-20: T65 php-server-rendered INCOMPATIBLE flagged (V30)
QR code scanning requires camera access — PHP server-rendered pages cannot access the device camera.

### FC-21: Angular stateNotes on check-in node (V31)
The `check-in` topology node must declare `stateNotes`. T65 QR scanning is STACK_COUPLED on CLIENT_FRAMEWORK.

---

## STACK COUPLING ANNOTATIONS FOR FLOW-04 TASK TYPES

### T63 — RSVPOrchestrator (STACK_COUPLED — atomic capacity decrement)

```typescript
stackCoupling: {
  entries: {
    'node-nestjs:server': {
      tier: 'STACK_COUPLED',
      stackCategory: 'web-framework',
      dimensions: ['SERVER_DATA_ACCESS', 'SERVER_LANGUAGE'],
      neutralConcepts: [
        'RSVP AND capacity decrement MUST be atomic — no overselling',
        'RSVPFailed emitted if capacity = 0 at check time',
        'No PII in RSVPConfirmed event',
        'DNA-8: storeDocument() BEFORE enqueue()',
      ],
      implementationNotes: 'Generate NestJS @Injectable() extending MicroserviceBase. Use TypeORM transaction() to atomically decrement capacity and create RSVP record. Return Promise<DataProcessResult<RSVPResult>>.',
    },
    'php-wordpress:server': {
      tier: 'INCOMPATIBLE',
      stackCategory: 'cms-plugin',
      dimensions: ['SERVER_DATA_ACCESS'],
      neutralConcepts: [],
      implementationNotes: '',
      incompatible: true,
      incompatibleReason: 'WordPress $wpdb does not support reliable atomic transactions. Race conditions possible under concurrent RSVP load.',
      mitigation: 'Use php-laravel: DB::transaction(fn() => { Event::lockForUpdate()->find($id); RSVP::create(...); }).',
    },
  },
  supportedServerStacks: ['node-nestjs'],
},
```

### T64 — CheckInWaitState (STACK_COUPLED — long-running background)

```typescript
stackCoupling: {
  entries: {
    'node-nestjs:server': {
      tier: 'STACK_COUPLED',
      stackCategory: 'web-framework',
      dimensions: ['SERVER_ASYNC_MODEL', 'SERVER_DI_FRAMEWORK'],
      neutralConcepts: [
        'Wait for attendee check-in for event duration — state machine',
        'CheckInExpired emitted when event end time passes without check-in',
        'DNA-8: storeDocument() BEFORE any state transition emit',
      ],
      implementationNotes: 'Generate NestJS service with Bull/BullMQ or @Cron() for expiry check. Return Promise<DataProcessResult<CheckInWaitState>>.',
    },
    'php-wordpress:server': {
      tier: 'INCOMPATIBLE',
      stackCategory: 'cms-plugin',
      dimensions: ['SERVER_ASYNC_MODEL'],
      neutralConcepts: [],
      implementationNotes: '',
      incompatible: true,
      incompatibleReason: 'wp_cron is page-load triggered — unreliable for event-duration wait states. Events may never expire if no page load occurs during the event window.',
      mitigation: 'Use php-laravel with Laravel Scheduler for reliable event expiry.',
    },
  },
  supportedServerStacks: ['node-nestjs'],
},
```

### T65 — CheckInValidator (STACK_COUPLED — QR scanning on client)

```typescript
stackCoupling: {
  entries: {
    'node-nestjs:server': {
      tier: 'IMPL_VARIES',
      stackCategory: 'web-framework',
      dimensions: ['SERVER_DI_FRAMEWORK', 'SERVER_LANGUAGE'],
      neutralConcepts: [
        '60s TTL is MACHINE constant — never FREEDOM config (timing-critical)',
        'Anti-replay via SETNX — CheckIn idempotent within 60s window',
        'Audit write BEFORE CheckInValidated emit (DNA-8)',
      ],
      implementationNotes: 'Generate NestJS @Injectable() extending MicroserviceBase. SETNX on check-in token with 60s TTL. Return Promise<DataProcessResult<ValidationResult>>.',
    },
    'react-web:client': {
      tier: 'STACK_COUPLED',
      stackCategory: 'client-spa',
      dimensions: ['CLIENT_FRAMEWORK'],
      neutralConcepts: ['Scan QR code from camera', 'Decode token', 'Submit to server'],
      implementationNotes: 'Use html5-qrcode or quagga.js library. Camera permission required. Submit decoded token via API call.',
    },
    'angular:client': {
      tier: 'STACK_COUPLED',
      stackCategory: 'client-spa',
      dimensions: ['CLIENT_FRAMEWORK'],
      neutralConcepts: ['Scan QR code from camera', 'Decode token', 'Submit to server'],
      implementationNotes: 'Use ngx-scanner library. CanActivate guard to check camera permissions before route loads.',
    },
    'android-kotlin:client': {
      tier: 'STACK_COUPLED',
      stackCategory: 'mobile-native',
      dimensions: ['CLIENT_FRAMEWORK'],
      neutralConcepts: ['Scan QR code from camera'],
      implementationNotes: 'CameraX + ML Kit Barcode Scanning. Runtime permission check (Manifest.permission.CAMERA).',
    },
    'ios-swift:client': {
      tier: 'STACK_COUPLED',
      stackCategory: 'mobile-native',
      dimensions: ['CLIENT_FRAMEWORK'],
      neutralConcepts: ['Scan QR code from camera'],
      implementationNotes: 'AVFoundation + Vision framework. NSCameraUsageDescription required in Info.plist.',
    },
    'php-server-rendered:client': {
      tier: 'INCOMPATIBLE',
      stackCategory: 'client-ssr',
      dimensions: ['CLIENT_FRAMEWORK'],
      neutralConcepts: [],
      implementationNotes: '',
      incompatible: true,
      incompatibleReason: 'PHP server-rendered pages cannot access device camera via HTML5 getUserMedia API. QR scanning requires a client-side JS environment.',
      mitigation: 'Embed a React or Vue component within the PHP template for the check-in scanning screen.',
    },
    'php-wordpress-plugin:client': {
      tier: 'INCOMPATIBLE',
      stackCategory: 'cms-plugin',
      dimensions: ['CLIENT_FRAMEWORK'],
      neutralConcepts: [],
      implementationNotes: '',
      incompatible: true,
      incompatibleReason: 'Same as php-server-rendered. WordPress plugin PHP pages cannot access camera without a JavaScript component layer.',
      mitigation: 'Add a dedicated Gutenberg block with React component for QR scanning.',
    },
  },
  supportedServerStacks: ['node-nestjs'],
},
```

### T66 — CheckInConfirmationEmitter (IMPL_VARIES)

```typescript
stackCoupling: {
  entries: {
    'node-nestjs:server': {
      tier: 'IMPL_VARIES',
      stackCategory: 'web-framework',
      dimensions: ['SERVER_DI_FRAMEWORK', 'SERVER_LANGUAGE'],
      neutralConcepts: [
        'Emit CheckInConfirmed after successful validation',
        'DNA-8: storeDocument() BEFORE enqueue()',
      ],
      implementationNotes: 'Generate NestJS @Injectable() extending MicroserviceBase. Return Promise<DataProcessResult<ConfirmationResult>>.',
    },
  },
  supportedServerStacks: ['node-nestjs'],
},
```

---

## CHECK-IN TOPOLOGY NODE — Angular State Notes (V31)

Add to the `check-in` node in FLOW-04 topology.json:

```json
"stackCoupling": {
  "entries": {
    "angular:client": {
      "tier": "STACK_COUPLED",
      "stackCategory": "client-spa",
      "dimensions": ["CLIENT_FRAMEWORK", "CLIENT_STATE_MODEL", "CLIENT_ROUTING"],
      "neutralConcepts": ["QR scan result", "validation feedback"],
      "stateNotes": {
        "stateHolderType": "Subject",
        "stateHolderTypeReason": "Check-in scan result is a one-time event — no late subscriber needs the last value. Subject (not BehaviorSubject) is correct.",
        "stateScope": "feature-scoped",
        "stateScopeReason": "Check-in state is specific to the check-in screen. Destroyed on route exit.",
        "propagationRisk": "LOW",
        "propagationRiskReason": "1 subscriber: CheckInComponent. Displays scan result and clears after 3s.",
        "routeGuardRequired": false,
        "note": "CanActivate guard needed to check camera permissions BEFORE route loads — not for state reasons, but for UX (avoid loading screen and then permission denial). Implement as CanActivateFn checking navigator.permissions.query({ name: 'camera' })."
      },
      "incompatibleFrameworks": {
        "php-server-rendered": "Cannot access camera API — QR scanning requires JS environment",
        "php-wordpress-plugin": "Same — requires JS component layer (Gutenberg block)"
      }
    }
  }
}
```

---

## SK-418 v1.3 CHECKLIST — FLOW-04 ASSESSMENT

V1–V28: All pass (inherited from v2).

**V29:** T63/T64/T65/T66 all have stackCoupling v2. ✅ PASS
**V30:** T63 php-wordpress INCOMPATIBLE (atomic transaction). T64 php-wordpress INCOMPATIBLE (long-running background). T65 php-server-rendered and php-wordpress-plugin INCOMPATIBLE (QR scan — no camera API). All have reason + mitigation. ✅ PASS
**V31:** check-in node has Angular stateNotes (Subject — one-time event, feature-scoped, LOW risk). Also has incompatibleFrameworks for PHP clients. ✅ PASS

**SK-418 v1.3 score: 31/31 ✅**
