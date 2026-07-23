/**
 * FLOW-35 Phase I — SessionOutput
 *
 * SK-426–SK-429: Session output skills
 * - SK-426: EXECUTION-LOG format
 * - SK-427: PHASE-COMPLETE package
 * - SK-428: SESSION-BRIEF format
 * - SK-429: AGENTS.md update protocol
 */

import { SessionOutputFormatter } from '../../src/engine/flows/generation-loop/session-output-formatter.service';

describe('FLOW-35 Phase I — SessionOutput', () => {
  let formatter: SessionOutputFormatter;
  beforeEach(() => {
    formatter = new SessionOutputFormatter();
  });

  it('F35I-1: formatExecutionLog produces valid EXECUTION-LOG with required fields', () => {
    const log = formatter.formatExecutionLog({
      sessionId: 'sess-001',
      flowId: 'FLOW-01',
      phaseId: 'FLOW-01-A',
      decisions: [],
      startedAt: '2026-01-01T00:00:00Z',
      completedAt: '2026-01-01T01:00:00Z',
    });
    expect(log).toContain('EXECUTION-LOG');
    expect(log).toContain('FLOW-01-A');
    expect(log).toContain('sess-001');
  });

  it('F35I-2: formatPhaseComplete produces PHASE-COMPLETE with gate checklist', () => {
    const pkg = formatter.formatPhaseComplete({
      phaseId: 'FLOW-01-A',
      passed: true,
      gateItems: ['2 archetypes added', '3 contracts created'],
      testCount: 14,
      baselineCount: 4170,
    });
    expect(pkg).toContain('PHASE-COMPLETE');
    expect(pkg).toContain('FLOW-01-A');
    expect(pkg).toContain('2 archetypes added');
    expect(pkg).toContain('PASSED');
  });

  it('F35I-3: formatPhaseComplete with failed=false shows FAILED', () => {
    const pkg = formatter.formatPhaseComplete({
      phaseId: 'FLOW-01-B',
      passed: false,
      gateItems: ['Tests failed'],
      testCount: 10,
      baselineCount: 4170,
    });
    expect(pkg).toContain('FAILED');
  });

  it('F35I-4: formatSessionBrief produces SESSION-BRIEF with summary', () => {
    const brief = formatter.formatSessionBrief({
      sessionId: 'sess-001',
      flowId: 'FLOW-35',
      phasesCompleted: ['FLOW-35-A', 'FLOW-35-B'],
      totalTestDelta: 24,
      nextPhase: 'FLOW-35-C',
    });
    expect(brief).toContain('SESSION-BRIEF');
    expect(brief).toContain('FLOW-35');
    expect(brief).toContain('FLOW-35-A');
    expect(brief).toContain('FLOW-35-C');
  });

  it('F35I-5: formatSessionBrief includes test delta', () => {
    const brief = formatter.formatSessionBrief({
      sessionId: 'sess-001',
      flowId: 'FLOW-35',
      phasesCompleted: [],
      totalTestDelta: 42,
      nextPhase: 'FLOW-35-D',
    });
    expect(brief).toContain('+42');
  });

  it('F35I-6: formatExecutionLog includes startedAt and completedAt timestamps', () => {
    const log = formatter.formatExecutionLog({
      sessionId: 's',
      flowId: 'F',
      phaseId: 'P',
      decisions: [],
      startedAt: '2026-01-01T00:00:00Z',
      completedAt: '2026-01-01T02:00:00Z',
    });
    expect(log).toContain('2026-01-01T00:00:00Z');
    expect(log).toContain('2026-01-01T02:00:00Z');
  });

  it('F35I-7: formatPhaseComplete includes test count vs baseline', () => {
    const pkg = formatter.formatPhaseComplete({
      phaseId: 'FLOW-35-A',
      passed: true,
      gateItems: [],
      testCount: 4184,
      baselineCount: 4170,
    });
    expect(pkg).toContain('4184');
    expect(pkg).toContain('4170');
  });

  it('F35I-8: formatExecutionLog with decisions includes each decision entry', () => {
    const log = formatter.formatExecutionLog({
      sessionId: 's',
      flowId: 'FLOW-35',
      phaseId: 'FLOW-35-B',
      decisions: ['ACCEPT on round 3', 'ESCALATE on round 2'],
      startedAt: '',
      completedAt: '',
    });
    expect(log).toContain('ACCEPT on round 3');
    expect(log).toContain('ESCALATE on round 2');
  });

  it('F35I-9: formatSessionBrief includes all completed phase IDs', () => {
    const brief = formatter.formatSessionBrief({
      sessionId: 's',
      flowId: 'FLOW-35',
      phasesCompleted: ['FLOW-35-A', 'FLOW-35-B', 'FLOW-35-C'],
      totalTestDelta: 28,
      nextPhase: 'FLOW-35-D',
    });
    expect(brief).toContain('FLOW-35-A');
    expect(brief).toContain('FLOW-35-B');
    expect(brief).toContain('FLOW-35-C');
  });

  it('F35I-10: all format methods return non-empty strings', () => {
    const log = formatter.formatExecutionLog({
      sessionId: 's',
      flowId: 'F',
      phaseId: 'P',
      decisions: [],
      startedAt: '',
      completedAt: '',
    });
    const pkg = formatter.formatPhaseComplete({
      phaseId: 'P',
      passed: true,
      gateItems: [],
      testCount: 1,
      baselineCount: 0,
    });
    const brief = formatter.formatSessionBrief({
      sessionId: 's',
      flowId: 'F',
      phasesCompleted: [],
      totalTestDelta: 0,
      nextPhase: 'next',
    });
    expect(log.length).toBeGreaterThan(0);
    expect(pkg.length).toBeGreaterThan(0);
    expect(brief.length).toBeGreaterThan(0);
  });
});
