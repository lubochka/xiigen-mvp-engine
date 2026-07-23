/**
 * ChangeIntakeParser — Idempotency Tests (DNA-7).
 *
 * Duplicate intake (same sha256) must return existing record — no new write.
 *
 * Tests:
 *   I-1: duplicate intake returns existing ChangeDocument (same sha256)
 *   I-2: duplicate intake does NOT call storeDocument again
 *   I-3: duplicate intake does NOT call enqueue again
 *   I-4: returned document on duplicate has same diffBlobRef as original
 *   I-5: different diffContent = different record (not a false duplicate)
 *   I-6: duplicate intake still returns DataProcessResult.isSuccess=true
 */

import {
  ChangeIntakeParser,
  ChangeType,
} from '../../src/engine/flows/bfa-conflict-arbitration/change-intake-parser.service';
import { DataProcessResult } from '../../src/kernel/data-process-result';
import { createHash } from 'crypto';

const DIFF_CONTENT = 'diff --git a/order.ts b/order.ts\n+field: customerId';
const DIFF_BLOB_REF = createHash('sha256').update(DIFF_CONTENT).digest('hex');

const EXISTING_DOC: Record<string, unknown> = {
  change_id: 'chg-existing-123',
  change_type: ChangeType.API_BREAK,
  diff_blob_ref: DIFF_BLOB_REF,
  actor: 'original-actor@xiigen.io',
  description: 'Original description',
  source_ref: 'FLOW-02',
  created_at: '2026-01-01T00:00:00.000Z',
  status: 'pending',
};

function makeDbWithExisting() {
  const store = new Map<string, Record<string, unknown>>();
  store.set(EXISTING_DOC['change_id'] as string, EXISTING_DOC);

  return {
    storeDocument: jest.fn(async (index: string, doc: Record<string, unknown>, docId?: string) => {
      const id = (docId ?? 'new-id') as string;
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
  } as any;
}

function makeQueue() {
  return {
    enqueue: jest.fn(async () => DataProcessResult.success('msg-1')),
  } as any;
}

describe('ChangeIntakeParser — Idempotency (DNA-7)', () => {
  it('I-1: duplicate intake returns existing ChangeDocument (same sha256)', async () => {
    const db = makeDbWithExisting();
    const queue = makeQueue();
    const parser = new ChangeIntakeParser(db, queue);

    const result = await parser.parseIntake({
      actor: 'different-actor@xiigen.io',
      changeType: ChangeType.API_BREAK,
      diffContent: DIFF_CONTENT, // same content → same sha256
    });

    expect(result.isSuccess).toBe(true);
    // Returns the EXISTING document, not a new one
    expect(result.data!.changeId).toBe('chg-existing-123');
    expect(result.data!.diffBlobRef).toBe(DIFF_BLOB_REF);
  });

  it('I-2: duplicate intake does NOT call storeDocument again', async () => {
    const db = makeDbWithExisting();
    const queue = makeQueue();
    const parser = new ChangeIntakeParser(db, queue);

    await parser.parseIntake({
      actor: 'actor@xiigen.io',
      changeType: ChangeType.API_BREAK,
      diffContent: DIFF_CONTENT,
    });

    expect(db.storeDocument).not.toHaveBeenCalled();
  });

  it('I-3: duplicate intake does NOT call enqueue again', async () => {
    const db = makeDbWithExisting();
    const queue = makeQueue();
    const parser = new ChangeIntakeParser(db, queue);

    await parser.parseIntake({
      actor: 'actor@xiigen.io',
      changeType: ChangeType.API_BREAK,
      diffContent: DIFF_CONTENT,
    });

    expect(queue.enqueue).not.toHaveBeenCalled();
  });

  it('I-4: returned document on duplicate has same diffBlobRef as original', async () => {
    const db = makeDbWithExisting();
    const parser = new ChangeIntakeParser(db, makeQueue());

    const result = await parser.parseIntake({
      actor: 'actor@xiigen.io',
      changeType: ChangeType.API_BREAK,
      diffContent: DIFF_CONTENT,
    });

    expect(result.data!.diffBlobRef).toBe(DIFF_BLOB_REF);
  });

  it('I-5: different diffContent produces a different record (no false duplicate)', async () => {
    const db = makeDbWithExisting();
    const queue = makeQueue();
    const parser = new ChangeIntakeParser(db, queue);

    const result = await parser.parseIntake({
      actor: 'actor@xiigen.io',
      changeType: ChangeType.API_BREAK,
      diffContent: 'completely different diff content', // different content = different sha256
    });

    expect(result.isSuccess).toBe(true);
    // New document created — storeDocument called
    expect(db.storeDocument).toHaveBeenCalledTimes(1);
    expect(result.data!.changeId).not.toBe('chg-existing-123');
  });

  it('I-6: duplicate intake still returns DataProcessResult.isSuccess=true', async () => {
    const db = makeDbWithExisting();
    const parser = new ChangeIntakeParser(db, makeQueue());

    const result = await parser.parseIntake({
      actor: 'actor@xiigen.io',
      changeType: ChangeType.API_BREAK,
      diffContent: DIFF_CONTENT,
    });

    expect(result.isSuccess).toBe(true);
    expect(result.errorCode).toBeUndefined();
  });
});
