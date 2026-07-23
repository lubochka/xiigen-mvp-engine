# Rule 5: Boundary Message Map

## What It Catches

Event/queue message schema mismatches between producer and consumer — a station or service publishes a message in one shape, and the consumer expects a different shape. Silent data loss or default fallback results.

## The Problem

In XIIGen's queue fabric (SQS, in-memory), producers and consumers define their own message schemas independently. When these drift apart, the consumer silently receives `undefined` for fields it needs. No schema validation at the queue boundary means bugs are invisible until runtime.

## Common Mismatch Patterns

| Producer writes | Consumer reads | Result |
|----------------|----------------|--------|
| `{ taskId, tenantId, payload }` | `{ taskId, context }` | `context` is undefined — consumer uses default |
| `{ event: "order.completed" }` | `{ eventType: "order.completed" }` | Wrong field name — consumer never matches |
| `{ data: { orderId } }` | `{ orderId }` (flat) | Nested vs flat — consumer reads undefined |
| `{ timestamp: Date }` | `{ timestamp: string }` | Type mismatch — serialization produces wrong value |

## BFA-Specific Pattern (Class E Bug)

Two flows publishing the same event causes consumers to process the same logical event twice. This is not a schema mismatch but a message collision.

```
FLOW-32: publishes order.completed { orderId, tenantId }
FLOW-08: publishes order.completed { orderId, tenantId }
Consumer: processes both → duplicate downstream effects

BFA cross-flow check catches this before runtime.
If seen at runtime → Class E bug → file immediately.
```

## Checklist

```
☐ Read the PRODUCER: what exact fields are published in the message envelope?
☐ Read the CONSUMER: what exact fields does it destructure or read?
☐ Compare field names exactly (camelCase vs snake_case, event vs eventType)
☐ Compare nesting: flat vs nested payload
☐ Compare types: Date vs string, number vs string
☐ Is there a dedup ID? SQS consumer groups require dedup to prevent double processing.
☐ BFA check: are two separate flows publishing the same event type?
☐ If consumer has default fallback: is that fallback hiding the schema mismatch?
```

## Trace Protocol

1. Find the `enqueue()` call — read the exact message object passed
2. Find the `@Subscribe()` or consumer handler — read the exact destructured fields
3. Diff them side by side
4. If any field is absent in the consumer read but present in the producer write → mismatch
5. Check CloudEvents wrapper compliance (DNA-9): message must be wrapped in CloudEvents envelope

## Anti-Pattern

"The consumer has a default value so it still works." A default value masking a schema mismatch is a silent bug, not working code. The test for correctness is: remove the default — does the consumer still produce the right output? If not, fix the schema.
