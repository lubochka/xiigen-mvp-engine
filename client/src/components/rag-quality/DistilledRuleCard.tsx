/**
 * DistilledRuleCard — displays a single distilled rule with its source cycle.
 */

import React from 'react';

export interface DistilledRule {
  ruleId: string;
  ruleText: string;
  cycleId: string;
  flowId: string;
}

export interface DistilledRuleCardProps {
  rule: DistilledRule;
}

export function DistilledRuleCard({ rule }: DistilledRuleCardProps): React.ReactElement {
  return (
    <div
      className="distilled-rule-card"
      data-testid={`rule-card-${rule.ruleId}`}
      data-rule-id={rule.ruleId}
      data-cycle-id={rule.cycleId}
    >
      <div className="rule-text" data-testid={`rule-text-${rule.ruleId}`}>
        {rule.ruleText}
      </div>
      <div className="rule-meta">
        <span data-testid={`rule-cycle-${rule.ruleId}`}>Cycle: {rule.cycleId}</span>
        <span data-testid={`rule-flow-${rule.ruleId}`}>Flow: {rule.flowId}</span>
      </div>
    </div>
  );
}
