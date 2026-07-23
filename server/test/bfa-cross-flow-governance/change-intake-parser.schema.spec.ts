/**
 * ChangeIntakeParser — Schema Validation Tests (CF-473, IR-375-2, IR-375-3).
 *
 * Tests:
 *   S-1: all 4 CF-473 change_type values are accepted
 *   S-2: invalid change_type returns DataProcessResult.failure (CF-473)
 *   S-3: free-form string change_type is rejected (CF-473)
 *   S-4: missing actor returns DataProcessResult.failure (IR-375-3)
 *   S-5: empty actor string returns DataProcessResult.failure (IR-375-3)
 *   S-6: whitespace-only actor is rejected (IR-375-3)
 *   S-7: missing diffContent returns DataProcessResult.failure
 *   S-8: empty diffContent is rejected
 *   S-9: diffBlobRef is always sha256 — different inputs produce different hashes
 *   S-10: same diffContent always produces same sha256 (deterministic, IR-375-2)
 *   S-11: invalid change_type error message mentions CF-473 and valid values
 *   S-12: ChangeType enum has exactly 4 values (CF-473)
 */

import {
  ChangeIntakeParser,
  ChangeType,
} from '../../src/engine/flows/bfa-conflict-arbitration/change-intake-parser.service';
import { DataProcessResult } from '../../src/kernel/data-process-result';
import { createHash } from 'crypto';

function makeDb() {
  return {
    storeDocument: jest.fn(async (index: string, doc: Record<string, unknown>, docId?: string) =>
      DataProcessResult.success({ ...doc, _id: docId ?? 'id-1' }),
    ),
    searchDocuments: jest.fn(async () => DataProcessResult.success([])),
  } as any;
}

function makeQueue() {
  return {
    enqueue: jest.fn(async () => DataProcessResult.success('msg-1')),
  } as any;
}

const BASE_INPUT = { actor: 'dev@xiigen.io', diffContent: 'diff content for schema test' };

describe('ChangeIntakeParser — Schema Validation (CF-473, IR-375-2, IR-375-3)', () => {
  let parser: ChangeIntakeParser;

  beforeEach(() => {
    parser = new ChangeIntakeParser(makeDb(), makeQueue());
  });

  it('S-1: all 4 CF-473 change_type values are accepted', async () => {
    for (const ct of Object.values(ChangeType)) {
      const result = await parser.parseIntake({ ...BASE_INPUT, changeType: ct });
      expect(result.isSuccess).toBe(true);
      // Reset mocks for each iteration
      parser = new ChangeIntakeParser(makeDb(), makeQueue());
    }
  });

  it('S-2: invalid change_type returns failure (CF-473)', async () => {
    const result = await parser.parseIntake({ ...BASE_INPUT, changeType: 'INVALID_TYPE' });
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('INVALID_CHANGE_TYPE');
  });

  it('S-3: free-form string change_type is rejected (CF-473)', async () => {
    const freeForm = ['patch', 'hotfix', 'refactor', 'chore', 'feature'];
    for (const ct of freeForm) {
      const r = await parser.parseIntake({ ...BASE_INPUT, changeType: ct });
      expect(r.isSuccess).toBe(false);
      expect(r.errorCode).toBe('INVALID_CHANGE_TYPE');
    }
  });

  it('S-4: missing actor returns failure (IR-375-3)', async () => {
    const result = await parser.parseIntake({
      actor: '',
      changeType: ChangeType.SCHEMA_CHANGE,
      diffContent: 'diff',
    });
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('MISSING_ACTOR');
  });

  it('S-5: null-like actor is rejected (IR-375-3)', async () => {
    const result = await parser.parseIntake({
      actor: '',
      changeType: ChangeType.API_BREAK,
      diffContent: 'diff',
    });
    expect(result.isSuccess).toBe(false);
  });

  it('S-6: whitespace-only actor is rejected (IR-375-3)', async () => {
    const result = await parser.parseIntake({
      actor: '   ',
      changeType: ChangeType.FLOW_MODIFICATION,
      diffContent: 'diff',
    });
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('MISSING_ACTOR');
  });

  it('S-7: missing diffContent returns failure', async () => {
    const result = await parser.parseIntake({
      actor: 'dev@xiigen.io',
      changeType: ChangeType.SCHEMA_CHANGE,
      diffContent: '',
    });
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('MISSING_DIFF');
  });

  it('S-8: whitespace-only diffContent is rejected', async () => {
    const result = await parser.parseIntake({
      actor: 'dev@xiigen.io',
      changeType: ChangeType.DEPENDENCY_UPDATE,
      diffContent: '   ',
    });
    expect(result.isSuccess).toBe(false);
  });

  it('S-9: different diffContent produces different sha256 hashes', async () => {
    const r1 = await parser.parseIntake({
      ...BASE_INPUT,
      changeType: ChangeType.SCHEMA_CHANGE,
      diffContent: 'content A',
    });
    parser = new ChangeIntakeParser(makeDb(), makeQueue());
    const r2 = await parser.parseIntake({
      ...BASE_INPUT,
      changeType: ChangeType.SCHEMA_CHANGE,
      diffContent: 'content B',
    });

    expect(r1.data!.diffBlobRef).not.toBe(r2.data!.diffBlobRef);
  });

  it('S-10: same diffContent always produces same sha256 (deterministic, IR-375-2)', async () => {
    const content = 'deterministic content for sha256 test';
    const expected = createHash('sha256').update(content).digest('hex');

    const r1 = await parser.parseIntake({
      ...BASE_INPUT,
      changeType: ChangeType.SCHEMA_CHANGE,
      diffContent: content,
    });
    parser = new ChangeIntakeParser(makeDb(), makeQueue());
    const r2 = await parser.parseIntake({
      ...BASE_INPUT,
      changeType: ChangeType.SCHEMA_CHANGE,
      diffContent: content,
    });

    // Both reference the same sha256, r2 finds r1's existing doc
    expect(r1.data!.diffBlobRef).toBe(expected);
    expect(r2.data!.diffBlobRef).toBe(expected);
  });

  it('S-11: invalid change_type error message references CF-473 and lists valid values', async () => {
    const result = await parser.parseIntake({ ...BASE_INPUT, changeType: 'WRONG' });
    expect(result.isSuccess).toBe(false);
    expect(result.errorMessage).toContain('CF-473');
    // Must list at least one valid value
    expect(result.errorMessage).toContain('SCHEMA_CHANGE');
  });

  it('S-12: ChangeType enum has exactly 4 values (CF-473)', () => {
    const values = Object.values(ChangeType);
    expect(values).toHaveLength(4);
    expect(values).toContain('SCHEMA_CHANGE');
    expect(values).toContain('API_BREAK');
    expect(values).toContain('FLOW_MODIFICATION');
    expect(values).toContain('DEPENDENCY_UPDATE');
  });
});
