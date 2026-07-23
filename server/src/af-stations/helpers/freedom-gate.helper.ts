/**
 * FREEDOM_GATED skip-not-fail helper (GAP-M6).
 *
 * First occurrence of SKIP outcome in the XIIGen engine.
 * When a FREEDOM config key is missing or disabled, returns a SKIP outcome
 * (DataProcessResult.success({ skipped: true })) — not a failure.
 *
 * Used by T372 (DomainPackDeliveryGate) and T374 (AdvancedProgressTracker).
 *
 * DNA-3: returns DataProcessResult — never throws.
 * Rule 14: if a business user might want to change it → FREEDOM config.
 */
import { DataProcessResult } from '../../kernel/data-process-result';
import type { IFreedomConfigService } from '../../freedom/freedom-config.interface';

export interface FreedomGateResult {
  skipped: boolean;
  skipReason?: string;
  skipDetail?: string;
}

/**
 * Checks a FREEDOM config key.
 * If the key is missing or disabled → returns a SKIP outcome (skipped: true).
 * If the key has a valid enabled value → returns success with skipped: false.
 *
 * SKIP outcome recognized by resolveStepStatus() in decompose-handler-types.ts.
 */
export async function checkFreedomGate(
  configKey: string,
  freedomConfig: IFreedomConfigService,
): Promise<DataProcessResult<FreedomGateResult>> {
  const value = await freedomConfig.get(configKey);

  if (!value) {
    // Key not found — feature not configured. SKIP (not FAIL).
    return DataProcessResult.success<FreedomGateResult>({
      skipped: true,
      skipReason: 'FREEDOM_GATED',
      skipDetail: `FREEDOM config key '${configKey}' not found. Feature not configured.`,
    });
  }

  // Check if explicitly disabled
  const strValue = String(Object.values(value)[0] ?? '');
  if (strValue === 'disabled' || strValue === 'false' || strValue === '0') {
    return DataProcessResult.success<FreedomGateResult>({
      skipped: true,
      skipReason: 'FREEDOM_GATED',
      skipDetail: `FREEDOM config key '${configKey}' is disabled.`,
    });
  }

  // Key has a valid, enabled value.
  return DataProcessResult.success<FreedomGateResult>({
    skipped: false,
  });
}
