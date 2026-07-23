/**
 * SpecAuditService — SS-04/05 pre-generation intelligence.
 *
 * Given a spec (UML text, requirements, or structured JSON), this service:
 *   1. Extracts all external service references
 *   2. Checks each against the fabric registry (SPEC-001)
 *   3. Scans for MACHINE constant candidates (SPEC-002)
 *   4. Detects potential cross-domain overlaps (SPEC-003)
 *   5. Returns a SpecAuditReport with typed PREREQ_GAP events
 *
 * Runs BEFORE any genesis prompt is written — pre-generation intelligence.
 * Missing dependencies caught here cannot contaminate DPO training data.
 *
 * SPEC checks registered as static definitions (no NAMED_CHECKS integration;
 * the NAMED_CHECKS registry handles code-pattern checks, not semantic spec checks).
 *
 * Uses built-in fetch (Node 22+). No @nestjs/axios dependency required.
 *
 * Fail-conservative for checkFabricRegistry: registry unreachable → assumes NOT found.
 *   A false-positive gap (flagging a service that exists) is safer than a missed gap
 *   (passing a service that doesn't exist and producing contaminated training data).
 * Fail-open for detectOverlaps: registry unreachable → no overlaps reported.
 *
 * DNA-3: never throws — returns result objects.
 */

import { Injectable, Logger } from '@nestjs/common';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

/** A reference to an external service found in a spec. */
export interface SpecServiceReference {
  name: string; // "Messaging Service", "Payment Gateway", "Auth Service"
  source: string; // where in the spec this was found
  context: string; // surrounding text for classification
}

/** A detected MACHINE constant candidate in a spec. */
export interface SpecConstantCandidate {
  value: string;
  context: string;
  classification: 'FREEDOM_PARAM_REQUIRED' | 'MACHINE_INVARIANT' | 'NEEDS_REVIEW';
  reason: string;
}

/** The complete audit report for a spec. */
export interface SpecAuditReport {
  specId: string;
  timestamp: string;
  serviceReferences: Array<
    SpecServiceReference & {
      fabricMatch: {
        found: boolean;
        interfaceToken?: string;
        interfaceName?: string;
        status?: string;
      };
    }
  >;
  missingInterfaces: string[];
  constantCandidates: SpecConstantCandidate[];
  prereqGaps: PrereqGap[];
  verdict: 'CLEAN' | 'GAPS_FOUND' | 'BLOCKING_GAPS';
}

export interface PrereqGap {
  type: 'MISSING_FABRIC_INTERFACE' | 'MACHINE_CONSTANT_AT_SPEC' | 'OVERLAP_DETECTED';
  name: string;
  sourceSpec: string;
  priority: 'BLOCKING' | 'WARNING';
  autonomouslyResolvable: boolean;
  detail: string;
}

export interface OverlapResult {
  proposedService: string;
  existingInterface: string;
  existingCategory: string;
  overlapType: 'SAME_CATEGORY' | 'SIMILAR_METHODS' | 'NAME_COLLISION';
}

// ─────────────────────────────────────────────────────────────────────────────
// SPEC Named Check definitions (registered here; no NAMED_CHECKS integration)
// ─────────────────────────────────────────────────────────────────────────────

/** SPEC-001: All spec services must have a fabric interface registered. */
export const SPEC_001 = {
  id: 'SPEC-001',
  check: 'all-spec-services-have-fabric-interfaces',
  description:
    'Every service referenced in the input spec must have a matching entry in ' +
    'xiigen-fabric-registry with status ACTIVE. If ANY service has no match, ' +
    'the flow design is blocked until the missing interface is built (FLOW-PREREQ-02). ' +
    'This check runs BEFORE convergence.handler and BEFORE any genesis prompt is written.',
  severity: 'score-0',
  category: 'SPEC',
} as const;

/** SPEC-002: No MACHINE constants in spec formulas. */
export const SPEC_002 = {
  id: 'SPEC-002',
  check: 'no-machine-constants-in-spec-formulas',
  description:
    'Numeric weights, time constants, and model names in the spec must be flagged as ' +
    'FREEDOM config candidates before any genesis prompt is written. ' +
    'Per SK-451: "Does a tenant changing this value change what the system guarantees?" ' +
    'If NO → FREEDOM config key required. Catches contamination at spec time rather ' +
    'than at score.handler time (where the DPO triple is already produced).',
  severity: 'score-reduce-20',
  category: 'SPEC',
} as const;

/** SPEC-003: No unresolved cross-domain overlaps. */
export const SPEC_003 = {
  id: 'SPEC-003',
  check: 'no-cross-domain-overlap-unresolved',
  description:
    'When a proposed service structurally overlaps with an existing service in the ' +
    'fabric registry (same category, similar methods), the overlap must be classified ' +
    'as SEPARATE_DOMAIN or SHARED_INFRA. Unresolved overlaps block flow design.',
  severity: 'score-0',
  category: 'SPEC',
} as const;

/** OVERLAP-001: overlap-not-self-match. */
export const OVERLAP_001 = {
  id: 'OVERLAP-001',
  check: 'overlap-not-self-match',
  description:
    'Verify the proposed service is not the same as the existing interface. ' +
    'Derive token (UPPER_SNAKE) and interface name (IXxxService) from proposed name. ' +
    'If either matches the existing interface token or name, this is a self-match, ' +
    'not an overlap — skip it.',
  severity: 'score-0',
  category: 'OVERLAP',
} as const;

export const SPEC_CHECKS = [SPEC_001, SPEC_002, SPEC_003] as const;

// ─────────────────────────────────────────────────────────────────────────────
// Service
// ─────────────────────────────────────────────────────────────────────────────

@Injectable()
export class SpecAuditService {
  private readonly logger = new Logger(SpecAuditService.name);
  private readonly esUrl = process.env.ES_URL || 'http://localhost:9200';

  /**
   * Audit a spec against the fabric registry.
   * Pre-generation check: catches missing dependencies BEFORE any genesis prompt is written.
   */
  async auditSpec(specContent: string, specId: string): Promise<SpecAuditReport> {
    const timestamp = new Date().toISOString();

    const serviceRefs = this.extractServiceReferences(specContent);
    this.logger.log(`Extracted ${serviceRefs.length} service references from ${specId}`);

    const checkedRefs = await Promise.all(serviceRefs.map((ref) => this.checkFabricRegistry(ref)));

    const constantCandidates = this.scanForConstants(specContent);

    const missingInterfaces = checkedRefs.filter((r) => !r.fabricMatch.found).map((r) => r.name);

    const prereqGaps: PrereqGap[] = [];

    // SPEC-001: Missing fabric interfaces → BLOCKING
    for (const ref of checkedRefs.filter((r) => !r.fabricMatch.found)) {
      prereqGaps.push({
        type: 'MISSING_FABRIC_INTERFACE',
        name: ref.name,
        sourceSpec: specId,
        priority: 'BLOCKING',
        autonomouslyResolvable: true,
        detail:
          `Service "${ref.name}" referenced in spec but no fabric interface found in ` +
          `xiigen-fabric-registry. Source: ${ref.source}`,
      });
    }

    // SPEC-002: MACHINE constant candidates → WARNING
    for (const candidate of constantCandidates.filter(
      (c) => c.classification === 'FREEDOM_PARAM_REQUIRED',
    )) {
      prereqGaps.push({
        type: 'MACHINE_CONSTANT_AT_SPEC',
        name: `constant:${candidate.value}`,
        sourceSpec: specId,
        priority: 'WARNING',
        autonomouslyResolvable: true,
        detail:
          `Value "${candidate.value}" in context "${candidate.context}" should be a ` +
          `FREEDOM config parameter. ${candidate.reason}`,
      });
    }

    const verdict: SpecAuditReport['verdict'] = prereqGaps.some((g) => g.priority === 'BLOCKING')
      ? 'BLOCKING_GAPS'
      : prereqGaps.length > 0
        ? 'GAPS_FOUND'
        : 'CLEAN';

    return {
      specId,
      timestamp,
      serviceReferences: checkedRefs,
      missingInterfaces,
      constantCandidates,
      prereqGaps,
      verdict,
    };
  }

  /**
   * Extract service references from spec content.
   * Three passes:
   *   Pass 1 (high confidence): Actors:/Services:/Components: lines — comma-separated lists
   *   Pass 2 (lower confidence): "X Service" / "X Provider" patterns in prose
   *   Pass 3: Structured JSON with services[] array
   */
  extractServiceReferences(specContent: string): SpecServiceReference[] {
    const refs: SpecServiceReference[] = [];
    const seen = new Set<string>();

    // ── Pass 1: Actors/Services/Components lists (high confidence) ──
    const actorsPattern = /(?:Actors?|Services?|Components?)\s*:\s*([^\n]+)/gi;
    let listMatch: RegExpExecArray | null;
    while ((listMatch = actorsPattern.exec(specContent)) !== null) {
      const listLine = listMatch[1];
      const entries = listLine
        .split(',')
        .map((e) => e.trim())
        .filter(Boolean);
      for (const entry of entries) {
        const key = entry.toLowerCase();
        if (!seen.has(key) && entry.length > 1) {
          seen.add(key);
          refs.push({
            name: entry,
            source: `actors-list at position ${listMatch.index}`,
            context: listLine.trim(),
          });
        }
      }
    }

    // ── Pass 2: "X Service" / "X Provider" patterns in prose ──
    const servicePattern =
      /([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)*)\s+(?:Service|Provider|Gateway|Engine)/g;
    let match: RegExpExecArray | null;
    while ((match = servicePattern.exec(specContent)) !== null) {
      const fullName = match[0].trim();
      const key = fullName.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        const start = Math.max(0, match.index - 100);
        const end = Math.min(specContent.length, match.index + match[0].length + 100);
        refs.push({
          name: fullName,
          source: `pattern-match at position ${match.index}`,
          context: specContent.substring(start, end).replace(/\n/g, ' ').trim(),
        });
      }
    }

    // ── Pass 3: Structured JSON with service arrays ──
    try {
      const parsed = JSON.parse(specContent) as Record<string, unknown>;
      if (parsed.services && Array.isArray(parsed.services)) {
        for (const svc of parsed.services as unknown[]) {
          const name = typeof svc === 'string' ? svc : (svc as { name?: string }).name;
          if (name && !seen.has(name.toLowerCase())) {
            seen.add(name.toLowerCase());
            refs.push({
              name,
              source: 'structured-json services[]',
              context: JSON.stringify(svc).substring(0, 200),
            });
          }
        }
      }
    } catch {
      // Not JSON — fine, pattern matching already handled it
    }

    return refs;
  }

  /**
   * Check a service reference against the fabric registry.
   * Three lookup strategies (bool.should with minimum_should_match=1):
   *   1. match on aliases (text field — case-insensitive via standard analyzer)
   *   2. Derive interface name (IPascalCase) and term match on interfaceName
   *   3. Derive token (UPPER_SNAKE) and term match on interfaceToken
   *
   * Fail-conservative: registry unreachable → returns found=false.
   */
  async checkFabricRegistry(ref: SpecServiceReference): Promise<
    SpecServiceReference & {
      fabricMatch: {
        found: boolean;
        interfaceToken?: string;
        interfaceName?: string;
        status?: string;
      };
    }
  > {
    try {
      const normalizedName = ref.name.toLowerCase().replace(/\s+/g, ' ').trim();

      const res = await fetch(`${this.esUrl}/xiigen-fabric-registry/_search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: {
            bool: {
              should: [
                { match: { aliases: normalizedName } },
                { match: { aliases: ref.name } },
                { term: { interfaceName: `I${ref.name.replace(/\s+/g, '')}` } },
                { term: { interfaceToken: ref.name.replace(/\s+/g, '_').toUpperCase() } },
              ],
              minimum_should_match: 1,
            },
          },
          size: 1,
        }),
      });

      if (!res.ok) return { ...ref, fabricMatch: { found: false } };

      const data = (await res.json()) as {
        hits?: {
          total?: { value?: number };
          hits?: Array<{
            _source?: { interfaceToken?: string; interfaceName?: string; status?: string };
          }>;
        };
      };

      if ((data.hits?.total?.value ?? 0) > 0 && data.hits?.hits?.[0]?._source) {
        const src = data.hits.hits[0]._source;
        return {
          ...ref,
          fabricMatch: {
            found: true,
            interfaceToken: src.interfaceToken,
            interfaceName: src.interfaceName,
            status: src.status,
          },
        };
      }

      return { ...ref, fabricMatch: { found: false } };
    } catch (error) {
      // Fail-conservative: false positive gap is safer than missed gap
      this.logger.warn(`Registry query failed for "${ref.name}": ${error}`);
      return { ...ref, fabricMatch: { found: false } };
    }
  }

  /**
   * Scan spec content for values that should be FREEDOM config parameters.
   * Based on SK-451 canonical classification patterns.
   */
  scanForConstants(specContent: string): SpecConstantCandidate[] {
    const candidates: SpecConstantCandidate[] = [];

    // Pattern 1: Numeric weights in formulas (A × 0.25 + B × 0.20)
    const weightPattern = /(\w[\w\s]*)\s*[×*]\s*(0\.\d+)/g;
    let match: RegExpExecArray | null;
    while ((match = weightPattern.exec(specContent)) !== null) {
      const start = Math.max(0, match.index - 60);
      const end = Math.min(specContent.length, match.index + match[0].length + 60);
      candidates.push({
        value: match[2],
        context: specContent.substring(start, end).replace(/\n/g, ' ').trim(),
        classification: 'FREEDOM_PARAM_REQUIRED',
        reason:
          'Numeric weight in multi-term formula. Weights are tunable business ' +
          'parameters per SK-451. Must be FREEDOM config keys, not hardcoded.',
      });
    }

    // Pattern 2: Time constants
    const timePattern = /(\d+)\s*(seconds?|minutes?|hours?|days?|ms|milliseconds?)/gi;
    while ((match = timePattern.exec(specContent)) !== null) {
      const start = Math.max(0, match.index - 60);
      const end = Math.min(specContent.length, match.index + match[0].length + 60);
      candidates.push({
        value: `${match[1]} ${match[2]}`,
        context: specContent.substring(start, end).replace(/\n/g, ' ').trim(),
        classification: 'FREEDOM_PARAM_REQUIRED',
        reason:
          'Time constant. Operators tune TTLs, intervals, and timeouts per ' +
          'tenant. Must be FREEDOM config keys per SK-451.',
      });
    }

    // Pattern 3: Threshold values
    const thresholdPattern = /(?:confidence|threshold|score|quality|minimum)\s*[><=]+\s*(0\.\d+)/gi;
    while ((match = thresholdPattern.exec(specContent)) !== null) {
      const start = Math.max(0, match.index - 60);
      const end = Math.min(specContent.length, match.index + match[0].length + 60);
      candidates.push({
        value: match[1],
        context: specContent.substring(start, end).replace(/\n/g, ' ').trim(),
        classification: 'NEEDS_REVIEW',
        reason:
          'Threshold value. Apply SK-451 security-break test: does a tenant ' +
          'changing this value break a system guarantee? If YES → MACHINE. If NO → FREEDOM.',
      });
    }

    // Pattern 4: Model names
    const modelPattern = /(?:gpt-4|claude|sonnet|opus|gemini|deepseek|llama|mistral)[\w.-]*/gi;
    while ((match = modelPattern.exec(specContent)) !== null) {
      candidates.push({
        value: match[0],
        context: specContent
          .substring(
            Math.max(0, match.index - 40),
            Math.min(specContent.length, match.index + match[0].length + 40),
          )
          .replace(/\n/g, ' ')
          .trim(),
        classification: 'FREEDOM_PARAM_REQUIRED',
        reason:
          'Model name. Model names are ALWAYS FREEDOM per SK-451 and FC-31. ' +
          'Must be a FREEDOM config key, never hardcoded.',
      });
    }

    return candidates;
  }

  /**
   * Detect potential overlaps between proposed services and existing fabric interfaces.
   * SPEC-003: surfaces overlaps for architectural classification decision.
   * Fail-open: registry unreachable → no overlaps reported.
   */
  async detectOverlaps(serviceRefs: SpecServiceReference[]): Promise<OverlapResult[]> {
    const overlaps: OverlapResult[] = [];

    for (const ref of serviceRefs) {
      const derivedCategory = ref.name
        .replace(/\s*(Service|Provider|Gateway|Engine)\s*$/i, '')
        .toUpperCase()
        .replace(/\s+/g, '_');

      const derivedToken = ref.name.replace(/\s+/g, '_').toUpperCase();
      const derivedInterfaceName = `I${ref.name.replace(/\s+/g, '')}`;

      try {
        const res = await fetch(`${this.esUrl}/xiigen-fabric-registry/_search`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: { term: { serviceCategory: derivedCategory } },
            size: 5,
          }),
        });

        if (!res.ok) continue;

        const data = (await res.json()) as {
          hits?: {
            hits?: Array<{
              _source?: {
                interfaceToken?: string;
                interfaceName?: string;
                serviceCategory?: string;
              };
            }>;
          };
        };

        for (const hit of data.hits?.hits ?? []) {
          const existing = hit._source;
          if (!existing) continue;
          // Self-filter: skip if this is the same service we're proposing
          if (existing.interfaceToken === derivedToken) continue;
          if (existing.interfaceName === derivedInterfaceName) continue;

          overlaps.push({
            proposedService: ref.name,
            existingInterface: existing.interfaceName ?? '',
            existingCategory: existing.serviceCategory ?? '',
            overlapType: 'SAME_CATEGORY',
          });
        }
      } catch {
        // Fail-open for overlaps: missing an overlap is less dangerous
        // than missing a required interface
      }
    }

    return overlaps;
  }
}
