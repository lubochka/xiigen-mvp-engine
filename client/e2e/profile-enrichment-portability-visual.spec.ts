import { test, expect, type Locator, type Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SOURCE_EVIDENCE_DIR = path.join(
  __dirname,
  '..',
  '..',
  'docs',
  'portability',
  'flow-02',
  'visual-evidence',
  'phase-02-playwright',
  'tenant-user-source',
);

const TENANT_A_ADAPTED_DIR = path.join(
  __dirname,
  '..',
  '..',
  'docs',
  'portability',
  'flow-02',
  'visual-evidence',
  'phase-03-visual-examination',
  'tenant-a-v1.0.1',
);

const MARKETPLACE_EVIDENCE_DIR = path.join(
  __dirname,
  '..',
  '..',
  'docs',
  'portability',
  'flow-02',
  'visual-evidence',
  'marketplace',
);

const TENANT_B_INSTALLED_FROM_A_DIR = path.join(
  __dirname,
  '..',
  '..',
  'docs',
  'portability',
  'flow-02',
  'visual-evidence',
  'phase-05-tenant-b-installed-from-a',
);

const TENANT_B_ADAPTED_DIR = path.join(
  __dirname,
  '..',
  '..',
  'docs',
  'portability',
  'flow-02',
  'visual-evidence',
  'phase-05-tenant-b-v1.0.2',
);

const TENANT_C_INSTALLED_FROM_B_DIR = path.join(
  __dirname,
  '..',
  '..',
  'docs',
  'portability',
  'flow-02',
  'visual-evidence',
  'phase-05-tenant-c-installed-from-b',
);

const TENANT_C_ADAPTED_DIR = path.join(
  __dirname,
  '..',
  '..',
  'docs',
  'portability',
  'flow-02',
  'visual-evidence',
  'phase-05-tenant-c-v1.0.3',
);

const SOURCE_ROLE_MAP = {
  'tenant-user': [
    'questionnaire-form',
    'questionnaire-validation-error',
    'questionnaire-debounce-pending',
    'questionnaire-processing',
    'matching-in-progress',
    'matching-partial',
    'matching-complete',
    'personalization-feed',
    'personalization-completed-event',
    'personalization-degraded',
  ],
} as const;

const ADAPTED_ROLE_MAP = {
  'tenant-user': ['questionnaire-form', 'matching-complete', 'personalization-feed'],
  'tenant-admin': ['questionnaire-form', 'matching-complete', 'personalization-feed'],
  freelancer: ['questionnaire-form', 'matching-complete', 'personalization-feed'],
  'business-partner': ['questionnaire-form', 'matching-complete', 'personalization-feed'],
  'event-organiser': ['questionnaire-form', 'matching-complete', 'personalization-feed'],
} as const;

async function seedTenantUser(page: Page) {
  await page.addInitScript(() => {
    window.localStorage.setItem('xiigen.tenantId', 'default');
    window.localStorage.setItem('xiigen.tenantBrand', 'default');
    window.localStorage.setItem('xiigen.viewerRole', 'tenant-user');
  });
}

async function seedTenantAAdaptation(page: Page, role: string) {
  await page.addInitScript(
    ([viewerRole]) => {
      window.localStorage.setItem('xiigen.tenantId', 'acme-corp');
      window.localStorage.setItem('xiigen.tenantBrand', 'Acme Corp');
      window.localStorage.setItem('xiigen.viewerRole', viewerRole);
      window.localStorage.setItem('xiigen.profileEnrichmentAdaptation', 'acme-pro-matching');
    },
    [role],
  );
}

async function seedTenantBInstalledFromA(page: Page, role: string) {
  await page.addInitScript(
    ([viewerRole]) => {
      window.localStorage.setItem('xiigen.tenantId', 'northwind');
      window.localStorage.setItem('xiigen.tenantBrand', 'Northwind');
      window.localStorage.setItem('xiigen.viewerRole', viewerRole);
      window.localStorage.setItem('xiigen.profileEnrichmentAdaptation', 'acme-pro-matching');
    },
    [role],
  );
}

async function seedTenantBAdapted(page: Page, role: string) {
  await page.addInitScript(
    ([viewerRole]) => {
      window.localStorage.setItem('xiigen.tenantId', 'northwind');
      window.localStorage.setItem('xiigen.tenantBrand', 'Northwind');
      window.localStorage.setItem('xiigen.viewerRole', viewerRole);
      window.localStorage.setItem('xiigen.profileEnrichmentAdaptation', 'northwind-partner-matching');
    },
    [role],
  );
}

async function seedTenantCInstalledFromB(page: Page, role: string) {
  await page.addInitScript(
    ([viewerRole]) => {
      window.localStorage.setItem('xiigen.tenantId', 'tessera-collective');
      window.localStorage.setItem('xiigen.tenantBrand', 'Tessera Collective');
      window.localStorage.setItem('xiigen.viewerRole', viewerRole);
      window.localStorage.setItem('xiigen.profileEnrichmentAdaptation', 'northwind-partner-matching');
    },
    [role],
  );
}

async function seedTenantCAdapted(page: Page, role: string) {
  await page.addInitScript(
    ([viewerRole]) => {
      window.localStorage.setItem('xiigen.tenantId', 'tessera-collective');
      window.localStorage.setItem('xiigen.tenantBrand', 'Tessera Collective');
      window.localStorage.setItem('xiigen.viewerRole', viewerRole);
      window.localStorage.setItem('xiigen.profileEnrichmentAdaptation', 'tessera-community-matching');
    },
    [role],
  );
}

async function capture(
  page: Page,
  directory: string,
  name: string,
  subject?: Locator,
) {
  await page.waitForLoadState('networkidle').catch(() => undefined);
  const imagePath = path.join(directory, `${name}.png`);
  if (subject) {
    await expectNoInternalCopy(subject);
    await subject.screenshot({ path: imagePath });
  } else {
    await expectNoInternalCopy(page.locator('body'));
    await page.screenshot({
      path: imagePath,
      fullPage: true,
    });
  }
}

async function expectNoInternalCopy(subject: Locator) {
  const bodyText = await subject.innerText();
  const forbidden = [
    /\btenant\b/i,
    /\bT50\b|\bT51\b|\bT52\b/,
    /\bCF-\d+\b/,
    /DataProcessResult/,
    /ENGINE_INTERNAL/,
    /xiigen/i,
    /Administration/,
    /Flow Library/,
    /Generation Lab/,
  ];

  for (const pattern of forbidden) {
    expect(bodyText).not.toMatch(pattern);
  }
}

test.describe('FLOW-02 protocol visual evidence - tenant-user source', () => {
  test.beforeAll(() => {
    fs.mkdirSync(SOURCE_EVIDENCE_DIR, { recursive: true });
  });

  test.beforeEach(async ({ page }) => {
    await seedTenantUser(page);
  });

  test('captures all tenant-user protocol states', async ({ page }) => {
    await page.goto('/questionnaire?role=tenant-user');
    await capture(page, SOURCE_EVIDENCE_DIR, '01-questionnaire-form');
    await expect(page.getByTestId('questionnaire-form')).toBeVisible();

    await page.getByTestId('submit-button').click();
    await capture(page, SOURCE_EVIDENCE_DIR, '02-questionnaire-validation-error');
    await expect(page.getByTestId('questionnaire-validation-error')).toBeVisible();

    await page.goto('/questionnaire?role=tenant-user&duplicate=true');
    await capture(page, SOURCE_EVIDENCE_DIR, '03-questionnaire-debounce-pending');
    await expect(page.getByTestId('debounce-pending')).toBeVisible();

    await page.goto('/questionnaire?role=tenant-user&mock=submitted');
    await capture(page, SOURCE_EVIDENCE_DIR, '04-questionnaire-processing');
    await expect(page.getByTestId('processing')).toBeVisible();

    await page.goto('/matching?role=tenant-user&userId=usr-matching-test');
    await capture(page, SOURCE_EVIDENCE_DIR, '05-matching-in-progress');
    await expect(page.getByTestId('matching-in-progress')).toBeVisible();

    await page.goto('/matching?role=tenant-user&userId=usr-partial-test');
    await capture(page, SOURCE_EVIDENCE_DIR, '06-matching-partial');
    await expect(page.getByTestId('matching-partial')).toBeVisible();

    await page.goto('/matching?role=tenant-user&userId=usr-complete-test');
    await capture(page, SOURCE_EVIDENCE_DIR, '07-matching-complete');
    await expect(page.getByTestId('matching-complete')).toBeVisible();

    await page.goto('/personalization?role=tenant-user&userId=usr-personalized-test');
    await capture(page, SOURCE_EVIDENCE_DIR, '08-personalization-feed');
    await expect(page.getByTestId('personalization-feed')).toBeVisible();

    await capture(page, SOURCE_EVIDENCE_DIR, '09-personalization-completed-event');
    await expect(page.getByTestId('personalization-completed-event')).toBeVisible();

    await page.goto('/personalization?role=tenant-user&userId=usr-degraded-feed-test');
    await capture(page, SOURCE_EVIDENCE_DIR, '10-personalization-degraded');
    await expect(page.getByTestId('personalization-degraded')).toBeVisible();

    expect(SOURCE_ROLE_MAP['tenant-user']).toHaveLength(10);
  });
});

test.describe('FLOW-02 Tenant A adapted visual evidence', () => {
  test.beforeAll(() => {
    fs.mkdirSync(TENANT_A_ADAPTED_DIR, { recursive: true });
    fs.mkdirSync(MARKETPLACE_EVIDENCE_DIR, { recursive: true });
  });

  for (const role of Object.keys(ADAPTED_ROLE_MAP)) {
    test(`captures adapted Acme Pro Matching screens for ${role}`, async ({ page }) => {
      await seedTenantAAdaptation(page, role);

      await page.goto(`/questionnaire?role=${role}&tenant=acme-corp&adaptation=acme-pro-matching`);
      await expect(page.getByTestId('profile-enrichment-adaptation-banner')).toBeVisible();
      await expect(page.getByText('Acme Pro Matching')).toBeVisible();
      await expect(page.getByText('Industry alignment')).toBeVisible();
      await expect(page.getByText('55%')).toBeVisible();
      await capture(
        page,
        TENANT_A_ADAPTED_DIR,
        `${role}-01-questionnaire`,
        page.getByTestId('page-questionnaire'),
      );

      await page.goto(
        `/matching?role=${role}&tenant=acme-corp&adaptation=acme-pro-matching&userId=usr-complete-test`,
      );
      await expect(page.getByTestId('profile-enrichment-adaptation-banner')).toBeVisible();
      await expect(page.getByText('Faster matching target: 15 seconds')).toBeVisible();
      await capture(
        page,
        TENANT_A_ADAPTED_DIR,
        `${role}-02-matching-complete`,
        page.getByTestId('page-matching'),
      );

      await page.goto(
        `/personalization?role=${role}&tenant=acme-corp&adaptation=acme-pro-matching&userId=usr-personalized-test`,
      );
      await expect(page.getByTestId('profile-enrichment-adaptation-banner')).toBeVisible();
      await expect(page.getByText('Remote-friendly location')).toBeVisible();
      await capture(
        page,
        TENANT_A_ADAPTED_DIR,
        `${role}-03-personalization-feed`,
        page.getByTestId('page-personalization'),
      );

      expect(ADAPTED_ROLE_MAP[role as keyof typeof ADAPTED_ROLE_MAP]).toHaveLength(3);
    });
  }

  test('captures adapted marketplace listing evidence', async ({ page }) => {
    await seedTenantAAdaptation(page, 'tenant-user');

    await page.goto('/marketplace?role=tenant-user&showcase=profile-enrichment-v1.0.1');
    const card = page.getByTestId('marketplace-card-pkg-profile-enrichment-acme-pro-matching');
    await expect(card).toBeVisible();
    await expect(card.getByText('Acme Pro Matching')).toBeVisible();
    await expect(card.getByText('Industry-first', { exact: true })).toBeVisible();
    await capture(page, MARKETPLACE_EVIDENCE_DIR, 'profile-enrichment-v1.0.1-listing', card);
  });
});

test.describe('FLOW-02 Tenant B installed from Tenant A visual evidence', () => {
  test.beforeAll(() => {
    fs.mkdirSync(TENANT_B_INSTALLED_FROM_A_DIR, { recursive: true });
  });

  for (const role of Object.keys(ADAPTED_ROLE_MAP)) {
    test(`captures Northwind inherited Acme Pro Matching screens for ${role}`, async ({ page }) => {
      await seedTenantBInstalledFromA(page, role);

      await page.goto(`/questionnaire?role=${role}&tenant=northwind&adaptation=acme-pro-matching`);
      await expect(page.getByTestId('profile-enrichment-adaptation-banner')).toBeVisible();
      await expect(page.getByText('Acme Pro Matching')).toBeVisible();
      await expect(page.getByText('55%')).toBeVisible();
      await capture(
        page,
        TENANT_B_INSTALLED_FROM_A_DIR,
        `${role}-01-questionnaire`,
        page.getByTestId('page-questionnaire'),
      );

      await page.goto(
        `/matching?role=${role}&tenant=northwind&adaptation=acme-pro-matching&userId=usr-complete-test`,
      );
      await expect(page.getByTestId('profile-enrichment-adaptation-banner')).toBeVisible();
      await expect(page.getByText('Faster matching target: 15 seconds')).toBeVisible();
      await capture(
        page,
        TENANT_B_INSTALLED_FROM_A_DIR,
        `${role}-02-matching-complete`,
        page.getByTestId('page-matching'),
      );

      await page.goto(
        `/personalization?role=${role}&tenant=northwind&adaptation=acme-pro-matching&userId=usr-personalized-test`,
      );
      await expect(page.getByTestId('profile-enrichment-adaptation-banner')).toBeVisible();
      await expect(page.getByText('Remote-friendly location')).toBeVisible();
      await capture(
        page,
        TENANT_B_INSTALLED_FROM_A_DIR,
        `${role}-03-personalization-feed`,
        page.getByTestId('page-personalization'),
      );

      expect(ADAPTED_ROLE_MAP[role as keyof typeof ADAPTED_ROLE_MAP]).toHaveLength(3);
    });
  }
});

test.describe('FLOW-02 Tenant B adapted visual evidence', () => {
  test.beforeAll(() => {
    fs.mkdirSync(TENANT_B_ADAPTED_DIR, { recursive: true });
  });

  for (const role of Object.keys(ADAPTED_ROLE_MAP)) {
    test(`captures Northwind Partner Matching screens for ${role}`, async ({ page }) => {
      await seedTenantBAdapted(page, role);

      await page.goto(
        `/questionnaire?role=${role}&tenant=northwind&adaptation=northwind-partner-matching`,
      );
      await expect(page.getByTestId('profile-enrichment-adaptation-banner')).toBeVisible();
      await expect(page.getByText('Northwind Partner Matching')).toBeVisible();
      await expect(page.getByText('Industry alignment')).toBeVisible();
      await expect(page.getByText('55%')).toBeVisible();
      await expect(page.getByText('Team size')).toBeVisible();
      await expect(page.getByText('20%')).toBeVisible();
      await capture(
        page,
        TENANT_B_ADAPTED_DIR,
        `${role}-01-questionnaire`,
        page.getByTestId('page-questionnaire'),
      );

      await page.goto(
        `/matching?role=${role}&tenant=northwind&adaptation=northwind-partner-matching&userId=usr-complete-test`,
      );
      await expect(page.getByTestId('profile-enrichment-adaptation-banner')).toBeVisible();
      await expect(page.getByText('Faster matching target: 15 seconds')).toBeVisible();
      await capture(
        page,
        TENANT_B_ADAPTED_DIR,
        `${role}-02-matching-complete`,
        page.getByTestId('page-matching'),
      );

      await page.goto(
        `/personalization?role=${role}&tenant=northwind&adaptation=northwind-partner-matching&userId=usr-personalized-test`,
      );
      await expect(page.getByTestId('profile-enrichment-adaptation-banner')).toBeVisible();
      await expect(page.getByText('stronger team-size fit')).toBeVisible();
      await capture(
        page,
        TENANT_B_ADAPTED_DIR,
        `${role}-03-personalization-feed`,
        page.getByTestId('page-personalization'),
      );

      expect(ADAPTED_ROLE_MAP[role as keyof typeof ADAPTED_ROLE_MAP]).toHaveLength(3);
    });
  }

  test('captures adapted Northwind marketplace listing evidence', async ({ page }) => {
    await seedTenantBAdapted(page, 'tenant-user');

    await page.goto('/marketplace?role=tenant-user&showcase=profile-enrichment-v1.0.2');
    const card = page.getByTestId('marketplace-card-pkg-profile-enrichment-northwind-partner-matching');
    await expect(card).toBeVisible();
    await expect(card.getByText('Northwind Partner Matching')).toBeVisible();
    await expect(card.getByText('Team fit', { exact: true })).toBeVisible();
    await capture(page, MARKETPLACE_EVIDENCE_DIR, 'profile-enrichment-v1.0.2-listing', card);
  });
});

test.describe('FLOW-02 Tenant C installed from Tenant B visual evidence', () => {
  test.beforeAll(() => {
    fs.mkdirSync(TENANT_C_INSTALLED_FROM_B_DIR, { recursive: true });
  });

  for (const role of Object.keys(ADAPTED_ROLE_MAP)) {
    test(`captures Tessera inherited Northwind Partner Matching screens for ${role}`, async ({
      page,
    }) => {
      await seedTenantCInstalledFromB(page, role);

      await page.goto(
        `/questionnaire?role=${role}&tenant=tessera-collective&adaptation=northwind-partner-matching`,
      );
      await expect(page.getByTestId('profile-enrichment-adaptation-banner')).toBeVisible();
      await expect(page.getByText('Northwind Partner Matching')).toBeVisible();
      await expect(page.getByText('55%')).toBeVisible();
      await expect(page.getByText('20%')).toBeVisible();
      await capture(
        page,
        TENANT_C_INSTALLED_FROM_B_DIR,
        `${role}-01-questionnaire`,
        page.getByTestId('page-questionnaire'),
      );

      await page.goto(
        `/matching?role=${role}&tenant=tessera-collective&adaptation=northwind-partner-matching&userId=usr-complete-test`,
      );
      await expect(page.getByTestId('profile-enrichment-adaptation-banner')).toBeVisible();
      await expect(page.getByText('Faster matching target: 15 seconds')).toBeVisible();
      await capture(
        page,
        TENANT_C_INSTALLED_FROM_B_DIR,
        `${role}-02-matching-complete`,
        page.getByTestId('page-matching'),
      );

      await page.goto(
        `/personalization?role=${role}&tenant=tessera-collective&adaptation=northwind-partner-matching&userId=usr-personalized-test`,
      );
      await expect(page.getByTestId('profile-enrichment-adaptation-banner')).toBeVisible();
      await expect(page.getByText('stronger team-size fit')).toBeVisible();
      await capture(
        page,
        TENANT_C_INSTALLED_FROM_B_DIR,
        `${role}-03-personalization-feed`,
        page.getByTestId('page-personalization'),
      );

      expect(ADAPTED_ROLE_MAP[role as keyof typeof ADAPTED_ROLE_MAP]).toHaveLength(3);
    });
  }
});

test.describe('FLOW-02 Tenant C adapted visual evidence', () => {
  test.beforeAll(() => {
    fs.mkdirSync(TENANT_C_ADAPTED_DIR, { recursive: true });
  });

  for (const role of Object.keys(ADAPTED_ROLE_MAP)) {
    test(`captures Tessera Community Matching screens for ${role}`, async ({ page }) => {
      await seedTenantCAdapted(page, role);

      await page.goto(
        `/questionnaire?role=${role}&tenant=tessera-collective&adaptation=tessera-community-matching`,
      );
      await expect(page.getByTestId('profile-enrichment-adaptation-banner')).toBeVisible();
      await expect(page.getByText('Tessera Community Matching')).toBeVisible();
      await expect(page.getByText('Industry alignment')).toBeVisible();
      await expect(page.getByText('40%')).toBeVisible();
      await expect(page.getByText('Remote-friendly location')).toBeVisible();
      await expect(page.getByText('25%')).toBeVisible();
      await capture(
        page,
        TENANT_C_ADAPTED_DIR,
        `${role}-01-questionnaire`,
        page.getByTestId('page-questionnaire'),
      );

      await page.goto(
        `/matching?role=${role}&tenant=tessera-collective&adaptation=tessera-community-matching&userId=usr-complete-test`,
      );
      await expect(page.getByTestId('profile-enrichment-adaptation-banner')).toBeVisible();
      await expect(page.getByText('Faster matching target: 15 seconds')).toBeVisible();
      await expect(page.getByText('Team size')).toBeVisible();
      await expect(page.getByText('20%')).toBeVisible();
      await capture(
        page,
        TENANT_C_ADAPTED_DIR,
        `${role}-02-matching-complete`,
        page.getByTestId('page-matching'),
      );

      await page.goto(
        `/personalization?role=${role}&tenant=tessera-collective&adaptation=tessera-community-matching&userId=usr-personalized-test`,
      );
      await expect(page.getByTestId('profile-enrichment-adaptation-banner')).toBeVisible();
      await expect(page.getByText('community-based matching')).toBeVisible();
      await capture(
        page,
        TENANT_C_ADAPTED_DIR,
        `${role}-03-personalization-feed`,
        page.getByTestId('page-personalization'),
      );

      expect(ADAPTED_ROLE_MAP[role as keyof typeof ADAPTED_ROLE_MAP]).toHaveLength(3);
    });
  }

  test('captures adapted Tessera marketplace listing evidence', async ({ page }) => {
    await seedTenantCAdapted(page, 'tenant-user');

    await page.goto('/marketplace?role=tenant-user&showcase=profile-enrichment-v1.0.3');
    const card = page.getByTestId(
      'marketplace-card-pkg-profile-enrichment-tessera-community-matching',
    );
    await expect(card).toBeVisible();
    await expect(card.getByText('Tessera Community Matching')).toBeVisible();
    await expect(card.getByText('Location fit', { exact: true })).toBeVisible();
    await capture(page, MARKETPLACE_EVIDENCE_DIR, 'profile-enrichment-v1.0.3-listing', card);
  });
});
