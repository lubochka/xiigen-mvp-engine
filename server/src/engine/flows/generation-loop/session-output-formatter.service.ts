// Session output infrastructure (SK-426–SK-429).
// Formats EXECUTION-LOG, PHASE-COMPLETE, SESSION-BRIEF outputs.
//
// GAP-OBS-01: CycleTrace/ArbiterTrace added so execution reports include
// prompts sent to AI, per-arbiter verdicts, and model metadata per cycle.
// This enables planning layer audit + replay of generation decisions.

/** Per-arbiter decision record for one convergence round. */
export interface ArbiterTrace {
  /** Logical arbiter role (e.g. 'domain', 'security', 'principles'). */
  arbiterId: string;
  /** Verdict returned by the arbiter. */
  verdict: 'PASS' | 'CONCERN' | 'BLOCK';
  /** Correction text when verdict is CONCERN or BLOCK. */
  correctionText?: string;
  /** Round number within the convergence loop (1-based). */
  round: number;
  /** Model that produced this arbiter output. */
  modelName: string;
  /** Tokens consumed by this arbiter call (optional — not always available). */
  tokensUsed?: number;
}

/** Trace record for one complete generation cycle (prompt → candidates → verdict). */
export interface CycleTrace {
  /** Cycle sequence number (1-based). */
  cycleNumber: number;
  /** Exact prompt text sent to generator AI. */
  promptSent: string;
  /** Per-arbiter verdicts for this cycle. */
  arbiters: ArbiterTrace[];
  /** Convergence score after arbiter panel (0.0–1.0). */
  convergenceScore: number;
  /** Whether the NODE was accepted (score ≥ threshold, no BLOCK). */
  accepted: boolean;
  /** Enrichment text injected into cycle N+1's prompt (empty when accepted). */
  correctionInjected?: string;
  /**
   * GAP-I-05/08: Topology depth level at which this cycle ran.
   * depth=0 = top-level node; depth=1 = first EXPAND sub-node; depth=2+ = deeper.
   * Required to distinguish calibration records and Playwright snapshots per depth.
   */
  depth?: number;
  /**
   * GAP-I-05/08: Semantic description of what this node is generating.
   * Used as the nodeIntent field in calibration baseline and DPO triple records.
   */
  nodeIntent?: string;
}

export interface ExecutionLogInput {
  sessionId: string;
  flowId: string;
  phaseId: string;
  decisions: string[];
  startedAt: string;
  completedAt: string;
  /** GAP-OBS-01: per-cycle generation traces (optional — present when cycle handler runs). */
  cycleTraces?: CycleTrace[];
}

export interface PhaseCompleteInput {
  phaseId: string;
  passed: boolean;
  gateItems: string[];
  testCount: number;
  baselineCount: number;
}

export interface SessionBriefInput {
  sessionId: string;
  flowId: string;
  phasesCompleted: string[];
  totalTestDelta: number;
  nextPhase: string;
}

export class SessionOutputFormatter {
  formatExecutionLog(input: ExecutionLogInput): string {
    const lines = [
      `# EXECUTION-LOG`,
      `Session: ${input.sessionId}`,
      `Flow: ${input.flowId}`,
      `Phase: ${input.phaseId}`,
      `Started: ${input.startedAt}`,
      `Completed: ${input.completedAt}`,
    ];
    if (input.decisions.length > 0) {
      lines.push('', '## Round Decisions');
      input.decisions.forEach((d, i) => lines.push(`${i + 1}. ${d}`));
    }
    if (input.cycleTraces && input.cycleTraces.length > 0) {
      lines.push('', '## Cycle Traces (GAP-OBS-01)');
      lines.push(this.formatCycleTraces(input.cycleTraces));
    }
    return lines.join('\n');
  }

  /**
   * GAP-OBS-01: Format CycleTrace[] into human-readable execution audit section.
   * Each cycle shows: prompt excerpt, per-arbiter verdicts, convergence score, accepted flag.
   */
  formatCycleTraces(traces: CycleTrace[]): string {
    return traces
      .map((ct) => {
        const promptExcerpt =
          ct.promptSent.length > 200 ? ct.promptSent.slice(0, 200) + '…' : ct.promptSent;
        const arbiterLines = ct.arbiters.map(
          (a) =>
            `    [${a.arbiterId}] ${a.verdict}${a.correctionText ? ` — "${a.correctionText}"` : ''} (${a.modelName}, ${a.tokensUsed} tokens, round ${a.round})`,
        );
        const traceLines = [
          `### Cycle ${ct.cycleNumber}`,
          `  Prompt: ${promptExcerpt}`,
          `  Arbiters (${ct.arbiters.length}):`,
          ...arbiterLines,
          `  Convergence score: ${ct.convergenceScore.toFixed(3)}`,
          `  Accepted: ${ct.accepted ? 'YES' : 'NO'}`,
        ];
        if (ct.correctionInjected) {
          const correctionExcerpt =
            ct.correctionInjected.length > 300
              ? ct.correctionInjected.slice(0, 300) + '…'
              : ct.correctionInjected;
          traceLines.push(`  Correction injected: ${correctionExcerpt}`);
        }
        return traceLines.join('\n');
      })
      .join('\n\n');
  }

  formatPhaseComplete(input: PhaseCompleteInput): string {
    const status = input.passed ? 'PASSED' : 'FAILED';
    const lines = [
      `# PHASE-COMPLETE`,
      `Phase: ${input.phaseId}`,
      `Status: ${status}`,
      `Tests: ${input.testCount} (baseline: ${input.baselineCount}, delta: +${input.testCount - input.baselineCount})`,
      '',
      '## Gate Items',
    ];
    input.gateItems.forEach((item) => lines.push(`□ ${item}`));
    return lines.join('\n');
  }

  formatSessionBrief(input: SessionBriefInput): string {
    const lines = [
      `# SESSION-BRIEF`,
      `Session: ${input.sessionId}`,
      `Flow: ${input.flowId}`,
      `Test delta: +${input.totalTestDelta}`,
      '',
      '## Phases Completed',
    ];
    input.phasesCompleted.forEach((p) => lines.push(`✅ ${p}`));
    lines.push('', `## Next Phase`, input.nextPhase);
    return lines.join('\n');
  }
}
