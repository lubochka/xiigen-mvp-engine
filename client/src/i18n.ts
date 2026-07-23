/**
 * FLOW-48 i18n-translation — i18next initialization.
 *
 * Bundle-first loading (DR-48-1):
 *   English resources are inlined via Vite's import.meta.glob. Hebrew + French
 *   stub bundles are also inlined for the R1 visual-proof PNGs. The Backend
 *   plugin fetches locales NOT in the resources map from
 *   /api/translations/{{ns}}/{{lng}}, cache-busted per build via VITE_BUILD_HASH.
 *
 * CF-812: any backend failure resolves to the bundled English fallback via
 * i18next's native fallbackLng mechanism. No custom error handling required.
 */

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import Backend from 'i18next-http-backend';

type ResourceBundle = Record<string, unknown>;

function loadGlobbed(globs: Record<string, unknown>, prefix: string): Record<string, ResourceBundle> {
  const out: Record<string, ResourceBundle> = {};
  for (const [path, mod] of Object.entries(globs)) {
    const ns = path.replace(prefix, '').replace(/\.json$/, '');
    // Vite returns { default: ... } or the raw object depending on the glob options
    const bundle = (mod as { default?: ResourceBundle })?.default ?? (mod as ResourceBundle);
    out[ns] = bundle;
  }
  return out;
}

const enGlobs = import.meta.glob('./locales/en/*.json', { eager: true }) as Record<string, unknown>;
const heGlobs = import.meta.glob('./locales/he/*.json', { eager: true }) as Record<string, unknown>;
const frGlobs = import.meta.glob('./locales/fr/*.json', { eager: true }) as Record<string, unknown>;

const en = loadGlobbed(enGlobs, './locales/en/');
const he = loadGlobbed(heGlobs, './locales/he/');
const fr = loadGlobbed(frGlobs, './locales/fr/');

const namespaces = Array.from(
  new Set<string>([...Object.keys(en), ...Object.keys(he), ...Object.keys(fr), 'common']),
);

const buildHash = (import.meta.env.VITE_BUILD_HASH as string | undefined) ?? 'dev';

void i18n
  .use(Backend)
  .use(initReactI18next)
  .init({
    resources: {
      en,
      he,
      fr,
    },
    fallbackLng: 'en',
    ns: namespaces,
    defaultNS: 'common',
    supportedLngs: ['en', 'he', 'fr'],
    load: 'languageOnly',
    backend: {
      loadPath: '/api/translations/{{ns}}/{{lng}}',
      queryStringParams: { v: buildHash },
      // Server returns { success, data: { translations: {...} } } OR
      // { success, data: { fallback: true, locale: 'en' } } — normalise both shapes.
      parse: (data: string) => {
        try {
          const parsed = JSON.parse(data);
          if (parsed?.data?.translations && typeof parsed.data.translations === 'object') {
            return parsed.data.translations as Record<string, unknown>;
          }
          if (parsed?.data?.fallback === true) return {};
          if (parsed?.fallback === true) return {};
          return parsed ?? {};
        } catch {
          return {};
        }
      },
    },
    interpolation: { escapeValue: false },
    returnNull: false,
    react: { useSuspense: false },
  });

// Hydrate from localStorage on startup so the user's last pick survives reloads.
try {
  const saved = typeof window !== 'undefined' ? window.localStorage.getItem('xiigen.locale') : null;
  if (saved && saved !== i18n.language) {
    void i18n.changeLanguage(saved);
  }
} catch {
  // localStorage unavailable — ignore; defaults to en.
}

// RUN-119: RTL support. When the locale changes, flip document.documentElement.dir
// and lang so layout direction, logical properties, and screen readers all pick up
// the change without per-page code. Hebrew + Arabic are the RTL scripts XIIGen may
// render; extend this set when adding new RTL locales.
const RTL_LOCALES = new Set(['he', 'ar', 'fa', 'ur']);

function applyDocumentDirection(lng: string | undefined): void {
  if (typeof document === 'undefined') return;
  const code = (lng ?? 'en').split('-')[0];
  const isRtl = RTL_LOCALES.has(code);
  document.documentElement.setAttribute('dir', isRtl ? 'rtl' : 'ltr');
  document.documentElement.setAttribute('lang', code);
}

// Apply at init so the first paint carries the correct direction, not a flash of LTR.
applyDocumentDirection(i18n.language);

// And on every future language change.
i18n.on('languageChanged', applyDocumentDirection);

export default i18n;
