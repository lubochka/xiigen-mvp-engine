// server/src/guardrails/arbiter-consensus.handler.ts
// 5-arbiter consensus gate with strict null policy (CN-11).
// Absent or empty metadata section = implicit REJECT.
//
// DNA-3: returns DataProcessResult, never throws

import { Injectable, Logger } from '@nestjs/common';
import { DataProcessResult } from '../kernel/data-process-result';

export type ArbiterVote = { arbiter: string; vote: 'APPROVE' | 'REJECT'; reason?: string };

export interface AdapterArbiterMetadata {
  schemaArbiter?: Record<string, unknown>;
  tenantArbiter?: Record<string, unknown>;
  securityArbiter?: Record<string, unknown>;
  performanceArbiter?: Record<string, unknown>;
  complianceArbiter?: Record<string, unknown>;
  [key: string]: Record<string, unknown> | undefined;
}

const REQUIRED_ARBITERS = [
  'schemaArbiter',
  'tenantArbiter',
  'securityArbiter',
  'performanceArbiter',
  'complianceArbiter',
] as const;

type RequiredArbiter = (typeof REQUIRED_ARBITERS)[number];

@Injectable()
export class ArbiterConsensusHandler {
  private readonly logger = new Logger(ArbiterConsensusHandler.name);

  async evaluate(
    adapterMetadata: AdapterArbiterMetadata,
  ): Promise<DataProcessResult<{ consensus: 'APPROVED'; votes: ArbiterVote[] }>> {
    const votes: ArbiterVote[] = REQUIRED_ARBITERS.map((arbiterName: RequiredArbiter) => {
      const section = adapterMetadata[arbiterName];
      // STRICT NULL POLICY: absent or empty section = implicit REJECT
      if (!section || Object.keys(section).length === 0) {
        return {
          arbiter: arbiterName,
          vote: 'REJECT' as const,
          reason:
            `Missing metadata section for ${arbiterName}. Cannot evaluate. ` +
            `This adapter cannot be deployed without complete arbiter metadata.`,
        };
      }
      // Section present — approve (detailed evaluation delegated to per-arbiter services)
      return {
        arbiter: arbiterName,
        vote: 'APPROVE' as const,
      };
    });

    const rejections = votes.filter((v) => v.vote !== 'APPROVE');
    if (rejections.length > 0) {
      return DataProcessResult.failure(
        'CONSENSUS_REJECTED',
        `Adapter failed 5-arbiter consensus. ${rejections.length} rejection(s):\n` +
          rejections.map((r) => `  ${r.arbiter}: ${r.reason}`).join('\n'),
      );
    }
    return DataProcessResult.success({ consensus: 'APPROVED', votes });
  }
}
