/**
 * ChangeIntakeParser — main unit tests.
 *
 * FLOW-25-B: ChangeIntakeParser [T375]
 * Covers happy path, basic validation, and full document shape.
 *
 * Tests:
 *   U-1: parseIntake returns ChangeDocument on valid input
 *   U-2: returned ChangeDocument has all required fields
 *   U-3: diffBlobRef is sha256 hex of diffContent (32 bytes = 64 hex chars)
 *   U-4: changeId is generated and non-empty
 *   U-5: status is always 'pending' on new intake
 *   U-6: optional fields (description, sourceRef) default to empty string
 *   U-7: db.storeDocument is called once per new intake
 *   U-8: queue.enqueue is called once per new intake
 *   U-9: parseIntake returns DataProcessResult.isSuccess=true on valid input
 */

import {
  ChangeIntakeParser,
  ChangeType,
} from '../../src/engine/flows/bfa-conflict-arbitration/change-intake-parser.service';
import { DataProcessResult } from '../../src/kernel/data-process-result';
import { createHash } from 'crypto';

// ── In-memory test doubles ─────────────────────────────────────────────────

function makeDb(initialDocs: Record<string, unknown>[] = []) {
  const store = new Map<string, Record<string, unknown>>();
  for (const doc of initialDocs) {
    store.set(doc['change_id'] as string, doc);
  }

  return {
    storeDocument: jest.fn(async (index: string, doc: Record<string, unknown>, docId?: string) => {
      const id = (docId ?? doc['change_id'] ?? 'doc-' + Date.now()) as string;
      store.set(id, { ...doc, _id: id });
      return DataProcessResult.success({ ...doc, _id: id });
    }),
    searchDocuments: jest.fn(async (index: string, filters: Record<string, unknown>) => {
      const results: Record<string, unknown>[] = [];
      for (const doc of store.values()) {
        const match = Object.entries(filters).every(([k, v]) => doc[k] === v);
        if (match) results.push(doc);
      }
      return DataProcessResult.success(results);
    }),
    getDocument: jest.fn(async () => DataProcessResult.failure('NOT_FOUND', 'not found')),
    deleteDocument: jest.fn(async () => DataProcessResult.failure('NO_DELETE', 'insert-only')),
    bulkStore: jest.fn(async () => DataProcessResult.success({ count: 0 })),
    countDocuments: jest.fn(async () => DataProcessResult.success(0)),
  } as any;
}

function makeQueue() {
  const emitted: Array<{ eventType: string; data: Record<string, unknown> }> = [];
  return {
    enqueue: jest.fn(async (eventType: string, data: Record<string, unknown>) => {
      emitted.push({ eventType, data });
      return DataProcessResult.success('msg-id-1');
    }),
    dequeue: jest.fn(async () => DataProcessResult.success([])),
    acknowledge: jest.fn(async () => DataProcessResult.success(true)),
    sendToDlq: jest.fn(async () => DataProcessResult.success('dlq-1')),
    _emitted: emitted,
  } as any;
}

const VALID_INPUT = {
  actor: 'dev@xiigen.io',
  changeType: ChangeType.SCHEMA_CHANGE,
  diffContent: 'diff --git a/schema.ts b/schema.ts\n+++ add field orderId: string',
  description: 'Add orderId to OrderSchema',
  sourceRef: 'FLOW-01',
};

// ── Tests ──────────────────────────────────────────────────────────────────

describe('ChangeIntakeParser — Unit', () => {
  let db: ReturnType<typeof makeDb>;
  let queue: ReturnType<typeof makeQueue>;
  let parser: ChangeIntakeParser;

  beforeEach(() => {
    db = makeDb();
    queue = makeQueue();
    parser = new ChangeIntakeParser(db as any, queue as any);
  });

  it('U-1: parseIntake returns DataProcessResult.isSuccess=true on valid input', async () => {
    const result = await parser.parseIntake(VALID_INPUT);
    expect(result.isSuccess).toBe(true);
  });

  it('U-2: returned ChangeDocument has all required fields', async () => {
    const result = await parser.parseIntake(VALID_INPUT);
    const doc = result.data!;
    expect(doc.changeId).toBeTruthy();
    expect(doc.changeType).toBe(ChangeType.SCHEMA_CHANGE);
    expect(doc.diffBlobRef).toBeTruthy();
    expect(doc.actor).toBe('dev@xiigen.io');
    expect(doc.description).toBe('Add orderId to OrderSchema');
    expect(doc.sourceRef).toBe('FLOW-01');
    expect(doc.createdAt).toBeTruthy();
    expect(doc.status).toBe('pending');
  });

  it('U-3: diffBlobRef is sha256 hex of diffContent (64 hex chars)', async () => {
    const result = await parser.parseIntake(VALID_INPUT);
    const expected = createHash('sha256').update(VALID_INPUT.diffContent).digest('hex');
    expect(result.data!.diffBlobRef).toBe(expected);
    expect(result.data!.diffBlobRef).toHaveLength(64);
  });

  it('U-4: changeId is generated and non-empty', async () => {
    const result = await parser.parseIntake(VALID_INPUT);
    expect(result.data!.changeId).toBeTruthy();
    expect(result.data!.changeId.startsWith('chg-')).toBe(true);
  });

  it('U-5: status is always pending on new intake', async () => {
    const result = await parser.parseIntake(VALID_INPUT);
    expect(result.data!.status).toBe('pending');
  });

  it('U-6: optional fields default to empty string when omitted', async () => {
    const minimal = {
      actor: 'dev@xiigen.io',
      changeType: ChangeType.API_BREAK,
      diffContent: 'some diff',
    };
    const result = await parser.parseIntake(minimal);
    expect(result.data!.description).toBe('');
    expect(result.data!.sourceRef).toBe('');
  });

  it('U-7: db.storeDocument called exactly once per new intake', async () => {
    await parser.parseIntake(VALID_INPUT);
    expect(db.storeDocument).toHaveBeenCalledTimes(1);
  });

  it('U-8: queue.enqueue called exactly once per new intake', async () => {
    await parser.parseIntake(VALID_INPUT);
    expect(queue.enqueue).toHaveBeenCalledTimes(1);
  });

  it('U-9: queue event contains change_id and diff_blob_ref', async () => {
    const result = await parser.parseIntake(VALID_INPUT);
    const event = queue._emitted[0];
    expect(event.eventType).toBe('change.parsed');
    expect(event.data.change_id).toBe(result.data!.changeId);
    expect(event.data.diff_blob_ref).toBe(result.data!.diffBlobRef);
  });
});
