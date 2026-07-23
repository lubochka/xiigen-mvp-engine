/**
 * AdminI18nPage — FLOW-48 admin screen (/admin/i18n).
 *
 * Tenant admins view the default locale + enabled locales, add/remove locales,
 * and save back to tenant Freedom config. In R1 we render from a local
 * in-component state model — the freedom-config PUT path ships in a later pass;
 * the PNG evidence here is for the business-state visibility (G2 element).
 *
 * Data-testid contract (from P5 UI spec — ALL preserved):
 *   page-admin-i18n
 *   add-locale-form
 *   i18n-config-saved
 *   locale-list-item-{code}
 *
 * Role-aware (RUN-42 — densest flow, 10 cells total):
 *   - tenant-admin    → existing i18n admin panel (unchanged content; wrapped in branch)
 *   - platform-admin  → base-dictionary + cross-tenant governance (PlatformI18nPage surface)
 *   - platform-support → COMPLIANCE-GRADE translation change audit log (Runs 39-40 pattern)
 *   - others           → friendly fallback directing regular users to /settings/language
 *
 * Every existing t() call is preserved exactly. New t() calls use defaultValue
 * fallbacks so untranslated keys still render readable English.
 *
 * Required testid for compliance gate (plan spec):
 *   data-testid="i18n-compliance-readonly-notice"
 */

import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Globe,
  Languages,
  Shield,
  FileDown,
  Lock,
  CheckCircle2,
  AlertTriangle,
  Pencil,
  Sparkles,
} from 'lucide-react';
import { RoleScopedView } from '../../components/common/RoleScopedView';
import { useViewerRole } from '../../hooks/useViewerRole';

// Pending-strings queue sample for the translator workbench branch.
interface PendingString {
  key: string;
  sourceEn: string;
  targetLocale: string;
  status: 'Pending' | 'In review' | 'Approved';
}

const SAMPLE_PENDING_STRINGS: PendingString[] = [
  { key: 'common.save_changes', sourceEn: 'Save changes', targetLocale: 'he-IL', status: 'Pending' },
  { key: 'booking.confirm_reminder', sourceEn: 'Your booking is confirmed', targetLocale: 'he-IL', status: 'In review' },
  { key: 'error.generic_retry', sourceEn: 'Something went wrong — please try again.', targetLocale: 'he-IL', status: 'Pending' },
  { key: 'pricing.save_annual', sourceEn: 'Save 20% with annual billing', targetLocale: 'fr-FR', status: 'Pending' },
  { key: 'nav.my_subscription', sourceEn: 'My Subscription', targetLocale: 'fr-FR', status: 'Approved' },
  { key: 'billing.next_bill_date', sourceEn: 'Next billing date', targetLocale: 'he-IL', status: 'In review' },
];

type TranslatorFilter = 'All' | 'Pending' | 'In review' | 'Approved';

// Languages the tenant-user can choose between (kiosk surface).
interface TenantLanguageChoice {
  code: string;
  nativeName: string;
  englishName: string;
  flag: string;
  qualityPct: number;
}

const TENANT_LANGUAGE_CHOICES: TenantLanguageChoice[] = [
  { code: 'en', nativeName: 'English', englishName: 'English', flag: '🇬🇧', qualityPct: 100 },
  { code: 'he', nativeName: 'עברית', englishName: 'Hebrew', flag: '🇮🇱', qualityPct: 87 },
  { code: 'fr', nativeName: 'Français', englishName: 'French', flag: '🇫🇷', qualityPct: 94 },
];

interface TenantI18nConfig {
  defaultLocale: string;
  enabledLocales: string[];
}

function normaliseLocale(input: string): string | null {
  const trimmed = input.trim().toLowerCase();
  if (!trimmed) return null;
  if (!/^[a-z]{2,3}(-[a-z0-9]{2,8})*$/i.test(trimmed)) return null;
  return trimmed.split('-')[0];
}

// Base-dictionary sample for platform-admin branch
interface BaseDictionaryEntry {
  key: string;
  humanContext: string; // what the key is for in human words (never shown in tenant UI)
  english: string;
  translations: Record<string, { value: string; complete: boolean }>;
}

const SAMPLE_BASE_DICTIONARY: BaseDictionaryEntry[] = [
  {
    key: 'common.save_changes',
    humanContext: 'Generic "save changes" button used across forms',
    english: 'Save changes',
    translations: {
      fr: { value: 'Enregistrer les modifications', complete: true },
      he: { value: 'שמור שינויים', complete: true },
      es: { value: 'Guardar cambios', complete: true },
      de: { value: '', complete: false },
    },
  },
  {
    key: 'booking.confirm_reminder',
    humanContext: 'Booking confirmation reminder title',
    english: 'Your booking is confirmed',
    translations: {
      fr: { value: 'Votre réservation est confirmée', complete: true },
      he: { value: 'ההזמנה שלך אושרה', complete: true },
      es: { value: 'Tu reserva está confirmada', complete: true },
      de: { value: 'Ihre Buchung ist bestätigt', complete: true },
    },
  },
  {
    key: 'error.generic_retry',
    humanContext: 'Fallback error message with retry hint',
    english: "Something went wrong — please try again.",
    translations: {
      fr: { value: "Une erreur s'est produite — veuillez réessayer.", complete: true },
      he: { value: '', complete: false },
      es: { value: 'Algo salió mal — por favor, inténtalo de nuevo.', complete: true },
      de: { value: '', complete: false },
    },
  },
];

interface LanguageMeta {
  code: string;
  name: string;
  platformEnabled: boolean;
  completenessPct: number;
  qualityLabel: 'human' | 'machine-mixed' | 'machine';
}

const SAMPLE_PLATFORM_LANGUAGES: LanguageMeta[] = [
  { code: 'en', name: 'English', platformEnabled: true, completenessPct: 100, qualityLabel: 'human' },
  { code: 'fr', name: 'French', platformEnabled: true, completenessPct: 94, qualityLabel: 'human' },
  { code: 'he', name: 'Hebrew', platformEnabled: true, completenessPct: 87, qualityLabel: 'human' },
  { code: 'es', name: 'Spanish', platformEnabled: true, completenessPct: 91, qualityLabel: 'human' },
  { code: 'de', name: 'German', platformEnabled: false, completenessPct: 42, qualityLabel: 'machine-mixed' },
  { code: 'ja', name: 'Japanese', platformEnabled: false, completenessPct: 18, qualityLabel: 'machine' },
];

interface TranslationAuditEntry {
  id: string;
  timestamp: string;
  keyChanged: string;
  language: string;
  before: string;
  after: string;
  editedBy: string;
  affectedTenants: number;
}

const SAMPLE_TRANSLATION_AUDIT: TranslationAuditEntry[] = [
  {
    id: 'TLA-2026-0419-0042',
    timestamp: '2026-04-19 14:22:15Z',
    keyChanged: 'common.save_changes',
    language: 'fr',
    before: 'Sauvegarder',
    after: 'Enregistrer les modifications',
    editedBy: 'platform-admin-02',
    affectedTenants: 142,
  },
  {
    id: 'TLA-2026-0418-0088',
    timestamp: '2026-04-18 10:15:30Z',
    keyChanged: 'booking.confirm_reminder',
    language: 'es',
    before: 'Reserva confirmada',
    after: 'Tu reserva está confirmada',
    editedBy: 'platform-admin-01',
    affectedTenants: 89,
  },
  {
    id: 'TLA-2026-0417-0121',
    timestamp: '2026-04-17 09:04:02Z',
    keyChanged: 'error.generic_retry',
    language: 'fr',
    before: 'Une erreur est survenue.',
    after: "Une erreur s'est produite — veuillez réessayer.",
    editedBy: 'platform-admin-02',
    affectedTenants: 142,
  },
];

function CompletenessBadge({ pct }: { pct: number }) {
  // UX-10: colour + text label (not colour alone).
  const tone =
    pct >= 80
      ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
      : pct >= 50
        ? 'bg-amber-100 text-amber-800 border-amber-200'
        : 'bg-red-100 text-red-800 border-red-200';
  const label = pct >= 80 ? 'strong' : pct >= 50 ? 'partial' : 'low';
  return (
    <span
      className={`inline-block text-xs font-semibold px-2 py-0.5 rounded border ${tone}`}
    >
      {pct}% · {label}
    </span>
  );
}

export const AdminI18nPage: React.FC = () => {
  const { t } = useTranslation('i18n-translation');
  const { role } = useViewerRole();
  const [searchParams] = useSearchParams();
  const rawRole = searchParams.get('role');
  const isTranslator = rawRole === 'translator';

  // Tenant-admin state (existing — preserved)
  const [cfg, setCfg] = useState<TenantI18nConfig>({
    defaultLocale: 'en',
    enabledLocales: ['en', 'he', 'fr'],
  });
  const [draft, setDraft] = useState('');
  const [saved, setSaved] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Translator workbench local state
  const [translatorFilter, setTranslatorFilter] = useState<TranslatorFilter>('All');

  // Tenant-user kiosk local state
  const [kioskSelectedCode, setKioskSelectedCode] = useState<string>('en');
  const [kioskSaved, setKioskSaved] = useState(false);

  function handleAdd() {
    setFormError(null);
    setSaved(false);
    const next = normaliseLocale(draft);
    if (!next) {
      setFormError('Invalid locale tag. Expected a BCP-47 primary subtag.');
      return;
    }
    if (cfg.enabledLocales.includes(next)) {
      setFormError(`Locale "${next}" is already enabled.`);
      return;
    }
    setCfg((prev) => ({ ...prev, enabledLocales: [...prev.enabledLocales, next] }));
    setDraft('');
  }

  function handleRemove(code: string) {
    setSaved(false);
    if (code === cfg.defaultLocale) {
      setFormError('Cannot remove the default locale.');
      return;
    }
    setFormError(null);
    setCfg((prev) => ({
      ...prev,
      enabledLocales: prev.enabledLocales.filter((c) => c !== code),
    }));
  }

  function handleSetDefault(code: string) {
    setSaved(false);
    setFormError(null);
    setCfg((prev) => ({ ...prev, defaultLocale: code }));
  }

  function handleSave() {
    setSaved(true);
    setFormError(null);
  }

  // Translator workbench — 'translator' is not a canonical ViewerRole, so it is
  // handled before RoleScopedView by reading the URL param directly. Playwright
  // drives this via ?role=translator.
  if (isTranslator) {
    const filtered =
      translatorFilter === 'All'
        ? SAMPLE_PENDING_STRINGS
        : SAMPLE_PENDING_STRINGS.filter((s) => s.status === translatorFilter);
    const completedToday = SAMPLE_PENDING_STRINGS.filter((s) => s.status === 'Approved').length;
    const filterChips: TranslatorFilter[] = ['All', 'Pending', 'In review', 'Approved'];
    return (
      <div
        data-testid="page-admin-i18n"
        data-viewer-role="translator"
        className="p-4"
      >
        <main
          data-testid="i18n-translator-workbench"
          className="space-y-4 max-w-5xl mx-auto"
        >
          <header>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Pencil size={22} strokeWidth={2} aria-hidden="true" />
              Translation workbench
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              Review pending strings and publish translations for tenants using your target locale.
            </p>
          </header>

          <div
            data-testid="i18n-translator-filters"
            role="toolbar"
            aria-label="Filter pending translations"
            className="flex flex-wrap gap-2"
          >
            {filterChips.map((chip) => (
              <button
                key={chip}
                type="button"
                data-testid={`i18n-translator-filter-${chip.toLowerCase().replace(' ', '-')}`}
                aria-pressed={translatorFilter === chip}
                onClick={() => setTranslatorFilter(chip)}
                className={
                  translatorFilter === chip
                    ? 'px-3 py-2 text-xs font-semibold rounded border bg-blue-600 text-white border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500'
                    : 'px-3 py-2 text-xs font-medium rounded border bg-white text-gray-700 border-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-400'
                }
                style={{ minHeight: '44px' }}
              >
                {chip}
              </button>
            ))}
          </div>

          <section
            data-testid="i18n-translator-tm-hint"
            className="flex items-start gap-3 p-4 rounded border border-indigo-200 bg-indigo-50"
          >
            <Sparkles size={18} strokeWidth={2} aria-hidden="true" className="text-indigo-700 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-indigo-900">
                Translation memory
              </p>
              <p className="text-xs text-indigo-800 mt-0.5">
                5 similar phrases translated previously.{' '}
                <a
                  href="#tm-suggestions"
                  data-testid="i18n-translator-tm-open"
                  className="underline font-semibold hover:text-indigo-900"
                >
                  Open suggestions →
                </a>
              </p>
            </div>
          </section>

          <section
            data-testid="i18n-translator-queue"
            aria-labelledby="i18n-translator-queue-heading"
            className="border border-gray-200 rounded bg-white overflow-hidden"
          >
            <h2
              id="i18n-translator-queue-heading"
              className="text-sm font-semibold text-gray-700 uppercase tracking-wide px-4 py-3 border-b border-gray-200"
            >
              Pending strings ({filtered.length})
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[720px]">
                <thead className="bg-gray-50 text-left">
                  <tr>
                    <th className="p-3 font-medium text-gray-700">Key</th>
                    <th className="p-3 font-medium text-gray-700">Source (en)</th>
                    <th className="p-3 font-medium text-gray-700">Target locale</th>
                    <th className="p-3 font-medium text-gray-700">Status</th>
                    <th className="p-3 font-medium text-gray-700">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((row) => {
                    const statusClass =
                      row.status === 'Approved'
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                        : row.status === 'In review'
                          ? 'bg-blue-100 text-blue-800 border-blue-200'
                          : 'bg-amber-100 text-amber-800 border-amber-200';
                    return (
                      <tr
                        key={row.key}
                        data-testid={`i18n-translator-row-${row.key}`}
                        className="border-t border-gray-200"
                      >
                        <td className="p-3 font-mono text-xs text-gray-700">{row.key}</td>
                        <td className="p-3 text-gray-900">{row.sourceEn}</td>
                        <td className="p-3">
                          <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">
                            {row.targetLocale}
                          </span>
                        </td>
                        <td className="p-3">
                          <span
                            className={`inline-block text-xs font-semibold px-2 py-0.5 rounded border ${statusClass}`}
                          >
                            {row.status}
                          </span>
                        </td>
                        <td className="p-3">
                          <a
                            href={`/translate/${encodeURIComponent(row.key)}`}
                            data-testid={`i18n-translator-translate-${row.key}`}
                            aria-label={`Translate ${row.key} for ${row.targetLocale}`}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                            style={{ minHeight: '44px', minWidth: '44px' }}
                          >
                            <Pencil size={12} strokeWidth={2} aria-hidden="true" />
                            Translate
                          </a>
                        </td>
                      </tr>
                    );
                  })}
                  {filtered.length === 0 && (
                    <tr>
                      <td
                        colSpan={5}
                        className="p-6 text-center text-sm text-gray-500"
                        data-testid="i18n-translator-empty"
                      >
                        No strings match this filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <footer
            data-testid="i18n-translator-footer"
            className="text-xs text-gray-600 border-t border-gray-200 pt-3"
          >
            My translations today:{' '}
            <span className="font-semibold text-gray-900">{completedToday} completed</span>
          </footer>
        </main>
      </div>
    );
  }

  return (
    <div data-testid="page-admin-i18n" data-viewer-role={role} className="p-4">
      <RoleScopedView role={role} testIdPrefix="i18n-role">
        {/* ─────────── Branch 1 — TENANT-ADMIN: existing panel, unchanged ───────────
            V-R15 Wave 5: subtitle previously leaked engineering copy
            (/api/tenants/:id/config · freedom config keys: i18n.defaultLocale,
            i18n.enabledLocales). Replaced with a plain user-facing summary. */}
        <RoleScopedView.Case when="tenant-admin">
          <div className="max-w-3xl mx-auto mt-4 p-6 bg-white rounded-lg shadow">
            <header className="mb-6">
              <h1 className="text-2xl font-bold text-gray-900">{t('admin_title')}</h1>
              <p className="text-xs text-gray-500 mt-1">
                Choose a default language for your workspace and enable the languages
                you want to offer. Changes take effect for new sessions.
              </p>
            </header>

            <section className="mb-6">
              <h2 className="text-sm font-semibold text-gray-700 mb-2">
                {t('admin_default_locale')}
              </h2>
              <p
                data-testid="admin-current-default"
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded bg-blue-50 border border-blue-200"
              >
                <span className="font-mono text-xs">
                  {cfg.defaultLocale.toUpperCase()}
                </span>
                <span className="text-sm">
                  {t(`locale_${cfg.defaultLocale}`, cfg.defaultLocale)}
                </span>
              </p>
            </section>

            <section className="mb-6">
              <h2 className="text-sm font-semibold text-gray-700 mb-2">
                {t('admin_enabled_locales')} ({cfg.enabledLocales.length})
              </h2>
              <ul className="space-y-2">
                {cfg.enabledLocales.map((code) => (
                  <li
                    key={code}
                    data-testid={`locale-list-item-${code}`}
                    className="flex items-center gap-3 p-3 border border-gray-200 rounded"
                  >
                    <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">
                      {code.toUpperCase()}
                    </span>
                    <span className="flex-1 text-sm text-gray-900">
                      {t(`locale_${code}`, code)}
                    </span>
                    {code === cfg.defaultLocale && (
                      <span className="text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                        default
                      </span>
                    )}
                    {code !== cfg.defaultLocale && (
                      <button
                        type="button"
                        data-testid={`set-default-${code}`}
                        aria-label={`Set ${code} as default locale`}
                        onClick={() => handleSetDefault(code)}
                        className="tap-small text-xs text-blue-600 hover:underline"
                      >
                        set default
                      </button>
                    )}
                    {code !== cfg.defaultLocale && (
                      <button
                        type="button"
                        data-testid={`remove-locale-${code}`}
                        aria-label={`Remove ${code} locale`}
                        onClick={() => handleRemove(code)}
                        className="tap-small text-xs text-red-600 hover:underline"
                      >
                        remove
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </section>

            <section
              data-testid="add-locale-form"
              className="mb-6 p-4 rounded bg-gray-50 border border-gray-200"
            >
              <h2 className="text-sm font-semibold text-gray-700 mb-2">
                {t('admin_add_locale')}
              </h2>
              <div className="flex flex-wrap gap-2">
                <input
                  type="text"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder={t('admin_add_placeholder')}
                  data-testid="add-locale-input"
                  className="flex-1 min-w-[200px] px-3 py-2 text-sm border border-gray-300 rounded"
                />
                <button
                  type="button"
                  data-testid="add-locale-btn"
                  onClick={handleAdd}
                  className="px-4 py-2 rounded bg-gray-900 text-white text-sm font-medium hover:bg-black"
                >
                  {t('admin_add_locale')}
                </button>
              </div>
              {formError && (
                <p className="mt-2 text-xs text-red-700" role="alert">
                  {formError}
                </p>
              )}
            </section>

            <div className="flex items-center gap-3">
              <button
                type="button"
                data-testid="admin-save-btn"
                onClick={handleSave}
                className="px-4 py-2 rounded bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
              >
                {t('admin_save_btn')}
              </button>
              {saved && (
                <span
                  data-testid="i18n-config-saved"
                  role="status"
                  aria-live="polite"
                  className="px-3 py-1 rounded bg-green-50 border border-green-200 text-sm text-green-900 inline-flex items-center gap-1"
                >
                  <CheckCircle2 size={14} strokeWidth={2} aria-hidden="true" />
                  {t('admin_saved')}
                </span>
              )}
            </div>
          </div>
        </RoleScopedView.Case>

        {/* ─────────── Branch 2 — PLATFORM-ADMIN: base dictionary + governance ─────────── */}
        <RoleScopedView.Case when="platform-admin">
          <main data-testid="i18n-platform-admin-console" className="space-y-4 max-w-5xl mx-auto">
            <header>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Globe size={22} strokeWidth={2} aria-hidden="true" />
                {t('platform_admin_title', { defaultValue: 'Platform Translation Governance' })}
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                {t('platform_admin_subtitle', {
                  defaultValue:
                    'Manage the base translation dictionary and control language availability across all tenants.',
                })}
              </p>
            </header>

            <section
              data-testid="i18n-platform-languages"
              aria-labelledby="i18n-platform-languages-heading"
              className="border border-gray-200 rounded bg-white"
            >
              <h2
                id="i18n-platform-languages-heading"
                className="text-sm font-semibold text-gray-700 uppercase tracking-wide px-4 py-3 border-b border-gray-200 flex items-center gap-2"
              >
                <Languages size={14} strokeWidth={2} aria-hidden="true" />
                {t('platform_languages_heading', {
                  defaultValue: 'Languages available to tenants',
                })}{' '}
                ({SAMPLE_PLATFORM_LANGUAGES.length})
              </h2>
              <ul className="divide-y divide-gray-100">
                {SAMPLE_PLATFORM_LANGUAGES.map((lang) => (
                  <li
                    key={lang.code}
                    data-testid={`i18n-platform-lang-${lang.code}`}
                    className="p-4 flex items-start justify-between gap-4"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">
                          {lang.code.toUpperCase()}
                        </span>
                        <span className="text-sm font-semibold text-gray-900">
                          {lang.name}
                        </span>
                        <CompletenessBadge pct={lang.completenessPct} />
                        <span className="text-xs text-gray-500">
                          · {lang.qualityLabel}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        data-testid={`i18n-platform-toggle-${lang.code}`}
                        aria-label={`${lang.platformEnabled ? 'Disable' : 'Enable'} ${lang.name} platform-wide`}
                        aria-pressed={lang.platformEnabled}
                        className={
                          lang.platformEnabled
                            ? 'inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 border border-emerald-300 rounded px-3 py-2 text-xs font-medium hover:bg-emerald-100 focus:outline-none focus:ring-2 focus:ring-emerald-500'
                            : 'inline-flex items-center gap-1 bg-gray-50 text-gray-700 border border-gray-300 rounded px-3 py-2 text-xs font-medium hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-500'
                        }
                        style={{ minHeight: '44px', minWidth: '44px' }}
                      >
                        {lang.platformEnabled ? 'ENABLED' : 'DISABLED'}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </section>

            <section
              data-testid="i18n-platform-base-dictionary"
              aria-labelledby="i18n-platform-dict-heading"
              className="border border-gray-200 rounded bg-white"
            >
              <h2
                id="i18n-platform-dict-heading"
                className="text-sm font-semibold text-gray-700 uppercase tracking-wide px-4 py-3 border-b border-gray-200"
              >
                {t('platform_base_dict_heading', {
                  defaultValue: 'Base translation dictionary',
                })}{' '}
                ({SAMPLE_BASE_DICTIONARY.length})
              </h2>
              <ul className="divide-y divide-gray-100">
                {SAMPLE_BASE_DICTIONARY.map((entry) => (
                  <li
                    key={entry.key}
                    data-testid={`i18n-platform-dict-${entry.key}`}
                    className="p-4"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-gray-500">{entry.key}</span>
                      <span className="text-xs text-gray-500">· {entry.humanContext}</span>
                    </div>
                    <p className="text-sm font-semibold text-gray-900 mt-1">
                      {entry.english}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs">
                      {Object.entries(entry.translations).map(([lang, tr]) => (
                        <span
                          key={lang}
                          className={
                            tr.complete
                              ? 'px-2 py-0.5 rounded border border-emerald-200 bg-emerald-50 text-emerald-800'
                              : 'px-2 py-0.5 rounded border border-red-200 bg-red-50 text-red-800'
                          }
                        >
                          <span className="font-mono font-semibold">
                            {lang.toUpperCase()}:
                          </span>{' '}
                          {tr.complete ? tr.value : 'Missing'}
                        </span>
                      ))}
                    </div>
                    <button
                      type="button"
                      data-testid={`i18n-platform-edit-${entry.key}`}
                      aria-label={`Edit translations for ${entry.humanContext}`}
                      className="mt-2 inline-flex items-center text-xs text-blue-700 hover:underline focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
                      style={{ minHeight: '44px' }}
                    >
                      Edit translations →
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          </main>
        </RoleScopedView.Case>

        {/* ─────────── Branch 3 — PLATFORM-SUPPORT: COMPLIANCE-GRADE audit log ─────────── */}
        <RoleScopedView.Case when="platform-support">
          <main
            data-testid="i18n-support-inspector"
            className="space-y-4 max-w-5xl mx-auto"
          >
            <header>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Shield size={22} strokeWidth={2} aria-hidden="true" />
                {t('support_title', { defaultValue: 'Translation Change Log' })}
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                {t('support_subtitle', {
                  defaultValue:
                    'Append-only record of every translation change across the platform.',
                })}
              </p>
            </header>

            {/* Compliance notice — REQUIRED, non-dismissable, visible above fold */}
            <div
              data-testid="i18n-compliance-readonly-notice"
              role="note"
              className="p-4 rounded border-2 border-amber-400 bg-amber-50 text-sm text-amber-900 flex items-start gap-3"
            >
              <Shield
                size={20}
                strokeWidth={2}
                aria-hidden="true"
                className="mt-0.5 flex-shrink-0"
              />
              <div>
                <p className="font-bold uppercase tracking-wide">
                  Translation change record — read-only per change audit policy
                </p>
                <p className="text-xs mt-1">
                  Every entry records a translation change that took effect across all
                  tenants using that language. Entries cannot be edited, deleted, or
                  redacted — append-only by mandate.
                </p>
              </div>
            </div>

            <div>
              <button
                type="button"
                data-testid="i18n-export-audit"
                aria-label="Download the translation change log as a PDF"
                className="inline-flex items-center gap-2 bg-slate-800 text-white px-4 py-2 rounded text-sm font-medium hover:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-600 focus:ring-offset-2"
                style={{ minHeight: '44px' }}
              >
                <FileDown size={16} strokeWidth={2} aria-hidden="true" />
                Download change log (PDF)
              </button>
            </div>

            <section
              data-testid="i18n-support-audit-log"
              aria-labelledby="i18n-support-audit-heading"
              className="border border-gray-200 rounded bg-white"
            >
              <h2
                id="i18n-support-audit-heading"
                className="text-sm font-semibold text-gray-700 uppercase tracking-wide px-4 py-3 border-b border-gray-200"
              >
                Change log ({SAMPLE_TRANSLATION_AUDIT.length} entries)
              </h2>
              <ol
                className="divide-y divide-gray-100"
                aria-label="Chronological translation change log"
              >
                {SAMPLE_TRANSLATION_AUDIT.map((entry) => (
                  <li
                    key={entry.id}
                    data-testid={`i18n-audit-entry-${entry.id}`}
                    className="p-4"
                  >
                    <div className="flex items-center gap-2 flex-wrap">
                      <AlertTriangle
                        size={14}
                        strokeWidth={2}
                        className="text-amber-600"
                        aria-hidden="true"
                      />
                      <span className="text-xs font-mono text-gray-500">{entry.id}</span>
                      <span className="text-xs text-gray-500">·</span>
                      <time
                        dateTime={entry.timestamp}
                        className="text-xs font-mono text-gray-700"
                      >
                        {entry.timestamp}
                      </time>
                      <span className="text-xs px-2 py-0.5 rounded border border-slate-300 bg-slate-100 text-slate-700 font-semibold uppercase">
                        {entry.language}
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-gray-900 mt-1 font-mono">
                      {entry.keyChanged}
                    </p>
                    <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                      <div className="p-2 rounded border border-red-200 bg-red-50">
                        <p className="font-semibold uppercase text-red-700 mb-1">
                          Before
                        </p>
                        <p className="text-red-900">{entry.before}</p>
                      </div>
                      <div className="p-2 rounded border border-emerald-200 bg-emerald-50">
                        <p className="font-semibold uppercase text-emerald-700 mb-1">
                          After
                        </p>
                        <p className="text-emerald-900">{entry.after}</p>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Edited by: <span className="font-medium">{entry.editedBy}</span> ·
                      Affected tenants:{' '}
                      <span className="font-semibold">{entry.affectedTenants}</span>
                    </p>
                  </li>
                ))}
              </ol>
            </section>

            {/*
              Deliberately ZERO edit / delete / revert controls on this branch.
              Translation changes cross tenant boundaries and are audited per change
              policy — the log is append-only by mandate, not by access control.
            */}
          </main>
        </RoleScopedView.Case>

        {/* ─────────── Branch 4 — TENANT-USER: language-switcher kiosk ─────────── */}
        <RoleScopedView.Case when="tenant-user">
          <main
            data-testid="i18n-tenant-user-kiosk"
            className="max-w-3xl mx-auto mt-4 p-6 bg-white rounded-lg shadow"
          >
            <header className="mb-5">
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Globe size={22} strokeWidth={2} aria-hidden="true" />
                Choose your language
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                This only changes how the app appears to you. Other tenant members keep their own pick.
              </p>
            </header>

            <div
              role="radiogroup"
              aria-label="Language choices"
              data-testid="i18n-kiosk-choices"
              className="grid grid-cols-1 sm:grid-cols-3 gap-3"
            >
              {TENANT_LANGUAGE_CHOICES.map((lang) => {
                const selected = kioskSelectedCode === lang.code;
                const qualityTone =
                  lang.qualityPct >= 95
                    ? 'text-emerald-700'
                    : lang.qualityPct >= 80
                      ? 'text-amber-700'
                      : 'text-red-700';
                return (
                  <button
                    key={lang.code}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    data-testid={`i18n-kiosk-choice-${lang.code}`}
                    onClick={() => {
                      setKioskSelectedCode(lang.code);
                      setKioskSaved(false);
                    }}
                    className={
                      selected
                        ? 'text-left p-4 rounded-lg border-2 border-blue-600 bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500'
                        : 'text-left p-4 rounded-lg border border-gray-200 bg-white hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400'
                    }
                    style={{ minHeight: '88px' }}
                  >
                    <span className="text-2xl block" aria-hidden="true">
                      {lang.flag}
                    </span>
                    <span className="block mt-1">
                      <span className="text-base font-bold text-gray-900">{lang.nativeName}</span>
                      {lang.nativeName !== lang.englishName && (
                        <span className="text-xs text-gray-500 ml-1">({lang.englishName})</span>
                      )}
                    </span>
                    <span className={`block text-xs font-medium mt-1 ${qualityTone}`}>
                      Quality: {lang.qualityPct}%
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-3 mt-6">
              <button
                type="button"
                data-testid="i18n-kiosk-save-btn"
                onClick={() => setKioskSaved(true)}
                className="inline-flex items-center gap-1 px-4 py-2 rounded bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                style={{ minHeight: '44px' }}
              >
                <CheckCircle2 size={14} strokeWidth={2} aria-hidden="true" />
                Save preference
              </button>
              {kioskSaved && (
                <span
                  data-testid="i18n-kiosk-saved"
                  role="status"
                  aria-live="polite"
                  className="px-3 py-1 rounded bg-green-50 border border-green-200 text-sm text-green-900"
                >
                  Language saved
                </span>
              )}
            </div>

            <p
              data-testid="i18n-kiosk-tenant-note"
              className="text-xs text-gray-500 mt-5 flex items-start gap-1"
            >
              <Lock size={12} strokeWidth={2} aria-hidden="true" className="mt-0.5 flex-shrink-0" />
              Your tenant administrator decides which languages are available.
            </p>
          </main>
        </RoleScopedView.Case>

        {/* ─────────── Fallback — friendly, directing to /settings/language ─────────── */}
        <RoleScopedView.Fallback>
          <div
            data-testid="i18n-fallback-redirect"
            role="note"
            className="max-w-2xl mx-auto mt-8 p-6 border border-gray-200 rounded-lg bg-white"
          >
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Languages size={20} strokeWidth={2} aria-hidden="true" />
              Translation administration
            </h1>
            <p className="text-sm text-gray-700 mt-3">
              Translation administration is available to workspace admins and above.
            </p>
            <p className="text-sm text-gray-700 mt-2">
              To change your language preference, visit your{' '}
              <a
                href="/settings/language"
                data-testid="i18n-fallback-language-link"
                className="font-semibold text-blue-700 hover:underline focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
              >
                account language settings
              </a>
              .
            </p>
            <p className="text-xs text-gray-500 mt-4 flex items-center gap-1">
              <Lock size={12} strokeWidth={2} aria-hidden="true" />
              This admin console is not available for your current role.
            </p>
          </div>
        </RoleScopedView.Fallback>
      </RoleScopedView>
    </div>
  );
};

export default AdminI18nPage;
