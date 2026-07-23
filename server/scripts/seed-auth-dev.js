#!/usr/bin/env node
/**
 * FLOW-01 Phase A5 (V-07) — Seed development auth users.
 *
 * Seeds 6 dev/test users (3 roles × 2 tenants) into Elasticsearch so the
 * Phase B1 42-cell HTTP auth matrix has real credentials to hit.
 *
 *   Tenant  | Role            | Email                             | user_id
 *   --------+-----------------+-----------------------------------+------------------
 *   xiigen  | platform-admin  | platform-admin@xiigen.test        | u-pa-xiigen
 *   xiigen  | tenant-admin    | tenant-admin@xiigen.test          | u-ta-xiigen
 *   xiigen  | tenant-user     | tenant-user@xiigen.test           | u-tu-xiigen
 *   acme    | platform-admin  | platform-admin@acme.test          | u-pa-acme
 *   acme    | tenant-admin    | tenant-admin@acme.test            | u-ta-acme
 *   acme    | tenant-user     | tenant-user@acme.test             | u-tu-acme
 *
 * Dev password for all six: Password123!
 * Hashed with bcryptjs rounds=12 (matches BcryptPasswordHasherProvider).
 *
 * Records land in two indices:
 *   xiigen-user-registrations
 *     { user_id, email, tenant_id, credentials_hash, status: 'verified', roles: [...] }
 *   xiigen-platform-roles (only for u-pa-* users)
 *     { user_id, roles: ['platform-admin'], tenant_id: 'xiigen-master-...', granted_at, granted_by }
 *
 * Idempotent: uses PUT /{index}/_doc/{user_id} — reruns overwrite the doc in place.
 *
 * Usage:
 *   node seed-auth-dev.js [esUrl] [--dry-run]
 *   node seed-auth-dev.js http://localhost:9200
 *   node seed-auth-dev.js --dry-run               # prints intent, skips all HTTP
 *
 * Exit code: 0 = all seeded (or dry-run succeeded), 1 = any PUT failed.
 *
 * WARNING: dev/test seed only. Never run against a real deployment — the
 * shared dev password becomes a permanent credential in whatever ES cluster
 * this script points at.
 */

const bcrypt = require('bcryptjs');

// ── CLI args ────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const esUrl = (args.find((a) => !a.startsWith('--')) || 'http://localhost:9200').replace(
  /\/$/,
  '',
);

// ── Constants (must match server/src/... exports) ───────────────────────────

const USERS_INDEX = 'xiigen-user-registrations';
const PLATFORM_ROLES_INDEX = 'xiigen-platform-roles';
const MASTER_TENANT_ID = 'xiigen-master-00000000-0000-0000-0000-000000000001';
const BCRYPT_ROUNDS = 12;
const DEV_PASSWORD = 'Password123!';

const ROLE_PLATFORM_ADMIN = 'platform-admin';
const ROLE_TENANT_ADMIN = 'tenant-admin';
const ROLE_TENANT_USER = 'tenant-user';

// ── Seed matrix ─────────────────────────────────────────────────────────────

const USERS = [
  // xiigen tenant (master tenant)
  {
    user_id: 'u-pa-xiigen',
    email: 'platform-admin@xiigen.test',
    tenant_id: MASTER_TENANT_ID,
    roles: [ROLE_TENANT_ADMIN], // tenant-level role on user record
    platformElevation: true, // also gets row in PLATFORM_ROLES_INDEX
    label: 'xiigen / platform-admin',
  },
  {
    user_id: 'u-ta-xiigen',
    email: 'tenant-admin@xiigen.test',
    tenant_id: MASTER_TENANT_ID,
    roles: [ROLE_TENANT_ADMIN],
    platformElevation: false,
    label: 'xiigen / tenant-admin',
  },
  {
    user_id: 'u-tu-xiigen',
    email: 'tenant-user@xiigen.test',
    tenant_id: MASTER_TENANT_ID,
    roles: [ROLE_TENANT_USER],
    platformElevation: false,
    label: 'xiigen / tenant-user',
  },
  // acme tenant (regular tenant)
  {
    user_id: 'u-pa-acme',
    email: 'platform-admin@acme.test',
    tenant_id: 'acme',
    roles: [ROLE_TENANT_ADMIN],
    platformElevation: true,
    label: 'acme / platform-admin',
  },
  {
    user_id: 'u-ta-acme',
    email: 'tenant-admin@acme.test',
    tenant_id: 'acme',
    roles: [ROLE_TENANT_ADMIN],
    platformElevation: false,
    label: 'acme / tenant-admin',
  },
  {
    user_id: 'u-tu-acme',
    email: 'tenant-user@acme.test',
    tenant_id: 'acme',
    roles: [ROLE_TENANT_USER],
    platformElevation: false,
    label: 'acme / tenant-user',
  },
];

// ── HTTP helper ─────────────────────────────────────────────────────────────

async function putDoc(index, id, body) {
  if (dryRun) {
    console.log(`  [dry-run] PUT ${esUrl}/${index}/_doc/${id}`);
    return { result: 'dry-run', ok: true };
  }
  const res = await fetch(`${esUrl}/${index}/_doc/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  return { result: data.result ?? 'unknown', ok: res.ok, status: res.status, data };
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`FLOW-01 Phase A5 — seeding dev auth users`);
  console.log(`  ES endpoint: ${esUrl}`);
  console.log(`  Dry run:     ${dryRun ? 'yes' : 'no'}`);
  console.log(`  Users:       ${USERS.length}`);
  console.log('');

  console.log('Hashing dev password (bcrypt rounds=12) ...');
  const credentialsHash = dryRun
    ? '$2b$12$dryrundryrundryrundryrundryrundryrundryrundryrundry'
    : await bcrypt.hash(DEV_PASSWORD, BCRYPT_ROUNDS);
  console.log(`  → ${credentialsHash.slice(0, 29)}... (${credentialsHash.length} chars)`);
  console.log('');

  let allOk = true;
  const now = new Date().toISOString();

  for (const user of USERS) {
    console.log(`[${user.label}]`);

    // 1. User registration record
    const userDoc = {
      user_id: user.user_id,
      email: user.email,
      tenant_id: user.tenant_id,
      credentials_hash: credentialsHash,
      status: 'verified',
      roles: user.roles,
      created_at: now,
      updated_at: now,
      created_by: 'seed-auth-dev',
    };
    const userPut = await putDoc(USERS_INDEX, user.user_id, userDoc);
    console.log(
      `  ${userPut.ok ? '✓' : '✗'} ${USERS_INDEX}/${user.user_id} (${userPut.result})`,
    );
    if (!userPut.ok) {
      allOk = false;
      if (userPut.data && userPut.data.error) {
        console.log(`    error: ${JSON.stringify(userPut.data.error).slice(0, 200)}`);
      }
    }

    // 2. Platform-admin elevation record (only for u-pa-* users)
    if (user.platformElevation) {
      const platformDoc = {
        user_id: user.user_id,
        roles: [ROLE_PLATFORM_ADMIN],
        tenant_id: MASTER_TENANT_ID,
        granted_at: now,
        granted_by: 'seed-auth-dev',
      };
      const platformPut = await putDoc(PLATFORM_ROLES_INDEX, user.user_id, platformDoc);
      console.log(
        `  ${platformPut.ok ? '✓' : '✗'} ${PLATFORM_ROLES_INDEX}/${user.user_id} (${platformPut.result})`,
      );
      if (!platformPut.ok) {
        allOk = false;
        if (platformPut.data && platformPut.data.error) {
          console.log(
            `    error: ${JSON.stringify(platformPut.data.error).slice(0, 200)}`,
          );
        }
      }
    }
    console.log('');
  }

  // ── Summary table ─────────────────────────────────────────────────────────

  console.log('Summary:');
  console.log('  tenant                 role             email                          user_id');
  console.log('  ---------------------- ---------------- ------------------------------ ------------');
  for (const u of USERS) {
    const tenantShort =
      u.tenant_id === MASTER_TENANT_ID ? 'xiigen-master (master)' : u.tenant_id;
    const effectiveRole = u.platformElevation ? ROLE_PLATFORM_ADMIN : u.roles[0];
    console.log(
      `  ${tenantShort.padEnd(22)} ${effectiveRole.padEnd(16)} ${u.email.padEnd(30)} ${u.user_id}`,
    );
  }
  console.log('');
  console.log(`  Dev password for all six: ${DEV_PASSWORD}`);
  console.log('');

  if (!allOk) {
    console.error('✗ One or more seed writes failed.');
    process.exit(1);
  }
  console.log(
    dryRun
      ? '✓ Dry run complete — no writes performed.'
      : '✓ All 6 users seeded (and 2 platform-admin elevations).',
  );
  process.exit(0);
}

main().catch((err) => {
  console.error(`Fatal error: ${err && err.message ? err.message : String(err)}`);
  if (err && err.stack) console.error(err.stack);
  process.exit(1);
});
