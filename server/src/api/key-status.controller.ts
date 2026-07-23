/**
 * KeyStatusController — Returns provider key presence for a tenant.
 *
 * GET /api/tenant/:id/key-status
 *
 * DNA-3: never throws — returns gracefully degraded response on byokStore failure.
 * SECURITY: never returns key values — only 'configured' | 'missing' per provider.
 */

import { Controller, Get, Param, HttpCode, HttpStatus } from '@nestjs/common';
import { ByokKeyStoreService } from '../kernel/multi-tenant/byok-key-store.service';

@Controller('api/tenant')
export class KeyStatusController {
  constructor(private readonly byokStore: ByokKeyStoreService) {}

  @Get(':id/key-status')
  @HttpCode(HttpStatus.OK)
  async getKeyStatus(@Param('id') tenantId: string) {
    const keysResult = await this.byokStore.readKeys(tenantId);

    const keys: Record<string, string> =
      keysResult.isSuccess && keysResult.data ? keysResult.data : {};

    const status = {
      anthropic: keys['anthropic'] ? 'configured' : 'missing',
      openai: keys['openai'] ? 'configured' : 'missing',
      gemini: keys['gemini'] ? 'configured' : 'missing',
    } as const;

    const configuredCount = Object.values(status).filter((v) => v === 'configured').length;

    return {
      tenantId,
      providers: status,
      allConfigured: configuredCount === 3,
      configuredCount,
    };
  }
}
