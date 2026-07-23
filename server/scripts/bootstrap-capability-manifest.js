#!/usr/bin/env node
/**
 * XIIGen Bootstrap Capability Manifest Scanner
 *
 * Reads the live codebase and populates:
 *   - xiigen-capability-manifest  (all capability types)
 *   - xiigen-fabric-registry      (fabric interfaces + aliases)
 *
 * Safe to re-run: uses upsert (doc_as_upsert) so existing entries are updated,
 * not duplicated. Treat output as a first-pass that requires verification.
 *
 * Usage:
 *   node bootstrap-capability-manifest.js [projectRoot] [esUrl]
 *   bash bootstrap-capability-manifest.sh   (delegates here)
 */

import { readdirSync, readFileSync } from 'node:fs';
import { join, basename, relative } from 'node:path';

const projectRoot = process.argv[2] || process.cwd();
const esUrl = process.argv[3] || 'http://localhost:9200';
const timestamp = new Date().toISOString();

const fabricsDir = join(projectRoot, 'server', 'src', 'fabrics');
const handlersDir = join(projectRoot, 'server', 'src', 'engine');

console.log('=== XIIGen Bootstrap Manifest Scan ===');
console.log(`ES: ${esUrl}`);
console.log(`Timestamp: ${timestamp}`);
console.log('');

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

async function upsert(index, id, doc) {
  const url = `${esUrl.replace(/\/$/, '')}/${index}/_update/${encodeURIComponent(id)}`;
  const body = JSON.stringify({ doc, doc_as_upsert: true });
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`ES upsert failed for ${index}/${id}: ${res.status} ${text}`);
  }
}

function findFiles(dir, pattern) {
  const results = [];
  try {
    const entries = readdirSync(dir, { withFileTypes: true, recursive: true });
    for (const entry of entries) {
      if (entry.isFile() && pattern.test(entry.name)) {
        results.push(join(entry.parentPath ?? entry.path ?? dir, entry.name));
      }
    }
  } catch {
    // Directory may not exist — silently skip
  }
  return results;
}

async function getEsIndices() {
  try {
    const res = await fetch(`${esUrl.replace(/\/$/, '')}/_cat/indices/xiigen-*?h=index`);
    if (!res.ok) return [];
    const text = await res.text();
    return text.split('\n').map(l => l.trim()).filter(Boolean);
  } catch {
    return [];
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 1: Scan fabric interfaces
// ─────────────────────────────────────────────────────────────────────────────

console.log('--- Scanning fabric interfaces ---');
let fabricCount = 0;

const interfaceFiles = findFiles(fabricsDir, /\.interface\.(ts|js)$/);

for (const filePath of interfaceFiles) {
  const content = readFileSync(filePath, 'utf-8');
  const relPath = relative(projectRoot, filePath).replace(/\\/g, '/');

  // Extract injection tokens: export const DATABASE_SERVICE = '...'
  const tokenMatches = [...content.matchAll(/export\s+const\s+([A-Z][A-Z0-9_]+)\s*=/g)];
  // Extract interface name: export interface IDatabaseService
  const ifaceMatch = content.match(/export\s+(?:interface|abstract\s+class)\s+(I[A-Za-z]+(?:Service|Provider|Pool))/);
  // Extract methods: methodName( or abstract methodName(
  const methodMatches = [...content.matchAll(/(?:abstract\s+)?([a-z][a-zA-Z0-9]+)\s*\(/g)];
  const methods = [...new Set(methodMatches.map(m => m[1]))].filter(m => m !== 'constructor');

  const ifaceName = ifaceMatch?.[1] ?? '';

  for (const tokenMatch of tokenMatches) {
    const token = tokenMatch[1];
    if (!token || token === 'undefined' || token === 'null') continue;

    const resolvedIfaceName = ifaceName || token;

    // Derive human-readable alias from interface name
    const humanReadable = resolvedIfaceName
      .replace(/^I/, '')
      .replace(/(?:Service|Provider|Pool)$/, '')
      .replace(/([A-Z])/g, ' $1')
      .trim()
      .toLowerCase();

    const category = token.replace(/_SERVICE$/, '').replace(/_PROVIDER$/, '').replace(/_POOL$/, '');

    const aliases = [humanReadable, resolvedIfaceName, token].filter(Boolean);

    try {
      await upsert('xiigen-fabric-registry', token, {
        interfaceToken: token,
        interfaceName: resolvedIfaceName,
        serviceCategory: category,
        aliases,
        status: 'ACTIVE',
        sourceFile: relPath,
        methods,
        registeredAt: timestamp,
      });

      await upsert('xiigen-capability-manifest', token, {
        capability: resolvedIfaceName,
        type: 'FABRIC_INTERFACE',
        status: 'ACTIVE',
        detectedAt: timestamp,
        lastVerifiedAt: timestamp,
        source: 'bootstrap-scan',
      });

      console.log(`  [FABRIC] ${token} → ${resolvedIfaceName} (${category})`);
      fabricCount++;
    } catch (err) {
      console.error(`  [ERROR] ${token}: ${err.message}`);
    }
  }
}

console.log(`  Total fabric interfaces: ${fabricCount}`);

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 2: Scan handler types
// ─────────────────────────────────────────────────────────────────────────────

console.log('');
console.log('--- Scanning handler types ---');
let handlerCount = 0;

const handlerFiles = findFiles(handlersDir, /\.handler\.(ts|js)$/);

for (const filePath of handlerFiles) {
  const handlerName = basename(filePath).replace(/\.handler\.(ts|js)$/, '');

  try {
    await upsert('xiigen-capability-manifest', `handler-${handlerName}`, {
      capability: `${handlerName}.handler`,
      type: 'HANDLER_TYPE',
      status: 'ACTIVE',
      detectedAt: timestamp,
      lastVerifiedAt: timestamp,
      source: 'bootstrap-scan',
    });

    console.log(`  [HANDLER] ${handlerName}.handler`);
    handlerCount++;
  } catch (err) {
    console.error(`  [ERROR] ${handlerName}: ${err.message}`);
  }
}

console.log(`  Total handlers: ${handlerCount}`);

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 3: Scan ES indices
// ─────────────────────────────────────────────────────────────────────────────

console.log('');
console.log('--- Scanning ES indices ---');
let indexCount = 0;

const xiigenIndices = await getEsIndices();
for (const idx of xiigenIndices) {
  try {
    await upsert('xiigen-capability-manifest', `index-${idx}`, {
      capability: idx,
      type: 'ES_INDEX',
      status: 'ACTIVE',
      detectedAt: timestamp,
      lastVerifiedAt: timestamp,
      source: 'bootstrap-scan',
    });

    console.log(`  [INDEX] ${idx}`);
    indexCount++;
  } catch (err) {
    console.error(`  [ERROR] ${idx}: ${err.message}`);
  }
}

console.log(`  Total indices: ${indexCount}`);

// ─────────────────────────────────────────────────────────────────────────────
// SUMMARY
// ─────────────────────────────────────────────────────────────────────────────

console.log('');
console.log('=== Bootstrap Complete ===');
console.log(`Fabric interfaces: ${fabricCount}`);
console.log(`Handler types:     ${handlerCount}`);
console.log(`ES indices:        ${indexCount}`);
console.log(`Total manifest entries: ${fabricCount + handlerCount + indexCount}`);

const manifestRes = await fetch(`${esUrl.replace(/\/$/, '')}/xiigen-capability-manifest/_count`);
const registryRes = await fetch(`${esUrl.replace(/\/$/, '')}/xiigen-fabric-registry/_count`);

if (manifestRes.ok && registryRes.ok) {
  const manifestData = await manifestRes.json();
  const registryData = await registryRes.json();
  console.log(`Manifest index count: ${manifestData.count}`);
  console.log(`Fabric registry count: ${registryData.count}`);
}
