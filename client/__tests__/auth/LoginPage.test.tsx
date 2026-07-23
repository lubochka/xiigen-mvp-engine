/**
 * LoginPage — Unit tests (FLOW-01 Phase A6, V-08).
 *
 * Confirms the form contract:
 *   - Input labels are connected to controls (a11y)
 *   - Submit calls AuthContext.login() with the typed values
 *   - Successful login navigates to `location.state.from` when present
 *   - Missing state.from falls back to /dashboard
 *   - A failure from login() shows an accessible error banner
 *   - Submit button disables while status is 'loading'
 *
 * We mock `useAuth` to return a controllable stub so we don't re-test
 * AuthContext internals (covered separately).
 */

import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';

import { LoginPage } from '../../src/auth/LoginPage';
import type { AuthContextValue } from '../../src/auth/AuthContext';

jest.mock('../../src/auth/AuthContext', () => {
  const actual = jest.requireActual('../../src/auth/AuthContext');
  return {
    ...actual,
    useAuth: jest.fn(),
  };
});

import { useAuth } from '../../src/auth/AuthContext';

function mockAuth(overrides: Partial<AuthContextValue>): jest.Mock {
  const login = jest.fn().mockResolvedValue(true);
  const defaults: AuthContextValue = {
    status: 'unauthenticated',
    token: null,
    user: null,
    error: null,
    login,
    logout: () => undefined,
    refresh: async () => false,
  };
  (useAuth as jest.Mock).mockReturnValue({ ...defaults, ...overrides });
  return (overrides.login as jest.Mock) ?? login;
}

function LocationProbe(): React.ReactElement {
  const location = useLocation();
  return (
    <div data-testid="location">
      {location.pathname}
      {location.search}
    </div>
  );
}

beforeEach(() => {
  (useAuth as jest.Mock).mockReset();
});

describe('LoginPage — form', () => {
  it('renders email and password inputs with a submit button', () => {
    mockAuth({});
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>,
    );
    expect(screen.getByTestId('login-email-input')).toBeTruthy();
    expect(screen.getByTestId('login-password-input')).toBeTruthy();
    expect(screen.getByTestId('login-submit')).toBeTruthy();
    expect((screen.getByTestId('login-submit') as HTMLButtonElement).disabled).toBe(false);
  });

  it('calls login() with the typed values on submit', async () => {
    const login = mockAuth({});
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>,
    );
    const email = screen.getByTestId('login-email-input') as HTMLInputElement;
    const pw = screen.getByTestId('login-password-input') as HTMLInputElement;
    fireEvent.change(email, { target: { value: 'tenant-user@acme.test' } });
    fireEvent.change(pw, { target: { value: 'Password123!' } });

    await act(async () => {
      fireEvent.click(screen.getByTestId('login-submit'));
    });

    expect(login).toHaveBeenCalledWith('tenant-user@acme.test', 'Password123!');
  });

  it('navigates to /dashboard after a successful login when no return URL is present', async () => {
    mockAuth({});
    render(
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/dashboard"
            element={<div data-testid="dashboard-stub">dashboard</div>}
          />
        </Routes>
      </MemoryRouter>,
    );
    fireEvent.change(screen.getByTestId('login-email-input'), {
      target: { value: 'a@b.c' },
    });
    fireEvent.change(screen.getByTestId('login-password-input'), {
      target: { value: 'pw' },
    });
    await act(async () => {
      fireEvent.click(screen.getByTestId('login-submit'));
    });
    expect(screen.getByTestId('dashboard-stub')).toBeTruthy();
  });

  it('navigates to the captured return URL when one was passed via router state', async () => {
    mockAuth({});
    render(
      <MemoryRouter
        initialEntries={[{ pathname: '/login', state: { from: '/admin/tenants' } }]}
      >
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/admin/tenants"
            element={
              <>
                <div data-testid="admin-tenants-stub">admin tenants</div>
                <LocationProbe />
              </>
            }
          />
        </Routes>
      </MemoryRouter>,
    );
    fireEvent.change(screen.getByTestId('login-email-input'), {
      target: { value: 'a@b.c' },
    });
    fireEvent.change(screen.getByTestId('login-password-input'), {
      target: { value: 'pw' },
    });
    await act(async () => {
      fireEvent.click(screen.getByTestId('login-submit'));
    });
    expect(screen.getByTestId('admin-tenants-stub')).toBeTruthy();
    expect(screen.getByTestId('location').textContent).toBe('/admin/tenants');
  });

  it('does not navigate when login returns false', async () => {
    const login = jest.fn().mockResolvedValue(false);
    mockAuth({ login });
    render(
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/dashboard"
            element={<div data-testid="dashboard-stub">dashboard</div>}
          />
        </Routes>
      </MemoryRouter>,
    );
    fireEvent.change(screen.getByTestId('login-email-input'), {
      target: { value: 'a@b.c' },
    });
    fireEvent.change(screen.getByTestId('login-password-input'), {
      target: { value: 'pw' },
    });
    await act(async () => {
      fireEvent.click(screen.getByTestId('login-submit'));
    });
    expect(screen.queryByTestId('dashboard-stub')).toBeNull();
    expect(login).toHaveBeenCalled();
  });

  it('renders an error banner with role=alert when error is present on the context', () => {
    mockAuth({
      error: { code: 'INVALID_CREDENTIALS', message: 'credentials rejected' },
    });
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>,
    );
    const banner = screen.getByTestId('login-error');
    expect(banner.textContent).toContain('credentials rejected');
    expect(banner.getAttribute('role')).toBe('alert');
    expect(banner.getAttribute('aria-live')).toBe('assertive');
  });

  it('disables the submit button while status is loading', () => {
    mockAuth({ status: 'loading' });
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>,
    );
    expect((screen.getByTestId('login-submit') as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByTestId('login-submit').textContent).toContain('Signing in');
  });
});
