/**
 * S21 — FlowHttpController unit tests.
 *
 * Verifies that every HTTP endpoint delegates correctly to FlowApiController.
 * Does not test business logic (covered in flow-api.controller.spec.ts).
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ModuleRef } from '@nestjs/core';
import { FlowHttpController } from './flow-http.controller';
import { FlowApiController } from './flow-api.controller';
import { DataProcessResult } from '../kernel/data-process-result';
import { SCOPED_MEMORY_SERVICE } from '../fabrics/interfaces/scoped-memory.interface';
import { SCHEDULER_SERVICE } from '../fabrics/interfaces/scheduler.interface';

// ─── FlowApiController mock ────────────────────────────────────────────────

const mockApi: jest.Mocked<Partial<FlowApiController>> = {
  executeFlow: jest.fn(),
  getRunTrace: jest.fn(),
  getPrompt: jest.fn(),
  upsertPrompt: jest.fn(),
  deactivatePrompt: jest.fn(),
  searchRag: jest.fn(),
  getFlowState: jest.fn(),
  getLifecycleStatus: jest.fn(),
  updateLifecycleStatus: jest.fn(),
};

// ─── ModuleRef mock ────────────────────────────────────────────────────────

const mockModuleRef = { get: jest.fn() };

// ─── Helpers ───────────────────────────────────────────────────────────────

const ok = (data: unknown = {}) => DataProcessResult.success(data as Record<string, unknown>);

describe('S21 — FlowHttpController', () => {
  let module: TestingModule;
  let ctrl: FlowHttpController;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      providers: [
        FlowHttpController,
        { provide: FlowApiController, useValue: mockApi },
        { provide: ModuleRef, useValue: mockModuleRef },
      ],
    }).compile();

    ctrl = module.get<FlowHttpController>(FlowHttpController);
  });

  afterAll(async () => {
    await module.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ─── POST /api/flow/execute ──────────────────────────────────────────────

  it('executeFlow: delegates to api.executeFlow', async () => {
    (mockApi.executeFlow as jest.Mock).mockResolvedValueOnce(ok({ runId: 'r1' }));
    const body = {
      contract: { taskTypeId: 'T47' },
      inputs: { key: 'val' },
      tenantId: 'sys',
      flowId: 'FLOW-01',
    };
    const result = await ctrl.executeFlow(body);
    expect(mockApi.executeFlow).toHaveBeenCalledWith(body.contract, body.inputs, {
      tenantId: 'sys',
      flowId: 'FLOW-01',
    });
    expect(result).toMatchObject({ isSuccess: true });
  });

  it('executeFlow: uses empty inputs when not provided', async () => {
    (mockApi.executeFlow as jest.Mock).mockResolvedValueOnce(ok());
    await ctrl.executeFlow({ contract: { taskTypeId: 'T47' } } as any);
    expect(mockApi.executeFlow).toHaveBeenCalledWith(
      { taskTypeId: 'T47' },
      {},
      { tenantId: undefined, flowId: undefined },
    );
  });

  // ─── GET /api/runs/:runId/trace ──────────────────────────────────────────

  it('getRunTrace: delegates to api.getRunTrace', async () => {
    (mockApi.getRunTrace as jest.Mock).mockResolvedValueOnce(ok({ nodes: [] }));
    await ctrl.getRunTrace('run-abc');
    expect(mockApi.getRunTrace).toHaveBeenCalledWith('run-abc');
  });

  // ─── GET /api/prompts/:taskTypeId ────────────────────────────────────────

  it('getPrompt: delegates to api.getPrompt', async () => {
    (mockApi.getPrompt as jest.Mock).mockResolvedValueOnce(ok({ content: 'p' }));
    await ctrl.getPrompt('T47', 'generate', 'sys');
    expect(mockApi.getPrompt).toHaveBeenCalledWith('T47', 'generate', 'sys');
  });

  // ─── PUT /api/prompts/:taskTypeId ────────────────────────────────────────

  it('upsertPrompt: delegates to api.upsertPrompt', async () => {
    (mockApi.upsertPrompt as jest.Mock).mockResolvedValueOnce(ok());
    const body = { promptType: 'generate', content: 'c', version: '1.0.0' };
    await ctrl.upsertPrompt('T47', body);
    expect(mockApi.upsertPrompt).toHaveBeenCalledWith('T47', body);
  });

  // ─── DELETE /api/prompts/:taskTypeId ─────────────────────────────────────

  it('deactivatePrompt: delegates to api.deactivatePrompt', async () => {
    (mockApi.deactivatePrompt as jest.Mock).mockResolvedValueOnce(ok({ deactivated: 1 }));
    await ctrl.deactivatePrompt('T47', 'generate', 'sys');
    expect(mockApi.deactivatePrompt).toHaveBeenCalledWith('T47', 'generate', 'sys');
  });

  // ─── POST /api/rag/search ────────────────────────────────────────────────

  it('searchRag: delegates to api.searchRag', async () => {
    (mockApi.searchRag as jest.Mock).mockResolvedValueOnce(ok([]));
    const body = { namespace: 'flow-01', tags: ['service'] };
    await ctrl.searchRag(body);
    expect(mockApi.searchRag).toHaveBeenCalledWith(body);
  });

  // ─── GET /api/flow/:flowId/state ─────────────────────────────────────────

  it('getFlowState: delegates to api.getFlowState with query params', async () => {
    (mockApi.getFlowState as jest.Mock).mockResolvedValueOnce(ok({ flowId: 'F01' }));
    await ctrl.getFlowState('FLOW-01', 'T47', 'sys', 'r1');
    expect(mockApi.getFlowState).toHaveBeenCalledWith('FLOW-01', {
      taskTypeId: 'T47',
      tenantId: 'sys',
      runId: 'r1',
    });
  });

  // ─── GET /api/lifecycle/flows/:flowId ────────────────────────────────────

  it('getLifecycleStatus: delegates to api.getLifecycleStatus', async () => {
    (mockApi.getLifecycleStatus as jest.Mock).mockResolvedValueOnce(ok({ status: 'ACTIVE' }));
    await ctrl.getLifecycleStatus('FLOW-01');
    expect(mockApi.getLifecycleStatus).toHaveBeenCalledWith('FLOW-01');
  });

  // ─── PUT /api/lifecycle/flows/:flowId ────────────────────────────────────

  it('updateLifecycleStatus: delegates to api.updateLifecycleStatus', async () => {
    (mockApi.updateLifecycleStatus as jest.Mock).mockResolvedValueOnce(ok({ status: 'ACTIVE' }));
    const body = { status: 'ACTIVE', expectedStatus: 'PENDING', updatedBy: 'sys' };
    await ctrl.updateLifecycleStatus('FLOW-01', body);
    expect(mockApi.updateLifecycleStatus).toHaveBeenCalledWith('FLOW-01', body);
  });

  // ─── GET /api/engine/check-fabric ────────────────────────────────────────
  // Gate Check 10: IScopedMemoryService injectable
  // Gate Check 11: ISchedulerService injectable

  it('checkFabric: returns gatePassed=true when both fabric tokens resolve (Gate 10+11)', async () => {
    mockModuleRef.get.mockReturnValue({
      /* fake provider instance */
    });
    const result = await ctrl.checkFabric();
    expect(result.isSuccess).toBe(true);
    expect(result.gatePassed).toBe(true);
    expect(result.checks['IScopedMemoryService'].injectable).toBe(true);
    expect(result.checks['ISchedulerService'].injectable).toBe(true);
  });

  it('checkFabric: IScopedMemoryService check uses SCOPED_MEMORY_SERVICE token (Gate 10)', async () => {
    mockModuleRef.get.mockReturnValue({});
    await ctrl.checkFabric();
    expect(mockModuleRef.get).toHaveBeenCalledWith(SCOPED_MEMORY_SERVICE, { strict: false });
  });

  it('checkFabric: ISchedulerService check uses SCHEDULER_SERVICE token (Gate 11)', async () => {
    mockModuleRef.get.mockReturnValue({});
    await ctrl.checkFabric();
    expect(mockModuleRef.get).toHaveBeenCalledWith(SCHEDULER_SERVICE, { strict: false });
  });

  it('checkFabric: returns gatePassed=false when a fabric token is not injectable', async () => {
    mockModuleRef.get.mockImplementation((token: string) => {
      if (token === SCHEDULER_SERVICE) throw new Error('Not found');
      return {};
    });
    const result = await ctrl.checkFabric();
    expect(result.isSuccess).toBe(false);
    expect(result.gatePassed).toBe(false);
    expect(result.checks['IScopedMemoryService'].injectable).toBe(true);
    expect(result.checks['ISchedulerService'].injectable).toBe(false);
  });

  // ─── Controller is defined ───────────────────────────────────────────────

  it('controller is defined', () => {
    expect(ctrl).toBeDefined();
  });
});
