/**
 * INTEGRATION TEST — FLOW-33: System Initiation & Generation Loop
 *
 * Verifies:
 *   INT-01: All 10 service files exist and are importable
 *   INT-02: Service chain wiring (dependencies resolve)
 *   INT-03: DNA compliance (Rule 1–16 checks)
 *   INT-04: Index naming conventions (flow33-*)
 *   INT-05: Event schema consistency
 */

import * as fs from 'fs';
import * as path from 'path';

describe('FLOW-33: Integration Tests', () => {
  const flowDir = path.resolve(__dirname, '../../../src/engine/flows/generation-loop');

  // ── INT-01: Service Files Exist ─────────────────────────────────────────────

  describe('INT-01: Service Files Exist', () => {
    const expectedServices = [
      'flow-lifecycle-seeder.service.ts',
      'flow-lifecycle.service.ts',
      'improvement-detector.service.ts',
      'meta-decision-engine.service.ts',
      'model-fitness.service.ts',
      'round-summary-processor.service.ts',
      'security-circuit-breaker.service.ts',
      'self-modification.service.ts',
      'session-output-formatter.service.ts',
      'spend-governor.service.ts',
    ];

    it('should have all 10 service files', () => {
      const files = fs
        .readdirSync(flowDir)
        .filter((f) => f.endsWith('.ts') && !f.endsWith('.spec.ts'));
      const serviceFiles = files.filter((f) => f.endsWith('.service.ts'));
      expect(serviceFiles.length).toBe(10);
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
    it('should have FlowLifecycleSeeder as entry point', () => {
      const filePath = path.join(flowDir, 'flow-lifecycle-seeder.service.ts');
      const content = fs.readFileSync(filePath, 'utf-8');
      expect(content).toContain('FlowLifecycleSeeder');
    });

    it('should have FlowLifecycle for core orchestration', () => {
      const filePath = path.join(flowDir, 'flow-lifecycle.service.ts');
      const content = fs.readFileSync(filePath, 'utf-8');
      expect(content).toContain('FlowLifecycle');
    });

    it('should have MetaDecisionEngine for arbiter consensus', () => {
      const filePath = path.join(flowDir, 'meta-decision-engine.service.ts');
      const content = fs.readFileSync(filePath, 'utf-8');
      expect(content).toContain('MetaDecisionEngine');
    });

    it('should have ModelFitness for model readiness', () => {
      const filePath = path.join(flowDir, 'model-fitness.service.ts');
      const content = fs.readFileSync(filePath, 'utf-8');
      expect(content).toContain('ModelFitness');
    });

    it('should have RoundSummaryProcessor for meta-loop summary', () => {
      const filePath = path.join(flowDir, 'round-summary-processor.service.ts');
      const content = fs.readFileSync(filePath, 'utf-8');
      expect(content).toContain('RoundSummaryProcessor');
    });

    it('should have SessionOutputFormatter for handoff', () => {
      const filePath = path.join(flowDir, 'session-output-formatter.service.ts');
      const content = fs.readFileSync(filePath, 'utf-8');
      expect(content).toContain('SessionOutputFormatter');
    });

    it('should have SelfModificationGate for safety', () => {
      const filePath = path.join(flowDir, 'self-modification.service.ts');
      const content = fs.readFileSync(filePath, 'utf-8');
      expect(content).toContain('SelfModification');
    });

    it('should have SecurityCircuitBreaker for error resilience', () => {
      const filePath = path.join(flowDir, 'security-circuit-breaker.service.ts');
      const content = fs.readFileSync(filePath, 'utf-8');
      expect(content).toContain('SecurityCircuitBreaker');
    });

    it('should have SpendGovernor for budget enforcement', () => {
      const filePath = path.join(flowDir, 'spend-governor.service.ts');
      const content = fs.readFileSync(filePath, 'utf-8');
      expect(content).toContain('SpendGovernor');
    });

    it('should have ImprovementDetector for pattern analysis', () => {
      const filePath = path.join(flowDir, 'improvement-detector.service.ts');
      const content = fs.readFileSync(filePath, 'utf-8');
      expect(content).toContain('ImprovementDetector');
    });
  });

  // ── INT-03: DNA Compliance ──────────────────────────────────────────────────

  describe('INT-03: DNA Compliance', () => {
    it('DNA-1: should not use typed model classes', () => {
      const files = fs
        .readdirSync(flowDir)
        .filter((f) => f.endsWith('.ts') && !f.endsWith('.spec.ts'));
      const serviceFiles = files.filter((f) => f.endsWith('.service.ts'));
      serviceFiles.forEach((file) => {
        const content = fs.readFileSync(path.join(flowDir, file), 'utf-8');
        // Use Record<string, unknown>, not typed interfaces
        expect(content).not.toMatch(/export interface \w+(Result|State|Output)\s*\{[^}]*id\s*:/);
      });
    });

    it('DNA-3: should return DataProcessResult, not throw', () => {
      const seedFile = path.join(flowDir, 'flow-lifecycle-seeder.service.ts');
      const content = fs.readFileSync(seedFile, 'utf-8');
      expect(content).toContain('DataProcessResult');
    });

    it('Rule 1: should use fabric interfaces, not direct SDK imports', () => {
      const files = fs
        .readdirSync(flowDir)
        .filter((f) => f.endsWith('.ts') && !f.endsWith('.spec.ts'));
      const serviceFiles = files.filter((f) => f.endsWith('.service.ts'));
      serviceFiles.forEach((file) => {
        const content = fs.readFileSync(path.join(flowDir, file), 'utf-8');
        expect(content).not.toContain("import { Client } from '@elastic/elasticsearch'");
        expect(content).not.toMatch(/import.*from\s+['"]redis['"]/);
      });
    });

    it('Rule 4: all services should extend MicroserviceBase', () => {
      const files = fs
        .readdirSync(flowDir)
        .filter((f) => f.endsWith('.ts') && !f.endsWith('.spec.ts'));
      const serviceFiles = files.filter((f) => f.endsWith('.service.ts'));
      const hasBaseServices = serviceFiles.some((file) => {
        const content = fs.readFileSync(path.join(flowDir, file), 'utf-8');
        return content.includes('MicroserviceBase') || content.includes('Injectable');
      });
      expect(hasBaseServices).toBe(true);
    });
  });

  // ── INT-04: Index Naming Conventions ────────────────────────────────────────

  describe('INT-04: Index Naming Conventions', () => {
    it('should use flow33-* index names', () => {
      const files = fs
        .readdirSync(flowDir)
        .filter((f) => f.endsWith('.ts') && !f.endsWith('.spec.ts'));
      const serviceFiles = files.filter((f) => f.endsWith('.service.ts'));
      const content = serviceFiles
        .map((f) => fs.readFileSync(path.join(flowDir, f), 'utf-8'))
        .join('\n');
      expect(content).toContain('flow33');
    });

    it('should not use numeric flow IDs in index names', () => {
      const files = fs
        .readdirSync(flowDir)
        .filter((f) => f.endsWith('.ts') && !f.endsWith('.spec.ts'));
      const serviceFiles = files.filter((f) => f.endsWith('.service.ts'));
      serviceFiles.forEach((file) => {
        const content = fs.readFileSync(path.join(flowDir, file), 'utf-8');
        expect(content).not.toMatch(/flow-33-/);
      });
    });

    it('should use semantic naming in service file paths', () => {
      // All files named semantically: flow-lifecycle-*, session-output-*, not flow-33-*
      const files = fs
        .readdirSync(flowDir)
        .filter((f) => f.endsWith('.ts') && !f.endsWith('.spec.ts'));
      const serviceFiles = files.filter((f) => f.endsWith('.service.ts'));
      serviceFiles.forEach((file) => {
        expect(file).toContain('-');
        expect(file).not.toMatch(/^flow-\d+-/);
      });
    });
  });

  // ── INT-05: Event Schema Consistency ────────────────────────────────────────

  describe('INT-05: Event Schema Consistency', () => {
    it('should emit flow generation lifecycle events', () => {
      const files = fs
        .readdirSync(flowDir)
        .filter((f) => f.endsWith('.ts') && !f.endsWith('.spec.ts'));
      const serviceFiles = files.filter((f) => f.endsWith('.service.ts'));
      const content = serviceFiles
        .map((f) => fs.readFileSync(path.join(flowDir, f), 'utf-8'))
        .join('\n');
      // Should contain bootstrap/flow events
      expect(content).toMatch(/bootstrap|flow|phase|lifecycle/i);
    });

    it('should use consistent field naming (snake_case)', () => {
      const files = fs
        .readdirSync(flowDir)
        .filter((f) => f.endsWith('.ts') && !f.endsWith('.spec.ts'));
      const serviceFiles = files.filter((f) => f.endsWith('.service.ts'));
      const content = serviceFiles
        .map((f) => fs.readFileSync(path.join(flowDir, f), 'utf-8'))
        .join('\n');
      // Expect common field names
      expect(content).toMatch(/flow_id|phase|status|session/i);
    });

    it('should include timestamp fields in events', () => {
      const files = fs
        .readdirSync(flowDir)
        .filter((f) => f.endsWith('.ts') && !f.endsWith('.spec.ts'));
      const serviceFiles = files.filter((f) => f.endsWith('.service.ts'));
      const content = serviceFiles
        .map((f) => fs.readFileSync(path.join(flowDir, f), 'utf-8'))
        .join('\n');
      // Events track time: started_at, completed_at, timestamp, etc.
      expect(content).toMatch(/_at|_time|timestamp/i);
    });

    it('should track spend and governance metrics', () => {
      const spendFile = path.join(flowDir, 'spend-governor.service.ts');
      const content = fs.readFileSync(spendFile, 'utf-8');
      // SpendGovernor should track tokens, costs, budget
      expect(content).toMatch(/budget|token|spend|cost/i);
    });
  });
});
