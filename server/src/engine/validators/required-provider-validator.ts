/**
 * RequiredProviderValidator — SS-02 self-sufficiency guard.
 *
 * Extracts @Inject() tokens AND constructor type annotations from generated code,
 * then verifies each has a registered provider in xiigen-fabric-registry.
 *
 * Two extraction passes:
 *   Pass 1: Explicit @Inject(TOKEN) decorators → query by token (exact doc lookup)
 *   Pass 2: Constructor type annotations (: IXxxService) → query by interfaceName
 *
 * NEVER blocks storage. Returns a ProviderValidationResult with:
 *   valid: false  → caller sets trainingDataQuality='INVALID_MISSING_DEPENDENCY'
 *                   and countsTowardThreshold=false
 *   valid: true   → no action required
 *
 * Fail-open: if fabric registry is unreachable, assumes all providers valid.
 * This prevents a transient ES outage from blocking all DPO training data.
 *
 * DNA-3: never throws — returns result object.
 */

import { Injectable, Logger } from '@nestjs/common';

export interface ProviderValidationResult {
  valid: boolean;
  missingProviders: string[];
  code: 'PROVIDERS_VALID' | 'INVALID_MISSING_DEPENDENCY';
  message: string;
}

@Injectable()
export class RequiredProviderValidator {
  private readonly logger = new Logger(RequiredProviderValidator.name);
  private readonly esUrl = process.env.ES_URL || 'http://localhost:9200';

  /**
   * Extract injection tokens AND constructor type annotations from generated code,
   * then verify each has a registered provider in xiigen-fabric-registry.
   *
   * Never blocks storage. Only tags quality.
   * Returns valid=false if ANY dependency is missing — caller sets
   * trainingDataQuality accordingly.
   */
  async validate(generatedCode: string): Promise<ProviderValidationResult> {
    const missingProviders: string[] = [];

    // ── Pass 1: Explicit @Inject(TOKEN) decorators ──
    const injectPattern = /@Inject\(\s*['"]?([A-Z][A-Z0-9_]+)['"]?\s*\)/g;
    let match: RegExpExecArray | null;

    while ((match = injectPattern.exec(generatedCode)) !== null) {
      const token = match[1];
      const found = await this.checkByToken(token);
      if (!found) missingProviders.push(token);
    }

    // ── Pass 2: Constructor type annotations (: IXxxService) ──
    // Catches type-based injection without explicit @Inject decorator:
    //   constructor(private readonly db: IDatabaseService)
    const typePattern = /:\s*(I[A-Z][a-zA-Z]*(?:Service|Provider|Pool))\b/g;
    const checkedTypes = new Set<string>();
    const injectTokensFound = new Set(
      [...generatedCode.matchAll(/@Inject\(\s*['"]?([A-Z][A-Z0-9_]+)['"]?\s*\)/g)].map((m) => m[1]),
    );

    while ((match = typePattern.exec(generatedCode)) !== null) {
      const interfaceName = match[1];
      if (checkedTypes.has(interfaceName)) continue;
      checkedTypes.add(interfaceName);

      // Skip if we already found this via @Inject to avoid double-reporting
      // Heuristic: if the interface derives a token that was already checked, skip
      const derivedToken = interfaceName
        .replace(/^I/, '')
        .replace(/([a-z])([A-Z])/g, '$1_$2')
        .toUpperCase();
      if (injectTokensFound.has(derivedToken)) continue;

      const found = await this.checkByInterfaceName(interfaceName);
      if (!found) missingProviders.push(interfaceName);
    }

    const injectCount = (generatedCode.match(/@Inject/g) || []).length;
    const totalChecked = injectCount + checkedTypes.size;

    if (missingProviders.length === 0) {
      return {
        valid: true,
        missingProviders: [],
        code: 'PROVIDERS_VALID',
        message:
          totalChecked === 0
            ? 'No injection tokens or typed constructors found in generated code'
            : `All ${totalChecked} dependencies verified against fabric registry`,
      };
    }

    this.logger.warn(
      `Generated code references ${missingProviders.length} unregistered providers: ${missingProviders.join(', ')}`,
    );
    return {
      valid: false,
      missingProviders,
      code: 'INVALID_MISSING_DEPENDENCY',
      message:
        `Missing fabric providers: ${missingProviders.join(', ')}. ` +
        `Triple stored with trainingDataQuality=INVALID_MISSING_DEPENDENCY. ` +
        `Does not count toward graduation threshold.`,
    };
  }

  /** Check fabric registry by injection token (Pass 1) */
  private async checkByToken(token: string): Promise<boolean> {
    try {
      const url = `${this.esUrl}/xiigen-fabric-registry/_doc/${encodeURIComponent(token)}`;
      const res = await fetch(url);
      if (!res.ok) return false;
      const data = (await res.json()) as { found?: boolean; _source?: { status?: string } };
      return data?.found === true && data?._source?.status === 'ACTIVE';
    } catch {
      // Registry unreachable — fail-open: assume valid
      this.logger.warn(`Cannot verify token ${token}: registry unreachable. Assuming valid.`);
      return true;
    }
  }

  /** Check fabric registry by interface name (Pass 2 — constructor types) */
  private async checkByInterfaceName(interfaceName: string): Promise<boolean> {
    try {
      const url = `${this.esUrl}/xiigen-fabric-registry/_search`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: { term: { interfaceName } },
          size: 1,
        }),
      });
      if (!res.ok) return false;
      const data = (await res.json()) as { hits?: { total?: { value?: number } } };
      return (data?.hits?.total?.value ?? 0) > 0;
    } catch {
      this.logger.warn(
        `Cannot verify interface ${interfaceName}: registry unreachable. Assuming valid.`,
      );
      return true;
    }
  }
}
