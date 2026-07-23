---
name: flow-state-snapshot
sk_number: SK-445
version: "1.0.0"
priority: IMPORTANT
author: luba
updated: "2026-03-23"
description: >
  Protocol for writing and reading FlowStateSnapshot documents in xiigen-flow-state-snapshots.
  Defines the write path (feedback.handler after each task type completion + deferred job completion),
  the read path (GET /api/flow/:flowId/state), the document format, and the C5 client test
  verification protocol. FLOW-02 adds a second write point for background async task completion.
triggers:
  - "flow state snapshot"
  - "FlowStateSnapshot"
  - "appReopenBehavior"
  - "xiigen-flow-state-snapshots"
  - "GET /api/flow"
  - "background state"
  - "C5 test"
  - "app reopen"
---

# flow-state-snapshot

## Purpose

When a user closes and reopens the app mid-flow, the client needs to know:
- Which step in the flow the user is on
- What actions are available at that step
- Whether any background tasks (like matching) completed while the user was away

FlowStateSnapshot captures this state at each task type completion (and deferred job completion).
The GET endpoint serves it on app reopen. Without it, C5 client tests all fail.

---

## When to Invoke

- When implementing feedback.handler (write path)
- When implementing a deferred Bull job (background write path — FLOW-02+)
- When Phase D client tests include appReopenBehavior scenarios
- When debugging C5 test failures ("app reopen shows wrong step")

---

## Document Format

One document per (flowId, correlationId) pair in `xiigen-flow-state-snapshots`:

```json
{
  "snapshotId": "snapshot-{flowId}-{tenantId}-{correlationId}",
  "flowId": "FLOW-01",
  "correlationId": "corr-abc-123",
  "tenantId": "tenant-001",
  "currentStep": "email-verification-pending",
  "completedSteps": ["registration-initiated"],
  "matchStatus": null,
  "availableActions": [
    { "action": "resend-verification-email", "label": "Resend email", "endpoint": "POST /api/flow/T48/resend" },
    { "action": "change-email", "label": "Change email", "endpoint": "POST /api/flow/T48/change-email" }
  ],
  "flowComplete": false,
  "updatedAt": "2026-03-23T12:00:00Z"
}
```

---

## Write Path 1 — Synchronous Task Type Completion

In `feedback.handler.ts` (n8 node), after capturing P5 metrics:

```typescript
// After n7 score >= 0.70 (task type passed)
await this.db.storeDocument('xiigen-flow-state-snapshots', snapshotId, {
  snapshotId: `snapshot-${flowId}-${tenantId}-${correlationId}`,
  flowId,
  correlationId,
  tenantId,
  currentStep: this.getCurrentStep(taskTypeId, contract),
  completedSteps: [...existingSteps, taskTypeId],
  matchStatus: null,
  availableActions: this.getAvailableActions(taskTypeId, contract),
  flowComplete: this.isFlowComplete(taskTypeId, contract),
  updatedAt: new Date().toISOString(),
});
```

**When to write:** After n7 score >= 0.70 (not after every run, only after passing).

---

## Write Path 2 — Background Deferred Job Completion (FLOW-02+)

For T51-style background tasks (Bull job, deferred match result):

```typescript
// In the Bull job processor — after match result is available
async processMatchResult(job: Job) {
  const { correlationId, tenantId, matchStatus } = job.data;

  // Update existing snapshot with match result
  const snapshotId = `snapshot-FLOW-02-${tenantId}-${correlationId}`;
  const existing = await this.db.getDocument('xiigen-flow-state-snapshots', snapshotId);

  await this.db.storeDocument('xiigen-flow-state-snapshots', snapshotId, {
    ...existing,
    currentStep: matchStatus === 'pending' ? 'matching-in-progress' : 'matching-complete',
    matchStatus,
    availableActions: matchStatus !== 'pending'
      ? [{ action: 'view-matches', label: 'View your matches', endpoint: 'GET /api/flow/T51/matches' }]
      : [],
    flowComplete: matchStatus !== 'pending',
    updatedAt: new Date().toISOString(),
  });
}
```

**Why this matters:** Without Write Path 2, app reopen after background match shows stale
"matching in progress" even after matching completed.

---

## Read Path — GET /api/flow/:flowId/state

```typescript
// In FlowStateController (or DynamicController override):
@Get('flow/:flowId/state')
async getFlowState(
  @Param('flowId') flowId: string,
  @Query('correlationId') correlationId: string,
  @Headers('X-Tenant-Id') tenantId: string,
): Promise<FlowStateSnapshot> {
  const snapshotId = `snapshot-${flowId}-${tenantId}-${correlationId}`;
  const result = await this.db.getDocument('xiigen-flow-state-snapshots', snapshotId);

  if (!result.data) {
    return DataProcessResult.failure('SNAPSHOT_NOT_FOUND',
      `No state snapshot for flow ${flowId} / ${correlationId}`);
  }

  return DataProcessResult.success(result.data);
}
```

**Curl test:**
```bash
curl -sf "http://localhost:3000/api/flow/FLOW-01/state?correlationId=corr-test-001" \
  -H "X-Tenant-Id: test-tenant-001" \
  | jq '{currentStep, completedSteps, availableActions}'
```

---

## C5 Client Test Verification Protocol

The C5 test category covers "app reopen behavior." Each test:
1. Completes a task type (e.g., T47 registration)
2. Closes and reopens the app (in test: clears component state, re-renders)
3. Calls GET /api/flow/:flowId/state
4. Asserts correct `currentStep` and `availableActions`

```typescript
// Example C5 test for T47:
describe('C5: app reopen after T47 registration', () => {
  it('shows email verification step with resend action', async () => {
    // Setup: T47 has completed (write path 1 fired)
    await seedFlowStateSnapshot({
      flowId: 'FLOW-01', correlationId: testCorrelationId,
      currentStep: 'email-verification-pending',
      availableActions: [{ action: 'resend-verification-email' }]
    });

    // Act: simulate app reopen
    const { getByTestId } = render(<OnboardingContext correlationId={testCorrelationId} />);

    // Assert
    expect(getByTestId('current-step')).toHaveTextContent('Verify your email');
    expect(getByTestId('action-resend')).toBeInTheDocument();
  });
});
```

---

## How to Seed Test Snapshots for Phase D

```bash
# Seed a test snapshot for C5 tests
curl -sf -X PUT "http://localhost:9200/xiigen-flow-state-snapshots/_doc/snapshot-FLOW-01-test-tenant-001-corr-test-001" \
  -H "Content-Type: application/json" \
  -d '{
    "snapshotId": "snapshot-FLOW-01-test-tenant-001-corr-test-001",
    "flowId": "FLOW-01",
    "correlationId": "corr-test-001",
    "tenantId": "test-tenant-001",
    "currentStep": "email-verification-pending",
    "completedSteps": ["T47"],
    "matchStatus": null,
    "availableActions": [
      { "action": "resend-verification-email", "label": "Resend email", "endpoint": "POST /api/flow/T48/resend" }
    ],
    "flowComplete": false,
    "updatedAt": "2026-03-23T12:00:00Z"
  }'
```

---

## Phase A Gate: Verify Index Exists

```bash
curl -sf http://localhost:9200/xiigen-flow-state-snapshots/_mapping \
  | jq 'keys[0]'
# Expected: "xiigen-flow-state-snapshots"
```

If this returns an error: GAP-04 (FlowStateSnapshot service + write/read path) is not resolved.
Create the index mapping first before proceeding with Phase A.

---

## Hard Rules

- NEVER write a snapshot before the task type scores >= 0.70 — partial/failing runs don't produce snapshots
- NEVER overwrite a snapshot without merging completedSteps (use array union, not replacement)
- NEVER skip Write Path 2 for flows with deferred/background tasks — app reopen will show stale state
- NEVER return 404 from the GET endpoint without checking if the flow simply hasn't completed any steps yet (return empty snapshot instead)
- If GAP-04 is not resolved: seed snapshots directly to ES — do NOT skip C5 tests
