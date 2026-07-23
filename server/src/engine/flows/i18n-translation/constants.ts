/**
 * FLOW-48 i18n-translation — ES index constants.
 *
 * Indices:
 *   - xiigen-translation-refs       → CAS lookup refs (docId = `${tenantId}::${moduleId}::${locale}`)
 *   - xiigen-translation-requests   → translation request records (auto-detect from user registration)
 *   - xiigen-user-preferences       → per-user locale override + userOverride flag
 *
 * Freedom config keys consumed by this flow:
 *   - i18n.enabledLocales                → string[]  tenant-enabled locales
 *   - i18n.autoDetectFromRegistrations   → boolean   auto-request on user registration
 *   - i18n.defaultLocale                 → string    default locale ('en' unless overridden)
 *   - i18n.module.overrides              → Record<moduleSlug, locale>
 */

export const TRANSLATION_REFS_INDEX = 'xiigen-translation-refs';
export const TRANSLATION_REQUESTS_INDEX = 'xiigen-translation-requests';
export const USER_PREFERENCES_INDEX = 'xiigen-user-preferences';

/** Freedom config index used for reading tenant i18n settings. */
export const FREEDOM_CONFIG_INDEX = 'xiigen-freedom-config';

/** Freedom config keys. */
export const FREEDOM_KEY_ENABLED_LOCALES = 'i18n.enabledLocales';
export const FREEDOM_KEY_AUTO_DETECT = 'i18n.autoDetectFromRegistrations';
