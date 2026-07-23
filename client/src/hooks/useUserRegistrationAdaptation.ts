import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

export interface UserRegistrationAdaptation {
  profileName: string;
  invitationInviterName: string;
  invitationCommunityName: string;
  verificationTtlSeconds: number;
  resendRateLimitMinutes: number;
  onboardingReminderDays?: number;
}

const ACME_USER_REGISTRATION_ADAPTATION: UserRegistrationAdaptation = {
  profileName: 'Acme Pro Members registration',
  invitationInviterName: 'The Acme Pro Team',
  invitationCommunityName: 'Acme Pro Members',
  verificationTtlSeconds: 3600,
  resendRateLimitMinutes: 15,
};

const NORTHWIND_USER_REGISTRATION_ADAPTATION: UserRegistrationAdaptation = {
  profileName: 'Northwind Guild registration',
  invitationInviterName: 'The Acme Pro Team',
  invitationCommunityName: 'Acme Pro Members',
  verificationTtlSeconds: 3600,
  resendRateLimitMinutes: 5,
};

const TESSERA_USER_REGISTRATION_ADAPTATION: UserRegistrationAdaptation = {
  profileName: 'Tessera Welcome Circle registration',
  invitationInviterName: 'The Acme Pro Team',
  invitationCommunityName: 'Acme Pro Members',
  verificationTtlSeconds: 3600,
  resendRateLimitMinutes: 5,
  onboardingReminderDays: 1,
};

function readLocalStorage(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function isAcmeRegistrationProfile(value: string | null): boolean {
  if (!value) return false;
  return [
    'acme-corp',
    'acme-pro-members',
    'acme-user-registration',
    'user-registration-acme-pro-members',
  ].includes(value);
}

function isNorthwindRegistrationProfile(value: string | null): boolean {
  if (!value) return false;
  return [
    'northwind',
    'northwind-guild',
    'northwind-user-registration',
    'user-registration-northwind-guild',
  ].includes(value);
}

function isTesseraRegistrationProfile(value: string | null): boolean {
  if (!value) return false;
  return [
    'tessera-collective',
    'tessera-welcome-circle',
    'tessera-user-registration',
    'user-registration-tessera-welcome-circle',
  ].includes(value);
}

export function useUserRegistrationAdaptation(): UserRegistrationAdaptation | null {
  const [searchParams] = useSearchParams();

  return useMemo(() => {
    const requestedProfile =
      searchParams.get('adaptation') ??
      searchParams.get('profile') ??
      readLocalStorage('xiigen.userRegistrationAdaptation');
    const tenant =
      searchParams.get('tenant') ??
      searchParams.get('tenantId') ??
      readLocalStorage('xiigen.tenantId');
    const tenantBrand = readLocalStorage('xiigen.tenantBrand');

    if (
      isTesseraRegistrationProfile(requestedProfile) ||
      isTesseraRegistrationProfile(tenant) ||
      tenantBrand === 'Tessera Collective'
    ) {
      return TESSERA_USER_REGISTRATION_ADAPTATION;
    }

    if (
      isNorthwindRegistrationProfile(requestedProfile) ||
      isNorthwindRegistrationProfile(tenant) ||
      tenantBrand === 'Northwind Guild'
    ) {
      return NORTHWIND_USER_REGISTRATION_ADAPTATION;
    }

    if (
      isAcmeRegistrationProfile(requestedProfile) ||
      isAcmeRegistrationProfile(tenant) ||
      tenantBrand === 'Acme Pro Members'
    ) {
      return ACME_USER_REGISTRATION_ADAPTATION;
    }

    return null;
  }, [searchParams]);
}
