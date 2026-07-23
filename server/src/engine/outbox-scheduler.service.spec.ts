/**
 * S22 — OutboxSchedulerService unit tests.
 *
 * Verifies:
 *   1. relayOutbox() calls OutboxRelayService.relayPendingMessages().
 *   2. Successful relay with processed > 0 logs at 'log' level.
 *   3. Relay with processed = 0 does NOT log.
 *   4. Failed relay logs a warning but does not throw.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { OutboxSchedulerService } from './outbox-scheduler.service';
import { OutboxRelayService } from './outbox-relay.service';
import { DataProcessResult } from '../kernel/data-process-result';

const mockRelay = {
  relayPendingMessages: jest.fn(),
};

describe('S22 — OutboxSchedulerService', () => {
  let module: TestingModule;
  let scheduler: OutboxSchedulerService;
  let logSpy: jest.SpyInstance;
  let warnSpy: jest.SpyInstance;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      providers: [OutboxSchedulerService, { provide: OutboxRelayService, useValue: mockRelay }],
    }).compile();

    scheduler = module.get<OutboxSchedulerService>(OutboxSchedulerService);
  });

  afterAll(async () => {
    await module.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    // Spy on Logger methods via the prototype
    logSpy = jest.spyOn((scheduler as any).logger, 'log').mockImplementation(() => {});
    warnSpy = jest.spyOn((scheduler as any).logger, 'warn').mockImplementation(() => {});
  });

  it('calls relayPendingMessages() with no args', async () => {
    mockRelay.relayPendingMessages.mockResolvedValueOnce(
      DataProcessResult.success({ processed: 0, published: 0, failed: 0, deduplicated: 0 }),
    );
    await scheduler.relayOutbox();
    expect(mockRelay.relayPendingMessages).toHaveBeenCalledTimes(1);
  });

  it('logs when messages are processed', async () => {
    mockRelay.relayPendingMessages.mockResolvedValueOnce(
      DataProcessResult.success({ processed: 3, published: 3, failed: 0, deduplicated: 0 }),
    );
    await scheduler.relayOutbox();
    expect(logSpy).toHaveBeenCalled();
  });

  it('does not log when processed = 0 (quiet pass)', async () => {
    mockRelay.relayPendingMessages.mockResolvedValueOnce(
      DataProcessResult.success({ processed: 0, published: 0, failed: 0, deduplicated: 0 }),
    );
    await scheduler.relayOutbox();
    expect(logSpy).not.toHaveBeenCalled();
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('logs a warning on relay failure but does not throw (DNA-3)', async () => {
    mockRelay.relayPendingMessages.mockResolvedValueOnce(
      DataProcessResult.failure('RELAY_ERROR', 'queue unavailable'),
    );
    await expect(scheduler.relayOutbox()).resolves.toBeUndefined();
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('RELAY_ERROR'));
  });

  it('does not throw when relay fails', async () => {
    mockRelay.relayPendingMessages.mockResolvedValueOnce(
      DataProcessResult.failure('RELAY_ERROR', 'test'),
    );
    await expect(scheduler.relayOutbox()).resolves.not.toThrow();
  });

  it('scheduler instance is defined', () => {
    expect(scheduler).toBeDefined();
  });
});
