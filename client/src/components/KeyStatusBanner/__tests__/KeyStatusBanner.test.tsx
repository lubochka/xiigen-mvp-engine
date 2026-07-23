import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom';
import { KeyStatusBanner } from '../KeyStatusBanner';

function mockFetch(status: Record<string, unknown>) {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => status,
  });
}

// FLOW-01 Phase A6 / GR-001: The banner uses `useViewerRole()` which reads
// `useSearchParams()` — tests must wrap the component in a Router context.
// The banner is also gated to `role === 'platform-admin'`, which we inject
// via the URL param `?role=platform-admin` (handled inside the hook).
function renderBanner(ui: React.ReactElement): ReturnType<typeof render> {
  return render(
    <MemoryRouter initialEntries={[{ pathname: '/', search: '?role=platform-admin' }]}>
      {ui}
    </MemoryRouter>,
  );
}

// Stub `import.meta.env.DEV` equivalent: the banner early-returns in
// non-dev builds. Our ts-jest Vite shim rewrites `import.meta.env.DEV` to
// `true` before compile (client/jest.transform.vite.cjs), so the guard
// lets the banner render in tests.

afterEach(() => jest.restoreAllMocks());

describe('KeyStatusBanner', () => {
  it('renders nothing when all keys configured', async () => {
    mockFetch({
      allConfigured: true,
      configuredCount: 3,
      providers: { anthropic: 'configured', openai: 'configured', gemini: 'configured' },
    });
    renderBanner(<KeyStatusBanner tenantId="t1" onProvisionClick={jest.fn()} />);
    await waitFor(() => {
      expect(screen.queryByTestId('key-status-banner')).not.toBeInTheDocument();
    });
  });

  it('renders error banner when 0 keys configured', async () => {
    mockFetch({
      allConfigured: false,
      configuredCount: 0,
      providers: { anthropic: 'missing', openai: 'missing', gemini: 'missing' },
    });
    renderBanner(<KeyStatusBanner tenantId="t1" onProvisionClick={jest.fn()} />);
    await waitFor(() => {
      expect(screen.getByTestId('key-status-banner')).toHaveAttribute('data-severity', 'error');
    });
  });

  it('renders warning banner when some keys missing', async () => {
    mockFetch({
      allConfigured: false,
      configuredCount: 1,
      providers: { anthropic: 'configured', openai: 'missing', gemini: 'missing' },
    });
    renderBanner(<KeyStatusBanner tenantId="t1" onProvisionClick={jest.fn()} />);
    await waitFor(() => {
      expect(screen.getByTestId('key-status-banner')).toHaveAttribute('data-severity', 'warning');
      expect(screen.getByTestId('banner-message')).toHaveTextContent('openai');
    });
  });

  it('renders "Configure keys" button when keys missing', async () => {
    mockFetch({
      allConfigured: false,
      configuredCount: 0,
      providers: { anthropic: 'missing', openai: 'missing', gemini: 'missing' },
    });
    renderBanner(<KeyStatusBanner tenantId="t1" onProvisionClick={jest.fn()} />);
    await waitFor(() => {
      expect(screen.getByTestId('provision-keys-button')).toBeInTheDocument();
    });
  });

  it('calls onProvisionClick when button clicked', async () => {
    mockFetch({
      allConfigured: false,
      configuredCount: 0,
      providers: { anthropic: 'missing', openai: 'missing', gemini: 'missing' },
    });
    const handler = jest.fn();
    renderBanner(<KeyStatusBanner tenantId="t1" onProvisionClick={handler} />);
    await waitFor(() => screen.getByTestId('provision-keys-button'));
    screen.getByTestId('provision-keys-button').click();
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('SECURITY: never displays key values in any state', async () => {
    mockFetch({
      allConfigured: false,
      configuredCount: 1,
      providers: { anthropic: 'configured', openai: 'missing', gemini: 'missing' },
    });
    renderBanner(<KeyStatusBanner tenantId="t1" onProvisionClick={jest.fn()} />);
    await waitFor(() => screen.getByTestId('key-status-banner'));
    expect(document.body.innerHTML).not.toMatch(/sk-ant|sk-[a-z]|AIza/);
  });
});
