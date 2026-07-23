/**
 * LanguageSwitcher — FLOW-48 shell component (NOT a page, NOT routed).
 *
 * Rendered in the App.tsx top nav bar. Users pick their locale from the
 * dropdown; selection is persisted to localStorage immediately, dispatched
 * async-best-effort to /api/users/:userId/preferences, and passed to
 * i18n.changeLanguage() to trigger i18next's lazy-load pipeline.
 *
 * Data-testid contract (from P5 UI spec):
 *   language-switcher            trigger button
 *   language-switcher-dropdown   dropdown menu when open
 *   language-switcher-loading    loading indicator during changeLanguage
 *   locale-option-{code}         each available locale
 */

import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Globe, Check, ChevronDown } from 'lucide-react';

const MASTER_USER_ID = 'xiigen-master-00000000-0000-0000-0000-000000000001';

const LOCALES: Array<{ code: string; label: string; display: string }> = [
  { code: 'en', label: 'English', display: 'EN' },
  { code: 'he', label: 'Hebrew', display: 'HE' },
  { code: 'fr', label: 'French', display: 'FR' },
];

function persistPreference(locale: string, userOverride = true): void {
  try {
    void fetch(`/api/users/${encodeURIComponent(MASTER_USER_ID)}/preferences`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-Id': 'xiigen-master-00000000-0000-0000-0000-000000000001',
      },
      body: JSON.stringify({ locale, userOverride }),
    }).catch(() => undefined);
  } catch {
    // Fire-and-forget: persistence is best-effort per DR-48-1.
  }
}

export const LanguageSwitcher: React.FC = () => {
  const { t, i18n } = useTranslation('i18n-translation');
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  const currentCode = (i18n.language ?? 'en').split('-')[0] || 'en';
  const current = LOCALES.find((l) => l.code === currentCode) ?? LOCALES[0];

  useEffect(() => {
    if (!open) return;
    function handleDocClick(evt: MouseEvent) {
      if (ref.current && !ref.current.contains(evt.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleDocClick);
    return () => document.removeEventListener('mousedown', handleDocClick);
  }, [open]);

  async function handleSelect(code: string) {
    if (code === currentCode) {
      setOpen(false);
      return;
    }
    setLoading(true);
    try {
      window.localStorage.setItem('xiigen.locale', code);
    } catch {
      // localStorage unavailable
    }
    persistPreference(code, true);
    try {
      await i18n.changeLanguage(code);
    } catch {
      // CF-812: fallback to English bundle — no UI exception
    }
    setLoading(false);
    setOpen(false);
  }

  return (
    <div
      ref={ref}
      style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}
    >
      <button
        type="button"
        data-testid="language-switcher"
        aria-label={t('switcher_label')}
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded border border-gray-300 bg-white text-gray-900 hover:bg-gray-50 text-sm font-medium"
      >
        <Globe size={16} aria-hidden="true" />
        <span>{current.display}</span>
        <ChevronDown size={14} aria-hidden="true" style={{ opacity: 0.6 }} />
      </button>

      {loading && (
        <span
          data-testid="language-switcher-loading"
          className="ml-2 text-xs text-gray-500"
        >
          {t('switcher_loading')}
        </span>
      )}

      {open && (
        <div
          data-testid="language-switcher-dropdown"
          role="menu"
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            right: 0,
            zIndex: 50,
            minWidth: 160,
          }}
          className="bg-white border border-gray-200 rounded-md shadow-lg py-1"
        >
          {LOCALES.map((locale) => {
            const active = locale.code === currentCode;
            return (
              <button
                key={locale.code}
                type="button"
                role="menuitemradio"
                aria-checked={active}
                data-testid={`locale-option-${locale.code}`}
                onClick={() => handleSelect(locale.code)}
                className={`flex w-full items-center justify-between px-3 py-2 text-sm ${
                  active ? 'bg-blue-50 text-blue-900 font-semibold' : 'text-gray-800 hover:bg-gray-50'
                }`}
              >
                <span>
                  <span className="font-mono text-xs mr-2">{locale.display}</span>
                  {locale.label}
                </span>
                {active && <Check size={14} aria-hidden="true" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default LanguageSwitcher;
