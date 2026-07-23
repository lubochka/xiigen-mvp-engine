/**
 * RejectionReasonService — unit tests (Phase 5)
 * 10 tests covering rejection storage, wasRejected check, applyApproved, rollback.
 */

import { Test } from '@nestjs/testing';
import { RejectionReasonService } from './rejection-reason.service';
import { GRAPH_RAG_SERVICE } from '../interfaces/i-graph-rag.service';
import { DATABASE_SERVICE } from '../../interfaces';
import { GraphMutationProposal } from './mutation-proposal.types';

function makeProposal(): GraphMutationProposal {
  return {
    id: 'prop-1',
    proposedBy: 'claude',
    proposerRunId: 'r1',
    evidenceCount: 5,
    status: 'PENDING_HUMAN',
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
  };
}

describe('RejectionReasonService', () => {
  let service: RejectionReasonService;
  let graphRag: { upsertEdge: jest.Mock };
  let db: { searchDocuments: jest.Mock; storeDocument: jest.Mock };

  beforeEach(async () => {
    graphRag = { upsertEdge: jest.fn().mockResolvedValue(undefined) };
    db = {
      searchDocuments: jest.fn().mockResolvedValue({ isSuccess: true, data: [] }),
      storeDocument: jest.fn().mockResolvedValue({ isSuccess: true }),
    };

    const module = await Test.createTestingModule({
      providers: [
        RejectionReasonService,
        { provide: GRAPH_RAG_SERVICE, useValue: graphRag },
        { provide: DATABASE_SERVICE, useValue: db },
      ],
    }).compile();

    service = module.get(RejectionReasonService);
  });

  it('1. storeRejectionReason: stores in xiigen-graph-rejections', async () => {
    await service.storeRejectionReason(makeProposal(), 'test reason', 'human');

    expect(db.storeDocument).toHaveBeenCalledWith(
      'xiigen-graph-rejections',
      expect.objectContaining({ reason: 'test reason', decidedBy: 'human' }),
      expect.any(String),
    );
  });

  it('2. storeRejectionReason: updates proposal status to REJECTED', async () => {
    await service.storeRejectionReason(makeProposal(), 'rejected', 'human');

    expect(db.storeDocument).toHaveBeenCalledWith(
      'xiigen-graph-proposals',
      expect.objectContaining({ status: 'REJECTED' }),
      expect.any(String),
    );
  });

  it('3. wasRejected: returns false when no rejections found', async () => {
    const result = await service.wasRejected('ORCHESTRATION', 'ROUTES_TO', 'ACCEPT');
    expect(result).toBe(false);
  });

  it('4. wasRejected: returns true for recent rejection (within window)', async () => {
    const recentRejection = { rejectedAt: new Date(Date.now() - 5 * 86_400_000).toISOString() };
    db.searchDocuments.mockResolvedValueOnce({ isSuccess: true, data: [recentRejection] });

    const result = await service.wasRejected('ORCHESTRATION', 'ROUTES_TO', 'ACCEPT', 30);
    expect(result).toBe(true);
  });

  it('5. wasRejected: returns false for old rejection (outside window)', async () => {
    const oldRejection = { rejectedAt: new Date(Date.now() - 60 * 86_400_000).toISOString() };
    db.searchDocuments.mockResolvedValueOnce({ isSuccess: true, data: [oldRejection] });

    const result = await service.wasRejected('ORCHESTRATION', 'ROUTES_TO', 'ACCEPT', 30);
    expect(result).toBe(false);
  });

  it('6. applyApprovedMutation: calls graphRag.upsertEdge with mutation values', async () => {
    await service.applyApprovedMutation(makeProposal(), 'human');

    expect(graphRag.upsertEdge).toHaveBeenCalledWith(
      expect.objectContaining({
        fromEntity: 'ORCHESTRATION',
        relationship: 'ROUTES_TO',
        toEntity: 'ACCEPT',
        confidence: 0.8,
      }),
    );
  });

  it('7. applyApprovedMutation: updates proposal status to APPROVED', async () => {
    await service.applyApprovedMutation(makeProposal(), 'human');

    expect(db.storeDocument).toHaveBeenCalledWith(
      'xiigen-graph-proposals',
      expect.objectContaining({ status: 'APPROVED' }),
      expect.any(String),
    );
  });

  it('8. rollback: calls graphRag.upsertEdge with confidence=0.0', async () => {
    await service.rollback(makeProposal());

    expect(graphRag.upsertEdge).toHaveBeenCalledWith(
      expect.objectContaining({
        confidence: 0.0,
      }),
    );
  });

  it('9. rollback: updates proposal status to ROLLED_BACK', async () => {
    await service.rollback(makeProposal());

    expect(db.storeDocument).toHaveBeenCalledWith(
      'xiigen-graph-proposals',
      expect.objectContaining({ status: 'ROLLED_BACK' }),
      expect.any(String),
    );
  });

  it('10. wasRejected queries xiigen-graph-rejections with correct filters', async () => {
    await service.wasRejected('SVC-A', 'DEPENDS_ON', 'SVC-B');

    expect(db.searchDocuments).toHaveBeenCalledWith(
      'xiigen-graph-rejections',
      expect.objectContaining({
        fromEntity: 'SVC-A',
        relationship: 'DEPENDS_ON',
        toEntity: 'SVC-B',
      }),
      1,
    );
  });
});
