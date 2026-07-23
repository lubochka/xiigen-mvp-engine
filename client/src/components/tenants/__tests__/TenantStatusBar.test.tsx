/**
 * TenantStatusBar RTL tests — Phase A-0.
 *
 * Tests: loading state, 3 providers, 1-provider warning,
 *        SUSPENDED badge, error state, no key values in DOM.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { TenantStatusBar, TenantStatusData } from '../TenantStatusBar';

global.fetch = jest.fn();

function mockFetch(data: TenantStatusData, ok = true) {
  (global.fetch as jest.Mock).mockResolvedValueOnce({
    ok,
    json: async () => data,
  });
}

function mockFetchError(message: string) {
  (global.fetch as jest.Mock).mockResolvedValueOnce({
    ok: false,
    json: async () => ({ message }),
  });
}

const threeProviders: TenantStatusData = {
  tenantId: 'default',
  status: 'active',
  providers: [
    {
      id: 'p1',
      type: 'anthropic',
      availableModels: ['claude-sonnet-4-6'],
      addedAt: '2026-04-05T00:00:00Z',
    },
    { id: 'p2', type: 'openai', availableModels: ['gpt-4o'], addedAt: '2026-04-05T00:00:00Z' },
    {
      id: 'p3',
      type: 'gemini',
      availableModels: ['gemini-2.0-flash'],
      addedAt: '2026-04-05T00:00:00Z',
    },
  ],
};

const oneProvider: TenantStatusData = {
  tenantId: 'default',
  status: 'active',
  providers: [
    {
      id: 'p1',
      type: 'anthropic',
      availableModels: ['claude-sonnet-4-6'],
      addedAt: '2026-04-05T00:00:00Z',
    },
  ],
};

const suspendedTenant: TenantStatusData = {
  tenantId: 'default',
  status: 'suspended',
  providers: [],
};

beforeEach(() => jest.clearAllMocks());

describe('TenantStatusBar', () => {
  it('shows loading state while request is pending', () => {
    (global.fetch as jest.Mock).mockReturnValueOnce(new Promise(() => {})); // never resolves
    render(<TenantStatusBar tenantId="default" />);
    expect(screen.getByTestId('loading-state')).toBeInTheDocument();
  });

  it('shows tenant ID and "3 providers" badge when fully provisioned', async () => {
    mockFetch(threeProviders);
    render(<TenantStatusBar tenantId="default" />);
    await waitFor(() => {
      expect(screen.getByTestId('tenant-id')).toHaveTextContent('default');
      expect(screen.getByTestId('provider-pool-badge')).toHaveTextContent('3 providers');
    });
  });

  it('shows individual provider type chips for each provider', async () => {
    mockFetch(threeProviders);
    render(<TenantStatusBar tenantId="default" />);
    await waitFor(() => {
      expect(screen.getByTestId('provider-chip-anthropic')).toBeInTheDocument();
      expect(screen.getByTestId('provider-chip-openai')).toBeInTheDocument();
      expect(screen.getByTestId('provider-chip-gemini')).toBeInTheDocument();
    });
  });

  it('shows "⚠️ 1 provider" warning badge when pool has single provider', async () => {
    mockFetch(oneProvider);
    render(<TenantStatusBar tenantId="default" />);
    await waitFor(() => {
      expect(screen.getByTestId('provider-pool-badge')).toHaveTextContent('1 provider');
    });
  });

  it('shows SUSPENDED badge when tenant is suspended', async () => {
    mockFetch(suspendedTenant);
    render(<TenantStatusBar tenantId="default" />);
    await waitFor(() => {
      expect(screen.getByTestId('tenant-status-badge')).toHaveTextContent('SUSPENDED');
    });
  });

  it('shows error state with message when fetch fails', async () => {
    mockFetchError('Tenant not found');
    render(<TenantStatusBar tenantId="ghost" />);
    await waitFor(() => {
      expect(screen.getByTestId('error-state')).toHaveTextContent('Tenant not found');
    });
  });

  it('never shows any key value in the status bar', async () => {
    mockFetch(threeProviders);
    render(<TenantStatusBar tenantId="default" />);
    await waitFor(() => screen.getByTestId('provider-pool-badge'));
    const html = document.body.innerHTML;
    expect(html).not.toMatch(/sk-ant|sk-[a-z]/);
    expect(html).not.toContain('AIza');
    expect(html).not.toContain('encryptedKey');
  });
});
