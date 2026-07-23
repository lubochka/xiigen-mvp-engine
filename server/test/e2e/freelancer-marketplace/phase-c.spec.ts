/**
 * T615 DeliveryGateEscrowController — Phase C tests
 * FLOW-17: Freelancer Marketplace
 *
 * Tests: T615-1 through T615-6
 *   T615-1: No submitted delivery → DELIVERY_NOT_SUBMITTED; no funds released
 *   T615-2: Release success path — storeDocument(milestone:RELEASED) + audit + MilestoneReleased
 *   T615-3: storeDocument(audit) before enqueue(MilestoneReleased) — DNA-8
 *   T615-4: Dispute path — updateDocument(status:DISPUTED) only; no funds movement
 *   T615-5: storeDocument(audit) before enqueue(MilestoneDisputed) — DNA-8 on dispute path
 *   T615-6: Release failure → LIFO compensation started (EscrowCompensationStarted emitted)
 */

import 'reflect-metadata';
import { DeliveryGateEscrowControllerService } from '../../../src/engine/flows/freelancer-marketplace/delivery-gate-escrow-controller.service';

describe('T615 DeliveryGateEscrowController', () => {
  let service: DeliveryGateEscrowControllerService;

  // Track call order for DNA-8 verification
  const callOrder: string[] = [];

  const mockDb = {
    searchDocuments: jest.fn(),
    storeDocument: jest.fn(),
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

  beforeEach(() => {
    jest.clearAllMocks();
    callOrder.length = 0;

    // Default: submitted delivery exists
    mockDb.searchDocuments.mockResolvedValue({
      isSuccess: true,
      data: [{ deliveryId: 'del-001', milestoneId: 'ms-001', status: 'SUBMITTED' }],
    });

    // Default: all storeDocument calls succeed
    mockDb.storeDocument.mockImplementation(
      (index: string, _doc: Record<string, unknown>, _id?: string) => {
        callOrder.push(`storeDocument:${index}`);
        return Promise.resolve({ isSuccess: true });
      },
    );

    // Track enqueue calls
    mockQueue.enqueue.mockImplementation((eventType: string) => {
      callOrder.push(`enqueue:${eventType}`);
      return Promise.resolve({ isSuccess: true });
    });

    service = new DeliveryGateEscrowControllerService(
      mockDb as unknown as ConstructorParameters<typeof DeliveryGateEscrowControllerService>[0],
      mockQueue as unknown as ConstructorParameters<typeof DeliveryGateEscrowControllerService>[1],
      mockCls as unknown as ConstructorParameters<typeof DeliveryGateEscrowControllerService>[2],
    );
  });

  // T615-1: No submitted delivery → DELIVERY_NOT_SUBMITTED; no funds released
  test('T615-1: No submitted delivery → DELIVERY_NOT_SUBMITTED; no storeDocument to milestones', async () => {
    // No submitted delivery
    mockDb.searchDocuments.mockResolvedValueOnce({ isSuccess: true, data: [] });

    const result = await service.releaseEscrow({
      milestoneId: 'ms-001',
      contractId: 'contract-001',
    });

    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('DELIVERY_NOT_SUBMITTED');

    // No milestone storeDocument called — delivery gate blocked funds movement
    const milestoneStore = mockDb.storeDocument.mock.calls.find(
      (c: unknown[]) => c[0] === 'xiigen-milestones',
    );
    expect(milestoneStore).toBeUndefined();

    // No MilestoneReleased emitted
    expect(mockQueue.enqueue).not.toHaveBeenCalledWith('MilestoneReleased', expect.anything());
  });

  // T615-2: Release success path — storeDocument(milestone:RELEASED) called
  test('T615-2: Release success — storeDocument(milestone, status:RELEASED) called; MilestoneReleased emitted', async () => {
    const result = await service.releaseEscrow({
      milestoneId: 'ms-002',
      contractId: 'contract-001',
    });

    expect(result.isSuccess).toBe(true);
    expect(result.data).toHaveProperty('status', 'RELEASED');

    // Milestone storeDocument called with RELEASED status
    const milestoneStore = mockDb.storeDocument.mock.calls.find(
      (c: unknown[]) =>
        c[0] === 'xiigen-milestones' && (c[1] as Record<string, unknown>)['status'] === 'RELEASED',
    );
    expect(milestoneStore).toBeDefined();

    // MilestoneReleased emitted
    expect(mockQueue.enqueue).toHaveBeenCalledWith(
      'MilestoneReleased',
      expect.objectContaining({ milestoneId: 'ms-002' }),
    );
  });

  // T615-3: storeDocument(audit) before enqueue(MilestoneReleased) — DNA-8
  test('T615-3: storeDocument(audit) before enqueue(MilestoneReleased) — DNA-8 order verified', async () => {
    const result = await service.releaseEscrow({
      milestoneId: 'ms-003',
      contractId: 'contract-001',
    });

    expect(result.isSuccess).toBe(true);

    // DNA-8: audit storeDocument BEFORE MilestoneReleased enqueue
    const auditIdx = callOrder.findIndex((c) => c === 'storeDocument:xiigen-escrow-audit');
    const emitIdx = callOrder.findIndex((c) => c === 'enqueue:MilestoneReleased');
    expect(auditIdx).toBeGreaterThanOrEqual(0);
    expect(emitIdx).toBeGreaterThanOrEqual(0);
    expect(auditIdx).toBeLessThan(emitIdx);
  });

  // T615-4: Dispute path — updateDocument(status:DISPUTED) only; no funds movement
  test('T615-4: Dispute path — storeDocument(status:DISPUTED) called; no funds released; MilestoneDisputed emitted', async () => {
    const result = await service.raiseDispute({
      milestoneId: 'ms-004',
      contractId: 'contract-001',
      disputeReason: 'deliverable_not_meeting_spec',
    });

    expect(result.isSuccess).toBe(true);
    expect(result.data).toHaveProperty('status', 'DISPUTED');

    // storeDocument called with DISPUTED status — no funds movement
    const disputeStore = mockDb.storeDocument.mock.calls.find(
      (c: unknown[]) =>
        c[0] === 'xiigen-milestones' && (c[1] as Record<string, unknown>)['status'] === 'DISPUTED',
    );
    expect(disputeStore).toBeDefined();

    // MilestoneDisputed emitted
    expect(mockQueue.enqueue).toHaveBeenCalledWith(
      'MilestoneDisputed',
      expect.objectContaining({ milestoneId: 'ms-004' }),
    );

    // No MilestoneReleased emitted on dispute path
    expect(mockQueue.enqueue).not.toHaveBeenCalledWith('MilestoneReleased', expect.anything());
  });

  // T615-5: storeDocument(audit) before enqueue(MilestoneDisputed) — DNA-8 on dispute path
  test('T615-5: storeDocument(audit) before enqueue(MilestoneDisputed) — DNA-8 verified on dispute path', async () => {
    const result = await service.raiseDispute({
      milestoneId: 'ms-005',
      contractId: 'contract-001',
      disputeReason: 'quality_issue',
    });

    expect(result.isSuccess).toBe(true);

    // DNA-8: audit storeDocument BEFORE MilestoneDisputed enqueue
    const auditIdx = callOrder.findIndex((c) => c === 'storeDocument:xiigen-escrow-audit');
    const emitIdx = callOrder.findIndex((c) => c === 'enqueue:MilestoneDisputed');
    expect(auditIdx).toBeGreaterThanOrEqual(0);
    expect(emitIdx).toBeGreaterThanOrEqual(0);
    expect(auditIdx).toBeLessThan(emitIdx);
  });

  // T615-6: Release failure → LIFO compensation started
  test('T615-6: Release storeDocument failure → EscrowCompensationStarted emitted with LIFO chain', async () => {
    mockDb.storeDocument.mockImplementation(
      (index: string, _doc: Record<string, unknown>, _id?: string) => {
        callOrder.push(`storeDocument:${index}`);
        if (index === 'xiigen-milestones') {
          return Promise.resolve({
            isSuccess: false,
            errorMessage: 'milestone_write_failed',
          });
        }
        return Promise.resolve({ isSuccess: true });
      },
    );

    const result = await service.releaseEscrow({
      milestoneId: 'ms-006',
      contractId: 'contract-001',
    });

    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('RELEASE_FAILED');

    // LIFO compensation started
    expect(mockQueue.enqueue).toHaveBeenCalledWith(
      'EscrowCompensationStarted',
      expect.objectContaining({
        milestoneId: 'ms-006',
        reason: 'RELEASE_FAILED',
      }),
    );

    // Compensation chain should be LIFO order (reversed from forward registration)
    const compensationCall = mockQueue.enqueue.mock.calls.find(
      (c: unknown[]) => c[0] === 'EscrowCompensationStarted',
    );
    const payload = compensationCall![1] as Record<string, unknown>;
    const chain = payload['compensationChain'] as string[];
    // LIFO: [RESTORE_GIG_STATUS, REFUND_MILESTONE] — reversed from forward [REFUND_MILESTONE, RESTORE_GIG_STATUS]
    expect(chain[0]).toBe('RESTORE_GIG_STATUS');
    expect(chain[1]).toBe('REFUND_MILESTONE');
  });
});
