import { PromptLibraryStation } from './prompt-library.station';
import { DataProcessResult } from '../kernel/data-process-result';

describe('PromptLibraryStation', () => {
  let station: PromptLibraryStation;

  const mockDb = {
    storeDocument: jest.fn().mockResolvedValue(DataProcessResult.success({})),
    searchDocuments: jest.fn().mockResolvedValue(DataProcessResult.success([])),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    station = new PromptLibraryStation(mockDb as any);
  });

  describe('resolvePrompt', () => {
    it('returns PROMPT_NOT_FOUND when no prompts exist', async () => {
      const result = await station.resolvePrompt('T47', 'genesis');
      expect(result.isSuccess).toBe(false);
      expect(result.errorCode).toBe('PROMPT_NOT_FOUND');
    });

    it('returns global prompt when tenant prompt missing', async () => {
      const globalPrompt = {
        promptId: 'g1',
        taskTypeId: 'T47',
        promptType: 'genesis',
        version: '1.0.0',
        active: true,
      };
      mockDb.searchDocuments
        .mockResolvedValueOnce(DataProcessResult.success([])) // tier 1: no tenant match
        .mockResolvedValueOnce(DataProcessResult.success([globalPrompt])); // tier 2: global
      const result = await station.resolvePrompt('T47', 'genesis', { tenantId: 'acme' });
      expect(result.isSuccess).toBe(true);
      expect(result.data?.promptId).toBe('g1');
    });

    it('returns latest version when multiple exist', async () => {
      const prompts = [
        { promptId: 'p1', version: '1.0.0', active: true },
        { promptId: 'p2', version: '1.1.0', active: true },
      ];
      mockDb.searchDocuments.mockResolvedValueOnce(DataProcessResult.success(prompts));
      const result = await station.resolvePrompt('T47', 'genesis');
      expect(result.data?.promptId).toBe('p2');
    });
  });

  describe('storePrompt', () => {
    it('assigns promptId and timestamps', async () => {
      const result = await station.storePrompt({
        taskTypeId: 'T47',
        promptType: 'genesis',
        version: '1.0.0',
        content: 'Generate a service',
        active: true,
      });
      expect(result.isSuccess).toBe(true);
      expect(result.data?.promptId).toBeDefined();
      expect(result.data?.createdAt).toBeDefined();
    });
  });

  describe('listPrompts', () => {
    it('returns empty array when no prompts', async () => {
      const result = await station.listPrompts();
      expect(result.isSuccess).toBe(true);
      expect(result.data).toEqual([]);
    });
  });
});
