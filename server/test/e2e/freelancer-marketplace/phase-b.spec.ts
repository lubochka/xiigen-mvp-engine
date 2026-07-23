/**
 * T614 MilestoneContractManager — Phase B tests
 * FLOW-17: Freelancer Marketplace
 *
 * Tests: T614-1 through T614-5
 *   T614-1: Immutable field write attempt → ContractFieldImmutable; no storeDocument
 *   T614-2: Milestones sum !== contractTotal → MilestoneSumMismatch; no write
 *   T614-3: OCC conflict → ContractUpdateConflict; no FreelancerContractActivated
 *   T614-4: storeDocument(audit) called before enqueue(FreelancerContractActivated) — DNA-8
 *   T614-5: FreelancerContractActivated payload carries required fields
 */

import 'reflect-metadata';
import { MilestoneContractManagerService } from '../../../src/engine/flows/freelancer-marketplace/milestone-contract-manager.service';

describe('T614 MilestoneContractManager', () => {
  let service: MilestoneContractManagerService;

  // Track call order for DNA-8 verification
  const callOrder: string[] = [];

  const mockDb = {
    searchDocuments: jest.fn(),
    storeDocument: jest.fn(),
    storeDocumentWithOCC: jest.fn(),
  };

  const mockQueue = {
    enqueue: jest.fn(),
  };

  const mockCls = {
    get: jest.fn().mockReturnValue({ tenantId: 'tenant-001' }),
    getCurrentTenantId: jest.fn().mockReturnValue({
      isSuccess: true,
      data: 'tenant-001',
    }),
  };

  const validContract = {
    contractId: 'contract-001',
    clientId: 'client-001',
    contractTotal: 1000,
    gigId: 'gig-001',
    freelancerId: 'fl-001',
    tenantId: 'tenant-001',
    _version: 'v1',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    callOrder.length = 0;

    // Default: contract exists
    mockDb.searchDocuments.mockResolvedValue({
      isSuccess: true,
      data: [validContract],
    });

    // Default: all storeDocument calls succeed, tracking order
    mockDb.storeDocument.mockImplementation(
      (index: string, _doc: Record<string, unknown>, _id?: string) => {
        callOrder.push(`storeDocument:${index}`);
        return Promise.resolve({ isSuccess: true });
      },
    );

    // Default: storeDocumentWithOCC calls succeed (for contract OCC writes)
    mockDb.storeDocumentWithOCC.mockImplementation(
      (index: string, _doc: Record<string, unknown>, _id?: string) => {
        callOrder.push(`storeDocumentWithOCC:${index}`);
        return Promise.resolve({ isSuccess: true, data: { seqNo: 1, primaryTerm: 1 } });
      },
    );

    // Track enqueue calls
    mockQueue.enqueue.mockImplementation((eventType: string) => {
      callOrder.push(`enqueue:${eventType}`);
      return Promise.resolve({ isSuccess: true });
    });

    service = new MilestoneContractManagerService(
      mockDb as unknown as ConstructorParameters<typeof MilestoneContractManagerService>[0],
      mockQueue as unknown as ConstructorParameters<typeof MilestoneContractManagerService>[1],
      mockCls as unknown as ConstructorParameters<typeof MilestoneContractManagerService>[2],
    );
  });

  // T614-1: Immutable field write attempt → ContractFieldImmutable; no storeDocument
  test('T614-1: immutable field (clientId) write attempt → ContractFieldImmutable; no storeDocument called', async () => {
    const result = await service.updateContractMilestones({
      contractId: 'contract-001',
      fieldsToUpdate: ['clientId'], // immutable field
      milestones: [{ milestoneId: 'm-1', amount: 1000, description: 'M1' }],
    });

    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('FIELD_IMMUTABLE');

    // ContractFieldImmutable emitted
    expect(mockQueue.enqueue).toHaveBeenCalledWith(
      'ContractFieldImmutable',
      expect.objectContaining({
        field: 'clientId',
        reason: 'CONTRACT_IMMUTABLE_FIELD',
        contractId: 'contract-001',
      }),
    );

    // No storeDocument to contracts index
    const contractStore = mockDb.storeDocument.mock.calls.find(
      (c: unknown[]) => c[0] === 'xiigen-freelancer-contracts',
    );
    expect(contractStore).toBeUndefined();
  });

  // T614-2: Milestones sum !== contractTotal → MilestoneSumMismatch
  test('T614-2: milestones sum (900) !== contractTotal (1000) → MilestoneSumMismatch; no write', async () => {
    const result = await service.updateContractMilestones({
      contractId: 'contract-001',
      fieldsToUpdate: ['milestones'],
      milestones: [
        { milestoneId: 'm-1', amount: 500, description: 'M1' },
        { milestoneId: 'm-2', amount: 400, description: 'M2' }, // sum = 900, not 1000
      ],
    });

    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('MILESTONE_SUM_MISMATCH');

    // MilestoneSumMismatch emitted
    expect(mockQueue.enqueue).toHaveBeenCalledWith(
      'MilestoneSumMismatch',
      expect.objectContaining({
        expected: 1000,
        actual: 900,
        contractId: 'contract-001',
      }),
    );

    // No FreelancerContractActivated emitted
    expect(mockQueue.enqueue).not.toHaveBeenCalledWith(
      'FreelancerContractActivated',
      expect.anything(),
    );
  });

  // T614-3: OCC conflict → ContractUpdateConflict; no FreelancerContractActivated
  test('T614-3: OCC conflict on storeDocumentWithOCC → ContractUpdateConflict; no FreelancerContractActivated', async () => {
    mockDb.storeDocumentWithOCC.mockImplementation(
      (index: string, _doc: Record<string, unknown>, _id?: string) => {
        callOrder.push(`storeDocument:${index}`);
        if (index === 'xiigen-freelancer-contracts') {
          return Promise.resolve({
            isSuccess: false,
            errorCode: 'OCC_CONFLICT',
            errorMessage: 'OCC conflict detected',
          });
        }
        return Promise.resolve({ isSuccess: true });
      },
    );

    const result = await service.updateContractMilestones({
      contractId: 'contract-001',
      fieldsToUpdate: ['milestones'],
      milestones: [
        { milestoneId: 'm-1', amount: 600, description: 'M1' },
        { milestoneId: 'm-2', amount: 400, description: 'M2' }, // sum = 1000
      ],
    });

    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('OCC_CONFLICT');

    // ContractUpdateConflict emitted
    expect(mockQueue.enqueue).toHaveBeenCalledWith(
      'ContractUpdateConflict',
      expect.objectContaining({
        contractId: 'contract-001',
        reason: 'concurrent_update',
      }),
    );

    // No FreelancerContractActivated emitted
    expect(mockQueue.enqueue).not.toHaveBeenCalledWith(
      'FreelancerContractActivated',
      expect.anything(),
    );
  });

  // T614-4: storeDocument(audit) before enqueue(FreelancerContractActivated) — DNA-8
  test('T614-4: storeDocument(audit) called before enqueue(FreelancerContractActivated) — DNA-8 order verified', async () => {
    const result = await service.updateContractMilestones({
      contractId: 'contract-001',
      fieldsToUpdate: ['milestones'],
      milestones: [
        { milestoneId: 'm-1', amount: 600, description: 'M1' },
        { milestoneId: 'm-2', amount: 400, description: 'M2' }, // sum = 1000
      ],
    });

    expect(result.isSuccess).toBe(true);

    // DNA-8: audit storeDocument BEFORE FreelancerContractActivated enqueue
    const auditIdx = callOrder.findIndex((c) => c === 'storeDocument:xiigen-contract-audit');
    const emitIdx = callOrder.findIndex((c) => c === 'enqueue:FreelancerContractActivated');
    expect(auditIdx).toBeGreaterThanOrEqual(0);
    expect(emitIdx).toBeGreaterThanOrEqual(0);
    expect(auditIdx).toBeLessThan(emitIdx);
  });

  // T614-5: FreelancerContractActivated payload carries required fields
  test('T614-5: FreelancerContractActivated payload carries: tenantId, contractId, milestoneCount, contractTotal, activatedAt', async () => {
    const result = await service.updateContractMilestones({
      contractId: 'contract-001',
      fieldsToUpdate: ['milestones'],
      milestones: [
        { milestoneId: 'm-1', amount: 600, description: 'M1' },
        { milestoneId: 'm-2', amount: 400, description: 'M2' },
      ],
    });

    expect(result.isSuccess).toBe(true);

    const activatedCall = mockQueue.enqueue.mock.calls.find(
      (c: unknown[]) => c[0] === 'FreelancerContractActivated',
    );
    expect(activatedCall).toBeDefined();
    const payload = activatedCall![1] as Record<string, unknown>;
    expect(payload).toHaveProperty('tenantId', 'tenant-001');
    expect(payload).toHaveProperty('contractId', 'contract-001');
    expect(payload).toHaveProperty('milestoneCount', 2);
    expect(payload).toHaveProperty('contractTotal', 1000);
    expect(payload).toHaveProperty('activatedAt');
  });
});
