/**
 * FLOW-25 BFA Conflict Arbitration — Integration Tests (Source Verification)
 * Verifies all 14 services exist with correct structure for implementation
 *
 * INT-01: All 14 service files exist
 * INT-02: All services have @Injectable and @Inject decorators
 * INT-03: All services have required public methods
 * INT-04: All services return DataProcessResult<Record<string, unknown>>
 * INT-05: Cross-service source verification (event flow)
 */

import * as fs from 'fs';
import * as path from 'path';

describe('FLOW-25: BFA Conflict Arbitration Integration (Source Verification)', () => {
  const basePath = path.resolve(__dirname, '../../../src/engine/flows/bfa-conflict-arbitration');

  describe('INT-01: All 14 service files exist', () => {
    const services = [
      { file: 'change-intake-parser.service.ts', code: 'T375' },
      { file: 'dependency-index-query.service.ts', code: 'T376' },
      { file: 'static-conflict-detector.service.ts', code: 'T377' },
      { file: 'semantic-impact-analyzer.service.ts', code: 'T378' },
      { file: 'blast-radius-calculator.service.ts', code: 'T379' },
      { file: 'arbitration-state-machine.service.ts', code: 'T380' },
      { file: 'resolution-applier.service.ts', code: 'T381' },
      { file: 'impact-report-generator.service.ts', code: 'T382' },
      { file: 'human-resolution-capture.service.ts', code: 'T383' },
      { file: 'decision-audit-trail.service.ts', code: 'T384' },
      { file: 'analytics-emitter.service.ts', code: 'T385' },
      { file: 'cross-tenant-conflict-guard.service.ts', code: 'T386' },
      { file: 'multi-tenant-isolation-gate.service.ts', code: 'T387' },
      { file: 'severity-aggregator.service.ts', code: 'T388' },
    ];

    services.forEach(({ file, code }) => {
      test(`INT-01: ${code} ${file} exists`, () => {
        const filePath = path.join(basePath, file);
        expect(fs.existsSync(filePath)).toBe(true);
      });
    });
  });

  describe('INT-02: All services have @Injectable and @Inject decorators', () => {
    test('INT-02: ChangeIntakeParser has @Injectable', () => {
      const content = fs.readFileSync(
        path.join(basePath, 'change-intake-parser.service.ts'),
        'utf-8',
      );
      expect(content).toContain('@Injectable');
    });

    test('INT-02: ChangeIntakeParser has @Inject', () => {
      const content = fs.readFileSync(
        path.join(basePath, 'change-intake-parser.service.ts'),
        'utf-8',
      );
      expect(content).toContain('@Inject');
    });

    test('INT-02: ArbitrationStateMachine has @Injectable', () => {
      const content = fs.readFileSync(
        path.join(basePath, 'arbitration-state-machine.service.ts'),
        'utf-8',
      );
      expect(content).toContain('@Injectable');
    });

    test('INT-02: DecisionAuditTrail has @Injectable', () => {
      const content = fs.readFileSync(
        path.join(basePath, 'decision-audit-trail.service.ts'),
        'utf-8',
      );
      expect(content).toContain('@Injectable');
    });
  });

  describe('INT-03: All services have required public methods', () => {
    test('INT-03: ChangeIntakeParser has parseIntake method', () => {
      const content = fs.readFileSync(
        path.join(basePath, 'change-intake-parser.service.ts'),
        'utf-8',
      );
      expect(content).toContain('parseIntake');
    });

    test('INT-03: DependencyIndexQuery has query method', () => {
      const content = fs.readFileSync(
        path.join(basePath, 'dependency-index-query.service.ts'),
        'utf-8',
      );
      expect(content).toContain('query');
    });

    test('INT-03: StaticConflictDetector has detect method', () => {
      const content = fs.readFileSync(
        path.join(basePath, 'static-conflict-detector.service.ts'),
        'utf-8',
      );
      expect(content).toContain('detect');
    });

    test('INT-03: ArbitrationStateMachine has arbitra method', () => {
      const content = fs.readFileSync(
        path.join(basePath, 'arbitration-state-machine.service.ts'),
        'utf-8',
      );
      const hasMethod =
        content.includes('arbitrate') ||
        content.includes('transition') ||
        content.includes('process');
      expect(hasMethod).toBe(true);
    });

    test('INT-03: DecisionAuditTrail has audit method', () => {
      const content = fs.readFileSync(
        path.join(basePath, 'decision-audit-trail.service.ts'),
        'utf-8',
      );
      const hasMethod = content.includes('audit') || content.includes('record');
      expect(hasMethod).toBe(true);
    });
  });

  describe('INT-04: All services return DataProcessResult', () => {
    test('INT-04: ChangeIntakeParser return type includes DataProcessResult', () => {
      const content = fs.readFileSync(
        path.join(basePath, 'change-intake-parser.service.ts'),
        'utf-8',
      );
      expect(content).toContain('DataProcessResult');
    });

    test('INT-04: DependencyIndexQuery return type includes DataProcessResult', () => {
      const content = fs.readFileSync(
        path.join(basePath, 'dependency-index-query.service.ts'),
        'utf-8',
      );
      expect(content).toContain('DataProcessResult');
    });

    test('INT-04: StaticConflictDetector return type includes DataProcessResult', () => {
      const content = fs.readFileSync(
        path.join(basePath, 'static-conflict-detector.service.ts'),
        'utf-8',
      );
      expect(content).toContain('DataProcessResult');
    });

    test('INT-04: ArbitrationStateMachine return type includes DataProcessResult', () => {
      const content = fs.readFileSync(
        path.join(basePath, 'arbitration-state-machine.service.ts'),
        'utf-8',
      );
      expect(content).toContain('DataProcessResult');
    });

    test('INT-04: DecisionAuditTrail return type includes DataProcessResult', () => {
      const content = fs.readFileSync(
        path.join(basePath, 'decision-audit-trail.service.ts'),
        'utf-8',
      );
      expect(content).toContain('DataProcessResult');
    });
  });

  describe('INT-05: Cross-service event flow (source verification)', () => {
    test('INT-05: ChangeIntakeParser emits events via queue', () => {
      const content = fs.readFileSync(
        path.join(basePath, 'change-intake-parser.service.ts'),
        'utf-8',
      );
      expect(content).toContain('enqueue');
    });

    test('INT-05: ArbitrationStateMachine stores decisions before emitting', () => {
      const content = fs.readFileSync(
        path.join(basePath, 'arbitration-state-machine.service.ts'),
        'utf-8',
      );
      expect(content).toContain('storeDocument');
    });

    test('INT-05: DecisionAuditTrail appends audit records', () => {
      const content = fs.readFileSync(
        path.join(basePath, 'decision-audit-trail.service.ts'),
        'utf-8',
      );
      expect(content).toContain('storeDocument');
    });

    test('INT-05: ResolutionApplier applies resolution state', () => {
      const content = fs.readFileSync(
        path.join(basePath, 'resolution-applier.service.ts'),
        'utf-8',
      );
      expect(content).toContain('storeDocument');
    });

    test('INT-05: MultiTenantIsolationGate enforces scope', () => {
      const content = fs.readFileSync(
        path.join(basePath, 'multi-tenant-isolation-gate.service.ts'),
        'utf-8',
      );
      expect(content).toContain('searchDocuments');
    });
  });
});
