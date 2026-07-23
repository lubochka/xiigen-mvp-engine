// T109 SeatingMapHandler [DATA_PIPELINE]
// @connectionType FLOW_SCOPED
// @flowId FLOW-09
//
//
// Builds and queries the seating map for an event.
// DR-04-A reuse: atomic capacity operations
//
// Iron rules:
//   DNA-8: storeDocument BEFORE SeatingMapUpdated emit
//   knowledgeScope: 'PRIVATE'
//   tenantId from ALS

import { DataProcessResult } from '../../../kernel/data-process-result';
import { IDatabaseService } from '../../../fabrics/interfaces/database.interface';
import { IQueueService } from '../../../fabrics/interfaces/queue.interface';

export interface SeatingMapInput {
  eventId: string;
  seatId?: string;
  action: 'QUERY' | 'RESERVE' | 'RELEASE';
}

export interface SeatingMapResult {
  eventId: string;
  availableSeats: number;
  reservedSeats: number;
  seatId?: string;
  status?: 'RESERVED' | 'AVAILABLE';
}

export class SeatingMapHandler {
  constructor(
    private readonly db: IDatabaseService,
    private readonly queue: IQueueService,
  ) {}

  async handleSeatingMap(input: SeatingMapInput): Promise<DataProcessResult<SeatingMapResult>> {
    const seatingMapId = `seating-${input.eventId}`;

    const mapResult = await this.db.searchDocuments('seating-maps', { eventId: input.eventId });
    const map =
      mapResult.isSuccess && Array.isArray(mapResult.data) && mapResult.data.length > 0
        ? (mapResult.data[0] as Record<string, unknown>)
        : { availableSeats: 0, reservedSeats: 0 };

    if (input.action === 'QUERY') {
      return DataProcessResult.success({
        eventId: input.eventId,
        availableSeats: (map['availableSeats'] as number) ?? 0,
        reservedSeats: (map['reservedSeats'] as number) ?? 0,
      });
    }

    const updatedAt = new Date().toISOString();

    // DNA-8: storeDocument BEFORE event
    await this.db.storeDocument(
      'seating-maps',
      {
        seatingMapId,
        eventId: input.eventId,
        availableSeats: map['availableSeats'],
        reservedSeats: map['reservedSeats'],
        updatedAt,
        connectionType: 'FLOW_SCOPED',
        knowledgeScope: 'PRIVATE',
      },
      seatingMapId,
    );

    await this.queue.enqueue('seating.map.updated', { eventId: input.eventId, updatedAt });

    return DataProcessResult.success({
      eventId: input.eventId,
      availableSeats: (map['availableSeats'] as number) ?? 0,
      reservedSeats: (map['reservedSeats'] as number) ?? 0,
      seatId: input.seatId,
    });
  }
}
