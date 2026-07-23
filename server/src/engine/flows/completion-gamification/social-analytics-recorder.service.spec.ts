import { DataProcessResult } from '../../../kernel/data-process-result';
import { SocialAnalyticsRecorderService } from './social-analytics-recorder.service';

describe('SocialAnalyticsRecorderService (T95)', () => {
  let mockDb: { storeDocument: jest.Mock };
  let service: SocialAnalyticsRecorderService;

  beforeEach(() => {
    mockDb = {
      storeDocument: jest.fn().mockImplementation(async () => {
        return DataProcessResult.success({});
      }),
    };
    service = new SocialAnalyticsRecorderService(mockDb as any);
  });

  const baseInput = {
    shareIntentId: 'ssi-1',
    completionId: 'comp-1',
    userId: 'user-1',
    tenantId: 'tenant-1',
  };

  it('1. Happy path — storeDocument called ONCE, NO enqueue (OBSERVABILITY)', async () => {
    const result = await service.execute(baseInput);
    expect(result.isSuccess).toBe(true);
    expect(mockDb.storeDocument).toHaveBeenCalledTimes(1);
    // Service has no queue injected — no enqueue can occur
    expect(service.hasQueue).toBe(false);
  });

  it('2. analyticsRecordId returned', async () => {
    const result = await service.execute(baseInput);
    expect(result.data?.analyticsRecordId).toMatch(/^sar-/);
  });

  it('3. knowledge_scope: PRIVATE in stored doc', async () => {
    await service.execute(baseInput);
    const [, doc] = mockDb.storeDocument.mock.calls[0];
    expect(doc.knowledge_scope).toBe('PRIVATE');
  });

  it('4. Validation: missing shareIntentId → VALIDATION_FAILURE', async () => {
    const result = await service.execute({ ...baseInput, shareIntentId: '' });
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('VALIDATION_FAILURE');
  });

  it('5. Validation: missing completionId → VALIDATION_FAILURE', async () => {
    const result = await service.execute({ ...baseInput, completionId: '' });
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('VALIDATION_FAILURE');
  });

  it('6. Validation: missing userId → VALIDATION_FAILURE', async () => {
    const result = await service.execute({ ...baseInput, userId: '' });
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('VALIDATION_FAILURE');
  });

  it('7. storeDocument failure → failure', async () => {
    mockDb.storeDocument.mockResolvedValueOnce(DataProcessResult.failure('DB_ERROR', 'disk full'));
    const result = await service.execute(baseInput);
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('DB_ERROR'); // service propagates store error code
  });

  it('8. DNA-3: unexpected throw → SOCIAL_ANALYTICS_RECORDER_ERROR', async () => {
    mockDb.storeDocument.mockImplementationOnce(() => {
      throw new Error('unexpected');
    });
    const result = await service.execute(baseInput);
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('SOCIAL_ANALYTICS_RECORDER_ERROR');
  });
});
