/**
 * CurriculumProgressTracker (T600) — FLOW-39 Phase A
 *
 * Tracks learning progress per OSS model per station. Detects grade plateaus
 * and emits pre-seeding recommendations — NEVER triggers automatic action (IRON-PLATEAU).
 *
 * Iron rules:
 *   IRON-PLATEAU: Grade plateau (STATIC for 3+ cycles) triggers a pre-seeding
 *                 recommendation ONLY — no automatic action, no model swap.
 *   IRON-3-SIGNAL: Progress check reads exactly the 3 canonical signals.
 *   DNA-3: DataProcessResult.success(recommendation) returned on plateau — no throw.
 *   DNA-7: Idempotency key per (dpoTripleId + ossModel + cycleId).
 *   DNA-8: storeDocument(progress-check-record) BEFORE enqueue(ProgressChecked).
 */

import { Injectable, Inject, Logger } from '@nestjs/common';
import { IDatabaseService, DATABASE_SERVICE } from '../../../fabrics/interfaces/database.interface';
import { IQueueService, QUEUE_SERVICE } from '../../../fabrics/interfaces/queue.interface';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { MicroserviceBase, ServiceDescriptor } from '../../../kernel/microservice-base';

const PROGRESS_INDEX = 'xiigen-curriculum-progress';
const SIGNALS_INDEX = 'xiigen-learning-signals';

/** MACHINE: plateau threshold — 3 consecutive STATIC cycles. */
const PLATEAU_WINDOW = 3;
/** MACHINE: minimum cycles before progress check — deferred before this. */
const DEFAULT_MIN_CYCLES = 3;

export interface TrackProgressOptions {
  dpoTripleId: string;
  ossModel: string;
  station: string;
  cycleId: string;
  minCycles?: number;
}

export interface TrackProgressResult {
  progressStatus: 'ACTIVE' | 'DEFERRED' | 'PLATEAU_DETECTED' | 'IMPROVING';
  recommendation: string | null;
}

/**
 * @connectionType FLOW_SCOPED
 * @flowId FLOW-39
 * @portability MOBILE - no direct tenant context, fabric-only progress tracking
 * @className CurriculumProgressTracker
 */
@Injectable()
export class CurriculumProgressTracker extends MicroserviceBase {
  private readonly logger = new Logger(CurriculumProgressTracker.name);

  constructor(
    @Inject(DATABASE_SERVICE) private readonly dbFabric: IDatabaseService,
    @Inject(QUEUE_SERVICE) private readonly queueFabric: IQueueService,
  ) {
    super({
      descriptor: new ServiceDescriptor({
        serviceId: 'T600',
        serviceName: 'CurriculumProgressTracker',
        flowId: 'FLOW-39',
      }),
    });
  }

  async track(options: TrackProgressOptions): Promise<DataProcessResult<TrackProgressResult>> {
    try {
      const { dpoTripleId, ossModel, station, cycleId, minCycles } = options;

      if (!dpoTripleId || !ossModel || !station || !cycleId) {
        return DataProcessResult.failure(
          'MISSING_REQUIRED_FIELDS',
          'dpoTripleId, ossModel, station, and cycleId are all required',
        );
      }

      // DNA-7: idempotency check before any write
      const idempotencyKey = `progress-${dpoTripleId}-${ossModel}-${cycleId}`;
      const existingCheck = await this.dbFabric.searchDocuments(PROGRESS_INDEX, { idempotencyKey }, 1);
      if (existingCheck.isSuccess && (existingCheck.data ?? []).length > 0) {
        const existing = existingCheck.data![0] as Record<string, unknown>;
        this.logger.log(
          `CurriculumProgressTracker: already tracked ${idempotencyKey} — returning existing`,
        );
        return DataProcessResult.success(existing['trackResult'] as TrackProgressResult);
      }

      // Read signal history for this ossModel + station
      const signalsCheck = await this.dbFabric.searchDocuments(SIGNALS_INDEX, { ossModel }, 20);
      const signals = signalsCheck.isSuccess
        ? ((signalsCheck.data ?? []) as Array<Record<string, unknown>>)
        : [];

      const effectiveMinCycles = minCycles ?? DEFAULT_MIN_CYCLES;

      // Minimum cycle count check — deferred before threshold
      if (signals.length < effectiveMinCycles) {
        const trackResult: TrackProgressResult = {
          progressStatus: 'DEFERRED',
          recommendation: null,
        };
        await this.storeAndEmit(
          idempotencyKey,
          dpoTripleId,
          ossModel,
          station,
          cycleId,
          trackResult,
        );
        return DataProcessResult.success(trackResult);
      }

      // IRON-3-SIGNAL: read grade_trend from signals (canonical signal)
      const recentSignals = signals
        .sort((a, b) =>
          String(b['collectedAt'] ?? '').localeCompare(String(a['collectedAt'] ?? '')),
        )
        .slice(0, PLATEAU_WINDOW);

      const allStatic =
        recentSignals.length >= PLATEAU_WINDOW &&
        recentSignals.every((s) => {
          const sig = s['signals'] as Record<string, unknown> | undefined;
          return sig?.['grade_trend'] === 'STATIC';
        });

      // IRON-PLATEAU: recommendation only — no automatic action, no model swap
      let trackResult: TrackProgressResult;
      if (allStatic) {
        trackResult = {
          progressStatus: 'PLATEAU_DETECTED',
          recommendation: 'PRE_SEEDING_RECOMMENDED', // recommendation only, no auto-action
        };
      } else {
        const hasImproving = recentSignals.some((s) => {
          const sig = s['signals'] as Record<string, unknown> | undefined;
          return sig?.['grade_trend'] === 'IMPROVING';
        });
        trackResult = {
          progressStatus: hasImproving ? 'IMPROVING' : 'ACTIVE',
          recommendation: null,
        };
      }

      await this.storeAndEmit(idempotencyKey, dpoTripleId, ossModel, station, cycleId, trackResult);
      this.logger.log(
        `CurriculumProgressTracker: dpoTriple=${dpoTripleId} ossModel=${ossModel} status=${trackResult.progressStatus}`,
      );
      return DataProcessResult.success(trackResult);
    } catch (err) {
      return DataProcessResult.failure(
        'PROGRESS_TRACKER_ERROR',
        `CurriculumProgressTracker threw: ${String(err)}`,
      );
    }
  }

  private async storeAndEmit(
    idempotencyKey: string,
    dpoTripleId: string,
    ossModel: string,
    station: string,
    cycleId: string,
    trackResult: TrackProgressResult,
  ): Promise<void> {
    const progressRecord: Record<string, unknown> = {
      idempotencyKey,
      dpoTripleId,
      ossModel,
      station,
      cycleId,
      trackResult,
      checkedAt: new Date().toISOString(),
    };

    // DNA-8: storeDocument BEFORE enqueue
    await this.dbFabric.storeDocument(PROGRESS_INDEX, progressRecord, idempotencyKey);
    await this.queueFabric.enqueue('ProgressChecked', {
      dpoTripleId,
      ossModel,
      station,
      cycleId,
      progressStatus: trackResult.progressStatus,
      recommendation: trackResult.recommendation,
    });
  }
}
