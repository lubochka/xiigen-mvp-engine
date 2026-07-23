import React, { useState } from 'react';

interface KeyProvisioningFormProps {
  tenantId: string;
  onSuccess: () => void; // called after successful PUT — parent refreshes banner
}

export const KeyProvisioningForm: React.FC<KeyProvisioningFormProps> = ({
  tenantId,
  onSuccess,
}) => {
  const [anthropic, setAnthropic] = useState('');
  const [openai, setOpenai] = useState('');
  const [gemini, setGemini] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const canSubmit = (anthropic || openai || gemini).trim().length > 0 && !submitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);

    const keys: Record<string, string> = {};
    if (anthropic.trim()) keys['anthropic'] = anthropic.trim();
    if (openai.trim()) keys['openai'] = openai.trim();
    if (gemini.trim()) keys['gemini'] = gemini.trim();

    try {
      const res = await fetch(`/api/tenant/${tenantId}/keys`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'X-Tenant-Id': tenantId },
        body: JSON.stringify(keys),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError((body as Record<string, string>)['error_message'] ?? `Error ${res.status}`);
        return;
      }

      // Clear inputs immediately after submit — key values must not linger in state
      setAnthropic('');
      setOpenai('');
      setGemini('');
      setSuccess(true);
      onSuccess();
    } catch (e) {
      setError(`Network error: ${String(e)}`);
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div data-testid="provisioning-success">✅ Keys configured. AI providers are ready.</div>
    );
  }

  return (
    <div data-testid="key-provisioning-form">
      <p>
        Configure API keys for AI providers. All fields are optional — configure the providers you
        have.
      </p>

      <div>
        <label htmlFor="anthropic-key">Anthropic API key</label>
        <input
          id="anthropic-key"
          data-testid="anthropic-key-input"
          type="password"
          value={anthropic}
          onChange={(e) => setAnthropic(e.target.value)}
          placeholder="sk-ant-..."
          autoComplete="off"
        />
      </div>

      <div>
        <label htmlFor="openai-key">OpenAI API key</label>
        <input
          id="openai-key"
          data-testid="openai-key-input"
          type="password"
          value={openai}
          onChange={(e) => setOpenai(e.target.value)}
          placeholder="sk-..."
          autoComplete="off"
        />
      </div>

      <div>
        <label htmlFor="gemini-key">Gemini API key</label>
        <input
          id="gemini-key"
          data-testid="gemini-key-input"
          type="password"
          value={gemini}
          onChange={(e) => setGemini(e.target.value)}
          placeholder="AIza..."
          autoComplete="off"
        />
      </div>

      {error && (
        <div data-testid="provisioning-error" role="alert">
          {error}
        </div>
      )}

      <button data-testid="submit-keys-button" onClick={handleSubmit} disabled={!canSubmit}>
        {submitting ? 'Saving...' : 'Save keys'}
      </button>
    </div>
  );
};
