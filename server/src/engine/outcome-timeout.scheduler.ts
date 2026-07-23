/**
 * OutcomeTimeoutScheduler — registers a BullMQ hourly job to auto-validate
 * stale OUTCOME_PENDING planning decision triples.
 *
 * B-6 Fix: Without this, a single Phase F worker outage permanently blocks
 * the graduation counter and FLOW-34 pattern transfer. After 48h (FREEDOM
 * config: OUTCOME_PENDING_TIMEOUT_HOURS), stale triples are auto-validated
 * with countsTowardThreshold=false.
 *
 * DNA-3: never throws — all errors logged, non-fatal
 * DNA-9: uses enqueue (CloudEvent-compatible) for the hourly check trigger
 */

import { Injectable, OnModuleInit, Inject, Logger } from '@nestjs/common';
import { IQueueService, QUEUE_SERVICE } from '../fabrics/interfaces/queue.interface';
import { DataProcessResult } from '../kernel/data-process-result';

@Injectable()
export class OutcomeTimeoutScheduler implements OnModuleInit {
  private readonly logger = new Logger(OutcomeTimeoutScheduler.name);
  private readonly JOB_ID = 'outcome-timeout-check';

  constructor(@Inject(QUEUE_SERVICE) private readonly queue: IQueueService) {}

  async onModuleInit(): Promise<void> {
    try {
      await this.registerTimeoutJob();
      this.logger.log('OutcomeTimeoutScheduler: hourly check job enqueued');
    } catch (err) {
      this.logger.error('OutcomeTimeoutScheduler: failed to register job', err);
    }
  }

  private async registerTimeoutJob(): Promise<DataProcessResult<string>> {
    return this.queue.enqueue('outcome-timeout', {
      specversion: '1.0',
      id: this.JOB_ID,
      type: 'com.xiigen.engine.outcomeTimeoutCheck',
      source: '/engine/outcome-timeout-scheduler',
      time: new Date().toISOString(),
      datacontenttype: 'application/json',
      data: {
        type: 'OUTCOME_TIMEOUT_CHECK',
        scheduledAt: new Date().toISOString(),
      },
    });
  }
}
