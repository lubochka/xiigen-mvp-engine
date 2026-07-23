/**
 * FLOW-35 Phase H — SelfModification
 *
 * SK-407–SK-415: Engine self-modification protocols.
 * All modifications gated by EscalationBriefing approval.
 */

import {
  SelfModificationService,
  ModificationProtocol,
  ModificationRequest,
} from '../../src/engine/flows/generation-loop/self-modification.service';
import { DataProcessResult } from '../../src/kernel/data-process-result';

function makeDb() {
  const stored: any[] = [];
  return {
    storeDocument: jest.fn(async (_i: string, doc: any, _id?: string) => {
      stored.push({ _i, doc });
      return DataProcessResult.success(doc);
    }),
    _stored: stored,
  } as any;
}
function makeQueue() {
  const events: any[] = [];
  return {
    enqueue: jest.fn(async (e: string, d: any) => {
      events.push({ e, d });
      return DataProcessResult.success('ok');
    }),
    _events: events,
  } as any;
}

function makeRequest(
  protocol: ModificationProtocol = 'PROMPT_PATCH',
  overrides: Partial<ModificationRequest> = {},
): ModificationRequest {
  return {
    requestId: 'req-001',
    protocol,
    briefingId: 'brief-001',
    approvedBy: 'luba@xiigen.com',
    parameters: {},
    requestedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe('FLOW-35 Phase H — SelfModification', () => {
  it('F35H-1: PROMPT_PATCH protocol applies successfully', async () => {
    const svc = new SelfModificationService(makeDb(), makeQueue());
    const result = await svc.applyModification(makeRequest('PROMPT_PATCH'));
    expect(result.isSuccess).toBe(true);
    expect(result.data?.applied).toBe(true);
    expect(result.data?.protocol).toBe('PROMPT_PATCH');
  });

  it('F35H-2: all 9 protocol types are accepted', async () => {
    const protocols: ModificationProtocol[] = [
      'PROMPT_PATCH',
      'ARBITER_THRESHOLD',
      'MODEL_SWAP',
      'SKILL_UPDATE',
      'BFA_RULE_ADDITION',
      'FREEDOM_CONFIG_UPDATE',
      'FACTORY_VERSION_BUMP',
      'SESSION_OUTPUT_FORMAT',
      'ROLLBACK_PROTOCOL',
    ];
    const svc = new SelfModificationService(makeDb(), makeQueue());
    for (const p of protocols) {
      const result = await svc.applyModification(makeRequest(p, { requestId: `req-${p}` }));
      expect(result.isSuccess).toBe(true);
    }
  });

  it('F35H-3: missing briefingId rejected — EscalationBriefing gate mandatory', async () => {
    const svc = new SelfModificationService(makeDb(), makeQueue());
    const result = await svc.applyModification(makeRequest('PROMPT_PATCH', { briefingId: '' }));
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('MISSING_BRIEFING_ID');
  });

  it('F35H-4: missing approvedBy rejected — human gate mandatory', async () => {
    const svc = new SelfModificationService(makeDb(), makeQueue());
    const result = await svc.applyModification(makeRequest('MODEL_SWAP', { approvedBy: '' }));
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('MISSING_APPROVAL');
  });

  it('F35H-5: missing requestId rejected', async () => {
    const svc = new SelfModificationService(makeDb(), makeQueue());
    const result = await svc.applyModification(makeRequest('SKILL_UPDATE', { requestId: '' }));
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('MISSING_REQUEST_ID');
  });

  it('F35H-6: modification stored before emitting (DNA-8)', async () => {
    const db = makeDb();
    const queue = makeQueue();
    const svc = new SelfModificationService(db, queue);
    await svc.applyModification(makeRequest('ARBITER_THRESHOLD'));
    const storeOrder = db.storeDocument.mock.invocationCallOrder[0];
    const emitOrder = queue.enqueue.mock.invocationCallOrder[0];
    expect(storeOrder).toBeLessThan(emitOrder);
  });

  it('F35H-7: stores to modification-requests index with PENDING status', async () => {
    const db = makeDb();
    const svc = new SelfModificationService(db, makeQueue());
    await svc.applyModification(makeRequest('FREEDOM_CONFIG_UPDATE'));
    expect(db.storeDocument).toHaveBeenCalledWith(
      'modification-requests',
      expect.objectContaining({ status: 'PENDING' }),
      'req-001',
    );
  });

  it('F35H-8: emits engine.modification.X event with protocol name', async () => {
    const queue = makeQueue();
    const svc = new SelfModificationService(makeDb(), queue);
    await svc.applyModification(makeRequest('MODEL_SWAP'));
    expect(queue.enqueue).toHaveBeenCalledWith(
      'engine.modification.model_swap',
      expect.objectContaining({ protocol: 'MODEL_SWAP' }),
    );
  });

  it('F35H-9: resultSummary references briefingId', async () => {
    const svc = new SelfModificationService(makeDb(), makeQueue());
    const result = await svc.applyModification(
      makeRequest('BFA_RULE_ADDITION', { briefingId: 'brief-999' }),
    );
    expect(result.data?.resultSummary).toContain('brief-999');
  });

  it('F35H-10: SK-415 rollback marks rolledBack=true', async () => {
    const svc = new SelfModificationService(makeDb(), makeQueue());
    const result = await svc.rollback('req-001', 'Model performance degraded');
    expect(result.isSuccess).toBe(true);
    expect(result.data?.rolledBack).toBe(true);
    expect(result.data?.applied).toBe(false);
  });

  it('F35H-11: rollback stores to modification-rollbacks index', async () => {
    const db = makeDb();
    const svc = new SelfModificationService(db, makeQueue());
    await svc.rollback('req-001', 'Reason');
    expect(db.storeDocument).toHaveBeenCalledWith(
      'modification-rollbacks',
      expect.objectContaining({ requestId: 'req-001', reason: 'Reason' }),
    );
  });

  it('F35H-12: rollback emits engine.modification.rollback event', async () => {
    const queue = makeQueue();
    const svc = new SelfModificationService(makeDb(), queue);
    await svc.rollback('req-002', 'Performance degraded');
    expect(queue.enqueue).toHaveBeenCalledWith(
      'engine.modification.rollback',
      expect.objectContaining({ requestId: 'req-002' }),
    );
  });

  it('F35H-13: rollback with missing requestId returns failure', async () => {
    const svc = new SelfModificationService(makeDb(), makeQueue());
    const result = await svc.rollback('', 'reason');
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('MISSING_REQUEST_ID');
  });

  it('F35H-14: FACTORY_VERSION_BUMP protocol applies and emits correctly', async () => {
    const queue = makeQueue();
    const svc = new SelfModificationService(makeDb(), queue);
    const result = await svc.applyModification(
      makeRequest('FACTORY_VERSION_BUMP', { parameters: { factoryId: 'F1484', newVersion: 'v2' } }),
    );
    expect(result.isSuccess).toBe(true);
    expect(result.data?.protocol).toBe('FACTORY_VERSION_BUMP');
    expect(queue.enqueue).toHaveBeenCalledWith(
      'engine.modification.factory_version_bump',
      expect.any(Object),
    );
  });
});
