/**
 * ArbiterRegistry — holds N concern-specific arbiter prompts.
 *
 * Design principle: arbiters are data, not code. The base set is defined as
 * a plain array constant (BASE_ARBITERS). Adding a new arbiter = appending
 * to that array — no logic changes required.
 *
 * DNA-1: all data is Record<string,unknown>
 * DNA-3: DataProcessResult returns
 * DNA-5: scoped per tenant when applicable
 *
 * T583: Context search categories
 *   Category C (no context search): dna, fabric, iron_rules, tenant
 *   Category B (conditional): business_logic (ORCHESTRATION/SCHEDULED),
 *                              key_principles (curriculumTier >= 3)
 *   Category A (always): custom arbiters with requiresContextSearch: true
 */

import { Injectable, Optional } from '@nestjs/common';
import { DataProcessResult } from '../../kernel/data-process-result';

export interface ArbiterDefinition {
  readonly id: string; // 'dna' | 'fabric' | 'tenant' | 'xiigen' | custom
  readonly concern: string; // human-readable label
  readonly promptTemplate: string; // full prompt sent to IAiProvider (must contain {{CODE}})
  readonly minPassScore: number; // threshold for passed=true (default 70)
  readonly weight: number; // 0–1, used for aggregate score (all weights should ≤ 1.0)
  // T583: Context search classification (Category A / B / C)
  /** Category A: always run context search when this arbiter fails. Default: false. */
  readonly requiresContextSearch?: boolean;
  /**
   * Category B: run context search conditionally.
   * archetypes: only when the task type's archetype is in this list.
   * minCurriculumTier: only when the run's curriculumTier >= this value.
   * Evaluated by ArbitrationLoopController — undefined fields are skipped.
   */
  readonly contextSearchCondition?: {
    readonly archetypes?: string[];
    readonly minCurriculumTier?: number;
  };
  /**
   * B-2: P20 machine-readable isolation flag.
   * When true, this arbiter receives ONLY its declared context package —
   * no cross-contamination from other arbiters' domains.
   * Programmatically checkable by FC-26 gate validation.
   */
  readonly isolated?: boolean;
}

export interface ArbiterVerdict {
  readonly arbiterId: string;
  readonly candidateModel: string;
  readonly score: number; // 0–100
  readonly passed: boolean;
  readonly notes: string[]; // specific issues found
  readonly suggestions: string[]; // what to fix next round
  /**
   * T583: Gap signal keyword detected in this arbiter's notes.
   * Populated by ArbitrationLoopController.run() when a context insufficiency
   * is identified. Absent when no gap was detected.
   */
  readonly contextInsufficiencySignal?: string;
}

// ── Base arbiters — extend by appending to this array ────────────────────────

export const BASE_ARBITERS: ArbiterDefinition[] = [
  {
    id: 'dna',
    concern: 'Genie DNA compliance',
    minPassScore: 70,
    weight: 0.2,
    promptTemplate: `
You are a Genie DNA compliance arbiter for XIIGen — a self-building engine.
Review the TypeScript NestJS service below against all 9 DNA patterns.

DNA PATTERNS TO CHECK:
1. ParseDocument: all data uses Record<string,unknown> — no typed classes for business data
2. BuildSearchFilter: empty fields are skipped automatically in any query construction
3. DataProcessResult: ALL public methods return DataProcessResult<T> — never throw for business logic
4. MicroserviceBase: the class extends MicroserviceBase — not just @Injectable()
5. ScopeIsolation: scopeId/tenantId comes from AsyncLocalStorage/CLS — never a method parameter
6. DynamicController: no entity-specific controllers — uses DynamicController pattern
7. IdempotencyKeys: write operations use idempotency keys where applicable
8. OutboxBeforeQueue: storeDocument() called BEFORE enqueue() on any write+event pattern
9. CloudEvents: all inter-service events use CloudEvents envelope

For each DNA pattern violated, state:
- Which pattern (e.g. "DNA-3")
- Which line or method
- What to change

Respond ONLY in JSON:
{
  "score": <0-100>,
  "passed": <score >= 70>,
  "notes": ["DNA-3: method createItem() throws instead of returning DataProcessResult"],
  "suggestions": ["Wrap createItem() body in try/catch, return DataProcessResult.failure() on error"]
}

SERVICE CODE TO REVIEW:
{{CODE}}
`,
  },
  {
    id: 'fabric',
    concern: 'Fabric-first architecture',
    minPassScore: 70,
    weight: 0.15,
    promptTemplate: `
You are a fabric-first architecture arbiter for XIIGen.
Review the TypeScript NestJS service below.

FABRIC-FIRST RULES TO CHECK:
1. No direct provider imports: no elasticsearch, openai, redis, pg, mongodb imports in service code
2. All dependencies via fabric interfaces: IDatabaseService, IAiProvider, IQueueService, IRagService
3. Factory resolution: external dependencies resolved via createAsync() or @Inject() token
4. Fabric methods: uses storeDocument(), searchDocuments(), generate(), enqueue() — not client SDKs
5. Provider-agnostic: swapping ES to MongoDB would require only config change, not code change

For each violation:
- What was imported or used directly
- Which fabric interface should be used instead

Respond ONLY in JSON:
{
  "score": <0-100>,
  "passed": <score >= 70>,
  "notes": ["Direct import: import { Client } from '@elastic/elasticsearch' — violates fabric-first"],
  "suggestions": ["Replace with IDatabaseService injection via DATABASE_SERVICE token"]
}

SERVICE CODE TO REVIEW:
{{CODE}}
`,
  },
  {
    id: 'tenant',
    concern: 'Multi-tenant isolation',
    minPassScore: 70,
    weight: 0.15,
    promptTemplate: `
You are a multi-tenant isolation arbiter for XIIGen.
Review the TypeScript NestJS service below.

MULTI-TENANT RULES TO CHECK:
1. No tenantId parameters: tenantId/scopeId MUST come from AsyncLocalStorage or CLS — never a method param
2. Every DB call scoped: all storeDocument/searchDocuments calls include the tenant prefix
3. No cross-tenant reads: queries cannot return data from other tenants
4. Cache keys tenant-prefixed: any cache key includes tenantId
5. Events carry tenantId: any queued message includes tenantId in payload

For each violation:
- The exact method signature or call
- Why it breaks tenant isolation
- How to fix it

Respond ONLY in JSON:
{
  "score": <0-100>,
  "passed": <score >= 70>,
  "notes": ["createItem(tenantId: string) — tenantId must come from CLS, not parameter"],
  "suggestions": ["Remove tenantId parameter. Read from: const ctx = this.cls.get(TENANT_CONTEXT_KEY)"]
}

SERVICE CODE TO REVIEW:
{{CODE}}
`,
  },
  {
    id: 'xiigen',
    concern: 'XIIGen engine patterns',
    minPassScore: 70,
    weight: 0.1,
    promptTemplate: `
You are an XIIGen engine pattern arbiter.
Review the TypeScript NestJS service below.

XIIGEN PATTERNS TO CHECK:
1. EngineContract compliance: if this service is generated from a contract, iron rules are all satisfied
2. BFA registration: new entities, routes, or events are documented for BFA conflict detection
3. MACHINE vs FREEDOM: business logic is in code (MACHINE); configurable values are in ES config docs (FREEDOM)
4. Factory interfaces: F-numbered factory dependencies are declared and resolved via createAsync()
5. Promotion ladder: generated code starts at GENERATED level, promotes on passing judgment

For each issue:
- Which XIIGen pattern is violated
- Specific location
- How to correct

Respond ONLY in JSON:
{
  "score": <0-100>,
  "passed": <score >= 70>,
  "notes": ["BFA not registered: new entity PatternDocument has no BFA entry"],
  "suggestions": ["Add BFA registration: bfa.register({ entity: 'PatternDocument', owner: 'FLOW-0-A' })"]
}

SERVICE CODE TO REVIEW:
{{CODE}}
`,
  },
  {
    id: 'business_logic',
    concern: 'Business logic correctness',
    minPassScore: 70,
    weight: 0.15,
    // T583 Category B: context search only for ORCHESTRATION / SCHEDULED archetypes.
    // These archetypes reference complex scheduling and orchestration patterns
    // that benefit from execution history in the flow pool.
    contextSearchCondition: { archetypes: ['ORCHESTRATION', 'SCHEDULED'] },
    promptTemplate: `
You are a business logic arbiter for XIIGen. Review the TypeScript service below.
EVALUATE:
1. Does the service implement the task type's stated business purpose correctly?
2. Are edge cases (empty input, null values, concurrent calls) handled?
3. Are error codes meaningful and specific?
4. Do stored documents contain all required domain fields?
5. Is the response schema consistent with the contract?
Respond ONLY in JSON:
{"score":<0-100>,"passed":<score>=70>,"notes":["issue"],"suggestions":["fix"]}
SERVICE CODE: {{CODE}}
`,
  },
  {
    id: 'key_principles',
    concern: 'XIIGen key principles compliance (M1-M5 + P1-P22 + DNA-1..9)',
    minPassScore: 80,
    weight: 0.15,
    // B-2: machine-readable P20 isolation flag — programmatically checkable by FC-26
    isolated: true,
    // T583 Category B: context search when curriculumTier >= 3 (complex runs).
    // High-curriculum runs produce nuanced code that benefits from prior execution context.
    // CF-T583-2: curriculumTier is hardcoded at 3 by ArbitrationLoopController (deferred).
    contextSearchCondition: { minCurriculumTier: 3 },
    promptTemplate: `
[ISOLATED per P20: receives ONLY principle definitions — no domain context, no iron rules, no RAG patterns]
You are a key principles compliance arbiter for XIIGen. Check this code against governing principles.
PRINCIPLES (complete definitions — do not assume others exist):
M1: Every run must produce at least one DPO triple with curriculumTier set.
M2: Every run must emit OUTCOME signal to feedback.handler.
M3: DPO triples must be cross-model (chosen.model !== rejected.model).
DNA-1: All data uses Record<string,unknown> — no typed classes for business data.
DNA-3: All public methods return DataProcessResult<T> — never throw for business logic.
DNA-4: Service extends MicroserviceBase — not just @Injectable().
DNA-5: scopeId/tenantId comes from CLS context — never a method parameter.
DNA-7: Write operations use idempotency keys.
DNA-8: storeDocument() called BEFORE enqueue() on any write+event pattern.
P1: No direct SDK imports — all providers injected via interfaces.
Respond ONLY in JSON:
{"score":<0-100>,"passed":<score>=80>,"notes":["DNA-3: method X throws"],"suggestions":["fix"]}
SERVICE CODE: {{CODE}}
`,
  },
  {
    id: 'iron_rules',
    concern: 'Iron rules enforcement — non-negotiable constraints',
    minPassScore: 90,
    weight: 0.1,
    promptTemplate: `
You are an iron rules arbiter for XIIGen. A single violation = score 0. No partial credit.
IRON RULES (all must pass):
1. DNA-8: storeDocument() ALWAYS before enqueue() in any write+event method.
2. DNA-7: Queue consumers check for duplicate processing (idempotency).
3. No direct database client imports (must use IDatabaseService).
4. No direct queue client imports (must use IQueueService).
5. No hardcoded model name strings (claude-*, gpt-*, gemini-*, deepseek-*).
Respond ONLY in JSON:
{"score":<0 if any violation else 100>,"passed":<score>=90>,"notes":["violation"],"suggestions":["fix"]}
SERVICE CODE: {{CODE}}
`,
  },
];

// ── ArbiterRegistry ───────────────────────────────────────────────────────────

@Injectable()
export class ArbiterRegistry {
  private readonly arbiterMap = new Map<string, ArbiterDefinition>();

  constructor(@Optional() initialArbiters: ArbiterDefinition[] = BASE_ARBITERS) {
    for (const a of initialArbiters) {
      this.arbiterMap.set(a.id, a);
    }
  }

  /** Register a new arbiter (or overwrite an existing one with the same id). */
  register(arbiter: ArbiterDefinition): void {
    this.arbiterMap.set(arbiter.id, arbiter);
  }

  /** All registered arbiters as an array (ordered by insertion). */
  getAll(): ArbiterDefinition[] {
    return [...this.arbiterMap.values()];
  }

  getById(id: string): DataProcessResult<ArbiterDefinition> {
    const a = this.arbiterMap.get(id);
    return a
      ? DataProcessResult.success(a)
      : DataProcessResult.failure('NOT_FOUND', `Arbiter '${id}' not registered`);
  }

  get count(): number {
    return this.arbiterMap.size;
  }
}
