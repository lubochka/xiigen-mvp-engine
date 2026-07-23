/**
 * IHumanReviewService (F1403 — CF-736) tests
 * GAP-32-06: Fraud detection must route to human review, never auto-suspend
 */

import { DataProcessResult } from '../../../kernel/data-process-result';
import type { IHumanReviewService } from '../human-review.interface';

/** In-memory IHumanReviewService for testing. */
function createInMemoryHumanReviewService(): IHumanReviewService {
  const cases = new Map<
    string,
    {
      status: 'PENDING' | 'IN_REVIEW' | 'RESOLVED' | 'DISMISSED';
      reviewerId?: string;
      decision?: 'NO_ACTION' | 'WARNING' | 'SUSPENSION' | 'BAN';
      resolvedAt?: string;
    }
  >();

  let caseCounter = 1;

  return {
    async createReviewCase(params) {
      const caseId = `review-case-${caseCounter++}`;
      cases.set(caseId, { status: 'PENDING' });
      return DataProcessResult.success({
        caseId,
        queuePosition: caseCounter,
        estimatedReviewTime: '2h',
      });
    },
    async getCaseStatus(caseId) {
      const caseData = cases.get(caseId);
      if (!caseData) {
        return DataProcessResult.failure('CASE_NOT_FOUND', `No case with id ${caseId}`);
      }
      return DataProcessResult.success(caseData);
    },
  };
}

describe('IHumanReviewService (F1403 — CF-736)', () => {
  let service: IHumanReviewService;

  beforeEach(() => {
    service = createInMemoryHumanReviewService();
  });

  it('exposes createReviewCase() and getCaseStatus() methods', () => {
    expect(typeof service.createReviewCase).toBe('function');
    expect(typeof service.getCaseStatus).toBe('function');
  });

  it('does NOT have suspendAccount() method — CF-736 prohibition', () => {
    expect((service as unknown as Record<string, unknown>).suspendAccount).toBeUndefined();
  });

  it('does NOT have banTenant() method — CF-736 prohibition', () => {
    expect((service as unknown as Record<string, unknown>).banTenant).toBeUndefined();
  });

  it('creates a review case and returns caseId', async () => {
    const result = await service.createReviewCase({
      caseType: 'FRAUD_DETECTION',
      subjectTenantId: 'tenant-suspect-1',
      signals: [
        { type: 'SELF_INSTALL', publisherTenantId: 'tenant-1', consumerTenantId: 'tenant-1' },
      ],
      severity: 'HIGH',
      evidence: { installCount: 50, selfInstallFlag: true },
      cfRef: 'CF-736',
    });
    expect(result.isSuccess).toBe(true);
    expect(result.data?.caseId).toBeDefined();
    expect(typeof result.data?.caseId).toBe('string');
  });

  it('returns PENDING status for newly created case', async () => {
    const createResult = await service.createReviewCase({
      caseType: 'FRAUD_DETECTION',
      subjectTenantId: 'tenant-2',
      signals: [],
      severity: 'MEDIUM',
      evidence: {},
      cfRef: 'CF-736',
    });
    const statusResult = await service.getCaseStatus(createResult.data!.caseId);
    expect(statusResult.isSuccess).toBe(true);
    expect(statusResult.data?.status).toBe('PENDING');
  });

  it('returns CASE_NOT_FOUND for unknown caseId', async () => {
    const result = await service.getCaseStatus('non-existent-case-id');
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('CASE_NOT_FOUND');
  });

  it('creates separate cases for multiple fraud signals', async () => {
    const case1 = await service.createReviewCase({
      caseType: 'FRAUD_DETECTION',
      subjectTenantId: 'tenant-A',
      signals: [{ type: 'SELF_INSTALL' }],
      severity: 'HIGH',
      evidence: {},
      cfRef: 'CF-736',
    });
    const case2 = await service.createReviewCase({
      caseType: 'ABUSE_REPORT',
      subjectTenantId: 'tenant-B',
      signals: [{ type: 'ANOMALOUS_REVENUE' }],
      severity: 'LOW',
      evidence: {},
      cfRef: 'CF-736',
    });
    expect(case1.data?.caseId).not.toBe(case2.data?.caseId);
  });
});
