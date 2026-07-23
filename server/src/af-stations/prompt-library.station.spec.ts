/**
 * Unit tests for PromptLibraryStation — P22 three-tier prompt resolution.
 *
 * Tier 1: tenant-specific override
 * Tier 2: global default (tenantId = '')
 * Tier 3: hardcoded FALLBACK_PROMPTS
 *
 * DNA-3: All paths return DataProcessResult — never throw.
 */

import { PromptLibraryStation } from './prompt-library.station';
import { DataProcessResult } from '../kernel/data-process-result';
import { IDatabaseService } from '../fabrics/interfaces/database.interface';

function makeMockDb(): jest.Mocked<IDatabaseService> {
  return {
    storeDocument: jest.fn(),
    searchDocuments: jest.fn(),
    getDocument: jest.fn(),
    deleteDocument: jest.fn(),
    bulkStore: jest.fn(),
    countDocuments: jest.fn(),
  } as unknown as jest.Mocked<IDatabaseService>;
}

const TENANT_PROMPT_DOC = {
  promptId: 'prompt-001',
  promptText: 'Tenant-specific architect prompt',
  taskType: 'FLOW_GENERATE',
  role: 'architect',
  tenantId: 'tenant-abc',
  version: 2,
  isActive: true,
};

const GLOBAL_PROMPT_DOC = {
  promptId: 'prompt-002',
  promptText: 'Global default architect prompt',
  taskType: 'FLOW_GENERATE',
  role: 'architect',
  tenantId: '',
  version: 1,
  isActive: true,
};

describe('PromptLibraryStation', () => {
  let mockDb: jest.Mocked<IDatabaseService>;
  let station: PromptLibraryStation;

  beforeEach(() => {
    mockDb = makeMockDb();
    station = new PromptLibraryStation(mockDb);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('resolves tenant-specific override when present (Tier 1)', async () => {
    // Tier 1 returns a tenant doc
    mockDb.searchDocuments.mockResolvedValueOnce(DataProcessResult.success([TENANT_PROMPT_DOC]));

    const result = await station.resolve({
      domainId: 'flow-engine',
      taskType: 'FLOW_GENERATE',
      role: 'architect',
      tenantId: 'tenant-abc',
    });

    expect(result.isSuccess).toBe(true);
    expect(result.data).toBe('Tenant-specific architect prompt');
    // Only one DB call needed — Tier 1 hit
    expect(mockDb.searchDocuments).toHaveBeenCalledTimes(1);
  });

  it('falls back to global default when no tenant override (Tier 2)', async () => {
    // Tier 1: no tenant override
    mockDb.searchDocuments.mockResolvedValueOnce(DataProcessResult.success([]));
    // Tier 2: global default found
    mockDb.searchDocuments.mockResolvedValueOnce(DataProcessResult.success([GLOBAL_PROMPT_DOC]));

    const result = await station.resolve({
      domainId: 'flow-engine',
      taskType: 'FLOW_GENERATE',
      role: 'architect',
      tenantId: 'tenant-abc',
    });

    expect(result.isSuccess).toBe(true);
    expect(result.data).toBe('Global default architect prompt');
    expect(mockDb.searchDocuments).toHaveBeenCalledTimes(2);
  });

  it('falls back to hardcoded FALLBACK_PROMPTS when DB empty (Tier 3)', async () => {
    // Both Tier 1 and Tier 2 return empty
    mockDb.searchDocuments.mockResolvedValue(DataProcessResult.success([]));

    const result = await station.resolve({
      domainId: 'flow-engine',
      taskType: 'FLOW_GENERATE',
      role: 'architect',
      tenantId: 'tenant-xyz',
    });

    expect(result.isSuccess).toBe(true);
    // Should match the hardcoded FALLBACK_PROMPTS entry for 'FLOW_GENERATE::architect'
    expect(result.data).toContain('senior software architect');
  });

  it('returns PROMPT_NOT_FOUND when all tiers miss', async () => {
    // Both DB tiers return empty
    mockDb.searchDocuments.mockResolvedValue(DataProcessResult.success([]));

    const result = await station.resolve({
      domainId: 'unknown-domain',
      taskType: 'UNKNOWN_TASK',
      role: 'unknown-role',
      tenantId: 'tenant-xyz',
    });

    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('PROMPT_NOT_FOUND');
    expect(result.errorMessage).toContain('UNKNOWN_TASK');
  });

  it('never throws — returns DataProcessResult.failure on db error', async () => {
    mockDb.searchDocuments.mockResolvedValue(
      DataProcessResult.failure('DB_TIMEOUT', 'Connection timed out'),
    );

    let caughtError: unknown = null;
    let result: DataProcessResult<string> | null = null;

    try {
      result = await station.resolve({
        domainId: 'flow-engine',
        taskType: 'FLOW_GENERATE',
        role: 'architect',
        tenantId: 'tenant-abc',
      });
    } catch (e) {
      caughtError = e;
    }

    // DNA-3: must NOT throw
    expect(caughtError).toBeNull();
    expect(result).toBeInstanceOf(DataProcessResult);
    expect(result!.isSuccess).toBe(false);
    expect(result!.errorCode).toBe('DB_TIMEOUT');
  });

  it('resolves using Tier 2 when no tenantId provided', async () => {
    // No tenantId — goes straight to Tier 2
    mockDb.searchDocuments.mockResolvedValueOnce(DataProcessResult.success([GLOBAL_PROMPT_DOC]));

    const result = await station.resolve({
      domainId: 'flow-engine',
      taskType: 'FLOW_GENERATE',
      role: 'architect',
      // tenantId omitted
    });

    expect(result.isSuccess).toBe(true);
    expect(result.data).toBe('Global default architect prompt');
    // Only one DB call — Tier 1 skipped entirely
    expect(mockDb.searchDocuments).toHaveBeenCalledTimes(1);
  });
});
