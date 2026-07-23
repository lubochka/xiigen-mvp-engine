#!/usr/bin/env node
/**
 * resize-oversized-pngs.js
 *
 * Scans docs/e2e-snapshots/visual-audit/ for PNGs that exceed 1999px on either
 * dimension, and resizes them in-place to fit within 1999px (preserving aspect
 * ratio). Required so subagents can ingest the PNGs for visual scoring —
 * Anthropic's many-image API limit is 2000px per dimension.
 */
// sharp installed in client/node_modules; resolve via explicit path
const sharp = require(require('path').resolve(__dirname, '..', 'client', 'node_modules', 'sharp'));
const fs = require('fs');
const path = require('path');

const MAX_DIM = 1999;

function walkDir(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walkDir(full));
    else if (entry.name.endsWith('.png')) out.push(full);
  }
  return out;
}

async function main() {
  const root = path.resolve(__dirname, '..', 'docs', 'e2e-snapshots', 'visual-audit');
  if (!fs.existsSync(root)) {
    console.error('root not found:', root);
    process.exit(1);
  }
  const files = walkDir(root);
  console.log('scanning', files.length, 'PNGs...');
  let resized = 0, errors = 0, skipped = 0;
  for (const f of files) {
    try {
      const meta = await sharp(f).metadata();
      if (meta.width <= MAX_DIM && meta.height <= MAX_DIM) {
        skipped++;
        continue;
      }
      // preserve aspect; fit within MAX_DIM on whichever is larger
      const buf = await sharp(f).resize({
        width: meta.width > meta.height ? MAX_DIM : undefined,
        height: meta.height >= meta.width ? MAX_DIM : undefined,
        fit: 'inside',
        withoutEnlargement: true,
      }).png().toBuffer();
      fs.writeFileSync(f, buf);
      resized++;
      if (resized % 20 === 0) console.log('resized', resized);
    } catch (e) {
      errors++;
      console.error('err', f, e.message);
    }
  }
  console.log('DONE. resized:', resized, 'skipped:', skipped, 'errors:', errors);
}

main();
