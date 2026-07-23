// FT-G2 — Google Workspace Meeting Summary Generator
// Layer 1: CONCEPT_NEUTRAL — SharedMeetingElement / SharedMeetingStyle
// Layer 2: IMPL_VARIES    — shared meeting summary engine
// Layer 3: STACK_COUPLED  — google-ws-adapter.ts (this adapter)

export interface GoogleMeetingItem {
  id: string;
  type: 'agenda_item' | 'action_item' | 'decision' | 'note' | 'attendee';
  title?: string;
  content?: string;
  owner?: string;
  dueDate?: string;
  status?: 'open' | 'completed' | 'deferred';
}

export interface SharedMeetingElement {
  type: 'AGENDA' | 'ACTION' | 'DECISION' | 'NOTE' | 'ATTENDEE';
  title?: string;
  content?: string;
  owner?: string;
}

export interface SharedMeetingStyle {
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  itemType: 'AGENDA' | 'ACTION' | 'DECISION' | 'NOTE' | 'ATTENDEE';
  requiresFollowUp: boolean;
}

export interface MeetingSummaryOutput {
  element: SharedMeetingElement;
  style: SharedMeetingStyle;
  generatedSummary: string;
}

export interface MeetingReadResult {
  elements: SharedMeetingElement[];
  styles: SharedMeetingStyle[];
  sourceItems: GoogleMeetingItem[];
}

export interface MeetingWriteResult {
  written: number;
  failed: number;
}
