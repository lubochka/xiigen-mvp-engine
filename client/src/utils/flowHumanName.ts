/**
 * flowHumanName — map FLOW-NN identifiers to plain-English module names
 * for user-facing copy. Engineering identifiers belong in data, never in
 * rendered text. Use this whenever a flow ID needs to appear in UI.
 */

const FLOW_HUMAN_NAMES: Record<string, string> = {
  'FLOW-00': 'Bundle activation',
  'FLOW-01': 'User registration',
  'FLOW-02': 'Profile enrichment',
  'FLOW-03': 'Event management',
  'FLOW-04': 'Event attendance',
  'FLOW-05': 'Completion and gamification',
  'FLOW-06': 'Groups and communities',
  'FLOW-07': 'Social feed',
  'FLOW-08': 'Marketplace',
  'FLOW-09': 'Event participation',
  'FLOW-10': 'Reviews and reputation',
  'FLOW-11': 'Schema registry',
  'FLOW-12': 'Subscription billing',
  'FLOW-13': 'Data warehouse',
  'FLOW-14': 'ETL integration',
  'FLOW-15': 'Tenant lifecycle',
  'FLOW-16': 'Marketplace payments',
  'FLOW-17': 'Freelancer marketplace',
  'FLOW-18': 'Visual flow engine',
  'FLOW-19': 'Durable sagas',
  'FLOW-20': 'Ads platform',
  'FLOW-21': 'Dynamic forms',
  'FLOW-22': 'CMS publishing',
  'FLOW-23': 'Form builder templates',
  'FLOW-24': 'AI safety moderation',
  'FLOW-25': 'Cross-flow policy',
  'FLOW-26': 'Meta flow engine',
  'FLOW-27': 'Human interaction gate',
  'FLOW-28': 'Blog and CMS modules',
  'FLOW-29': 'Deep research',
  'FLOW-30': 'Tenant lifecycle manager',
  'FLOW-31': 'Design intelligence',
  'FLOW-32': 'Sharable flows marketplace',
  'FLOW-33': 'System bootstrap',
  'FLOW-34': 'Marketplace plugin adapter',
  'FLOW-35': 'Meta arbitration',
  'FLOW-36': 'Feature registry',
  'FLOW-37': 'Design system governance',
  'FLOW-38': 'RAG quality feedback',
  'FLOW-39': 'OSS curriculum',
  'FLOW-40': 'Client push',
  'FLOW-41': 'Canva adapter',
  'FLOW-42': 'Miro adapter',
  'FLOW-43': 'Webflow adapter',
  'FLOW-44': 'AI self-modification',
  'FLOW-45': 'History bootstrap',
  'FLOW-46': 'Platform agent',
  'FLOW-47': 'Cycle chain extension',
  'FLOW-48': 'Admin i18n',
  'FLOW-49': 'Module lifecycle',
};

/**
 * Return the plain-English name for a FLOW-NN identifier. If the ID is
 * unknown, falls back to the raw ID so operators can still cross-reference.
 */
export function flowHumanName(flowId: string): string {
  return FLOW_HUMAN_NAMES[flowId] ?? flowId;
}

/**
 * Return a "Human name · FLOW-NN" suffix variant, useful when you want to
 * keep the ID available for platform-admin cross-reference while leading
 * with the human label.
 */
export function flowHumanNameWithId(flowId: string): string {
  const name = FLOW_HUMAN_NAMES[flowId];
  return name ? `${name}` : flowId;
}
