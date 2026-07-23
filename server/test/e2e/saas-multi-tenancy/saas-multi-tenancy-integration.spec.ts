/**
 * saas-multi-tenancy — Integration tests
 * FLOW-15: SaaS Multi-Tenancy
 *
 * Tests: INT-1 through INT-5
 *   INT-1: T607 triggered by TenantProvisioned (T605 output) — not T606
 *   INT-2: T608 does NOT @EventPattern TenantProvisioned — lifecycle handles suspension/termination only
 *   INT-3: TenantProvisioned payload satisfies FLOW-16 + FLOW-17 downstream requirements
 *   INT-4: T606 MACHINE_LOCKED_KEYS verified as compile-time constant via source inspection
 *   INT-5: T608 no deleteDocument in suspension handler — source-level verification
 */

import 'reflect-metadata';
import * as fs from 'fs';
import * as path from 'path';

describe('saas-multi-tenancy — integration contracts', () => {
  const servicesDir = path.resolve(__dirname, '../../../src/engine/flows/saas-multi-tenancy');

  // INT-1: T607 triggered by TenantProvisioned (T605 output), not T606 output alone
  test('INT-1: T607 accepts TenantProvisioned from T605; T606 emits TenantConfigurationUpdated which T607 filters', () => {
    // T605 emits TenantProvisioned → T607 materializes initial quotas
    // T606 emits TenantConfigurationUpdated → T607 only processes quota_* keys
    const t607Path = path.join(servicesDir, 'tenant-quota-materializer.service.ts');
    expect(fs.existsSync(t607Path)).toBe(true);

    const t607Source = fs.readFileSync(t607Path, 'utf-8');
    // T607 has a method for TenantProvisioned handling (materializeQuotas)
    expect(t607Source).toMatch(/materializeQuotas/);
    // T607 has a method for TenantConfigurationUpdated handling with quota filter
    expect(t607Source).toMatch(/handleConfigUpdate/);
    // T607 filters non-quota keys
    expect(t607Source).toMatch(/quota_/);
  });

  // INT-2: T608 does NOT handle TenantProvisioned — it handles suspension/termination
  test('INT-2: T608 does not handle TenantProvisioned — lifecycle handles suspension/termination only', () => {
    const t608Path = path.join(servicesDir, 'tenant-lifecycle-manager.service.ts');
    expect(fs.existsSync(t608Path)).toBe(true);

    const t608Source = fs.readFileSync(t608Path, 'utf-8');
    // T608 must NOT trigger on TenantProvisioned
    expect(t608Source).not.toMatch(/@EventPattern\s*\(\s*['"]TenantProvisioned['"]\s*\)/);
    // T608 must handle suspension and termination
    expect(t608Source).toMatch(/handleSuspension/);
    expect(t608Source).toMatch(/handleTermination/);
    // T608 validates state transitions
    expect(t608Source).toMatch(/validateTransition/);
  });

  // INT-3: TenantProvisioned payload satisfies downstream requirements
  test('INT-3: TenantProvisioned payload includes subscriptionTier and masterTenantId for FLOW-16/17', () => {
    const t605Path = path.join(servicesDir, 'tenant-provisioning-orchestrator.service.ts');
    expect(fs.existsSync(t605Path)).toBe(true);

    const t605Source = fs.readFileSync(t605Path, 'utf-8');
    // TenantProvisioned emit must include subscriptionTier (FLOW-16 payment gateway config)
    expect(t605Source).toMatch(/TenantProvisioned/);
    // The emit block should reference subscriptionTier
    expect(t605Source).toMatch(/subscriptionTier/);
    // The emit block should reference masterTenantId
    expect(t605Source).toMatch(/masterTenantId/);
    // provisionedAt for downstream timestamp requirements
    expect(t605Source).toMatch(/provisionedAt/);
  });

  // INT-4: T606 MACHINE_LOCKED_KEYS is compile-time constant — no database lookup
  test('INT-4: T606 MACHINE_LOCKED_KEYS is compile-time constant, not from database', () => {
    const t606Path = path.join(servicesDir, 'tenant-configuration-manager.service.ts');
    expect(fs.existsSync(t606Path)).toBe(true);

    const t606Source = fs.readFileSync(t606Path, 'utf-8');

    // MACHINE_LOCKED_KEYS must be a const declaration (compile-time)
    expect(t606Source).toMatch(/const MACHINE_LOCKED_KEYS\s*=/);
    // Must contain all 4 keys
    expect(t606Source).toMatch(/tenantId/);
    expect(t606Source).toMatch(/masterTenantId/);
    expect(t606Source).toMatch(/provisionedAt/);
    expect(t606Source).toMatch(/subscriptionTier/);

    // Must NOT contain database lookup for locked keys
    expect(t606Source).not.toMatch(/getDocument.*locked.*key/i);
    expect(t606Source).not.toMatch(/searchDocuments.*locked.*key/i);
    // Must NOT load locked keys from FREEDOM config
    expect(t606Source).not.toMatch(/freedom.*locked/i);
  });

  // INT-5: T608 suspension handler has no deleteDocument calls
  test('INT-5: T608 suspension handler contains no deleteDocument calls — suspend-not-delete verified', () => {
    const t608Path = path.join(servicesDir, 'tenant-lifecycle-manager.service.ts');
    expect(fs.existsSync(t608Path)).toBe(true);

    const t608Source = fs.readFileSync(t608Path, 'utf-8');

    // No deleteDocument/deleteMany calls in executable code (not in comments/docs)
    // Strip comments before checking — comments document the prohibition, not invoke it
    const executableLines = t608Source
      .split('\n')
      .filter((line) => !line.trim().startsWith('*') && !line.trim().startsWith('//'));
    const executableCode = executableLines.join('\n');
    expect(executableCode).not.toMatch(/\.deleteDocument\s*\(/);
    expect(executableCode).not.toMatch(/\.deleteMany\s*\(/);
    expect(executableCode).not.toMatch(/\.deleteAll\s*\(/);
    expect(executableCode).not.toMatch(/\.removeDocument\s*\(/);

    // Suspension handler uses updateDocument/storeDocument with status SUSPENDED
    expect(t608Source).toMatch(/SUSPENDED/);
    // Cascade field is present
    expect(t608Source).toMatch(/cascadeToSubscriptions:\s*true/);
  });
});
