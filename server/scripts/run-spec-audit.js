#!/usr/bin/env node
/**
 * XIIGen Spec Audit CLI
 *
 * Run spec audit against a file or stdin.
 * Queries xiigen-fabric-registry directly to find missing dependencies.
 *
 * Usage:
 *   node run-spec-audit.js <spec-file>
 *   echo "Auth Service calls User Service" | node run-spec-audit.js
 *   bash server/scripts/run-spec-audit.sh <spec-file>
 *
 * Exit code: 0 = CLEAN, 1 = BLOCKING_GAPS or error, 2 = GAPS_FOUND (warnings only)
 */

import { readFileSync } from 'node:fs';

const esUrl = (process.env.ES_URL || 'http://localhost:9200').replace(/\/$/, '');

// ── Read spec content ──

let specContent = '';
let specId = '';

if (process.argv[2] && process.argv[2] !== '-') {
  try {
    specContent = readFileSync(process.argv[2], 'utf-8');
    specId = `file:${process.argv[2]}`;
  } catch (err) {
    console.error(`Cannot read file: ${process.argv[2]}: ${err.message}`);
    process.exit(1);
  }
} else {
  // Read from stdin
  specContent = readFileSync('/dev/stdin', 'utf-8');
  specId = `stdin:${Date.now()}`;
}

console.log('=== XIIGen Spec Audit ===');
console.log(`Spec: ${specId}`);
console.log(`ES:   ${esUrl}`);
console.log('');

// ── Pass 1: Extract services from Actors:/Services:/Components: lines ──

function extractServiceReferences(content) {
  const refs = [];
  const seen = new Set();

  // Pass 1: Actors/Services/Components lines
  const actorsPattern = /(?:Actors?|Services?|Components?)\s*:\s*([^\n]+)/gi;
  let listMatch;
  while ((listMatch = actorsPattern.exec(content)) !== null) {
    const listLine = listMatch[1];
    const entries = listLine.split(',').map(e => e.trim()).filter(Boolean);
    for (const entry of entries) {
      const key = entry.toLowerCase();
      if (!seen.has(key) && entry.length > 1) {
        seen.add(key);
        refs.push({ name: entry, source: 'actors-list' });
      }
    }
  }

  // Pass 2: "X Service" / "X Provider" / "X Gateway" patterns in prose
  const servicePattern = /([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)*)\s+(?:Service|Provider|Gateway|Engine)/g;
  let match;
  while ((match = servicePattern.exec(content)) !== null) {
    const fullName = match[0].trim();
    const key = fullName.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      refs.push({ name: fullName, source: 'prose-pattern' });
    }
  }

  return refs;
}

// ── Check each reference against the fabric registry ──

async function checkFabricRegistry(name) {
  try {
    const normalizedName = name.toLowerCase().replace(/\s+/g, ' ').trim();
    const res = await fetch(`${esUrl}/xiigen-fabric-registry/_search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: {
          bool: {
            should: [
              { match: { aliases: normalizedName } },
              { match: { aliases: name } },
              { term: { interfaceName: `I${name.replace(/\s+/g, '')}` } },
              { term: { interfaceToken: name.replace(/\s+/g, '_').toUpperCase() } },
            ],
            minimum_should_match: 1,
          },
        },
        size: 1,
      }),
    });

    if (!res.ok) return { found: false };

    const data = await res.json();
    if ((data.hits?.total?.value ?? 0) > 0) {
      const src = data.hits.hits[0]._source;
      return { found: true, token: src.interfaceToken, name: src.interfaceName, status: src.status };
    }
    return { found: false };
  } catch {
    // Fail-conservative: registry unreachable → not found
    return { found: false, unreachable: true };
  }
}

// ── Scan for MACHINE constant candidates ──

function scanForConstants(content) {
  const candidates = [];

  // Formula weights
  const weightPattern = /(\w[\w\s]*)\s*[×*]\s*(0\.\d+)/g;
  let match;
  while ((match = weightPattern.exec(content)) !== null) {
    candidates.push({ value: match[2], type: 'FORMULA_WEIGHT', classification: 'FREEDOM_PARAM_REQUIRED' });
  }

  // Time constants
  const timePattern = /(\d+)\s*(seconds?|minutes?|hours?|days?|ms|milliseconds?)/gi;
  while ((match = timePattern.exec(content)) !== null) {
    candidates.push({ value: `${match[1]} ${match[2]}`, type: 'TIME_CONSTANT', classification: 'FREEDOM_PARAM_REQUIRED' });
  }

  // Threshold values
  const thresholdPattern = /(?:confidence|threshold|score|quality|minimum)\s*[><=]+\s*(0\.\d+)/gi;
  while ((match = thresholdPattern.exec(content)) !== null) {
    candidates.push({ value: match[1], type: 'THRESHOLD', classification: 'NEEDS_REVIEW' });
  }

  // Model names
  const modelPattern = /(?:gpt-4|claude|sonnet|opus|gemini|deepseek|llama|mistral)[\w.-]*/gi;
  while ((match = modelPattern.exec(content)) !== null) {
    candidates.push({ value: match[0], type: 'MODEL_NAME', classification: 'FREEDOM_PARAM_REQUIRED' });
  }

  return candidates;
}

// ── Main ──

const serviceRefs = extractServiceReferences(specContent);
console.log(`--- Service references extracted: ${serviceRefs.length} ---`);

const missing = [];
const found = [];
let registryUnreachable = false;

for (const ref of serviceRefs) {
  const result = await checkFabricRegistry(ref.name);
  if (result.unreachable) registryUnreachable = true;

  if (result.found) {
    console.log(`  ✓ ${ref.name} → ${result.token} (${result.status ?? 'ACTIVE'})`);
    found.push(ref.name);
  } else {
    console.log(`  ✗ ${ref.name} → MISSING (PREREQ_GAP: MISSING_FABRIC_INTERFACE)`);
    missing.push(ref.name);
  }
}

const constants = scanForConstants(specContent);
if (constants.length > 0) {
  console.log('');
  console.log(`--- MACHINE constant candidates: ${constants.length} ---`);
  for (const c of constants) {
    const icon = c.classification === 'FREEDOM_PARAM_REQUIRED' ? '⚠' : '?';
    console.log(`  ${icon} "${c.value}" (${c.type}) → ${c.classification}`);
  }
}

console.log('');
if (registryUnreachable) {
  console.log('[WARN] Fabric registry unreachable — results may be incomplete');
  console.log('');
}

if (missing.length > 0) {
  console.log(`VERDICT: BLOCKING_GAPS`);
  console.log(`  Missing interfaces (${missing.length}): ${missing.join(', ')}`);
  console.log(`  → Flow design blocked until missing interfaces are built (FLOW-PREREQ-02)`);
  process.exit(1);
} else if (constants.filter(c => c.classification === 'FREEDOM_PARAM_REQUIRED').length > 0) {
  console.log(`VERDICT: GAPS_FOUND`);
  console.log(`  All services have fabric interfaces ✓`);
  console.log(`  ${constants.length} FREEDOM config key(s) should be registered`);
  process.exit(2);
} else {
  console.log(`VERDICT: CLEAN`);
  console.log(`  All ${found.length} service(s) have fabric interfaces ✓`);
  process.exit(0);
}
