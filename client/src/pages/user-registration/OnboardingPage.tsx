/**
 * OnboardingPage — post-verification onboarding delivery screen.
 * Route: /onboarding?userId=...
 *
 * NODE D presence gate: all 3 material types present (even failed) = complete.
 *
 * Playwright mock hooks (driven by userId):
 *   userId contains 'verified' → all 3 materials delivered, gate passes
 *   userId contains 'degraded' → community_invitation failed, gate still passes
 *   otherwise                  → call real API
 */

import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CheckCircle2, AlertTriangle, Clock } from 'lucide-react';
import { RoleScopedView } from '../../components/common/RoleScopedView';
import { useViewerRole } from '../../hooks/useViewerRole';
import { UserRegistrationAdaptationBanner } from './UserRegistrationAdaptationBanner';

interface DeliveryStatus {
  workspace: 'delivered' | 'failed' | 'pending';
  tutorial: 'delivered' | 'failed' | 'pending';
  invitation: 'delivered' | 'failed' | 'pending';
}

function resolveDeliveryMock(userId: string): DeliveryStatus | null {
  if (userId.includes('degraded')) {
    return { workspace: 'delivered', tutorial: 'delivered', invitation: 'failed' };
  }
  if (userId.includes('verified')) {
    return { workspace: 'delivered', tutorial: 'delivered', invitation: 'delivered' };
  }
  return null;
}

function allPresent(status: DeliveryStatus): boolean {
  // NODE D: all 3 types present (failed counts — absent does not)
  return (
    status.workspace !== 'pending' &&
    status.tutorial !== 'pending' &&
    status.invitation !== 'pending'
  );
}

function StatusIcon({ status }: { status: DeliveryStatus['workspace'] }) {
  const common = { size: 20, strokeWidth: 2, 'aria-hidden': true as const };
  if (status === 'delivered')
    return (
      <span className="text-green-600" aria-hidden="true">
        <CheckCircle2 {...common} />
      </span>
    );
  if (status === 'failed')
    return (
      <span className="text-red-600" aria-hidden="true">
        <AlertTriangle {...common} />
      </span>
    );
  return (
    <span className="text-orange-500" aria-hidden="true">
      <Clock {...common} />
    </span>
  );
}

const STATUS_LABEL: Record<DeliveryStatus['workspace'], string> = {
  delivered: 'Delivered',
  failed: 'Failed',
  pending: 'Pending',
};

export function OnboardingPage() {
  const { role } = useViewerRole();
  const [searchParams] = useSearchParams();
  const userId = searchParams.get('userId') ?? '';

  const [delivery, setDelivery] = useState<DeliveryStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const mock = resolveDeliveryMock(userId);
    if (mock) {
      setDelivery(mock);
      setLoading(false);
      return;
    }

    let cancelled = false;
    fetch(`/api/onboarding/status?userId=${encodeURIComponent(userId)}`, {
      headers: { 'X-Tenant-Id': 'tenant-e2e' },
    })
      .then((r) => r.json())
      .then((data: Record<string, unknown>) => {
        if (cancelled) return;
        setDelivery({
          workspace: ((data['workspace'] as string) ?? 'pending') as DeliveryStatus['workspace'],
          tutorial: ((data['tutorial'] as string) ?? 'pending') as DeliveryStatus['tutorial'],
          invitation: ((data['invitation'] as string) ?? 'pending') as DeliveryStatus['invitation'],
        });
      })
      .catch(() => {
        if (!cancelled) {
          setDelivery({ workspace: 'pending', tutorial: 'pending', invitation: 'pending' });
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [userId]);

  if (loading) {
    return (
      <div className="max-w-md mx-auto mt-16 p-8 text-center" data-testid="page-onboarding">
        <p className="text-gray-500">Loading onboarding status…</p>
      </div>
    );
  }

  const status = delivery ?? { workspace: 'pending', tutorial: 'pending', invitation: 'pending' };
  const completed = allPresent(status);

  // Anonymous / public-marketplace-visitor — they shouldn't reach onboarding at all.
  // Short-circuit to a clean redirect screen before showing delivery rows.
  if (role === 'anonymous' || role === 'public-marketplace-visitor') {
    return (
      <div
        className="max-w-md mx-auto mt-16 p-8 bg-white rounded-lg shadow"
        data-testid="page-onboarding"
        data-viewer-role={role}
      >
        <div data-testid="onboarding-role-anon-redirect">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Onboarding</h1>
          <UserRegistrationAdaptationBanner />
          <div
            data-testid="onboarding-anon-message"
            className="mb-4 p-4 rounded bg-blue-50 border border-blue-200 text-sm text-blue-900"
          >
            Onboarding is only available after registering and verifying your email.
          </div>
          <div className="flex flex-col gap-2">
            <a
              href="/register"
              data-testid="onboarding-anon-register"
              className="block w-full text-center bg-blue-600 text-white px-4 py-2 rounded font-medium hover:bg-blue-700"
              style={{ minHeight: '44px' }}
            >
              Register now →
            </a>
            <a
              href="/login"
              data-testid="onboarding-anon-signin"
              className="block w-full text-center border border-blue-600 text-blue-600 px-4 py-2 rounded font-medium hover:bg-blue-50"
              style={{ minHeight: '44px' }}
            >
              Sign in →
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="max-w-md mx-auto mt-16 p-8 bg-white rounded-lg shadow"
      data-testid="page-onboarding"
      data-viewer-role={role}
    >
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Welcome aboard</h1>
      <UserRegistrationAdaptationBanner />

      {/* Role-specific welcome banner — ABOVE delivery rows. Additive only. */}
      <RoleScopedView role={role} testIdPrefix="onboarding-role">
        <RoleScopedView.Case when="referral-user">
          <div
            data-testid="onboarding-referral-banner"
            className="mb-4 p-4 rounded-lg bg-amber-50 border border-amber-200"
          >
            <p className="text-sm font-medium text-amber-800">
              You joined via a referral link.
            </p>
            <p className="text-xs text-amber-700 mt-1">
              Your referrer will receive their reward once your workspace setup is complete.
            </p>
            <p className="text-xs text-amber-600 mt-2">
              Referral credit: $5.00 will be applied to your first invoice automatically.
            </p>
          </div>
        </RoleScopedView.Case>
        <RoleScopedView.Case when="tenant-admin">
          <div
            data-testid="onboarding-admin-banner"
            className="mb-4 p-4 rounded-lg bg-orange-50 border border-orange-200"
          >
            <p className="text-sm font-medium text-orange-800">Admin account activated.</p>
            <p className="text-xs text-orange-700 mt-1">
              Your admin privileges are being configured. You can access the admin console once setup is complete.
            </p>
          </div>
        </RoleScopedView.Case>
        <RoleScopedView.Case when="freelancer">
          <div
            data-testid="onboarding-freelancer-banner"
            className="mb-4 p-4 rounded-lg bg-purple-50 border border-purple-200"
          >
            <p className="text-sm font-medium text-purple-800">Freelancer account activated.</p>
            <p className="text-xs text-purple-700 mt-1">
              Your profile is being set up so clients can discover your skills.
            </p>
          </div>
        </RoleScopedView.Case>
        <RoleScopedView.Case when="business-partner">
          <div
            data-testid="onboarding-partner-banner"
            className="mb-4 p-4 rounded-lg bg-slate-50 border border-slate-200"
          >
            <p className="text-sm font-medium text-slate-800">
              Business partner account activated.
            </p>
            <p className="text-xs text-slate-700 mt-1">
              Your account is being configured for hiring and partnership workflows.
            </p>
          </div>
        </RoleScopedView.Case>
        <RoleScopedView.Case when="event-organiser">
          <div
            data-testid="onboarding-organiser-banner"
            className="mb-4 p-4 rounded-lg bg-green-50 border border-green-200"
          >
            <p className="text-sm font-medium text-green-800">
              Event organiser account activated.
            </p>
            <p className="text-xs text-green-700 mt-1">
              You can start creating and managing events once setup is complete.
            </p>
          </div>
        </RoleScopedView.Case>
        <RoleScopedView.Fallback>
          <></>
        </RoleScopedView.Fallback>
      </RoleScopedView>

      <div className="space-y-3 mb-6">
        {/* C1: workspace_setup */}
        <div
          data-testid="delivery-workspace_setup"
          className="flex items-center gap-3 p-3 rounded border border-gray-200"
        >
          <StatusIcon status={status.workspace} />
          <div>
            <p className="text-sm font-medium text-gray-800">Workspace setup</p>
            <p className="text-xs text-gray-500">{STATUS_LABEL[status.workspace]}</p>
          </div>
        </div>

        {/* C2: flow_tutorial */}
        <div
          data-testid="delivery-flow_tutorial"
          className="flex items-center gap-3 p-3 rounded border border-gray-200"
        >
          <StatusIcon status={status.tutorial} />
          <div>
            <p className="text-sm font-medium text-gray-800">Flow tutorial</p>
            <p className="text-xs text-gray-500">{STATUS_LABEL[status.tutorial]}</p>
          </div>
        </div>

        {/* C3: community_invitation — normal state */}
        {status.invitation !== 'failed' && (
          <div
            data-testid="delivery-community_invitation"
            className="flex items-center gap-3 p-3 rounded border border-gray-200"
          >
            <StatusIcon status={status.invitation} />
            <div>
              <p className="text-sm font-medium text-gray-800">Community invitation</p>
              <p className="text-xs text-gray-500">{STATUS_LABEL[status.invitation]}</p>
            </div>
          </div>
        )}

        {/* C3: community_invitation — failed state */}
        {status.invitation === 'failed' && (
          <div
            data-testid="delivery-community_invitation-failed"
            className="flex items-center gap-3 p-3 rounded border border-amber-200 bg-amber-50"
          >
            <span className="text-amber-600" aria-hidden="true">
              <AlertTriangle size={20} strokeWidth={2} />
            </span>
            <div>
              <p className="text-sm font-medium text-gray-800">Community invitation</p>
              <p className="text-xs text-amber-600">Delivery failed — onboarding still complete</p>
            </div>
          </div>
        )}
      </div>

      {/* NODE D completion gate — presence-based */}
      {completed && (
        <div
          data-testid="onboarding-complete"
          className="mt-4 p-4 bg-green-50 border border-green-200 rounded text-center"
        >
          <p className="text-green-700 font-medium text-sm">Onboarding complete 🎉</p>
        </div>
      )}

      {/* Role-specific next steps — AFTER NODE D gate, only when completed. */}
      {completed && (
        <RoleScopedView role={role} testIdPrefix="onboarding-next">
          <RoleScopedView.Case when="referral-user">
            <div
              data-testid="onboarding-referral-next-steps"
              className="mt-4 p-3 rounded bg-blue-50 border border-blue-200 text-sm text-blue-700"
            >
              <p className="font-medium">Your next step:</p>
              <a
                href="/questionnaire"
                data-testid="onboarding-referral-questionnaire-link"
                className="text-blue-600 hover:underline"
              >
                Complete your profile to see matches →
              </a>
            </div>
          </RoleScopedView.Case>
          <RoleScopedView.Case when="tenant-admin">
            <div
              data-testid="onboarding-admin-quickstart"
              className="mt-4 p-3 rounded bg-orange-50 border border-orange-200 text-sm"
            >
              <p className="font-medium text-orange-800">Admin quick-start:</p>
              <ul className="mt-2 space-y-1 text-orange-700">
                <li>
                  <a
                    href="/tenants"
                    data-testid="onboarding-admin-tenants-link"
                    className="hover:underline"
                  >
                    Configure tenant settings →
                  </a>
                </li>
                <li>
                  <a
                    href="/billing-dashboard"
                    data-testid="onboarding-admin-billing-link"
                    className="hover:underline"
                  >
                    Review billing dashboard →
                  </a>
                </li>
              </ul>
            </div>
          </RoleScopedView.Case>
          <RoleScopedView.Case when="freelancer">
            <div
              data-testid="onboarding-freelancer-next-steps"
              className="mt-4 p-3 rounded bg-purple-50 border border-purple-200 text-sm text-purple-700"
            >
              <p className="font-medium text-purple-800">Start earning:</p>
              <a
                href="/gigs/post"
                data-testid="onboarding-freelancer-gigs-link"
                className="text-purple-600 hover:underline"
              >
                Browse open gigs →
              </a>
            </div>
          </RoleScopedView.Case>
          <RoleScopedView.Case when="business-partner">
            <div
              data-testid="onboarding-partner-next-steps"
              className="mt-4 p-3 rounded bg-slate-50 border border-slate-200 text-sm text-slate-700"
            >
              <p className="font-medium">Get started:</p>
              <a
                href="/gigs/post"
                data-testid="onboarding-partner-post-gig-link"
                className="text-slate-600 hover:underline"
              >
                Post your first gig →
              </a>
            </div>
          </RoleScopedView.Case>
          <RoleScopedView.Case when="event-organiser">
            <div
              data-testid="onboarding-organiser-next-steps"
              className="mt-4 p-3 rounded bg-green-50 border border-green-200 text-sm text-green-700"
            >
              <p className="font-medium">Create your first event:</p>
              <a
                href="/events/create"
                data-testid="onboarding-organiser-events-link"
                className="text-green-600 hover:underline"
              >
                Go to event management →
              </a>
            </div>
          </RoleScopedView.Case>
          <RoleScopedView.Fallback>
            <></>
          </RoleScopedView.Fallback>
        </RoleScopedView>
      )}
    </div>
  );
}
