/**
 * IGameficationLedger (DD-222 append-only) tests
 * GAP-M8 acceptance: 5 tests
 */

import { DataProcessResult } from '../../../kernel/data-process-result';
import type { IGameficationLedger, LedgerEntry } from '../gamification-ledger.interface';

/** In-memory IGameficationLedger for testing (not production code). */
function createInMemoryGamificationLedger(): IGameficationLedger {
  const entries: LedgerEntry[] = [];
  return {
    async append(entry) {
      const full: LedgerEntry = {
        ...entry,
        entryId: `entry-${entries.length + 1}`,
        occurredAt: new Date().toISOString(),
      };
      entries.push(full);
      return DataProcessResult.success(full);
    },
    async getBalance(studentId: string) {
      const total = entries
        .filter((e) => e.studentId === studentId)
        .reduce((sum, e) => sum + e.points, 0);
      return DataProcessResult.success(total);
    },
    async getHistory(studentId: string, limit?: number) {
      const studentEntries = entries.filter((e) => e.studentId === studentId);
      const limited = limit ? studentEntries.slice(0, limit) : studentEntries;
      return DataProcessResult.success(limited);
    },
  };
}

describe('IGameficationLedger (DD-222 append-only)', () => {
  let ledger: IGameficationLedger;

  beforeEach(() => {
    ledger = createInMemoryGamificationLedger();
  });

  it('should expose append(), getBalance(), and getHistory() methods', () => {
    expect(typeof ledger.append).toBe('function');
    expect(typeof ledger.getBalance).toBe('function');
    expect(typeof ledger.getHistory).toBe('function');
  });

  it('should NOT have update() method on interface', () => {
    expect((ledger as unknown as Record<string, unknown>).update).toBeUndefined();
  });

  it('should NOT have delete() method on interface', () => {
    expect((ledger as unknown as Record<string, unknown>).delete).toBeUndefined();
  });

  it('allows multiple entries for same student on same day', async () => {
    await ledger.append({
      studentId: 'student-1',
      eventType: 'QUIZ_COMPLETED',
      points: 10,
      sourceId: 'q1',
      metadata: {},
    });
    await ledger.append({
      studentId: 'student-1',
      eventType: 'STREAK_BONUS',
      points: 5,
      sourceId: 's1',
      metadata: {},
    });
    const balance = await ledger.getBalance('student-1');
    expect(balance.data).toBe(15);
  });

  it('getBalance sums positive and negative entries', async () => {
    await ledger.append({
      studentId: 'student-2',
      eventType: 'QUIZ_COMPLETED',
      points: 100,
      sourceId: 'q1',
      metadata: {},
    });
    await ledger.append({
      studentId: 'student-2',
      eventType: 'POINTS_CORRECTION',
      points: -20,
      sourceId: 'corr1',
      metadata: {},
    });
    const balance = await ledger.getBalance('student-2');
    expect(balance.data).toBe(80);
  });
});
