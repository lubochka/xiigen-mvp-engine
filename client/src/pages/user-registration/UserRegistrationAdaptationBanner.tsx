import React from 'react';
import { useUserRegistrationAdaptation } from '../../hooks/useUserRegistrationAdaptation';

export function UserRegistrationAdaptationBanner() {
  const adaptation = useUserRegistrationAdaptation();

  if (!adaptation) return null;

  const ttlHours = adaptation.verificationTtlSeconds / 3600;

  return (
    <section
      data-testid="user-registration-adaptation-banner"
      className="mb-5 rounded border border-blue-200 bg-blue-50 p-3 text-start"
      aria-label={`${adaptation.profileName} settings`}
    >
      <p className="text-sm font-semibold text-blue-950">{adaptation.profileName}</p>
      <p className="mt-1 text-xs leading-5 text-blue-800">
        Verification links expire after {ttlHours === 1 ? '1 hour' : `${ttlHours} hours`}.
        Resend is available after {adaptation.resendRateLimitMinutes} minutes.
      </p>
      <p className="mt-1 text-xs leading-5 text-blue-800">
        Community invitations come from {adaptation.invitationInviterName} for{' '}
        {adaptation.invitationCommunityName}.
      </p>
      {typeof adaptation.onboardingReminderDays === 'number' && (
        <p className="mt-1 text-xs leading-5 text-blue-800">
          Onboarding reminders start after {adaptation.onboardingReminderDays}{' '}
          {adaptation.onboardingReminderDays === 1 ? 'day' : 'days'}.
        </p>
      )}
    </section>
  );
}
