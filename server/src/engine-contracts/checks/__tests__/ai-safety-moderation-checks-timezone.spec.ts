/**
 * streak_timezone_from_profile_not_client tests (DD-223/CF-471)
 * GAP-M7 acceptance: 4 tests
 */

import { streak_timezone_from_profile_not_client } from '../ai-safety-moderation-checks';

describe('streak_timezone_from_profile_not_client (DD-223/CF-471)', () => {
  it('passes when profile timezone is used correctly', () => {
    expect(() =>
      streak_timezone_from_profile_not_client({
        timezoneUsedForCalculation: 'Asia/Tokyo',
        profileTimezone: 'Asia/Tokyo',
        requestHeaderTimezone: undefined,
      }),
    ).not.toThrow();
  });

  it('throws when calculation uses different timezone than profile', () => {
    expect(() =>
      streak_timezone_from_profile_not_client({
        timezoneUsedForCalculation: 'America/New_York',
        profileTimezone: 'Asia/Tokyo',
      }),
    ).toThrow('DD-223');
  });

  it('throws when calculation timezone matches client header timezone', () => {
    expect(() =>
      streak_timezone_from_profile_not_client({
        timezoneUsedForCalculation: 'Europe/London',
        profileTimezone: 'Europe/London',
        requestHeaderTimezone: 'Europe/London', // Suspicious — matches header
      }),
    ).toThrow('matches client request header');
  });

  it('allows when header timezone exists but differs from profile (profile wins)', () => {
    // If header says 'UTC' but profile says 'Asia/Tokyo' and we used 'Asia/Tokyo', that is correct
    expect(() =>
      streak_timezone_from_profile_not_client({
        timezoneUsedForCalculation: 'Asia/Tokyo',
        profileTimezone: 'Asia/Tokyo',
        requestHeaderTimezone: 'UTC', // Header ignored, profile used
      }),
    ).not.toThrow();
  });
});
