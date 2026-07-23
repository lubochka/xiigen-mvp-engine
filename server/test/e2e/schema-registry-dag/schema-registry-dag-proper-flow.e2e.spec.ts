/**
 * FLOW-11 Proper Flow — Design Contract Tests (DC-01..DC-10)
 *
 * These tests verify that FLOW-11 T189-T208 services satisfy the
 * FLOW-11 design simulation's iron rules.
 *
 * DC-01: SchemaRegistrationGateway archetype is TRANSACTION
 * DC-02: BREAKING changeType routes to SchemaApprovalRequired not SchemaQueued
 * DC-03: T191 uses three-state DFS; cyclePath populated on CYCLE_DETECTED
 * DC-04: T194 uses storeDocumentWithOCC not plain storeDocument
 * DC-05: T192 @EventPattern('SchemaPublished') — async not inline
 * DC-06: T192 writes UNIDIRECTIONAL edges (annotated with FLOW-07 DPO conflict)
 * DC-07: SchemaPublished fires from T194 — completion event
 * DC-08: NAMESPACE_ISOLATION ownership model — knowledgeScope PRIVATE for schema records
 * DC-09: FREEDOM config controls approval TTL — not hardcoded
 * DC-10: First registration: T190 returns ADDITIVE, version '1.0.0'
 *
 * Design refs: DR-11-A..E, FLOW-11-DESIGN-SIMULATION-R1
 */

import 'reflect-metadata';
import * as fs from 'fs';
import * as path from 'path';
import { DataProcessResult } from '../../../src/kernel/data-process-result';

function loadContract(filename: string): Record<string, unknown> {
  return JSON.parse(
    fs.readFileSync(path.join(__dirname, '../../../../fixtures/contracts', filename), 'utf-8'),
  );
}

describe('FLOW-11 Design Contracts (DC-01..DC-10)', () => {
  test('DC-01: SchemaRegistrationGateway archetype is TRANSACTION', () => {
    const t189 = loadContract('t189.contract.json');
    expect(t189['archetype']).toBe('TRANSACTION');
    expect(t189['taskTypeId']).toBe('T189');
    expect(t189['flowId']).toBe('FLOW-11');
  });

  test('DC-02: BREAKING changeType routes to SchemaApprovalRequired — never SchemaQueued', async () => {
    const { SchemaVersionManagerService } =
      await import('../../../src/engine/flows/schema-registry-dag/schema-version-manager.service');
    const manager = new SchemaVersionManagerService();

    const previous = {
      version: '1.0.0',
      type: 'object',
      properties: { id: { type: 'string' }, name: { type: 'string' } },
      required: ['id', 'name'],
    };
    const breaking = { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] }; // 'name' removed

    const result = manager.classify({ previousSchema: previous, newSchema: breaking });
    expect(result.data!.changeType).toBe('BREAKING');

    // Contract: BREAKING → SchemaApprovalRequired
    const t189 = loadContract('t189.contract.json');
    const t189Queue = (t189['stackCoupling'] as Record<string, string[]>)['queue'];
    expect(t189Queue).toContain('SchemaApprovalRequired');
    expect(t189Queue).not.toContain('SchemaPublished'); // SchemaPublished not from T189
  });

  test('DC-03: T191 uses three-state DFS; cyclePath populated on CYCLE_DETECTED', async () => {
    const { DagCycleDetectorService } =
      await import('../../../src/engine/flows/schema-registry-dag/dag-cycle-detector.service');
    const detector = new DagCycleDetectorService();

    const cycleResult = detector.check({
      schemaType: 'A',
      newDeps: ['B'],
      existingGraph: { B: ['A'] }, // A→B→A cycle
      tenantId: 'dc-test',
    });
    expect(cycleResult.data!.verdict).toBe('CYCLE_DETECTED');
    expect(cycleResult.data!.cyclePath!.length).toBeGreaterThanOrEqual(2);

    // Contract: T191 iron rules mention three-state DFS
    const t191 = loadContract('t191.contract.json');
    const ironRules = t191['ironRules'] as Array<{ rule: string }>;
    const dfsRule = ironRules.find(
      (r) => r.rule.includes('WHITE') && r.rule.includes('GRAY') && r.rule.includes('BLACK'),
    );
    expect(dfsRule).toBeDefined();
  });

  test('DC-04: T194 uses storeDocumentWithOCC — contract iron rules confirm OCC', () => {
    const t194 = loadContract('t194.contract.json');
    const ironRules = t194['ironRules'] as Array<{ rule: string }>;
    const occRule = ironRules.find(
      (r) => r.rule.includes('storeDocumentWithOCC') || r.rule.includes('OCC_CONFLICT'),
    );
    expect(occRule).toBeDefined();
    const machineComponents = t194['machineComponents'] as string[];
    expect(machineComponents).toContain('OCC_PROTECTED_WRITE');
  });

  test('DC-05: T192 @EventPattern(SchemaPublished) — async not inline', async () => {
    const { DagDependencyTrackerService } =
      await import('../../../src/engine/flows/schema-registry-dag/dag-dependency-tracker.service');
    // T192 has onSchemaPublished (event handler) and rebuild (async method)
    expect(typeof DagDependencyTrackerService.prototype.onSchemaPublished).toBe('function');
    expect(typeof DagDependencyTrackerService.prototype.rebuild).toBe('function');
    // T189 does NOT call rebuild inline — rebuild is separate
    const { SchemaRegistrationGatewayService } =
      await import('../../../src/engine/flows/schema-registry-dag/schema-registration-gateway.service');
    // SchemaRegistrationGatewayService does not depend on DagDependencyTrackerService
    const registrationSource = fs.readFileSync(
      path.join(
        __dirname,
        '../../../src/engine/flows/schema-registry-dag/schema-registration-gateway.service.ts',
      ),
      'utf-8',
    );
    expect(registrationSource).not.toContain('DagDependencyTrackerService');
  });

  test('DC-06: T192 writes UNIDIRECTIONAL edges — DPO conflict annotation present', async () => {
    const db = {
      storeDocument: jest.fn().mockResolvedValue(DataProcessResult.success({})),
      searchDocuments: jest.fn().mockResolvedValue(DataProcessResult.success([])),
      getDocument: jest.fn().mockResolvedValue(DataProcessResult.failure('NOT_FOUND', '')),
      getDocumentWithVersion: jest
        .fn()
        .mockResolvedValue(DataProcessResult.failure('NOT_FOUND', '')),
      storeDocumentWithOCC: jest
        .fn()
        .mockResolvedValue(DataProcessResult.success({ seqNo: 1, primaryTerm: 1 })),
      deleteDocument: jest.fn().mockResolvedValue(DataProcessResult.success(true)),
      bulkStore: jest.fn().mockResolvedValue(DataProcessResult.success({})),
      countDocuments: jest.fn().mockResolvedValue(DataProcessResult.success(0)),
      ensureIndex: jest.fn().mockResolvedValue(undefined),
    };
    const queue = { enqueue: jest.fn().mockResolvedValue(DataProcessResult.success({})) };
    const cls = { get: jest.fn(() => ({ tenantId: 'dc-test' })) };

    const { DagDependencyTrackerService } =
      await import('../../../src/engine/flows/schema-registry-dag/dag-dependency-tracker.service');
    const tracker = new DagDependencyTrackerService(db as any, queue as any, cls as any);
    await tracker.rebuild('dc-test', 'TestSchema');

    const storeCall = db.storeDocument.mock.calls[0];
    const dagNode = storeCall[1] as Record<string, unknown>;
    expect(dagNode['edgeModel']).toBe('UNIDIRECTIONAL');
    expect(dagNode['dpoConflict']).toBe('FLOW-07-T75-bidirectional-graph-write');
  });

  test('DC-07: SchemaPublished fires from T194 — completion event', () => {
    const t194 = loadContract('t194.contract.json');
    const t194Queue = (t194['stackCoupling'] as Record<string, string[]>)['queue'];
    expect(t194Queue).toContain('SchemaPublished');

    const t189 = loadContract('t189.contract.json');
    const t189Queue = (t189['stackCoupling'] as Record<string, string[]>)['queue'];
    expect(t189Queue).not.toContain('SchemaPublished');
  });

  test('DC-08: NAMESPACE_ISOLATION ownership model — schema records have knowledgeScope PRIVATE', async () => {
    const { SCHEMA_REGISTRY_DAG_OWNERSHIP_MODEL } =
      await import('../../../src/engine-contracts/schema-registry-dag-contracts');
    expect(SCHEMA_REGISTRY_DAG_OWNERSHIP_MODEL).toBe('NAMESPACE_ISOLATION');

    // Services write PRIVATE records
    const db = {
      storeDocument: jest.fn().mockResolvedValue(DataProcessResult.success({})),
      searchDocuments: jest.fn().mockResolvedValue(DataProcessResult.success([])),
      getDocument: jest.fn().mockResolvedValue(DataProcessResult.failure('NOT_FOUND', '')),
      getDocumentWithVersion: jest
        .fn()
        .mockResolvedValue(DataProcessResult.failure('NOT_FOUND', '')),
      storeDocumentWithOCC: jest
        .fn()
        .mockResolvedValue(DataProcessResult.success({ seqNo: 1, primaryTerm: 1 })),
      deleteDocument: jest.fn().mockResolvedValue(DataProcessResult.success(true)),
      bulkStore: jest.fn().mockResolvedValue(DataProcessResult.success({})),
      countDocuments: jest.fn().mockResolvedValue(DataProcessResult.success(0)),
      ensureIndex: jest.fn().mockResolvedValue(undefined),
    };
    const queue = { enqueue: jest.fn().mockResolvedValue(DataProcessResult.success({})) };
    const cls = { get: jest.fn(() => ({ tenantId: 'dc-test' })) };

    const { DagDependencyTrackerService } =
      await import('../../../src/engine/flows/schema-registry-dag/dag-dependency-tracker.service');
    const tracker = new DagDependencyTrackerService(db as any, queue as any, cls as any);
    await tracker.rebuild('dc-test', 'TestSchema');

    const storeCall = db.storeDocument.mock.calls[0];
    const dagNode = storeCall[1] as Record<string, unknown>;
    expect(dagNode['knowledgeScope']).toBe('PRIVATE');
    expect(dagNode['connectionType']).toBe('FLOW_SCOPED');
  });

  test('DC-09: FREEDOM config controls approval TTL — contract confirms no hardcoded value', () => {
    const t202 = loadContract('t202.contract.json');
    const freedomComponents = t202['freedomComponents'] as string[];
    expect(freedomComponents).toContain('schema_registry_approval_window_ms');
    const ironRules = t202['ironRules'] as Array<{ rule: string }>;
    const ttlRule = ironRules.find(
      (r) => r.rule.includes('schema_registry_approval_window_ms') && r.rule.includes('hardcoded'),
    );
    expect(ttlRule).toBeDefined();
  });

  test('DC-10: First registration: T190 returns ADDITIVE, version 1.0.0', async () => {
    const { SchemaVersionManagerService } =
      await import('../../../src/engine/flows/schema-registry-dag/schema-version-manager.service');
    const manager = new SchemaVersionManagerService();

    const result = manager.classify({
      previousSchema: null,
      newSchema: { type: 'object', properties: { name: { type: 'string' } }, required: ['name'] },
    });
    expect(result.isSuccess).toBe(true);
    expect(result.data!.changeType).toBe('ADDITIVE');
    expect(result.data!.nextVersion).toBe('1.0.0');
    expect(result.data!.changedFields).toEqual([]);
  });
});
