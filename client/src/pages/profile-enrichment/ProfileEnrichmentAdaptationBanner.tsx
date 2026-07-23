import React from 'react';
import { ProfileEnrichmentAdaptation } from '../../hooks/useProfileEnrichmentAdaptation';

interface ProfileEnrichmentAdaptationBannerProps {
  adaptation: ProfileEnrichmentAdaptation | null;
  compact?: boolean;
}

export function ProfileEnrichmentAdaptationBanner({
  adaptation,
  compact = false,
}: ProfileEnrichmentAdaptationBannerProps) {
  if (!adaptation) return null;

  const facts = [
    { label: 'Industry alignment', value: `${adaptation.weights.industry}%` },
    { label: 'Stage fit', value: `${adaptation.weights.stage}%` },
    { label: 'Remote-friendly location', value: `${adaptation.weights.location}%` },
    { label: 'Team size', value: `${adaptation.weights.team}%` },
  ];

  return (
    <section
      data-testid="profile-enrichment-adaptation-banner"
      className={`mb-5 rounded-md border border-blue-200 bg-blue-50 ${
        compact ? 'p-3' : 'p-4'
      }`}
      aria-label={`${adaptation.profileName} settings`}
    >
      <div className="flex flex-col gap-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
          {adaptation.workspaceName}
        </p>
        <h2 className="text-base font-semibold text-gray-950">{adaptation.profileName}</h2>
        <p className="text-sm text-blue-900">{adaptation.description}</p>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2" data-testid="profile-enrichment-adaptation-facts">
        {facts.map((fact) => (
          <div key={fact.label} className="rounded border border-blue-100 bg-white px-3 py-2">
            <p className="text-[11px] font-medium text-gray-500">{fact.label}</p>
            <p className="text-sm font-semibold text-gray-900">{fact.value}</p>
          </div>
        ))}
      </div>
      <p className="mt-3 text-xs font-medium text-blue-800">
        Faster matching target: {adaptation.matchTargetSeconds} seconds
      </p>
    </section>
  );
}
