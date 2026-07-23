/**
 * CycleGateService — post-cycle safety gate (P4 / FLOW-35 Phase A).
 *
 * Runs SK-402 (SpendGovernor) and SK-403 (SecurityCircuitBreaker) after
 * each cycle in CycleChainService. If either returns HALT, the chain
 * stops immediately.
 *
 * CF-789: spend_limit_usd read from FREEDOM config per session.
 * CF-790: forbidden patterns checked against every NODE output.
 * DNA-3: never throws — returns DataProcessResult.
 * DNA-8: gate runs BEFORE any downstream dispatch.
 *
 * Both checks run in parallel (CF-791 pattern: no short-circuit).
 */

import { Injectable, Optional, Inject, Logger } from '@nestjs/common';
import { DataProcessResult } from '../kernel/data-process-result';
import { IDatabaseService, DATABASE_SERVICE } from '../fabrics/interfaces/database.interface';
import { IFreedomConfigService, FREEDOM_CONFIG_SERVICE } from '../freedom/freedom-config.interface';

export interface CycleGateInput {
  sessionId: string;
  tenantId: string; // required for spend-events + security-violations scoping
  cycleLabel: string; // e.g. 'CYCLE-1', 'CYCLE-2', 'CYCLE-3'
  accumulatedCostUsd: number;
  nodeOutput: string; // JSON string of NODE output to scan
}

export type CycleGateVerdict = 'CONTINUE' | 'HALT';

export interface CycleGateResult {
  verdict: CycleGateVerdict;
  haltReason?: string;
  spendVerdict: 'CONTINUE' | 'HALT';
  securityVerdict: 'CONTINUE' | 'HALT';
  securityViolations: string[];
}

// Forbidden patterns — same set as SecurityCircuitBreakerService (SK-403)
const FORBIDDEN_PATTERNS = [
  /import\s+\{[^}]*Client[^}]*\}\s+from\s+['"]@elastic\/elasticsearch['"]/,
  /require\(['"]@elastic\/elasticsearch['"]\)/,
  /PRIVATE_KEY\s*[:=]\s*['"][^'"]{10,}['"]/i,
  /password\s*[:=]\s*['"][^'"]{4,}['"]/i,
  /SECRET\s*[:=]\s*['"][^'"]{8,}['"]/i,
  /api[_-]?key\s*[:=]\s*['"][^'"]{8,}['"]/i,
];

const SPEND_LIMIT_KEY = 'metaArbiter.spendLimit';
const DEFAULT_SPEND_LIMIT_USD = 10;
const FORBIDDEN_IMPORTS_KEY = 'forbidden_imports';

@Injectable()
export class CycleGateService {
  private readonly logger = new Logger(CycleGateService.name);

  constructor(
    @Optional() @Inject(DATABASE_SERVICE) private readonly db?: IDatabaseService,
    @Optional()
    @Inject(FREEDOM_CONFIG_SERVICE)
    private readonly freedomConfig?: IFreedomConfigService,
  ) {}

  async check(input: CycleGateInput): Promise<DataProcessResult<CycleGateResult>> {
    try {
      const [spendResult, securityResult] = await Promise.all([
        this.checkSpend(input.sessionId, input.tenantId, input.accumulatedCostUsd),
        this.checkSecurity(input.sessionId, input.tenantId, input.nodeOutput),
      ]);

      const spendVerdict = spendResult.isSuccess ? spendResult.data!.verdict : 'CONTINUE';
      const securityVerdict = securityResult.isSuccess ? securityResult.data!.verdict : 'CONTINUE';
      const securityViolations = securityResult.isSuccess ? securityResult.data!.violations : [];

      let verdict: CycleGateVerdict = 'CONTINUE';
      let haltReason: string | undefined;

      if (spendVerdict === 'HALT') {
        verdict = 'HALT';
        haltReason = spendResult.data?.reason ?? 'Spend limit exceeded';
        this.logger.warn(`CycleGateService [${input.cycleLabel}]: HALT — ${haltReason}`);
      } else if (securityVerdict === 'HALT') {
        verdict = 'HALT';
        haltReason = `Security violation: ${securityViolations[0] ?? 'unknown pattern'}`;
        this.logger.warn(`CycleGateService [${input.cycleLabel}]: HALT — ${haltReason}`);
      }

      // DNA-8: store gate result before returning (non-blocking on failure)
      if (this.db) {
        await this.db
          .storeDocument(
            'xiigen-cycle-visibility',
            {
              sessionId: input.sessionId,
              cycleLabel: input.cycleLabel,
              gateVerdict: verdict,
              spendVerdict,
              securityVerdict,
              securityViolations,
              haltReason,
              checkedAt: new Date().toISOString(),
            },
            `gate::${input.sessionId}::${input.cycleLabel}::${Date.now()}`,
          )
          .catch((err: unknown) => {
            this.logger.warn(`CycleGateService: visibility store failed — ${String(err)}`);
          });
      }

      return DataProcessResult.success({
        verdict,
        haltReason,
        spendVerdict,
        securityVerdict,
        securityViolations,
      });
    } catch (err) {
      // DNA-3: never throws — gate failure treated as CONTINUE to avoid blocking the chain
      this.logger.warn(
        `CycleGateService: gate check threw — ${String(err)} — defaulting to CONTINUE`,
      );
      return DataProcessResult.success({
        verdict: 'CONTINUE',
        spendVerdict: 'CONTINUE',
        securityVerdict: 'CONTINUE',
        securityViolations: [],
      });
    }
  }

  // ── private ────────────────────────────────────────────────────────────────

  private async checkSpend(
    sessionId: string,
    tenantId: string,
    accumulatedCostUsd: number,
  ): Promise<DataProcessResult<{ verdict: 'CONTINUE' | 'HALT'; reason?: string }>> {
    try {
      const limitRaw = await this.freedomConfig?.get(SPEND_LIMIT_KEY);
      const limit = typeof limitRaw === 'number' ? limitRaw : DEFAULT_SPEND_LIMIT_USD;

      if (accumulatedCostUsd >= limit) {
        if (this.db) {
          await this.db
            .storeDocument('spend-events', {
              sessionId,
              tenantId,
              event: 'spend.limit.exceeded',
              accumulatedCostUsd,
              limitUsd: limit,
              at: new Date().toISOString(),
            })
            .catch(() => {
              /* non-blocking */
            });
        }
        return DataProcessResult.success({
          verdict: 'HALT',
          reason: `Spend limit $${limit} exceeded (accumulated: $${accumulatedCostUsd})`,
        });
      }
      return DataProcessResult.success({ verdict: 'CONTINUE' });
    } catch {
      return DataProcessResult.success({ verdict: 'CONTINUE' });
    }
  }

  private async checkSecurity(
    sessionId: string,
    tenantId: string,
    nodeOutput: string,
  ): Promise<DataProcessResult<{ verdict: 'CONTINUE' | 'HALT'; violations: string[] }>> {
    try {
      const violations: string[] = [];

      for (const pattern of FORBIDDEN_PATTERNS) {
        if (pattern.test(nodeOutput)) {
          violations.push(`Forbidden pattern: ${pattern.source.substring(0, 60)}...`);
        }
      }

      // Check FREEDOM config for additional forbidden imports
      const customRaw = await this.freedomConfig?.get(FORBIDDEN_IMPORTS_KEY);
      if (Array.isArray(customRaw)) {
        for (const imp of customRaw as string[]) {
          if (nodeOutput.includes(imp)) {
            violations.push(`Forbidden import: ${imp}`);
          }
        }
      }

      if (violations.length > 0) {
        if (this.db) {
          await this.db
            .storeDocument('security-violations', {
              sessionId,
              tenantId,
              violations,
              source: 'cycle-gate',
              detectedAt: new Date().toISOString(),
            })
            .catch(() => {
              /* non-blocking */
            });
        }
        return DataProcessResult.success({ verdict: 'HALT', violations });
      }

      return DataProcessResult.success({ verdict: 'CONTINUE', violations: [] });
    } catch {
      return DataProcessResult.success({ verdict: 'CONTINUE', violations: [] });
    }
  }
}
