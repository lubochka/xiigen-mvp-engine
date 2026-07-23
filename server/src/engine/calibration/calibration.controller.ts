/**
 * CalibrationController — POST /api/calibration/run
 *
 * Triggers the universal improvement loop for a flow.
 * Returns calibration result with records stored, depths reached, regressions.
 *
 * DNA-3: all errors return structured responses, never throw.
 */

import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { CalibrationRunner, CalibrationInput } from './calibration-runner.service';
import { DataProcessResult } from '../../kernel/data-process-result';

@Controller('calibration')
export class CalibrationController {
  constructor(private readonly runner: CalibrationRunner) {}

  @Post('run')
  @HttpCode(HttpStatus.OK)
  async run(@Body() body: CalibrationInput): Promise<Record<string, unknown>> {
    if (!body?.flowId || !body?.userIntent || !body?.phase) {
      return DataProcessResult.failure(
        'INVALID_INPUT',
        'flowId, userIntent, and phase are required',
      ) as unknown as Record<string, unknown>;
    }
    const result = await this.runner.runForFlow(body);
    if (!result.isSuccess) {
      return { error: result.errorCode, message: result.errorMessage };
    }
    return result.data as unknown as Record<string, unknown>;
  }
}
