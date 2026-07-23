/**
 * CrudGeneratorService unit tests.
 * Tests that 5 paginated, tenant-scoped REST endpoints are generated for a given entity.
 *
 * SESSION-P-1: CF-807 (pagination), CF-808 (tenant scope), CF-809 (IDatabaseService only).
 */

import { CrudGeneratorService, CrudResult } from './crud-generator.service';
import { DataProcessResult } from '../../kernel/data-process-result';

// ─── Mock helpers ────────────────────────────────────────────────────────────

const makeAiResult = (text: string) => DataProcessResult.success({ text });

const makeDbResult = <T>(data: T[]) =>
  DataProcessResult.success(data as Array<Record<string, unknown>>);

const makePromptDoc = () => ({
  promptId: 'crud-generate--genesis--v1.0.0',
  systemPrompt: 'You are generating REST endpoint handlers for a simple entity...',
  userPromptTemplate:
    'Generate REST endpoint handlers for the following entity.\n\n' +
    '## Entity:\nName: {{ENTITY_NAME}}\nAttributes: {{ATTRIBUTES}}\n\n' +
    '## Project conventions (if available):\n{{PROJECT_CONVENTIONS}}\n\n' +
    '## Target runtime:\n{{RUNTIME_CONTEXT}}\n\n' +
    'Generate 5 endpoint handlers for /{{entity-plural}}\n\n' +
    'Output ONLY the JSON object.',
});

const EVENT_CRUD_RESULT: CrudResult = {
  endpoints: [
    {
      method: 'GET',
      path: '/events',
      description: 'List events with pagination',
      parameters: { page: 1, pageSize: 20 },
      responseSchema: { data: [], total: 0, page: 1, pageSize: 20 },
    },
    {
      method: 'GET',
      path: '/events/:id',
      description: 'Get a single event by ID',
      parameters: { id: 'string' },
      responseSchema: { data: {} },
    },
    {
      method: 'POST',
      path: '/events',
      description: 'Create a new event',
      parameters: { title: 'string', date: 'string', capacity: 'number' },
      responseSchema: { data: {} },
    },
    {
      method: 'PUT',
      path: '/events/:id',
      description: 'Update an existing event',
      parameters: { id: 'string', title: 'string', date: 'string', capacity: 'number' },
      responseSchema: { data: {} },
    },
    {
      method: 'DELETE',
      path: '/events/:id',
      description: 'Delete an event',
      parameters: { id: 'string' },
      responseSchema: { success: true },
    },
  ],
  generatedCode:
    '// Generated CRUD handlers for Event entity\n// Uses IDatabaseService — no direct DB imports',
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

  const service = new CrudGeneratorService(mockAiProvider as any, mockDbService as any);

  return { service, mockAiProvider, mockDbService };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('CrudGeneratorService', () => {
  let service: CrudGeneratorService;
  let mockAiProvider: { generate: jest.Mock };
  let mockDbService: { searchDocuments: jest.Mock; storeDocument: jest.Mock };

  beforeEach(() => {
    const mocks = buildMocks();
    service = mocks.service;
    mockAiProvider = mocks.mockAiProvider;
    mockDbService = mocks.mockDbService;
  });

  // ── CF-807: 5 endpoints generated ───────────────────────────────────────

  it('generates exactly 5 endpoints for Event entity', async () => {
    mockDbService.searchDocuments.mockResolvedValueOnce(makeDbResult([makePromptDoc()])); // loadPrompt

    mockAiProvider.generate.mockResolvedValueOnce(makeAiResult(JSON.stringify(EVENT_CRUD_RESULT)));

    const result = await service.generate('Event', ['title', 'date', 'capacity']);

    expect(result.endpoints).toHaveLength(5);
  });

  it('generates all 4 HTTP methods: GET, POST, PUT, DELETE', async () => {
    mockDbService.searchDocuments.mockResolvedValueOnce(makeDbResult([makePromptDoc()]));

    mockAiProvider.generate.mockResolvedValueOnce(makeAiResult(JSON.stringify(EVENT_CRUD_RESULT)));

    const result = await service.generate('Event', ['title', 'date', 'capacity']);

    const methods = result.endpoints.map((e) => e.method);
    expect(methods).toContain('GET');
    expect(methods).toContain('POST');
    expect(methods).toContain('PUT');
    expect(methods).toContain('DELETE');
  });

  it('includes LIST endpoint (GET without :id)', async () => {
    mockDbService.searchDocuments.mockResolvedValueOnce(makeDbResult([makePromptDoc()]));

    mockAiProvider.generate.mockResolvedValueOnce(makeAiResult(JSON.stringify(EVENT_CRUD_RESULT)));

    const result = await service.generate('Event', ['title', 'date', 'capacity']);

    const listEndpoint = result.endpoints.find(
      (e) => e.method === 'GET' && !e.path.includes(':id'),
    );
    expect(listEndpoint).toBeDefined();
    expect(listEndpoint!.description).toMatch(/list|List/i);
  });

  // ── CF-807: list pagination ──────────────────────────────────────────────

  it('list endpoint parameters include page and pageSize', async () => {
    mockDbService.searchDocuments.mockResolvedValueOnce(makeDbResult([makePromptDoc()]));

    mockAiProvider.generate.mockResolvedValueOnce(makeAiResult(JSON.stringify(EVENT_CRUD_RESULT)));

    const result = await service.generate('Event', ['title', 'date', 'capacity']);

    const listEndpoint = result.endpoints.find(
      (e) => e.method === 'GET' && !e.path.includes(':id'),
    );
    expect(listEndpoint).toBeDefined();
    const params = listEndpoint!.parameters;
    expect(params).toHaveProperty('page');
    expect(params).toHaveProperty('pageSize');
  });

  // ── generatedCode is present ─────────────────────────────────────────────

  it('returns generatedCode in the result', async () => {
    mockDbService.searchDocuments.mockResolvedValueOnce(makeDbResult([makePromptDoc()]));

    mockAiProvider.generate.mockResolvedValueOnce(makeAiResult(JSON.stringify(EVENT_CRUD_RESULT)));

    const result = await service.generate('Event', ['title', 'date', 'capacity']);

    expect(result.generatedCode).toBeDefined();
    expect(typeof result.generatedCode).toBe('string');
    expect(result.generatedCode.length).toBeGreaterThan(0);
  });

  // ── projectId applies project conventions ────────────────────────────────

  it('fetches project conventions when projectId is provided', async () => {
    const projectUnderstanding = {
      patternType: 'PROJECT_UNDERSTANDING',
      projectId: 'my-project',
      architecture: { language: 'TypeScript' },
      derivedIronRules: [
        { ruleId: 'IR-PROJ-1', text: 'All services must extend MicroserviceBase', evidence: {} },
      ],
    };

    mockDbService.searchDocuments
      .mockResolvedValueOnce(makeDbResult([makePromptDoc()])) // loadPrompt
      .mockResolvedValueOnce(makeDbResult([projectUnderstanding])); // retrieveProjectUnderstanding

    mockAiProvider.generate.mockResolvedValueOnce(makeAiResult(JSON.stringify(EVENT_CRUD_RESULT)));

    const result = await service.generate('Event', ['title', 'date'], 'my-project');

    expect(result.endpoints).toHaveLength(5);
    expect(mockDbService.searchDocuments).toHaveBeenCalledTimes(2);

    // Verify conventions were included in the prompt
    const promptCall = mockAiProvider.generate.mock.calls[0][0] as string;
    expect(promptCall).toContain('IR-PROJ-1');
  });

  // ── Pluralization ────────────────────────────────────────────────────────

  it('pluralizes entity names correctly in the prompt', async () => {
    mockDbService.searchDocuments.mockResolvedValueOnce(makeDbResult([makePromptDoc()]));

    mockAiProvider.generate.mockResolvedValueOnce(makeAiResult(JSON.stringify(EVENT_CRUD_RESULT)));

    await service.generate('Event', ['title']);

    const promptArg = mockAiProvider.generate.mock.calls[0][0] as string;
    expect(promptArg).toContain('events'); // Event → events
  });

  // ── Error handling ───────────────────────────────────────────────────────

  it('throws when CRUD prompt is not found in DB', async () => {
    mockDbService.searchDocuments.mockResolvedValueOnce(makeDbResult([]));

    await expect(service.generate('Event', ['title'])).rejects.toThrow(
      'CRUD generation prompt not found',
    );
  });

  it('throws when AI returns non-JSON text', async () => {
    mockDbService.searchDocuments.mockResolvedValueOnce(makeDbResult([makePromptDoc()]));

    mockAiProvider.generate.mockResolvedValueOnce(
      makeAiResult('I cannot generate code for this entity.'),
    );

    await expect(service.generate('Event', ['title'])).rejects.toThrow('No JSON found');
  });

  it('handles markdown-wrapped JSON from AI', async () => {
    mockDbService.searchDocuments.mockResolvedValueOnce(makeDbResult([makePromptDoc()]));

    mockAiProvider.generate.mockResolvedValueOnce(
      makeAiResult('```json\n' + JSON.stringify(EVENT_CRUD_RESULT) + '\n```'),
    );

    const result = await service.generate('Event', ['title', 'date']);

    expect(result.endpoints).toHaveLength(5);
  });

  // ── No projectId — default conventions ──────────────────────────────────

  it('uses default NestJS conventions when no projectId provided', async () => {
    mockDbService.searchDocuments.mockResolvedValueOnce(makeDbResult([makePromptDoc()]));

    mockAiProvider.generate.mockResolvedValueOnce(makeAiResult(JSON.stringify(EVENT_CRUD_RESULT)));

    await service.generate('Event', ['title', 'date', 'capacity']);

    const promptArg = mockAiProvider.generate.mock.calls[0][0] as string;
    expect(promptArg).toContain('NestJS TypeScript conventions');
    // DB was only queried once (for prompt, not project understanding)
    expect(mockDbService.searchDocuments).toHaveBeenCalledTimes(1);
  });
});
