/**
 * FLOW-0A Seed Prompts — genesis prompts for T577, T578, T579.
 *
 * These are the Tier-2 (platform-level) genesis prompts that seed the
 * PromptLibrary before FLOW-0A Phase A runs. The arbitration loop will
 * improve these prompts across rounds via FeedbackSynthesizer.
 *
 * Seeded into PromptLibrary at bootstrap via storePrompt() with scope='platform'.
 * The three-tier resolution order: tenant ES → platform (these) → static defaults.
 *
 * connection_type: FLOW_SCOPED (belongs to FLOW-0A — not tenant-exportable)
 * flow_id: FLOW-0A
 */

/** Shape of a FLOW-0A genesis prompt record. */
export interface Flow0GenesisPrompt {
  readonly taskType: string;
  readonly promptText: string;
  readonly connection_type: 'FLOW_SCOPED';
  readonly flow_id: 'FLOW-0A';
  readonly version: string;
}

/**
 * T577 — PatternExtractorService genesis prompt.
 *
 * Instructs the AI to generate a NestJS service that reads XIIGen source files
 * and extracts architectural patterns (DNA patterns, fabric interfaces, factory sigs).
 */
export const T577_GENESIS_PROMPT: Flow0GenesisPrompt = {
  taskType: 'T577',
  connection_type: 'FLOW_SCOPED',
  flow_id: 'FLOW-0A',
  version: '1.0.0',
  promptText: `
You are generating PatternExtractorService for the XIIGen engine.

## Task
Generate a NestJS service (TypeScript) that:
1. Reads TypeScript source files from a configurable directory
2. Extracts XIIGen architectural patterns: DNA patterns, fabric interface usages, factory signatures
3. Deduplicates by (patternType + sourceFile hash)
4. Stores each extracted pattern via IDatabaseService (DATABASE FABRIC — never import ES client directly)

## Required Interface
\`\`\`typescript
interface ExtractedPattern {
  patternType: string;       // 'dna_compliance', 'fabric_usage', 'factory_signature'
  sourceFile: string;        // relative path
  codeSnippet: string;       // relevant code block
  hash: string;              // sha256 of patternType+sourceFile
}
\`\`\`

## XIIGen DNA Rules (MUST follow)
- Service MUST extend MicroserviceBase (DNA-4)
- ALL methods MUST return DataProcessResult<T> — never throw (DNA-3)
- Tenant scope via AsyncLocalStorage — no tenantId param (DNA-5)
- NEVER import Elasticsearch client — inject IDatabaseService (Rule 1)
- Store audit record BEFORE returning success (DNA-8)

## Output
A single TypeScript file containing PatternExtractorService.
Include only the service — no controllers, no modules.
`.trim(),
};

/**
 * T578 — BenchmarkRunnerService genesis prompt.
 *
 * Instructs the AI to generate a NestJS service that runs RAG retrieval
 * benchmarks (precision@k, recall@k, MRR) against the pattern corpus.
 */
export const T578_GENESIS_PROMPT: Flow0GenesisPrompt = {
  taskType: 'T578',
  connection_type: 'FLOW_SCOPED',
  flow_id: 'FLOW-0A',
  version: '1.0.0',
  promptText: `
You are generating BenchmarkRunnerService for the XIIGen engine.

## Task
Generate a NestJS service (TypeScript) that:
1. Accepts a list of benchmark queries (natural language questions about XIIGen patterns)
2. For each query, retrieves top-k results from the RAG vector store via IRagService
3. Computes: precision@k, recall@k, MRR (mean reciprocal rank)
4. Stores benchmark run results via IDatabaseService with connection_type=TENANT_EXPORTABLE

## Required Result Shape
\`\`\`typescript
interface BenchmarkRunResult {
  runId: string;
  taskType: string;
  precision: number;   // 0–1
  recall: number;      // 0–1
  mrr: number;         // 0–1
  queriesRun: number;
  createdAt: string;
}
\`\`\`

## XIIGen DNA Rules (MUST follow)
- Service MUST extend MicroserviceBase (DNA-4)
- ALL methods MUST return DataProcessResult<T> — never throw (DNA-3)
- Tenant scope via AsyncLocalStorage — no tenantId param (DNA-5)
- NEVER import AI SDK directly — use IAiProvider via AI_ENGINE FABRIC for LLM evaluation
- NEVER import vector DB client — use IRagService via RAG FABRIC
- storeDocument() MUST be called BEFORE returning the result (DNA-8)

## Output
A single TypeScript file containing BenchmarkRunnerService.
Include only the service — no controllers, no modules.
`.trim(),
};

/**
 * T579 — PatternIndexerService genesis prompt.
 *
 * Instructs the AI to generate a NestJS service that chunks and indexes
 * extracted patterns into the RAG vector store.
 */
export const T579_GENESIS_PROMPT: Flow0GenesisPrompt = {
  taskType: 'T579',
  connection_type: 'FLOW_SCOPED',
  flow_id: 'FLOW-0A',
  version: '1.0.0',
  promptText: `
You are generating PatternIndexerService for the XIIGen engine.

## Task
Generate a NestJS service (TypeScript) that:
1. Accepts a list of ExtractedPattern documents (from PatternExtractorService T577)
2. Chunks each pattern into segments (configurable size)
3. Embeds and indexes each chunk via IRagService (RAG FABRIC — never import vector DB directly)
4. Writes an audit record per chunk via IDatabaseService BEFORE returning (DNA-8)
5. Generates deterministic chunk IDs: sha256(patternType + sourceFile + chunkIndex)

## Required Chunk Shape
\`\`\`typescript
interface IndexedChunk {
  chunkId: string;       // deterministic hash
  patternType: string;
  sourceFile: string;
  chunkIndex: number;
  content: string;
  indexedAt: string;
  connection_type: 'FLOW_SCOPED';
  flow_id: 'FLOW-0A';
}
\`\`\`

## XIIGen DNA Rules (MUST follow)
- Service MUST extend MicroserviceBase (DNA-4)
- ALL methods MUST return DataProcessResult<T> — never throw (DNA-3)
- Tenant scope via AsyncLocalStorage — no tenantId param (DNA-5)
- NEVER import vector DB client — inject IRagService (Rule 1)
- Audit record MUST be written BEFORE returning from indexChunk() (DNA-8)
- Chunk IDs MUST be deterministic (idempotent re-indexing — DNA-7)

## Output
A single TypeScript file containing PatternIndexerService.
Include only the service — no controllers, no modules.
`.trim(),
};

/** All three FLOW-0A genesis prompts as an array for bulk seeding. */
export const FLOW0_GENESIS_PROMPTS: Flow0GenesisPrompt[] = [
  T577_GENESIS_PROMPT,
  T578_GENESIS_PROMPT,
  T579_GENESIS_PROMPT,
];
