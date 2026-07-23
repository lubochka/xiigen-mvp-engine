/**
 * BootstrapNodeCompletenessValidator — INodeCompletenessValidator bootstrap implementation.
 *
 * Applies code-level hard checks only in bootstrap mode:
 *   NODE-HARD-001: purpose must be non-empty
 *   NODE-002: failureModes[] must be present
 *   NODE-003: domainConcepts[] must have >= 2 items
 *   NODE-001: purpose must not contain stack terminology
 *
 * AI grading is skipped in Phase 2. The completeness threshold from FREEDOM config
 * is READ for audit purposes only — it gates AI grading in Phase 3.
 * Bootstrap returns overallScore: 1.0 when no hard violations exist.
 *
 * Phase 2: deterministic code checks only, no AI dependency.
 */

import { Injectable, Inject, Optional } from '@nestjs/common';
import {
  INodeCompletenessValidator,
  NodeRepresentation,
  IGraphConfigReader,
  GRAPH_CONFIG_READER,
} from './planning-abstracts';

@Injectable()
export class BootstrapNodeCompletenessValidator extends INodeCompletenessValidator {
  constructor(
    @Optional() @Inject(GRAPH_CONFIG_READER) private readonly config?: IGraphConfigReader,
  ) {
    super();
  }

  async validate(params: { node: NodeRepresentation; archetype: string }): Promise<{
    passed: boolean;
    hardViolations: string[];
    aiGrading?: { overallScore: number; suggestions: string[] };
  }> {
    // In bootstrap mode: apply code-level hard checks only, no AI grading
    const violations: string[] = [];
    const { node } = params;

    if (!node.intent.purpose?.trim()) {
      violations.push('NODE-HARD-001: purpose is empty — cannot derive genesis prompt');
    }
    if (!node.intent.failureModes?.length) {
      violations.push('NODE-002: failureModes[] is empty — iron rules cannot be derived');
    }
    if ((node.intent.domainConcepts?.length ?? 0) < 2) {
      violations.push('NODE-003: domainConcepts[] has < 2 items');
    }

    // Stack-terminology check (hard invariant)
    const stackTerms = /NestJS|@Injectable|Bull|BullMQ|ioredis|extends \w+Service/;
    if (stackTerms.test(node.intent.purpose ?? '')) {
      violations.push('NODE-001: purpose contains stack terminology');
    }

    // Read threshold from FREEDOM config — for audit and Phase 3 AI grading gate.
    // In bootstrap mode this value does NOT change pass/fail (hard violations only gate).
    const _threshold = this.config
      ? await this.config.get('engine.nodeValidation.completenessThreshold', 0.75)
      : 0.75;

    return {
      passed: violations.length === 0,
      hardViolations: violations,
      aiGrading:
        violations.length === 0
          ? {
              overallScore: 1.0,
              suggestions: [`Bootstrap mode — threshold ${_threshold} applies in Phase 3`],
            }
          : undefined,
    };
  }
}
