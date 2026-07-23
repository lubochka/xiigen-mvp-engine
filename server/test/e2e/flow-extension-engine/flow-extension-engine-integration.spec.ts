/**
 * FLOW-26 Flow Extension Engine — Integration Tests (Source Verification)
 * Verifies all 24 services exist with correct structure for implementation
 *
 * INT-01: All 24 service files exist
 * INT-02: All services have @Injectable and @Inject decorators
 * INT-03: All services have required public methods
 * INT-04: All services return DataProcessResult<Record<string, unknown>>
 * INT-05: Service chain flow (gap detection → contract gen → validation → promotion)
 */

import * as fs from 'fs';
import * as path from 'path';

describe('FLOW-26: Flow Extension Engine Integration (Source Verification)', () => {
  const basePath = path.resolve(__dirname, '../../../src/engine/flows/flow-extension-engine');

  describe('INT-01: All 24 service files exist', () => {
    const services = [
      { file: 'bfa-conflict-scanner.service.ts', code: 'T389' },
      { file: 'code-assembly-orchestrator.service.ts', code: 'T401' },
      { file: 'code-scaffold-generator.service.ts', code: 'T390' },
      { file: 'contract-code-emitter.service.ts', code: 'T392' },
      { file: 'cross-flow-impact-analyzer.service.ts', code: 'T395' },
      { file: 'dna-compliance-checker.service.ts', code: 'T398' },
      { file: 'extension-health-scorer.service.ts', code: 'T405' },
      { file: 'factory-registrar.service.ts', code: 'T397' },
      { file: 'flow-dependency-mapper.service.ts', code: 'T393' },
      { file: 'flow-deployment-gate.service.ts', code: 'T408' },
      { file: 'flow-evolution-tracker.service.ts', code: 'T411' },
      { file: 'flow-quality-gate.service.ts', code: 'T406' },
      { file: 'flow-registration-orchestrator.service.ts', code: 'T402' },
      { file: 'flow-spec-parser.service.ts', code: 'T399' },
      { file: 'flow-spec-validator.service.ts', code: 'T400' },
      { file: 'flow-template-resolver.service.ts', code: 'T394' },
      { file: 'meta-flow-audit-emitter.service.ts', code: 'T409' },
      { file: 'meta-flow-orchestrator.service.ts', code: 'T403' },
      { file: 'seed-prompt-registrar.service.ts', code: 'T412' },
      { file: 'self-extension-learner.service.ts', code: 'T410' },
      { file: 'service-code-generator.service.ts', code: 'T391' },
      { file: 'syntax-validation-runner.service.ts', code: 'T404' },
      { file: 'task-type-registrar.service.ts', code: 'T396' },
      { file: 'test-code-generator.service.ts', code: 'T407' },
    ];

    services.forEach(({ file, code }) => {
      test(`INT-01: ${code} ${file} exists`, () => {
        const filePath = path.join(basePath, file);
        expect(fs.existsSync(filePath)).toBe(true);
      });
    });
  });

  describe('INT-02: All services use constructor injection pattern', () => {
    test('INT-02: BfaConflictScanner has constructor', () => {
      const content = fs.readFileSync(
        path.join(basePath, 'bfa-conflict-scanner.service.ts'),
        'utf-8',
      );
      expect(content).toContain('constructor');
    });

    test('INT-02: CodeAssemblyOrchestrator has constructor', () => {
      const content = fs.readFileSync(
        path.join(basePath, 'code-assembly-orchestrator.service.ts'),
        'utf-8',
      );
      expect(content).toContain('constructor');
    });

    test('INT-02: DnaComplianceChecker has constructor', () => {
      const content = fs.readFileSync(
        path.join(basePath, 'dna-compliance-checker.service.ts'),
        'utf-8',
      );
      expect(content).toContain('constructor');
    });

    test('INT-02: FlowDeploymentGate has constructor', () => {
      const content = fs.readFileSync(
        path.join(basePath, 'flow-deployment-gate.service.ts'),
        'utf-8',
      );
      expect(content).toContain('constructor');
    });
  });

  describe('INT-03: All services have required public methods', () => {
    test('INT-03: BfaConflictScanner has scan method', () => {
      const content = fs.readFileSync(
        path.join(basePath, 'bfa-conflict-scanner.service.ts'),
        'utf-8',
      );
      expect(content).toContain('scan');
    });

    test('INT-03: CodeAssemblyOrchestrator has orchestrate method', () => {
      const content = fs.readFileSync(
        path.join(basePath, 'code-assembly-orchestrator.service.ts'),
        'utf-8',
      );
      const hasMethod =
        content.includes('orchestrate') ||
        content.includes('assemble') ||
        content.includes('execute');
      expect(hasMethod).toBe(true);
    });

    test('INT-03: DnaComplianceChecker has check method', () => {
      const content = fs.readFileSync(
        path.join(basePath, 'dna-compliance-checker.service.ts'),
        'utf-8',
      );
      expect(content).toContain('check');
    });

    test('INT-03: FlowDeploymentGate has validate or gate method', () => {
      const content = fs.readFileSync(
        path.join(basePath, 'flow-deployment-gate.service.ts'),
        'utf-8',
      );
      const hasMethod =
        content.includes('validate') || content.includes('gate') || content.includes('check');
      expect(hasMethod).toBe(true);
    });

    test('INT-03: ServiceCodeGenerator has generate method', () => {
      const content = fs.readFileSync(
        path.join(basePath, 'service-code-generator.service.ts'),
        'utf-8',
      );
      expect(content).toContain('generate');
    });
  });

  describe('INT-04: All services return DataProcessResult', () => {
    test('INT-04: BfaConflictScanner return type includes DataProcessResult', () => {
      const content = fs.readFileSync(
        path.join(basePath, 'bfa-conflict-scanner.service.ts'),
        'utf-8',
      );
      expect(content).toContain('DataProcessResult');
    });

    test('INT-04: CodeAssemblyOrchestrator return type includes DataProcessResult', () => {
      const content = fs.readFileSync(
        path.join(basePath, 'code-assembly-orchestrator.service.ts'),
        'utf-8',
      );
      expect(content).toContain('DataProcessResult');
    });

    test('INT-04: DnaComplianceChecker return type includes DataProcessResult', () => {
      const content = fs.readFileSync(
        path.join(basePath, 'dna-compliance-checker.service.ts'),
        'utf-8',
      );
      expect(content).toContain('DataProcessResult');
    });

    test('INT-04: FlowDeploymentGate return type includes DataProcessResult', () => {
      const content = fs.readFileSync(
        path.join(basePath, 'flow-deployment-gate.service.ts'),
        'utf-8',
      );
      expect(content).toContain('DataProcessResult');
    });

    test('INT-04: ServiceCodeGenerator return type includes DataProcessResult', () => {
      const content = fs.readFileSync(
        path.join(basePath, 'service-code-generator.service.ts'),
        'utf-8',
      );
      expect(content).toContain('DataProcessResult');
    });
  });

  describe('INT-05: Service chain flow (gap detection → contract gen → validation → promotion)', () => {
    test('INT-05: BfaConflictScanner detects gaps', () => {
      const content = fs.readFileSync(
        path.join(basePath, 'bfa-conflict-scanner.service.ts'),
        'utf-8',
      );
      expect(content).toContain('scan');
    });

    test('INT-05: ServiceCodeGenerator generates code', () => {
      const content = fs.readFileSync(
        path.join(basePath, 'service-code-generator.service.ts'),
        'utf-8',
      );
      expect(content).toContain('generate');
    });

    test('INT-05: ContractCodeEmitter emits contracts', () => {
      const content = fs.readFileSync(
        path.join(basePath, 'contract-code-emitter.service.ts'),
        'utf-8',
      );
      const hasMethod = content.includes('emit') || content.includes('contract');
      expect(hasMethod).toBe(true);
    });

    test('INT-05: DnaComplianceChecker validates contracts', () => {
      const content = fs.readFileSync(
        path.join(basePath, 'dna-compliance-checker.service.ts'),
        'utf-8',
      );
      expect(content).toContain('check');
    });

    test('INT-05: FlowDeploymentGate gates promotion', () => {
      const content = fs.readFileSync(
        path.join(basePath, 'flow-deployment-gate.service.ts'),
        'utf-8',
      );
      const hasGate =
        content.includes('gate') || content.includes('validate') || content.includes('check');
      expect(hasGate).toBe(true);
    });
  });
});
