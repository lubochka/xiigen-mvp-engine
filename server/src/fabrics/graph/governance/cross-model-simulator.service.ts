/**
 * CrossModelSimulatorService — Phase 5 cross-model simulation gate.
 *
 * V9-002 for proposals: simulatorModel MUST differ from proposerModel.
 *   If same → status: SKIPPED, crossModel: false.
 *
 * Protocol:
 *   1. Check V9-002: simulatorModel !== proposerModel
 *   2. Call AI to simulate: "Does this mutation improve routing for ${archetype}?"
 *   3. If AI says YES → CLEAN; if NO → CONTESTED
 *   4. Update proposal in xiigen-graph-proposals (status: PENDING_HUMAN)
 *
 * Codebase adaptations:
 *   - AI_PROVIDER (IAiProvider) used directly — same pattern as AiDecisionPipelineService
 */

import { Injectable, Inject, Logger } from '@nestjs/common';
import { IDatabaseService, DATABASE_SERVICE, IAiProvider, AI_PROVIDER } from '../../interfaces';
import { GraphMutationProposal, SimulationReport } from './mutation-proposal.types';

@Injectable()
export class CrossModelSimulatorService {
  private readonly logger = new Logger(CrossModelSimulatorService.name);
  private readonly INDEX = 'xiigen-graph-proposals';

  constructor(
    @Inject(AI_PROVIDER) private readonly ai: IAiProvider,
    @Inject(DATABASE_SERVICE) private readonly db: IDatabaseService,
  ) {}

  async simulate(
    proposal: GraphMutationProposal,
    simulatorModel: string,
  ): Promise<SimulationReport> {
    const proposerModel = proposal.proposedBy;
    const crossModel = simulatorModel !== proposerModel;

    // V9-002: require different models
    if (!crossModel) {
      const report: SimulationReport = {
        status: 'SKIPPED',
        simulatorModel,
        proposerModel,
        reasoning: `V9-002: simulatorModel (${simulatorModel}) === proposerModel (${proposerModel}) — simulation skipped`,
        crossModel: false,
      };
      await this.storeSimulationResult(proposal.id, report);
      this.logger.warn(`V9-002: simulation skipped for proposal ${proposal.id} — same model`);
      return report;
    }

    const prompt = this.buildSimulationPrompt(proposal);

    try {
      const result = await this.ai.generate(prompt, { model: simulatorModel });
      const content = result.isSuccess ? String(result.data?.['text'] ?? '') : 'CONTESTED';

      const approved =
        content.toUpperCase().includes('CLEAN') ||
        content.toUpperCase().includes('APPROVE') ||
        content.toUpperCase().includes('YES');

      const report: SimulationReport = {
        status: approved ? 'CLEAN' : 'CONTESTED',
        simulatorModel,
        proposerModel,
        reasoning: content.substring(0, 500),
        crossModel: true,
      };

      await this.storeSimulationResult(proposal.id, report);
      this.logger.log(`Simulation for ${proposal.id}: ${report.status} (${simulatorModel})`);
      return report;
    } catch (err) {
      const report: SimulationReport = {
        status: 'CONTESTED',
        simulatorModel,
        proposerModel,
        reasoning: `Simulation error: ${err}`,
        crossModel: true,
      };
      await this.storeSimulationResult(proposal.id, report);
      return report;
    }
  }

  private buildSimulationPrompt(proposal: GraphMutationProposal): string {
    const m = proposal.mutation;
    return (
      `Evaluate this proposed graph mutation for the XIIGen decision graph:\n\n` +
      `Mutation type: ${m.type}\n` +
      `Edge: ${m.fromEntity} → [${m.relationship}] → ${m.toEntity}\n` +
      `Confidence: ${m.confidence}\n` +
      `Reasoning: ${m.reasoning}\n` +
      `Evidence count: ${proposal.evidenceCount}\n\n` +
      `Question: Would adding or strengthening this edge improve routing quality ` +
      `for the ${m.fromEntity} archetype? Consider whether the edge is justified ` +
      `by the evidence and whether it creates beneficial patterns.\n\n` +
      `Reply with: CLEAN (approve) or CONTESTED (reject), followed by your reasoning.`
    );
  }

  private async storeSimulationResult(proposalId: string, report: SimulationReport): Promise<void> {
    try {
      await this.db.storeDocument(
        this.INDEX,
        {
          id: proposalId,
          simulationReport: report,
          status: 'PENDING_HUMAN',
          simulatedAt: new Date().toISOString(),
        } as Record<string, unknown>,
        `${proposalId}-sim`,
      );
    } catch (err) {
      this.logger.warn(`Failed to store simulation result for ${proposalId}: ${err}`);
    }
  }
}
