/**
 * validateRejectedInputFields tests (DD-226)
 * GAP-M4 acceptance: 8 tests
 */

import { validateRejectedInputFields } from '../input-validator';

const t369Config = {
  rejectedFields: ['score', 'points', 'percentage', 'grade', 'mark', 'result'],
  rejectionCode: 'CLIENT_SCORE_REJECTED',
  rejectionMessage: 'DD-226: Client-supplied score fields not accepted.',
  arrayFieldsToCheck: ['answers'],
};

describe('validateRejectedInputFields (DD-226)', () => {
  it('passes when no rejected fields present', () => {
    const result = validateRejectedInputFields(
      { answers: [{ questionId: 'q1', selectedOption: 'A' }] },
      t369Config,
    );
    expect(result.isSuccess).toBe(true);
  });

  it('rejects input with score field at root level', () => {
    const result = validateRejectedInputFields({ answers: [], score: 95 }, t369Config);
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('CLIENT_SCORE_REJECTED');
    expect(result.errorMessage).toContain("'score'");
  });

  it('rejects input with points field at root level', () => {
    const result = validateRejectedInputFields({ answers: [], points: 100 }, t369Config);
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('CLIENT_SCORE_REJECTED');
  });

  it('rejects input with grade field in answers array item', () => {
    const result = validateRejectedInputFields(
      { answers: [{ questionId: 'q1', grade: 'A+' }] },
      t369Config,
    );
    expect(result.isSuccess).toBe(false);
    expect(result.errorMessage).toContain('answers[0]');
  });

  it('rejects input with mark field', () => {
    const result = validateRejectedInputFields({ mark: 85 }, t369Config);
    expect(result.isSuccess).toBe(false);
  });

  it('rejects input with percentage field', () => {
    const result = validateRejectedInputFields({ percentage: 92.5 }, t369Config);
    expect(result.isSuccess).toBe(false);
  });

  it('uses configured rejection code', () => {
    const result = validateRejectedInputFields({ score: 100 }, t369Config);
    expect(result.errorCode).toBe('CLIENT_SCORE_REJECTED');
  });

  it('does not check arrays not in arrayFieldsToCheck', () => {
    // 'otherArray' is not in arrayFieldsToCheck — score inside it should not be checked
    const result = validateRejectedInputFields(
      { answers: [], otherArray: [{ score: 95 }] },
      t369Config,
    );
    // otherArray not checked — this passes
    expect(result.isSuccess).toBe(true);
  });
});
