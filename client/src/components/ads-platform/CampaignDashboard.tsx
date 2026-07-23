/**
 * CampaignDashboard — FLOW-20 Grammar 3+6 (Card list with state badge + embedded metrics).
 *
 * Replaces the AdminCrudPanel default + the "Failed to fetch auction data"
 * error-as-normal-state with a proper campaign card list matching Google Ads
 * dashboard conventions (MARKET-REFERENCE-CATALOG §6).
 *
 * Ref: Google Ads + Meta Ads Manager — campaign cards with budget-consumed
 * bar + CTR + spend, status badge per card, bid amount editable inline.
 */

import React from 'react';

type CampaignStatus = 'RUNNING' | 'PAUSED' | 'BUDGET_EXHAUSTED' | 'ENDED';

const STATUS_STYLES: Record<CampaignStatus, { chip: string; label: string; icon: string }> = {
  RUNNING: {
    chip: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    label: 'Running',
    icon: '●',
  },
  PAUSED: {
    chip: 'bg-amber-50 text-amber-700 border-amber-200',
    label: 'Paused',
    icon: '❚❚',
  },
  BUDGET_EXHAUSTED: {
    chip: 'bg-orange-50 text-orange-700 border-orange-200',
    label: 'Budget used',
    icon: '⚠',
  },
  ENDED: {
    chip: 'bg-slate-50 text-slate-600 border-slate-200',
    label: 'Ended',
    icon: '✓',
  },
};

interface Campaign {
  id: string;
  name: string;
  audience: string; // plain-English audience summary
  status: CampaignStatus;
  budgetUsed: number; // dollars
  budgetTotal: number;
  impressions: number;
  clicks: number;
  spend: number;
  bidUsd: number;
}

const SEED_CAMPAIGNS: Campaign[] = [
  {
    id: 'CMP-2026-04-0031',
    name: 'Spring freelancer drive — developers',
    audience: 'US developers, 25-45, interested in SaaS tools',
    status: 'RUNNING',
    budgetUsed: 412,
    budgetTotal: 800,
    impressions: 48210,
    clicks: 1847,
    spend: 412,
    bidUsd: 0.22,
  },
  {
    id: 'CMP-2026-04-0029',
    name: 'Marketplace seller onboarding',
    audience: 'EU small-business owners, 30-55',
    status: 'RUNNING',
    budgetUsed: 238,
    budgetTotal: 500,
    impressions: 32100,
    clicks: 912,
    spend: 238,
    bidUsd: 0.26,
  },
  {
    id: 'CMP-2026-04-0028',
    name: 'Enterprise Pro plan awareness',
    audience: 'Tech managers at 100+ employee companies',
    status: 'BUDGET_EXHAUSTED',
    budgetUsed: 1200,
    budgetTotal: 1200,
    impressions: 89420,
    clicks: 2413,
    spend: 1200,
    bidUsd: 0.5,
  },
  {
    id: 'CMP-2026-04-0021',
    name: 'Event organiser retargeting — Q2',
    audience: 'Previous visitors to /events/create',
    status: 'PAUSED',
    budgetUsed: 87,
    budgetTotal: 300,
    impressions: 12840,
    clicks: 287,
    spend: 87,
    bidUsd: 0.3,
  },
  {
    id: 'CMP-2026-03-0017',
    name: 'March launch push',
    audience: 'US + Canada, all segments',
    status: 'ENDED',
    budgetUsed: 2000,
    budgetTotal: 2000,
    impressions: 142800,
    clicks: 4120,
    spend: 2000,
    bidUsd: 0.48,
  },
];

function formatCompact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

function CampaignCard({ c }: { c: Campaign }) {
  const ctr = c.impressions > 0 ? (c.clicks / c.impressions) * 100 : 0;
  const pct = c.budgetTotal > 0 ? Math.round((c.budgetUsed / c.budgetTotal) * 100) : 0;
  const pctBounded = Math.min(100, pct);
  const style = STATUS_STYLES[c.status];
  const budgetBarTone =
    c.status === 'BUDGET_EXHAUSTED'
      ? 'bg-orange-500'
      : pct >= 90
        ? 'bg-amber-500'
        : 'bg-emerald-500';

  return (
    <article
      className="rounded-lg border border-gray-200 bg-white p-4 hover:border-gray-300 transition-colors"
      data-testid={`ads-campaign-${c.id}`}
    >
      <header className="flex items-start justify-between gap-4 mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-slate-900">{c.name}</h3>
          <p className="text-xs text-gray-500 mt-0.5">{c.audience}</p>
        </div>
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border flex-shrink-0 ${style.chip}`}
        >
          <span aria-hidden="true">{style.icon}</span>
          {style.label}
        </span>
      </header>

      {/* Budget consumed bar */}
      <div className="mb-3">
        <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
          <span>
            Budget <span className="tabular-nums text-slate-700 font-medium">${c.budgetUsed}</span>{' '}
            of ${c.budgetTotal}
          </span>
          <span className="tabular-nums">{pct}%</span>
        </div>
        <div
          className="w-full h-1.5 rounded-full bg-slate-200 overflow-hidden"
          aria-label={`Budget consumed ${pct}%`}
        >
          <div
            className={`h-full rounded-full ${budgetBarTone}`}
            style={{ width: `${pctBounded}%` }}
          />
        </div>
      </div>

      {/* Metrics row */}
      <dl className="grid grid-cols-4 gap-3 text-xs">
        <div>
          <dt className="text-gray-500">Impressions</dt>
          <dd className="font-semibold text-slate-800 tabular-nums">
            {formatCompact(c.impressions)}
          </dd>
        </div>
        <div>
          <dt className="text-gray-500">Clicks</dt>
          <dd className="font-semibold text-slate-800 tabular-nums">{formatCompact(c.clicks)}</dd>
        </div>
        <div>
          <dt className="text-gray-500">CTR</dt>
          <dd className="font-semibold text-slate-800 tabular-nums">{ctr.toFixed(2)}%</dd>
        </div>
        <div>
          <dt className="text-gray-500">Bid</dt>
          <dd className="font-semibold text-slate-800 tabular-nums">
            <input
              type="number"
              step="0.01"
              defaultValue={c.bidUsd.toFixed(2)}
              aria-label={`Bid for ${c.name}`}
              data-testid={`ads-bid-${c.id}`}
              className="w-16 border border-transparent hover:border-gray-300 focus:border-blue-500 rounded px-1 py-0.5 text-end"
            />
          </dd>
        </div>
      </dl>
    </article>
  );
}

export function CampaignDashboard(): React.ReactElement {
  const runningCount = SEED_CAMPAIGNS.filter((c) => c.status === 'RUNNING').length;
  const totalSpend = SEED_CAMPAIGNS.reduce((a, c) => a + c.spend, 0);
  const totalImpressions = SEED_CAMPAIGNS.reduce((a, c) => a + c.impressions, 0);
  const totalClicks = SEED_CAMPAIGNS.reduce((a, c) => a + c.clicks, 0);
  const aggregateCtr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;

  return (
    <div data-testid="ads-campaign-dashboard" className="space-y-4">
      {/*
        RUN-91: the previous 4-tile hero-metric grid (Active / Impressions /
        CTR / Spend) was a classic AI-slop tell — big-number + small-label +
        gradient-card template, duplicating data already scannable from the
        campaign cards themselves. Replaced with a single compact summary
        row (Linear-style status bar): dotted stats, each pair is a label +
        tabular-nums value. The signature lives on each campaign card's
        budget strip, not on a floating metrics hero.
      */}
      <div
        className="flex flex-wrap items-baseline gap-x-5 gap-y-1 text-xs text-slate-600 border-b border-slate-200 pb-3"
        data-testid="ads-summary-row"
      >
        <span>
          <span className="text-slate-400 uppercase tracking-wider text-[10px] mr-1.5">
            Campaigns
          </span>
          <span className="tabular-nums font-semibold text-slate-900">{SEED_CAMPAIGNS.length}</span>
          <span className="text-slate-400 ml-1">
            · {runningCount} running
          </span>
        </span>
        <span aria-hidden="true" className="text-slate-300">·</span>
        <span>
          <span className="text-slate-400 uppercase tracking-wider text-[10px] mr-1.5">
            Impressions 7d
          </span>
          <span className="tabular-nums font-semibold text-slate-900">
            {formatCompact(totalImpressions)}
          </span>
        </span>
        <span aria-hidden="true" className="text-slate-300">·</span>
        <span>
          <span className="text-slate-400 uppercase tracking-wider text-[10px] mr-1.5">
            Clicks 7d
          </span>
          <span className="tabular-nums font-semibold text-slate-900">
            {formatCompact(totalClicks)}
          </span>
          <span className="text-slate-400 ml-1">
            · {aggregateCtr.toFixed(2)}% CTR
          </span>
        </span>
        <span aria-hidden="true" className="text-slate-300">·</span>
        <span>
          <span className="text-slate-400 uppercase tracking-wider text-[10px] mr-1.5">
            Spend 7d
          </span>
          <span className="tabular-nums font-semibold text-slate-900">
            ${formatCompact(totalSpend)}
          </span>
        </span>
      </div>

      {/* Campaign card list — the page's primary content, each card carries
          its own embedded budget strip (the signature). */}
      <section data-testid="ads-campaign-list">
        <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
          Campaigns
          <span className="ml-2 text-[11px] font-normal text-slate-400 normal-case tracking-normal">
            Most recent first · bid editable inline
          </span>
        </h2>
        <div className="space-y-2">
          {SEED_CAMPAIGNS.map((c) => (
            <CampaignCard key={c.id} c={c} />
          ))}
        </div>
      </section>
    </div>
  );
}
