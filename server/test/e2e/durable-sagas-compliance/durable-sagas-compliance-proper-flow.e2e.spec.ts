/**
 * FLOW-19 Proper Flow — Design Contract Tests (DC-01..DC-10)
 *
 * These tests verify that FLOW-19 T621-T624 services satisfy the
 * FLOW-19 design simulation's iron rules.
 *
 * DC-01: T621 SagaOrchestrator archetype is 'orchestration'
 * DC-02: CF-19-1 — T621 uses storeDocumentWithOCC with versionPin:-1 for saga init
 * DC-03: CF-19-1 — T621 SETNX step-lock acquired before step body (source contains acquireStepLock)
 * DC-04: CF-19-2 — T622 CompensationEngine executes in LIFO reverse order (source contains .reverse())
 * DC-05: CF-19-2 — T622 stop-on-first-failure (source contains CompensationFailed halt)
 * DC-06: CF-19-3 — T623 ComplianceAuditWriter uses append-only store (source contains no updateDocument)
 * DC-07: CF-19-3 — T623 retentionExpiresAt computed at write time from FREEDOM config
 * DC-08: CF-19-3 — T623 auditHash is SHA-256 (source contains createHash('sha256'))
 * DC-09: CF-19-4 — T624 dual-gate check (source contains legalHoldActive)
 * DC-10: CF-19-4 — T624 archive-before-delete order (archiveRecord before deleteDocument/tombstone)
 *
 * Design refs: CF-19-1, CF-19-2, CF-19-3, CF-19-4, DNA-8
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

function makeDb(overrides: Partial<{ storeDocument: jest.Mock }> = {}) {
  const callOrder: string[] = [];
  return {
    callOrder,
    storeDocument: jest.fn().mockImplementation(async (index: string) => {
      callOrder.push(`store:${index}`);
      return DataProcessResult.success({});
    }),
    searchDocuments: jest.fn().mockResolvedValue(DataProcessResult.success([])),
    ...overrides,
  };
}

function makeQueue(callOrder?: string[]) {
  const order = callOrder ?? [];
  return {
    enqueue: jest.fn().mockImplementation(async (evt: string) => {
      order.push(`enqueue:${evt}`);
      return DataProcessResult.success({});
    }),
  };
}

function makeCls(tenantId = 'dc-tenant-t19') {
  return { get: jest.fn().mockReturnValue({ tenantId }) };
}

describe('FLOW-19 Design Contracts (DC-01..DC-10)', () => {
  test('DC-01: T621 SagaOrchestrator archetype is orchestration', () => {
    const t621 = loadContract('t621.contract.json');
    expect(t621['archetype']).toBe('orchestration');
    expect(t621['taskTypeId']).toBe('T621');
    expect(t621['flowId']).toBe('FLOW-19');
  });

  test('DC-02: CF-19-1 — T621 source uses storeDocumentWithOCC with versionPin', () => {
    const source = fs.readFileSync(
      path.join(
        __dirname,
        '../../../src/engine/flows/durable-sagas-compliance/saga-orchestrator.service.ts',
      ),
      'utf-8',
    );
    expect(source).toContain('storeDocumentWithOCC');
    expect(source).toContain('versionPin: -1');

    const t621 = loadContract('t621.contract.json');
    const mc = (t621['machineComponents'] as string[]).join(' ');
    expect(mc).toMatch(/OCC|versionPin/i);
  });

  test('DC-03: CF-19-1 — T621 source acquires SETNX step-lock before step body', () => {
    const source = fs.readFileSync(
      path.join(
        __dirname,
        '../../../src/engine/flows/durable-sagas-compliance/saga-orchestrator.service.ts',
      ),
      'utf-8',
    );
    expect(source).toContain('acquireStepLock');
    expect(source).toContain('SETNX step-lock');

    const t621 = loadContract('t621.contract.json');
    const mc2 = (t621['machineComponents'] as string[]).join(' ');
    expect(mc2).toMatch(/SETNX|step.lock/i);
  });

  test('DC-04: CF-19-2 — T622 source executes compensation in LIFO order (.reverse())', () => {
    const source = fs.readFileSync(
      path.join(
        __dirname,
        '../../../src/engine/flows/durable-sagas-compliance/compensation-engine.service.ts',
      ),
      'utf-8',
    );
    expect(source).toContain('.reverse()');
    expect(source).toContain('LIFO');

    const t622 = loadContract('t622.contract.json');
    const mc3 = (t622['machineComponents'] as string[]).join(' ');
    expect(mc3).toMatch(/LIFO|reverse/i);
  });

  test('DC-05: CF-19-2 — T622 source implements stop-on-first-failure (CompensationFailed + halt)', () => {
    const source = fs.readFileSync(
      path.join(
        __dirname,
        '../../../src/engine/flows/durable-sagas-compliance/compensation-engine.service.ts',
      ),
      'utf-8',
    );
    expect(source).toContain('CompensationFailed');
    // Must halt after first failure — return failure (not continue loop)
    expect(source).toContain('stop-on-first-failure');

    const t622 = loadContract('t622.contract.json');
    const mc4 = (t622['machineComponents'] as string[]).join(' ');
    expect(mc4).toMatch(/stop.on.first|halt/i);
  });

  test('DC-06: CF-19-3 — T623 source uses only storeDocument (no updateDocument in executable code)', () => {
    const source = fs.readFileSync(
      path.join(
        __dirname,
        '../../../src/engine/flows/durable-sagas-compliance/compliance-audit-writer.service.ts',
      ),
      'utf-8',
    );
    // Strip comments — comments document the prohibition, not invoke it
    const executableLines = source
      .split('\n')
      .filter((l: string) => !l.trim().startsWith('*') && !l.trim().startsWith('//'));
    const execCode = executableLines.join('\n');
    // Append-only: no updateDocument in executable code
    expect(execCode).not.toMatch(/\.updateDocument\s*\(/);
    // Contract machineComponents should reference append-only
    const t623 = loadContract('t623.contract.json');
    const mc = (t623['machineComponents'] as string[]).join(' ');
    expect(mc).toMatch(/append.only|Append/i);
  });

  test('DC-07: CF-19-3 — T623 retentionExpiresAt computed at write time from FREEDOM config', async () => {
    const { ComplianceAuditWriterService } =
      await import('../../../src/engine/flows/durable-sagas-compliance/compliance-audit-writer.service');

    const db = makeDb();
    const queue = makeQueue(db.callOrder);
    const cls = makeCls();
    const retentionConfig = { getRetentionDays: jest.fn().mockResolvedValue(180) };

    const service = new ComplianceAuditWriterService(
      db as any,
      queue as any,
      cls as any,
      retentionConfig as any,
    );

    const result = await service.writeAuditRecord({
      sagaId: 'dc-saga-07',
      sagaType: 'TEST',
      eventType: 'DC_TEST',
      stepIndex: 0,
      contextData: {},
    });

    expect(result.isSuccess).toBe(true);
    expect(retentionConfig.getRetentionDays).toHaveBeenCalledWith(
      'flow19_compliance_retention_days',
    );
    const storeCall = db.storeDocument.mock.calls.find((c) => c[0] === 'xiigen-compliance-records');
    expect(storeCall![1]).toHaveProperty('retentionDays', 180);
    expect(storeCall![1]).toHaveProperty('retentionExpiresAt');

    const t623 = loadContract('t623.contract.json');
    const mc5 = (t623['machineComponents'] as string[]).join(' ');
    expect(mc5).toMatch(/retention|write time/i);
  });

  test('DC-08: CF-19-3 — T623 source uses SHA-256 for auditHash (createHash sha256)', () => {
    const source = fs.readFileSync(
      path.join(
        __dirname,
        '../../../src/engine/flows/durable-sagas-compliance/compliance-audit-writer.service.ts',
      ),
      'utf-8',
    );
    expect(source).toContain("createHash('sha256')");
    expect(source).toContain('auditHash');

    const t623 = loadContract('t623.contract.json');
    const mc6 = (t623['machineComponents'] as string[]).join(' ');
    expect(mc6).toMatch(/SHA.256|audit.*hash/i);
  });

  test('DC-09: CF-19-4 — T624 source checks legalHoldActive (dual gate)', async () => {
    const source = fs.readFileSync(
      path.join(
        __dirname,
        '../../../src/engine/flows/durable-sagas-compliance/data-retention-enforcer.service.ts',
      ),
      'utf-8',
    );
    expect(source).toContain('legalHoldActive');
    expect(source).toContain('RetentionHoldActive');
    expect(source).toContain('dual gate');

    const t624 = loadContract('t624.contract.json');
    const mc7 = (t624['machineComponents'] as string[]).join(' ');
    expect(mc7).toMatch(/dual.gate|legal.hold/i);
  });

  test('DC-10: CF-19-4 — T624 archive-before-delete: archiveRecord before tombstone storeDocument', async () => {
    const { DataRetentionEnforcerService } =
      await import('../../../src/engine/flows/durable-sagas-compliance/data-retention-enforcer.service');

    const callOrder: string[] = [];
    const db = makeDb({
      storeDocument: jest.fn().mockImplementation(async (index: string) => {
        callOrder.push(`store:${index}`);
        return DataProcessResult.success({});
      }),
    });
    const queue = makeQueue(callOrder);
    const cls = makeCls();
    const archiveService = {
      archiveRecord: jest.fn().mockImplementation(async (index: string) => {
        callOrder.push(`archive:${index}`);
        return DataProcessResult.success({});
      }),
    };
    const legalHold = { isLegalHoldActive: jest.fn().mockResolvedValue(false) };
    const cronConfig = {
      getCronSchedule: jest.fn().mockResolvedValue('0 2 * * *'),
      getBatchSize: jest.fn().mockResolvedValue(100),
    };

    const service = new DataRetentionEnforcerService(
      db as any,
      queue as any,
      cls as any,
      archiveService as any,
      legalHold as any,
      cronConfig as any,
    );

    const pastDate = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
    await service.enforceRetention({
      sourceIndex: 'xiigen-compliance-records',
      candidateRecords: [
        {
          id: 'dc-rec-010',
          retentionExpiresAt: pastDate,
          data: { tenantId: 'dc-tenant' },
        },
      ],
    });

    const archiveIdx = callOrder.findIndex((e) => e.startsWith('archive:'));
    const tombstoneIdx = callOrder.findIndex((e) => e.includes('tombstone'));
    expect(archiveIdx).toBeGreaterThanOrEqual(0);
    expect(tombstoneIdx).toBeGreaterThan(archiveIdx);

    // Source confirms archive-before-delete pattern
    const source = fs.readFileSync(
      path.join(
        __dirname,
        '../../../src/engine/flows/durable-sagas-compliance/data-retention-enforcer.service.ts',
      ),
      'utf-8',
    );
    expect(source).toContain('archive-before-delete');
    // Strip comments — deleteDocument may appear in JSDoc prohibitions
    const execLines = source
      .split('\n')
      .filter((l: string) => !l.trim().startsWith('*') && !l.trim().startsWith('//'));
    const execSrc = execLines.join('\n');
    // Uses tombstone/archive pattern — no direct deleteDocument in executable code
    expect(execSrc).not.toMatch(/\.deleteDocument\s*\(/);

    const t624 = loadContract('t624.contract.json');
    const mc8 = (t624['machineComponents'] as string[]).join(' ');
    expect(mc8).toMatch(/archive.before.delete|Archive/i);
  });
});
