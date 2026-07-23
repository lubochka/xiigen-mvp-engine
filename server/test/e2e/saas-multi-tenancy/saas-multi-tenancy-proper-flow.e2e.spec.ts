/**
 * saas-multi-tenancy — Proper Flow Contract Tests (DC-01..DC-10)
 * FLOW-15: SaaS Multi-Tenancy
 *
 * Verifies all CF/DR rules from design simulation:
 *   DC-01: CF-15-1 — T605 SETNX at ORDER 1 before any storeDocument
 *   DC-02: CF-15-1 — T605 bulkSeedFreedomConfig is synchronous blocking
 *   DC-03: CF-15-1 — T605 TenantProvisioningFailed with stepFailed on failure
 *   DC-04: CF-15-2 — T606 MACHINE_LOCKED_KEYS compile-time, ORDER 1 rejection
 *   DC-05: CF-15-2 — T606 storeDocumentWithOCC, not plain storeDocument
 *   DC-06: CF-15-3 — T607 Redis MULTI/EXEC atomic block for quota counters
 *   DC-07: CF-15-3 — T608 no deleteDocument on suspension path
 *   DC-08: CF-15-3 — T608 cascadeToSubscriptions:true always
 *   DC-09: CF-15-3 — T608 TenantTerminated + DataPurgeRequested both emitted
 *   DC-10: CF-15-4 — scope isolation: tenantId from ALS/internal hash only
 */

import 'reflect-metadata';
import * as fs from 'fs';
import * as path from 'path';

const servicesDir = path.resolve(__dirname, '../../../src/engine/flows/saas-multi-tenancy');

function readService(filename: string): string {
  return fs.readFileSync(path.join(servicesDir, filename), 'utf-8');
}

describe('saas-multi-tenancy — proper flow contract tests (DC-01..DC-10)', () => {
  // DC-01: CF-15-1 — T605 SETNX at ORDER 1 before any storeDocument
  test('DC-01: CF-15-1 — T605 has SETNX check before tenant record storeDocument', () => {
    const src = readService('tenant-provisioning-orchestrator.service.ts');
    // SETNX/lock check appears in source
    expect(src).toMatch(/ORDER 1.*SETNX|SETNX.*ORDER 1|setnxKey|provision.*lock/i);
    // In the provisionTenant method, lock search (ORDER 1) occurs before tenant storeDocument (ORDER 2)
    const methodStart = src.indexOf('async provisionTenant');
    const methodSrc = src.substring(methodStart);
    const lockUseIdx = methodSrc.indexOf('searchDocuments(PROVISION_LOCK_INDEX');
    const tenantStoreIdx = methodSrc.indexOf('storeDocument(TENANTS_INDEX');
    expect(lockUseIdx).toBeGreaterThan(-1);
    expect(tenantStoreIdx).toBeGreaterThan(-1);
    // Lock check (ORDER 1) comes before tenant record creation (ORDER 2)
    expect(lockUseIdx).toBeLessThan(tenantStoreIdx);
  });

  // DC-02: CF-15-1 — T605 bulkSeedFreedomConfig is synchronous blocking
  test('DC-02: CF-15-1 — T605 bulkSeedFreedomConfig is synchronous (await, not fire-and-forget)', () => {
    const src = readService('tenant-provisioning-orchestrator.service.ts');
    // Must use await on bulkSeedFreedomConfig
    expect(src).toMatch(/await\s+this\.bulkSeedFreedomConfig/);
    // Must NOT have .catch(() => {}) pattern (fire-and-forget)
    expect(src).not.toMatch(/bulkSeedFreedomConfig.*\.catch\s*\(\s*\(\s*\)\s*=>/);
  });

  // DC-03: CF-15-1 — T605 TenantProvisioningFailed with stepFailed on failure
  test('DC-03: CF-15-1 — T605 emits TenantProvisioningFailed with stepFailed field', () => {
    const src = readService('tenant-provisioning-orchestrator.service.ts');
    expect(src).toMatch(/TenantProvisioningFailed/);
    expect(src).toMatch(/stepFailed/);
    // ATOMIC_PROVISION_SEQUENCE is a machine component
    const contractPath = path.join(__dirname, '../../../../fixtures/contracts/t605.contract.json');
    if (fs.existsSync(contractPath)) {
      const contract = JSON.parse(fs.readFileSync(contractPath, 'utf-8'));
      const mc = (contract['machineComponents'] as string[]).join(' ');
      expect(mc).toMatch(/ATOMIC_PROVISION_SEQUENCE/i);
    }
  });

  // DC-04: CF-15-2 — T606 MACHINE_LOCKED_KEYS compile-time, ORDER 1 rejection
  test('DC-04: CF-15-2 — T606 MACHINE_LOCKED_KEYS is compile-time constant at ORDER 1', () => {
    const src = readService('tenant-configuration-manager.service.ts');
    // MACHINE_LOCKED_KEYS is a const
    expect(src).toMatch(/const MACHINE_LOCKED_KEYS\s*=/);
    // Contains all 4 keys
    expect(src).toMatch(/tenantId.*masterTenantId.*provisionedAt.*subscriptionTier/s);
    // ORDER 1 check before any storage
    expect(src).toMatch(/ORDER 1/);
    // No database lookup for locked keys
    expect(src).not.toMatch(/getDocument.*MACHINE_LOCKED/i);
  });

  // DC-05: CF-15-2 — T606 uses storeDocumentWithOCC, not plain storeDocument
  test('DC-05: CF-15-2 — T606 uses storeDocumentWithOCC for config writes', () => {
    const src = readService('tenant-configuration-manager.service.ts');
    // Config writes use storeDocumentWithOCC — not plain storeDocument
    const occWriteMatch = src.match(/storeDocumentWithOCC\s*\(\s*FREEDOM_INDEX/g);
    expect(occWriteMatch).not.toBeNull();
    expect(occWriteMatch!.length).toBeGreaterThanOrEqual(1);
    // versionPin/occOptions passed to the OCC write
    expect(src).toMatch(/occOptions/);
  });

  // DC-06: CF-15-3 — T607 uses batch/MULTI mode for quota writes
  test('DC-06: CF-15-3 — T607 uses MULTI/EXEC batch mode for quota counters', () => {
    const src = readService('tenant-quota-materializer.service.ts');
    // Batch mode used
    expect(src).toMatch(/MULTI_EXEC|multiExec|batchMode/);
    // Quota commands prepared as array
    expect(src).toMatch(/commands/);
  });

  // DC-07: CF-15-3 — T608 has no deleteDocument on suspension path
  test('DC-07: CF-15-3 — T608 suspension path has NO deleteDocument calls', () => {
    const src = readService('tenant-lifecycle-manager.service.ts');
    // Filter to executable code only (strip comments)
    const execLines = src
      .split('\n')
      .filter((l) => !l.trim().startsWith('*') && !l.trim().startsWith('//'));
    const exec = execLines.join('\n');
    expect(exec).not.toMatch(/\.deleteDocument\s*\(/);
    expect(exec).not.toMatch(/\.deleteMany\s*\(/);
    expect(exec).not.toMatch(/\.deleteAll\s*\(/);
  });

  // DC-08: CF-15-3 — T608 cascadeToSubscriptions:true always
  test('DC-08: CF-15-3 — T608 TenantSuspended always has cascadeToSubscriptions:true', () => {
    const src = readService('tenant-lifecycle-manager.service.ts');
    // cascadeToSubscriptions: true must appear in TenantSuspended emit
    expect(src).toMatch(/cascadeToSubscriptions:\s*true/);
    // Must NOT be configurable
    expect(src).not.toMatch(/cascadeToSubscriptions:\s*event\[/);
    expect(src).not.toMatch(/cascadeToSubscriptions:\s*config/);
  });

  // DC-09: CF-15-3 — T608 TenantTerminated + DataPurgeRequested both emitted
  test('DC-09: CF-15-3 — T608 emits both TenantTerminated AND DataPurgeRequested', () => {
    const src = readService('tenant-lifecycle-manager.service.ts');
    expect(src).toMatch(/TenantTerminated/);
    expect(src).toMatch(/DataPurgeRequested/);
    // Both in the handleTermination method
    const terminationMethod = src.substring(src.indexOf('async handleTermination'));
    expect(terminationMethod).toMatch(/TenantTerminated/);
    expect(terminationMethod).toMatch(/DataPurgeRequested/);
    // tombstoneRef present
    expect(terminationMethod).toMatch(/tombstoneRef/);
  });

  // DC-10: CF-15-4 — tenantId from ALS or internal hash only
  test('DC-10: CF-15-4 — all services use tenantId from ALS or internal hash (never request body)', () => {
    const t605 = readService('tenant-provisioning-orchestrator.service.ts');
    const t606 = readService('tenant-configuration-manager.service.ts');
    const t607 = readService('tenant-quota-materializer.service.ts');
    const t608 = readService('tenant-lifecycle-manager.service.ts');

    // T605: tenantId computed as hash
    expect(t605).toMatch(/createHash.*tenantSlug/s);
    // T606/T607/T608: getTenantId through TenantContextResolver, not request body.
    for (const src of [t606, t607, t608]) {
      expect(src).toMatch(/TenantContextResolver/);
      expect(src).toMatch(/getTenantId\(\)/);
      expect(src).toMatch(/getCurrentTenantId\(\)/);
      expect(src).not.toMatch(/event\[['"]tenantId['"]\]/);
    }
  });
});
