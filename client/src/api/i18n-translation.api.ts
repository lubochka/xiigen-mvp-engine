/**
 * FLOW-48 i18n-translation — client-side API hooks for user preferences.
 *
 * Endpoints (backed by T670 UserPreferencesManager):
 *   GET  /api/users/:userId/preferences
 *   PUT  /api/users/:userId/preferences  { locale, userOverride }
 */

import { useCallback, useEffect, useState } from 'react';

export const MASTER_USER_ID = 'xiigen-master-00000000-0000-0000-0000-000000000001';
export const MASTER_TENANT_ID = 'xiigen-master-00000000-0000-0000-0000-000000000001';

export interface UserPreferences {
  locale: string | null;
  userOverride: boolean;
}

interface UsePrefsState {
  data: UserPreferences | null;
  loading: boolean;
  error: string | null;
}

function preferencesUrl(userId: string): string {
  return `/api/users/${encodeURIComponent(userId)}/preferences`;
}

export function useUserPreferences(userId: string = MASTER_USER_ID) {
  const [state, setState] = useState<UsePrefsState>({
    data: null,
    loading: true,
    error: null,
  });

  const refetch = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const res = await fetch(preferencesUrl(userId), {
        headers: { 'X-Tenant-Id': MASTER_TENANT_ID },
      });
      const json = (await res.json()) as { success?: boolean; data?: unknown; error?: string };
      if (!res.ok || !json.success) {
        setState({ data: null, loading: false, error: json.error ?? `HTTP ${res.status}` });
        return;
      }
      const data = json.data as Partial<UserPreferences> | null;
      setState({
        data: {
          locale: typeof data?.locale === 'string' ? data.locale : null,
          userOverride: data?.userOverride === true,
        },
        loading: false,
        error: null,
      });
    } catch (err) {
      setState({ data: null, loading: false, error: String(err) });
    }
  }, [userId]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { ...state, refetch };
}

export interface UpdatePreferencesPayload {
  locale: string;
  userOverride?: boolean;
}

export function useUpdatePreferences(userId: string = MASTER_USER_ID) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const update = useCallback(
    async (payload: UpdatePreferencesPayload) => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(preferencesUrl(userId), {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'X-Tenant-Id': MASTER_TENANT_ID,
          },
          body: JSON.stringify({
            locale: payload.locale,
            userOverride: payload.userOverride ?? true,
          }),
        });
        const json = (await res.json()) as { success?: boolean; error?: string };
        if (!res.ok || !json.success) {
          const msg = json.error ?? `HTTP ${res.status}`;
          setError(msg);
          setLoading(false);
          return { ok: false as const, error: msg };
        }
        setLoading(false);
        return { ok: true as const };
      } catch (err) {
        const msg = String(err);
        setError(msg);
        setLoading(false);
        return { ok: false as const, error: msg };
      }
    },
    [userId],
  );

  return { update, loading, error };
}
