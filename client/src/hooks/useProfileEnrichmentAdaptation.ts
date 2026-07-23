import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

export interface ProfileEnrichmentAdaptation {
  profileName: string;
  workspaceName: string;
  description: string;
  matchTargetSeconds: number;
  weights: {
    industry: number;
    stage: number;
    location: number;
    team: number;
  };
}

const ACME_ADAPTATION: ProfileEnrichmentAdaptation = {
  profileName: 'Acme Pro Matching',
  workspaceName: 'Acme Corp',
  description:
    'Industry-first peer matching with a faster response target for remote-friendly professional communities.',
  matchTargetSeconds: 15,
  weights: {
    industry: 55,
    stage: 25,
    location: 10,
    team: 10,
  },
};

const NORTHWIND_ADAPTATION: ProfileEnrichmentAdaptation = {
  profileName: 'Northwind Partner Matching',
  workspaceName: 'Northwind',
  description:
    'Keeps industry-first peer matching and adds stronger team-size fit for partner discovery.',
  matchTargetSeconds: 15,
  weights: {
    industry: 55,
    stage: 15,
    location: 10,
    team: 20,
  },
};

const TESSERA_ADAPTATION: ProfileEnrichmentAdaptation = {
  profileName: 'Tessera Community Matching',
  workspaceName: 'Tessera Collective',
  description:
    'Keeps inherited industry and team-size signals while raising location fit for community-based matching.',
  matchTargetSeconds: 15,
  weights: {
    industry: 40,
    stage: 15,
    location: 25,
    team: 20,
  },
};

function readLocalStorage(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function isAcmeProfile(value: string | null): boolean {
  return value === 'acme-corp' || value === 'acme-pro-members' || value === 'acme-pro-matching';
}

function isNorthwindProfile(value: string | null): boolean {
  return value === 'northwind' || value === 'northwind-partner-matching';
}

function isTesseraProfile(value: string | null): boolean {
  return value === 'tessera-collective' || value === 'tessera-community-matching';
}

export function useProfileEnrichmentAdaptation(): ProfileEnrichmentAdaptation | null {
  const [searchParams] = useSearchParams();

  return useMemo(() => {
    const requestedProfile =
      searchParams.get('adaptation') ??
      searchParams.get('profile') ??
      readLocalStorage('xiigen.profileEnrichmentAdaptation');
    const workspace =
      searchParams.get('workspace') ??
      searchParams.get('tenant') ??
      searchParams.get('tenantId') ??
      readLocalStorage('xiigen.tenantId');

    if (isTesseraProfile(requestedProfile)) {
      return TESSERA_ADAPTATION;
    }

    if (isNorthwindProfile(requestedProfile)) {
      return NORTHWIND_ADAPTATION;
    }

    if (isAcmeProfile(requestedProfile)) {
      return ACME_ADAPTATION;
    }

    if (isTesseraProfile(workspace)) {
      return TESSERA_ADAPTATION;
    }

    if (isAcmeProfile(workspace)) {
      return ACME_ADAPTATION;
    }

    return null;
  }, [searchParams]);
}
