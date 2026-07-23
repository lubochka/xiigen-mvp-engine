// server/src/engine/af-pipeline/af-pipeline.handler.ts
// AF pipeline handler with RAG health gate.
// CN-13: prevents degraded DPO output from contaminating training corpus.
//
// DNA-3: returns DataProcessResult, never throws
// Rule 14: ragEmptyPolicy is a FREEDOM config key

import { Injectable, Inject, Logger } from '@nestjs/common';
import { IDatabaseService, DATABASE_SERVICE } from '../../fabrics/interfaces/database.interface';
import { DataProcessResult } from '../../kernel/data-process-result';
import {
  IFreedomConfigService,
  FREEDOM_CONFIG_SERVICE,
} from '../../freedom/freedom-config.interface';

export interface RagHealthStatus {
  healthy: boolean;
  patternsCount: number;
  message?: string;
}

export interface RagServiceFacade {
  retrieve(
    taskTypeId: string,
    options?: { stage?: string },
  ): Promise<DataProcessResult<Array<Record<string, unknown>>>>;
}

@Injectable()
export class AfPipelineHandler {
  private readonly logger = new Logger(AfPipelineHandler.name);

  constructor(
    @Inject(DATABASE_SERVICE) private readonly db: IDatabaseService,
    @Inject(FREEDOM_CONFIG_SERVICE) private readonly freedomConfig: IFreedomConfigService,
  ) {}

  async checkRagHealth(taskTypeId: string, ragService: RagServiceFacade): Promise<RagHealthStatus> {
    try {
      const patterns = await ragService.retrieve(taskTypeId, { stage: 'genesis' });
      if (!patterns.isSuccess) {
        return {
          healthy: false,
          patternsCount: 0,
          message: patterns.errorMessage ?? 'RAG retrieval failed',
        };
      }
      if (!patterns.data || patterns.data.length === 0) {
        return {
          healthy: false,
          patternsCount: 0,
          message:
            `No RAG patterns seeded for task type ${taskTypeId}. ` +
            `Genesis prompt will lack architectural context.`,
        };
      }
      return { healthy: true, patternsCount: patterns.data.length };
    } catch (err) {
      return {
        healthy: false,
        patternsCount: 0,
        message: `RAG service unavailable: ${(err as Error).message}`,
      };
    }
  }

  async getRagEmptyPolicy(): Promise<'degrade' | 'halt'> {
    const config = await this.freedomConfig.get('ragEmptyPolicy');
    const policy = (config?.['value'] as string) ?? 'degrade';
    return policy === 'halt' ? 'halt' : 'degrade';
  }

  buildDpoTripleFlags(ragHealth: RagHealthStatus): {
    ragPatternsUsed: number;
    ragHealthy: boolean;
    qualityFlags: string[];
  } {
    return {
      ragPatternsUsed: ragHealth.patternsCount,
      ragHealthy: ragHealth.healthy,
      qualityFlags: ragHealth.healthy ? [] : ['DEGRADED'],
    };
  }
}
