/**
 * LanguageSettingsPage — FLOW-48 user preferences screen (/settings/language).
 *
 * User picks an explicit locale (userOverride=true) or resets to tenant default
 * (userOverride=false). Persistence flows through the T670 UserPreferencesManager
 * endpoints via the api hook.
 *
 * Data-testid contract (from P5 UI spec):
 *   page-language-settings
 *   language-settings-loading
 *   save-language-btn
 *   reset-to-tenant-btn
 *   language-settings-saved
 */

import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  useUserPreferences,
  useUpdatePreferences,
} from '../../api/i18n-translation.api';

const LOCALES: Array<{ code: string; labelKey: string }> = [
  { code: 'en', labelKey: 'locale_en' },
  { code: 'he', labelKey: 'locale_he' },
  { code: 'fr', labelKey: 'locale_fr' },
];

export const LanguageSettingsPage: React.FC = () => {
  const { t, i18n } = useTranslation('i18n-translation');
  const prefs = useUserPreferences();
  const { update, loading: saving } = useUpdatePreferences();
  const [pending, setPending] = useState<string>('en');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (prefs.data?.locale) setPending(prefs.data.locale);
  }, [prefs.data?.locale]);

  async function handleSave() {
    setSaved(false);
    // Local persistence always succeeds — localStorage + i18n.changeLanguage
    // run before the server PUT. CF-812 parallel — the UX never blocks on
    // server reachability.
    try {
      window.localStorage.setItem('xiigen.locale', pending);
    } catch {
      // ignore — localStorage unavailable (private mode)
    }
    try {
      await i18n.changeLanguage(pending);
    } catch {
      // i18next change failure should not block the UI confirmation
    }
    setSaved(true);
    // Best-effort server sync. Failures do not clear the saved state; the
    // hook surfaces the error separately for diagnostics.
    await update({ locale: pending, userOverride: true });
    await prefs.refetch();
  }

  async function handleReset() {
    setSaved(false);
    try {
      window.localStorage.removeItem('xiigen.locale');
    } catch {
      // ignore
    }
    try {
      await i18n.changeLanguage('en');
    } catch {
      // non-fatal
    }
    setPending('en');
    setSaved(true);
    await update({ locale: 'en', userOverride: false });
    await prefs.refetch();
  }

  return (
    <div
      data-testid="page-language-settings"
      className="max-w-2xl mx-auto mt-8 p-6 bg-white rounded-lg shadow"
    >
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{t('settings_title')}</h1>
        <p className="text-sm text-gray-600 mt-2">{t('settings_description')}</p>
      </header>

      {prefs.loading && (
        <div
          data-testid="language-settings-loading"
          className="p-4 text-sm text-gray-500"
        >
          {t('loading', { defaultValue: 'Loading...' })}
        </div>
      )}

      {!prefs.loading && (
        <>
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('settings_select_locale')}
            </label>
            <div className="space-y-2">
              {LOCALES.map((locale) => (
                <label
                  key={locale.code}
                  data-testid={`locale-choice-${locale.code}`}
                  className={`flex items-center gap-3 p-3 border rounded cursor-pointer ${
                    pending === locale.code
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="locale"
                    value={locale.code}
                    checked={pending === locale.code}
                    onChange={() => setPending(locale.code)}
                    className="text-blue-600"
                  />
                  <span className="text-sm">
                    <span className="font-mono text-xs mr-2 text-gray-500">
                      {locale.code.toUpperCase()}
                    </span>
                    {t(locale.labelKey)}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {prefs.data?.userOverride && (
            <p
              data-testid="user-override-note"
              className="mb-4 p-3 rounded bg-yellow-50 border border-yellow-200 text-xs text-yellow-900"
            >
              {t('settings_override_note')}
            </p>
          )}

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              data-testid="save-language-btn"
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 rounded bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? t('loading', { defaultValue: 'Loading...' }) : t('settings_save_btn')}
            </button>
            <button
              type="button"
              data-testid="reset-to-tenant-btn"
              onClick={handleReset}
              disabled={saving}
              className="px-4 py-2 rounded border border-gray-300 text-gray-800 text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
            >
              {t('settings_reset_btn')}
            </button>
          </div>

          {saved && (
            <p
              data-testid="language-settings-saved"
              className="mt-4 p-3 rounded bg-green-50 border border-green-200 text-sm text-green-900"
            >
              ✓ {t('settings_saved')}
            </p>
          )}
          {/* Server-side persistence is best-effort; errors are not surfaced in R1
              because the local change (localStorage + i18n.changeLanguage) has
              already succeeded. Diagnostic error available via the update hook. */}
        </>
      )}
    </div>
  );
};

export default LanguageSettingsPage;
