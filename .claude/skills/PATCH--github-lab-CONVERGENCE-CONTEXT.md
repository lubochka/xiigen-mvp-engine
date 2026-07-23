# PATCH: code-execution--github-lab-SKILL.md — Convergence-Time Context Resolution
## Applies to: code-execution--github-lab-SKILL.md (SK-436)
## Version: v1.1.0 | Date: 2026-03-26
## Source: Skills gap analysis — convergence context acquisition

---

## HOW TO APPLY

Insert the `CONVERGENCE-TIME CONTEXT RESOLUTION` section AFTER the existing
"COLLISION DETECTION" section and BEFORE the "CONFIGURATION" section.

Update the description field in the YAML front matter.
Add new triggers to the YAML front matter.

---

## ADDITION: Updated description (replace existing)

```yaml
description: >
  Cross-branch analysis, file retrieval from other refs, artifact number
  extraction, and convergence-time context resolution via GitHub API.
  This skill covers branch comparison, file access, tree listing, the
  4-call investigation pattern, AND how to resolve DOWNSTREAM_CONTRACT
  and REST_CONTRACT context requests that convergence.handler emits when
  it needs data from another repository to verify an invariant.
```

---

## ADDITION: New triggers (add to existing list)

```yaml
  - "CONTEXT_INSUFFICIENT"
  - "DOWNSTREAM_CONTRACT"
  - "REST_CONTRACT"
  - "SCHEMA_VERSION"
  - "convergence needs data from another repo"
  - "get schema from repo"
  - "verify contract across repos"
```

---

## ADDITION: CONVERGENCE-TIME CONTEXT RESOLUTION section

Insert after the COLLISION DETECTION section:

---

## CONVERGENCE-TIME CONTEXT RESOLUTION

When `convergence.handler` emits a `CONTEXT_INSUFFICIENT` signal, it includes a typed
context request. Three of the five request types resolve via GitHub. The other two
(`BUSINESS_RULE` and `HUMAN_JUDGMENT`) resolve via RAG and human approval gate —
see `code-execution--node-convergence-SKILL.md` STEP 4 for those.

### DOWNSTREAM_CONTRACT — get schema or handler from another repo

Use when: a challenger needs to see a queue message handler, an event consumer,
or a schema file from a different repository to verify a field contract.

```bash
# Option A (MCP):
github_get_file_contents(
  path="src/consumers/user-registration-consumer.ts",
  ref="main",
  repo="xiigen-payments"  # specify if different repo
)

# Option B (HTTPS):
TARGET_REPO="your-org/xiigen-payments"
curl -s -H "Authorization: token ${TOKEN}" \
  "https://api.github.com/repos/${TARGET_REPO}/contents/src/consumers/user-registration-consumer.ts?ref=main" \
  | jq -r '.content' | base64 -d
```

**After retrieval:** Search for the specific transformation:
```bash
# Check if the consumer transforms userId before forwarding
echo "${FILE_CONTENT}" | grep -n "userId\|replace\|strip\|transform" | head -20
```

If transformation found → provide as context to convergence.handler resume call.

---

### REST_CONTRACT — get OpenAPI spec or API type definitions

Use when: a challenger needs to verify that a field format accepted by a REST endpoint
matches what this capability sends.

```bash
# Option A (MCP):
github_get_file_contents(
  path="api-spec.yaml",  # or openapi.json, swagger.json
  ref="main",
  repo="xiigen-billing"
)

# Option B (HTTPS):
curl -s -H "Authorization: token ${TOKEN}" \
  "https://api.github.com/repos/${TARGET_REPO}/contents/api-spec.yaml?ref=main" \
  | jq -r '.content' | base64 -d
```

If no OpenAPI spec exists, check TypeScript DTO types:
```bash
# Search for DTO or request types
curl -s -H "Authorization: token ${TOKEN}" \
  "${BASE_URL}/git/trees/main?recursive=1" \
  | jq '.tree[].path' | grep -i "dto\|request\|contract" | head -10
```

---

### SCHEMA_VERSION — verify which version of a schema is current

Use when: a challenger needs to know whether a field was added in schema v1 or v3,
to verify backward compatibility.

```bash
# Get commit history for a specific schema file (shows when fields were added)
# Option A (MCP):
github_list_commits(
  path="contracts/events/user-registration-initiated.schema.json",
  ref="main"
)

# Option B (HTTPS):
curl -s -H "Authorization: token ${TOKEN}" \
  "${BASE_URL}/commits?path=contracts/events/user-registration-initiated.schema.json&sha=main" \
  | jq '.[] | {sha: .sha[0:7], date: .commit.author.date, message: .commit.message}'
```

To get the schema at a specific commit:
```bash
curl -s -H "Authorization: token ${TOKEN}" \
  "${BASE_URL}/contents/contracts/events/user-registration-initiated.schema.json?ref=${COMMIT_SHA}" \
  | jq -r '.content' | base64 -d
```

---

### Providing resolved context to convergence.handler

After retrieving the data, pass it to the convergence resume endpoint:

```bash
curl -X POST localhost:3000/api/engine/convergence/resume \
  -H "Content-Type: application/json" \
  -H "X-Tenant-Id: xiigen-community" \
  -d '{
    "sessionId": "'${SESSION_ID}'",
    "contextProvided": {
      "requestType": "DOWNSTREAM_CONTRACT",
      "target": "xiigen-payments/src/consumers/user-registration-consumer.ts",
      "content": "'${ESCAPED_FILE_CONTENT}'",
      "retrievedAt": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'"
    }
  }'
```

---

### What NOT to use this for

```
❌ BUSINESS_RULE resolution → use RAG query (SK-435 STEP 4)
❌ HUMAN_JUDGMENT resolution → escalate to Luba (SK-435 STEP 4)
❌ In-repo cross-file checks → use bash grep in the current working directory
❌ Verifying this flow's own contracts → direct file read, no GitHub API needed
```

---

## ADDITION: Update WHAT NOT TO DO section

Add to existing "WHAT NOT TO DO":

```
❌ Using this skill for in-repo cross-file verification
   → If the file is in the current working directory, use bash directly
   → GitHub API is for cross-repo and cross-branch access only

❌ Passing raw file content to convergence without extracting the relevant section
   → A 500-line consumer file should be filtered to the relevant handler
   → Pass only the lines that answer the challenger's question
```

---

## ADDITION: Update INTEGRATION section

Add to existing INTEGRATION:

```
Invoke when:  convergence.handler emits DOWNSTREAM_CONTRACT, REST_CONTRACT,
              or SCHEMA_VERSION context request
Produces:     file content for convergence.handler resume call
References:   code-execution--node-convergence-SKILL.md (SK-435) STEP 4 — full
              resolution protocol for all 5 context request types
```
