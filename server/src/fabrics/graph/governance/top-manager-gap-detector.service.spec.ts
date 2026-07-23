/**
 * TopManagerGapDetectorService — unit tests (Phase 5)
 * 8 tests covering gap detection, rejection history check, proposal creation.
 */

import { Test } from '@nestjs/testing';
import { TopManagerGapDetectorService } from './top-manager-gap-detector.service';
import { GRAPH_RAG_SERVICE } from '../interfaces/i-graph-rag.service';
import { DATABASE_SERVICE } from '../../interfaces';
import { GRAPH_CONFIG_READER } from '../planning/planning-abstracts';

function emptyQueryResult() {
  return { edges: [], formatted: () => '' };
}
function edgeResult(opts: Partial<Record<string, unknown>> = {}) {
  return {
    edges: [
      {
        fromEntity: opts['fromEntity'] ?? 'ORCHESTRATION',
        fromType: 'Archetype',
        relationship: opts['relationship'] ?? 'ROUTES_TO',
        toEntity: opts['toEntity'] ?? 'ACCEPT',
        toType: 'Action',
        confidence: opts['confidence'] ?? 0.7,
        observationCount: opts['observationCount'] ?? 1,
        immutable: opts['immutable'] ?? false,
        reasoning: 'test edge',
      },
    ],
    formatted: () => '',
  };
}

describe('TopManagerGapDetectorService', () => {
  let service: TopManagerGapDetectorService;
  let graphRag: { query: jest.Mock };
  let db: { searchDocuments: jest.Mock; storeDocument: jest.Mock };
  let config: { get: jest.Mock };

  beforeEach(async () => {
    graphRag = { query: jest.fn().mockResolvedValue(emptyQueryResult()) };
    db = {
      searchDocuments: jest.fn().mockResolvedValue({ isSuccess: true, data: [] }),
      storeDocument: jest.fn().mockResolvedValue({ isSuccess: true }),
    };
    config = {
      get: jest.fn().mockImplementation((key: string) => {
        const k = key.toLowerCase();
        if (k.includes('rejection')) return Promise.resolve(30);
        return Promise.resolve(3);
      }),
    };

    const module = await Test.createTestingModule({
      providers: [
        TopManagerGapDetectorService,
        { provide: GRAPH_RAG_SERVICE, useValue: graphRag },
        { provide: DATABASE_SERVICE, useValue: db },
        { provide: GRAPH_CONFIG_READER, useValue: config },
      ],
    }).compile();

    service = module.get(TopManagerGapDetectorService);
  });

  it('1. Returns empty array when no edges found for archetype', async () => {
    const result = await service.detectAndPropose({
      archetype: 'ORCHESTRATION',
      runId: 'r1',
      proposedBy: 'claude',
    });
    expect(result).toHaveLength(0);
  });

  it('2. Creates proposal for edge below evidence threshold', async () => {
    graphRag.query.mockResolvedValueOnce(edgeResult({ observationCount: 1 }));

    const result = await service.detectAndPropose({
      archetype: 'ORCHESTRATION',
      runId: 'r1',
      proposedBy: 'claude',
    });

    expect(result).toHaveLength(1);
    expect(result[0].status).toBe('PENDING_SCREEN');
  });

  it('3. Skips immutable edges', async () => {
    graphRag.query.mockResolvedValueOnce(edgeResult({ immutable: true, observationCount: 1 }));

    const result = await service.detectAndPropose({
      archetype: 'ORCHESTRATION',
      runId: 'r1',
      proposedBy: 'claude',
    });

    expect(result).toHaveLength(0);
  });

  it('4. Skips edges above evidence threshold (observationCount >= minEvidence)', async () => {
    graphRag.query.mockResolvedValueOnce(edgeResult({ observationCount: 5 }));

    const result = await service.detectAndPropose({
      archetype: 'ORCHESTRATION',
      runId: 'r1',
      proposedBy: 'claude',
    });

    expect(result).toHaveLength(0);
  });

  it('5. Skips recently rejected edges', async () => {
    graphRag.query.mockResolvedValueOnce(edgeResult({ observationCount: 1 }));
    // rejection was 5 days ago (within 30-day window)
    const recentRejection = { rejectedAt: new Date(Date.now() - 5 * 86_400_000).toISOString() };
    db.searchDocuments.mockResolvedValueOnce({ isSuccess: true, data: [recentRejection] });

    const result = await service.detectAndPropose({
      archetype: 'ORCHESTRATION',
      runId: 'r1',
      proposedBy: 'claude',
    });

    expect(result).toHaveLength(0);
  });

  it('6. Does not skip edge rejected outside window (> 30 days)', async () => {
    graphRag.query.mockResolvedValueOnce(edgeResult({ observationCount: 1 }));
    // rejection was 40 days ago (outside 30-day window)
    const oldRejection = { rejectedAt: new Date(Date.now() - 40 * 86_400_000).toISOString() };
    db.searchDocuments.mockResolvedValueOnce({ isSuccess: true, data: [oldRejection] });

    const result = await service.detectAndPropose({
      archetype: 'ORCHESTRATION',
      runId: 'r1',
      proposedBy: 'claude',
    });

    expect(result).toHaveLength(1);
  });

  it('7. Stores proposal in xiigen-graph-proposals', async () => {
    graphRag.query.mockResolvedValueOnce(edgeResult({ observationCount: 1 }));

    await service.detectAndPropose({
      archetype: 'ORCHESTRATION',
      runId: 'r1',
      proposedBy: 'claude',
    });

    expect(db.storeDocument).toHaveBeenCalledWith(
      'xiigen-graph-proposals',
      expect.objectContaining({ status: 'PENDING_SCREEN' }),
      expect.stringContaining('proposal-'),
    );
  });

  it('8. storeDocument failure is non-fatal — continues and returns empty', async () => {
    graphRag.query.mockResolvedValueOnce(edgeResult({ observationCount: 1 }));
    db.storeDocument.mockRejectedValueOnce(new Error('ES down'));

    const result = await service.detectAndPropose({
      archetype: 'ORCHESTRATION',
      runId: 'r1',
      proposedBy: 'claude',
    });

    // Error caught — returns empty (proposal not added since store failed)
    expect(result).toHaveLength(0);
  });
});
