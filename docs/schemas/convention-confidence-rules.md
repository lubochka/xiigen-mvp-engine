# Convention Confidence Threshold Rules

## How confidence is calculated

For a pattern to be a convention it must appear consistently.
Confidence = occurrences / total applicable files.

Example: "All PHP files start with ABSPATH check"
  Found in: 47 of 47 PHP files
  Confidence: 47/47 = 1.0

Example: "Classes use constructor injection"
  Found in: 12 of 19 service classes
  Confidence: 12/19 = 0.63

## Threshold tiers

| Range | Tier | Enforcement | Effect in generation |
|-------|------|-------------|---------------------|
| 0.80–1.0 | IRON_RULE | Enforced | Becomes derivedIronRule. Violation = AF-7 compliance fail. |
| 0.50–0.79 | GUIDANCE | Suggested | Included in Section 4 context. Not checked by named checks. |
| < 0.50 | EXCLUDED | Ignored | Not included in context. Too inconsistent to be a convention. |

## Configurable threshold

FREEDOM config key: `convention_enforcement_threshold` (default: 0.80)

Lowering to 0.70 captures more conventions as IRON_RULE.
Raising to 0.90 only captures near-universal conventions.
Adjust per project if the default misses known conventions.

## Edge cases

**N/M where M < 5:** Do not compute confidence. Too few samples to establish
a convention. Mark as GUIDANCE regardless of ratio.

**Security patterns:** Always IRON_RULE regardless of confidence score.
A pattern that appears in 3/5 auth endpoints is still a security requirement.
CONVENTION_EXTRACT must treat auth/security patterns as IRON_RULE unless
confidence is below 0.30 (genuinely inconsistent).

**Test patterns:** Follow standard threshold. Test structure is a quality
convention but violation does not produce incorrect code.
