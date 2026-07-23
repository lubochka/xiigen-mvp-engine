// Unit tests for SessionOutputFormatter (GAP-OBS-01)
// Covers: formatCycleTraces (pass + fail cycles), formatExecutionLog with cycleTraces

import {
  SessionOutputFormatter,
  ArbiterTrace,
  CycleTrace,
  ExecutionLogInput,
} from './session-output-formatter.service';

describe('SessionOutputFormatter', () => {
  let formatter: SessionOutputFormatter;

  beforeEach(() => {
    formatter = new SessionOutputFormatter();
  });

  // ── formatCycleTraces ──────────────────────────────────────────────────────

  describe('formatCycleTraces', () => {
    const passingArbiter: ArbiterTrace = {
      arbiterId: 'key_principles',
      verdict: 'PASS',
      round: 1,
      modelName: 'claude-sonnet-4-6',
    };

    const failingArbiter: ArbiterTrace = {
      arbiterId: 'iron_rules',
      verdict: 'CONCERN',
      correctionText: 'DNA-1 violated: typed entity class used',
      round: 1,
      modelName: 'gpt-4o',
    };

    it('renders a passing cycle with accepted=YES', () => {
      const trace: CycleTrace = {
        cycleNumber: 1,
        promptSent: 'Generate a handler for task T47',
        arbiters: [passingArbiter],
        convergenceScore: 1.0,
        accepted: true,
      };

      const output = formatter.formatCycleTraces([trace]);

      expect(output).toContain('### Cycle 1');
      expect(output).toContain('Prompt: Generate a handler for task T47');
      expect(output).toContain('[key_principles] PASS');
      expect(output).toContain('Convergence score: 1.000');
      expect(output).toContain('Accepted: YES');
    });

    it('renders a failing cycle with CONCERN verdict and correction text', () => {
      const trace: CycleTrace = {
        cycleNumber: 1,
        promptSent: 'Generate T47',
        arbiters: [failingArbiter],
        convergenceScore: 0.45,
        accepted: false,
        correctionInjected: 'Use Record<string,unknown> instead of typed class',
      };

      const output = formatter.formatCycleTraces([trace]);

      expect(output).toContain('[iron_rules] CONCERN');
      expect(output).toContain('DNA-1 violated');
      expect(output).toContain('Convergence score: 0.450');
      expect(output).toContain('Accepted: NO');
      expect(output).toContain('Correction injected: Use Record<string,unknown>');
    });

    it('correctionInjected absent when cycle passes (no correction line)', () => {
      const trace: CycleTrace = {
        cycleNumber: 1,
        promptSent: 'Generate T47',
        arbiters: [passingArbiter],
        convergenceScore: 1.0,
        accepted: true,
      };

      const output = formatter.formatCycleTraces([trace]);

      expect(output).not.toContain('Correction injected');
    });

    it('truncates long prompt to 200 chars with ellipsis', () => {
      const longPrompt = 'A'.repeat(300);
      const trace: CycleTrace = {
        cycleNumber: 1,
        promptSent: longPrompt,
        arbiters: [],
        convergenceScore: 0.0,
        accepted: false,
      };

      const output = formatter.formatCycleTraces([trace]);

      expect(output).toContain('A'.repeat(200) + '…');
    });

    it('renders multiple cycles separated by blank line', () => {
      const cycle1: CycleTrace = {
        cycleNumber: 1,
        promptSent: 'prompt 1',
        arbiters: [failingArbiter],
        convergenceScore: 0.45,
        accepted: false,
      };
      const cycle2: CycleTrace = {
        cycleNumber: 2,
        promptSent: 'prompt 2 enriched',
        arbiters: [passingArbiter],
        convergenceScore: 1.0,
        accepted: true,
      };

      const output = formatter.formatCycleTraces([cycle1, cycle2]);

      expect(output).toContain('### Cycle 1');
      expect(output).toContain('### Cycle 2');
      expect(output.indexOf('### Cycle 2')).toBeGreaterThan(output.indexOf('### Cycle 1'));
    });
  });

  // ── formatExecutionLog with cycleTraces ───────────────────────────────────

  describe('formatExecutionLog', () => {
    it('includes Cycle Traces section when cycleTraces provided', () => {
      const input: ExecutionLogInput = {
        sessionId: 'sess-1',
        flowId: 'FLOW-01',
        phaseId: 'PHASE-A',
        decisions: ['Decided to use factory pattern'],
        startedAt: '2026-04-05T10:00:00Z',
        completedAt: '2026-04-05T10:05:00Z',
        cycleTraces: [
          {
            cycleNumber: 1,
            promptSent: 'Generate handler',
            arbiters: [],
            convergenceScore: 1.0,
            accepted: true,
          },
        ],
      };

      const output = formatter.formatExecutionLog(input);

      expect(output).toContain('## Cycle Traces (GAP-OBS-01)');
      expect(output).toContain('### Cycle 1');
    });

    it('omits Cycle Traces section when cycleTraces absent', () => {
      const input: ExecutionLogInput = {
        sessionId: 'sess-1',
        flowId: 'FLOW-01',
        phaseId: 'PHASE-A',
        decisions: [],
        startedAt: '2026-04-05T10:00:00Z',
        completedAt: '2026-04-05T10:05:00Z',
      };

      const output = formatter.formatExecutionLog(input);

      expect(output).not.toContain('Cycle Traces');
    });
  });
});
