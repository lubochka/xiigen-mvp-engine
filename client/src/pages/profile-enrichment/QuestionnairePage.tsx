/**
 * QuestionnairePage — FLOW-02 Phase A entry screen.
 * Route: /questionnaire
 *
 * Role-aware screen (C6 / SK-539): FLOW-02 is Tier 3 (4 required + 1
 * conditional = 5 cells). Role-specific form labels and placeholders while
 * preserving the FLOW-01-RAG-03 principle (uniform validation error, no
 * field name).
 *
 * Kiosk grammar (G5, per .impeccable.md): step indicator + progress bar +
 * "Continue" verb-primary CTA + "Skip for now" secondary link on every
 * role variant. 3-step wizard: Questionnaire (1) → Matching (2) →
 * Personalization (3).
 *
 * Playwright mock hooks (driven by query params, NOT role-gated):
 *   ?duplicate=true   → debounce pending state (data-testid="debounce-pending")
 *   ?mock=submitted   → processing state (data-testid="processing")
 *   otherwise         → role-aware form (data-testid="questionnaire-form")
 */

import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { RoleScopedView } from '../../components/common/RoleScopedView';
import { useViewerRole } from '../../hooks/useViewerRole';
import { useProfileEnrichmentAdaptation } from '../../hooks/useProfileEnrichmentAdaptation';
import { ProfileEnrichmentAdaptationBanner } from './ProfileEnrichmentAdaptationBanner';

const WIZARD_CURRENT_STEP = 1;
const WIZARD_TOTAL_STEPS = 3;

function WizardHeader() {
  const pct = Math.round((WIZARD_CURRENT_STEP / WIZARD_TOTAL_STEPS) * 100);
  return (
    <div className="mb-6" data-testid="wizard-step-header">
      <p className="text-xs text-gray-500 mb-2 font-medium" data-testid="wizard-step-indicator">
        Step {WIZARD_CURRENT_STEP} of {WIZARD_TOTAL_STEPS}
      </p>
      <div
        className="w-full h-1.5 bg-gray-100 rounded overflow-hidden"
        data-testid="wizard-progress-bar"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${pct}% complete`}
      >
        <div className="h-full bg-blue-600 transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

interface WizardFooterProps {
  onSkip: () => void;
  adminOverrideTag?: boolean;
}

function WizardFooter({ onSkip, adminOverrideTag = false }: WizardFooterProps) {
  return (
    <div className="mt-2">
      {adminOverrideTag ? (
        <div className="flex gap-2 items-center">
          <button
            data-testid="submit-button"
            type="submit"
            className="flex-1 bg-blue-600 text-white py-2 px-4 rounded text-sm font-medium hover:bg-blue-700"
            style={{ minHeight: '44px' }}
          >
            Continue
          </button>
          <span
            data-testid="questionnaire-admin-tag"
            className="text-xs text-orange-700 bg-orange-50 px-2 py-1 rounded border border-orange-200"
          >
            Admin override
          </span>
        </div>
      ) : (
        <button
          data-testid="submit-button"
          type="submit"
          className="w-full bg-blue-600 text-white py-2 px-4 rounded text-sm font-medium hover:bg-blue-700"
          style={{ minHeight: '44px' }}
        >
          Continue
        </button>
      )}
      <button
        data-testid="wizard-skip-link"
        type="button"
        onClick={onSkip}
        className="w-full mt-2 text-xs text-gray-500 hover:text-gray-700 underline"
      >
        Skip for now
      </button>
    </div>
  );
}

export function QuestionnairePage() {
  const { role } = useViewerRole();
  const adaptation = useProfileEnrichmentAdaptation();
  const [searchParams] = useSearchParams();
  const duplicate = searchParams.get('duplicate') === 'true';
  const mockSubmitted = searchParams.get('mock') === 'submitted';

  const [industry, setIndustry] = useState('');
  const [stage, setStage] = useState('');
  const [partnerNeed, setPartnerNeed] = useState('');
  const [validationError, setValidationError] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Debounce / duplicate state — unchanged, not role-gated
  if (duplicate) {
    return (
      <div
        className="max-w-md mx-auto mt-16 p-8 bg-white rounded-lg shadow"
        data-testid="page-questionnaire"
      >
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Business Questionnaire</h1>
        <div
          data-testid="debounce-pending"
          className="p-4 bg-yellow-50 border border-yellow-200 rounded text-center"
        >
          <p className="text-yellow-700 text-sm font-medium">
            Your questionnaire is being processed
          </p>
          <p className="text-yellow-600 text-xs mt-1">Please wait a moment before resubmitting.</p>
        </div>
      </div>
    );
  }

  // Processing / submitted state — unchanged, not role-gated
  if (mockSubmitted || submitted) {
    return (
      <div
        className="max-w-md mx-auto mt-16 p-8 bg-white rounded-lg shadow"
        data-testid="page-questionnaire"
      >
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Business Questionnaire</h1>
        <div
          data-testid="processing"
          className="p-4 bg-blue-50 border border-blue-200 rounded text-center"
        >
          <p className="text-blue-700 text-sm font-medium">Processing your business profile…</p>
          <p className="text-blue-600 text-xs mt-1">This may take a few moments.</p>
        </div>
      </div>
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setValidationError(false);

    // Uniform validation — no field name in error (FLOW-01-RAG-03 principle)
    if (!industry.trim()) {
      setValidationError(true);
      return;
    }

    setSubmitted(true);
  }

  function handleSkip() {
    // Skip bypasses validation — advances wizard to processing/next step
    setValidationError(false);
    setSubmitted(true);
  }

  // FLOW-01-RAG-03: uniform validation error — preserved across all role branches
  function ValidationError() {
    if (!validationError) return null;
    return (
      <p
        role="alert"
        data-testid="questionnaire-validation-error"
        className="mb-4 text-sm text-red-600 bg-red-50 rounded px-3 py-2"
      >
        Please review your submission.
      </p>
    );
  }

  const pageTitle =
    role === 'freelancer'
      ? 'Freelancer Profile Setup'
      : role === 'business-partner'
        ? 'Business Partner Profile'
        : role === 'event-organiser'
          ? 'Event Organiser Profile'
          : role === 'tenant-admin'
            ? 'User Profile (Admin View)'
            : 'Business Questionnaire';

  const pageSubtitle =
    role === 'freelancer'
      ? 'Tell us about your skills and availability to receive matched client opportunities.'
      : role === 'business-partner'
        ? 'Tell us about your business to find matched freelancers and partner companies.'
        : role === 'event-organiser'
          ? 'Tell us about your events to personalise your event management experience.'
          : role === 'tenant-admin'
            ? "View or update this user's business profile. Changes affect their personalised recommendations."
            : 'Tell us about your business to receive personalised recommendations.';

  return (
    <div
      className="max-w-md mx-auto mt-16 p-8 bg-white rounded-lg shadow"
      data-testid="page-questionnaire"
      data-viewer-role={role}
    >
      <WizardHeader />
      <h1 className="text-2xl font-bold text-gray-900 mb-6">{pageTitle}</h1>
      <p className="text-sm text-gray-500 mb-6">{pageSubtitle}</p>
      <ProfileEnrichmentAdaptationBanner adaptation={adaptation} />

      <RoleScopedView role={role} testIdPrefix="questionnaire-role">
        {/* Branch 1 — tenant-admin (admin-override variant) */}
        <RoleScopedView.Case when="tenant-admin">
          <div data-testid="questionnaire-role-admin-view">
            <div
              data-testid="questionnaire-admin-banner"
              className="mb-3 p-3 rounded bg-orange-50 border border-orange-200 text-sm text-orange-900"
            >
              Admin view — you are editing on behalf of a user.
            </div>
            <p data-testid="questionnaire-admin-note" className="text-xs text-orange-700 mb-4">
              Changes you make here will affect this user's personalised match results.
            </p>
            <form data-testid="questionnaire-form" onSubmit={handleSubmit} noValidate>
              <div className="mb-4">
                <label
                  htmlFor="industry-input"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Industry
                </label>
                <input
                  id="industry-input"
                  data-testid="industry-input"
                  type="text"
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  placeholder="e.g. Technology, Retail, Healthcare"
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="mb-6">
                <label
                  htmlFor="stage-input"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Business Stage
                </label>
                <input
                  id="stage-input"
                  data-testid="stage-input"
                  type="text"
                  value={stage}
                  onChange={(e) => setStage(e.target.value)}
                  placeholder="e.g. Startup, Growth, Enterprise"
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <ValidationError />
              <WizardFooter onSkip={handleSkip} adminOverrideTag />
            </form>
          </div>
        </RoleScopedView.Case>

        {/* Branch 2 — freelancer (skills + availability) */}
        <RoleScopedView.Case when="freelancer">
          <div data-testid="questionnaire-role-freelancer-view">
            <form data-testid="questionnaire-form" onSubmit={handleSubmit} noValidate>
              <div className="mb-4">
                <label
                  htmlFor="industry-input"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Primary Skill Category{' '}
                  <span className="text-red-500" aria-label="required">
                    *
                  </span>
                </label>
                <input
                  id="industry-input"
                  data-testid="industry-input"
                  type="text"
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  placeholder="e.g. Software Development, Design, Writing"
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="mb-6">
                <label
                  htmlFor="stage-input"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Availability
                </label>
                <input
                  id="stage-input"
                  data-testid="stage-input"
                  type="text"
                  value={stage}
                  onChange={(e) => setStage(e.target.value)}
                  placeholder="e.g. Full-time, Part-time, Project-based"
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <ValidationError />
              <WizardFooter onSkip={handleSkip} />
            </form>
          </div>
        </RoleScopedView.Case>

        {/* Branch 3 — business-partner (industry + stage + hiring-need) */}
        <RoleScopedView.Case when="business-partner">
          <div data-testid="questionnaire-role-partner-view">
            <form data-testid="questionnaire-form" onSubmit={handleSubmit} noValidate>
              <div className="mb-4">
                <label
                  htmlFor="industry-input"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Industry{' '}
                  <span className="text-red-500" aria-label="required">
                    *
                  </span>
                </label>
                <input
                  id="industry-input"
                  data-testid="industry-input"
                  type="text"
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  placeholder="e.g. Technology, Finance, Retail"
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="mb-4">
                <label
                  htmlFor="stage-input"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Business Stage
                </label>
                <input
                  id="stage-input"
                  data-testid="stage-input"
                  type="text"
                  value={stage}
                  onChange={(e) => setStage(e.target.value)}
                  placeholder="e.g. Startup, Growth, Enterprise"
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="mb-6">
                <label
                  htmlFor="questionnaire-partner-need"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Primary hiring need
                </label>
                <input
                  id="questionnaire-partner-need"
                  data-testid="questionnaire-partner-need"
                  type="text"
                  value={partnerNeed}
                  onChange={(e) => setPartnerNeed(e.target.value)}
                  placeholder="e.g. Software development, Design, Marketing"
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <ValidationError />
              <WizardFooter onSkip={handleSkip} />
            </form>
          </div>
        </RoleScopedView.Case>

        {/* Branch 4 — event-organiser (event type + organisation stage) */}
        <RoleScopedView.Case when="event-organiser">
          <div data-testid="questionnaire-role-organiser-view">
            <form data-testid="questionnaire-form" onSubmit={handleSubmit} noValidate>
              <div className="mb-4">
                <label
                  htmlFor="industry-input"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Event Type Focus{' '}
                  <span className="text-red-500" aria-label="required">
                    *
                  </span>
                </label>
                <input
                  id="industry-input"
                  data-testid="industry-input"
                  type="text"
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  placeholder="e.g. Conferences, Workshops, Networking"
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="mb-6">
                <label
                  htmlFor="stage-input"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Organisation Stage
                </label>
                <input
                  id="stage-input"
                  data-testid="stage-input"
                  type="text"
                  value={stage}
                  onChange={(e) => setStage(e.target.value)}
                  placeholder="e.g. Individual, Small team, Agency"
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <ValidationError />
              <WizardFooter onSkip={handleSkip} />
            </form>
          </div>
        </RoleScopedView.Case>

        {/* Fallback — default role with wizard footer */}
        <RoleScopedView.Fallback>
          <form data-testid="questionnaire-form" onSubmit={handleSubmit} noValidate>
            <div className="mb-4">
              <label
                htmlFor="industry-input"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Industry
              </label>
              <input
                id="industry-input"
                data-testid="industry-input"
                type="text"
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                placeholder="e.g. Technology, Retail, Healthcare"
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="mb-6">
              <label htmlFor="stage-input" className="block text-sm font-medium text-gray-700 mb-1">
                Business Stage
              </label>
              <input
                id="stage-input"
                data-testid="stage-input"
                type="text"
                value={stage}
                onChange={(e) => setStage(e.target.value)}
                placeholder="e.g. Startup, Growth, Enterprise"
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* FLOW-01-RAG-03 principle: uniform validation error — no field name */}
            <ValidationError />

            <WizardFooter onSkip={handleSkip} />
          </form>
        </RoleScopedView.Fallback>
      </RoleScopedView>
    </div>
  );
}
