/**
 * EdgeVersioningService — unit tests (Phase 5)
 * 10 tests covering decay window clamping, unlock path, snapshot updates.
 */

import { Test } from '@nestjs/testing';
import { EdgeVersioningService } from './edge-versioning.service';
import { GRAPH_RAG_SERVICE } from '../interfaces/i-graph-rag.service';
import { DATABASE_SERVICE } from '../../interfaces';
import { GRAPH_CONFIG_READER } from '../planning/planning-abstracts';

function emptyEdgeResult() {
  return { edges: [], formatted: () => '' };
}
function edgeResult(confidence = 0.8, observationCount = 3) {
  return {
    edges: [
      {
        fromEntity: 'ORCHESTRATION',
        relationship: 'ROUTES_TO',
        toEntity: 'ACCEPT',
        confidence,
        observationCount,
        fromType: 'Archetype',
        toType: 'Action',
        immutable: false,
      },
    ],
    formatted: () => '',
  };
}

describe('EdgeVersioningService', () => {
  let service: EdgeVersioningService;
  let graphRag: { query: jest.Mock; updateEdgeWeight: jest.Mock };
  let db: { searchDocuments: jest.Mock; storeDocument: jest.Mock };
  let config: { get: jest.Mock };

  beforeEach(async () => {
    graphRag = {
      query: jest.fn().mockResolvedValue(emptyEdgeResult()),
      updateEdgeWeight: jest.fn().mockResolvedValue(undefined),
    };
    db = {
      searchDocuments: jest.fn().mockResolvedValue({ isSuccess: true, data: [] }),
      storeDocument: jest.fn().mockResolvedValue({ isSuccess: true }),
    };
    config = {
      get: jest.fn().mockImplementation((key: string) => {
        const k = key.toLowerCase();
        if (k.includes('decaywindow')) return Promise.resolve(0.2);
        if (k.includes('unlockcount')) return Promise.resolve(10);
        return Promise.resolve(0.2);
      }),
    };

    const module = await Test.createTestingModule({
      providers: [
        EdgeVersioningService,
        { provide: GRAPH_RAG_SERVICE, useValue: graphRag },
        { provide: DATABASE_SERVICE, useValue: db },
        { provide: GRAPH_CONFIG_READER, useValue: config },
      ],
    }).compile();

    service = module.get(EdgeVersioningService);
  });

  it('1. No existing edge → delta applied without clamping', async () => {
    graphRag.query.mockResolvedValueOnce(emptyEdgeResult());

    await service.updateWithDecayWindow({
      fromEntity: 'ORCHESTRATION',
      relationship: 'ROUTES_TO',
      toEntity: 'ACCEPT',
      delta: 0.05,
      observationId: 'r1',
    });

    expect(graphRag.updateEdgeWeight).toHaveBeenCalledWith(
      expect.objectContaining({ delta: 0.05 }),
    );
  });

  it('2. Delta within decay window → applied as-is', async () => {
    // snapshot = 0.80, window = ±0.20, candidate = 0.80 + 0.05 = 0.85 (within 0.60–1.00)
    graphRag.query.mockResolvedValueOnce(edgeResult(0.8, 3));
    db.searchDocuments.mockResolvedValueOnce({
      isSuccess: true,
      data: [{ highestConfidence: 0.8, flowCount: 2 }],
    });

    await service.updateWithDecayWindow({
      fromEntity: 'ORCHESTRATION',
      relationship: 'ROUTES_TO',
      toEntity: 'ACCEPT',
      delta: 0.05,
      observationId: 'r1',
    });

    const calledDelta = graphRag.updateEdgeWeight.mock.calls[0][0].delta as number;
    expect(calledDelta).toBeCloseTo(0.05, 5);
  });

  it('3. Delta exceeds upper decay window → clamped to window', async () => {
    // snapshot = 0.80, window = 0.20, upperBound = 1.00, candidate = 0.80 + 0.30 = 1.10 → clamped to 1.00, delta = 0.20
    graphRag.query.mockResolvedValueOnce(edgeResult(0.8, 3));
    db.searchDocuments.mockResolvedValueOnce({
      isSuccess: true,
      data: [{ highestConfidence: 0.8, flowCount: 2 }],
    });

    await service.updateWithDecayWindow({
      fromEntity: 'ORCHESTRATION',
      relationship: 'ROUTES_TO',
      toEntity: 'ACCEPT',
      delta: 0.3,
      observationId: 'r1',
    });

    // Effective delta clamped: 1.00 - 0.80 = 0.20
    const calledDelta = graphRag.updateEdgeWeight.mock.calls[0][0].delta as number;
    expect(calledDelta).toBeCloseTo(0.2, 5);
  });

  it('4. Delta exceeds lower decay window → clamped to floor', async () => {
    // snapshot = 0.80, window = 0.20, lowerBound = 0.60, candidate = 0.80 - 0.40 = 0.40 → clamped to 0.60, delta = -0.20
    graphRag.query.mockResolvedValueOnce(edgeResult(0.8, 3));
    db.searchDocuments.mockResolvedValueOnce({
      isSuccess: true,
      data: [{ highestConfidence: 0.8, flowCount: 2 }],
    });

    await service.updateWithDecayWindow({
      fromEntity: 'ORCHESTRATION',
      relationship: 'ROUTES_TO',
      toEntity: 'ACCEPT',
      delta: -0.4,
      observationId: 'r1',
    });

    const calledDelta = graphRag.updateEdgeWeight.mock.calls[0][0].delta as number;
    expect(calledDelta).toBeCloseTo(-0.2, 5);
  });

  it('5. Observation count > unlockCount → window not applied', async () => {
    // observationCount = 15 > flowCount(2) + unlockCount(10) = 12 → window unlocked
    graphRag.query.mockResolvedValueOnce(edgeResult(0.8, 15));
    db.searchDocuments.mockResolvedValueOnce({
      isSuccess: true,
      data: [{ highestConfidence: 0.8, flowCount: 2 }],
    });

    await service.updateWithDecayWindow({
      fromEntity: 'ORCHESTRATION',
      relationship: 'ROUTES_TO',
      toEntity: 'ACCEPT',
      delta: 0.3,
      observationId: 'r1',
    });

    // Unclamped delta applied
    expect(graphRag.updateEdgeWeight).toHaveBeenCalledWith(expect.objectContaining({ delta: 0.3 }));
  });

  it('6. New high confidence → snapshot stored', async () => {
    // current = 0.80, delta = 0.05, new = 0.85 > snapshot(0.80) → store
    graphRag.query.mockResolvedValueOnce(edgeResult(0.8, 3));
    db.searchDocuments.mockResolvedValueOnce({
      isSuccess: true,
      data: [{ highestConfidence: 0.8, flowCount: 2 }],
    });

    await service.updateWithDecayWindow({
      fromEntity: 'ORCHESTRATION',
      relationship: 'ROUTES_TO',
      toEntity: 'ACCEPT',
      delta: 0.05,
      observationId: 'r1',
    });

    expect(db.storeDocument).toHaveBeenCalledWith(
      'xiigen-edge-snapshots',
      expect.objectContaining({ highestConfidence: expect.any(Number) }),
      expect.any(String),
    );
  });

  it('7. No new high → snapshot not updated', async () => {
    // current = 0.80, delta = -0.05, new = 0.75 < snapshot(0.80) → no store
    graphRag.query.mockResolvedValueOnce(edgeResult(0.8, 3));
    db.searchDocuments.mockResolvedValueOnce({
      isSuccess: true,
      data: [{ highestConfidence: 0.8, flowCount: 2 }],
    });

    await service.updateWithDecayWindow({
      fromEntity: 'ORCHESTRATION',
      relationship: 'ROUTES_TO',
      toEntity: 'ACCEPT',
      delta: -0.05,
      observationId: 'r1',
    });

    expect(db.storeDocument).not.toHaveBeenCalled();
  });

  it('8. No snapshot in DB → uses current edge confidence as baseline', async () => {
    graphRag.query.mockResolvedValueOnce(edgeResult(0.8, 3));
    db.searchDocuments.mockResolvedValueOnce({ isSuccess: true, data: [] }); // no snapshot

    await service.updateWithDecayWindow({
      fromEntity: 'ORCHESTRATION',
      relationship: 'ROUTES_TO',
      toEntity: 'ACCEPT',
      delta: 0.05,
      observationId: 'r1',
    });

    // Should still call updateEdgeWeight
    expect(graphRag.updateEdgeWeight).toHaveBeenCalled();
  });

  it('9. Snapshot storeDocument failure is non-fatal', async () => {
    graphRag.query.mockResolvedValueOnce(edgeResult(0.8, 3));
    db.searchDocuments.mockResolvedValueOnce({ isSuccess: true, data: [] });
    db.storeDocument.mockRejectedValueOnce(new Error('ES down'));

    // Should not throw
    await expect(
      service.updateWithDecayWindow({
        fromEntity: 'ORCHESTRATION',
        relationship: 'ROUTES_TO',
        toEntity: 'ACCEPT',
        delta: 0.1,
        observationId: 'r1',
      }),
    ).resolves.toBeUndefined();
  });

  it('10. Queries snapshot index with correct edgeKey', async () => {
    graphRag.query.mockResolvedValueOnce(edgeResult(0.8, 3));

    await service.updateWithDecayWindow({
      fromEntity: 'SVC-A',
      relationship: 'DEPENDS_ON',
      toEntity: 'SVC-B',
      delta: 0.05,
      observationId: 'r1',
    });

    expect(db.searchDocuments).toHaveBeenCalledWith(
      'xiigen-edge-snapshots',
      expect.objectContaining({ edgeKey: 'SVC-A::DEPENDS_ON::SVC-B' }),
      1,
    );
  });
});
