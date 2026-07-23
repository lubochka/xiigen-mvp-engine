/**
 * StackCompatibilityReporter (T592) — FLOW-37 Phase D
 *
 * Validates whether a generated service is compatible with its target stack.
 * CF-799: INCOMPATIBLE check is SYNCHRONOUS and FIRST in executor body — before any AF-1 submission.
 *
 * Iron rules:
 *   CF-799: INCOMPATIBLE classification fires synchronously BEFORE AF-1 submission — MACHINE constraint.
 *   DNA-8: storeDocument(CompatibilityReport) BEFORE enqueue(IncompatibleStackDetected | CompatibilityReportReady).
 *   DNA-9: CloudEvents envelope on all emitted events.
 *   DNA-3: returns DataProcessResult<T>, never throws.
 */

import { Injectable, Inject, Logger } from '@nestjs/common';
import { IDatabaseService, DATABASE_SERVICE } from '../../../fabrics/interfaces/database.interface';
import { IQueueService, QUEUE_SERVICE } from '../../../fabrics/interfaces/queue.interface';
import { DataProcessResult } from '../../../kernel/data-process-result';
import type { CouplingClassification } from './stack-coupling-auditor.service';

const REPORTS_INDEX = 'xiigen-compatibility-reports';

export type CompatibilityStatus = 'COMPATIBLE' | 'INCOMPATIBLE' | 'DEGRADED';

export interface ReportOptions {
  taskTypeId: string;
  stackId: string;
  couplingClassifications: CouplingClassification[];
  generatedServiceRef?: Record<string, unknown>;
}

export interface ReportResult {
  taskTypeId: string;
  stackId: string;
  compatibility: CompatibilityStatus;
  incompatibleDimensions?: string[];
  reportId: string;
}

@Injectable()
export class StackCompatibilityReporter {
  private readonly logger = new Logger(StackCompatibilityReporter.name);

  constructor(
    @Inject(DATABASE_SERVICE) private readonly db: IDatabaseService,
    @Inject(QUEUE_SERVICE) private readonly queue: IQueueService,
  ) {}

  async report(options: ReportOptions): Promise<DataProcessResult<ReportResult>> {
    try {
      const { taskTypeId, stackId, couplingClassifications } = options;

      if (!taskTypeId || !stackId) {
        return DataProcessResult.failure(
          'MISSING_REQUIRED_FIELDS',
          'taskTypeId and stackId are required',
        );
      }

      // CF-799: INCOMPATIBLE check is SYNCHRONOUS and FIRST — MACHINE constraint
      // This must be the first operation — no deferred or async check
      const stackClassification = couplingClassifications.find((c) => c.stackId === stackId);

      if (!stackClassification) {
        return DataProcessResult.failure(
          'STACK_NOT_IN_AUDIT',
          `Stack ${stackId} was not found in coupling audit for taskType ${taskTypeId} — run T590 first (CF-800)`,
        );
      }

      // CF-799: INCOMPATIBLE blocks — synchronous, first in body
      const incompatibleDimensions = stackClassification
        ? Object.entries(stackClassification.dimensions)
            .filter(([, cat]) => cat === 'INCOMPATIBLE')
            .map(([dim]) => dim)
        : [];

      let compatibility: CompatibilityStatus;
      if (stackClassification.category === 'INCOMPATIBLE') {
        compatibility = 'INCOMPATIBLE';
      } else if (
        incompatibleDimensions.length > 0 ||
        stackClassification.category === 'STACK_COUPLED'
      ) {
        compatibility = 'DEGRADED';
      } else {
        compatibility = 'COMPATIBLE';
      }

      const reportId = `REPORT-${taskTypeId}-${stackId}-${Date.now()}`;
      const reportResult: ReportResult = {
        taskTypeId,
        stackId,
        compatibility,
        incompatibleDimensions:
          incompatibleDimensions.length > 0 ? incompatibleDimensions : undefined,
        reportId,
      };

      const reportRecord: Record<string, unknown> = {
        ...reportResult,
        createdAt: new Date().toISOString(),
      };

      // DNA-8: storeDocument BEFORE enqueue
      const storeResult = await this.db.storeDocument(REPORTS_INDEX, reportRecord, reportId);
      if (!storeResult.isSuccess) {
        return DataProcessResult.failure(
          'REPORT_STORE_FAILED',
          `Failed to store compatibility report for ${taskTypeId}/${stackId}: ${storeResult.errorMessage ?? 'unknown'}`,
        );
      }

      // Emit appropriate event based on compatibility
      if (compatibility === 'INCOMPATIBLE') {
        // CF-799: emit IncompatibleStackDetected BEFORE any AF-1 submission
        await this.queue.enqueue('IncompatibleStackDetected', {
          taskTypeId,
          stackId,
          reportId,
          incompatibleDimensions,
        });
      } else {
        await this.queue.enqueue('CompatibilityReportReady', {
          taskTypeId,
          stackId,
          reportId,
          compatibility,
        });
      }

      this.logger.log(
        `StackCompatibilityReporter: taskType=${taskTypeId} stack=${stackId} compatibility=${compatibility}`,
      );
      return DataProcessResult.success(reportResult);
    } catch (err) {
      return DataProcessResult.failure(
        'REPORTER_ERROR',
        `StackCompatibilityReporter threw: ${String(err)}`,
      );
    }
  }
}
