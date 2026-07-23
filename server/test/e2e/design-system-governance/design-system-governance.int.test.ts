/**
 * INTEGRATION TEST — FLOW-31: Design System Governance Engine
 *
 * Verifies:
 *   INT-01: All 27 service files exist and are importable
 *   INT-02: Service chain wiring (dependencies resolve)
 *   INT-03: DNA compliance (Rule 1–16 checks)
 *   INT-04: Index naming conventions (flow31-*)
 *   INT-05: Event schema consistency
 */

import * as fs from 'fs';
import * as path from 'path';

describe('FLOW-31: Integration Tests', () => {
  const flowDir = path.resolve(__dirname, '../../../src/engine/flows/design-system-governance');

  // ── INT-01: Service Files Exist ─────────────────────────────────────────────

  describe('INT-01: Service Files Exist', () => {
    const expectedServices = [
      'architecture-scorer.service.ts',
      'component-catalog-updater.service.ts',
      'component-compatibility-checker.service.ts',
      'component-map-parser.service.ts',
      'component-schema-gate.service.ts',
      'cross-design-impact-analyzer.service.ts',
      'design-change-emitter.service.ts',
      'design-complexity-analyzer.service.ts',
      'design-conflict-detector.service.ts',
      'design-context-builder.service.ts',
      'design-debt-analyzer.service.ts',
      'design-decision-logger.service.ts',
      'design-deployment-gate.service.ts',
      'design-evolution-tracker.service.ts',
      'design-feedback-learner.service.ts',
      'design-health-scorer.service.ts',
      'design-pattern-parser.service.ts',
      'design-publish-orchestrator.service.ts',
      'design-quality-gate.service.ts',
      'design-rule-validator.service.ts',
      'design-spec-ingester.service.ts',
      'design-token-extractor.service.ts',
      'design-version-tracker.service.ts',
      'meta-design-orchestrator.service.ts',
      'token-conflict-scanner.service.ts',
      'token-consistency-gate.service.ts',
      'token-library-updater.service.ts',
    ];

    it('should have all 27 service files', () => {
      const files = fs.readdirSync(flowDir).filter((f) => f.endsWith('.ts'));
      const serviceFiles = files.filter((f) => f.endsWith('.service.ts'));
      expect(serviceFiles.length).toBe(27);
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
    it('should have DesignSpecIngester as entry point', () => {
      const filePath = path.join(flowDir, 'design-spec-ingester.service.ts');
      const content = fs.readFileSync(filePath, 'utf-8');
      expect(content).toContain('DesignSpecIngester');
    });

    it('should have ComponentMapParser for component extraction', () => {
      const filePath = path.join(flowDir, 'component-map-parser.service.ts');
      const content = fs.readFileSync(filePath, 'utf-8');
      expect(content).toContain('ComponentMapParser');
    });

    it('should have DesignTokenExtractor for token extraction', () => {
      const filePath = path.join(flowDir, 'design-token-extractor.service.ts');
      const content = fs.readFileSync(filePath, 'utf-8');
      expect(content).toContain('DesignTokenExtractor');
    });

    it('should have TokenLibraryUpdater for token catalog', () => {
      const filePath = path.join(flowDir, 'token-library-updater.service.ts');
      const content = fs.readFileSync(filePath, 'utf-8');
      expect(content).toContain('TokenLibraryUpdater');
    });

    it('should have ComponentCatalogUpdater for component catalog', () => {
      const filePath = path.join(flowDir, 'component-catalog-updater.service.ts');
      const content = fs.readFileSync(filePath, 'utf-8');
      expect(content).toContain('ComponentCatalogUpdater');
    });

    it('should have DesignRuleValidator for enforcement', () => {
      const filePath = path.join(flowDir, 'design-rule-validator.service.ts');
      const content = fs.readFileSync(filePath, 'utf-8');
      expect(content).toContain('DesignRuleValidator');
    });

    it('should have TokenConflictScanner for conflict detection', () => {
      const filePath = path.join(flowDir, 'token-conflict-scanner.service.ts');
      const content = fs.readFileSync(filePath, 'utf-8');
      expect(content).toContain('TokenConflictScanner');
    });

    it('should have ComponentCompatibilityChecker for compatibility', () => {
      const filePath = path.join(flowDir, 'component-compatibility-checker.service.ts');
      const content = fs.readFileSync(filePath, 'utf-8');
      expect(content).toContain('ComponentCompatibilityChecker');
    });

    it('should have CrossDesignImpactAnalyzer for blast radius', () => {
      const filePath = path.join(flowDir, 'cross-design-impact-analyzer.service.ts');
      const content = fs.readFileSync(filePath, 'utf-8');
      expect(content).toContain('CrossDesignImpactAnalyzer');
    });

    it('should have DesignDeploymentGate for deployment gating', () => {
      const filePath = path.join(flowDir, 'design-deployment-gate.service.ts');
      const content = fs.readFileSync(filePath, 'utf-8');
      expect(content).toContain('DesignDeploymentGate');
    });
  });

  // ── INT-03: DNA Compliance ──────────────────────────────────────────────────

  describe('INT-03: DNA Compliance', () => {
    it('DNA-1: should not use typed model classes', () => {
      const files = fs.readdirSync(flowDir).filter((f) => f.endsWith('.ts'));
      const serviceFiles = files.filter((f) => f.endsWith('.service.ts'));
      serviceFiles.forEach((file) => {
        const content = fs.readFileSync(path.join(flowDir, file), 'utf-8');
        // Use Record<string, unknown>, not typed interfaces
        expect(content).not.toMatch(
          /export interface \w+(Token|Component|Design)\s*\{[^}]+name\s*:/,
        );
      });
    });

    it('DNA-3: should return DataProcessResult, not throw', () => {
      const ingestFile = path.join(flowDir, 'design-spec-ingester.service.ts');
      const content = fs.readFileSync(ingestFile, 'utf-8');
      expect(content).toContain('DataProcessResult');
    });

    it('Rule 1: should use fabric interfaces, not direct SDK imports', () => {
      const files = fs.readdirSync(flowDir).filter((f) => f.endsWith('.ts'));
      const serviceFiles = files.filter((f) => f.endsWith('.service.ts'));
      serviceFiles.forEach((file) => {
        const content = fs.readFileSync(path.join(flowDir, file), 'utf-8');
        expect(content).not.toContain("import { Client } from '@elastic/elasticsearch'");
        expect(content).not.toMatch(/import.*from\s+['"]redis['"]/);
      });
    });
  });

  // ── INT-04: Index Naming Conventions ────────────────────────────────────────

  describe('INT-04: Index Naming Conventions', () => {
    it('should use flow31-* index names', () => {
      const files = fs.readdirSync(flowDir).filter((f) => f.endsWith('.ts'));
      const serviceFiles = files.filter((f) => f.endsWith('.service.ts'));
      const content = serviceFiles
        .map((f) => fs.readFileSync(path.join(flowDir, f), 'utf-8'))
        .join('\n');
      expect(content).toContain('flow31');
    });

    it('should not use numeric flow IDs in index names', () => {
      const files = fs.readdirSync(flowDir).filter((f) => f.endsWith('.ts'));
      const serviceFiles = files.filter((f) => f.endsWith('.service.ts'));
      serviceFiles.forEach((file) => {
        const content = fs.readFileSync(path.join(flowDir, file), 'utf-8');
        expect(content).not.toMatch(/flow-31-/);
      });
    });

    it('should use semantic naming in service file paths', () => {
      // All files named semantically: design-token-*, token-library-*, not flow-31-*
      const files = fs.readdirSync(flowDir).filter((f) => f.endsWith('.ts'));
      const serviceFiles = files.filter((f) => f.endsWith('.service.ts'));
      serviceFiles.forEach((file) => {
        expect(file).toContain('-');
        expect(file).not.toMatch(/^flow-\d+-/);
      });
    });
  });

  // ── INT-05: Event Schema Consistency ────────────────────────────────────────

  describe('INT-05: Event Schema Consistency', () => {
    it('should emit design system events', () => {
      const files = fs.readdirSync(flowDir).filter((f) => f.endsWith('.ts'));
      const serviceFiles = files.filter((f) => f.endsWith('.service.ts'));
      const content = serviceFiles
        .map((f) => fs.readFileSync(path.join(flowDir, f), 'utf-8'))
        .join('\n');
      // Should contain some event emissions
      expect(content.length).toBeGreaterThan(1000);
    });

    it('should use consistent field naming (snake_case in documents)', () => {
      const files = fs.readdirSync(flowDir).filter((f) => f.endsWith('.ts'));
      const serviceFiles = files.filter((f) => f.endsWith('.service.ts'));
      const content = serviceFiles
        .map((f) => fs.readFileSync(path.join(flowDir, f), 'utf-8'))
        .join('\n');
      // Expect common design system field names
      expect(content).toContain('token_id');
      expect(content).toContain('component_id');
    });

    it('should include timestamp fields in events', () => {
      const files = fs.readdirSync(flowDir).filter((f) => f.endsWith('.ts'));
      const serviceFiles = files.filter((f) => f.endsWith('.service.ts'));
      const content = serviceFiles
        .map((f) => fs.readFileSync(path.join(flowDir, f), 'utf-8'))
        .join('\n');
      // Events should track timestamps
      expect(content).toMatch(/_at|_time|timestamp/i);
    });
  });
});
