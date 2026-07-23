---
name: github-lab
sk_number: SK-436
version: "1.0.0"
priority: HIGH
load_order: 0
category: code-execution
author: luba
updated: "2026-03-24"
contexts: ["claude-code", "web-session"]
description: >
  Cross-branch analysis, file retrieval from other refs, and artifact number
  extraction should use GitHub's existing API — not manual ZIP extraction and
  grep chains. This skill covers branch comparison, file access, tree listing,
  and the 4-call investigation pattern that replaces the 15-tool-call manual workflow.
triggers:
  - "compare branches"
  - "what's missing from"
  - "merge analysis"
  - "cross-branch"
  - "branch diff"
  - "read file from branch"
  - "what does heyrovsky have"
  - "compare two branches"
  - "artifact numbers in branch"
  - "CONTEXT_INSUFFICIENT"
  - "DOWNSTREAM_CONTRACT"
  - "REST_CONTRACT"
  - "SCHEMA_VERSION"
  - "convergence needs data from another repo"
  - "get schema from repo"
  - "verify contract across repos"
---

# GitHub Lab Skill v1.0

## TOOL SELECTION

### Option A — GitHub MCP (preferred, if connected)
Connect in Claude settings → one toggle.
Use tools: `github_compare_branches`, `github_get_file_contents`,
`github_list_branches`, `github_get_repository_tree`

### Option B — Direct HTTPS (always available)
```bash
TOKEN=$(jq -r '.github_pat' .freedom/config.json 2>/dev/null || echo $GITHUB_TOKEN)
BASE_URL="https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}"
```

**NEVER hardcode the token.** Read from FREEDOM config or environment only.

---

## CORE OPERATIONS

### Branch Comparison (replaces two-ZIP manual analysis)

```bash
# Option A (MCP):
github_compare_branches(base="main", head="heuristic-heyrovsky")

# Option B (HTTPS):
curl -s -H "Authorization: token ${TOKEN}" \
  "${BASE_URL}/compare/main...heuristic-heyrovsky" \
  | jq '.files[] | {filename, status, additions, deletions}'
```

Returns: files added/removed/modified with line counts. One call.

---

### Read File From Another Branch (replaces git checkout)

```bash
# Option A (MCP):
github_get_file_contents(
  path="server/src/engine-contracts/flow0-contracts.ts",
  ref="heuristic-heyrovsky"
)

# Option B (HTTPS):
curl -s -H "Authorization: token ${TOKEN}" \
  "${BASE_URL}/contents/server/src/engine-contracts/flow0-contracts.ts?ref=heuristic-heyrovsky" \
  | jq -r '.content' | base64 -d
```

---

### Full Tree of a Branch (replaces find in unzipped directory)

```bash
# Option A (MCP):
github_get_repository_tree(ref="heuristic-heyrovsky", recursive=true)

# Option B (HTTPS):
curl -s -H "Authorization: token ${TOKEN}" \
  "${BASE_URL}/git/trees/heuristic-heyrovsky?recursive=1" \
  | jq '.tree[].path' | grep "engine-contracts"
```

---

### Extract Artifact Numbers From Branch File

```bash
# Get a contract file from branch, pipe to artifact extraction
curl -s -H "Authorization: token ${TOKEN}" \
  "${BASE_URL}/contents/server/src/engine-contracts/${FILE}.ts?ref=${BRANCH}" \
  | jq -r '.content' | base64 -d \
  | grep -oP "'T\d+'" | sort -t'T' -k2 -n | tail -3

# For factories:
| grep -oP "'F\d+'" | sort -t'F' -k2 -n | tail -3
```

---

## THE 4-CALL INVESTIGATION PATTERN

Full branch merge analysis in 4 API calls. Replaces the 15-tool-call manual workflow.

```
Call 1: compare refs → files added/removed/modified (structural diff)
Call 2: get STATE.json from each branch → execution position + test counts
Call 3: get CLAUDE.md from each branch → artifact number claims
Call 4: get specific contract files → verify artifact number claims, find collisions

Total: 4 API calls. Previous approach: 15 tool calls + unzip + manual grep chains.
```

---

## COLLISION DETECTION

After getting contract files from both branches:

```bash
# Extract all T-numbers from both files
BRANCH_A_T=$(echo "${FILE_A_CONTENT}" | grep -oP "'T\d+'" | sort -t'T' -k2 -n)
BRANCH_B_T=$(echo "${FILE_B_CONTENT}" | grep -oP "'T\d+'" | sort -t'T' -k2 -n)

# Find collisions (same number, appears in both)
comm -12 <(echo "${BRANCH_A_T}" | sort) <(echo "${BRANCH_B_T}" | sort)
# Any output = collision requiring renumbering
```

---

## CONVERGENCE-TIME CONTEXT RESOLUTION

When `convergence.handler` emits a `CONTEXT_INSUFFICIENT` signal with a typed
context request, three of the five request types resolve via GitHub API. The
other two (`BUSINESS_RULE` and `HUMAN_JUDGMENT`) resolve via RAG and human
approval — see `code-execution--node-convergence-SKILL.md` (SK-435) STEP 4.

### DOWNSTREAM_CONTRACT — get schema or handler from another repo

Use when: a challenger needs a queue message handler, event consumer, or schema
file from a different repository to verify a field contract.

```bash
# MCP:
github_get_file_contents(
  path="src/consumers/user-registration-consumer.ts",
  ref="main",
  repo="xiigen-payments"
)

# HTTPS:
TARGET_REPO="your-org/xiigen-payments"
curl -s -H "Authorization: token ${TOKEN}" \
  "https://api.github.com/repos/${TARGET_REPO}/contents/src/consumers/user-registration-consumer.ts?ref=main" \
  | jq -r '.content' | base64 -d
```

After retrieval: search for specific transformations, then pass the relevant
section (not the entire file) to the convergence resume endpoint.

### REST_CONTRACT — get OpenAPI spec or API type definitions

Use when: verifying that a field format accepted by a REST endpoint matches
what this capability sends. Check for `api-spec.yaml`, `openapi.json`, or
TypeScript DTO files.

### SCHEMA_VERSION — verify which version of a schema is current

Use when: a challenger needs to know whether a field was added in schema v1 or v3.
Use commit history on the schema file to trace when fields were added.

### What NOT to resolve via GitHub

- ❌ BUSINESS_RULE → use RAG query (SK-435 STEP 4)
- ❌ HUMAN_JUDGMENT → escalate to Luba (SK-435 STEP 4)
- ❌ In-repo cross-file checks → use bash in working directory, no API needed

---

## CONFIGURATION

```json
// .freedom/config.json
{
  "github_owner": "<github-owner>",
  "github_repo": "xiigen-mvp",
  "github_pat": "${secrets.GITHUB_PAT}"
}
```

Read with: `jq -r '.github_owner' .freedom/config.json`

When called from within AF pipeline: use `ISecretsService` to resolve PAT.
When called from Claude Code bash: read from FREEDOM config file directly.

---

## WHAT NOT TO DO

```
❌ Unzip both branches manually for comparison
   → github_compare_branches does this in one call

❌ Run comm/diff on two unzipped directory trees
   → The compare API returns a structured diff with status per file

❌ Build ICodeRepositoryService fabric interface
   → GitHub MCP exists. The fabric interface wraps something that already works.
   → Correct: ADAPTATION. Wrong: NEW INFRA.

❌ Hardcode the token in a script
   → Always read from FREEDOM config or environment

❌ Use this skill for cross-system business rule checking
   → Business rules belong in the convergence node's context requests
   → This skill is for structural analysis only
```

---

## INTEGRATION

```
Invoke when:  comparing branches, finding missing files, reading contracts from non-current branch
Invoke at:    start of merge analysis session (before any manual file extraction)
Produces:     structured diff → feeds into planning--claim-verification-SKILL.md
References:   session-output--investigation-handoff-SKILL.md (record findings)
              planning--claim-verification-SKILL.md (verify before using)
```
