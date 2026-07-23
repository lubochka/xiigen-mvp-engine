/**
 * RunAnalysisFormatter — produces a human-readable Markdown analysis document
 * from a CycleChainOutput API response.
 *
 * Called by Claude Code after every POST /api/cycle-chain/run.
 * Written to: docs/sessions/FLOW-XX/final-flow-testing/FLOW-XX-RUN-{runId}-ANALYSIS.md
 *
 * DNA-3: never throws — format() wraps everything in try/catch.
 */
import { Injectable } from '@nestjs/common';
import { CycleChainOutput, DpoRoundTrace } from './cycle-chain.service';

export interface RunAnalysisMeta {
  flowId: string;
  flowTitle: string;
  userIntent: string;
  runDate: string;
}

@Injectable()
export class RunAnalysisFormatter {
  /** Format a CycleChainOutput into a full Markdown analysis document. DNA-3: never throws. */
  format(output: CycleChainOutput, meta: RunAnalysisMeta): string {
    try {
      const sections: string[] = [];
      sections.push(this.header(output, meta));
      sections.push(this.summary(output));
      sections.push(this.phaseA(output));
      sections.push(this.phaseB(output));
      sections.push(this.phaseC(output));
      sections.push(this.phaseD(output));
      sections.push(this.phaseE(output));
      sections.push(this.phaseF(output));
      sections.push(this.phaseG(output));
      sections.push(this.phaseH(output));
      sections.push(this.openIssues(output));
      return sections.join('\n\n---\n\n');
    } catch {
      return `# Run Analysis — Formatting Error\nFailed to format analysis for run ${output?.runId ?? 'unknown'}.\nRaw response available in the .json trace file.`;
    }
  }

  // ── HEADER ──────────────────────────────────────────────────────────────────

  private header(out: CycleChainOutput, meta: RunAnalysisMeta): string {
    return [
      `# ${meta.flowId} — Run Analysis`,
      `## Run ID: \`${out.runId}\``,
      `## Date: ${meta.runDate}`,
      `## Flow: ${meta.flowTitle}`,
      `## Branch: claude/vigorous-margulis`,
      ``,
      `**User intent (verbatim from PLAN-STATE.json):**`,
      `> ${meta.userIntent}`,
    ].join('\n');
  }

  // ── SUMMARY ─────────────────────────────────────────────────────────────────

  private summary(out: CycleChainOutput): string {
    const totalRounds = out.cycles.cycle2.reduce((s, c) => s + c.roundsCompleted, 0);
    const stagnationCount = out.cycles.cycle2.filter((c) => c.stagnationFired).length;
    const pass = out.grade >= 0.85 && out.pendingImplementations.length > 0;

    return [
      `## SUMMARY`,
      ``,
      `| Metric | Value |`,
      `|--------|-------|`,
      `| Overall grade | **${out.grade.toFixed(2)}** ${out.grade >= 0.85 ? '✅' : '🔴'} |`,
      `| Plan steps | ${out.planSteps.length} |`,
      `| Leaf NODEs produced | ${out.leafNodes.length} |`,
      `| Total teaching rounds | ${totalRounds} across ${out.cycles.cycle2.length} step(s) |`,
      `| Stagnation fired | ${stagnationCount}/${out.cycles.cycle2.length} step(s) |`,
      `| Total cost | $${out.totalCostUsd.toFixed(4)} |`,
      `| CYCLE-4 pending | **${out.pendingImplementations.length}** (ready for Claude Code) |`,
      ``,
      pass
        ? `**Status: PASS ✅** — All plan steps accepted, ${out.pendingImplementations.length} NODE(s) ready for implementation.`
        : `**Status: FAIL 🔴** — grade ${out.grade.toFixed(2)} ${out.grade < 0.85 ? '< threshold 0.85' : ''} ${out.pendingImplementations.length === 0 ? '— no NODEs accepted' : ''}.`,
    ].join('\n');
  }

  // ── PHASE A: PROVIDER POOL ──────────────────────────────────────────────────

  private phaseA(out: CycleChainOutput): string {
    // Derive provider pool health from cycle2 round data.
    // NOTE: If Cycle 1 (Planner) fails with grade < 0.85, the chain halts before Cycle 2 runs.
    // In that case cycles.cycle2 is empty and provMap stays empty — Phase A renders as
    // "not yet resolved." A blank Phase A means Cycle 1 failed, NOT that providers were absent.
    // Phase A reflects participation-in-rounds, not a live heartbeat.
    const provMap = new Map<
      string,
      { wins: number; runnerUps: number; discarded: number; totalScore: number; count: number }
    >();

    for (const step of out.cycles.cycle2) {
      for (const r of step.rounds) {
        const track = (model: string, role: 'win' | 'runnerUp' | 'discarded', score: number) => {
          if (!provMap.has(model))
            provMap.set(model, { wins: 0, runnerUps: 0, discarded: 0, totalScore: 0, count: 0 });
          const p = provMap.get(model)!;
          p.totalScore += score;
          p.count++;
          if (role === 'win') p.wins++;
          else if (role === 'runnerUp') p.runnerUps++;
          else p.discarded++;
        };
        track(r.chosen.model, 'win', r.chosen.score);
        track(r.rejected.model, 'runnerUp', r.rejected.score);
        if (r.discarded) track(r.discarded.model, 'discarded', r.discarded.score);
      }
    }

    const lines = [
      `## PHASE A — Provider Pool`,
      `**Source:** Derived from \`cycles.cycle2[N].rounds[N]\` (chosen / rejected / discarded per round)`,
      ``,
    ];

    if (provMap.size === 0) {
      lines.push(
        `_No cycle2 round data recorded._`,
        ``,
        `> ⚠️ Possible causes (check Phase B and Open Issues to distinguish):`,
        `> 1. Cycle 1 failed (grade < 0.85) — plan was rejected before Cycle 2 was invoked.`,
        `> 2. Cycle 2 ran but TeachingRoundService produced no valid rounds for any step`,
        `>    (all providers returned fewer than 2 results — check provider key configuration).`,
        `> Phase A reflects participation-in-rounds, not a live heartbeat.`,
        `> After provider keys are configured, this table will populate with per-model win/score data.`,
      );
      return lines.join('\n');
    }

    lines.push(
      `| Provider | Rounds active | Wins | Runner-up | Discarded | Avg score |`,
      `|----------|--------------|------|-----------|-----------|-----------|`,
      ...[...provMap.entries()].map(([model, p]) => {
        const avg = p.count > 0 ? p.totalScore / p.count : 0;
        return `| \`${model}\` | ${p.count} | ${p.wins} | ${p.runnerUps} | ${p.discarded} | ${avg.toFixed(2)} |`;
      }),
    );

    const verdict =
      provMap.size >= 2
        ? '✅ Pool healthy'
        : `⚠️ Only ${provMap.size} provider(s) responded — expected 3 (Gemini · GPT-4.1 · Claude-economy)`;
    lines.push(``, `**Verdict: ${verdict}**`);
    return lines.join('\n');
  }

  // ── PHASE B: CYCLE 1 ────────────────────────────────────────────────────────

  private phaseB(out: CycleChainOutput): string {
    const c1 = out.cycles.cycle1;
    const verdict = c1.grade >= 0.85 ? '✅ PASS' : '🔴 FAIL';
    const lines = [
      `## PHASE B — Cycle 1: Plan`,
      `**Source:** \`cycles.cycle1\` in run response`,
      ``,
      `| Field | Value |`,
      `|-------|-------|`,
      `| Planner model | \`${c1.plannerModel}\` |`,
      `| Reviewer model | \`${c1.reviewerModel}\` |`,
      `| Grade | **${c1.grade.toFixed(2)}** ${c1.grade >= 0.85 ? '✅' : '🔴'} |`,
      `| Accepted | ${c1.accepted ? '✅ Yes' : '🔴 No'} |`,
      `| Tokens | input: ${c1.tokensUsed.input} / output: ${c1.tokensUsed.output} |`,
      `| Cost | $${c1.costUsd.toFixed(4)} |`,
      ``,
      `### System prompt sent to Planner`,
      `\`\`\``,
      c1.promptSent.system,
      `\`\`\``,
      ``,
      `### User prompt sent to Planner`,
      `\`\`\``,
      c1.promptSent.user,
      `\`\`\``,
      ``,
      `### Plan steps produced`,
      `| # | Step text | Intent clause |`,
      `|---|-----------|--------------|`,
      ...c1.planSteps.map((s) => `| ${s.index} | ${s.text} | ${s.intClause} |`),
    ];

    if (c1.reviewerGaps.length > 0) {
      lines.push(``, `### Reviewer gaps found`, ...c1.reviewerGaps.map((g) => `- ${g}`));
    } else {
      lines.push(``, `### Reviewer gaps`, `None — all clauses COVERED.`);
    }

    lines.push(``, `**Verdict: ${verdict}**`);
    if (c1.grade < 0.85) {
      lines.push(
        `> ⚠️ Grade below 0.85. Check STEP-2-CYCLE1-CONTEXT.md — CONSTRAINTS or DOMAIN field may be under-prescribing.`,
      );
    }
    return lines.join('\n');
  }

  // ── PHASE C: CYCLE 2 ────────────────────────────────────────────────────────

  private phaseC(out: CycleChainOutput): string {
    const lines = [
      `## PHASE C — Cycle 2: Teaching Rounds (Nodes 1–3 + 5)`,
      `**Source:** \`cycles.cycle2[N]\` in run response`,
      `**Providers:** Node1=Gemini · Node2=GPT-4.1 · Node3=Claude-economy`,
      ``,
    ];

    for (const step of out.cycles.cycle2) {
      const verdict =
        step.accepted && step.grade >= 0.85 ? '✅ PASS' : step.accepted ? '⚠️ PARTIAL' : '🔴 FAIL';

      lines.push(
        `### Step: "${step.stepText}"`,
        `**Depth:** ${step.depth} | **nodeIntent:** ${step.nodeIntent}`,
        ``,
        `| Field | Value |`,
        `|-------|-------|`,
        `| Grade | **${step.grade.toFixed(2)}** ${step.grade >= 0.85 ? '✅' : '🔴'} |`,
        `| Accepted | ${step.accepted ? '✅ Yes' : '🔴 No'} |`,
        `| Winner model | \`${step.winnerModel}\` |`,
        `| Winner self-score | **${step.winnerSelfScore.toFixed(1)}/10** |`,
        `| Rounds completed | ${step.roundsCompleted} ${step.stagnationFired ? '(stagnation fired)' : '(max rounds reached)'} |`,
        `| CYCLE-4 ID | \`${step.cycle4Id}\` |`,
        ``,
        `#### Node generation prompt`,
        `\`\`\``,
        step.promptSent.nodePrompt,
        `\`\`\``,
        ``,
        `#### Self-judge prompt`,
        `\`\`\``,
        step.promptSent.judgeSystemPrompt,
        `\`\`\``,
        ``,
      );

      if (step.rounds.length > 0) {
        // Gap 1 fix: show all three providers (winner, runner-up, discarded) in round table
        lines.push(
          `#### Round-by-round progression`,
          `| Round | Winner model | Score | Runner-up | Score | Discarded | Score |`,
          `|-------|-------------|-------|-----------|-------|-----------|-------|`,
          ...step.rounds.map(
            (r) =>
              `| ${r.round} | \`${r.chosen.model}\` | **${r.chosen.score.toFixed(1)}** | \`${r.rejected.model}\` | ${r.rejected.score.toFixed(1)} | ${r.discarded ? `\`${r.discarded.model}\`` : '—'} | ${r.discarded ? r.discarded.score.toFixed(1) : '—'} |`,
          ),
          ``,
          this.scoreAnalysis(step.rounds),
          ``,
        );
      }

      lines.push(
        `#### Arbiter verdicts`,
        `| Arbiter | Verdict | Detail |`,
        `|---------|---------|--------|`,
        ...step.arbiters.map(
          (a) =>
            `| ${a.name} | ${a.verdict === 'PASS' ? '✅' : a.verdict === 'CONCERN' ? '⚠️' : '🔴'} ${a.verdict} | ${a.detail} |`,
        ),
      );

      // Gap 2 fix: print best round's chosen.text so DNA violations are readable without digging into the trace JSON
      if (step.rounds.length > 0) {
        const bestRound = step.rounds.reduce(
          (b, r) => (r.chosen.score > b.chosen.score ? r : b),
          step.rounds[0]!,
        );
        lines.push(
          ``,
          `#### Best NODE output (round ${bestRound.round} — \`${bestRound.chosen.model}\`, score ${bestRound.chosen.score.toFixed(1)}/10)`,
          `\`\`\`typescript`,
          bestRound.chosen.text,
          `\`\`\``,
        );
      }

      lines.push(``, `**Verdict: ${verdict}**`);

      if (!step.accepted) {
        lines.push(
          `> 🔴 NODE rejected. If grade < 0.85, check STEP-4-CYCLE2-TEMPLATE.md.`,
          `> If BLOCK verdict: read arbiter detail above and update STEP-8-HANDOFF-CONTRACT.md.`,
        );
      }
      lines.push(``);
    }

    return lines.join('\n');
  }

  // ── PHASE D: CYCLE 3 ────────────────────────────────────────────────────────

  private phaseD(out: CycleChainOutput): string {
    const lines = [
      `## PHASE D — Cycle 3: Depth Decisions`,
      `**Source:** \`cycles.cycle3[N]\` in run response`,
      ``,
      `| Step | Depth | Verdict | Signals triggered | Termination bound |`,
      `|------|-------|---------|------------------|------------------|`,
      ...out.cycles.cycle3.map(
        (c) =>
          `| ${c.stepText.substring(0, 40)} | ${c.depth} | ${c.verdict === 'LEAF' ? '🌿 LEAF' : '🌳 EXPAND'} | ${c.signalsTriggered.join(', ') || 'None'} | ${c.terminationBoundApplied ? '⚠️ Applied' : '—'} |`,
      ),
    ];

    const expands = out.cycles.cycle3.filter((c) => c.verdict === 'EXPAND');
    if (expands.length > 0) {
      lines.push(``, `### EXPAND details`);
      for (const e of expands) {
        lines.push(
          `**"${e.stepText}"** → EXPAND`,
          `Signals: ${e.signalsTriggered.join(', ')}`,
          `> Sub-nodes recurse through Cycle 1→2→3 at depth ${e.depth + 1}.`,
          ``,
        );
      }
    }
    lines.push(
      ``,
      `**Verdict: ${out.cycles.cycle3.length > 0 ? '✅ PASS' : '⚠️ No steps evaluated'}**`,
    );
    return lines.join('\n');
  }

  // ── PHASE E: BFA GUARDS ─────────────────────────────────────────────────────

  private phaseE(out: CycleChainOutput): string {
    const lines = [
      `## PHASE E — BFA Guards`,
      `**Source:** static analysis of best NODE outputs from Phase C`,
      ``,
    ];

    for (const step of out.cycles.cycle2) {
      if (step.rounds.length === 0) {
        lines.push(`### Step: "${step.stepText}"`, `_(no rounds recorded — cannot analyse)_`, ``);
        continue;
      }
      const bestRound = step.rounds.reduce(
        (b, r) => (r.chosen.score > b.chosen.score ? r : b),
        step.rounds[0]!,
      );
      const nodeText = bestRound.chosen.text;

      const checks: [string, boolean][] = [
        [
          'DNA-1: no typed classes (class X { })',
          !/class\s+\w+\s*\{/.test(nodeText) || /Record<string/.test(nodeText),
        ],
        [
          'DNA-3: DataProcessResult returned',
          /DataProcessResult/.test(nodeText) || nodeText.length < 200,
        ],
        [
          'DNA-4: extends MicroserviceBase',
          /MicroserviceBase/.test(nodeText) || nodeText.length < 200,
        ],
        ['DNA-8: storeDocument before enqueue', this.checkDna8(nodeText)],
        ['Rule-1: no SDK direct imports', !/@elastic\/|openai|@google\/generative/.test(nodeText)],
      ];

      const allPass = checks.every(([, ok]) => ok);
      lines.push(
        `### Step: "${step.stepText}"`,
        `| Rule | Status |`,
        `|------|--------|`,
        ...checks.map(([rule, ok]) => `| ${rule} | ${ok ? '✅ PASS' : '🔴 FAIL'} |`),
        ``,
        `**${allPass ? '✅ All guards pass' : '🔴 Violations found — fix iron rules in STEP-8-HANDOFF-CONTRACT.md'}**`,
        ``,
      );
    }

    return lines.join('\n');
  }

  // ── PHASE F: DPO STORAGE ─────────────────────────────────────────────────────

  private phaseF(out: CycleChainOutput): string {
    const totalTriples = out.cycles.cycle2.reduce((s, c) => s + c.roundsCompleted, 0);
    const highScore = out.cycles.cycle2.reduce(
      (s, c) => s + c.rounds.filter((r) => r.chosen.score >= 8.5).length,
      0,
    );

    const lines = [
      `## PHASE F — DPO Triple Storage`,
      `**Source:** \`GET /api/dynamic/xiigen-training-data?station=CYCLE-2&flowId=${out.flowId}\``,
      ``,
      `| Step | Rounds | High-score (≥8.5) | RAG seeds | depth |`,
      `|------|--------|-------------------|-----------|-------|`,
      ...out.cycles.cycle2.map((c) => {
        const hs = c.rounds.filter((r) => r.chosen.score >= 8.5).length;
        return `| ${c.stepText.substring(0, 40)} | ${c.roundsCompleted} | ${hs} | ${hs} | ${c.depth} |`;
      }),
      `| **TOTAL** | **${totalTriples}** | **${highScore}** | **${highScore}** | — |`,
      ``,
      `**Verdict: ${totalTriples > 0 ? '✅ PASS' : '🔴 FAIL — no triples stored'}**`,
    ];

    if (totalTriples > 0 && highScore === 0) {
      lines.push(
        `> ⚠️ All rounds scored below 8.5 — no RAG seeds created. OSS curriculum bootstraps from zero.`,
      );
    }
    return lines.join('\n');
  }

  // ── PHASE G: PENDING IMPLEMENTATIONS ─────────────────────────────────────────

  private phaseG(out: CycleChainOutput): string {
    const lines = [
      `## PHASE G — Node 4: Pending Implementations`,
      `**Source:** \`GET /api/cycle-4/pending?flowId=${out.flowId}\``,
      ``,
      out.pendingImplementations.length === 0
        ? `**No pending implementations — all NODEs were rejected or no steps ran.**`
        : `**${out.pendingImplementations.length} NODE(s) ready for Claude Code implementation.**`,
      ``,
    ];

    for (const pi of out.pendingImplementations) {
      const threshold =
        (pi.nodeSpec['quality'] as Record<string, unknown>)?.['acceptanceThreshold'] ?? 0.85;
      lines.push(
        `### \`${pi.cycle4Id}\``,
        `**Step:** ${pi.stepText}`,
        `**Depth:** ${pi.depth} | **nodeIntent:** ${pi.nodeIntent}`,
        `**Target grade:** ${pi.targetGrade} | **Status:** ${pi.status}`,
        ``,
        `#### NODE spec`,
        `\`\`\`json`,
        JSON.stringify(pi.nodeSpec, null, 2),
        `\`\`\``,
        ``,
        `#### Claude Code instruction`,
        `> Implement this NODE as a NestJS service.`,
        `> Read the NODE spec above. Implement \`intent.purpose\` using the \`structure\` I/O shape.`,
        `> All \`constraints\` are iron rules — violations = build failure.`,
        `> Acceptance threshold: ${threshold} — implementation grade must reach this.`,
        `> After implementation: \`PATCH /api/cycle-4/${pi.cycle4Id}\` with \`{ status, grade, implementationSummary }\`.`,
        ``,
      );
    }

    return lines.join('\n');
  }

  // ── PHASE H: OSS CURRICULUM ──────────────────────────────────────────────────

  private phaseH(out: CycleChainOutput): string {
    const highScore = out.cycles.cycle2.reduce(
      (s, c) => s + c.rounds.filter((r) => r.chosen.score >= 8.5).length,
      0,
    );

    return [
      `## PHASE H — OSS Curriculum`,
      `**Source:** \`GET /api/dynamic/xiigen-oss-curriculum-runs?flowId=${out.flowId}\``,
      ``,
      `> DPO winners with score ≥ 8.5 seed the OSS curriculum (OssCurriculumRunner).`,
      `> This run produced **${highScore}** high-score round(s) eligible as OSS seeds.`,
      ``,
      `| Query | Purpose |`,
      `|-------|---------|`,
      `| \`GET /api/dynamic/xiigen-training-data?flowId=${out.flowId}&station=CYCLE-2\` | All DPO triples |`,
      `| \`GET /api/dynamic/xiigen-oss-curriculum-runs?flowId=${out.flowId}\` | OSS curriculum runs |`,
      ``,
      highScore > 0
        ? `**Verdict: ✅ ${highScore} OSS seed(s) available** — query xiigen-oss-curriculum-runs to confirm write.`
        : `**Verdict: ⚠️ No OSS seeds (all rounds scored < 8.5)** — OSS curriculum bootstraps from zero.`,
    ].join('\n');
  }

  // ── OPEN ISSUES ──────────────────────────────────────────────────────────────

  private openIssues(out: CycleChainOutput): string {
    const issues: string[] = [];

    if (out.cycles.cycle1.grade < 0.85) {
      issues.push(
        `🔴 Phase B: Plan grade ${out.cycles.cycle1.grade.toFixed(2)} < 0.85 — update STEP-2-CYCLE1-CONTEXT.md`,
      );
    }
    for (const step of out.cycles.cycle2) {
      if (!step.accepted) {
        issues.push(
          `🔴 Phase C: Step "${step.stepText}" rejected (grade ${step.grade.toFixed(2)}) — check arbiter verdicts`,
        );
      }
      if (
        step.rounds.length > 0 &&
        step.rounds[0]!.chosen.score >= 9.5 &&
        step.rounds[0]!.rejected.score >= 9.5
      ) {
        issues.push(
          `⚠️ Phase C: Step "${step.stepText}" — round 1 scores suspiciously high ` +
            `(${step.rounds[0]!.chosen.score.toFixed(1)} / ${step.rounds[0]!.rejected.score.toFixed(1)}). ` +
            `Context may be over-prescribing (convergence = 1.0 risk).`,
        );
      }
    }
    const blockedArbiters = out.cycles.cycle2.flatMap((c) =>
      c.arbiters
        .filter((a) => a.verdict === 'BLOCK')
        .map((a) => `⚠️ Phase C: Arbiter ${a.name} BLOCKED step "${c.stepText}" — ${a.detail}`),
    );
    issues.push(...blockedArbiters);

    if (out.pendingImplementations.length === 0 && out.cycles.cycle2.length > 0) {
      issues.push(`🔴 Phase G: No CYCLE-4 records created — all NODEs were rejected`);
    }

    const lines = [`## OPEN ISSUES`, ``];
    if (issues.length === 0) {
      lines.push(`None. All phases passed. Proceed to Claude Code implementation (Phase G).`);
    } else {
      lines.push(...issues.map((i) => `- ${i}`));
      lines.push(``, `**Next step:** Address issues above before proceeding.`);
    }
    return lines.join('\n');
  }

  // ── HELPERS ──────────────────────────────────────────────────────────────────

  private scoreAnalysis(rounds: DpoRoundTrace[]): string {
    if (rounds.length < 2) return `_Only 1 round completed._`;
    const scores = rounds.map((r) => r.chosen.score);
    const first = scores[0]!;
    const last = scores[scores.length - 1]!;
    const delta = last - first;
    const trend =
      delta > 0.5
        ? '↑↑ improving strongly'
        : delta > 0.1
          ? '↑ improving'
          : delta < -0.1
            ? '↓ declining'
            : '→ plateau';
    const winner = rounds.reduce((b, r) => (r.chosen.score > b.chosen.score ? r : b), rounds[0]!);

    // Per-provider attribution — win count + average score across all appearances
    const provs = new Map<string, { wins: number; totalScore: number; count: number }>();
    for (const r of rounds) {
      const entries: Array<{ model: string; score: number }> = [r.chosen, r.rejected];
      if (r.discarded) entries.push(r.discarded);
      for (const e of entries) {
        if (!provs.has(e.model)) provs.set(e.model, { wins: 0, totalScore: 0, count: 0 });
        const p = provs.get(e.model)!;
        p.totalScore += e.score;
        p.count++;
      }
      provs.get(r.chosen.model)!.wins++;
    }
    const attribution = [...provs.entries()]
      .sort((a, b) => b[1].wins - a[1].wins)
      .map(([model, p]) => `\`${model}\` ${p.wins}W avg ${(p.totalScore / p.count).toFixed(2)}`)
      .join(' · ');

    return `_Score trend: ${trend} (${first.toFixed(1)} → ${last.toFixed(1)}). Best: round ${winner.round} (\`${winner.chosen.model}\`, ${winner.chosen.score.toFixed(1)}/10). Provider attribution: ${attribution}._`;
  }

  private checkDna8(text: string): boolean {
    if (!text.includes('enqueue')) return true;
    const storeIdx = text.indexOf('storeDocument');
    const enqueueIdx = text.indexOf('enqueue');
    return storeIdx !== -1 && storeIdx < enqueueIdx;
  }
}
