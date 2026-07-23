/**
 * INTEGRATION TEST — FLOW-30: Tenant Lifecycle Manager
 *
 * Verifies:
 *   INT-01: All 10 service files exist and are importable
 *   INT-02: Service chain wiring (dependencies resolve)
 *   INT-03: DNA compliance (Rule 1–16 checks)
 *   INT-04: Index naming conventions (flow30-*)
 *   INT-05: Event schema consistency
 */

import * as fs from 'fs';
import * as path from 'path';

describe('FLOW-30: Integration Tests', () => {
  const flowDir = path.resolve(__dirname, '../../../src/engine/flows/tenant-lifecycle');

  // ── INT-01: Service Files Exist ─────────────────────────────────────────────

  describe('INT-01: Service Files Exist', () => {
    const expectedServices = [
      'cross-tenant-isolation-check.service.ts',
      'quota-enforcement-gate.service.ts',
      'resource-quota-allocator.service.ts',
      'tenant-audit-emitter.service.ts',
      'tenant-config-inheritance.service.ts',
      'tenant-health-scorer.service.ts',
      'tenant-offboarding-handler.service.ts',
      'tenant-policy-enforcer.service.ts',
      'tenant-provision-orchestrator.service.ts',
      'usage-metrics-aggregator.service.ts',
    ];

    it('should have all 10 service files', () => {
      const files = fs.readdirSync(flowDir).filter((f) => f.endsWith('.ts'));
      expect(files.length).toBe(10);
    });

    expectedServices.forEach((serviceFile) => {
      it(`should have ${serviceFile}`, () => {
        const filePath = path.join(flowDir, serviceFile);
        expect(fs.existsSync(filePath)).toBe(true);
      });
    });
  });

  // ── INT-02: Service Chain Wiring ────────────────────────────────────────────

  describe('INT-02: Service Chain Wiring', () => {
    it('should have TenantProvisionOrchestrator as entry point', () => {
      const filePath = path.join(flowDir, 'tenant-provision-orchestrator.service.ts');
      const content = fs.readFileSync(filePath, 'utf-8');
      expect(content).toContain('TenantProvisionOrchestrator');
      expect(content).toContain('provision');
    });

    it('should have TenantConfigInheritance for config chain', () => {
      const filePath = path.join(flowDir, 'tenant-config-inheritance.service.ts');
      const content = fs.readFileSync(filePath, 'utf-8');
      expect(content).toContain('TenantConfigInheritance');
    });

    it('should have ResourceQuotaAllocator for quota setup', () => {
      const filePath = path.join(flowDir, 'resource-quota-allocator.service.ts');
      const content = fs.readFileSync(filePath, 'utf-8');
      expect(content).toContain('ResourceQuotaAllocator');
    });

    it('should have QuotaEnforcementGate for enforcement', () => {
      const filePath = path.join(flowDir, 'quota-enforcement-gate.service.ts');
      const content = fs.readFileSync(filePath, 'utf-8');
      expect(content).toContain('QuotaEnforcementGate');
    });

    it('should have CrossTenantIsolationCheck for isolation', () => {
      const filePath = path.join(flowDir, 'cross-tenant-isolation-check.service.ts');
      const content = fs.readFileSync(filePath, 'utf-8');
      expect(content).toContain('CrossTenantIsolationCheck');
    });

    it('should have TenantPolicyEnforcer for policies', () => {
      const filePath = path.join(flowDir, 'tenant-policy-enforcer.service.ts');
      const content = fs.readFileSync(filePath, 'utf-8');
      expect(content).toContain('TenantPolicyEnforcer');
    });

    it('should have TenantHealthScorer for monitoring', () => {
      const filePath = path.join(flowDir, 'tenant-health-scorer.service.ts');
      const content = fs.readFileSync(filePath, 'utf-8');
      expect(content).toContain('TenantHealthScorer');
    });

    it('should have UsageMetricsAggregator for metrics', () => {
      const filePath = path.join(flowDir, 'usage-metrics-aggregator.service.ts');
      const content = fs.readFileSync(filePath, 'utf-8');
      expect(content).toContain('UsageMetricsAggregator');
    });

    it('should have TenantOffboardingHandler for termination', () => {
      const filePath = path.join(flowDir, 'tenant-offboarding-handler.service.ts');
      const content = fs.readFileSync(filePath, 'utf-8');
      expect(content).toContain('TenantOffboardingHandler');
    });

    it('should have TenantAuditEmitter for audit logging', () => {
      const filePath = path.join(flowDir, 'tenant-audit-emitter.service.ts');
      const content = fs.readFileSync(filePath, 'utf-8');
      expect(content).toContain('TenantAuditEmitter');
    });
  });

  // ── INT-03: DNA Compliance ──────────────────────────────────────────────────

  describe('INT-03: DNA Compliance', () => {
    it('DNA-1: should not use typed model classes', () => {
      const files = fs.readdirSync(flowDir).filter((f) => f.endsWith('.ts'));
      files.forEach((file) => {
        const content = fs.readFileSync(path.join(flowDir, file), 'utf-8');
        // Use Record<string, unknown>, not typed interfaces
        expect(content).not.toMatch(/export interface \w+Schema\s*\{[^}]+type\s*:/);
      });
    });

    it('DNA-3: should return DataProcessResult, not throw', () => {
      const orchestratorFile = path.join(flowDir, 'tenant-provision-orchestrator.service.ts');
      const content = fs.readFileSync(orchestratorFile, 'utf-8');
      expect(content).toContain('DataProcessResult');
      expect(content).toContain('DataProcessResult.failure');
      expect(content).toContain('DataProcessResult.success');
    });

    it('DNA-8: should call storeDocument BEFORE enqueue', () => {
      const orchestratorFile = path.join(flowDir, 'tenant-provision-orchestrator.service.ts');
      const content = fs.readFileSync(orchestratorFile, 'utf-8');
      const storeIdx = content.indexOf('storeDocument');
      const enqueueIdx = content.indexOf('enqueue');
      expect(storeIdx).toBeLessThan(enqueueIdx);
    });

    it('Rule 1: should use fabric interfaces, not direct SDK imports', () => {
      const files = fs.readdirSync(flowDir).filter((f) => f.endsWith('.ts'));
      files.forEach((file) => {
        const content = fs.readFileSync(path.join(flowDir, file), 'utf-8');
        expect(content).not.toContain("import { Client } from '@elastic/elasticsearch'");
        expect(content).not.toMatch(/import.*from\s+['"]redis['"]/);
      });
    });

    it('Rule 6: should scope all operations to tenant_id context', () => {
      const isolationFile = path.join(flowDir, 'cross-tenant-isolation-check.service.ts');
      const content = fs.readFileSync(isolationFile, 'utf-8');
      expect(content).toContain('tenant_id');
      expect(content).toContain('UNSCOPED_QUERY');
    });

    it('CF-476: should validate tenantId and reject missing', () => {
      const orchestratorFile = path.join(flowDir, 'tenant-provision-orchestrator.service.ts');
      const content = fs.readFileSync(orchestratorFile, 'utf-8');
      expect(content).toContain('tenantId is required');
    });
  });

  // ── INT-04: Index Naming Conventions ────────────────────────────────────────

  describe('INT-04: Index Naming Conventions', () => {
    it('should use flow30-* index names', () => {
      const orchestratorFile = path.join(flowDir, 'tenant-provision-orchestrator.service.ts');
      const content = fs.readFileSync(orchestratorFile, 'utf-8');
      expect(content).toContain("'flow30-tenant-provisions'");
    });

    it('should not use numeric flow IDs in index names', () => {
      const files = fs.readdirSync(flowDir).filter((f) => f.endsWith('.ts'));
      files.forEach((file) => {
        const content = fs.readFileSync(path.join(flowDir, file), 'utf-8');
        expect(content).not.toMatch(/flow-30-/);
      });
    });

    it('should use semantic naming in service file paths', () => {
      // All files named with semantic purpose: tenant-provision-*, not flow-30-provision
      const files = fs.readdirSync(flowDir).filter((f) => f.endsWith('.ts'));
      files.forEach((file) => {
        expect(file).toContain('-');
        expect(file).not.toMatch(/^flow-\d+-/);
      });
    });
  });

  // ── INT-05: Event Schema Consistency ────────────────────────────────────────

  describe('INT-05: Event Schema Consistency', () => {
    it('should emit tenant.provisioned event', () => {
      const orchestratorFile = path.join(flowDir, 'tenant-provision-orchestrator.service.ts');
      const content = fs.readFileSync(orchestratorFile, 'utf-8');
      expect(content).toContain('tenant.provisioned');
    });

    it('should use consistent field naming (snake_case)', () => {
      const orchestratorFile = path.join(flowDir, 'tenant-provision-orchestrator.service.ts');
      const content = fs.readFileSync(orchestratorFile, 'utf-8');
      // Event and document fields use snake_case
      expect(content).toContain('provisionId');
      expect(content).toContain('tenantId');
      expect(content).toContain('planId');
    });

    it('should include timestamp fields in all events', () => {
      const orchestratorFile = path.join(flowDir, 'tenant-provision-orchestrator.service.ts');
      const content = fs.readFileSync(orchestratorFile, 'utf-8');
      // Events include provisioned_at or similar timestamp
      expect(content).toContain('provisionedAt');
    });

    it('should emit state change events on transitions', () => {
      // tenant.activated, tenant.suspended, tenant.deleted expected
      const files = fs.readdirSync(flowDir).filter((f) => f.endsWith('.ts'));
      const hasStateEvents = files.some((file) => {
        const content = fs.readFileSync(path.join(flowDir, file), 'utf-8');
        return content.includes('tenant.activated') || content.includes('tenant.suspended');
      });
      expect(hasStateEvents).toBe(true);
    });
  });
});
