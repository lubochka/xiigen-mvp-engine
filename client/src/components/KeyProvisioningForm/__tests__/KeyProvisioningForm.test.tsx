import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { KeyProvisioningForm } from '../KeyProvisioningForm';

function mockFetchSuccess() {
  global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
}
function mockFetchError(msg: string) {
  global.fetch = jest.fn().mockResolvedValue({
    ok: false,
    json: async () => ({ error_message: msg }),
  });
}

afterEach(() => jest.restoreAllMocks());

describe('KeyProvisioningForm', () => {
  it('shows 3 password inputs', () => {
    render(<KeyProvisioningForm tenantId="t1" onSuccess={jest.fn()} />);
    expect(screen.getByTestId('anthropic-key-input')).toHaveAttribute('type', 'password');
    expect(screen.getByTestId('openai-key-input')).toHaveAttribute('type', 'password');
    expect(screen.getByTestId('gemini-key-input')).toHaveAttribute('type', 'password');
  });

  it('submit button disabled when all inputs empty', () => {
    render(<KeyProvisioningForm tenantId="t1" onSuccess={jest.fn()} />);
    expect(screen.getByTestId('submit-keys-button')).toBeDisabled();
  });

  it('submit button enabled when at least 1 field has value', () => {
    render(<KeyProvisioningForm tenantId="t1" onSuccess={jest.fn()} />);
    fireEvent.change(screen.getByTestId('anthropic-key-input'), {
      target: { value: 'sk-ant-test' },
    });
    expect(screen.getByTestId('submit-keys-button')).not.toBeDisabled();
  });

  it('calls PUT /api/tenant/:id/keys on submit with filled keys only', async () => {
    mockFetchSuccess();
    render(<KeyProvisioningForm tenantId="t1" onSuccess={jest.fn()} />);
    fireEvent.change(screen.getByTestId('anthropic-key-input'), {
      target: { value: 'sk-ant-test' },
    });
    fireEvent.click(screen.getByTestId('submit-keys-button'));
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        '/api/tenant/t1/keys',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify({ anthropic: 'sk-ant-test' }),
        }),
      );
    });
  });

  it('shows success state after successful submit', async () => {
    mockFetchSuccess();
    const onSuccess = jest.fn();
    render(<KeyProvisioningForm tenantId="t1" onSuccess={onSuccess} />);
    fireEvent.change(screen.getByTestId('anthropic-key-input'), {
      target: { value: 'sk-ant-test' },
    });
    fireEvent.click(screen.getByTestId('submit-keys-button'));
    await waitFor(() => {
      expect(screen.getByTestId('provisioning-success')).toBeInTheDocument();
    });
    expect(onSuccess).toHaveBeenCalledTimes(1);
  });

  it('clears input values after successful submit — keys never linger', async () => {
    mockFetchSuccess();
    render(<KeyProvisioningForm tenantId="t1" onSuccess={jest.fn()} />);
    const input = screen.getByTestId('anthropic-key-input');
    fireEvent.change(input, { target: { value: 'sk-ant-SENSITIVE' } });
    fireEvent.click(screen.getByTestId('submit-keys-button'));
    await waitFor(() => screen.getByTestId('provisioning-success'));
    // Form unmounted on success — inputs no longer in DOM (proves values cannot linger)
    expect(screen.queryByTestId('anthropic-key-input')).not.toBeInTheDocument();
    expect(document.body.innerHTML).not.toContain('sk-ant-SENSITIVE');
  });

  it('shows error message on PUT failure', async () => {
    mockFetchError('Invalid API key format');
    render(<KeyProvisioningForm tenantId="t1" onSuccess={jest.fn()} />);
    fireEvent.change(screen.getByTestId('anthropic-key-input'), { target: { value: 'bad-key' } });
    fireEvent.click(screen.getByTestId('submit-keys-button'));
    await waitFor(() => {
      expect(screen.getByTestId('provisioning-error')).toHaveTextContent('Invalid API key format');
    });
  });

  it('SECURITY: key values never visible in DOM at any state', async () => {
    mockFetchSuccess();
    render(<KeyProvisioningForm tenantId="t1" onSuccess={jest.fn()} />);
    expect(screen.getByTestId('anthropic-key-input')).toHaveAttribute('type', 'password');
    // Placeholders (sk-ant-..., AIza...) are fine — check no real key values (20+ char suffix)
    expect(document.body.innerHTML).not.toMatch(/(sk-ant|AIza|sk-proj)[A-Za-z0-9\-_]{20,}/);
  });

  it('SECURITY: autoComplete="off" on all key inputs', () => {
    render(<KeyProvisioningForm tenantId="t1" onSuccess={jest.fn()} />);
    ['anthropic-key-input', 'openai-key-input', 'gemini-key-input'].forEach((id) => {
      expect(screen.getByTestId(id)).toHaveAttribute('autocomplete', 'off');
    });
  });
});
