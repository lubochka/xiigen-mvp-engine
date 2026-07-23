/**
 * T640 TemplateUsageAnalytics — Phase D tests
 * FLOW-23: Form Builder Templates
 *
 * Tests: T640-1 through T640-5
 *   T640-1: Append-only metrics storeDocument (never updateDocument)
 *   T640-2: PII exclusion — user form input values NOT stored
 *   T640-3: Popularity score computed from (instantiation + submission) / age_days
 *   T640-4: Metrics remain PRIVATE knowledgeScope per tenant
 *   T640-5: UsageMetricsRecorded emitted with popularity score
 */

import 'reflect-metadata';
import { TemplateUsageAnalyticsService } from '../../../src/engine/flows/form-builder-templates/template-usage-analytics.service';

describe('T640 TemplateUsageAnalytics', () => {
  let service: TemplateUsageAnalyticsService;

  const mockDb = {
    searchDocuments: jest.fn(),
    storeDocument: jest.fn(),
  };

  const mockQueue = {
    enqueue: jest.fn(),
  };

  const mockCls = {
    get: jest.fn().mockReturnValue({ tenantId: 'tenant-001' }),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockDb.searchDocuments.mockResolvedValue({
      isSuccess: true,
      data: [
        {
          metricsId: 'metric-001',
          templateId: 'template-001',
          metricType: 'INSTANTIATION',
          recordedAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
        },
      ],
    });

    mockDb.storeDocument.mockResolvedValue({ isSuccess: true });
    mockQueue.enqueue.mockResolvedValue({ isSuccess: true });

    service = new TemplateUsageAnalyticsService(
      mockDb as unknown as ConstructorParameters<typeof TemplateUsageAnalyticsService>[0],
      mockQueue as unknown as ConstructorParameters<typeof TemplateUsageAnalyticsService>[1],
      mockCls as unknown as ConstructorParameters<typeof TemplateUsageAnalyticsService>[2],
    );
  });

  test('T640-1: Append-only metrics storeDocument (never updateDocument)', async () => {
    const result = await service.recordMetrics({
      templateId: 'template-001',
      instanceId: 'instance-001',
      metricType: 'INSTANTIATION',
    });

    expect(result.isSuccess).toBe(true);

    expect(mockDb.storeDocument).toHaveBeenCalledWith(
      'xiigen-template-usage-metrics',
      expect.objectContaining({
        templateId: 'template-001',
        metricType: 'INSTANTIATION',
      }),
      expect.any(String),
    );
  });

  test('T640-2: PII exclusion — user form input values NOT stored', async () => {
    const result = await service.recordMetrics({
      templateId: 'template-002',
      instanceId: 'instance-002',
      metadata: {
        fieldTypes: { name: 'string', email: 'string' },
        formData: { name: 'Alice', email: 'alice@example.com' },
        userInput: { someField: 'sensitive' },
        responseData: { result: 'success' },
      },
    });

    expect(result.isSuccess).toBe(true);

    const storeCall = mockDb.storeDocument.mock.calls[0];
    const storedDoc = storeCall[1] as Record<string, unknown>;
    const metadata = storedDoc['metadata'] as Record<string, unknown>;

    expect(metadata['formData']).toBeUndefined();
    expect(metadata['userInput']).toBeUndefined();
    expect(metadata['responseData']).toBeUndefined();
    expect(metadata['fieldTypes']).toBeDefined();
  });

  test('T640-3: Popularity score computed from (instantiation + submission) / age_days', async () => {
    const result = await service.recordMetrics({
      templateId: 'template-003',
      instanceId: 'instance-003',
      metricType: 'SUBMISSION',
    });

    expect(result.isSuccess).toBe(true);
    expect(result.data?.popularityScore).toBeGreaterThanOrEqual(0);

    expect(mockDb.storeDocument).toHaveBeenCalledWith(
      'xiigen-template-popularity',
      expect.objectContaining({
        instantiationCount: expect.any(Number),
        submissionCount: expect.any(Number),
        popularityScore: expect.any(Number),
      }),
      expect.any(String),
    );
  });

  test('T640-4: Metrics remain PRIVATE knowledgeScope per tenant', async () => {
    const result = await service.recordMetrics({
      templateId: 'template-004',
      instanceId: 'instance-004',
    });

    expect(result.isSuccess).toBe(true);

    const metricsCall = mockDb.storeDocument.mock.calls[0];
    const metricsDoc = metricsCall[1] as Record<string, unknown>;
    expect(metricsDoc['knowledgeScope']).toBe('PRIVATE');
    expect(metricsDoc['tenantId']).toBe('tenant-001');

    const popularityCall = mockDb.storeDocument.mock.calls[1];
    const popularityDoc = popularityCall[1] as Record<string, unknown>;
    expect(popularityDoc['knowledgeScope']).toBe('PRIVATE');
  });

  test('T640-5: UsageMetricsRecorded emitted with popularity score', async () => {
    const result = await service.recordMetrics({
      templateId: 'template-005',
      instanceId: 'instance-005',
      metricType: 'INSTANTIATION',
    });

    expect(result.isSuccess).toBe(true);

    expect(mockQueue.enqueue).toHaveBeenCalledWith(
      'UsageMetricsRecorded',
      expect.objectContaining({
        templateId: 'template-005',
        instanceId: 'instance-005',
        tenantId: 'tenant-001',
        metricType: 'INSTANTIATION',
        popularityScore: expect.any(Number),
      }),
    );
  });
});
