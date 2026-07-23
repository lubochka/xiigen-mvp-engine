# PATCH: planning--root-cause-ladder-SKILL.md — Add missing triggers
## Applies to: planning--root-cause-ladder-SKILL.md (SK-432)
## Version: v1.0.1 | Date: 2026-03-26
## Source: Doc 9 review — triggers missing for post-simulation context

---

## HOW TO APPLY

Add two triggers to the existing `triggers:` list in the YAML front matter.
Insert after the last existing trigger (`"how many root causes"`).

---

## ADDITION: Two new triggers

```yaml
  - "after running simulations"
  - "gap catalog produced"
```

**Why these are needed:**

The ANALYSIS PIPELINE in HOW-TO-USE v2.3.0 sequences:
```
① simulation-protocol (SK-441)   Trace actual handlers
② solution-scope-gate (SK-434)   Gap classification
③ root-cause-ladder (SK-432)     CROSS-GAP CONVERGENCE
```

SK-432's CROSS-GAP CONVERGENCE section (which collapses N gaps into K root causes)
only loads if SK-432 is triggered. After a simulation cycle produces a gap catalog,
the natural next question is "what are the root causes?" — but that phrase doesn't
match any existing SK-432 trigger. Without the new triggers, SK-432 fails to load
at exactly the point where it is most needed.

The symptom: simulation sessions that find 15-20 gaps and produce separate fixes for
each, when 3-4 root causes would cover all of them. This is the failure mode
described in Doc 9's false positive finding.

---

## RESULT AFTER PATCH

Updated triggers list:
```yaml
triggers:
  - "why is this happening"
  - "what caused this"
  - "is this a bug"
  - "should we fix this"
  - "this keeps breaking"
  - "we've fixed this before"
  - "root cause"
  - "how many sessions do we need"
  - "collapse the gap list"
  - "find the roots"
  - "how many root causes"
  - "after running simulations"
  - "gap catalog produced"
```
