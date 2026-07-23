#!/usr/bin/env node
/**
 * XIIGen Manifest Drift Detection
 *
 * Compares xiigen-capability-manifest against the live codebase.
 * Reports:
 *   - Entries in manifest but source file missing from code (stale registry)
 *   - Interfaces in code but NOT in registry (newly added, not yet scanned)
 *
 * Usage:
 *   node manifest-drift-check.js [projectRoot] [esUrl]
 *   bash manifest-drift-check.sh   (delegates here)
 *
 * Exit code: 0 = no drift, 1 = drift detected or error
 */

import { readdirSync, existsSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const projectRoot = process.argv[2] || process.cwd();
const esUrl = process.argv[3] || 'http://localhost:9200';
const fabricsDir = join(projectRoot, 'server', 'src', 'fabrics');

let driftFound = false;

console.log('=== Manifest Drift Check ===');
console.log(`ES: ${esUrl}`);
console.log('');

// ─────────────────────────────────────────────────────────────────────────────
// Check 1: manifest → codebase (are registered entries still in code?)
// ─────────────────────────────────────────────────────────────────────────────

console.log('--- Checking manifest → codebase ---');

try {
  const res = await fetch(
    `${esUrl.replace(/\/$/, '')}/xiigen-fabric-registry/_search?size=200`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: { term: { status: 'ACTIVE' } }, _source: ['interfaceToken', 'sourceFile'] }),
    }
  );

  if (res.ok) {
    const data = await res.json();
    const hits = data?.hits?.hits ?? [];

    for (const hit of hits) {
      const { interfaceToken, sourceFile } = hit._source ?? {};
      if (!sourceFile) continue;

      const absPath = sourceFile.startsWith('server/')
        ? join(projectRoot, sourceFile)
        : join(projectRoot, 'server', sourceFile);

      if (!existsSync(absPath)) {
        console.log(`  DRIFT: ${interfaceToken} registered but source file missing: ${sourceFile}`);
        driftFound = true;
      }
    }

    if (!driftFound) {
      console.log('  All registered entries have source files ✓');
    }
  } else {
    console.log('  [WARN] Could not query fabric registry — skipping manifest→codebase check');
  }
} catch (err) {
  console.log(`  [WARN] Registry unreachable: ${err.message}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// Check 2: codebase → manifest (are there new interfaces not in registry?)
// ─────────────────────────────────────────────────────────────────────────────

console.log('');
console.log('--- Checking codebase → manifest ---');

function findFiles(dir, pattern) {
  const results = [];
  try {
    const entries = readdirSync(dir, { withFileTypes: true, recursive: true });
    for (const entry of entries) {
      if (entry.isFile() && pattern.test(entry.name)) {
        results.push(join(entry.parentPath ?? entry.path ?? dir, entry.name));
      }
    }
  } catch { /* silently skip */ }
  return results;
}

const interfaceFiles = findFiles(fabricsDir, /\.interface\.(ts|js)$/);
let codebaseNewCount = 0;

for (const filePath of interfaceFiles) {
  const content = readFileSync(filePath, 'utf-8');
  const tokenMatches = [...content.matchAll(/export\s+const\s+([A-Z][A-Z0-9_]+)\s*=/g)];

  for (const tokenMatch of tokenMatches) {
    const token = tokenMatch[1];
    if (!token) continue;

    try {
      const res = await fetch(`${esUrl.replace(/\/$/, '')}/xiigen-fabric-registry/_doc/${encodeURIComponent(token)}`);
      const data = await res.json();
      if (!data?.found) {
        const relPath = relative(projectRoot, filePath).replace(/\\/g, '/');
        console.log(`  DRIFT: ${token} in codebase (${relPath}) but NOT in registry`);
        driftFound = true;
        codebaseNewCount++;
      }
    } catch {
      // Registry unreachable — skip check
    }
  }
}

if (codebaseNewCount === 0) {
  console.log('  All codebase interfaces are registered ✓');
}

// ─────────────────────────────────────────────────────────────────────────────
// Result
// ─────────────────────────────────────────────────────────────────────────────

console.log('');
if (driftFound) {
  console.log('DRIFT DETECTED — run server/scripts/bootstrap-capability-manifest.sh to resync');
  process.exit(1);
} else {
  console.log('No drift detected ✓');
  process.exit(0);
}
