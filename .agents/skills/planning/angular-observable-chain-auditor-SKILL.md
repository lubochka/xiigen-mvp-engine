---
name: SK-433-AngularObservableChainAuditor
version: "1.0.0"
description: >
  Determines the correct Angular observable pattern for every client node
  that carries state: Subject type (Subject/BehaviorSubject/ReplaySubject),
  service scope (feature-module vs root), chain risk level, and whether
  route guards are required. Invoked by SK-431 when Angular is in clientTargets.
  Cannot be skipped for Angular nodes with observable state.
author: luba
updated: "2026-03-22"
layer: planning
requires: [SK-431]
complements: [SK-420]
triggers:
  - angular in clientTargets
  - "BehaviorSubject"
  - "service scope"
  - "observable chain"
  - "CanActivate"
  - "CanDeactivate"
  - "Angular blast radius"
  - any topology node with tier != CONCEPT_NEUTRAL and angular in clientTargets
---

# SK-433 — AngularObservableChainAuditor

## Why Angular Is Different

In React, a state change in one component re-renders that component.
In Angular, state lives in injectable services. A BehaviorSubject in a
root-scoped service propagates to every component that has ever subscribed —
including navigation guards, header badges, and route modules loaded months ago.

This is not a bug in Angular. It is the architecture. But it means the
**blast radius** of a state change in Angular depends entirely on:
1. The type of Subject (does it replay? does it hold last value?)
2. The scope of the service (feature-module vs root)
3. Which components subscribe (directly or via async pipe)
4. Whether subscriptions are properly cleaned up on route exit

The current plans declare `signalType: realtime-push` and leave this
entirely implicit. That is a planning gap — not an implementation concern
that can be deferred.

---

## The Angular Observable Decision Tree

For EVERY node that has:
- `optimisticActions` (any action)
- `appReopenBehavior`
- `backgroundSteps` with `realtime-push` or `new-content-available-banner`
- `requiresDraftState: true`

Run this decision tree:

### Decision 1: Service Scope

```
Ask: Does this state need to survive navigation to other routes?
  - App reopen behavior: YES → BehaviorSubject, feature-module with reset on destroy
  - SLA countdown visible in header: YES → might need root scope
  - Registration button state: NO → component-local (useState equivalent in Angular)
  - Background matching result: YES → BehaviorSubject, feature-module

Rule:
  State that drives what the USER SEES on THIS SCREEN → feature-module scope
  State that drives navigation or global UI (badges, breadcrumbs) → root scope
  State that is component-local (one button) → no service, local variable

If root-scoped:
  → Explicit reset required: ngOnDestroy in service or route exit hook
  → observableChainRisk: HIGH (minimum)
  → Document which other route modules consume this state
```

### Decision 2: Subject Type

```
Subject:
  Use when: subscribers only need FUTURE events (no history, no current value)
  Example: "flash notification on action success" — subscriber only cares
           about new notifications, not the last one
  Replay on late subscribe: NO
  
BehaviorSubject:
  Use when: late subscribers (component navigating back, app reopening)
           need to receive the CURRENT state immediately
  Example: "awaiting-email-verification: restore countdown on reopen"
           "onboarding-wizard: restore at current step"
           "matching-in-progress: show current match status"
  Replay on late subscribe: YES (last value only)
  
ReplaySubject(N):
  Use when: a new subscriber needs the last N events (rare, justify explicitly)
  Example: "analytics event stream" — subscriber needs recent history
  Replay on late subscribe: YES (last N values)
  Warning: ReplaySubject accumulates memory. N must be bounded. Document N.
  Default: avoid unless you can articulate why last value (BehaviorSubject) is insufficient.

Rule: If in doubt between Subject and BehaviorSubject → BehaviorSubject.
Reason: app reopen after network loss almost always needs current state.
```

### Decision 3: Route Guard Requirement

```
CanActivate guard (resolve before route loads):
  Use when: the route should not activate if the flow is in a certain state
  Example: "registration-in-progress: if stale > 30s, redirect to RegistrationFailed BEFORE component loads"
  Implementation: CanActivateFn that injects the flow state service,
                  checks state, returns Observable<boolean | UrlTree>
  
CanDeactivate guard (confirm before route exits):
  Use when: the user is about to lose unsaved state
  Example: "event-creation draft: if user navigates away, show recovery prompt"
           (requiresDraftState: true + server-side-effect present)
  Implementation: CanDeactivateFn<T extends { canDeactivate(): Observable<boolean> }>
  Note: this is the Angular equivalent of React Router's useBlocker hook
        or beforeRouteLeave in Vue Router

Neither guard needed:
  When the component handles all state transitions internally
  (component subscribes, updates, unsubscribes via async pipe)
```

### Decision 4: Subscription Cleanup

```
Always prefer: async pipe in template
  <span>{{ resendState$ | async }}</span>
  Angular automatically subscribes and unsubscribes. No leak possible.

If imperative subscription is needed:
  Use takeUntilDestroyed(this.destroyRef) (Angular 16+)
  Or: private destroy$ = new Subject<void>(); + takeUntil(this.destroy$)
  NEVER: subscribe() without unsubscribe mechanism → guaranteed memory leak

The functional spec arbiter MUST check:
  Any explicit .subscribe() call without takeUntilDestroyed or async pipe
  = SCORE 0 violation (memory leak in long-lived Angular app)
```

---

## Output Format

For each topology node with Angular client concerns:

```typescript
angularNotes: {
  // Which type to use and why
  subjectType: 'BehaviorSubject',
  subjectTypeReason: 'App reopen requires restoring SLA countdown — late subscriber (component navigating back) must receive current remainingMs immediately.',
  
  // Where the service lives and why
  serviceScope: 'feature-module',
  serviceScopeReason: 'State belongs to the email verification screen only. Using root scope would keep the countdown observable alive during unrelated navigation.',
  
  // How many Angular constructs subscribe
  observableChainRisk: 'MEDIUM',
  observableChainRiskReason: '2–3 subscribers expected: VerificationWaitingComponent (primary), HeaderTimerComponent (shows remaining time in header), VerificationExpiredGuard (CanActivate).',
  
  // Route guards
  routeGuardRequired: false,
  canDeactivateRequired: false,
  
  // Specific note for the generator
  note: 'VerificationExpiredGuard should be implemented as a CanActivateFn that injects EmailVerificationService, checks if sla.isBreached, and returns a UrlTree redirect to /verification-expired if true. This handles the appReopenBehavior at the router level — the component never needs to perform the redirect itself.',
}
```

---

## Blast Radius Table

For every HIGH-risk node, document the subscription map:

```
Node: matching-in-progress (FLOW-02 T51)
Angular blast radius analysis:

Service: MatchingStatusService (feature-module: BusinessOnboardingModule)
Subject type: BehaviorSubject<MatchingStatus>

Subscribers:
  1. OnboardingWizardComponent (primary — shows spinner during matching)
     → async pipe: (matchingStatus$ | async) — ✅ auto-cleanup
  2. NavigationBadgeComponent (optional — shows "Matching..." badge in nav)
     → If added: must check if it subscribes to root or feature service
        If feature-scoped: badge disappears on route exit (intended)
        If root-scoped: badge persists across navigation (possibly intended — document)
  3. DashboardRouteGuard (CanActivate on /dashboard)
     → May check matchingStatus to enable dashboard link
     → Must use first() or take(1) — does not need ongoing subscription

Risk: MEDIUM
  If NavigationBadgeComponent subscribes to a root-scoped service copy,
  and MatchingStatusService is feature-scoped, they will not receive
  the same state. This is a class of bug invisible in React.
  
Mitigation: declare explicitly in plan whether NavigationBadgeComponent
exists and which service scope it uses.
```

---

## Integration with SK-431

SK-431 StackCouplingAuditor calls SK-433 when:
```
clientTargets includes 'angular'
AND
node.client.tier in ['IMPL_VARIES', 'STACK_COUPLED']
```

SK-433 output is written to:
```
topology.json → nodes[nodeId].stackCoupling.client.angularNotes
```

And referenced (not duplicated) in:
```
flow reference plan → Pass 3 CLIENT STATE MAP → per-node Angular notes
```

---

## Hard Rules

```
NEVER declare angularNotes.subjectType without angularNotes.subjectTypeReason.

NEVER use ReplaySubject without documenting the value of N and why
BehaviorSubject (last value only) was insufficient.

NEVER declare a node as CONCEPT_NEUTRAL for Angular if it has optimisticActions
or appReopenBehavior — these always require Subject type decisions.

NEVER skip the blast radius table for HIGH-risk nodes.

ALWAYS check: does the functional spec arbiter's code check verify
the Subject type in generated Angular code? If not, add it to the arbiter spec.
```
