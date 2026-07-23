// T81 PrivacyGatekeeperService — unit tests
// Validates: allowed when settings permit, blocked when disabled, fail-open on unavailable

import { PrivacyGatekeeperService } from './privacy-gatekeeper.service';
import { DataProcessResult } from '../../../kernel/data-process-result';

function makeMocks() {
  const privacySettings = {
    getSettings: jest
      .fn()
      .mockResolvedValue(
        DataProcessResult.success({ allowFriendRequests: true, feedVisible: true }),
      ),
  };
  const notificationService = {
    getPreferences: jest.fn().mockResolvedValue(DataProcessResult.success({})),
  };
  return { privacySettings, notificationService };
}

describe('PrivacyGatekeeperService — T81', () => {
  let service: PrivacyGatekeeperService;
  let mocks: ReturnType<typeof makeMocks>;

  beforeEach(() => {
    mocks = makeMocks();
    service = new PrivacyGatekeeperService(
      mocks.privacySettings as unknown as ConstructorParameters<typeof PrivacyGatekeeperService>[0],
      mocks.notificationService as unknown as ConstructorParameters<
        typeof PrivacyGatekeeperService
      >[1],
    );
    jest.clearAllMocks();
  });

  it('T81-1: returns allowed=true when settings permit the action', async () => {
    mocks.privacySettings.getSettings.mockResolvedValue(
      DataProcessResult.success({ allowFriendRequests: true }),
    );

    const result = await service.check({
      userId: 'user-001',
      tenantId: 'tenant-alpha',
      action: 'friend_request',
      requesterId: 'user-002',
    });

    expect(result.isSuccess).toBe(true);
    expect(result.data?.allowed).toBe(true);
  });

  it('T81-2: returns allowed=false with reason when action is disabled', async () => {
    mocks.privacySettings.getSettings.mockResolvedValue(
      DataProcessResult.success({ allowFriendRequests: false }),
    );

    const result = await service.check({
      userId: 'user-001',
      tenantId: 'tenant-alpha',
      action: 'friend_request',
      requesterId: 'user-002',
    });

    expect(result.isSuccess).toBe(true);
    expect(result.data?.allowed).toBe(false);
    expect(result.data?.reason).toBe('friend_requests_disabled');
  });

  it('T81-3: fail-open when privacy settings unreachable — returns allowed=true', async () => {
    mocks.privacySettings.getSettings.mockResolvedValue(
      DataProcessResult.failure('SETTINGS_UNAVAILABLE', 'Service unreachable'),
    );

    const result = await service.check({
      userId: 'user-001',
      tenantId: 'tenant-alpha',
      action: 'friend_request',
    });

    expect(result.isSuccess).toBe(true);
    expect(result.data?.allowed).toBe(true);
    expect(result.data?.reason).toBe('settings_unavailable_fail_open');
  });
});
