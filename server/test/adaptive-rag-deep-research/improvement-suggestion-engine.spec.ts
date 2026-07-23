/**
 * ImprovementSuggestionEngine — Unit Tests (T461).
 *
 * Tests:
 *   ISE-1:  missing tenantId → UNSCOPED_QUERY
 *   ISE-2:  suggestions without evidence[] filtered before emit (SCORE-0)
 *   ISE-3:  valid suggestions queued to rag.suggestion.queued
 *   ISE-4:  suggestionsQueued count correct
 *   ISE-5:  suggestionsFiltered count correct for evidence-missing suggestions
 *   ISE-6:  no suggestion emitted for empty analysis (no AI output)
 *   ISE-7:  storeDocument() called BEFORE enqueue() — DNA-8
 *   ISE-8:  DB store failure → error propagated
 *   ISE-9:  analysisId is non-empty string
 *   ISE-10: AI failure → success with 0 suggestions (never throw)
 *   ISE-11: iron rule — NEVER auto-apply (enqueue only, no db mutation of model state)
 */

import { ImprovementSuggestionEngine } from '../../src/engine/flows/rag-optimization/improvement-suggestion-engine.service';
import { DataProcessResult } from '../../src/kernel/data-process-result';

const TENANT = 'tenant-ise-test';
const METRICS = { hallucinationRate: 0.12, coverageScore: 0.65 };

function makeDb() {
  const stored: any[] = [];
  return {
    storeDocument: jest.fn(async (_i: string, doc: any, id?: string) => {
      stored.push(doc);
      return DataProcessResult.success({ ...doc, _id: id ?? 'x' });
    }),
    _stored: stored,
  } as any;
}

function makeFailingDb() {
  return {
    storeDocument: jest.fn(async () => DataProcessResult.failure('STORAGE_FAILED', 'write error')),
  } as any;
}

function makeQueue() {
  const events: any[] = [];
  return {
    enqueue: jest.fn(async (evt: string, data: any) => {
      events.push({ evt, data });
      return DataProcessResult.success('m');
    }),
    _events: events,
  } as any;
}

function makeAi(suggestions: any[]) {
  return {
    generate: jest.fn(async () => DataProcessResult.success(JSON.stringify(suggestions))),
  } as any;
}

function makeFailingAi() {
  return {
    generate: jest.fn(async () => DataProcessResult.failure('AI_FAILED', 'ai error')),
  } as any;
}

const VALID_SUGGESTION = {
  suggestion_text: 'Increase topK retrieval',
  affected_component: 'vector-retrieval',
  confidence: 0.85,
  evidence: ['low coverage score', 'high miss rate'],
};

const NO_EVIDENCE_SUGGESTION = {
  suggestion_text: 'Try different model',
  affected_component: 'bandit-router',
  confidence: 0.5,
  evidence: [], // empty — should be filtered
};

describe('ImprovementSuggestionEngine — Unit (T461)', () => {
  it('ISE-1: missing tenantId → UNSCOPED_QUERY', async () => {
    const svc = new ImprovementSuggestionEngine(makeDb(), makeQueue(), makeAi([]));
    const r = await svc.analyze('', METRICS);
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('UNSCOPED_QUERY');
  });

  it('ISE-2: suggestions without evidence[] filtered before emit (SCORE-0)', async () => {
    const queue = makeQueue();
    const svc = new ImprovementSuggestionEngine(makeDb(), queue, makeAi([NO_EVIDENCE_SUGGESTION]));
    const r = await svc.analyze(TENANT, METRICS);
    expect(r.isSuccess).toBe(true);
    expect(r.data!.suggestionsQueued).toBe(0);
    expect(queue.enqueue).not.toHaveBeenCalledWith('rag.suggestion.queued', expect.any(Object));
  });

  it('ISE-3: valid suggestions queued to rag.suggestion.queued', async () => {
    const queue = makeQueue();
    const svc = new ImprovementSuggestionEngine(makeDb(), queue, makeAi([VALID_SUGGESTION]));
    await svc.analyze(TENANT, METRICS);
    expect(queue.enqueue).toHaveBeenCalledWith('rag.suggestion.queued', expect.any(Object));
  });

  it('ISE-4: suggestionsQueued count correct', async () => {
    const svc = new ImprovementSuggestionEngine(
      makeDb(),
      makeQueue(),
      makeAi([VALID_SUGGESTION, VALID_SUGGESTION]),
    );
    const r = await svc.analyze(TENANT, METRICS);
    expect(r.data!.suggestionsQueued).toBe(2);
  });

  it('ISE-5: suggestionsFiltered count correct for evidence-missing suggestions', async () => {
    const svc = new ImprovementSuggestionEngine(
      makeDb(),
      makeQueue(),
      makeAi([VALID_SUGGESTION, NO_EVIDENCE_SUGGESTION, NO_EVIDENCE_SUGGESTION]),
    );
    const r = await svc.analyze(TENANT, METRICS);
    expect(r.data!.suggestionsQueued).toBe(1);
    expect(r.data!.suggestionsFiltered).toBe(2);
  });

  it('ISE-6: no suggestion emitted for empty AI output', async () => {
    const queue = makeQueue();
    const svc = new ImprovementSuggestionEngine(makeDb(), queue, makeAi([]));
    const r = await svc.analyze(TENANT, METRICS);
    expect(r.isSuccess).toBe(true);
    expect(r.data!.suggestionsQueued).toBe(0);
    expect(queue.enqueue).not.toHaveBeenCalled();
  });

  it('ISE-7: storeDocument() called BEFORE enqueue() — DNA-8', async () => {
    const callOrder: string[] = [];
    const db = {
      storeDocument: jest.fn(async () => {
        callOrder.push('store');
        return DataProcessResult.success({});
      }),
    } as any;
    const queue = {
      enqueue: jest.fn(async () => {
        callOrder.push('enqueue');
        return DataProcessResult.success('m');
      }),
    } as any;
    const svc = new ImprovementSuggestionEngine(db, queue, makeAi([VALID_SUGGESTION]));
    await svc.analyze(TENANT, METRICS);
    expect(callOrder[0]).toBe('store');
    expect(callOrder.indexOf('enqueue')).toBeGreaterThan(callOrder.indexOf('store'));
  });

  it('ISE-8: DB store failure → error propagated', async () => {
    const svc = new ImprovementSuggestionEngine(makeFailingDb(), makeQueue(), makeAi([]));
    const r = await svc.analyze(TENANT, METRICS);
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('STORAGE_FAILED');
  });

  it('ISE-9: analysisId is non-empty string', async () => {
    const svc = new ImprovementSuggestionEngine(makeDb(), makeQueue(), makeAi([]));
    const r = await svc.analyze(TENANT, METRICS);
    expect(r.isSuccess).toBe(true);
    expect(r.data!.analysisId.length).toBeGreaterThan(0);
  });

  it('ISE-10: AI failure → success with 0 suggestions (never throw)', async () => {
    const svc = new ImprovementSuggestionEngine(makeDb(), makeQueue(), makeFailingAi());
    const r = await svc.analyze(TENANT, METRICS);
    expect(r.isSuccess).toBe(true);
    expect(r.data!.suggestionsQueued).toBe(0);
  });

  it('ISE-11: enqueue called for each valid suggestion (NEVER inline apply)', async () => {
    const queue = makeQueue();
    const svc = new ImprovementSuggestionEngine(
      makeDb(),
      queue,
      makeAi([VALID_SUGGESTION, VALID_SUGGESTION]),
    );
    await svc.analyze(TENANT, METRICS);
    const suggestionEvents = queue._events.filter((e: any) => e.evt === 'rag.suggestion.queued');
    expect(suggestionEvents).toHaveLength(2);
  });
});
