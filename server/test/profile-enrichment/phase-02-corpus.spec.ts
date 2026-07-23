/**
 * FLOW-02 Phase 7 — Corpus Validation
 *
 * CV-1: seedFlowCorpus('profile-enrichment') seeds all 15 patterns without failure
 * CV-2: DESIGN_REASONING records routed to xiigen-planning-decisions (7 records)
 * CV-3: ARCH_PATTERN records routed to xiigen-rag-patterns (8 records)
 * CV-4: failedCount === 0 — no unknown patternTypes in corpus
 * CV-5: All seeded records have knowledge_scope=GLOBAL and connection_type=FLOW_SCOPED
 * CV-6: Re-seeding (idempotency) — same records overwrite, no duplicate errors
 */

import 'reflect-metadata';
import { BootstrapFromDocumentsService } from '../../src/bootstrap/bootstrap-from-documents.service';
import { DataProcessResult } from '../../src/kernel/data-process-result';

// ── Expected corpus counts ────────────────────────────────────────────────────
// profile-enrichment-design-corpus.json: 7 DESIGN_REASONING + 8 ARCH_PATTERN = 15 total
const EXPECTED_DESIGN_REASONING = 7;
const EXPECTED_ARCH_PATTERN = 8;
const EXPECTED_TOTAL = EXPECTED_DESIGN_REASONING + EXPECTED_ARCH_PATTERN;

const PLANNING_DECISIONS_INDEX = 'xiigen-planning-decisions';
const RAG_PATTERNS_INDEX = 'xiigen-rag-patterns';

// ── Mock factory ──────────────────────────────────────────────────────────────

function makeMockDb() {
  const stored: Array<{ index: string; doc: Record<string, unknown>; id: string }> = [];
  return {
    storeDocument: jest.fn(async (index: string, doc: Record<string, unknown>, id: string) => {
      stored.push({ index, doc, id });
      return DataProcessResult.success({ ...doc });
    }),
    searchDocuments: jest.fn().mockResolvedValue(DataProcessResult.success([])),
    getDocument: jest.fn().mockResolvedValue(DataProcessResult.failure('NOT_FOUND', '')),
    deleteDocument: jest.fn().mockResolvedValue(DataProcessResult.success(true)),
    bulkStore: jest.fn().mockResolvedValue(DataProcessResult.success({})),
    countDocuments: jest.fn().mockResolvedValue(DataProcessResult.success(0)),
    createIndex: jest.fn().mockResolvedValue(DataProcessResult.success({})),
    _stored: stored,
  } as any;
}

beforeEach(() => jest.clearAllMocks());

describe('FLOW-02 Phase 7 — Corpus Validation', () => {
  it(`CV-1: seedFlowCorpus('profile-enrichment') seeds all ${EXPECTED_TOTAL} patterns without error`, async () => {
    const db = makeMockDb();
    const svc = new BootstrapFromDocumentsService(db);

    const result = await svc.seedFlowCorpus('profile-enrichment');

    expect(result.isSuccess).toBe(true);
    const { designReasoningCount, archPatternCount, failedCount } = result.data!;
    expect(designReasoningCount + archPatternCount).toBe(EXPECTED_TOTAL);
    expect(failedCount).toBe(0);
  });

  it(`CV-2: ${EXPECTED_DESIGN_REASONING} DESIGN_REASONING records routed to xiigen-planning-decisions`, async () => {
    const db = makeMockDb();
    const svc = new BootstrapFromDocumentsService(db);

    await svc.seedFlowCorpus('profile-enrichment');

    const planningStores = db._stored.filter(
      (s: { index: string }) => s.index === PLANNING_DECISIONS_INDEX,
    );
    expect(planningStores.length).toBe(EXPECTED_DESIGN_REASONING);

    // All have DESIGN_REASONING patternType
    planningStores.forEach((s: { doc: Record<string, unknown> }) => {
      expect(s.doc['patternType']).toBe('DESIGN_REASONING');
    });
  });

  it(`CV-3: ${EXPECTED_ARCH_PATTERN} ARCH_PATTERN records routed to xiigen-rag-patterns`, async () => {
    const db = makeMockDb();
    const svc = new BootstrapFromDocumentsService(db);

    await svc.seedFlowCorpus('profile-enrichment');

    const ragStores = db._stored.filter((s: { index: string }) => s.index === RAG_PATTERNS_INDEX);
    expect(ragStores.length).toBe(EXPECTED_ARCH_PATTERN);

    // All have ARCH_PATTERN patternType
    ragStores.forEach((s: { doc: Record<string, unknown> }) => {
      expect(s.doc['patternType']).toBe('ARCH_PATTERN');
    });
  });

  it('CV-4: failedCount === 0 — no unknown patternTypes in corpus', async () => {
    const db = makeMockDb();
    const svc = new BootstrapFromDocumentsService(db);

    const result = await svc.seedFlowCorpus('profile-enrichment');

    expect(result.isSuccess).toBe(true);
    expect(result.data!.failedCount).toBe(0);
  });

  it('CV-5: all seeded records have knowledgeScope=GLOBAL and connectionType=FLOW_SCOPED', async () => {
    const db = makeMockDb();
    const svc = new BootstrapFromDocumentsService(db);

    await svc.seedFlowCorpus('profile-enrichment');

    db._stored.forEach((s: { doc: Record<string, unknown> }) => {
      expect(s.doc['knowledgeScope']).toBe('GLOBAL');
      expect(s.doc['connectionType']).toBe('FLOW_SCOPED');
    });
  });

  it('CV-6: re-seeding (idempotency) — second call succeeds, same patternIds overwritten', async () => {
    const db = makeMockDb();
    const svc = new BootstrapFromDocumentsService(db);

    const first = await svc.seedFlowCorpus('profile-enrichment');
    const second = await svc.seedFlowCorpus('profile-enrichment');

    expect(first.isSuccess).toBe(true);
    expect(second.isSuccess).toBe(true);
    // Both calls succeed — idempotent by patternId key
    expect(first.data!.failedCount).toBe(0);
    expect(second.data!.failedCount).toBe(0);
    // Second call stores same number of patterns
    expect(second.data!.designReasoningCount + second.data!.archPatternCount).toBe(EXPECTED_TOTAL);
  });
});
