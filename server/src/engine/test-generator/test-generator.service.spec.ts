/**
 * TestGeneratorService unit tests (SESSION-P-4).
 * CF-816: N iron rules → N positive + N negative tests
 * CF-817: REGISTRATION archetype always gets concurrent race test
 */

import { TestGeneratorService } from './test-generator.service';
import { DataProcessResult } from '../../kernel/data-process-result';

const makeAiResult = (text: string) => DataProcessResult.success({ text });
const makeDbResult = <T>(data: T[]) =>
  DataProcessResult.success(data as Array<Record<string, unknown>>);

const makeUnitTestPromptDoc = () => ({
  promptId: 'unit-test-generate--genesis--v1.0.0',
  systemPrompt: 'You are generating unit tests...',
  userPromptTemplate:
    'Generate unit tests for the service.\n\n' +
    'Code: {{GENERATED_CODE}}\n' +
    'Iron rules: {{IRON_RULES}}\n' +
    'Archetype: {{ARCHETYPE}}\n' +
    'Framework: {{TEST_FRAMEWORK}}\n' +
    'Conventions: {{PROJECT_CONVENTIONS}}\n\n' +
    'Output ONLY the test file code.',
});

const makeIntegrationTestPromptDoc = () => ({
  promptId: 'integration-test-generate--genesis--v1.0.0',
  systemPrompt: 'You are generating integration tests...',
  userPromptTemplate:
    'Generate integration tests.\n\n' +
    'Code: {{GENERATED_CODE}}\n' +
    'Iron rules: {{IRON_RULES}}\n' +
    'Archetype: {{ARCHETYPE}}\n' +
    'Infrastructure: {{TEST_INFRASTRUCTURE}}\n\n' +
    'Output ONLY the test file code.',
});

function buildMocks() {
  const mockAiProvider = { generate: jest.fn() };
  const mockDbService = { searchDocuments: jest.fn() };
  const service = new TestGeneratorService(mockAiProvider as any, mockDbService as any);
  return { service, mockAiProvider, mockDbService };
}

describe('TestGeneratorService', () => {
  let service: TestGeneratorService;
  let mockAiProvider: { generate: jest.Mock };
  let mockDbService: { searchDocuments: jest.Mock };

  beforeEach(() => {
    const mocks = buildMocks();
    service = mocks.service;
    mockAiProvider = mocks.mockAiProvider;
    mockDbService = mocks.mockDbService;
  });

  // ── Returns both unit and integration test files ─────────────────────────

  it('generates both unit and integration test files', async () => {
    // DB calls: unit test prompt, integration test prompt (parallel + no projectId)
    mockDbService.searchDocuments
      .mockResolvedValueOnce(makeDbResult([makeUnitTestPromptDoc()]))
      .mockResolvedValueOnce(makeDbResult([makeIntegrationTestPromptDoc()]));

    mockAiProvider.generate
      .mockResolvedValueOnce(makeAiResult('// unit tests code'))
      .mockResolvedValueOnce(makeAiResult('// integration tests code'));

    const result = await service.generate({
      generatedCode: 'class EventService {}',
      ironRules: [{ ruleId: 'IR-1', text: 'Must scope to tenant' }],
      archetype: 'ORCHESTRATION',
    });

    expect(result.unitTests).toBeDefined();
    expect(result.integrationTests).toBeDefined();
    expect(result.unitTests).toContain('// unit tests code');
    expect(result.integrationTests).toContain('// integration tests code');
  });

  // ── CF-816: iron rules appear in the prompt ───────────────────────────────

  it('includes iron rules in unit test prompt (CF-816)', async () => {
    mockDbService.searchDocuments
      .mockResolvedValueOnce(makeDbResult([makeUnitTestPromptDoc()]))
      .mockResolvedValueOnce(makeDbResult([makeIntegrationTestPromptDoc()]));

    mockAiProvider.generate
      .mockResolvedValueOnce(makeAiResult('// tests'))
      .mockResolvedValueOnce(makeAiResult('// integration tests'));

    await service.generate({
      generatedCode: 'class SomeService {}',
      ironRules: [
        { ruleId: 'IR-1', text: 'All writes must use tenantId scope' },
        { ruleId: 'IR-2', text: 'Idempotency key required on create' },
      ],
      archetype: 'REGISTRATION',
    });

    const unitTestPromptArg = mockAiProvider.generate.mock.calls[0][0] as string;
    expect(unitTestPromptArg).toContain('IR-1');
    expect(unitTestPromptArg).toContain('IR-2');
    expect(unitTestPromptArg).toContain('All writes must use tenantId scope');
  });

  // ── CF-817: REGISTRATION archetype includes concurrent race test note ─────

  it('sends REGISTRATION archetype to prompt (CF-817)', async () => {
    mockDbService.searchDocuments
      .mockResolvedValueOnce(makeDbResult([makeUnitTestPromptDoc()]))
      .mockResolvedValueOnce(makeDbResult([makeIntegrationTestPromptDoc()]));

    mockAiProvider.generate
      .mockResolvedValueOnce(makeAiResult('// tests'))
      .mockResolvedValueOnce(makeAiResult('// integration tests'));

    await service.generate({
      generatedCode: 'class RegistrationService {}',
      ironRules: [{ ruleId: 'IR-1', text: 'Atomic slot allocation' }],
      archetype: 'REGISTRATION',
    });

    const unitTestPromptArg = mockAiProvider.generate.mock.calls[0][0] as string;
    expect(unitTestPromptArg).toContain('REGISTRATION');
  });

  // ── Default framework when no projectId ──────────────────────────────────

  it('uses default Jest framework when no projectId provided', async () => {
    mockDbService.searchDocuments
      .mockResolvedValueOnce(makeDbResult([makeUnitTestPromptDoc()]))
      .mockResolvedValueOnce(makeDbResult([makeIntegrationTestPromptDoc()]));

    mockAiProvider.generate
      .mockResolvedValueOnce(makeAiResult('// tests'))
      .mockResolvedValueOnce(makeAiResult('// integration tests'));

    await service.generate({
      generatedCode: 'class SomeService {}',
      ironRules: [],
      archetype: 'ORCHESTRATION',
    });

    const unitTestPromptArg = mockAiProvider.generate.mock.calls[0][0] as string;
    expect(unitTestPromptArg).toContain('Jest + TypeScript (default)');
  });

  // ── Error: prompt not found ───────────────────────────────────────────────

  it('throws when unit test prompt is not in DB', async () => {
    mockDbService.searchDocuments.mockResolvedValue(makeDbResult([]));

    await expect(
      service.generate({
        generatedCode: 'class SomeService {}',
        ironRules: [],
        archetype: 'ORCHESTRATION',
      }),
    ).rejects.toThrow('Test generation prompt not found');
  });
});
