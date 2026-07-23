# Defense-in-Depth Validation — Agent Instructions

## When to Use
After finding and fixing a root cause. Make the bug structurally impossible
by validating at every layer data passes through.

## The Four Layers

| Layer | Purpose | Example |
|-------|---------|---------|
| 1. Entry Point | Reject invalid input at API boundary | `if (!dir) throw` |
| 2. Business Logic | Ensure data makes sense for this operation | `if (!projectDir) throw` |
| 3. Environment Guards | Prevent context-specific dangers | `if (cwd === homeDir) throw` |
| 4. Debug Instrumentation | Help when other layers fail | `console.warn('unexpected:', val)` |

## Rule
Single validation: "We fixed the bug."
Multiple layers: "We made the bug impossible."

## Quick Check After Any Fix
- [ ] Layer 1: Does entry point validate this input?
- [ ] Layer 2: Does business logic check for this case?
- [ ] Layer 3: Are dangerous contexts guarded?
- [ ] Layer 4: Would a log message help debug recurrence?
