# How to Find and Write Sub-Episodes
## Guidance for breaking parent episodes into their component stories
## Companion to EPISODE-EXAMINATION-GUIDANCE.md

---

## What a sub-episode is

A sub-episode is any part of a parent episode where the work had its own
clearly defined goal, produced its own documents, and went through its own
cycle of attempt-review-correction.

The difference between a sub-episode and just a section of work:
- A section of work is part of a continuous effort with no clear stopping point
- A sub-episode has a moment where someone could say "that part is done,
  now we move to the next thing"

If you can answer "what was the person trying to accomplish in this specific
part?" with a single clear sentence — it is a sub-episode.

---

## The four signals that tell you a sub-episode exists

### Signal 1 — A subfolder with its own internal structure

When a directory inside a parent episode has its own version sequences,
its own state files, and its own trigger document, that subfolder is a
sub-episode.

A flat collection of files is part of the parent. A folder that looks like
a mini-episode — with its own before/after, its own progression — is a
sub-episode.

Examples:
- `better css/` inside `Design to Figma/` — has its own FIX-PLAN versions,
  its own STATE.json, its own POST-MORTEM. Sub-episode.
- `R1/` inside `Wordpress integration/` — has its own REFERENCE-PLAN,
  SESSION-0-PLAN-REVIEW, STATE.json. Sub-episode.
- `phase 0/`, `phase 1/`, `phase 2/` inside `pre flow 01/implemented/` —
  each has its own SESSION files and state. Each is a sub-episode.

### Signal 2 — A named round, stage, or phase in the documents themselves

When the documents use language like "Round 3," "Phase B," "Stage 2," or
"Track A" to describe a portion of the work, each named unit is likely
a sub-episode.

Look for this language in:
- Document titles: `MASTER-PLAN-v3-GEOMETRY-FIRST.md` (v3 is a round)
- Section headers inside documents: "Round 2 — Adding side-by-side comparison"
- State file labels: `STATE_P2.json`, `STATE_P3.json`
- Changelog entries: "v3 adds Phase G Mobility Gate"

### Signal 3 — A pivot or correction document that resets direction

When you find a REVERSAL, REFRAME, POST-MORTEM, or CORRECTION document,
everything before it and everything after it are separate sub-episodes.
The pivot document is the boundary between them.

Before `SECURITY-CRITICAL-REVERSAL.md`: one sub-episode (multi-provider design).
After it: a new sub-episode (corrected post-reversal plan).

The pivot document itself belongs to the sub-episode it closes — it is the
last document of the "before" period, not the first of the "after."

### Signal 4 — A parallel track that addresses a different concern

When two bodies of work are happening at the same time but addressing
completely different questions, they are separate sub-episodes even if
their files sit in the same folder.

In the module separation episode:
- Examining the architecture of modules (one concern)
- Fixing the UI pages (completely different concern)

Both happened during the same parent episode. Both are sub-episodes,
connected to the same parent but not to each other.

How to spot parallel tracks: look for files that don't reference each other.
If two groups of files in the same folder never mention each other in their
content, they are parallel tracks.

---

## Step-by-step: how to find sub-episodes in a parent episode

### Step 1 — List everything in the parent directory

```bash
find "/path/to/parent-episode/" -maxdepth 2 -type d | sort
find "/path/to/parent-episode/" -maxdepth 1 -type f | sort
```

Look at the subdirectory names first. Any subdirectory that looks like it
could be its own episode probably is. Note each one.

### Step 2 — Check each subdirectory for internal structure

For each subdirectory, ask:
- Does it have its own STATE.json or checkpoint files? → Sub-episode
- Does it have a sequence of versioned files (v1, v2, FINAL)? → Sub-episode
- Does it have its own plan + execution + validation documents? → Sub-episode
- Does it have only a single type of file (all ZIPs, or all session files)?
  → Probably part of the parent, not its own sub-episode

### Step 3 — Look for the round/phase/stage language in document names

Scan file names for:
- `round`, `Round`, `ROUND`
- `phase`, `Phase`, `PHASE`
- `stage`, `Stage`, `STAGE`
- `track`, `Track`, `TRACK`
- `iteration`, `batch`, `session`

Each named unit is a candidate sub-episode.

Then scan for correction signals:
- `POST-MORTEM`, `REVERSAL`, `REFRAME`, `PIVOT`, `CORRECTION`, `FEEDBACK`

Each correction signal marks a boundary between two sub-episodes.

### Step 4 — Read the trigger document of each candidate sub-episode

For each candidate, read its trigger document (the earliest or lowest-versioned
file, or the one that sets up what the sub-episode is about).

Ask: can you describe what this part was trying to accomplish in one sentence?

If yes: it is a sub-episode. Write that sentence as its human goal.
If no: it is probably a section of the parent, not a sub-episode of its own.

### Step 5 — Map the connections

For each sub-episode found, record:
- Which parent it belongs to
- What it depended on (what had to be done before this)
- What ran in parallel with it (other sub-episodes happening at the same time)
- What came after it (what this sub-episode enabled)

These connections tell you the shape of the parent episode: whether it was
linear (one thing after another) or parallel (multiple tracks) or iterative
(the same thing attempted multiple times with corrections).

---

## How to write a sub-episode entry

Use the same format as a parent episode entry, with two additions:

**The connection line** — immediately after the header, before anything else:
```
**Parent:** [episode name]
**Position:** [where it sits — first, second, parallel to X, etc.]
**Depends on:** [what had to be done before this, or "nothing — this is first"]
```

Then write in the same format as EPISODE-EXAMINATION-GUIDANCE.md Step 8:
human goal, how the work was staged, trigger document, version sequences,
document structures, pivot if any, state files.

**Keep the same human language standard.** A sub-episode entry that reads as
technical documentation has failed the same way a parent episode entry would.
The question is always: can someone who has never seen any of this understand
what the person was trying to accomplish?

---

## Special cases

### When a sub-episode has no version history

Some sub-episodes produced their output once and it was approved. The observation
sub-episode (reading and understanding before any design) is often like this.

Write: "No version history — this sub-episode was [observation/research/reading]
only. Produced once and used as the foundation for what followed."

### When a sub-episode is a single document

A single document can be a sub-episode if it represents a complete unit of
problem-solving: a question asked, investigated, and answered.

The pivot document `XIIGEN-SYSTEM-INTAKE-REFRAME.md` is a sub-episode on its
own: the question was "what architecture do we need?", the investigation was
reading the old plan and seeing its cost, the answer was the reframe. One
document, one sub-episode.

Write it as: the question it was answering, what it concluded, what changed
as a result.

### When a sub-episode contains further sub-episodes

This happens in large episodes. The CSS debugging work in Episode 2 has
sub-episodes (each round), and each round has its own correction documents
that could be treated as sub-sub-episodes if the audience needs that level
of detail.

For the orchestration advisor learning corpus, go one level deep — sub-episodes
of the parent — unless a sub-episode itself is large enough to warrant further
subdivision (more than 5-6 distinct cycles of work within it).

The rule: if someone could be handed a sub-episode as a self-contained task
to learn from, and it would take more than a day to understand because it
contains multiple different goals within it, break it further.

### When sub-episodes overlap in time

Parallel tracks are the most common form of overlap. Describe each one
independently, then note the relationship in the connection line.

Do not try to merge parallel tracks into one sub-episode entry. They are
separate because they addressed different concerns. Merging them hides the
parallel structure that made the work possible.

---

## The connection table

After writing all sub-episodes for a parent, produce a connection table.
Format:

| Sub-episode | Parent | How it connects |
|---|---|---|
| 2.1 Fix group layout | Episode 2 | Direct response to 2.0's visual failures |
| 2.2 Add comparison; privacy reversal | Episode 2 | Improvement interrupted by a discovery |
| 2.4 Fix naming | Episode 2 | Parallel concern — layout improving, names still wrong |

The "how it connects" column is the most important. It should describe the
relationship in human terms, not just position. "Second" is not a relationship.
"Required 3b.2 to be complete before building could begin" is.

---

## Quality check for sub-episodes

A sub-episode entry is working when:

**The goal is specific to this sub-episode.** Not "improve the CSS generation"
(that is the parent goal) but "fix the root cause of broken group layouts"
(that is the sub-episode goal).

**The version history belongs here, not in the parent.** If a version sequence
is described in the parent episode entry AND the sub-episode entry, it belongs
in the sub-episode entry only.

**The connection makes sense without reading the parent.** Someone reading
only the sub-episode entry should understand what it depended on and what
it produced, even without having read the parent.

**Corrections are described as improvements.** The POST-MORTEM is not a failure
record — it is the moment the person improved the working method. The REVERSAL
is not a crisis — it is the moment a privacy problem was caught before it
shipped.

---

## Quick reference: sub-episode signals in file names

| File name pattern | What it usually signals |
|---|---|
| `better css/`, `better naming/`, `better image/` | A sub-episode within the same parent — each "better X" is a round |
| `round b/`, `round c/`, `debug 2/`, `debug 3/` | Successive sub-episodes within the same concern |
| `phase 0/`, `phase 1/`, `phase 2/` | Linear sub-episodes — each depends on the previous |
| `R1/`, `REFERENCE-PLAN.md` | Planning sub-episode — the "decide before building" round |
| `Worpdpress updated plugin/`, `Xiigen wordpress flows/` | Execution sub-episodes following the planning sub-episode |
| `architecture gap/`, `ui ux fixes/` | Parallel tracks within the same parent episode |
| `implemented/`, `phases done.zip` | Execution sub-episodes — the building round |
| `second round/`, `third round/` | Iteration sub-episodes — the same question revisited |
| `old/` containing v1 files | These are the "before" of a correction — the prior sub-episode's work |
| `extracted/` | Files pulled out for reference — usually belonging to the sub-episode that produced them |

---

## Example: applying this guidance to a new directory

Say you open `Multimodel Orchestrator/` and see:

```
Multimodel Orchestrator/
  prompt.txt
  PLAN-v1.md
  PLAN-v2.md
  PLAN-FINAL.md
  research/
    competitor-analysis.md
    model-comparison.md
  architecture/
    DESIGN-R1.md
    DESIGN-R2.md
    PIVOT-SINGLE-MODEL.md
    DESIGN-FINAL.md
  implementation/
    SESSION-1.md
    SESSION-2.md
    SESSION-3.md
    STATE.json
  testing/
    TEST-PLAN.md
    RESULTS-R1.md
    RESULTS-R2.md
```

**Applying the four signals:**

Signal 1 — subfolders with internal structure: `research/`, `architecture/`,
`implementation/`, `testing/` each have their own files. Candidates: four
sub-episodes.

Signal 2 — round/phase language: DESIGN-R1, DESIGN-R2 in architecture.
RESULTS-R1, RESULTS-R2 in testing. Confirms sub-episode structure.

Signal 3 — pivot document: `PIVOT-SINGLE-MODEL.md` in architecture. This
marks a direction change within the architecture sub-episode. Before and
after the pivot may be treated as further sub-sub-episodes if the content
warrants it.

Signal 4 — parallel tracks: research and architecture could overlap in time.
Check whether the research documents are referenced in the architecture
documents — if yes, they are sequential. If no, they are parallel.

**Result:** Four sub-episodes:
- `research/` — "Understand the landscape before committing to an approach"
- `architecture/` — "Design the orchestration approach; a pivot changed
  the model selection strategy mid-design"
- `implementation/` — "Build what was designed, in three sessions"
- `testing/` — "Verify the built system works, two rounds"

Plus the parent-level version sequence (PLAN-v1 → PLAN-FINAL) is the
planning sub-episode that preceded the others.
