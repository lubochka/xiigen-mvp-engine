/**
 * CrossModelSimulatorService — unit tests (Phase 5)
 * 10 tests covering V9-002, CLEAN/CONTESTED outcomes, storage.
 */

import { Test } from '@nestjs/testing';
import { CrossModelSimulatorService } from './cross-model-simulator.service';
import { AI_PROVIDER } from '../../interfaces';
import { DATABASE_SERVICE } from '../../interfaces';
import { GraphMutationProposal } from './mutation-proposal.types';

function makeProposal(proposedBy = 'claude'): GraphMutationProposal {
  return {
    id: 'prop-1',
    proposedBy,
    proposerRunId: 'r1',
    evidenceCount: 5,
    status: 'PENDING_SIMULATION',
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

describe('CrossModelSimulatorService', () => {
  let service: CrossModelSimulatorService;
  let ai: { generate: jest.Mock };
  let db: { storeDocument: jest.Mock };

  beforeEach(async () => {
    ai = {
      generate: jest
        .fn()
        .mockResolvedValue({ isSuccess: true, data: { text: 'CLEAN: looks good' } }),
    };
    db = { storeDocument: jest.fn().mockResolvedValue({ isSuccess: true }) };

    const module = await Test.createTestingModule({
      providers: [
        CrossModelSimulatorService,
        { provide: AI_PROVIDER, useValue: ai },
        { provide: DATABASE_SERVICE, useValue: db },
      ],
    }).compile();

    service = module.get(CrossModelSimulatorService);
  });

  it('1. V9-002: same model → SKIPPED status, crossModel=false', async () => {
    const result = await service.simulate(makeProposal('claude'), 'claude');

    expect(result.status).toBe('SKIPPED');
    expect(result.crossModel).toBe(false);
    expect(ai.generate).not.toHaveBeenCalled();
  });

  it('2. Different models → AI called', async () => {
    await service.simulate(makeProposal('claude'), 'gpt-4o');

    expect(ai.generate).toHaveBeenCalledWith(
      expect.stringContaining('ORCHESTRATION'),
      expect.objectContaining({ model: 'gpt-4o' }),
    );
  });

  it('3. AI returns CLEAN → status=CLEAN, crossModel=true', async () => {
    const result = await service.simulate(makeProposal('claude'), 'gpt-4o');

    expect(result.status).toBe('CLEAN');
    expect(result.crossModel).toBe(true);
  });

  it('4. AI returns CONTESTED → status=CONTESTED', async () => {
    ai.generate.mockResolvedValueOnce({
      isSuccess: true,
      data: { text: 'CONTESTED: risky change' },
    });

    const result = await service.simulate(makeProposal('claude'), 'gpt-4o');

    expect(result.status).toBe('CONTESTED');
  });

  it('5. AI failure → CONTESTED with error message', async () => {
    ai.generate.mockRejectedValueOnce(new Error('API error'));

    const result = await service.simulate(makeProposal('claude'), 'gpt-4o');

    expect(result.status).toBe('CONTESTED');
    expect(result.reasoning).toContain('API error');
  });

  it('6. Simulation result stored in xiigen-graph-proposals', async () => {
    await service.simulate(makeProposal('claude'), 'gpt-4o');

    expect(db.storeDocument).toHaveBeenCalledWith(
      'xiigen-graph-proposals',
      expect.objectContaining({ simulationReport: expect.anything(), status: 'PENDING_HUMAN' }),
      expect.stringContaining('prop-1-sim'),
    );
  });

  it('7. SKIPPED result also stored in xiigen-graph-proposals', async () => {
    await service.simulate(makeProposal('claude'), 'claude');

    expect(db.storeDocument).toHaveBeenCalledWith(
      'xiigen-graph-proposals',
      expect.objectContaining({ simulationReport: expect.objectContaining({ status: 'SKIPPED' }) }),
      expect.any(String),
    );
  });

  it('8. Prompt contains mutation details', async () => {
    await service.simulate(makeProposal('claude'), 'gpt-4o');

    const prompt = ai.generate.mock.calls[0][0] as string;
    expect(prompt).toContain('ROUTES_TO');
    expect(prompt).toContain('ACCEPT');
  });

  it('9. SimulatorModel and proposerModel recorded in report', async () => {
    const result = await service.simulate(makeProposal('claude'), 'gpt-4o');

    expect(result.simulatorModel).toBe('gpt-4o');
    expect(result.proposerModel).toBe('claude');
  });

  it('10. AI APPROVE response also counts as CLEAN', async () => {
    ai.generate.mockResolvedValueOnce({ isSuccess: true, data: { text: 'APPROVE: good edge' } });

    const result = await service.simulate(makeProposal('claude'), 'gpt-4o');

    expect(result.status).toBe('CLEAN');
  });
});
