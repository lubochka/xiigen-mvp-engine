# Rule 3: Mental Execution

## What It Catches

Wrong mental model of how code actually runs — believing a code path executes when it doesn't, or believing a value is set when it isn't, because you are reading the code as you wish it worked rather than as it actually works.

## The Problem

Experienced developers often read code fast and fill in gaps with assumptions. In a complex async pipeline like XIIGen (11 AF stations, fabric resolution, AsyncLocalStorage propagation), those assumptions are frequently wrong. Mental execution forces you to trace the actual execution path step by step.

## When to Apply

Apply when:
- "The code looks correct" but the output is wrong
- A bug disappeared after a change you don't fully understand
- You are about to add logging to confirm a hypothesis — trace mentally first

## Mental Execution Protocol

**Step 1: Entry point**
What is the exact input to the function you are tracing? Write it down.

**Step 2: Branch conditions**
At every `if / switch / ternary`, what is the ACTUAL value of the condition, given step 1's input? Do not assume — check.

**Step 3: Async steps**
At every `await`, what resumes? Is there an error path that routes differently? Is the AsyncLocalStorage context still live?

**Step 4: Output assembly**
What is actually placed in the return value or DataProcessResult? Is it the field you think, or a different path?

**Step 5: Boundary crossing**
When the return value is consumed by the NEXT station/provider, does the field name match? Does the type match?

## XIIGen-Specific Tracing Points

```
AF-4 → AF-1:
  Does selectSkillsForContext() return the blocks you expect?
  Are those blocks attached to StationInput before AF-1 reads them?

AF-1 → generated output:
  Is the prompt template for this archetype loaded?
  Are DNA guard reminders injected (SK-DNA block present)?

AF-9 judge:
  Is it reading input.qualityScores or input.context.qualityScores?
  Which model is being used as judge vs advisor?

Fabric resolution:
  Is fabricType exactly "elasticsearch" (lowercase)?
  Which provider does the registry return for this tenant?
```

## Anti-Pattern

"I can see by inspection that this sets `result.data` correctly." Inspection is not execution. Write out the actual values at each step. The bug is usually in the step you skipped.
