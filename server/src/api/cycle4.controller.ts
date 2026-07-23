/**
 * Cycle4Controller — GAP-V-03 fix.
 *
 * Exposes CYCLE-4 PENDING_IMPLEMENTATION records that ConvergenceHandler stores
 * in xiigen-training-data after TeachingRoundService completes.
 * Claude Code reads these records to discover which NODEs need implementation.
 *
 * GET  /api/cycle-4/pending?flowId=FLOW-01[&depth=0][&status=PENDING_IMPLEMENTATION]
 *   Returns: CYCLE-4 records from xiigen-training-data matching the filters.
 *
 * PATCH /api/cycle-4/:id
 *   Body: { status, grade, implementationSummary }
 *   Updates a record after Claude Code completes implementation.
 *
 * DNA-3: never throws — returns { error, code } on failure.
 * DNA-5: tenantId not accepted as a body parameter — reads from x-tenant-id header only.
 */

import {
  Controller,
  Get,
  Patch,
  Param,
  Query,
  Body,
  HttpCode,
  HttpStatus,
  Inject,
  Headers,
} from '@nestjs/common';
import { IDatabaseService, DATABASE_SERVICE } from '../fabrics/interfaces/database.interface';

const TRAINING_DATA_INDEX = 'xiigen-training-data';

interface Cycle4PatchBody {
  status: string;
  grade?: number;
  implementationSummary?: string;
}

@Controller('api/cycle-4')
export class Cycle4Controller {
  constructor(@Inject(DATABASE_SERVICE) private readonly db: IDatabaseService) {}

  /**
   * Returns PENDING_IMPLEMENTATION (or custom status) CYCLE-4 records.
   * Filters by flowId (required), optional depth, optional status.
   */
  @Get('pending')
  @HttpCode(HttpStatus.OK)
  async getPending(
    @Query('flowId') flowId: string,
    @Query('depth') depth?: string,
    @Query('status') status?: string,
    @Headers('x-tenant-id') _tenantHeader?: string,
  ) {
    if (!flowId || typeof flowId !== 'string' || !flowId.trim()) {
      return { error: 'flowId query parameter is required', code: 'MISSING_FLOW_ID' };
    }

    const filter: Record<string, unknown> = {
      station: 'CYCLE-4',
      flowId: flowId.trim(),
      status: status ?? 'PENDING_IMPLEMENTATION',
    };

    if (depth !== undefined) {
      const depthNum = parseInt(depth, 10);
      if (!isNaN(depthNum)) {
        filter['depth'] = depthNum;
      }
    }

    const result = await this.db.searchDocuments(TRAINING_DATA_INDEX, filter);

    if (!result.isSuccess) {
      return { error: result.errorMessage, code: result.errorCode ?? 'QUERY_FAILED' };
    }

    const records = result.data as Record<string, unknown>[];
    return {
      flowId: flowId.trim(),
      count: records.length,
      records,
    };
  }

  /**
   * Updates a CYCLE-4 record after Claude Code implements the NODE.
   * Typical body: { status: 'COMPLETE', grade: 0.92, implementationSummary: '...' }
   */
  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  async patch(
    @Param('id') id: string,
    @Body() body: Cycle4PatchBody,
    @Headers('x-tenant-id') _tenantHeader?: string,
  ) {
    if (!id || typeof id !== 'string' || !id.trim()) {
      return { error: 'id param is required', code: 'MISSING_ID' };
    }
    if (!body.status || typeof body.status !== 'string') {
      return { error: 'status is required in body', code: 'MISSING_STATUS' };
    }

    const existing = await this.db.getDocument(TRAINING_DATA_INDEX, id.trim());
    if (!existing.isSuccess) {
      return { error: `Record ${id} not found`, code: 'NOT_FOUND' };
    }

    const current = existing.data as Record<string, unknown>;
    const updated: Record<string, unknown> = {
      ...current,
      status: body.status,
      updatedAt: new Date().toISOString(),
    };
    if (typeof body.grade === 'number') updated['grade'] = body.grade;
    if (typeof body.implementationSummary === 'string') {
      updated['implementationSummary'] = body.implementationSummary;
    }

    const storeResult = await this.db.storeDocument(TRAINING_DATA_INDEX, updated, id.trim());
    if (!storeResult.isSuccess) {
      return { error: storeResult.errorMessage, code: storeResult.errorCode ?? 'STORE_FAILED' };
    }

    return { id: id.trim(), status: body.status, updated: true };
  }
}
