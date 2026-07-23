# PATCH: planning--simulation-protocol-SKILL.md — Add CROSS_FLOW_TRACE mode
## Applies to: planning--simulation-protocol-SKILL.md (SK-441)
## Version: v2.1.0 | Date: 2026-03-26
## Source: Skills gap analysis — cross-flow boundary simulation

---

## HOW TO APPLY

Insert the `CROSS_FLOW_TRACE` section AFTER the existing L3 level description
and BEFORE the "SILENT_FAILURE PATTERNS" section.

Also add `CROSS_FLOW_TRACE` to the triggers list in the YAML front matter.

---

## ADDITION: CROSS_FLOW_TRACE triggers (add to YAML triggers)

```yaml
  - "trace across flows"
  - "cross-flow simulation"
  - "event from one flow consumed by another"
  - "cross-flow boundary"
  - "userId propagation"
  - "does the invariant hold across flows"
  - "FLOW-01 to FLOW-25"
```

---

## ADDITION: CROSS_FLOW_TRACE protocol

Insert after the L3 section description:

---

## CROSS_FLOW_TRACE — Simulating Event Boundaries Between Flows

Single-flow simulation (L1/L2/L3) cannot catch invariant violations that only
appear at the boundary between two flows. The userId hyphen-stripping failure is
the canonical example: the violation exists neither in FLOW-01's handlers nor in
FLOW-25's handlers — it exists in the intermediate handler that transforms the
field while passing it between them.

**Use CROSS_FLOW_TRACE when:**
- A capability in FLOW-A emits an event that a capability in FLOW-B consumes
- A field value passes through multiple services before reaching its final destination
- A BFA CF rule was written to govern cross-flow interaction
- Planning a new flow that consumes events from an existing flow

---

### The cross-flow trace protocol

**Step 1: Identify the emission point**

Find the task type in FLOW-A that emits the event of interest.

```
FLOW-01 T47 emits: UserRegistrationInitiated
  payload: { userId: UUID-v4, correlationId, tenantId, authPathway }
```

**Step 2: Find all registered consumers**

Query `xiigen-rag-patterns` for CROSS_FLOW_DEPENDENCY patterns with this event as source:

```bash
curl -sf "localhost:9200/xiigen-rag-patterns/_search" \
  -d '{"query":{"bool":{"must":[
    {"term":{"patternType.keyword":"CROSS_FLOW_DEPENDENCY"}},
    {"match":{"content":"UserRegistrationInitiated"}}
  ]}}}' | jq '.hits.hits[]._source | {flowId, taskType, eventConsumed}'
```

Also check flow contracts directly:
```bash
grep -rn "UserRegistrationInitiated" server/src/engine-contracts/ --include="*.ts" \
  | grep "consumes\|CONSUMES\|subscribe" | head -10
```

**Step 3: Trace each consumer's handler**

For each consumer, produce a cross-boundary step table:

```
Event: UserRegistrationInitiated
Source: FLOW-01 T47 (UserRegistrationInitiator)
Consumer: FLOW-25 T225 (BFAConflictRegistry)

| Step | Handler | Input available? | Transformation applied? | Output |
|------|---------|-----------------|------------------------|--------|
| T47 emits | ai-generate | userId: UUID-v4 with hyphens | none | event payload |
| Queue transit | none (queue) | userId: unchanged | UNKNOWN — check handler | forwarded payload |
| T225 receives | rag-retrieve | userId field | VERIFY: does any handler strip hyphens? | used in BFA key |
```

**Step 4: Check each transformation point**

At every point where the field passes through a handler that is not in the flow topology,
ask: **Is the field transformed before it reaches its destination?**

```
Transformation sources to check:
  - Queue consumer handlers (between emit and receive)
  - Middleware (tenant scoping, auth)
  - Adapter layers (if any)
  - Serialization/deserialization (JSON parse/stringify can alter types)
```

**Step 5: Check combined invariants at the boundary**

For each invariant in FLOW-A's contracts that involves the shared field,
and each invariant in FLOW-B's contracts that involves the same field:

```
FLOW-01 T47 invariant: userId is UUID-v4 with hyphens (CF-2 idempotency key format)
FLOW-25 invariant: BFA key lookup uses userId as-is

Combined check: if any intermediate handler strips hyphens from userId,
the BFA key lookup in FLOW-25 will fail to find FLOW-01's record.
Result: SILENT_FAILURE — no error thrown, BFA conflict detection misses the case.
```

---

### Cross-flow trace verdict

Use the same verdict vocabulary as single-flow simulation:

```
WORKS:          combined invariants hold at the boundary; no transformation issues
BREAKS:         boundary invariant violated; visible error produced
SILENT_FAILURE: boundary invariant violated; no visible error; wrong behavior shipped
UNKNOWN:        intermediate handler behavior not verified; cannot assess
```

`UNKNOWN` is a gap, not a verdict. If UNKNOWN is returned, inspect the intermediate
handler before accepting the trace result.

---

### When cross-flow simulation is mandatory

Run CROSS_FLOW_TRACE before any flow is planned that:
- Consumes events from an existing ACTIVE flow
- Introduces a new BFA CF rule
- Modifies the payload schema of an event consumed by another flow
- Uses a field value that was set in a different flow (userId, correlationId, tenantId)

---

## ADDITION: Update INTEGRATION section

Add to INTEGRATION references:
```
CROSS_FLOW_TRACE → feeds into planning--cross-flow-dependency-SKILL.md (cross-flow design)
```

---

## ADDITION: Update triggers in YAML (add to existing list)

```
  - "trace across flows"
  - "cross-flow simulation"
  - "event from one flow consumed by another"
  - "cross-flow boundary"
  - "invariant across flows"
```
