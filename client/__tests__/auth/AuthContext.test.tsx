/**
 * AuthContext — Unit tests (FLOW-01 Phase A6, V-08).
 *
 * Exercises the provider + useAuth() hook end-to-end:
 *
 *   - boot with no stored token          → status = 'unauthenticated'
 *   - boot with stored token + good /me  → status = 'authenticated', user hydrated
 *   - boot with stored token + bad /me   → token cleared, status = 'unauthenticated'
 *   - login success                      → token persisted, user hydrated via /me
 *   - login failure (bad credentials)    → token NOT persisted, error surfaced
 *   - login success but /me fails        → token cleaned up (no orphan)
 *   - logout                             → state reset, token cleared
 *   - refresh success                    → new token persisted, user re-hydrated
 *   - refresh failure                    → token cleared
 *
 * Uses a chained fetch stub so we can distinguish which endpoint is being
 * called on any given step. Every assertion reads localStorage to confirm
 * the persistence contract.
 */

import React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';

import {
  AuthProvider,
  AUTH_STORAGE_KEY,
  useAuth,
  type AuthContextValue,
} from '../../src/auth/AuthContext';

// Response builders shared with api.test.ts-style shape.
function jsonResponse(status: number, body: unknown): Response {
  const text = JSON.stringify(body);
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => text,
  } as unknown as Response;
}

const LOGIN_DATA = {
  token: 'jwt.first',
  expiresAt: 1_000_000,
  jti: 'jti-1',
  userId: 'u-1',
  roles: ['tenant-user'],
};

const ME_DATA = {
  userId: 'u-1',
  tenantId: 'acme',
  roles: ['tenant-user'],
  jti: 'jti-1',
  expiresAt: 1_000_000,
};

interface StepQueue {
  readonly url: string;
  readonly response: Response;
}

function makeFetchStub(steps: StepQueue[]): jest.Mock {
  const queue = [...steps];
  const fn = jest.fn().mockImplementation((url: string) => {
    const next = queue.shift();
    if (!next) {
      throw new Error(`fetch stub exhausted; extra call to ${url}`);
    }
    if (!url.endsWith(next.url)) {
      throw new Error(`fetch stub expected ${next.url}, got ${url}`);
    }
    return Promise.resolve(next.response);
  });
  return fn;
}

function HookProbe({
  onReady,
}: {
  onReady: (ctx: AuthContextValue) => void;
}): React.ReactElement {
  const ctx = useAuth();
  React.useEffect(() => {
    onReady(ctx);
  }, [ctx, onReady]);
  return (
    <div>
      <span data-testid="status">{ctx.status}</span>
      <span data-testid="token">{ctx.token ?? 'null'}</span>
      <span data-testid="userId">{ctx.user?.userId ?? 'null'}</span>
      <span data-testid="errCode">{ctx.error?.code ?? 'null'}</span>
    </div>
  );
}

beforeEach(() => {
  window.localStorage.clear();
});

describe('AuthProvider — boot path', () => {
  it('lands in unauthenticated when no token is stored', async () => {
    const fetchFn = makeFetchStub([]);
    render(
      <AuthProvider apiConfig={{ fetchFn: fetchFn as unknown as typeof fetch, baseUrl: '' }}>
        <HookProbe onReady={() => undefined} />
      </AuthProvider>,
    );
    await waitFor(() =>
      expect(screen.getByTestId('status').textContent).toBe('unauthenticated'),
    );
    expect(fetchFn).toHaveBeenCalledTimes(0);
  });

  it('hydrates user from /me when a stored token is accepted', async () => {
    window.localStorage.setItem(AUTH_STORAGE_KEY, 'jwt.persistent');
    const fetchFn = makeFetchStub([
      {
        url: '/api/auth/me',
        response: jsonResponse(200, {
          isSuccess: true,
          data: ME_DATA,
          error: null,
          metadata: {},
        }),
      },
    ]);
    render(
      <AuthProvider apiConfig={{ fetchFn: fetchFn as unknown as typeof fetch, baseUrl: '' }}>
        <HookProbe onReady={() => undefined} />
      </AuthProvider>,
    );
    await waitFor(() =>
      expect(screen.getByTestId('status').textContent).toBe('authenticated'),
    );
    expect(screen.getByTestId('userId').textContent).toBe('u-1');
    expect(screen.getByTestId('token').textContent).toBe('jwt.persistent');
  });

  it('clears the stored token when /me rejects it on boot', async () => {
    window.localStorage.setItem(AUTH_STORAGE_KEY, 'jwt.stale');
    const fetchFn = makeFetchStub([
      {
        url: '/api/auth/me',
        response: jsonResponse(200, {
          isSuccess: false,
          data: null,
          error: { code: 'TOKEN_EXPIRED', message: 'expired' },
          metadata: {},
        }),
      },
    ]);
    render(
      <AuthProvider apiConfig={{ fetchFn: fetchFn as unknown as typeof fetch, baseUrl: '' }}>
        <HookProbe onReady={() => undefined} />
      </AuthProvider>,
    );
    await waitFor(() =>
      expect(screen.getByTestId('status').textContent).toBe('unauthenticated'),
    );
    expect(window.localStorage.getItem(AUTH_STORAGE_KEY)).toBeNull();
    expect(screen.getByTestId('errCode').textContent).toBe('TOKEN_EXPIRED');
  });

  it('skips the boot probe when skipBootProbe is true', async () => {
    window.localStorage.setItem(AUTH_STORAGE_KEY, 'jwt.persistent');
    const fetchFn = jest.fn();
    render(
      <AuthProvider
        skipBootProbe
        apiConfig={{ fetchFn: fetchFn as unknown as typeof fetch, baseUrl: '' }}
      >
        <HookProbe onReady={() => undefined} />
      </AuthProvider>,
    );
    await waitFor(() =>
      expect(screen.getByTestId('status').textContent).toBe('unauthenticated'),
    );
    expect(fetchFn).not.toHaveBeenCalled();
    // Persisted token is left untouched — skip is a test-only escape.
    expect(window.localStorage.getItem(AUTH_STORAGE_KEY)).toBe('jwt.persistent');
  });
});

describe('AuthProvider — login', () => {
  it('persists the token and hydrates user on a successful login', async () => {
    const fetchFn = makeFetchStub([
      {
        url: '/api/auth/login',
        response: jsonResponse(200, {
          isSuccess: true,
          data: LOGIN_DATA,
          error: null,
          metadata: {},
        }),
      },
      {
        url: '/api/auth/me',
        response: jsonResponse(200, {
          isSuccess: true,
          data: ME_DATA,
          error: null,
          metadata: {},
        }),
      },
    ]);

    let ctxRef: AuthContextValue | null = null;
    render(
      <AuthProvider
        skipBootProbe
        apiConfig={{ fetchFn: fetchFn as unknown as typeof fetch, baseUrl: '' }}
      >
        <HookProbe
          onReady={(c) => {
            ctxRef = c;
          }}
        />
      </AuthProvider>,
    );
    await waitFor(() => expect(ctxRef).not.toBeNull());

    let ok = false;
    await act(async () => {
      ok = await ctxRef!.login('a@b.c', 'pw');
    });
    expect(ok).toBe(true);
    expect(screen.getByTestId('status').textContent).toBe('authenticated');
    expect(window.localStorage.getItem(AUTH_STORAGE_KEY)).toBe('jwt.first');
    expect(screen.getByTestId('userId').textContent).toBe('u-1');
  });

  it('surfaces the server error and does NOT persist a token on bad credentials', async () => {
    const fetchFn = makeFetchStub([
      {
        url: '/api/auth/login',
        response: jsonResponse(200, {
          isSuccess: false,
          data: null,
          error: { code: 'INVALID_CREDENTIALS', message: 'credentials rejected' },
          metadata: {},
        }),
      },
    ]);

    let ctxRef: AuthContextValue | null = null;
    render(
      <AuthProvider
        skipBootProbe
        apiConfig={{ fetchFn: fetchFn as unknown as typeof fetch, baseUrl: '' }}
      >
        <HookProbe
          onReady={(c) => {
            ctxRef = c;
          }}
        />
      </AuthProvider>,
    );
    await waitFor(() => expect(ctxRef).not.toBeNull());

    let ok = true;
    await act(async () => {
      ok = await ctxRef!.login('nope@x.y', 'bad');
    });
    expect(ok).toBe(false);
    expect(screen.getByTestId('status').textContent).toBe('unauthenticated');
    expect(window.localStorage.getItem(AUTH_STORAGE_KEY)).toBeNull();
    expect(screen.getByTestId('errCode').textContent).toBe('INVALID_CREDENTIALS');
  });

  it('rolls back the persisted token when /me fails after a login 2xx', async () => {
    const fetchFn = makeFetchStub([
      {
        url: '/api/auth/login',
        response: jsonResponse(200, {
          isSuccess: true,
          data: LOGIN_DATA,
          error: null,
          metadata: {},
        }),
      },
      {
        url: '/api/auth/me',
        response: jsonResponse(200, {
          isSuccess: false,
          data: null,
          error: { code: 'TOKEN_INVALID', message: 'token invalid' },
          metadata: {},
        }),
      },
    ]);

    let ctxRef: AuthContextValue | null = null;
    render(
      <AuthProvider
        skipBootProbe
        apiConfig={{ fetchFn: fetchFn as unknown as typeof fetch, baseUrl: '' }}
      >
        <HookProbe
          onReady={(c) => {
            ctxRef = c;
          }}
        />
      </AuthProvider>,
    );
    await waitFor(() => expect(ctxRef).not.toBeNull());

    let ok = true;
    await act(async () => {
      ok = await ctxRef!.login('a@b.c', 'pw');
    });
    expect(ok).toBe(false);
    expect(window.localStorage.getItem(AUTH_STORAGE_KEY)).toBeNull();
    expect(screen.getByTestId('errCode').textContent).toBe('TOKEN_INVALID');
  });
});

describe('AuthProvider — logout', () => {
  it('clears in-memory state and localStorage', async () => {
    window.localStorage.setItem(AUTH_STORAGE_KEY, 'jwt.persistent');
    const fetchFn = makeFetchStub([
      {
        url: '/api/auth/me',
        response: jsonResponse(200, {
          isSuccess: true,
          data: ME_DATA,
          error: null,
          metadata: {},
        }),
      },
    ]);
    let ctxRef: AuthContextValue | null = null;
    render(
      <AuthProvider apiConfig={{ fetchFn: fetchFn as unknown as typeof fetch, baseUrl: '' }}>
        <HookProbe
          onReady={(c) => {
            ctxRef = c;
          }}
        />
      </AuthProvider>,
    );
    await waitFor(() =>
      expect(screen.getByTestId('status').textContent).toBe('authenticated'),
    );

    act(() => {
      ctxRef!.logout();
    });

    expect(screen.getByTestId('status').textContent).toBe('unauthenticated');
    expect(screen.getByTestId('token').textContent).toBe('null');
    expect(window.localStorage.getItem(AUTH_STORAGE_KEY)).toBeNull();
  });
});

describe('AuthProvider — refresh', () => {
  it('exchanges the stored token for a fresh one and re-hydrates the user', async () => {
    window.localStorage.setItem(AUTH_STORAGE_KEY, 'jwt.old');
    const fetchFn = makeFetchStub([
      // boot probe
      {
        url: '/api/auth/me',
        response: jsonResponse(200, {
          isSuccess: true,
          data: ME_DATA,
          error: null,
          metadata: {},
        }),
      },
      // refresh
      {
        url: '/api/auth/refresh',
        response: jsonResponse(200, {
          isSuccess: true,
          data: { ...LOGIN_DATA, token: 'jwt.renewed', jti: 'jti-2' },
          error: null,
          metadata: {},
        }),
      },
      // post-refresh /me
      {
        url: '/api/auth/me',
        response: jsonResponse(200, {
          isSuccess: true,
          data: { ...ME_DATA, jti: 'jti-2' },
          error: null,
          metadata: {},
        }),
      },
    ]);

    let ctxRef: AuthContextValue | null = null;
    render(
      <AuthProvider apiConfig={{ fetchFn: fetchFn as unknown as typeof fetch, baseUrl: '' }}>
        <HookProbe
          onReady={(c) => {
            ctxRef = c;
          }}
        />
      </AuthProvider>,
    );
    await waitFor(() =>
      expect(screen.getByTestId('status').textContent).toBe('authenticated'),
    );

    let ok = false;
    await act(async () => {
      ok = await ctxRef!.refresh();
    });

    expect(ok).toBe(true);
    expect(window.localStorage.getItem(AUTH_STORAGE_KEY)).toBe('jwt.renewed');
    expect(screen.getByTestId('token').textContent).toBe('jwt.renewed');
  });

  it('clears state when refresh fails (stale token)', async () => {
    window.localStorage.setItem(AUTH_STORAGE_KEY, 'jwt.old');
    const fetchFn = makeFetchStub([
      // boot probe succeeds
      {
        url: '/api/auth/me',
        response: jsonResponse(200, {
          isSuccess: true,
          data: ME_DATA,
          error: null,
          metadata: {},
        }),
      },
      // refresh fails
      {
        url: '/api/auth/refresh',
        response: jsonResponse(200, {
          isSuccess: false,
          data: null,
          error: { code: 'TOKEN_EXPIRED', message: 'expired' },
          metadata: {},
        }),
      },
    ]);
    let ctxRef: AuthContextValue | null = null;
    render(
      <AuthProvider apiConfig={{ fetchFn: fetchFn as unknown as typeof fetch, baseUrl: '' }}>
        <HookProbe
          onReady={(c) => {
            ctxRef = c;
          }}
        />
      </AuthProvider>,
    );
    await waitFor(() =>
      expect(screen.getByTestId('status').textContent).toBe('authenticated'),
    );

    let ok = true;
    await act(async () => {
      ok = await ctxRef!.refresh();
    });

    expect(ok).toBe(false);
    expect(screen.getByTestId('status').textContent).toBe('unauthenticated');
    expect(window.localStorage.getItem(AUTH_STORAGE_KEY)).toBeNull();
    expect(screen.getByTestId('errCode').textContent).toBe('TOKEN_EXPIRED');
  });

  it('is a NO-OP when no token is stored', async () => {
    const fetchFn = jest.fn();
    let ctxRef: AuthContextValue | null = null;
    render(
      <AuthProvider
        skipBootProbe
        apiConfig={{ fetchFn: fetchFn as unknown as typeof fetch, baseUrl: '' }}
      >
        <HookProbe
          onReady={(c) => {
            ctxRef = c;
          }}
        />
      </AuthProvider>,
    );
    await waitFor(() => expect(ctxRef).not.toBeNull());

    let ok = true;
    await act(async () => {
      ok = await ctxRef!.refresh();
    });
    expect(ok).toBe(false);
    expect(fetchFn).not.toHaveBeenCalled();
  });
});

describe('useAuth — default context value', () => {
  it('returns the no-op shape when no provider is mounted', () => {
    let ctxRef: AuthContextValue | null = null;
    render(
      <HookProbe
        onReady={(c) => {
          ctxRef = c;
        }}
      />,
    );
    expect(ctxRef).not.toBeNull();
    expect(ctxRef!.status).toBe('idle');
    expect(ctxRef!.token).toBeNull();
    expect(ctxRef!.user).toBeNull();
  });
});
