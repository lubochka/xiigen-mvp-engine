/**
 * checkConsentGate tests (CF-461)
 * GAP-M2 acceptance: 6 tests
 */

import { checkConsentGate } from '../gate-store-checker';
import type { IGateStore, GateEntry } from '../../../engine-contracts/gate-store.interface';

const createMockGateStore = (entry: GateEntry | undefined): IGateStore => ({
  get: jest.fn().mockResolvedValue(entry),
  set: jest.fn().mockResolvedValue(undefined),
  delete: jest.fn().mockResolvedValue(undefined),
});

describe('checkConsentGate (CF-461)', () => {
  it('returns failure when gate entry is missing (fail-closed)', async () => {
    const gateStore = createMockGateStore(undefined);
    const result = await checkConsentGate('student-123', gateStore, 'T368');
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('CONSENT_GATE_NOT_EVALUATED');
  });

  it('returns failure when gate status is DENIED', async () => {
    const gateStore = createMockGateStore({
      status: 'DENIED',
      evaluatedAt: '2026-03-30T10:00:00Z',
    });
    const result = await checkConsentGate('student-123', gateStore, 'T369');
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('CONSENT_GATE_CLOSED');
  });

  it('returns failure when gate status is PENDING', async () => {
    const gateStore = createMockGateStore({
      status: 'PENDING',
      evaluatedAt: '2026-03-30T10:00:00Z',
    });
    const result = await checkConsentGate('student-123', gateStore, 'T370');
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('CONSENT_GATE_CLOSED');
  });

  it('returns failure when gate status is WITHDRAWN', async () => {
    const gateStore = createMockGateStore({
      status: 'WITHDRAWN',
      evaluatedAt: '2026-03-30T10:00:00Z',
    });
    const result = await checkConsentGate('student-456', gateStore, 'T373');
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('CONSENT_GATE_CLOSED');
  });

  it('returns success when gate status is GRANTED', async () => {
    const gateStore = createMockGateStore({
      status: 'GRANTED',
      evaluatedAt: '2026-03-30T10:00:00Z',
      enrollmentId: 'enrollment-abc',
    });
    const result = await checkConsentGate('student-789', gateStore, 'T371');
    expect(result.isSuccess).toBe(true);
  });

  it('uses key format CONSENT_GATE:{studentId}', async () => {
    const gateStore = createMockGateStore({
      status: 'GRANTED',
      evaluatedAt: '2026-03-30T10:00:00Z',
    });
    await checkConsentGate('student-xyz', gateStore, 'T368');
    expect(gateStore.get).toHaveBeenCalledWith('CONSENT_GATE:student-xyz');
  });
});
