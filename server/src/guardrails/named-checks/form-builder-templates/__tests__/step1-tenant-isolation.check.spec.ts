/**
 * Tests for Step1TenantIsolationCheck — GAP-23-1 (CF-447)
 */

import { Step1TenantIsolationCheck } from '../step1-tenant-isolation.check';
import { DataProcessResult } from '../../../../kernel/data-process-result';
import { IDatabaseService } from '../../../../fabrics/interfaces/database.interface';

describe('Step1TenantIsolationCheck — GAP-23-1', () => {
  let check: Step1TenantIsolationCheck;
  let mockDb: jest.Mocked<IDatabaseService>;

  function makeTemplate(templateId: number, firstTaskTypeId: string) {
    return {
      _id: `template-${templateId}`,
      nodes: [
        { position: 0, taskTypeId: firstTaskTypeId },
        { position: 1, taskTypeId: 'T349' },
      ],
    };
  }

  beforeEach(() => {
    mockDb = {
      searchDocuments: jest.fn(),
    } as unknown as jest.Mocked<IDatabaseService>;

    check = new Step1TenantIsolationCheck(mockDb);
  });

  it('passes when T360 is position 0 in all 6 templates', async () => {
    mockDb.searchDocuments.mockImplementation((_index, filters) => {
      const id = (filters as Record<string, unknown>)['_id'] as string;
      const templateId = parseInt(id.replace('template-', ''), 10);
      return Promise.resolve(DataProcessResult.success([makeTemplate(templateId, 'T360')]));
    });

    const result = await check.evaluate();
    expect(result.isSuccess).toBe(true);
    expect(result.data?.passed).toBe(true);
    expect(result.data?.violations).toHaveLength(0);
  });

  it('fails with BUILD_FAILURE when T349 is at position 0 in template 71', async () => {
    mockDb.searchDocuments.mockImplementation((_index, filters) => {
      const id = (filters as Record<string, unknown>)['_id'] as string;
      const templateId = parseInt(id.replace('template-', ''), 10);
      const firstTask = templateId === 71 ? 'T349' : 'T360';
      return Promise.resolve(DataProcessResult.success([makeTemplate(templateId, firstTask)]));
    });

    const result = await check.evaluate();
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('CF-447_BUILD_FAILURE');
    expect(result.errorMessage).toContain('71');
  });

  it('fails when template is not found in registry', async () => {
    mockDb.searchDocuments.mockResolvedValue(DataProcessResult.success([]));

    const result = await check.evaluate();
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('CF-447_BUILD_FAILURE');
  });
});
