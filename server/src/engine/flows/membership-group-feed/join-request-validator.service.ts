/**
 * JoinRequestValidator (T99) — FLOW-06 Phase 1A
 * Single responsibility: read-only validation before a group join is processed.
 *
 * Iron rules:
 *   Three reads before any write: group exists, user ban, existing membership.
 *   ALREADY_MEMBER fires if status IN ['ACTIVE', 'PENDING'] — not just ACTIVE.
 *   Distinct error codes: GROUP_NOT_FOUND, USER_BANNED, ALREADY_MEMBER, INVALID_INVITE_TOKEN.
 *   VALIDATION_FAILURE is NEVER returned for these four conditions.
 *   Zero writes — read-only validation node.
 *   Invite token validated for INVITE_ONLY groups.
 *   DNA-3: All methods return DataProcessResult<T> — never throw.
 */

import { DataProcessResult } from '../../../kernel/data-process-result';
import { IDatabaseService } from '../../../fabrics/interfaces/database.interface';

const GROUPS_INDEX = 'xiigen-groups';
const BANS_INDEX = 'xiigen-user-bans';
const MEMBERSHIPS_INDEX = 'xiigen-group-memberships';
const INVITE_TOKENS_INDEX = 'xiigen-invite-tokens';

export interface JoinRequestValidatorInput {
  groupId: string;
  userId: string;
  inviteToken?: string;
  tenantId: string;
}

export class JoinRequestValidator {
  constructor(private readonly db: IDatabaseService) {}

  async validate(
    input: JoinRequestValidatorInput,
  ): Promise<DataProcessResult<{ valid: true; groupType: string }>> {
    try {
      // ── Read 1: Group exists check ────────────────────────────────────────
      const groupResult = await this.db.searchDocuments(GROUPS_INDEX, {
        group_id: input.groupId,
      });
      if (!groupResult.isSuccess || (groupResult.data ?? []).length === 0) {
        return DataProcessResult.failure('GROUP_NOT_FOUND', `Group ${input.groupId} not found`);
      }
      const group = groupResult.data![0] as Record<string, unknown>;
      const groupType = (group['group_type'] as string) ?? 'PUBLIC';

      // ── Read 2: User ban check ────────────────────────────────────────────
      const banResult = await this.db.searchDocuments(BANS_INDEX, {
        user_id: input.userId,
        group_id: input.groupId,
      });
      if (banResult.isSuccess && (banResult.data ?? []).length > 0) {
        return DataProcessResult.failure(
          'USER_BANNED',
          `User ${input.userId} is banned from group ${input.groupId}`,
        );
      }

      // ── Read 3: Existing membership check ────────────────────────────────
      const membershipResult = await this.db.searchDocuments(MEMBERSHIPS_INDEX, {
        user_id: input.userId,
        group_id: input.groupId,
      });
      if (membershipResult.isSuccess && (membershipResult.data ?? []).length > 0) {
        const membership = membershipResult.data![0] as Record<string, unknown>;
        const status = membership['status'] as string;
        if (status === 'ACTIVE' || status === 'PENDING') {
          return DataProcessResult.failure(
            'ALREADY_MEMBER',
            `User ${input.userId} already has membership with status ${status}`,
          );
        }
      }

      // ── Invite token check for INVITE_ONLY groups ─────────────────────────
      if (groupType === 'INVITE_ONLY') {
        if (!input.inviteToken) {
          return DataProcessResult.failure(
            'INVALID_INVITE_TOKEN',
            `Group ${input.groupId} requires an invite token`,
          );
        }
        const tokenResult = await this.db.searchDocuments(INVITE_TOKENS_INDEX, {
          token: input.inviteToken,
          group_id: input.groupId,
        });
        if (!tokenResult.isSuccess || (tokenResult.data ?? []).length === 0) {
          return DataProcessResult.failure(
            'INVALID_INVITE_TOKEN',
            `Invite token is invalid or expired`,
          );
        }
      }

      return DataProcessResult.success({ valid: true, groupType });
    } catch (err) {
      return DataProcessResult.failure(
        'JOIN_REQUEST_VALIDATOR_ERROR',
        `JoinRequestValidator threw: ${String(err)}`,
      );
    }
  }
}
