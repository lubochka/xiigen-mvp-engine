#!/usr/bin/env node
/**
 * verify-integration-env.js — Pre-flight security check for E2E runs.
 *
 * ONLY checks security conditions. Missing API keys are INFO, not failures.
 * EXIT 1 only for git-tracking violations (keys committed to git).
 *
 * Run from repo root: node scripts/verify-integration-env.js
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
let exitCode = 0;

function fail(msg) {
  console.error(`\nSECURITY FAILURE: ${msg}\n`);
  exitCode = 1;
}

function readGitignore() {
  const p = path.join(ROOT, '.gitignore');
  return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : '';
}

function isGitTracked(relPath) {
  try {
    const result = execSync(`git ls-files "${relPath}"`, { cwd: ROOT }).toString().trim();
    return result.length > 0;
  } catch {
    return false;
  }
}

// ── Security checks (EXIT 1 on failure) ──────────────────────────────────────

// 1. If secrets/api-keys.txt exists, it must NOT be git-tracked
if (fs.existsSync(path.join(ROOT, 'secrets/api-keys.txt'))) {
  if (isGitTracked('secrets/api-keys.txt')) {
    fail('secrets/api-keys.txt is tracked by git!\n  Fix: git rm --cached secrets/api-keys.txt');
  }
} else {
  console.log('INFO: No secrets/api-keys.txt — AI tests will use MockAiProvider');
}

// 2. .gitignore must contain secrets/ entry
if (!readGitignore().includes('secrets/')) {
  fail('.gitignore is missing "secrets/" entry');
}

// 3. .gitignore must contain .env.e2e entry
if (!readGitignore().includes('.env.e2e')) {
  fail('.gitignore is missing ".env.e2e" entry');
}

// 4. .env.e2e-session must NOT be git-tracked
if (fs.existsSync(path.join(ROOT, '.env.e2e-session'))) {
  if (isGitTracked('.env.e2e-session')) {
    fail('.env.e2e-session is tracked by git!\n  Fix: git rm --cached .env.e2e-session');
  }
}

// ── Info checks (no exit) ─────────────────────────────────────────────────────

const keysFile = path.join(ROOT, 'secrets/api-keys.txt');
if (fs.existsSync(keysFile)) {
  const content = fs.readFileSync(keysFile, 'utf8');
  const lines = content.split('\n').filter(l => l.includes('=') && !l.startsWith('#'));
  const keys = {};
  lines.forEach(l => {
    const [k, ...v] = l.split('=');
    keys[k.trim()] = v.join('=').trim();
  });

  if (keys.ANTHROPIC_API_KEY && keys.ANTHROPIC_API_KEY.startsWith('sk-ant-api03-xxxxx')) {
    console.warn('INFO: ANTHROPIC_API_KEY is placeholder — Anthropic tests will use MockAiProvider');
  }
  if (keys.GEMINI_API_KEY && keys.GEMINI_API_KEY.startsWith('AIzaSyxxxxx')) {
    console.warn('INFO: GEMINI_API_KEY is placeholder — Gemini tests will use MockAiProvider');
  }
}

// ── Result ────────────────────────────────────────────────────────────────────

if (exitCode === 0) {
  console.log('\nSecurity check PASSED — safe to run E2E tests\n');
}
process.exit(exitCode);
