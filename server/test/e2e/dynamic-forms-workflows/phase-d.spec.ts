/**
 * T632 SubmissionAnalyticsCollector — Phase D tests
 * FLOW-21: Dynamic Forms & Workflows
 *
 * Tests: T632-1 through T632-5
 *   T632-1: PII exclusion — email, phone, ssn not in analytics-safe fields
 *   T632-2: Append-only analytics — insert creates new record
 *   T632-3: Aggregate metrics — submitCount incremented, errorRate calculated
 *   T632-4: Tenant-scoped aggregation — tenantId matches submitter tenant
 *   T632-5: Date partitioning — analytics index includes date partition
 */

import 'reflect-metadata';
import { SubmissionAnalyticsCollectorService } from '../../../src/engine/flows/dynamic-forms-workflows/submission-analytics-collector.service';

describe('T632 SubmissionAnalyticsCollector', () => {
  let service: SubmissionAnalyticsCollectorService;

  const mockDb = {
    searchDocuments: jest.fn(),
    storeDocument: jest.fn(),
  };

  const mockCls = {
    get: jest.fn().mockReturnValue({ tenantId: 'tenant-001' }),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockDb.searchDocuments.mockImplementation(() => Promise.resolve({ isSuccess: true, data: [] }));

    mockDb.storeDocument.mockImplementation(() => Promise.resolve({ isSuccess: true }));

    service = new SubmissionAnalyticsCollectorService(
      mockDb as unknown as ConstructorParameters<typeof SubmissionAnalyticsCollectorService>[0],
      mockCls as unknown as ConstructorParameters<typeof SubmissionAnalyticsCollectorService>[1],
    );
  });

  // T632-1: PII exclusion
  test('T632-1: PII fields excluded from analytics-safe fields', async () => {
    await service.collectAnalytics({
      submissionId: 'sub-001',
      formId: 'form-001',
      valid: true,
      data: {
        email: 'user@example.com',
        phone: '+1234567890',
        ssn: '123-45-6789',
        name: 'John Doe',
        address: '123 Main St',
      },
    });

    const analyticsStoreCall = mockDb.storeDocument.mock.calls[0];
    const analyticsRecord = analyticsStoreCall![1] as Record<string, unknown>;

    expect(analyticsRecord['analyticsSafeFieldCount']).toBe(2); // name, address
    expect(analyticsRecord['fieldCount']).toBe(5); // all fields
  });

  // T632-2: Append-only storage
  test('T632-2: Append-only analytics — analytics record inserted', async () => {
    const result = await service.collectAnalytics({
      submissionId: 'sub-002',
      formId: 'form-002',
      valid: true,
      data: { name: 'Alice', address: '456 Oak Ave' },
    });

    expect(result.isSuccess).toBe(true);
    expect(result.data).toEqual(
      expect.objectContaining({
        analyticsRecorded: true,
        aggregateUpdated: true,
      }),
    );

    const analyticsCall = mockDb.storeDocument.mock.calls.find((call) =>
      call[0].includes('submission-analytics'),
    );
    expect(analyticsCall).toBeDefined();
  });

  // T632-3: Aggregate metrics
  test('T632-3: Aggregate metrics — submitCount, errorRate updated', async () => {
    mockDb.searchDocuments.mockReturnValueOnce(
      Promise.resolve({
        isSuccess: true,
        data: [
          {
            aggregateId: 'agg-001',
            submitCount: 5,
            validCount: 4,
            errorRate: 20,
          },
        ],
      }),
    );

    await service.collectAnalytics({
      submissionId: 'sub-003',
      formId: 'form-003',
      valid: false,
      data: { name: 'Bob' },
    });

    const aggregateCall = mockDb.storeDocument.mock.calls.find(
      (call) => call[0] === 'xiigen-aggregate-metrics',
    );
    expect(aggregateCall).toBeDefined();

    const aggregateRecord = aggregateCall![1] as Record<string, unknown>;
    expect(aggregateRecord['submitCount']).toBe(6);
    expect(aggregateRecord['errorRate'] as number).toBeGreaterThan(0);
  });

  // T632-4: Tenant-scoped
  test('T632-4: Tenant-scoped aggregation — tenantId from ALS', async () => {
    const result = await service.collectAnalytics({
      submissionId: 'sub-004',
      formId: 'form-004',
      valid: true,
      data: { name: 'Charlie' },
    });

    expect(result.isSuccess).toBe(true);

    const analyticsCall = mockDb.storeDocument.mock.calls[0];
    const analyticsRecord = analyticsCall![1] as Record<string, unknown>;

    expect(analyticsRecord['tenantId']).toBe('tenant-001');
  });

  // T632-5: Date partitioning
  test('T632-5: Date partitioning — analytics index includes date partition', async () => {
    await service.collectAnalytics({
      submissionId: 'sub-005',
      formId: 'form-005',
      valid: true,
      data: { name: 'Diana' },
    });

    const analyticsCall = mockDb.storeDocument.mock.calls[0];
    const indexName = analyticsCall![0] as string;

    expect(indexName).toMatch(/xiigen-submission-analytics-\d{4}-\d{2}-\d{2}/);
  });
});
