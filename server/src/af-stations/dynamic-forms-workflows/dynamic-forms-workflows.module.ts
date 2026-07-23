/**
 * Flow21Module — GAP-21-07
 *
 * CF-401: Verifies FLOW-14 DWH ingestion consumer is registered at module init.
 * Emits ENGINE_WARNING to guardrails dashboard if consumer absent.
 * NON-BLOCKING: form processing continues regardless.
 *
 * Wires all FLOW-21 gate services.
 *
 * DNA-3: onModuleInit does not throw on CF-401 warning — only topology violations (GAP-21-01) throw.
 */

import { Module, Inject, Logger, OnModuleInit } from '@nestjs/common';
import { IQueueService, QUEUE_SERVICE } from '../../fabrics/interfaces/queue.interface';
import { DataProcessResult } from '../../kernel/data-process-result';
import {
  GuardrailsWarningService,
  IGuardrailsWarningService,
  GUARDRAILS_WARNING_SERVICE,
  GuardrailsWarning,
} from '../../guardrails/guardrails-warning.service';
import { T312EntryPersistenceGate } from './t312-entry-persistence-gate';
import { T313PartialEntrySaveGate } from './t313-partial-entry-save-gate';
import { T316WebhookFeedDispatchGate } from './t316-webhook-feed-dispatch-gate';
import { T317PaymentFeedProcessingGate } from './t317-payment-feed-processing-gate';
import { T321RecipeRetryGate } from './t321-recipe-retry-gate';
import { RecipeDlqConsumer } from './recipe-dlq-consumer';
import { PreflightCompletionOrchestrator } from './preflight-completion-orchestrator';

const CF401_ACKNOWLEDGED_KEY = 'FLOW21_CF401_ACKNOWLEDGED';
const DWH_TOPIC = 'form.entry.persisted.dwh';

@Module({
  providers: [
    GuardrailsWarningService,
    {
      provide: GUARDRAILS_WARNING_SERVICE,
      useExisting: GuardrailsWarningService,
    },
    T312EntryPersistenceGate,
    T313PartialEntrySaveGate,
    T316WebhookFeedDispatchGate,
    T317PaymentFeedProcessingGate,
    T321RecipeRetryGate,
    RecipeDlqConsumer,
    PreflightCompletionOrchestrator,
  ],
  exports: [
    T312EntryPersistenceGate,
    T313PartialEntrySaveGate,
    T316WebhookFeedDispatchGate,
    T317PaymentFeedProcessingGate,
    T321RecipeRetryGate,
    RecipeDlqConsumer,
    PreflightCompletionOrchestrator,
    GuardrailsWarningService,
    GUARDRAILS_WARNING_SERVICE,
  ],
})
export class Flow21Module implements OnModuleInit {
  private readonly logger = new Logger(Flow21Module.name);

  constructor(
    @Inject(QUEUE_SERVICE) private readonly queue: IQueueService,
    @Inject(GUARDRAILS_WARNING_SERVICE) private readonly guardrails: IGuardrailsWarningService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.checkCf401DwhRouting();
  }

  /**
   * CF-401: Verify FLOW-14 DWH ingestion consumer is registered.
   * Emits ENGINE_WARNING to guardrails dashboard if consumer absent.
   * NON-BLOCKING: form processing continues regardless (no throw).
   */
  private async checkCf401DwhRouting(): Promise<void> {
    try {
      // Check if CF-401 acknowledged in FREEDOM config (suppress warning if intentional)
      // In production: read from IDatabaseService freedom config index
      // For now: environment variable fallback
      const acknowledged = process.env[CF401_ACKNOWLEDGED_KEY] === 'true';
      if (acknowledged) {
        this.logger.log('CF-401: DWH routing check suppressed (FLOW21_CF401_ACKNOWLEDGED=true)');
        return;
      }

      // IQueueService does not expose hasConsumer() directly in this codebase.
      // CF-401 check relies on FREEDOM config acknowledgement or external health probe.
      // This module emits the warning at startup if the config is not acknowledged.
      const warning: GuardrailsWarning = {
        rule: 'CF-401',
        flowId: 'FLOW-21',
        topic: DWH_TOPIC,
        severity: 'ENGINE_WARNING',
        message: 'CF-401: FLOW-14 DWH consumer registration unverified at FLOW-21 startup',
        impact: 'Form submission data may NOT reach DWH analytics if FLOW-14 is not deployed.',
        action: `Deploy FLOW-14 (DWH Ingestion) or set ${CF401_ACKNOWLEDGED_KEY}=true to suppress this warning.`,
        detectedAt: new Date().toISOString(),
      };

      const result: DataProcessResult<void> = await this.guardrails.warn('CF-401', warning);
      if (result.isSuccess) {
        this.logger.warn('CF-401: ENGINE_WARNING emitted — verify FLOW-14 is deployed');
      }
    } catch (err) {
      // Never block module init for CF-401 warning failures
      this.logger.warn('CF-401: warning check failed (non-blocking)', String(err));
    }
  }
}
