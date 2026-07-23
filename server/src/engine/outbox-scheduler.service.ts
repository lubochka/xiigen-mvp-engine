// OutboxSchedulerService — runs the outbox relay on a cron schedule.
// Fires every 30 seconds (every-30s cron) to relay PENDING outbox messages
// to the queue fabric.
// Requires ScheduleModule.forRoot() in AppModule.
// DNA-3: all results are logged but never throw.
// S22: Scheduled outbox relay.

import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { OutboxRelayService } from './outbox-relay.service';

@Injectable()
export class OutboxSchedulerService {
  private readonly logger = new Logger(OutboxSchedulerService.name);

  constructor(private readonly relay: OutboxRelayService) {}

  /**
   * Relay PENDING outbox messages every 30 seconds.
   * DNA-3: errors are logged but never thrown.
   */
  @Cron('*/30 * * * * *')
  async relayOutbox(): Promise<void> {
    const result = await this.relay.relayPendingMessages();
    if (!result.isSuccess) {
      this.logger.warn(`Outbox relay failed: ${result.errorCode} — ${result.errorMessage}`);
      return;
    }
    const { processed, published, failed } = result.data ?? {};
    if ((processed ?? 0) > 0) {
      this.logger.log(
        `Outbox relay: processed=${processed} published=${published} failed=${failed}`,
      );
    }
  }
}
