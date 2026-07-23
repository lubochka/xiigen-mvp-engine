/**
 * FLOW-37 Phase C — HybridGenesisPromptBuilder (T591) Tests.
 *
 * 10 tests covering:
 *   HG-1: D-STACK-2 — sectionsProduced is always 4
 *   HG-2: D-STACK-2 — all 4 mandatory sections present in prompt
 *   HG-3: CF-800 — missing couplingAuditId → MISSING_COUPLING_AUDIT failure
 *   HG-4: CF-800 — empty couplingClassifications → MISSING_COUPLING_AUDIT failure
 *   HG-5: INCOMPATIBLE stacks excluded from STACK_IMPLEMENTATIONS section
 *   HG-6: incompatibleStacksExcluded count matches INCOMPATIBLE stacks
 *
 *   MT-1: missing taskTypeId → MISSING_TASK_TYPE_ID failure
 *   MT-2: DNA-8 — storeDocument before enqueue(HybridPromptReady)
 *   MT-3: DNA-3 — throws internally → DataProcessResult.failure
 *   MT-4: stacksAddressed matches compatible stacks count
 */

import 'reflect-metadata';
import {
  HybridGenesisPromptBuilder,
  MANDATORY_SECTIONS_4,
} from '../../src/engine/flows/engine-self-awareness/hybrid-genesis-prompt-builder.service';
import type { CouplingClassification } from '../../src/engine/flows/engine-self-awareness/stack-coupling-auditor.service';
import { DataProcessResult } from '../../src/kernel/data-process-result';

function makeMockDb() {
  return {
    storeDocument: jest.fn().mockResolvedValue(DataProcessResult.success({})),
    searchDocuments: jest.fn().mockResolvedValue(DataProcessResult.success([])),
    getDocument: jest.fn().mockResolvedValue(DataProcessResult.failure('NOT_FOUND', '')),
    deleteDocument: jest.fn().mockResolvedValue(DataProcessResult.success(true)),
    bulkStore: jest.fn().mockResolvedValue(DataProcessResult.success({})),
    countDocuments: jest.fn().mockResolvedValue(DataProcessResult.success(0)),
    createIndex: jest.fn().mockResolvedValue(DataProcessResult.success({})),
  } as any;
}

function makeMockQueue() {
  return {
    enqueue: jest.fn().mockResolvedValue(DataProcessResult.success('msg-1')),
    dequeue: jest.fn().mockResolvedValue(DataProcessResult.success([])),
    acknowledge: jest.fn().mockResolvedValue(DataProcessResult.success(true)),
    sendToDlq: jest.fn().mockResolvedValue(DataProcessResult.success('dlq-1')),
    waitFor: jest.fn().mockResolvedValue(DataProcessResult.failure('TIMEOUT', '')),
  } as any;
}

function makeClassification(
  stackId: string,
  category: CouplingClassification['category'],
): CouplingClassification {
  const dims: Record<string, string> = {};
  for (const d of [
    'data_model',
    'event_schema',
    'api_surface',
    'state_management',
    'error_handling',
    'authentication',
    'tenant_isolation',
    'observability',
    'deployment_target',
    'runtime_model',
  ]) {
    dims[d] = category === 'INCOMPATIBLE' ? 'INCOMPATIBLE' : 'CONCEPT_NEUTRAL';
  }
  return { stackId, category, dimensions: dims as any };
}

beforeEach(() => jest.clearAllMocks());

describe('FLOW-37 Phase C — HybridGenesisPromptBuilder', () => {
  it('HG-1: D-STACK-2 — sectionsProduced is always 4', async () => {
    const svc = new HybridGenesisPromptBuilder(makeMockDb(), makeMockQueue());

    const result = await svc.build({
      taskTypeId: 'T-010',
      couplingAuditId: 'AUDIT-001',
      couplingClassifications: [makeClassification('stack-react', 'CONCEPT_NEUTRAL')],
    });

    expect(result.isSuccess).toBe(true);
    expect(result.data!.sectionsProduced).toBe(4);
    expect(result.data!.hybridGenesisPrompt.sectionsProduced).toBe(4);
  });

  it('HG-2: D-STACK-2 — all 4 mandatory sections present in prompt', async () => {
    const svc = new HybridGenesisPromptBuilder(makeMockDb(), makeMockQueue());

    const result = await svc.build({
      taskTypeId: 'T-011',
      couplingAuditId: 'AUDIT-002',
      couplingClassifications: [makeClassification('stack-vue', 'IMPL_VARIES')],
    });

    expect(result.isSuccess).toBe(true);
    const sections = result.data!.hybridGenesisPrompt.sections;
    for (const section of MANDATORY_SECTIONS_4) {
      expect(sections).toHaveProperty(section);
    }
  });

  it('HG-3: CF-800 — missing couplingAuditId → MISSING_COUPLING_AUDIT failure', async () => {
    const svc = new HybridGenesisPromptBuilder(makeMockDb(), makeMockQueue());

    const result = await svc.build({
      taskTypeId: 'T-012',
      couplingAuditId: '',
      couplingClassifications: [makeClassification('stack-react', 'CONCEPT_NEUTRAL')],
    });

    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('MISSING_COUPLING_AUDIT');
  });

  it('HG-4: CF-800 — empty couplingClassifications → MISSING_COUPLING_AUDIT failure', async () => {
    const svc = new HybridGenesisPromptBuilder(makeMockDb(), makeMockQueue());

    const result = await svc.build({
      taskTypeId: 'T-013',
      couplingAuditId: 'AUDIT-003',
      couplingClassifications: [],
    });

    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('MISSING_COUPLING_AUDIT');
  });

  it('HG-5: INCOMPATIBLE stacks excluded from STACK_IMPLEMENTATIONS section', async () => {
    const svc = new HybridGenesisPromptBuilder(makeMockDb(), makeMockQueue());

    const result = await svc.build({
      taskTypeId: 'T-014',
      couplingAuditId: 'AUDIT-004',
      couplingClassifications: [
        makeClassification('stack-react', 'CONCEPT_NEUTRAL'),
        makeClassification('stack-legacy', 'INCOMPATIBLE'),
      ],
    });

    expect(result.isSuccess).toBe(true);
    const stackImpls = result.data!.hybridGenesisPrompt.sections['STACK_IMPLEMENTATIONS']!;
    const stacks = stackImpls['stacks'] as Array<{ stackId: string }>;
    const stackIds = stacks.map((s) => s.stackId);
    expect(stackIds).toContain('stack-react');
    expect(stackIds).not.toContain('stack-legacy');
  });

  it('HG-6: incompatibleStacksExcluded count matches INCOMPATIBLE stacks', async () => {
    const svc = new HybridGenesisPromptBuilder(makeMockDb(), makeMockQueue());

    const result = await svc.build({
      taskTypeId: 'T-015',
      couplingAuditId: 'AUDIT-005',
      couplingClassifications: [
        makeClassification('stack-a', 'CONCEPT_NEUTRAL'),
        makeClassification('stack-b', 'INCOMPATIBLE'),
        makeClassification('stack-c', 'INCOMPATIBLE'),
      ],
    });

    expect(result.isSuccess).toBe(true);
    expect(result.data!.incompatibleStacksExcluded).toBe(2);
    expect(result.data!.stacksAddressed).toBe(1);
  });

  it('MT-1: missing taskTypeId → MISSING_TASK_TYPE_ID failure', async () => {
    const svc = new HybridGenesisPromptBuilder(makeMockDb(), makeMockQueue());
    const result = await svc.build({
      taskTypeId: '',
      couplingAuditId: 'AUDIT-006',
      couplingClassifications: [makeClassification('stack-react', 'CONCEPT_NEUTRAL')],
    });
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('MISSING_TASK_TYPE_ID');
  });

  it('MT-2: DNA-8 — storeDocument before enqueue(HybridPromptReady)', async () => {
    const db = makeMockDb();
    const queue = makeMockQueue();
    const svc = new HybridGenesisPromptBuilder(db, queue);

    const callOrder: string[] = [];
    (db.storeDocument as jest.Mock).mockImplementation(async () => {
      callOrder.push('store');
      return DataProcessResult.success({});
    });
    (queue.enqueue as jest.Mock).mockImplementation(async () => {
      callOrder.push('enqueue');
      return DataProcessResult.success('msg-1');
    });

    await svc.build({
      taskTypeId: 'T-016',
      couplingAuditId: 'AUDIT-007',
      couplingClassifications: [makeClassification('stack-vue', 'CONCEPT_NEUTRAL')],
    });

    expect(callOrder.indexOf('store')).toBeLessThan(callOrder.indexOf('enqueue'));
  });

  it('MT-3: DNA-3 — throws internally → DataProcessResult.failure', async () => {
    const db = makeMockDb();
    const queue = makeMockQueue();
    (db.storeDocument as jest.Mock).mockRejectedValue(new Error('crash'));
    const svc = new HybridGenesisPromptBuilder(db, queue);

    const result = await svc.build({
      taskTypeId: 'T-017',
      couplingAuditId: 'AUDIT-008',
      couplingClassifications: [makeClassification('stack-react', 'CONCEPT_NEUTRAL')],
    });

    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('PROMPT_BUILDER_ERROR');
  });

  it('MT-4: stacksAddressed matches compatible stacks count', async () => {
    const svc = new HybridGenesisPromptBuilder(makeMockDb(), makeMockQueue());

    const result = await svc.build({
      taskTypeId: 'T-018',
      couplingAuditId: 'AUDIT-009',
      couplingClassifications: [
        makeClassification('s1', 'CONCEPT_NEUTRAL'),
        makeClassification('s2', 'IMPL_VARIES'),
        makeClassification('s3', 'STACK_COUPLED'),
        makeClassification('s4', 'INCOMPATIBLE'),
      ],
    });

    expect(result.isSuccess).toBe(true);
    expect(result.data!.stacksAddressed).toBe(3); // s1 + s2 + s3 (not s4)
  });
});
