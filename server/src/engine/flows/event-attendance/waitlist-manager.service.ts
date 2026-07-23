/**
 * WaitlistManager (T64) — FLOW-04 Phase 2B
 * Single responsibility: promote the next FIFO-ordered waitlisted attendee when a slot opens.
 *
 * Iron rules:
 *   IR-64-1: FIFO ordering — promotion candidate selected by earliest join_timestamp.
 *            A later-arriving attendee MUST NOT be promoted ahead of an earlier one.
 *   IR-64-2: No-waitlist case is DataProcessResult.success({ promoted: false }) — not failure.
 *            An empty waitlist is a valid business state.
 *   IR-64-3: Promotion delegated to T63 RSVPOrchestrator.rsvp({ promotionRequest: true }).
 *            WaitlistManager MUST NOT write RSVP records directly — T63 owns RSVP writes.
 *   IR-64-4: WaitlistPromotionCompleted emitted ONLY after T63 succeeds (DNA-8: store before emit).
 *            If T63 fails → no emit → return DataProcessResult.failure.
 *   DNA-3:   All methods return DataProcessResult<T> — never throw.
 */

import { Injectable, Inject } from '@nestjs/common';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { MicroserviceBase, ServiceDescriptor } from '../../../kernel/microservice-base';
import { IDatabaseService, DATABASE_SERVICE } from '../../../fabrics/interfaces/database.interface';
import { IQueueService, QUEUE_SERVICE } from '../../../fabrics/interfaces/queue.interface';
import { RsvpOrchestrator } from './rsvp-orchestrator.service';

const RSVPS_INDEX = 'xiigen-event-rsvps';

export interface PromoteNextInput {
  eventId: string;
  tenantId: string;
}

export interface PromoteNextResult {
  promoted: boolean;
  rsvpId?: string;
  attendeeId?: string;
}

/**
 * @connectionType FLOW_SCOPED
 * @flowId FLOW-04
 * @portability MOBILE - no ClsService, FREEDOM keys flow-scoped
 * @className WaitlistManager
 */
@Injectable()
export class WaitlistManager extends MicroserviceBase {
  constructor(
    @Inject(DATABASE_SERVICE) private readonly dbFabric: IDatabaseService,
    @Inject(QUEUE_SERVICE) private readonly queueFabric: IQueueService,
    private readonly rsvpOrchestrator: RsvpOrchestrator,
  ) {
    super({
      descriptor: new ServiceDescriptor({
        serviceId: 'T64',
        serviceName: 'WaitlistManager',
        flowId: 'FLOW-04',
      }),
    });
  }

  async promoteNext(input: PromoteNextInput): Promise<DataProcessResult<PromoteNextResult>> {
    try {
      // Find all WAITLISTED RSVPs for this event
      const waitlistResult = await this.dbFabric.searchDocuments(RSVPS_INDEX, {
        event_id: input.eventId,
        status: 'WAITLISTED',
      });

      if (!waitlistResult.isSuccess || (waitlistResult.data ?? []).length === 0) {
        // IR-64-2: empty waitlist = valid business state, not an error
        return DataProcessResult.success({ promoted: false });
      }

      // IR-64-1: FIFO — sort ascending by join_timestamp, take the earliest
      const sorted = [...(waitlistResult.data as Record<string, unknown>[])].sort((a, b) => {
        const ta = new Date(a['join_timestamp'] as string).getTime();
        const tb = new Date(b['join_timestamp'] as string).getTime();
        return ta - tb;
      });

      const next = sorted[0];
      const attendeeId = next['attendee_id'] as string;

      // IR-64-3: delegate to T63 RSVPOrchestrator — T63 owns all RSVP writes
      const promotionResult = await this.rsvpOrchestrator.rsvp({
        attendeeId,
        eventId: input.eventId,
        tenantId: input.tenantId,
        promotionRequest: true,
      });

      if (!promotionResult.isSuccess) {
        return DataProcessResult.failure(promotionResult.errorCode!, promotionResult.errorMessage!);
      }

      // IR-64-4 / DNA-8: T63 already stored the RSVP record — emit AFTER store succeeds
      await this.queueFabric.enqueue('WaitlistPromotionCompleted', {
        rsvpId: promotionResult.data!.rsvpId,
        attendeeId,
        eventId: input.eventId,
        tenantId: input.tenantId,
      });

      return DataProcessResult.success({
        promoted: true,
        rsvpId: promotionResult.data!.rsvpId,
        attendeeId,
      });
    } catch (err) {
      return DataProcessResult.failure('WAITLIST_ERROR', `WaitlistManager threw: ${String(err)}`);
    }
  }
}
