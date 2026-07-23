/**
 * RequirementExtractorService unit tests.
 * Tests that natural language descriptions are converted into structured capability maps.
 *
 * SESSION-P-1: CF-805 (valid JSON output) + CF-806 (valid archetype values).
 */

import { RequirementExtractorService, CapabilityMap } from './requirement-extractor.service';
import { DataProcessResult } from '../../kernel/data-process-result';

// ─── Mock helpers ────────────────────────────────────────────────────────────

const makeAiResult = (text: string) => DataProcessResult.success({ text });

const makeDbResult = <T>(data: T[]) =>
  DataProcessResult.success(data as Array<Record<string, unknown>>);

const makePromptDoc = () => ({
  promptId: 'requirement-extract--genesis--v1.0.0',
  systemPrompt: 'You are an expert software architect...',
  userPromptTemplate:
    'Analyze the following system description and produce a structured capability map.\n\n' +
    '## System description:\n{{DESCRIPTION}}\n\n' +
    '## Known XIIGen flow patterns (for matching):\n{{KNOWN_PATTERNS}}\n\n' +
    'Output ONLY the JSON object.',
});

const EVENTS_CAPABILITY_MAP: CapabilityMap = {
  capabilities: [
    {
      name: 'EventCreation',
      description: 'Creates an event with venue and capacity details.',
      archetype: 'ORCHESTRATION',
      matchesPattern: 'FLOW-03',
      needsNewFlow: false,
      technologyHints: [],
      dependencies: [],
    },
    {
      name: 'AttendeeRegistration',
      description: 'Allocates a seat for an attendee respecting capacity.',
      archetype: 'REGISTRATION',
      matchesPattern: 'FLOW-03',
      needsNewFlow: false,
      technologyHints: [],
      dependencies: ['EventCreation'],
    },
    {
      name: 'EventPromotion',
      description: 'Sends promotional notifications to attendees.',
      archetype: 'PROCESSING',
      matchesPattern: null,
      needsNewFlow: true,
      technologyHints: [],
      dependencies: ['EventCreation'],
    },
    {
      name: 'EventAnalytics',
      description: 'Records registration and attendance metrics.',
      archetype: 'ANALYTICS',
      matchesPattern: null,
      needsNewFlow: true,
      technologyHints: [],
      dependencies: [],
    },
  ],
  entities: [
    {
      name: 'Event',
      attributes: ['title', 'date', 'capacity', 'venue'],
      relationships: ['Attendee'],
    },
    { name: 'Attendee', attributes: ['name', 'email'], relationships: ['Event'] },
    {
      name: 'RegistrationRecord',
      attributes: ['eventId', 'attendeeId', 'registeredAt'],
      relationships: ['Event', 'Attendee'],
    },
  ],
  userFlows: [
    {
      name: 'AttendeeRegistration',
      steps: ['browse events', 'select event', 'submit registration', 'receive confirmation'],
      involvedCapabilities: ['AttendeeRegistration', 'EventCreation'],
    },
  ],
  systemContext: {
    existingSystem: false,
    stackHints: [],
    notes: '',
  },
};

// ─── Build mock dependencies ──────────────────────────────────────────────────

function buildMocks() {
  const mockAiProvider = {
    generate: jest.fn(),
  };

  const mockDbService = {
    searchDocuments: jest.fn(),
    storeDocument: jest.fn(),
  };

  const service = new RequirementExtractorService(mockAiProvider as any, mockDbService as any);

  return { service, mockAiProvider, mockDbService };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('RequirementExtractorService', () => {
  let service: RequirementExtractorService;
  let mockAiProvider: { generate: jest.Mock };
  let mockDbService: { searchDocuments: jest.Mock; storeDocument: jest.Mock };

  beforeEach(() => {
    const mocks = buildMocks();
    service = mocks.service;
    mockAiProvider = mocks.mockAiProvider;
    mockDbService = mocks.mockDbService;
  });

  // ── CF-805: valid JSON output ────────────────────────────────────────────

  it('returns a valid CapabilityMap from a natural language description', async () => {
    mockDbService.searchDocuments
      .mockResolvedValueOnce(makeDbResult([makePromptDoc()])) // loadPrompt
      .mockResolvedValueOnce(makeDbResult([])); // loadKnownPatterns (no patterns)

    mockAiProvider.generate.mockResolvedValueOnce(
      makeAiResult(JSON.stringify(EVENTS_CAPABILITY_MAP)),
    );

    const result = await service.extract(
      'events with capacity, registration, promotion, analytics',
    );

    expect(result).toBeDefined();
    expect(result.capabilities).toBeDefined();
    expect(result.entities).toBeDefined();
    expect(result.userFlows).toBeDefined();
    expect(result.systemContext).toBeDefined();
  });

  // ── CF-806: correct archetype extraction ─────────────────────────────────

  it('extracts 4 capabilities with correct archetypes from events description', async () => {
    mockDbService.searchDocuments
      .mockResolvedValueOnce(makeDbResult([makePromptDoc()]))
      .mockResolvedValueOnce(makeDbResult([]));

    mockAiProvider.generate.mockResolvedValueOnce(
      makeAiResult(JSON.stringify(EVENTS_CAPABILITY_MAP)),
    );

    const result = await service.extract(
      'events with capacity, registration, promotion, analytics',
    );

    expect(result.capabilities).toHaveLength(4);
    expect(result.capabilities.map((c) => c.archetype)).toEqual(
      expect.arrayContaining(['ORCHESTRATION', 'REGISTRATION', 'PROCESSING', 'ANALYTICS']),
    );
  });

  it('identifies Event, Attendee, RegistrationRecord entities', async () => {
    mockDbService.searchDocuments
      .mockResolvedValueOnce(makeDbResult([makePromptDoc()]))
      .mockResolvedValueOnce(makeDbResult([]));

    mockAiProvider.generate.mockResolvedValueOnce(
      makeAiResult(JSON.stringify(EVENTS_CAPABILITY_MAP)),
    );

    const result = await service.extract(
      'events with capacity, registration, promotion, analytics',
    );

    const entityNames = result.entities.map((e) => e.name);
    expect(entityNames).toContain('Event');
    expect(entityNames).toContain('Attendee');
    expect(entityNames).toContain('RegistrationRecord');
  });

  // ── CRUD capabilities must have needsNewFlow=false ───────────────────────

  it('marks CRUD capabilities with needsNewFlow=false', async () => {
    const crudMap: CapabilityMap = {
      capabilities: [
        {
          name: 'BrowseEvents',
          description: 'List and search events.',
          archetype: 'CRUD',
          matchesPattern: null,
          needsNewFlow: false,
          technologyHints: [],
          dependencies: [],
        },
      ],
      entities: [{ name: 'Event', attributes: ['title', 'date'], relationships: [] }],
      userFlows: [],
      systemContext: { existingSystem: false, stackHints: [], notes: '' },
    };

    mockDbService.searchDocuments
      .mockResolvedValueOnce(makeDbResult([makePromptDoc()]))
      .mockResolvedValueOnce(makeDbResult([]));

    mockAiProvider.generate.mockResolvedValueOnce(makeAiResult(JSON.stringify(crudMap)));

    const result = await service.extract('browse events');

    expect(result.capabilities).toHaveLength(1);
    expect(result.capabilities[0].archetype).toBe('CRUD');
    expect(result.capabilities[0].needsNewFlow).toBe(false);
  });

  // ── Non-CRUD capabilities with no pattern match need a new flow ──────────

  it('sets needsNewFlow=true for non-CRUD capabilities with no pattern match', async () => {
    const novelMap: CapabilityMap = {
      capabilities: [
        {
          name: 'AIRecommendations',
          description: 'Recommends events based on user history.',
          archetype: 'PROCESSING',
          matchesPattern: null,
          needsNewFlow: true,
          technologyHints: [],
          dependencies: [],
        },
      ],
      entities: [],
      userFlows: [],
      systemContext: { existingSystem: false, stackHints: [], notes: '' },
    };

    mockDbService.searchDocuments
      .mockResolvedValueOnce(makeDbResult([makePromptDoc()]))
      .mockResolvedValueOnce(makeDbResult([]));

    mockAiProvider.generate.mockResolvedValueOnce(makeAiResult(JSON.stringify(novelMap)));

    const result = await service.extract('AI-powered event recommendations');

    expect(result.capabilities[0].needsNewFlow).toBe(true);
    expect(result.capabilities[0].matchesPattern).toBeNull();
  });

  // ── projectId cross-reference ────────────────────────────────────────────

  it('fetches project understanding when projectId is provided', async () => {
    const projectUnderstanding = {
      patternType: 'PROJECT_UNDERSTANDING',
      projectId: 'my-project',
      existingCapabilities: [
        { name: 'UserAuth', purpose: 'Handles user login and registration', doNotDuplicate: true },
      ],
    };

    mockDbService.searchDocuments
      .mockResolvedValueOnce(makeDbResult([makePromptDoc()])) // loadPrompt
      .mockResolvedValueOnce(makeDbResult([])) // loadKnownPatterns
      .mockResolvedValueOnce(makeDbResult([projectUnderstanding])); // loadProjectCapabilities

    mockAiProvider.generate.mockResolvedValueOnce(
      makeAiResult(JSON.stringify(EVENTS_CAPABILITY_MAP)),
    );

    const result = await service.extract('events and user management', 'my-project');

    expect(result).toBeDefined();
    // The DB was queried 3 times (prompt, patterns, project understanding)
    expect(mockDbService.searchDocuments).toHaveBeenCalledTimes(3);
  });

  // ── Error handling ───────────────────────────────────────────────────────

  it('throws when prompt is not found in DB', async () => {
    mockDbService.searchDocuments.mockResolvedValueOnce(makeDbResult([]));

    await expect(service.extract('some description')).rejects.toThrow(
      'Requirement extraction prompt not found',
    );
  });

  it('throws when AI returns non-JSON text', async () => {
    mockDbService.searchDocuments
      .mockResolvedValueOnce(makeDbResult([makePromptDoc()]))
      .mockResolvedValueOnce(makeDbResult([]));

    mockAiProvider.generate.mockResolvedValueOnce(
      makeAiResult('Sorry, I cannot process that request.'),
    );

    await expect(service.extract('some description')).rejects.toThrow('No JSON found');
  });

  it('handles markdown-wrapped JSON from AI', async () => {
    mockDbService.searchDocuments
      .mockResolvedValueOnce(makeDbResult([makePromptDoc()]))
      .mockResolvedValueOnce(makeDbResult([]));

    mockAiProvider.generate.mockResolvedValueOnce(
      makeAiResult('```json\n' + JSON.stringify(EVENTS_CAPABILITY_MAP) + '\n```'),
    );

    const result = await service.extract('events with capacity');

    expect(result.capabilities).toHaveLength(4);
  });
});
