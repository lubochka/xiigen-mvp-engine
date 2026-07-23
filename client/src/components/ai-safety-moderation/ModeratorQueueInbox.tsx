/**
 * ModeratorQueueInbox — FLOW-24 Grammar 2 moderator queue.
 *
 * Two-pane inbox for content-moderation review:
 *   Left: list of FLAGGED items with severity + AI category + reason preview
 *   Right: selected item's full context — original content + AI analysis +
 *          8 safety-check verdicts + Keep / Remove / Escalate / Warn author
 *          action row
 *
 * Ref platform (MARKET-REFERENCE-CATALOG §2 moderation variant):
 *   Discord AutoMod console + Reddit modqueue + Twitter moderation console.
 *
 * Internal rule identifiers stay engineering-only: user-facing copy uses
 * plain English such as "Safety checks" and "Category: Harassment".
 */

import React, { useState } from 'react';

type CheckVerdict = 'PASS' | 'FLAG' | 'BLOCK' | 'SKIP';

const CHECK_STYLES: Record<CheckVerdict, { chip: string; icon: string; label: string }> = {
  PASS: {
    chip: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    icon: '✓',
    label: 'Pass',
  },
  FLAG: {
    chip: 'bg-amber-50 text-amber-700 border-amber-200',
    icon: '!',
    label: 'Flag',
  },
  BLOCK: {
    chip: 'bg-red-50 text-red-700 border-red-200',
    icon: '✕',
    label: 'Block',
  },
  SKIP: {
    chip: 'bg-slate-50 text-slate-500 border-slate-200',
    icon: '–',
    label: 'Skipped',
  },
};

type Category =
  | 'HARASSMENT'
  | 'CSAM'
  | 'SPAM'
  | 'SCAM'
  | 'VIOLENCE'
  | 'HATE_SPEECH'
  | 'PII_LEAK'
  | 'COPYRIGHT';

const CATEGORY_LABELS: Record<Category, string> = {
  HARASSMENT: 'Harassment',
  CSAM: 'CSAM',
  SPAM: 'Spam',
  SCAM: 'Scam',
  VIOLENCE: 'Violence',
  HATE_SPEECH: 'Hate speech',
  PII_LEAK: 'PII leak',
  COPYRIGHT: 'Copyright',
};

const CATEGORY_TONES: Record<Category, string> = {
  CSAM: 'bg-red-50 text-red-700 border-red-200',
  VIOLENCE: 'bg-red-50 text-red-700 border-red-200',
  HATE_SPEECH: 'bg-red-50 text-red-700 border-red-200',
  HARASSMENT: 'bg-orange-50 text-orange-700 border-orange-200',
  SCAM: 'bg-orange-50 text-orange-700 border-orange-200',
  SPAM: 'bg-amber-50 text-amber-700 border-amber-200',
  PII_LEAK: 'bg-amber-50 text-amber-700 border-amber-200',
  COPYRIGHT: 'bg-slate-50 text-slate-600 border-slate-200',
};

type CheckKey =
  | 'toxicity'
  | 'hate'
  | 'violence'
  | 'sexual'
  | 'self-harm'
  | 'pii'
  | 'spam'
  | 'copyright';

const CHECKS: { key: CheckKey; label: string }[] = [
  { key: 'toxicity', label: 'Toxicity' },
  { key: 'hate', label: 'Hate' },
  { key: 'violence', label: 'Violence' },
  { key: 'sexual', label: 'Sexual' },
  { key: 'self-harm', label: 'Self-harm' },
  { key: 'pii', label: 'PII' },
  { key: 'spam', label: 'Spam' },
  { key: 'copyright', label: 'Copyright' },
];

interface ModerationItem {
  caseId: string;
  reportedAt: string; // tabular-nums
  reporterName: string; // "Anonymous reporter" or tenant-user name
  reporterReason: string; // one-liner plain-English
  category: Category;
  aiConfidence: number; // 0..1
  content: string; // truncated preview
  contentType: 'post' | 'comment' | 'profile' | 'listing';
  author: string;
  safetyChecks: Record<CheckKey, CheckVerdict>;
  aiRationale: string;
}

const SEED_ITEMS: ModerationItem[] = [
  {
    caseId: 'MOD-2026-0420-4820',
    reportedAt: '2026-04-20 14:41',
    reporterName: 'Anonymous reporter',
    reporterReason: 'Contains what looks like a phishing link.',
    category: 'SCAM',
    aiConfidence: 0.91,
    content:
      '"Claim your free XIIGen credits! Click xiigen-free-credits.io/claim?tkn=A8X4… to verify your account in 24 hours or lose access."',
    contentType: 'post',
    author: 'tenant-user-8831',
    safetyChecks: {
      toxicity: 'PASS',
      hate: 'PASS',
      violence: 'PASS',
      sexual: 'PASS',
      'self-harm': 'PASS',
      pii: 'FLAG',
      spam: 'BLOCK',
      copyright: 'SKIP',
    },
    aiRationale:
      'Spam check flagged a look-alike domain ("xiigen-free-credits.io") not on the allow-list. PII check flagged the presence of a tokenised URL parameter. Recommend removal + warn author.',
  },
  {
    caseId: 'MOD-2026-0420-4819',
    reportedAt: '2026-04-20 14:14',
    reporterName: 'tenant-user-2194',
    reporterReason: 'Targeted insults about my event listing.',
    category: 'HARASSMENT',
    aiConfidence: 0.73,
    content:
      '"Anyone still using this garbage service must be either desperate or a fool. Don\'t waste your time on trash like what this user is selling."',
    contentType: 'comment',
    author: 'tenant-user-5507',
    safetyChecks: {
      toxicity: 'FLAG',
      hate: 'PASS',
      violence: 'PASS',
      sexual: 'PASS',
      'self-harm': 'PASS',
      pii: 'PASS',
      spam: 'PASS',
      copyright: 'SKIP',
    },
    aiRationale:
      'Toxicity score 0.73 (threshold 0.60). No targeted slurs or protected-class references, so hate check passes. Recommend warning the author; keep the comment but require edit.',
  },
  {
    caseId: 'MOD-2026-0420-4818',
    reportedAt: '2026-04-20 13:52',
    reporterName: 'Anonymous reporter',
    reporterReason: 'Description shows another person without consent.',
    category: 'PII_LEAK',
    aiConfidence: 0.82,
    content:
      '"Hire freelancer John Doe, SSN 123-45-6789, phone +1-555-0123, based at 742 Evergreen Terrace. Available weekdays."',
    contentType: 'listing',
    author: 'tenant-user-0091',
    safetyChecks: {
      toxicity: 'PASS',
      hate: 'PASS',
      violence: 'PASS',
      sexual: 'PASS',
      'self-harm': 'PASS',
      pii: 'BLOCK',
      spam: 'PASS',
      copyright: 'SKIP',
    },
    aiRationale:
      'PII check blocked: detected SSN, phone number, and street address in the listing body. Remove listing immediately, warn author, notify subject if different from author.',
  },
  {
    caseId: 'MOD-2026-0420-4817',
    reportedAt: '2026-04-20 13:18',
    reporterName: 'tenant-user-4412',
    reporterReason: 'Seems to threaten another user.',
    category: 'VIOLENCE',
    aiConfidence: 0.56,
    content:
      '"If I ever see you at the meetup I\'m going to have to teach you a lesson face-to-face."',
    contentType: 'comment',
    author: 'tenant-user-9902',
    safetyChecks: {
      toxicity: 'FLAG',
      hate: 'PASS',
      violence: 'FLAG',
      sexual: 'PASS',
      'self-harm': 'PASS',
      pii: 'PASS',
      spam: 'PASS',
      copyright: 'SKIP',
    },
    aiRationale:
      'Violence + toxicity both flagged at borderline confidence. Could be hyperbole or a genuine threat — recommend escalating to senior moderator for human judgement.',
  },
  {
    caseId: 'MOD-2026-0420-4816',
    reportedAt: '2026-04-20 12:37',
    reporterName: 'Anonymous reporter',
    reporterReason: 'Uses copyrighted image without credit.',
    category: 'COPYRIGHT',
    aiConfidence: 0.88,
    content:
      '(image attachment — cover illustration from "The Little Prince", Antoine de Saint-Exupéry, 1943, reproduced without credit)',
    contentType: 'post',
    author: 'tenant-user-6723',
    safetyChecks: {
      toxicity: 'PASS',
      hate: 'PASS',
      violence: 'PASS',
      sexual: 'PASS',
      'self-harm': 'PASS',
      pii: 'PASS',
      spam: 'PASS',
      copyright: 'BLOCK',
    },
    aiRationale:
      'Copyright check matched a known protected illustration. Recommend removal + warn author; author can re-post with licensing credit or original artwork.',
  },
];

function ConfidenceBar({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const tone = value >= 0.8 ? 'bg-red-500' : value >= 0.6 ? 'bg-amber-500' : 'bg-slate-400';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1 rounded-full bg-slate-200 overflow-hidden">
        <div className={`h-full rounded-full ${tone}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs tabular-nums text-slate-600">{pct}%</span>
    </div>
  );
}

export function ModeratorQueueInbox(): React.ReactElement {
  const [selectedId, setSelectedId] = useState<string>(SEED_ITEMS[0].caseId);
  const selected = SEED_ITEMS.find((i) => i.caseId === selectedId) ?? SEED_ITEMS[0];

  // Count how many safety checks block vs flag vs pass for the selected item.
  const checkCounts = Object.values(selected.safetyChecks).reduce<Record<CheckVerdict, number>>(
    (acc, v) => {
      acc[v] = (acc[v] ?? 0) + 1;
      return acc;
    },
    { PASS: 0, FLAG: 0, BLOCK: 0, SKIP: 0 },
  );

  return (
    <div
      className="flex border border-gray-200 rounded-lg overflow-hidden bg-white h-[680px]"
      data-testid="asm-moderator-queue"
    >
      {/* Left queue list */}
      <div className="w-96 border-r border-gray-200 overflow-y-auto" data-testid="asm-queue-list">
        <div className="px-3 py-2 bg-slate-50 border-b border-gray-200 flex items-center justify-between">
          <div className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
            Pending moderation
          </div>
          <span className="text-xs text-gray-500 tabular-nums">{SEED_ITEMS.length} flagged</span>
        </div>
        <ul className="list-none divide-y divide-gray-100">
          {SEED_ITEMS.map((item) => {
            const isSelected = item.caseId === selectedId;
            return (
              <li
                key={item.caseId}
                data-testid={`asm-queue-item-${item.caseId}`}
                data-item-selected={isSelected ? 'true' : 'false'}
                className={`cursor-pointer px-3 py-3 ${
                  isSelected ? 'bg-blue-50 border-l-2 border-l-blue-500' : 'hover:bg-slate-50'
                }`}
                onClick={() => setSelectedId(item.caseId)}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold border ${CATEGORY_TONES[item.category]}`}
                  >
                    {CATEGORY_LABELS[item.category]}
                  </span>
                  <span className="text-[10px] uppercase tracking-wide text-gray-400">
                    {item.contentType}
                  </span>
                  <span className="ms-auto text-[11px] text-gray-500 tabular-nums">
                    {item.reportedAt.slice(-5)}
                  </span>
                </div>
                <p className="text-sm text-slate-800 leading-snug mb-1 line-clamp-2">
                  &ldquo;{item.content}&rdquo;
                </p>
                <div className="text-[11px] text-gray-500 mb-1.5">
                  by {item.author} · reported by {item.reporterName}
                </div>
                <ConfidenceBar value={item.aiConfidence} />
              </li>
            );
          })}
        </ul>
      </div>

      {/* Right detail */}
      <aside
        className="flex-1 overflow-y-auto p-5 bg-slate-50"
        data-testid="asm-queue-detail-panel"
        data-case-selected={selected.caseId}
      >
        <div className="flex items-center gap-2 mb-3">
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${CATEGORY_TONES[selected.category]}`}
          >
            {CATEGORY_LABELS[selected.category]}
          </span>
          <span className="text-xs uppercase tracking-wide text-gray-500">
            {selected.contentType}
          </span>
          <span className="text-xs font-mono text-gray-500 ms-auto">{selected.caseId}</span>
        </div>

        <h2 className="text-base font-semibold text-slate-900 mb-1">
          Report from {selected.reporterName}
        </h2>
        <p className="text-sm text-slate-700 mb-4 italic">
          &ldquo;{selected.reporterReason}&rdquo;
        </p>

        <div className="mb-4">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
            Original content
          </div>
          <p className="text-sm text-slate-800 bg-white rounded border border-gray-200 px-3 py-2 leading-relaxed">
            {selected.content}
          </p>
          <div className="mt-1.5 text-xs text-gray-500">
            by {selected.author} · reported {selected.reportedAt}
          </div>
        </div>

        <div className="mb-4">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
            Safety checks ({checkCounts.BLOCK} block · {checkCounts.FLAG} flag · {checkCounts.PASS}{' '}
            pass)
          </div>
          <ul className="grid grid-cols-2 gap-1.5 list-none" data-testid="asm-detail-safety-checks">
            {CHECKS.map((c) => {
              const v = selected.safetyChecks[c.key];
              const style = CHECK_STYLES[v];
              return (
                <li
                  key={c.key}
                  className="flex items-center justify-between px-2 py-1 rounded border border-gray-200 bg-white text-xs"
                >
                  <span className="text-slate-700">{c.label}</span>
                  <span
                    className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold border ${style.chip}`}
                  >
                    <span aria-hidden="true">{style.icon}</span>
                    {style.label}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="mb-4 rounded border border-gray-200 bg-white px-3 py-2">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
            AI analysis · confidence {Math.round(selected.aiConfidence * 100)}%
          </div>
          <p className="text-sm text-slate-700 leading-relaxed">{selected.aiRationale}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-gray-200">
          <button
            type="button"
            className="text-sm font-semibold text-white bg-red-600 hover:bg-red-700 px-4 py-1.5 rounded"
            data-testid="asm-action-remove"
          >
            Remove content
          </button>
          <button
            type="button"
            className="text-sm font-semibold text-emerald-700 border border-emerald-300 hover:bg-emerald-50 px-4 py-1.5 rounded"
            data-testid="asm-action-keep"
          >
            Keep (dismiss report)
          </button>
          <button
            type="button"
            className="text-sm font-semibold text-amber-700 border border-amber-300 hover:bg-amber-50 px-4 py-1.5 rounded"
            data-testid="asm-action-warn"
          >
            Warn author
          </button>
          <button
            type="button"
            className="text-sm font-semibold text-slate-700 border border-slate-300 hover:bg-slate-50 px-4 py-1.5 rounded"
            data-testid="asm-action-escalate"
          >
            Escalate
          </button>
          <button
            type="button"
            className="ms-auto text-sm text-slate-500 hover:bg-slate-100 px-3 py-1.5 rounded"
            data-testid="asm-action-notify-subject"
          >
            Notify subject
          </button>
        </div>
      </aside>
    </div>
  );
}
