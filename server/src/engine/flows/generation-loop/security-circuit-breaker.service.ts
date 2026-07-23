// SecurityCircuitBreakerPattern (SK-403)
// CF-790: pattern match on generated code bundles for security violations
// Returns HALT on any violation; CONTINUE otherwise.

import { DataProcessResult } from '../../../kernel/data-process-result';
import { IDatabaseService } from '../../../fabrics/interfaces/database.interface';

export interface SecurityScanResult {
  verdict: 'CONTINUE' | 'HALT';
  violations: string[];
}

// Forbidden patterns — FREEDOM config can extend this list
const BUILTIN_FORBIDDEN_PATTERNS = [
  /import\s+\{[^}]*Client[^}]*\}\s+from\s+['"]@elastic\/elasticsearch['"]/,
  /require\(['"]@elastic\/elasticsearch['"]\)/,
  /PRIVATE_KEY\s*[:=]\s*['"][^'"]{10,}['"]/i,
  /password\s*[:=]\s*['"][^'"]{4,}['"]/i,
  /SECRET\s*[:=]\s*['"][^'"]{8,}['"]/i,
  /api[_-]?key\s*[:=]\s*['"][^'"]{8,}['"]/i,
];

export class SecurityCircuitBreakerService {
  constructor(
    private readonly db: IDatabaseService,
    private readonly freedomConfig: {
      getConfig(key: string): Promise<DataProcessResult<string[]>>;
    },
  ) {}

  async scanBundle(
    bundleCode: string,
    sessionId: string,
  ): Promise<DataProcessResult<SecurityScanResult>> {
    const violations: string[] = [];

    for (const pattern of BUILTIN_FORBIDDEN_PATTERNS) {
      if (pattern.test(bundleCode)) {
        violations.push(`Forbidden pattern detected: ${pattern.source.substring(0, 60)}...`);
      }
    }

    // Check FREEDOM config for additional forbidden imports
    const customResult = await this.freedomConfig.getConfig('forbidden_imports');
    if (customResult.isSuccess && customResult.data) {
      for (const imp of customResult.data) {
        if (bundleCode.includes(imp)) {
          violations.push(`Forbidden import: ${imp}`);
        }
      }
    }

    if (violations.length > 0) {
      // DNA-8: store before emit
      await this.db.storeDocument('security-violations', {
        sessionId,
        violations,
        detectedAt: new Date().toISOString(),
      });
      return DataProcessResult.success({ verdict: 'HALT', violations });
    }

    return DataProcessResult.success({ verdict: 'CONTINUE', violations: [] });
  }
}
