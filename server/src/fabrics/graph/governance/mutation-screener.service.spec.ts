/**
 * MutationScreenerService — unit tests (Phase 5)
 * 8 tests covering 3 screener checks and status updates.
 */

import { Test } from '@nestjs/testing';
import { MutationScreenerService } from './mutation-screener.service';
import { GRAPH_RAG_SERVICE } from '../interfaces/i-graph-rag.service';
import { DATABASE_SERVICE } from '../../interfaces';
import { GRAPH_CONFIG_READER } from '../planning/planning-abstracts';
import { GraphMutationProposal } from './mutation-proposal.types';

function emptyResult() {
  return { edges: [], formatted: () => '' };
}

function makeProposal(overrides: Partial<GraphMutationProposal> = {}): GraphMutationProposal {
  return {
    id: 'prop-1',
    proposedBy: 'claude',
    proposerRunId: 'r1',
    evidenceCount: 5,
    status: 'PENDING_SCREEN',
    createdAt: new Date().toISOString(),
    mutation: {
      type: 'ADD_EDGE',
      fromEntity: 'ORCHESTRATION',
      fromType: 'Archetype',
      relationship: 'ROUTES_TO',
      toEntity: 'ACCEPT',
      toType: 'Action',
      confidence: 0.8,
      reasoning: 'test',
    },
    ...overrides,
  };
}

describe('MutationScreenerService', () => {
  let service: MutationScreenerService;
  let graphRag: { query: jest.Mock };
  let db: { searchDocuments: jest.Mock; storeDocument: jest.Mock };
  let config: { get: jest.Mock };

  beforeEach(async () => {
    graphRag = { query: jest.fn().mockResolvedValue(emptyResult()) };
    db = {
      searchDocuments: jest.fn().mockResolvedValue({ isSuccess: true, data: [] }),
      storeDocument: jest.fn().mockResolvedValue({ isSuccess: true }),
    };
    config = { get: jest.fn().mockResolvedValue(3) };

    const module = await Test.createTestingModule({
      providers: [
        MutationScreenerService,
        { provide: GRAPH_RAG_SERVICE, useValue: graphRag },
        { provide: DATABASE_SERVICE, useValue: db },
        { provide: GRAPH_CONFIG_READER, useValue: config },
      ],
    }).compile();

    service = module.get(MutationScreenerService);
  });

  it('1. Passes when edge is non-immutable, no duplicate, evidence sufficient', async () => {
    const result = await service.screen(makeProposal());
    expect(result.passed).toBe(true);
  });

  it('2. IMMUTABLE block: immutable=true on existing edge', async () => {
    graphRag.query.mockResolvedValueOnce({
      edges: [
        {
          fromEntity: 'ORCHESTRATION',
          relationship: 'ROUTES_TO',
          toEntity: 'ACCEPT',
          confidence: 1.0,
          observationCount: 10,
          immutable: true,
          fromType: 'Archetype',
          toType: 'Action',
        },
      ],
      formatted: () => '',
    });

    const result = await service.screen(makeProposal());

    expect(result.passed).toBe(false);
    expect(result.blockedBy).toBe('IMMUTABLE');
  });

  it('3. DUPLICATE block: same from/to with different relationship', async () => {
    // First query (specific relationship) returns non-immutable
    graphRag.query
      .mockResolvedValueOnce(emptyResult()) // specific edge query — not immutable
      .mockResolvedValueOnce({
        // all edges query — finds duplicate
        edges: [
          {
            fromEntity: 'ORCHESTRATION',
            relationship: 'DIFFERENT_RELATIONSHIP',
            toEntity: 'ACCEPT',
            confidence: 0.8,
            observationCount: 3,
            immutable: false,
            fromType: 'Archetype',
            toType: 'Action',
          },
        ],
        formatted: () => '',
      });

    const result = await service.screen(makeProposal());

    expect(result.passed).toBe(false);
    expect(result.blockedBy).toBe('DUPLICATE');
  });

  it('4. INSUFFICIENT_EVIDENCE block: evidenceCount < minEvidence', async () => {
    const result = await service.screen(makeProposal({ evidenceCount: 1 }));

    expect(result.passed).toBe(false);
    expect(result.blockedBy).toBe('INSUFFICIENT_EVIDENCE');
  });

  it('5. Pass updates proposal status to PENDING_SIMULATION', async () => {
    await service.screen(makeProposal());

    expect(db.storeDocument).toHaveBeenCalledWith(
      'xiigen-graph-proposals',
      expect.objectContaining({ status: 'PENDING_SIMULATION' }),
      expect.any(String),
    );
  });

  it('6. Block updates proposal status to REJECTED', async () => {
    graphRag.query.mockResolvedValueOnce({
      edges: [
        {
          fromEntity: 'ORCHESTRATION',
          relationship: 'ROUTES_TO',
          toEntity: 'ACCEPT',
          confidence: 1.0,
          observationCount: 5,
          immutable: true,
          fromType: 'Archetype',
          toType: 'Action',
        },
      ],
      formatted: () => '',
    });

    await service.screen(makeProposal());

    expect(db.storeDocument).toHaveBeenCalledWith(
      'xiigen-graph-proposals',
      expect.objectContaining({ status: 'REJECTED' }),
      expect.any(String),
    );
  });

  it('7. Screener check order: IMMUTABLE before DUPLICATE', async () => {
    // Make edge immutable AND there would be a duplicate
    graphRag.query.mockResolvedValueOnce({
      edges: [
        {
          fromEntity: 'ORCHESTRATION',
          relationship: 'ROUTES_TO',
          toEntity: 'ACCEPT',
          confidence: 1.0,
          observationCount: 5,
          immutable: true,
          fromType: 'Archetype',
          toType: 'Action',
        },
      ],
      formatted: () => '',
    });

    const result = await service.screen(makeProposal());

    // Must be blocked by IMMUTABLE (checked first)
    expect(result.blockedBy).toBe('IMMUTABLE');
  });

  it('8. storeDocument failure on status update is non-fatal', async () => {
    db.storeDocument.mockRejectedValueOnce(new Error('ES down'));

    // Should resolve without throwing
    const result = await service.screen(makeProposal());
    expect(result.passed).toBe(true);
  });
});
