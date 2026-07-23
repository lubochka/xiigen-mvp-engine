#!/usr/bin/env node
/**
 * SS-05: Seed FLOW_DESIGN RAG patterns for spec audit protocol.
 *
 * Seeds 3 patterns to xiigen-rag-patterns:
 *   flow-design::spec-to-fabric-audit
 *   flow-design::machine-constant-at-spec-time
 *   flow-design::prerequisite-resolution-protocol
 *
 * Usage:
 *   node seed-ss05-rag-patterns.js [esUrl]
 *   bash seed-ss05-rag-patterns.sh  (delegates here)
 *
 * Exit code: 0 = all 3 seeded, 1 = error
 */

const esUrl = (process.argv[2] || 'http://localhost:9200').replace(/\/$/, '');

const PATTERNS = [
  {
    id: 'flow-design::spec-to-fabric-audit',
    doc: {
      patternId: 'flow-design::spec-to-fabric-audit',
      patternType: 'FLOW_DESIGN',
      tier: 'SEED',
      content:
        'RULE: Before any flow design begins, audit the spec against xiigen-fabric-registry.\n\n' +
        'For each external service named in the spec:\n' +
        '  1. Query fabric registry by alias, interface name, and token derivation\n' +
        '  2. If found with status ACTIVE: service is available — proceed\n' +
        '  3. If NOT found: emit PREREQ_GAP { type: MISSING_FABRIC_INTERFACE }\n' +
        '  4. BLOCKING: flow design does not proceed until all PREREQ_GAP events are resolved\n\n' +
        'WHY: A genesis prompt that references a non-existent fabric interface produces code\n' +
        'that either hallucinates the import (compilation failure) or omits the dependency\n' +
        '(SILENT_FAILURE — code works but is architecturally wrong). The DPO triple from\n' +
        'this generation teaches the model that the missing dependency is not needed.\n\n' +
        'PATTERN: Run SpecAuditService.auditSpec() as the FIRST step of any spec-driven flow.\n' +
        'Before convergence.handler. Before any genesis prompt is written.',
      qualityScore: 0.85,
      qualityDataPoints: 0,
      usageCount: 0,
      createdBy: 'SS-05-RAG-seed',
    },
  },
  {
    id: 'flow-design::machine-constant-at-spec-time',
    doc: {
      patternId: 'flow-design::machine-constant-at-spec-time',
      patternType: 'FLOW_DESIGN',
      tier: 'SEED',
      content:
        'RULE: When parsing a spec or UML, classify every value BEFORE code generation.\n\n' +
        'Detection patterns:\n' +
        '  1. Multi-term summation: A * 0.25 + B * 0.20 → weights are FREEDOM parameters\n' +
        '  2. Time constants: TTL, expiry, retry intervals → operators tune per tenant\n' +
        '  3. Threshold values: confidence >= 0.80, score > 0.65 → NEEDS_REVIEW (could be MACHINE)\n' +
        '  4. Model names: gpt-4o, claude-sonnet → ALWAYS FREEDOM per FC-31\n\n' +
        'Action: emit FREEDOM_PARAM_REQUIRED signal with value and context.\n' +
        'Resolution: register FREEDOM config key BEFORE genesis prompt is written.\n\n' +
        'FAILURE MODE IF MISSED: Code hardcodes the value. DPO triple teaches hardcoding.\n' +
        'Every future generation reproduces the violation. FC-31 catches it at score time\n' +
        'but the triple is already stored. Catching at spec time prevents contamination.\n\n' +
        'APPLY SK-451 SECURITY-BREAK TEST to each candidate:\n' +
        '  Does a tenant changing this value break a system guarantee?\n' +
        '  YES → MACHINE (hardcode it, test for it)\n' +
        '  NO  → FREEDOM (register config key)',
      qualityScore: 0.85,
      qualityDataPoints: 0,
      usageCount: 0,
      createdBy: 'SS-05-RAG-seed',
    },
  },
  {
    id: 'flow-design::prerequisite-resolution-protocol',
    doc: {
      patternId: 'flow-design::prerequisite-resolution-protocol',
      patternType: 'FLOW_DESIGN',
      tier: 'SEED',
      content:
        'RULE: When PREREQ_GAP events are detected, resolve in dependency order.\n\n' +
        'Gap types and resolution paths:\n' +
        '  MISSING_FABRIC_INTERFACE → autonomouslyResolvable: true\n' +
        '    Resolution: convergence.handler builds NODE for the interface,\n' +
        '    multi-generate produces the interface code, arbiter panel validates.\n' +
        '    Result: new entry in xiigen-fabric-registry with status ACTIVE.\n\n' +
        '  MACHINE_CONSTANT_AT_SPEC → autonomouslyResolvable: true\n' +
        '    Resolution: register FREEDOM config key with safe default.\n' +
        '    No convergence needed — this is a CONVENTION-level fix.\n\n' +
        '  OVERLAP_DETECTED → autonomouslyResolvable: false\n' +
        '    Resolution: escalate to human. BUSINESS_RULE decision required.\n' +
        '    Capture decision as ARCHITECTURE-DECISIONS.json entry.\n\n' +
        'ORDERING: OVERLAP_DETECTED decisions must resolve before MISSING_FABRIC_INTERFACE\n' +
        'generations — the overlap decision determines whether a new interface is needed\n' +
        'or whether the existing one should be reused.\n\n' +
        'TRAINING VALUE: Every autonomous prerequisite resolution produces a Tier 1\n' +
        'DESIGN_REASONING triple. After 20 resolutions, the engine retrieves the pattern\n' +
        'from RAG and skips convergence for straightforward interfaces.',
      qualityScore: 0.85,
      qualityDataPoints: 0,
      usageCount: 0,
      createdBy: 'SS-05-RAG-seed',
    },
  },
];

let allSeeded = true;

for (const pattern of PATTERNS) {
  try {
    const res = await fetch(
      `${esUrl}/xiigen-rag-patterns/_doc/${encodeURIComponent(pattern.id)}`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pattern.doc),
      }
    );
    const data = await res.json();
    console.log(`  ${data.result === 'created' || data.result === 'updated' ? '✓' : '✗'} ${pattern.id} (${data.result})`);
    if (!res.ok) allSeeded = false;
  } catch (err) {
    console.error(`  ✗ ${pattern.id}: ${err.message}`);
    allSeeded = false;
  }
}

if (!allSeeded) {
  console.error('Some patterns failed to seed');
  process.exit(1);
}
console.log('All 3 SS-05 RAG patterns seeded ✓');
process.exit(0);
