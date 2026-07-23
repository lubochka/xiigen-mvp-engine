// FT-G2 — Google Workspace Meeting Summary Generator — Layer 3: STACK_COUPLED
// No @googleapis/* import at module level — injected writer pattern throughout.

import type {
  GoogleMeetingItem, SharedMeetingElement, SharedMeetingStyle,
  MeetingReadResult, MeetingSummaryOutput, MeetingWriteResult,
} from './types';

const GOOGLE_TYPE_MAP: Record<GoogleMeetingItem['type'], SharedMeetingElement['type']> = {
  agenda_item: 'AGENDA',
  action_item: 'ACTION',
  decision: 'DECISION',
  note: 'NOTE',
  attendee: 'ATTENDEE',
};

function inferPriority(item: GoogleMeetingItem): SharedMeetingStyle['priority'] {
  if (item.type === 'action_item' || item.type === 'decision') return 'HIGH';
  if (item.type === 'agenda_item') return 'MEDIUM';
  return 'LOW';
}

function requiresFollowUp(item: GoogleMeetingItem): boolean {
  return item.type === 'action_item' && item.status !== 'completed';
}

export function mapGoogleToMeetingElement(item: GoogleMeetingItem): SharedMeetingElement {
  return {
    type: GOOGLE_TYPE_MAP[item.type],
    title: item.title,
    content: item.content,
    owner: item.owner,
  };
}

export function mapGoogleToMeetingStyle(item: GoogleMeetingItem): SharedMeetingStyle {
  return {
    priority: inferPriority(item),
    itemType: GOOGLE_TYPE_MAP[item.type],
    requiresFollowUp: requiresFollowUp(item),
  };
}

export function mapMeetingStyleToGoogle(style: SharedMeetingStyle): Partial<GoogleMeetingItem> {
  const TYPE_BACK: Record<SharedMeetingStyle['itemType'], GoogleMeetingItem['type']> = {
    AGENDA: 'agenda_item',
    ACTION: 'action_item',
    DECISION: 'decision',
    NOTE: 'note',
    ATTENDEE: 'attendee',
  };
  return {
    type: TYPE_BACK[style.itemType],
    status: style.requiresFollowUp ? 'open' : 'completed',
  };
}

export function readMeetingItems(items: GoogleMeetingItem[]): MeetingReadResult {
  return {
    elements: items.map(mapGoogleToMeetingElement),
    styles: items.map(mapGoogleToMeetingStyle),
    sourceItems: items,
  };
}

export async function writeMeetingSummary(
  outputs: MeetingSummaryOutput[],
  writer: (payload: Record<string, unknown>) => Promise<void>,
): Promise<MeetingWriteResult> {
  let written = 0;
  let failed = 0;
  for (const output of outputs) {
    try {
      const base = mapMeetingStyleToGoogle(output.style) as Record<string, unknown>;
      await writer({
        ...base,
        type: 'MEETING_SUMMARY',
        title: output.element.title,
        owner: output.element.owner,
        priority: output.style.priority,
        summary: output.generatedSummary,
        requiresFollowUp: output.style.requiresFollowUp,
      });
      written++;
    } catch {
      failed++;
    }
  }
  return { written, failed };
}
