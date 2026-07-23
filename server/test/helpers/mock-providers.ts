/**
 * Mock providers for testing.
 * Grows with each phase — P1 starts with minimal mocks.
 */

import { DataProcessResult } from '../../src/kernel/data-process-result';

/**
 * Mock database access — returns success for everything.
 * Used when testing services that need a DB component but
 * we don't care about DB behavior in that test.
 */
export const mockDatabaseAccess = {
  storeDocument: jest.fn().mockResolvedValue(DataProcessResult.success({ _id: 'mock-id' })),
  searchDocuments: jest.fn().mockResolvedValue(DataProcessResult.success([])),
  getDocument: jest.fn().mockResolvedValue(DataProcessResult.success({})),
  deleteDocument: jest.fn().mockResolvedValue(DataProcessResult.success(true)),
};

/**
 * Mock queue pub/sub — captures enqueued events.
 */
export const mockQueuePubSub = {
  enqueue: jest.fn().mockResolvedValue(DataProcessResult.success('mock-message-id')),
  dequeue: jest.fn().mockResolvedValue(DataProcessResult.success([])),
  acknowledge: jest.fn().mockResolvedValue(DataProcessResult.success(true)),
};

/**
 * Mock config provider — returns defaults.
 */
export const mockConfigProvider = {
  getConfig: jest.fn().mockImplementation((_key: string, defaultValue: unknown) => defaultValue),
  getConfigSection: jest.fn().mockReturnValue({}),
};

/**
 * Reset all mock functions — call in beforeEach.
 */
export function resetAllMocks(): void {
  jest.clearAllMocks();
}
