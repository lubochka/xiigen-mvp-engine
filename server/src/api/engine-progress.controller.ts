import { Controller, Get, Query } from '@nestjs/common';
import { EngineProgressService } from '../engine/engine-progress.service';

@Controller('api/engine')
export class EngineProgressController {
  constructor(private readonly engineProgressService: EngineProgressService) {}

  @Get('progress')
  async getProgress(@Query('flowId') flowId?: string) {
    return this.engineProgressService.getReport(flowId);
  }
}
