/**
 * seed-data.ts — Pre-seed test data via server API.
 *
 * Pattern from WordPress plugin: seed data AFTER server health passes,
 * BEFORE any browser test runs.
 *
 * Seeds:
 * - Two test tenants (e2e-tenant-A, e2e-tenant-B)
 *
 * Note: The XIIGen server uses MockAiProvider by default — no real providers
 * needed for UI E2E tests. Generation returns mock data.
 */

export const E2E_TENANT_A = 'e2e-tenant-A';
export const E2E_TENANT_B = 'e2e-tenant-B';

/** Seed test data via the server API. */
export async function seedTestData(serverUrl: string): Promise<void> {
  console.log('  📦 Seeding test data...');

  // Seed tenant-A
  await ensureTenant(serverUrl, E2E_TENANT_A, 'E2E Tenant A');

  // Seed tenant-B
  await ensureTenant(serverUrl, E2E_TENANT_B, 'E2E Tenant B');

  console.log('  ✓ Test data seeded (tenant-A, tenant-B)');
}

async function ensureTenant(serverUrl: string, tenantId: string, name: string): Promise<void> {
  try {
    const createRes = await fetch(`${serverUrl}/tenants`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-Id': 'system',
      },
      body: JSON.stringify({
        id: tenantId,
        name,
        status: 'active',
      }),
      signal: AbortSignal.timeout(5000),
    });

    if (createRes.ok) return; // created successfully

    const body = await createRes.text();
    // 409 = already exists (race condition); 500+DUPLICATE_NAME = server-side duplicate guard
    if (createRes.status === 409 || body.includes('DUPLICATE_NAME')) return;

    console.warn(`  ⚠️  Could not create tenant ${tenantId}: HTTP ${createRes.status} ${body.substring(0, 100)}`);
  } catch (err) {
    // Non-fatal: seed failure shouldn't block tests
    console.warn(`  ⚠️  Seed failed for tenant ${tenantId}: ${err}`);
  }
}
