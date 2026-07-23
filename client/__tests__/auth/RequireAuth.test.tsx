/**
 * RequireAuth — Unit tests (FLOW-01 Phase A6, V-08).
 *
 * Confirms:
 *   - Unauthenticated viewers bounce to /login, carrying the return URL.
 *   - Authenticated viewers see the protected child unchanged.
 *   - Loading state renders the placeholder (not the child, not a redirect).
 *   - Custom `loginPath` overrides the default.
 *
 * We mock `useAuth` directly — this test is about the guard's branching, not
 * about the provider's state machine (that's covered in AuthContext.test.tsx).
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';

import { RequireAuth } from '../../src/auth/RequireAuth';
import type { AuthContextValue } from '../../src/auth/AuthContext';

jest.mock('../../src/auth/AuthContext', () => {
  const actual = jest.requireActual('../../src/auth/AuthContext');
  return {
    ...actual,
    useAuth: jest.fn(),
  };
});

import { useAuth } from '../../src/auth/AuthContext';

function mockAuth(value: Partial<AuthContextValue>): void {
  const defaults: AuthContextValue = {
    status: 'idle',
    token: null,
    user: null,
    error: null,
    login: async () => false,
    logout: () => undefined,
    refresh: async () => false,
  };
  (useAuth as jest.Mock).mockReturnValue({ ...defaults, ...value });
}

function LoginStub(): React.ReactElement {
  const location = useLocation();
  const state = location.state as { from?: string } | null;
  return (
    <div data-testid="login-stub">
      login-page|from={state?.from ?? 'none'}
    </div>
  );
}

function Protected(): React.ReactElement {
  return <div data-testid="protected">protected content</div>;
}

describe('RequireAuth', () => {
  beforeEach(() => {
    (useAuth as jest.Mock).mockReset();
  });

  it('renders children when authenticated', () => {
    mockAuth({ status: 'authenticated' });
    render(
      <MemoryRouter initialEntries={['/secret']}>
        <Routes>
          <Route
            path="/secret"
            element={
              <RequireAuth>
                <Protected />
              </RequireAuth>
            }
          />
          <Route path="/login" element={<LoginStub />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByTestId('protected')).toBeTruthy();
    expect(screen.queryByTestId('login-stub')).toBeNull();
  });

  it('redirects to /login with state.from preserved when unauthenticated', () => {
    mockAuth({ status: 'unauthenticated' });
    render(
      <MemoryRouter initialEntries={['/secret?x=1']}>
        <Routes>
          <Route
            path="/secret"
            element={
              <RequireAuth>
                <Protected />
              </RequireAuth>
            }
          />
          <Route path="/login" element={<LoginStub />} />
        </Routes>
      </MemoryRouter>,
    );
    const loginStub = screen.getByTestId('login-stub');
    expect(loginStub.textContent).toBe('login-page|from=/secret?x=1');
    expect(screen.queryByTestId('protected')).toBeNull();
  });

  it('renders the loading placeholder while status is loading', () => {
    mockAuth({ status: 'loading' });
    render(
      <MemoryRouter initialEntries={['/secret']}>
        <Routes>
          <Route
            path="/secret"
            element={
              <RequireAuth>
                <Protected />
              </RequireAuth>
            }
          />
          <Route path="/login" element={<LoginStub />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByTestId('require-auth-loading')).toBeTruthy();
    expect(screen.queryByTestId('protected')).toBeNull();
    expect(screen.queryByTestId('login-stub')).toBeNull();
  });

  it('renders the loading placeholder while status is idle (initial render)', () => {
    mockAuth({ status: 'idle' });
    render(
      <MemoryRouter initialEntries={['/secret']}>
        <Routes>
          <Route
            path="/secret"
            element={
              <RequireAuth>
                <Protected />
              </RequireAuth>
            }
          />
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByTestId('require-auth-loading')).toBeTruthy();
  });

  it('supports a custom loginPath', () => {
    mockAuth({ status: 'unauthenticated' });
    render(
      <MemoryRouter initialEntries={['/admin']}>
        <Routes>
          <Route
            path="/admin"
            element={
              <RequireAuth loginPath="/auth/signin">
                <Protected />
              </RequireAuth>
            }
          />
          <Route
            path="/auth/signin"
            element={<div data-testid="custom-signin">custom-signin</div>}
          />
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByTestId('custom-signin')).toBeTruthy();
  });

  it('renders a custom loadingFallback when supplied', () => {
    mockAuth({ status: 'loading' });
    render(
      <MemoryRouter initialEntries={['/secret']}>
        <Routes>
          <Route
            path="/secret"
            element={
              <RequireAuth loadingFallback={<span data-testid="custom-loading">…</span>}>
                <Protected />
              </RequireAuth>
            }
          />
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByTestId('custom-loading')).toBeTruthy();
  });
});
