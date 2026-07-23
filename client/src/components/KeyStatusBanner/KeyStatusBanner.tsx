import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useViewerRole } from '../../hooks/useViewerRole';

interface KeyStatus {
  providers: { anthropic: string; openai: string; gemini: string };
  allConfigured: boolean;
  configuredCount: number;
}

interface KeyStatusBannerProps {
  tenantId: string;
  onProvisionClick: () => void;
}

export const KeyStatusBanner: React.FC<KeyStatusBannerProps> = ({ tenantId, onProvisionClick }) => {
  const { t } = useTranslation('banner');
  const { role } = useViewerRole();
  const [status, setStatus] = useState<KeyStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/tenant/${tenantId}/key-status`, {
        headers: { 'X-Tenant-Id': tenantId },
      });
      if (res.ok) setStatus(await res.json());
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    refresh();
  }, [tenantId, refresh]);

  if (loading || !status) return null;
  if (status.allConfigured) return null;
  if (dismissed) return null;

  // Provider-key banner is a development-only concern. In production PNG captures
  // and deployed tenants, the banner must never render — platform admins are
  // notified via ops channels, not in-UI warnings on every admin route.
  if (!import.meta.env.DEV) {
    return null;
  }

  // RUN-48 clean-PNG escape hatch: ?hideChrome=1 in the URL suppresses the banner.
  // RUN-173 FIX P4-5: alias ?bannerHide=1 for visual-audit captures that
  // want to hide only the provider-keys banner without touching other chrome.
  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search);
    if (params.get('hideChrome') === '1' || params.get('bannerHide') === '1') {
      return null;
    }
  }

  // RUN-49 CF-1 (Pro Max `consistency` P4): provider-key warnings are a
  // platform-admin concern only. Stripe Dashboard / Vercel / Datadog / AWS
  // Console all show config warnings only to roles that can act on them.
  // Non-admin roles never see this banner.
  if (role !== 'platform-admin') {
    return null;
  }

  const missingList = Object.entries(status.providers)
    .filter(([, v]) => v === 'missing')
    .map(([k]) => k)
    .join(', ');

  const severity = status.configuredCount === 0 ? 'error' : 'warning';

  return (
    <div
      data-testid="key-status-banner"
      data-severity={severity}
      role="alert"
      style={{
        padding: '12px 16px',
        backgroundColor: severity === 'error' ? '#fee2e2' : '#fef3c7',
        borderLeft: `4px solid ${severity === 'error' ? '#ef4444' : '#f59e0b'}`,
        marginBottom: '16px',
      }}
    >
      <span data-testid="banner-message">
        {severity === 'error'
          ? t('no_keys_configured', {
              defaultValue: 'No AI provider keys configured. Flows will use mock AI only.',
            })
          : t('missing_keys', {
              list: missingList,
              defaultValue: `Missing provider keys: ${missingList}. Training data will use fallback calibration until real keys are configured.`,
            })}
      </span>{' '}
      <button
        data-testid="provision-keys-button"
        onClick={onProvisionClick}
        style={{
          marginLeft: '8px',
          textDecoration: 'underline',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
        }}
      >
        {t('configure_keys', { defaultValue: 'Configure keys' })}
      </button>
      <button
        data-testid="banner-dismiss-btn"
        aria-label={t('dismiss', { defaultValue: 'Dismiss banner' })}
        onClick={() => setDismissed(true)}
        style={{
          marginLeft: '12px',
          float: 'right',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          fontSize: '16px',
          lineHeight: 1,
          color: '#6b7280',
          padding: '0 4px',
        }}
      >
        ×
      </button>
    </div>
  );
};
