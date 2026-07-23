/**
 * naming-lint.js — Enforces SK-430 naming conventions for engine files.
 *
 * Business purpose: The XIIGen engine generates production code used by
 * tenant microservices. If the engine's own files are named by flow numbers
 * rather than domain names, new developers cannot understand what they're
 * looking at. This script prevents regression to flow-number naming.
 *
 * Rules enforced:
 *   Rule 1: engine-contracts/ files must not use flow-number prefixes
 *   Rule 2: engine/flows/ directories must not use flow-number prefixes
 *   Rule 6: .ts files in engine-contracts/ must not contain FLOW{NN}_* constants
 *
 * Authoritative table: DECISIONS-LOCKED.md → D-NAMING-1
 * Skill: SK-430 NamingConventionsEnforcer
 *
 * Run:    node scripts/naming-lint.js
 * Exit 0: all checks pass
 * Exit 1: violations found — fix before committing
 */

'use strict';

const fs   = require('fs');
const path = require('path');

const ROOT         = path.join(__dirname, '..');
const CONTRACTS    = path.join(ROOT, 'src', 'engine-contracts');
const FLOWS_DIR    = path.join(ROOT, 'src', 'engine', 'flows');

const FLOW_NUM_FILE  = /^flow\d+/;
const FLOW_NUM_DIR   = /^flow\d+$/;
const FLOW_CONST     = /\bconst\s+FLOW\d+_/;

const violations = [];

// ── Rule 1: engine-contracts/ filenames ──────────────────────────────────

if (fs.existsSync(CONTRACTS)) {
  fs.readdirSync(CONTRACTS).forEach(entry => {
    if (FLOW_NUM_FILE.test(entry)) {
      violations.push(
        `[Rule 1] engine-contracts/${entry}\n` +
        `  ✗ File uses flow-number prefix.\n` +
        `  ✓ Rename to domain name per D-NAMING-1 in DECISIONS-LOCKED.md.\n` +
        `  Example: flow35-contracts.ts → meta-arbitration-engine-contracts.ts`
      );
    }
  });
} else {
  console.warn(`⚠️  engine-contracts/ not found at ${CONTRACTS} — skipping Rule 1`);
}

// ── Rule 2: engine/flows/ directory names ────────────────────────────────

if (fs.existsSync(FLOWS_DIR)) {
  fs.readdirSync(FLOWS_DIR).forEach(entry => {
    const fullPath = path.join(FLOWS_DIR, entry);
    if (fs.statSync(fullPath).isDirectory() && FLOW_NUM_DIR.test(entry)) {
      violations.push(
        `[Rule 2] engine/flows/${entry}/\n` +
        `  ✗ Directory uses flow-number prefix.\n` +
        `  ✓ Rename to domain name per D-NAMING-1 in DECISIONS-LOCKED.md.\n` +
        `  Example: engine/flows/flow35/ → engine/flows/meta-arbitration-engine/`
      );
    }
  });
} else {
  console.warn(`⚠️  engine/flows/ not found at ${FLOWS_DIR} — skipping Rule 2`);
}

// ── Rule 6: no FLOW{NN}_* constants in engine-contracts/ TS files ────────

if (fs.existsSync(CONTRACTS)) {
  fs.readdirSync(CONTRACTS)
    .filter(f => f.endsWith('.ts'))
    .forEach(file => {
      const content = fs.readFileSync(path.join(CONTRACTS, file), 'utf8');
      const lines   = content.split('\n');
      lines.forEach((line, idx) => {
        if (FLOW_CONST.test(line)) {
          const match = line.match(/const\s+(FLOW\d+_\w+)/);
          const name  = match ? match[1] : 'FLOW{NN}_*';
          violations.push(
            `[Rule 6] engine-contracts/${file}:${idx + 1}\n` +
            `  ✗ Constant '${name}' uses flow-number prefix.\n` +
            `  ✓ Rename to domain prefix per D-NAMING-1.\n` +
            `  Example: FLOW35_QUALITY_GATES → META_ARBITRATION_ENGINE_QUALITY_GATES`
          );
        }
      });
    });
}

// ── Report ────────────────────────────────────────────────────────────────

if (violations.length === 0) {
  console.log('✅ naming-lint PASSED — all file and directory names comply with SK-430.');
  process.exit(0);
} else {
  console.error(`\n❌ naming-lint FAILED — ${violations.length} violation(s):\n`);
  violations.forEach((v, i) => {
    console.error(`--- Violation ${i + 1} ---`);
    console.error(v);
    console.error('');
  });
  console.error(
    `Fix all violations, then re-run: node scripts/naming-lint.js\n` +
    `Reference: SK-430-SKILL.md and DECISIONS-LOCKED.md → D-NAMING-1\n`
  );
  process.exit(1);
}
