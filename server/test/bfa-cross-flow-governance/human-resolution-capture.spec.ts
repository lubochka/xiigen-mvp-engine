/**
 * HumanResolutionCapture — Unit Tests (T383).
 *
 * Tests:
 *   CAP-1:  missing sessionId returns failure
 *   CAP-2:  missing tenantId returns UNSCOPED_QUERY failure
 *   CAP-3:  missing actorId returns failure
 *   CAP-4:  invalid decision returns INVALID_DECISION (CF-491)
 *   CAP-5:  FORCE_PROCEED without bfa:override returns PERMISSION_DENIED (IR-383-3)
 *   CAP-6:  FORCE_PROCEED with rationale < 50 chars returns RATIONALE_TOO_SHORT (CF-492)
 *   CAP-7:  session not in PENDING_RESOLUTION returns INVALID_SESSION_STATE (IR-383-1)
 *   CAP-8:  session not found returns SESSION_NOT_FOUND
 *   CAP-9:  APPROVE succeeds and returns CapturedDecision
 *   CAP-10: FORCE_PROCEED with bfa:override + rationale ≥ 50 chars succeeds
 *   CAP-11: APPROVE/REJECT/DEFER succeed without bfa:override
 *   CAP-12: duplicate capture returns existing without re-storing (DNA-7)
 */

import { HumanResolutionCapture } from '../../src/engine/flows/bfa-conflict-arbitration/human-resolution-capture.service';
import { DecisionOption } from '../../src/engine/flows/bfa-conflict-arbitration/impact-report-generator.service';
import { ArbitrationState } from '../../src/engine/flows/bfa-conflict-arbitration/arbitration-state-machine.service';
import { DataProcessResult } from '../../src/kernel/data-process-result';

const TENANT = 'tenant-cap-test';
const ACTOR = 'actor-001';
const NO_PERMS = ['bfa:read'];
const WITH_OVERRIDE = ['bfa:read', 'bfa:override'];
const LONG_RATIONALE =
  'This is a detailed rationale explaining why we must force proceed with this change immediately.';

function makeDb(sessionState: ArbitrationState = ArbitrationState.PENDING_RESOLUTION) {
  const sessions = new Map<string, Record<string, unknown>>();
  const decisions = new Map<string, Record<string, unknown>>();

  return {
    storeDocument: jest.fn(async (_i: string, doc: Record<string, unknown>, id?: string) => {
      const key = id ?? 'doc-1';
      if ((_i as string).includes('decisions')) decisions.set(key, { ...doc, _id: key });
      return DataProcessResult.success({ ...doc, _id: key });
    }),
    searchDocuments: jest.fn(async (_i: string, filters: Record<string, unknown>) => {
      if ((_i as string).includes('sessions')) {
        const sid = filters['session_id'] as string;
        const tid = filters['tenant_id'] as string;
        if (sid && tid) {
          const doc: Record<string, unknown> = {
            session_id: sid,
            tenant_id: tid,
            state: sessionState,
          };
          sessions.set(sid, doc);
          return DataProcessResult.success([doc]);
        }
        return DataProcessResult.success([]);
      }
      if ((_i as string).includes('decisions')) {
        const sid = filters['session_id'] as string;
        // Search by session_id value across all stored decisions
        const found = [...decisions.values()].find((d) => d['session_id'] === sid);
        return DataProcessResult.success(found ? [found] : []);
      }
      return DataProcessResult.success([]);
    }),
    _decisions: decisions,
  } as any;
}

function makeNoSessionDb() {
  return {
    storeDocument: jest.fn(async (_i: string, doc: Record<string, unknown>, id?: string) =>
      DataProcessResult.success({ ...doc, _id: id ?? 'doc-1' }),
    ),
    searchDocuments: jest.fn(async () => DataProcessResult.success([])),
  } as any;
}

function makeQueue() {
  const emitted: any[] = [];
  return {
    enqueue: jest.fn(async (evt: string, data: Record<string, unknown>) => {
      emitted.push({ evt, data });
      return DataProcessResult.success('msg-1');
    }),
    _emitted: emitted,
  } as any;
}

describe('HumanResolutionCapture — Unit (T383)', () => {
  it('CAP-1: missing sessionId returns failure', async () => {
    const svc = new HumanResolutionCapture(makeDb(), makeQueue());
    const r = await svc.captureDecision('', TENANT, DecisionOption.APPROVE, ACTOR, NO_PERMS);
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('MISSING_SESSION_ID');
  });

  it('CAP-2: missing tenantId returns UNSCOPED_QUERY failure', async () => {
    const svc = new HumanResolutionCapture(makeDb(), makeQueue());
    const r = await svc.captureDecision('sess-1', '', DecisionOption.APPROVE, ACTOR, NO_PERMS);
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('UNSCOPED_QUERY');
  });

  it('CAP-3: missing actorId returns failure', async () => {
    const svc = new HumanResolutionCapture(makeDb(), makeQueue());
    const r = await svc.captureDecision('sess-1', TENANT, DecisionOption.APPROVE, '', NO_PERMS);
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('MISSING_ACTOR_ID');
  });

  it('CAP-4: invalid decision returns INVALID_DECISION (CF-491)', async () => {
    const svc = new HumanResolutionCapture(makeDb(), makeQueue());
    const r = await svc.captureDecision('sess-1', TENANT, 'YOLO', ACTOR, NO_PERMS);
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('INVALID_DECISION');
    expect(r.errorMessage).toContain('CF-491');
  });

  it('CAP-5: FORCE_PROCEED without bfa:override returns PERMISSION_DENIED (IR-383-3)', async () => {
    const svc = new HumanResolutionCapture(makeDb(), makeQueue());
    const r = await svc.captureDecision(
      'sess-1',
      TENANT,
      DecisionOption.FORCE_PROCEED,
      ACTOR,
      NO_PERMS,
      LONG_RATIONALE,
    );
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('PERMISSION_DENIED');
    expect(r.errorMessage).toContain('IR-383-3');
  });

  it('CAP-6: FORCE_PROCEED with rationale < 50 chars returns RATIONALE_TOO_SHORT (CF-492)', async () => {
    const svc = new HumanResolutionCapture(makeDb(), makeQueue());
    const r = await svc.captureDecision(
      'sess-1',
      TENANT,
      DecisionOption.FORCE_PROCEED,
      ACTOR,
      WITH_OVERRIDE,
      'too short',
    );
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('RATIONALE_TOO_SHORT');
    expect(r.errorMessage).toContain('CF-492');
  });

  it('CAP-7: session not in PENDING_RESOLUTION returns INVALID_SESSION_STATE (IR-383-1)', async () => {
    const svc = new HumanResolutionCapture(makeDb(ArbitrationState.EXTRACTING), makeQueue());
    const r = await svc.captureDecision('sess-1', TENANT, DecisionOption.APPROVE, ACTOR, NO_PERMS);
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('INVALID_SESSION_STATE');
    expect(r.errorMessage).toContain('IR-383-1');
  });

  it('CAP-8: session not found returns SESSION_NOT_FOUND', async () => {
    const svc = new HumanResolutionCapture(makeNoSessionDb(), makeQueue());
    const r = await svc.captureDecision('ghost', TENANT, DecisionOption.APPROVE, ACTOR, NO_PERMS);
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('SESSION_NOT_FOUND');
  });

  it('CAP-9: APPROVE succeeds and returns CapturedDecision', async () => {
    const svc = new HumanResolutionCapture(makeDb(), makeQueue());
    const r = await svc.captureDecision(
      'sess-cap9',
      TENANT,
      DecisionOption.APPROVE,
      ACTOR,
      NO_PERMS,
    );
    expect(r.isSuccess).toBe(true);
    expect(r.data!.decision).toBe(DecisionOption.APPROVE);
    expect(r.data!.sessionId).toBe('sess-cap9');
    expect(r.data!.actorId).toBe(ACTOR);
    expect(r.data!.forceProceed).toBe(false);
  });

  it('CAP-10: FORCE_PROCEED with bfa:override + rationale ≥ 50 chars succeeds', async () => {
    const svc = new HumanResolutionCapture(makeDb(), makeQueue());
    const r = await svc.captureDecision(
      'sess-cap10',
      TENANT,
      DecisionOption.FORCE_PROCEED,
      ACTOR,
      WITH_OVERRIDE,
      LONG_RATIONALE,
    );
    expect(r.isSuccess).toBe(true);
    expect(r.data!.forceProceed).toBe(true);
    expect(r.data!.rationale).toBe(LONG_RATIONALE);
  });

  it('CAP-11: APPROVE/REJECT/DEFER succeed without bfa:override', async () => {
    for (const dec of [DecisionOption.APPROVE, DecisionOption.REJECT, DecisionOption.DEFER]) {
      const svc = new HumanResolutionCapture(makeDb(), makeQueue());
      const r = await svc.captureDecision(`sess-${dec}`, TENANT, dec, ACTOR, NO_PERMS);
      expect(r.isSuccess).toBe(true);
      expect(r.data!.decision).toBe(dec);
    }
  });

  it('CAP-12: duplicate capture returns existing without re-storing (DNA-7)', async () => {
    const db = makeDb();
    const svc = new HumanResolutionCapture(db, makeQueue());

    const first = await svc.captureDecision(
      'sess-dup',
      TENANT,
      DecisionOption.APPROVE,
      ACTOR,
      NO_PERMS,
    );
    const second = await svc.captureDecision(
      'sess-dup',
      TENANT,
      DecisionOption.REJECT,
      ACTOR,
      NO_PERMS,
    );

    expect(first.data!.decisionId).toBe(second.data!.decisionId);
    expect(db.storeDocument).toHaveBeenCalledTimes(1); // only one write
  });
});
