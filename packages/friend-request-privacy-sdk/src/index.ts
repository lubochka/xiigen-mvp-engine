export type PrivacyAction = 'friend_request' | 'feed_item' | 'feed_delivery';

export interface PrivacyCheckRequest {
  userId: string;
  tenantId: string;
  action: PrivacyAction;
  requesterId?: string;
}

export interface PrivacyCheckResult {
  allowed: boolean;
  reason?: string;
}

export interface PrivacyCheckResponse {
  isSuccess: boolean;
  data?: PrivacyCheckResult;
  errorCode?: string;
  errorMessage?: string;
}

export interface IPrivacyGatekeeperService {
  check(request: PrivacyCheckRequest): Promise<PrivacyCheckResponse>;
}

export abstract class PrivacyGatekeeperService implements IPrivacyGatekeeperService {
  abstract check(request: PrivacyCheckRequest): Promise<PrivacyCheckResponse>;
}
