/**
 * RealCodeQualityScorer — multi-dimensional code quality scoring.
 *
 * Replaces the naive "is text > 100 chars" scorer with real checks:
 * 1. dna_compliance (0.30) — checks for 9 DNA patterns
 * 2. fabric_usage   (0.25) — no direct provider imports, uses fabric interfaces
 * 3. spec_adherence (0.15) — required factories present, archetype patterns match
 * 4. code_structure (0.10) — class definitions, exports, methods, reasonable length
 * 5. test_quality   (0.20) — 4-layer: unit / simulation / e2e / property-based
 *
 * total_score = Σ(dimension.score × dimension.weight)
 *
 * DNA-3: returns DataProcessResult.
 *
 * Phase 12.1.
 */

import { Injectable, Optional } from '@nestjs/common';
import { DataProcessResult } from '../kernel/data-process-result';
import { type QualityScore, type QualityDimension, createQualityScore } from './feedback-types';

// ── Dimension Config ────────────────────────────────

export interface ScoringWeights {
  dna_compliance: number;
  fabric_usage: number;
  spec_adherence: number;
  code_structure: number;
  test_quality: number;
}

export const DEFAULT_WEIGHTS: ScoringWeights = {
  dna_compliance: 0.3,
  fabric_usage: 0.25,
  spec_adherence: 0.15, // reduced from 0.20 to accommodate test_quality increase
  code_structure: 0.1, // reduced from 0.15 to accommodate test_quality increase
  test_quality: 0.2, // increased from 0.10 — 4-layer coverage now measured
};

// ── DNA Pattern Checks ─────────────────────────────

const DNA_PATTERNS: ReadonlyArray<{ id: string; regex: RegExp }> = [
  { id: 'DNA-1', regex: /Record<string,\s*unknown>/ },
  { id: 'DNA-2', regex: /buildSearchFilter/i },
  { id: 'DNA-3', regex: /DataProcessResult/ },
  { id: 'DNA-4', regex: /MicroserviceBase/ },
  { id: 'DNA-5', regex: /tenantId|tenant_id|scopeId/ },
  { id: 'DNA-6', regex: /DynamicController/ },
  { id: 'DNA-7', regex: /idempotency|IdempotencyKey/i },
  { id: 'DNA-8', regex: /outbox/i },
  { id: 'DNA-9', regex: /CloudEvent/ },
];

// ── Forbidden Imports ───────────────────────────────

const FORBIDDEN_IMPORTS: ReadonlyArray<RegExp> = [
  /import\s+.*\s+from\s+['"]pg['"]/,
  /import\s+.*\s+from\s+['"]mysql/,
  /import\s+.*\s+from\s+['"]mongodb['"]/,
  /import\s+.*\s+from\s+['"]redis['"]/,
  /import\s+.*\s+from\s+['"]ioredis['"]/,
  /import\s+.*\s+from\s+['"]openai['"]/,
  /import\s+.*\s+from\s+['"]@anthropic/,
  /import\s+.*\s+from\s+['"]@google\/generative/,
  /require\s*\(\s*['"]pg['"]\s*\)/,
  /require\s*\(\s*['"]openai['"]\s*\)/,
];

// ── Fabric Interface References ─────────────────────

const FABRIC_INTERFACES: ReadonlyArray<RegExp> = [
  /IDatabaseService/,
  /IQueueService/,
  /IAiProvider/,
  /IRagService/,
  /IFlowOrchestrator/,
  /ISecretsService/,
  /createAsync/,
];

// ── Scorer ──────────────────────────────────────────

@Injectable()
export class RealCodeQualityScorer {
  private readonly weights: ScoringWeights;

  constructor(@Optional() weights?: Partial<ScoringWeights>) {
    this.weights = { ...DEFAULT_WEIGHTS, ...weights };
  }

  /**
   * Score generated code against all 5 dimensions.
   * DNA-3: returns DataProcessResult.
   */
  score(code: string, spec: Record<string, unknown>): DataProcessResult<QualityScore> {
    if (!code || !code.trim()) {
      const zeroDimensions = this.buildZeroDimensions('Empty code');
      return DataProcessResult.success(createQualityScore(zeroDimensions));
    }

    const dimensions: QualityDimension[] = [
      this.scoreDnaCompliance(code),
      this.scoreFabricUsage(code),
      this.scoreSpecAdherence(code, spec),
      this.scoreCodeStructure(code),
      this.scoreTestQuality(code),
    ];

    return DataProcessResult.success(createQualityScore(dimensions));
  }

  /**
   * Get the configured weights.
   */
  getWeights(): ScoringWeights {
    return { ...this.weights };
  }

  // ── Dimension Scorers ─────────────────────────────

  /**
   * DNA Compliance (weight 0.30).
   * Checks how many of the 9 DNA patterns are present.
   */
  private scoreDnaCompliance(code: string): QualityDimension {
    let found = 0;
    const details: string[] = [];

    for (const pattern of DNA_PATTERNS) {
      if (pattern.regex.test(code)) {
        found++;
        details.push(`${pattern.id}: present`);
      } else {
        details.push(`${pattern.id}: missing`);
      }
    }

    // Score: found / total patterns. Bonus if >= 5 found.
    const raw = found / DNA_PATTERNS.length;
    const score = Math.min(1.0, raw + (found >= 5 ? 0.1 : 0));

    return {
      name: 'dna_compliance',
      score: Math.round(score * 10000) / 10000,
      weight: this.weights.dna_compliance,
      details: `${found}/${DNA_PATTERNS.length} DNA patterns found`,
    };
  }

  /**
   * Fabric Usage (weight 0.25).
   * Checks code doesn't import specific providers and uses fabric interfaces.
   */
  private scoreFabricUsage(code: string): QualityDimension {
    // Penalty for forbidden imports
    let violations = 0;
    for (const forbidden of FORBIDDEN_IMPORTS) {
      if (forbidden.test(code)) {
        violations++;
      }
    }

    // Bonus for fabric interface references
    let fabricRefs = 0;
    for (const iface of FABRIC_INTERFACES) {
      if (iface.test(code)) {
        fabricRefs++;
      }
    }

    // Score: starts at 1.0, drops for violations, bonus for fabric refs
    let score = 1.0;
    score -= violations * 0.3; // each violation drops 30%
    if (fabricRefs === 0 && code.length > 100) {
      score -= 0.2; // no fabric refs in non-trivial code = penalty
    } else {
      score += Math.min(fabricRefs * 0.05, 0.15); // small bonus for fabric refs
    }

    score = Math.max(0.0, Math.min(1.0, score));

    return {
      name: 'fabric_usage',
      score: Math.round(score * 10000) / 10000,
      weight: this.weights.fabric_usage,
      details: `${violations} forbidden imports, ${fabricRefs} fabric references`,
    };
  }

  /**
   * Spec Adherence (weight 0.20).
   * Checks if required factories from spec are referenced in code.
   */
  private scoreSpecAdherence(code: string, spec: Record<string, unknown>): QualityDimension {
    const deps = (spec.factory_dependencies as Array<Record<string, unknown>>) ?? [];

    if (deps.length === 0) {
      // No spec requirements → neutral score
      return {
        name: 'spec_adherence',
        score: 0.5,
        weight: this.weights.spec_adherence,
        details: 'No factory dependencies in spec',
      };
    }

    let found = 0;
    for (const dep of deps) {
      const factoryId = (dep.factory_id ?? dep.factoryId) as string;
      const interfaceName = (dep.interface_name ?? dep.interfaceName) as string;
      const fabricType = (dep.fabric_type ?? dep.fabricType) as string;

      if (
        (factoryId && code.includes(factoryId)) ||
        (interfaceName && code.includes(interfaceName)) ||
        (fabricType && code.toLowerCase().includes(fabricType))
      ) {
        found++;
      }
    }

    const score = deps.length > 0 ? found / deps.length : 0.5;

    // Check archetype pattern
    const archetype = spec.archetype as string;
    let archetypeBonus = 0;
    if (archetype) {
      if (archetype === 'orchestration' && /Promise\.allSettled|parallel|orchestrat/i.test(code)) {
        archetypeBonus = 0.1;
      } else if (archetype === 'data_pipeline' && /transform|pipeline|aggregat/i.test(code)) {
        archetypeBonus = 0.1;
      } else if (archetype === 'service' && /extends\s+MicroserviceBase/i.test(code)) {
        archetypeBonus = 0.1;
      }
    }

    let specScore = Math.min(1.0, score + archetypeBonus);

    // Only blend archetype gates when an archetype is declared — without one,
    // the gate returns 1.0 (no checks) which would inflate a 0-factory score.
    if (archetype) {
      const archetypeScore = this.scoreArchetypeGates(code, archetype);
      specScore = specScore * 0.6 + archetypeScore * 0.4;
    }

    return {
      name: 'spec_adherence',
      score: Math.round(Math.min(1.0, specScore) * 10000) / 10000,
      weight: this.weights.spec_adherence,
      details: `${found}/${deps.length} factory dependencies referenced`,
    };
  }

  /**
   * Code Structure (weight 0.15).
   * Checks for class definitions, exports, methods, reasonable length.
   */
  private scoreCodeStructure(code: string): QualityDimension {
    let score = 0;
    const checks: string[] = [];

    // Has class definition
    if (/class\s+\w+/.test(code)) {
      score += 0.25;
      checks.push('class: yes');
    } else {
      checks.push('class: no');
    }

    // Has exports
    if (/export\s+(class|function|const|enum|interface)/.test(code)) {
      score += 0.25;
      checks.push('exports: yes');
    } else {
      checks.push('exports: no');
    }

    // Has methods (function declarations or method syntax)
    const methodCount = (
      code.match(/(?:async\s+)?(?:\w+)\s*\([^)]*\)\s*(?::\s*\w+[<>[\]|,\s]*)*\s*\{/g) || []
    ).length;
    if (methodCount >= 1) {
      score += 0.25;
      checks.push(`methods: ${methodCount}`);
    } else {
      checks.push('methods: 0');
    }

    // Reasonable length (50–5000 chars)
    if (code.length >= 50 && code.length <= 5000) {
      score += 0.25;
      checks.push('length: good');
    } else if (code.length > 5000) {
      score += 0.15; // too long but not zero
      checks.push('length: too long');
    } else {
      checks.push('length: too short');
    }

    return {
      name: 'code_structure',
      score: Math.round(Math.min(1.0, score) * 10000) / 10000,
      weight: this.weights.code_structure,
      details: checks.join(', '),
    };
  }

  /**
   * Test Quality (weight 0.20).
   * 4-layer detection: unit → simulation → e2e → property-based.
   */
  private scoreTestQuality(code: string): QualityDimension {
    let score = 0;
    const checks: string[] = [];

    // Layer 1: unit tests (describe/it/expect/setup)
    if (/describe\s*\(/.test(code)) {
      score += 0.3;
      checks.push('describe: yes');
    }
    if (/(?:it|test)\s*\(/.test(code)) {
      score += 0.3;
      checks.push('it/test: yes');
    }
    if (/expect\s*\(/.test(code)) {
      score += 0.2;
      checks.push('assertions: yes');
    }
    if (/before(?:Each|All)\s*\(/.test(code)) {
      score += 0.05;
      checks.push('setup: yes');
    }

    // Layer 2: simulation tests (MockProvider, jest.mock, createMock patterns)
    if (/MockProvider|jest\.mock\s*\(|createMock\s*\(/.test(code)) {
      score += 0.05;
      checks.push('simulation: yes');
    }

    // Layer 3: e2e tests (NestJS TestingModule)
    if (/Test\.createTestingModule|TestingModule/.test(code)) {
      score += 0.05;
      checks.push('e2e: yes');
    }

    // Layer 4: property-based tests (fast-check)
    if (/fc\.property|fast-check|@fast-check/.test(code)) {
      score += 0.05;
      checks.push('property-based: yes');
    }

    // If no test indicators at all, neutral score (this might be service code, not test code)
    if (score === 0 && !/describe|it\s*\(|test\s*\(/.test(code)) {
      score = 0.5; // neutral for non-test code
      checks.push('not a test file — neutral');
    }

    return {
      name: 'test_quality',
      score: Math.round(Math.min(1.0, score) * 10000) / 10000,
      weight: this.weights.test_quality,
      details: checks.join(', '),
    };
  }

  // ── Archetype Gates ───────────────────────────────

  private scoreArchetypeGates(code: string, archetype: string): number {
    const archetypeChecks: Record<
      string,
      Array<{ regex: RegExp | ((c: string) => boolean); weight: number }>
    > = {
      fan_in: [{ regex: /Promise\.allSettled\s*\(/, weight: 0.4 }],
      convergence: [
        { regex: /matchStatus.*pending|DataProcessResult\.success.*pending/i, weight: 0.3 },
        { regex: /freedomConfig|FREEDOM_KEYS|config\.get/i, weight: 0.3 },
      ],
      broadcast: [
        { regex: /DataProcessResult\.success/, weight: 0.2 },
        { regex: /consent|consentCheck|isConsented/i, weight: 0.2 },
      ],
    };

    const checks = archetypeChecks[archetype?.toLowerCase() ?? ''] ?? [];
    if (checks.length === 0) return 1.0;

    let score = 0;
    for (const check of checks) {
      const passes = typeof check.regex === 'function' ? check.regex(code) : check.regex.test(code);
      if (passes) score += check.weight;
    }
    return Math.min(1.0, score / checks.reduce((s, c) => s + c.weight, 0));
  }

  // ── Helpers ───────────────────────────────────────

  private buildZeroDimensions(reason: string): QualityDimension[] {
    return [
      { name: 'dna_compliance', score: 0, weight: this.weights.dna_compliance, details: reason },
      { name: 'fabric_usage', score: 0, weight: this.weights.fabric_usage, details: reason },
      { name: 'spec_adherence', score: 0, weight: this.weights.spec_adherence, details: reason },
      { name: 'code_structure', score: 0, weight: this.weights.code_structure, details: reason },
      { name: 'test_quality', score: 0, weight: this.weights.test_quality, details: reason },
    ];
  }
}
