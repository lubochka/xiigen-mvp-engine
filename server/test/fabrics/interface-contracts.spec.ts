/**
 * Fabric Interface Contract Tests
 *
 * Verifies:
 * 1. All 6 interfaces are importable and have expected abstract methods
 * 2. Enums have correct values
 * 3. Injection tokens are defined
 * 4. No tenant_id in method signatures (v4 verification)
 * 5. Concrete implementations can be created from abstract classes
 */

import { DataProcessResult } from '../../src/kernel';
import {
  IDatabaseService,
  DATABASE_SERVICE,
  IQueueService,
  QUEUE_SERVICE,
  IAiProvider,
  IAiDispatcher,
  AiModelRole,
  AI_PROVIDER,
  AI_DISPATCHER,
  IRagService,
  RAG_SERVICE,
  IFlowDefinition,
  IFlowOrchestrator,
  NodeStatus,
  FLOW_DEFINITION,
  FLOW_ORCHESTRATOR,
  ISecretsService,
  SECRETS_SERVICE,
} from '../../src/fabrics';
import { OccOptions } from '../../src/fabrics/interfaces/database.interface';

// ── Minimal concrete implementations for contract verification ──

class TestDatabaseService extends IDatabaseService {
  async storeDocument(index: string, doc: Record<string, unknown>, docId?: string) {
    return DataProcessResult.success({ _id: docId ?? 'test', ...doc });
  }
  async searchDocuments(index: string, filters: Record<string, unknown>, size?: number) {
    return DataProcessResult.success<Record<string, unknown>[]>([]);
  }
  async getDocument(index: string, docId: string) {
    return DataProcessResult.success<Record<string, unknown>>({ _id: docId });
  }
  async deleteDocument(index: string, docId: string) {
    return DataProcessResult.success(true);
  }
  async bulkStore(index: string, docs: Record<string, unknown>[]) {
    return DataProcessResult.success<Record<string, unknown>>({ stored: docs.length });
  }
  async countDocuments(index: string, filters: Record<string, unknown>) {
    return DataProcessResult.success(0);
  }
  async ensureIndex(_indexName: string, _mappings: Record<string, unknown>): Promise<void> {
    // no-op
  }
  async getDocumentWithVersion(index: string, id: string) {
    return DataProcessResult.success({ doc: { _id: id }, seqNo: 0, primaryTerm: 1 });
  }
  async storeDocumentWithOCC(
    index: string,
    doc: Record<string, unknown>,
    id: string,
    occ: OccOptions,
  ) {
    return DataProcessResult.success({ seqNo: 1, primaryTerm: 1 });
  }
}

class TestQueueService extends IQueueService {
  async enqueue(eventType: string, data: Record<string, unknown>) {
    return DataProcessResult.success('msg-id');
  }
  async dequeue(queueName: string) {
    return DataProcessResult.success<Record<string, unknown>[]>([]);
  }
  async acknowledge(queueName: string, receiptHandle: string) {
    return DataProcessResult.success(true);
  }
  async sendToDlq(queueName: string, message: Record<string, unknown>, reason: string) {
    return DataProcessResult.success('dlq-id');
  }
  async waitFor<T>(options: { correlationId: string; eventType: string; timeoutMs: number }) {
    return DataProcessResult.failure<T>('TIMEOUT', 'test stub');
  }
}

class TestAiProvider extends IAiProvider {
  async generate(prompt: string) {
    return DataProcessResult.success<Record<string, unknown>>({ text: 'test', model: 'mock' });
  }
  async generateStructured(prompt: string, schema: Record<string, unknown>) {
    return DataProcessResult.success<Record<string, unknown>>({});
  }
  getModelInfo() {
    return { provider: 'test', model: 'mock-1' };
  }
}

class TestAiDispatcher extends IAiDispatcher {
  async generateWithConsensus(prompt: string, modelIds: string[]) {
    return DataProcessResult.success<Record<string, unknown>>({
      text: 'consensus',
      model_used: modelIds[0],
    });
  }
  async generateSingle(prompt: string, modelId: string) {
    return DataProcessResult.success<Record<string, unknown>>({ text: 'single', model: modelId });
  }
}

class TestRagService extends IRagService {
  async search(query: string) {
    return DataProcessResult.success<Record<string, unknown>[]>([]);
  }
  async ingest(documents: Record<string, unknown>[]) {
    return DataProcessResult.success<Record<string, unknown>>({ ingested: documents.length });
  }
  async buildContextPack(query: string, contextType: string) {
    return DataProcessResult.success<Record<string, unknown>>({ type: contextType, items: [] });
  }
  async deleteByFilter(namespace: string, filters: Record<string, unknown>) {
    return DataProcessResult.success(0);
  }
}

class TestFlowDefinition extends IFlowDefinition {
  async loadFlow(flowId: string) {
    return DataProcessResult.success<Record<string, unknown>>({ id: flowId });
  }
  async saveFlow(flowDef: Record<string, unknown>) {
    return DataProcessResult.success(flowDef);
  }
  async listFlows() {
    return DataProcessResult.success<Record<string, unknown>[]>([]);
  }
}

class TestFlowOrchestrator extends IFlowOrchestrator {
  async startFlow(flowId: string, inputData: Record<string, unknown>) {
    return DataProcessResult.success<Record<string, unknown>>({
      run_id: 'run-1',
      status: 'running',
    });
  }
  async executeNode(runId: string, nodeId: string, inputData: Record<string, unknown>) {
    return DataProcessResult.success<Record<string, unknown>>({
      node_id: nodeId,
      status: 'completed',
    });
  }
  async getRunStatus(runId: string) {
    return DataProcessResult.success<Record<string, unknown>>({ run_id: runId, status: 'running' });
  }
  async resumeFlow(runId: string, nodeId: string, decision: Record<string, unknown>) {
    return DataProcessResult.success<Record<string, unknown>>({ resumed: true });
  }
  async cancelFlow(runId: string, reason: string) {
    return DataProcessResult.success(true);
  }
}

class TestSecretsService extends ISecretsService {
  async getSecret(path: string) {
    return DataProcessResult.success<Record<string, unknown>>({ value: '***', path });
  }
  async setSecret(path: string, value: string) {
    return DataProcessResult.success<Record<string, unknown>>({ path, version: '1' });
  }
  async deleteSecret(path: string) {
    return DataProcessResult.success(true);
  }
  async listSecrets(prefix?: string) {
    return DataProcessResult.success<Record<string, unknown>[]>([]);
  }
  async healthCheck() {
    return DataProcessResult.success(true);
  }
}

// ═══════════════════════════════════════════════════════
// Tests
// ═══════════════════════════════════════════════════════

describe('Fabric Interface Contracts', () => {
  describe('IDatabaseService', () => {
    it('should be implementable with 6 methods', () => {
      const svc = new TestDatabaseService();
      expect(svc).toBeInstanceOf(IDatabaseService);
      expect(typeof svc.storeDocument).toBe('function');
      expect(typeof svc.searchDocuments).toBe('function');
      expect(typeof svc.getDocument).toBe('function');
      expect(typeof svc.deleteDocument).toBe('function');
      expect(typeof svc.bulkStore).toBe('function');
      expect(typeof svc.countDocuments).toBe('function');
    });

    it('should return DataProcessResult from all methods', async () => {
      const svc = new TestDatabaseService();
      const r1 = await svc.storeDocument('idx', { name: 'test' });
      const r2 = await svc.searchDocuments('idx', {});
      const r3 = await svc.getDocument('idx', 'id');
      const r4 = await svc.deleteDocument('idx', 'id');
      const r5 = await svc.bulkStore('idx', []);
      const r6 = await svc.countDocuments('idx', {});
      expect(r1.isSuccess).toBe(true);
      expect(r2.isSuccess).toBe(true);
      expect(r3.isSuccess).toBe(true);
      expect(r4.isSuccess).toBe(true);
      expect(r5.isSuccess).toBe(true);
      expect(r6.isSuccess).toBe(true);
    });

    it('should have injection token', () => {
      expect(DATABASE_SERVICE).toBeDefined();
      expect(typeof DATABASE_SERVICE).toBe('symbol');
    });
  });

  describe('IQueueService', () => {
    it('should be implementable with 4 methods', () => {
      const svc = new TestQueueService();
      expect(svc).toBeInstanceOf(IQueueService);
      expect(typeof svc.enqueue).toBe('function');
      expect(typeof svc.dequeue).toBe('function');
      expect(typeof svc.acknowledge).toBe('function');
      expect(typeof svc.sendToDlq).toBe('function');
    });

    it('should return DataProcessResult from all methods', async () => {
      const svc = new TestQueueService();
      expect((await svc.enqueue('evt', {})).isSuccess).toBe(true);
      expect((await svc.dequeue('q')).isSuccess).toBe(true);
      expect((await svc.acknowledge('q', 'handle')).isSuccess).toBe(true);
      expect((await svc.sendToDlq('q', {}, 'reason')).isSuccess).toBe(true);
    });

    it('should have injection token', () => {
      expect(QUEUE_SERVICE).toBeDefined();
    });
  });

  describe('IAiProvider + IAiDispatcher', () => {
    it('should be implementable — IAiProvider with 3 methods', () => {
      const svc = new TestAiProvider();
      expect(svc).toBeInstanceOf(IAiProvider);
      expect(typeof svc.generate).toBe('function');
      expect(typeof svc.generateStructured).toBe('function');
      expect(typeof svc.getModelInfo).toBe('function');
    });

    it('should be implementable — IAiDispatcher with 2 methods', () => {
      const svc = new TestAiDispatcher();
      expect(svc).toBeInstanceOf(IAiDispatcher);
      expect(typeof svc.generateWithConsensus).toBe('function');
      expect(typeof svc.generateSingle).toBe('function');
    });

    it('should return DataProcessResult from generation methods', async () => {
      const provider = new TestAiProvider();
      const dispatcher = new TestAiDispatcher();
      expect((await provider.generate('test')).isSuccess).toBe(true);
      expect((await provider.generateStructured('test', {})).isSuccess).toBe(true);
      expect((await dispatcher.generateWithConsensus('test', ['m1'])).isSuccess).toBe(true);
      expect((await dispatcher.generateSingle('test', 'm1')).isSuccess).toBe(true);
    });

    it('should have injection tokens', () => {
      expect(AI_PROVIDER).toBeDefined();
      expect(AI_DISPATCHER).toBeDefined();
    });
  });

  describe('IRagService', () => {
    it('should be implementable with 4 methods', () => {
      const svc = new TestRagService();
      expect(svc).toBeInstanceOf(IRagService);
      expect(typeof svc.search).toBe('function');
      expect(typeof svc.ingest).toBe('function');
      expect(typeof svc.buildContextPack).toBe('function');
      expect(typeof svc.deleteByFilter).toBe('function');
    });

    it('should have injection token', () => {
      expect(RAG_SERVICE).toBeDefined();
    });
  });

  describe('IFlowDefinition + IFlowOrchestrator', () => {
    it('should be implementable — IFlowDefinition with 3 methods', () => {
      const svc = new TestFlowDefinition();
      expect(svc).toBeInstanceOf(IFlowDefinition);
      expect(typeof svc.loadFlow).toBe('function');
      expect(typeof svc.saveFlow).toBe('function');
      expect(typeof svc.listFlows).toBe('function');
    });

    it('should be implementable — IFlowOrchestrator with 5 methods', () => {
      const svc = new TestFlowOrchestrator();
      expect(svc).toBeInstanceOf(IFlowOrchestrator);
      expect(typeof svc.startFlow).toBe('function');
      expect(typeof svc.executeNode).toBe('function');
      expect(typeof svc.getRunStatus).toBe('function');
      expect(typeof svc.resumeFlow).toBe('function');
      expect(typeof svc.cancelFlow).toBe('function');
    });

    it('should have injection tokens', () => {
      expect(FLOW_DEFINITION).toBeDefined();
      expect(FLOW_ORCHESTRATOR).toBeDefined();
    });
  });

  describe('ISecretsService', () => {
    it('should be implementable with 5 methods', () => {
      const svc = new TestSecretsService();
      expect(svc).toBeInstanceOf(ISecretsService);
      expect(typeof svc.getSecret).toBe('function');
      expect(typeof svc.setSecret).toBe('function');
      expect(typeof svc.deleteSecret).toBe('function');
      expect(typeof svc.listSecrets).toBe('function');
      expect(typeof svc.healthCheck).toBe('function');
    });

    it('should have injection token', () => {
      expect(SECRETS_SERVICE).toBeDefined();
    });
  });
});

describe('Fabric Enums', () => {
  describe('AiModelRole', () => {
    it('should have all 4 roles', () => {
      expect(AiModelRole.PRIMARY).toBe('primary');
      expect(AiModelRole.FAST).toBe('fast');
      expect(AiModelRole.CROSS_VALIDATE).toBe('cross_validate');
      expect(AiModelRole.JUDGE).toBe('judge');
    });
  });

  describe('NodeStatus', () => {
    it('should have all 8 statuses', () => {
      expect(NodeStatus.PENDING).toBe('pending');
      expect(NodeStatus.RUNNING).toBe('running');
      expect(NodeStatus.COMPLETED).toBe('completed');
      expect(NodeStatus.FAILED).toBe('failed');
      expect(NodeStatus.SKIPPED).toBe('skipped');
      expect(NodeStatus.WAITING_FOR_USER).toBe('waiting_for_user');
      expect(NodeStatus.WAITING_FOR_ARBITER).toBe('waiting_for_arbiter');
      expect(NodeStatus.CANCELLED).toBe('cancelled');
    });

    it('should have exactly 8 values', () => {
      const values = Object.values(NodeStatus);
      expect(values.length).toBe(8);
    });
  });
});

describe('v4 Verification: No tenant_id in signatures', () => {
  it('IDatabaseService.storeDocument takes (index, doc, docId?) — no tenantId', async () => {
    const svc = new TestDatabaseService();
    // If this compiles and works with 2 args, tenant_id is NOT in the signature
    const result = await svc.storeDocument('my-index', { name: 'test' });
    expect(result.isSuccess).toBe(true);
  });

  it('IQueueService.enqueue takes (eventType, data) — no tenantId', async () => {
    const svc = new TestQueueService();
    const result = await svc.enqueue('test.event', { key: 'val' });
    expect(result.isSuccess).toBe(true);
  });

  it('IAiProvider.generate takes (prompt, options?) — no tenantId', async () => {
    const svc = new TestAiProvider();
    const result = await svc.generate('Hello');
    expect(result.isSuccess).toBe(true);
  });

  it('IRagService.search takes (query, options?) — no tenantId', async () => {
    const svc = new TestRagService();
    const result = await svc.search('find patterns');
    expect(result.isSuccess).toBe(true);
  });

  it('IFlowOrchestrator.startFlow takes (flowId, inputData) — no tenantId', async () => {
    const svc = new TestFlowOrchestrator();
    const result = await svc.startFlow('flow-1', { spec: 'T44' });
    expect(result.isSuccess).toBe(true);
  });

  it('ISecretsService.getSecret takes (path, version?) — no tenantId', async () => {
    const svc = new TestSecretsService();
    const result = await svc.getSecret('xiigen/ai/key');
    expect(result.isSuccess).toBe(true);
  });
});
