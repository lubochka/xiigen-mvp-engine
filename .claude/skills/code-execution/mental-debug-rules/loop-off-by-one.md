# Rule 6: Loop Off-By-One

## What It Catches

Off-by-one errors in AF station iteration, batch processing, pagination, or array indexing — producing wrong results for the first item, last item, or an item at a boundary.

## The Problem

Off-by-one errors are invisible to logic review. The code looks correct. The loop looks correct. But `< n` vs `<= n`, or `i = 0` vs `i = 1`, or `slice(0, n)` vs `slice(0, n-1)` produces exactly one wrong item — usually the last or first one.

## XIIGen-Specific Contexts

| Context | Off-By-One Risk |
|---------|----------------|
| Batch processing task contracts | Last task skipped (`i < tasks.length - 1`) |
| Skill block injection (max 3) | Four blocks injected (`<= 3` instead of `< 3`) |
| Pagination of search results | First page duplicated or last page skipped |
| Quality score history window | Window reads N+1 or N-1 entries |
| AF station retry loop | One too many or too few retries |

## Checklist

```
☐ What is the expected first iteration? What does the loop start at?
☐ What is the expected last iteration? Does the loop condition include or exclude it?
☐ Is the loop using < or <=? Which is correct for this collection?
☐ Is the loop modifying the collection it iterates? (splice, push mid-loop)
☐ For slice/splice: is the end index inclusive or exclusive?
☐ For pagination: does the offset start at 0 or 1?
☐ What is the expected count of items processed? Match against actual count.
```

## Trace Protocol

1. Identify the loop bounds (start, end condition, step)
2. Write out manually: first iteration, second iteration, last iteration
3. Check: is the last expected item actually included?
4. Check: is there an extra iteration that processes a non-existent item?
5. Write a unit test that asserts exact count and exact first/last item

## Example — Skill Block Cap

```typescript
// Bug: injects up to 4 blocks (i <= 3)
const blocks = [];
for (let i = 0; i <= this.maxBlocks; i++) {
  blocks.push(availableBlocks[i]);
}

// Fix: injects up to 3 blocks (i < 3)
for (let i = 0; i < this.maxBlocks; i++) {
  blocks.push(availableBlocks[i]);
}
```

## Anti-Pattern

"The loop looks right to me." Write out the first and last iterations manually. For a 3-element array with `i <= 3`, the last iteration accesses index 3 which is `undefined`. That is the bug.
