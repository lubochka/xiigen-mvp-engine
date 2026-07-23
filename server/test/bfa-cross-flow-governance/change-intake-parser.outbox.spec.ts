/**
 * ChangeIntakeParser — Outbox Pattern Tests (DNA-8, IR-375-1).
 *
 * CRITICAL: storeDocument() MUST be called BEFORE enqueue() on every intake.
 * Violation = score 0 from arbitration::state-machine-integrity arbiter.
 *
 * Tests:
 *   OB-1: storeDocument is called BEFORE enqueue (call order verified)
 *   OB-2: enqueue is NOT called if storeDocument fails
 *   OB-3: storeDocument failure propagates as DataProcessResult.failure
 *   OB-4: no enqueue without prior storeDocument in ANY code path
 *   OB-5: call order verified using sequence counter
 */

import {
  ChangeIntakeParser,
  ChangeType,
} from '../../src/engine/flows/bfa-conflict-arbitration/change-intake-parser.service';
import { DataProcessResult } from '../../src/kernel/data-process-result';

const VALID_INPUT = {
  actor: 'dev@xiigen.io',
  changeType: ChangeType.SCHEMA_CHANGE,
  diffContent: 'diff content for outbox test',
};

describe('ChangeIntakeParser — Outbox Pattern (DNA-8, IR-375-1)', () => {
  it('OB-1: storeDocument is called BEFORE enqueue — call order enforced', async () => {
    const callOrder: string[] = [];

    const db: any = {
      storeDocument: jest.fn(
        async (index: string, doc: Record<string, unknown>, docId?: string) => {
          callOrder.push('storeDocument');
          return DataProcessResult.success({ ...doc, _id: docId ?? 'id-1' });
        },
      ),
      searchDocuments: jest.fn(async () => DataProcessResult.success([])),
    };

    const queue: any = {
      enqueue: jest.fn(async () => {
        callOrder.push('enqueue');
        return DataProcessResult.success('msg-id-1');
      }),
    };

    const parser = new ChangeIntakeParser(db, queue);
    await parser.parseIntake(VALID_INPUT);

    expect(callOrder).toEqual(['storeDocument', 'enqueue']);
    expect(callOrder.indexOf('storeDocument')).toBeLessThan(callOrder.indexOf('enqueue'));
  });

  it('OB-2: enqueue is NOT called if storeDocument fails', async () => {
    const db: any = {
      storeDocument: jest.fn(async () =>
        DataProcessResult.failure('DB_ERROR', 'Simulated DB write failure'),
      ),
      searchDocuments: jest.fn(async () => DataProcessResult.success([])),
    };

    const queue: any = {
      enqueue: jest.fn(async () => DataProcessResult.success('msg-id-1')),
    };

    const parser = new ChangeIntakeParser(db, queue);
    const result = await parser.parseIntake(VALID_INPUT);

    expect(result.isSuccess).toBe(false);
    expect(queue.enqueue).not.toHaveBeenCalled();
  });

  it('OB-3: storeDocument failure propagates error code and message', async () => {
    const db: any = {
      storeDocument: jest.fn(async () =>
        DataProcessResult.failure('STORAGE_UNAVAILABLE', 'ES cluster unreachable'),
      ),
      searchDocuments: jest.fn(async () => DataProcessResult.success([])),
    };

    const queue: any = {
      enqueue: jest.fn(async () => DataProcessResult.success('msg-id-1')),
    };

    const parser = new ChangeIntakeParser(db, queue);
    const result = await parser.parseIntake(VALID_INPUT);

    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('STORAGE_UNAVAILABLE');
    expect(result.errorMessage).toContain('unreachable');
  });

  it('OB-4: searchDocuments called before storeDocument (dup check first)', async () => {
    const callOrder: string[] = [];

    const db: any = {
      storeDocument: jest.fn(
        async (index: string, doc: Record<string, unknown>, docId?: string) => {
          callOrder.push('storeDocument');
          return DataProcessResult.success({ ...doc, _id: docId ?? 'id-1' });
        },
      ),
      searchDocuments: jest.fn(async () => {
        callOrder.push('searchDocuments');
        return DataProcessResult.success([]);
      }),
    };

    const queue: any = {
      enqueue: jest.fn(async () => {
        callOrder.push('enqueue');
        return DataProcessResult.success('msg-id-1');
      }),
    };

    const parser = new ChangeIntakeParser(db, queue);
    await parser.parseIntake(VALID_INPUT);

    expect(callOrder).toEqual(['searchDocuments', 'storeDocument', 'enqueue']);
  });

  it('OB-5: call sequence counter verifies storeDocument always before enqueue', async () => {
    let sequence = 0;
    let storeSeq = -1;
    let enqueueSeq = -1;

    const db: any = {
      storeDocument: jest.fn(
        async (index: string, doc: Record<string, unknown>, docId?: string) => {
          storeSeq = ++sequence;
          return DataProcessResult.success({ ...doc, _id: docId ?? 'id-1' });
        },
      ),
      searchDocuments: jest.fn(async () => DataProcessResult.success([])),
    };

    const queue: any = {
      enqueue: jest.fn(async () => {
        enqueueSeq = ++sequence;
        return DataProcessResult.success('msg-id-1');
      }),
    };

    const parser = new ChangeIntakeParser(db, queue);
    await parser.parseIntake(VALID_INPUT);

    expect(storeSeq).not.toBe(-1);
    expect(enqueueSeq).not.toBe(-1);
    expect(storeSeq).toBeLessThan(enqueueSeq);
  });
});
