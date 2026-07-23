// server/src/engine/boundaries/boundary-resolver.handler.ts
// Resolves next artifact boundary IDs with OCC retry loop.
// Prevents duplicate artifact IDs under concurrent generation sessions.
//
// DNA-3: returns DataProcessResult, never throws
// Rule 1: uses fabric interface IDatabaseService with OCC

import { Injectable, Inject, Logger } from '@nestjs/common';
import { IDatabaseService, DATABASE_SERVICE } from '../../fabrics/interfaces/database.interface';
import { DataProcessResult } from '../../kernel/data-process-result';
import { ES_INDEX } from '../../kernel/es-index-constants';

const MAX_RETRIES = 3;
const RETRY_BACKOFF_MS = [50, 100, 150]; // exponential: 50ms, 100ms, 150ms

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function range(start: number, end: number): number[] {
  const result: number[] = [];
  for (let i = start; i < end; i++) result.push(i);
  return result;
}

export interface AllocatedBoundaries {
  factories: number[];
  taskTypes: number[];
  cfRules: number[];
}

@Injectable()
export class BoundaryResolverHandler {
  private readonly logger = new Logger(BoundaryResolverHandler.name);

  constructor(@Inject(DATABASE_SERVICE) private readonly db: IDatabaseService) {}

  async resolveNextBoundaries(count: {
    factories?: number;
    taskTypes?: number;
    cfRules?: number;
  }): Promise<DataProcessResult<AllocatedBoundaries>> {
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      // Read with version
      const readResult = await this.db.getDocumentWithVersion(
        ES_INDEX.ARTIFACT_BOUNDARIES,
        'current',
      );
      if (!readResult.isSuccess) {
        return DataProcessResult.failure(readResult.errorCode!, readResult.errorMessage!);
      }

      const { doc, seqNo, primaryTerm } = readResult.data!;

      // Compute new boundary values
      const allocated = this.allocateRange(doc, count);

      // Write with OCC
      const writeResult = await this.db.storeDocumentWithOCC(
        ES_INDEX.ARTIFACT_BOUNDARIES,
        { ...doc, ...allocated.updatedBoundaries },
        'current',
        { ifSeqNo: seqNo, ifPrimaryTerm: primaryTerm },
      );

      if (writeResult.isSuccess) {
        this.logger.debug(
          `Boundary resolved on attempt ${attempt + 1}: ${JSON.stringify(allocated.result)}`,
        );
        return DataProcessResult.success(allocated.result);
      }

      if (writeResult.errorCode === 'OCC_CONFLICT') {
        // Another writer won — wait and retry with fresh read
        if (attempt < MAX_RETRIES - 1) {
          await delay(RETRY_BACKOFF_MS[attempt]);
          continue;
        }
      } else {
        // Non-conflict error — do not retry
        return DataProcessResult.failure(writeResult.errorCode!, writeResult.errorMessage!);
      }
    }

    return DataProcessResult.failure(
      'BOUNDARY_CONFLICT',
      `Could not acquire unique artifact boundaries after ${MAX_RETRIES} attempts. ` +
        `High concurrency detected. Please retry in 5 seconds.`,
    );
  }

  private allocateRange(
    currentBoundaries: Record<string, unknown>,
    count: { factories?: number; taskTypes?: number; cfRules?: number },
  ): { result: AllocatedBoundaries; updatedBoundaries: Record<string, unknown> } {
    const nextFactory = currentBoundaries['nextFactory'] as number;
    const nextTaskType = currentBoundaries['nextTaskType'] as number;
    const nextCFRule = currentBoundaries['nextCFRule'] as number;
    return {
      result: {
        factories: range(nextFactory, nextFactory + (count.factories ?? 0)),
        taskTypes: range(nextTaskType, nextTaskType + (count.taskTypes ?? 0)),
        cfRules: range(nextCFRule, nextCFRule + (count.cfRules ?? 0)),
      },
      updatedBoundaries: {
        nextFactory: nextFactory + (count.factories ?? 0),
        nextTaskType: nextTaskType + (count.taskTypes ?? 0),
        nextCFRule: nextCFRule + (count.cfRules ?? 0),
      },
    };
  }
}
