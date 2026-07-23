/**
 * FeedbackSynthesizer — builds the next-round prompt from arbiter notes.
 *
 * Input:  original spec + best candidate code + arbiter failure notes.
 * Output: improved genesis prompt that explicitly addresses every failure.
 *
 * This is what makes the loop converge. Without it each round is identical.
 *
 * DNA-3: DataProcessResult returns — no throws.
 */

import { Injectable } from '@nestjs/common';
import { DataProcessResult } from '../../kernel/data-process-result';

export interface SynthesisInput {
  readonly originalSpec: Record<string, unknown>;
  readonly bestCandidateCode: string;
  readonly bestCandidateModel: string;
  readonly roundNumber: number;
  readonly arbiterNotes: string[]; // from UnanimousVerdictAggregator.nextRoundNotes
  readonly previousGenesisPrompt: string;
}

@Injectable()
export class FeedbackSynthesizer {
  synthesize(input: SynthesisInput): DataProcessResult<string> {
    if (!input.arbiterNotes || input.arbiterNotes.length === 0) {
      return DataProcessResult.failure('NO_NOTES', 'No arbiter notes to synthesize');
    }

    const failureSection = input.arbiterNotes.join('\n');
    const codeSnippet = input.bestCandidateCode.slice(0, 1500);

    const improved = `
${input.previousGenesisPrompt}

---
## PREVIOUS ROUND FEEDBACK (Round ${input.roundNumber})

The best attempt so far (from ${input.bestCandidateModel}) did NOT pass all arbiters.
Here are the specific issues that must be fixed in this round:

${failureSection}

## BEST CANDIDATE SO FAR (for reference — improve on this)
\`\`\`typescript
${codeSnippet}
\`\`\`

## YOUR TASK
Generate an improved version that:
1. Fixes ALL issues listed above
2. Preserves everything that was already correct
3. Does NOT introduce new violations

Each issue above has a suggested fix — apply all of them.
`.trim();

    return DataProcessResult.success(improved);
  }
}
