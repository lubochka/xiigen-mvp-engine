/**
 * AgentController — FLOW-46 Phase B
 *
 * POST /api/agent/run             — entry for the platform agent (T650)
 * GET  /api/agent/sessions/:id    — fetch a completed session summary
 * GET  /api/agent/sessions        — list recent sessions (admin panel)
 *
 * Caller is expected to be in MASTER_TENANT_ID CLS context (super-admin
 * route). T650 enforces the guard internally.
 */

import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { AgentRunOrchestrator, AgentRunInput } from '../engine/flows/platform-agent/agent-run-orchestrator.service';
import {
  IDatabaseService,
  DATABASE_SERVICE,
} from '../fabrics/interfaces/database.interface';

interface AgentRunBody {
  userIntent: string;
  sessionId?: string;
  proposedActions?: AgentRunInput['proposedActions'];
  contributions?: AgentRunInput['contributions'];
  af4Context?: AgentRunInput['af4Context'];
  af9Verdict?: AgentRunInput['af9Verdict'];
  af9Reason?: string;
  candidate?: Record<string, unknown>;
}

@Controller('api/agent')
export class AgentController {
  constructor(
    private readonly orchestrator: AgentRunOrchestrator,
    @Inject(DATABASE_SERVICE) private readonly db: IDatabaseService,
  ) {}

  @Post('run')
  @HttpCode(HttpStatus.OK)
  async run(@Body() body: AgentRunBody) {
    if (!body || !body.userIntent || typeof body.userIntent !== 'string') {
      return { error: 'userIntent is required', code: 'MISSING_INTENT' };
    }
    const sessionId = body.sessionId ?? `agent-${randomUUID()}`;
    const result = await this.orchestrator.run({
      sessionId,
      userIntent: body.userIntent.trim(),
      proposedActions: body.proposedActions,
      contributions: body.contributions,
      af4Context: body.af4Context,
      af9Verdict: body.af9Verdict,
      af9Reason: body.af9Reason,
      candidate: body.candidate,
    });
    if (!result.isSuccess) {
      return { error: result.errorMessage, code: result.errorCode };
    }
    return result.data;
  }

  @Get('sessions/:sessionId')
  async getSession(@Param('sessionId') sessionId: string) {
    const result = await this.db.getDocument('xiigen-agent-sessions', sessionId);
    if (!result.isSuccess) {
      return { error: result.errorMessage, code: result.errorCode };
    }
    return result.data;
  }

  @Get('sessions')
  async listSessions(@Query('limit') limit?: string) {
    const max = Math.min(Math.max(parseInt(limit ?? '20', 10) || 20, 1), 100);
    const result = await this.db.searchDocuments('xiigen-agent-sessions', {}, max);
    if (!result.isSuccess) {
      return { error: result.errorMessage, code: result.errorCode };
    }
    return { sessions: result.data ?? [] };
  }
}
