# Fabric Interfaces Reference

## Design Principle

Every component talks ONLY through fabric interfaces. Providers are the boundary where specific SDKs are imported. Everything above the provider uses the abstract interface.

**v4 Critical Change:** No `tenant_id` parameter on any fabric method. Providers read TenantContext from AsyncLocalStorage internally. This is by design — callers cannot forget tenant scoping.

---

## DATABASE FABRIC

**Interface:** `IDatabaseService` — `fabrics/interfaces/database.interface.ts`
**Token:** `DATABASE_SERVICE`
**Providers:** InMemory, Elasticsearch, PostgreSQL

```typescript
abstract class IDatabaseService {
  abstract storeDocument(index: string, document: Record<string, unknown>, docId?: string)
    : Promise<DataProcessResult<Record<string, unknown>>>;
  abstract searchDocuments(index: string, filters: Record<string, unknown>, size?: number, fromOffset?: number)
    : Promise<DataProcessResult<Array<Record<string, unknown>>>>;
  abstract getDocument(index: string, docId: string)
    : Promise<DataProcessResult<Record<string, unknown>>>;
  abstract deleteDocument(index: string, docId: string)
    : Promise<DataProcessResult<boolean>>;
  abstract bulkStore(index: string, documents: Array<Record<string, unknown>>)
    : Promise<DataProcessResult<Record<string, unknown>>>;
  abstract countDocuments(index: string, filters: Record<string, unknown>)
    : Promise<DataProcessResult<number>>;
}
```

**Pattern per fabric:** interface → `database-service.factory.ts` → `fabric-resolver.ts` → `provider-registry.ts` → N provider files

---

## QUEUE FABRIC

**Interface:** `IQueueService` — `fabrics/interfaces/queue.interface.ts`
**Token:** `QUEUE_SERVICE`
**Providers:** InMemory, SQS
**Pattern:** Main → Consumed → Archive → DLQ

```typescript
abstract class IQueueService {
  abstract enqueue(eventType: string, data: Record<string, unknown>, deduplicationId?: string)
    : Promise<DataProcessResult<string>>;
  abstract dequeue(queueName: string, maxMessages?: number, waitTimeSeconds?: number)
    : Promise<DataProcessResult<Array<Record<string, unknown>>>>;
  abstract acknowledge(queueName: string, receiptHandle: string)
    : Promise<DataProcessResult<boolean>>;
  abstract sendToDlq(queueName: string, message: Record<string, unknown>, reason: string)
    : Promise<DataProcessResult<string>>;
}
```

Queue lifecycle: Service picks from Main → moves to Consumed → on completion moves to Archive → on failure after retries → DLQ

---

## AI ENGINE FABRIC

**Interface:** `IAiProvider` + `IAiDispatcher` — `fabrics/interfaces/ai-provider.interface.ts`
**Tokens:** `AI_PROVIDER`, `AI_DISPATCHER`
**Providers:** Anthropic (Claude), OpenAI, Gemini, Grok, Mock

```typescript
abstract class IAiProvider {
  abstract generate(prompt: string, options?: {
    systemPrompt?: string; model?: string; maxTokens?: number; temperature?: number;
  }): Promise<DataProcessResult<Record<string, unknown>>>;
  
  abstract generateStructured(prompt: string, outputSchema: Record<string, unknown>, options?: {
    systemPrompt?: string; model?: string;
  }): Promise<DataProcessResult<Record<string, unknown>>>;
}
```

Model roles: `PRIMARY`, `FAST`, `CROSS_VALIDATE`, `JUDGE`

Per-tenant keys: Each provider resolves API keys via `TenantKeyResolver` — tenants bring their own keys.

Dispatcher runs competing models in parallel using execution recipes, then aggregates results.

---

## RAG FABRIC

**Interface:** `IRagService` — `fabrics/interfaces/rag.interface.ts`
**Token:** `RAG_SERVICE`
**Providers:** InMemory
**Strategies:** Split, FanOut, Tiered, Hybrid, Graph, Vector, Multi (FREEDOM config selects)

---

## SECRETS FABRIC

**Interface:** `ISecretsService` — `fabrics/interfaces/secrets.interface.ts`
**Token:** `SECRETS_SERVICE`
**Providers:** AWS Secrets Manager, Environment Variables, InMemory

Used by: TenantKeyResolver (per-tenant API keys), FREEDOM SecretReference (config values pointing to secrets)

---

## FLOW ENGINE FABRIC

**Interface:** `IFlowOrchestrator` — `fabrics/interfaces/flow-orchestrator.interface.ts`
**Token:** `FLOW_ORCHESTRATOR`
**Providers:** InMemory

Flow definitions are JSON DAGs. The orchestrator reads DAG → executes step by step → events between steps. Adding a flow = adding a JSON document.

---

## Adding a New Provider — Template

```typescript
import { Injectable } from '@nestjs/common';
import { [FabricInterface] } from '../interfaces/[fabric].interface';
import { DataProcessResult } from '../../kernel/data-process-result';
// Provider SDK import — ONLY allowed here at the provider boundary
import { SomeClient } from 'some-provider-sdk';

@Injectable()
export class MyNewProvider extends [FabricInterface] {
  // 1. Read TenantContext from AsyncLocalStorage (not passed as parameter)
  // 2. Implement ALL abstract methods
  // 3. Return DataProcessResult for every method
  // 4. Handle errors gracefully — DataProcessResult.failure(), never throw
}
```

After creating the provider:
1. Register in `provider-registry.ts` with a string key (e.g., 'mongodb')
2. Add to the fabric module's providers array
3. Write tests following existing provider test patterns
4. Add FREEDOM config entry for tenant-level provider switching
