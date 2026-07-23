/**
 * CapabilityGapFlowProposerService — SS-09 / T585
 *
 * Bootstrap boundary service. Proposes new flows for capability gaps that
 * cannot be resolved by FLOW-PREREQ-02 (interface generation) or
 * FLOW-PREREQ-03 (overlap decision).
 *
 * Applies the solution-scope-gate hierarchy (SK-434):
 *   CONVENTION  → rule in AGENTS.md, no code needed
 *   ADAPTATION  → existing tool/MCP/community skill
 *   EXTENSION   → add to existing infrastructure
 *   NEW_FLOW    → full Q1-Q4 flow (default for MISSING_FABRIC_INTERFACE)
 *   NEW_INFRA   → last resort (new fabric layer)
 *
 * ⛔ STOP — proposals require Luba's approval before execution.
 * Every proposal is stored with status=PENDING_LUBA_REVIEW.
 *
 * Uses built-in fetch (Node 22+). No @nestjs/axios dependency required.
 * DNA-3: never throws for business logic.
 */

import { Injectable, Logger } from '@nestjs/common';

export interface FlowProposal {
  gapId: string;
  gapType: string;
  proposedFlow: string;
  archetype: string;
  estimatedTaskTypes: number;
  prerequisiteFlows: string[];
  estimatedSessions: number;
  solutionScopeLevel: 'CONVENTION' | 'ADAPTATION' | 'EXTENSION' | 'NEW_FLOW' | 'NEW_INFRA';
  reasoning: string;
}

@Injectable()
export class CapabilityGapFlowProposerService {
  private readonly logger = new Logger(CapabilityGapFlowProposerService.name);
  private readonly esUrl = process.env.ES_URL || 'http://localhost:9200';

  /**
   * Given a capability gap, propose the most appropriate resolution scope.
   * Result is stored in xiigen-capability-gap-proposals with PENDING_LUBA_REVIEW.
   *
   * DNA-3: never throws — returns the proposal regardless of ES availability.
   */
  async propose(gap: {
    gapId: string;
    gapType: string;
    serviceName: string;
    context: string;
  }): Promise<FlowProposal> {
    // Step 1: Check if this gap class has been resolved before
    const previousResolutions = await this.queryPreviousResolutions(gap.gapType);

    // Step 2: Apply solution-scope-gate hierarchy
    const scopeLevel = this.classifyScopeLevel(gap, previousResolutions);

    // Step 3: Build proposal
    const proposal: FlowProposal = {
      gapId: gap.gapId,
      gapType: gap.gapType,
      proposedFlow: `FLOW-INFRA-${this.deriveFlowSuffix(gap)}`,
      archetype: this.deriveArchetype(gap),
      estimatedTaskTypes: this.estimateTaskTypes(scopeLevel),
      prerequisiteFlows: [],
      estimatedSessions: scopeLevel === 'CONVENTION' ? 1 : scopeLevel === 'EXTENSION' ? 2 : 3,
      solutionScopeLevel: scopeLevel,
      reasoning:
        `Gap: ${gap.gapId}. Scope level: ${scopeLevel}. ` +
        `Previous resolutions of type ${gap.gapType}: ${previousResolutions.length}. ` +
        `Estimated complexity based on scope level and precedent.`,
    };

    // Step 4: Store proposal in xiigen-capability-gap-proposals (DNA-8: store before emit)
    await this.storeProposal(proposal);

    return proposal;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Private helpers
  // ──────────────────────────────────────────────────────────────────────────

  private async queryPreviousResolutions(gapType: string): Promise<Array<Record<string, unknown>>> {
    try {
      const res = await fetch(`${this.esUrl}/xiigen-capability-gap-proposals/_search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: { term: { gapType } },
          size: 10,
        }),
      });
      if (!res.ok) return [];
      const data = (await res.json()) as {
        hits?: { hits?: Array<{ _source?: Record<string, unknown> }> };
      };
      return (data.hits?.hits ?? []).map((h) => h._source ?? {});
    } catch {
      return [];
    }
  }

  /**
   * Solution-scope-gate hierarchy (SK-434).
   *
   * CONVENTION  — only for gap types that can resolve without code
   *               (MISSING_NAMED_CHECK, MACHINE_CONSTANT) + previous CONVENTION precedent
   * ADAPTATION  — existing MCP/tool covers this service category
   * EXTENSION   — MISSING_NAMED_CHECK with no CONVENTION precedent
   * NEW_FLOW    — default for all capability gaps requiring code generation
   * NEW_INFRA   — not used currently (reserved for future fabric layer additions)
   */
  private classifyScopeLevel(
    gap: { gapType: string; serviceName: string },
    previousResolutions: Array<Record<string, unknown>>,
  ): FlowProposal['solutionScopeLevel'] {
    // CONVENTION: only for gap types that CAN resolve without code
    // MISSING_FABRIC_INTERFACE always requires code — never CONVENTION
    const conventionEligibleTypes = ['MISSING_NAMED_CHECK', 'MACHINE_CONSTANT'];
    if (
      conventionEligibleTypes.includes(gap.gapType) &&
      previousResolutions.some((r) => r['solutionScopeLevel'] === 'CONVENTION')
    ) {
      return 'CONVENTION';
    }

    // ADAPTATION: existing MCP or community tool handles this category
    // Per SK-434: "GitHub MCP exists → don't wrap in fabric"
    // Expand knownAdaptableCaps as MCP integrations are connected
    const knownAdaptableCaps: string[] = [
      // Empty initially — populated when MCP tools cover specific service categories
      // Example future entries: 'GitHub', 'Slack', 'Calendar', 'Stripe'
    ];
    if (
      knownAdaptableCaps.some((cap) => gap.serviceName.toLowerCase().includes(cap.toLowerCase()))
    ) {
      return 'ADAPTATION';
    }

    // EXTENSION: existing infrastructure can handle this with minor addition
    if (gap.gapType === 'MISSING_NAMED_CHECK') return 'EXTENSION';

    // NEW_FLOW: default for all other capability gaps
    return 'NEW_FLOW';
  }

  private deriveFlowSuffix(gap: { serviceName: string }): string {
    return gap.serviceName.replace(/\s+/g, '-').toLowerCase().substring(0, 20);
  }

  private deriveArchetype(gap: { gapType: string }): string {
    if (gap.gapType === 'MISSING_FABRIC_INTERFACE') return 'AI_GENERATION';
    if (gap.gapType === 'OVERLAP_DETECTED') return 'ORCHESTRATION';
    return 'DATA_PIPELINE';
  }

  private estimateTaskTypes(scopeLevel: FlowProposal['solutionScopeLevel']): number {
    if (scopeLevel === 'CONVENTION') return 0;
    if (scopeLevel === 'EXTENSION') return 1;
    return 3; // NEW_FLOW typical
  }

  private async storeProposal(proposal: FlowProposal): Promise<void> {
    try {
      const res = await fetch(
        `${this.esUrl}/xiigen-capability-gap-proposals/_doc/${encodeURIComponent(proposal.gapId)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...proposal,
            proposedBy: 'CapabilityGapFlowProposer',
            status: 'PENDING_LUBA_REVIEW',
            lubaDecision: null,
            createdAt: new Date().toISOString(),
          }),
        },
      );
      if (!res.ok) {
        this.logger.error(`Failed to store proposal for ${proposal.gapId}: ${res.status}`);
      }
    } catch (error) {
      this.logger.error(`Failed to store proposal for ${proposal.gapId}: ${error}`);
    }
  }
}
