<!--
  Source: business flows.zip / 27-tasks execution communication and dependencies.md
  Canonical since: 2026-04-22
  Canonical flow: FLOW-27 human-interaction-gate
  Related deep-research: docs/business-flows/_deep-research/human-interaction-gate/ (if present)
  Related legacy engine artifacts: docs/business-flows/_legacy-engine-artifacts/human-interaction-gate/ (if present)
-->

We would like to enable user to leave the work and come back to the real and ready system
Which means we should validate all the flows and all the sub tasks have been completed
Even if some of them require user chat - all other work won't be stopped because of that
We need someway to show the user the progress in his system planning and building
And make notifications to popup questions regarding the tasks that needs his interference - with exact trace what were the incoming variables, what was the flow and what is the decision or additional information is required from the user.
Important we are building an engine - which means no matter what type of flow we are doing or implementing the result is the same - a way to communicate to the user and make the progress as far as we can - which means additionaly we need to manage the nodes dependencies - what node results and decisions will be required before we can start this one that we wan to run.

To make “leave now / come back later” **work for any flow the engine runs**, you need a *generic Human-In-The-Loop + Progress + Dependency* capability that sits **under** all templates (not a flow-specific feature).

Below is an engine-level blueprint that stays **factory-first + fabric-first** and works for “planning”, “building”, “migration”, “marketplace”, etc. (It reuses patterns you already have: **HumanApprovalGate**, **multi-session state**, **traceId debug surface**, and **allSettled / non-blocking branches**). 

---

## 0) What we already have (reuse)

### A. Human gates + multi-session durability exist as a concept

Your catalog already defines **HumanApprovalGate** as a node type that *suspends a flow and resumes on human submit*, and explicitly calls out **multi-session tasks** and **durable state indices**. 

### B. There is a standard “trace/debug surface”

You already require that “every phase is queryable via traceId”, including phase inputs/outputs and judge verdicts. 

### C. “Don’t block other branches” is already a proven runtime pattern

Example: FLOW-05 uses an **allSettled** join so branches succeed/fail independently (social branch can be skipped; gamification+learning still run). 

### D. Notifications are a fabric concern in your architecture

You already have **INotificationProvider** in the Management + Intelligence fabric layer, so we route user questions through that, not direct providers. 

---

## 1) New requirement (deep research summary)

You’re asking for 4 guarantees:

1. **Durable “project/run state”** so user can leave and come back.
2. **Progress UI** that reflects what’s done, what’s running, what’s blocked, and what’s optional.
3. **Human-interference tasks** that:

   * pop up via notification channels,
   * include *exact trace, flow context, inputs/variables*,
   * and unblock only what depends on them.
4. **Dependency-aware scheduler** so the engine keeps executing anything that’s ready, even when some nodes are waiting for user input.

This is essentially: **HumanApprovalGate generalized + UserTask registry + dependency-aware orchestration + progress aggregation**.

---

## 2) Engine Primitive: Human Interaction Gate (HIG)

### 2.1 A single universal node type

Add a node type (conceptually): **HumanInteractionGate** (extends the existing “HumanApprovalGate” concept). It has:

* **Status**: `waiting_for_user | answered | expired | skipped | cancelled`
* **Blocking policy** (per node):

  * `blocking`: downstream nodes can’t start until answered
  * `non_blocking`: downstream can proceed with defaults (but record “assumptions”)
  * `optional`: treated as “nice to have”; only impacts specific downstream branches

### 2.2 Human task record (stored via DATABASE FABRIC)

Store a “UserTask” document (in Elasticsearch via DB fabric, because it’s durable and queryable) with:

* `taskId`, `tenantId`
* `runId`, `traceId`, `flowId`, `flowVersion`
* `nodeId`, `nodeType` = `HumanInteractionGate`
* `questionType` (enum) + `expectedAnswerSchema` (JSON schema-like)
* `contextSnapshot`:

  * `incomingVariables` (the exact mapped inputs into that node)
  * `upstreamResultsRefs[]` (IDs/hashes, not huge payloads)
  * `decisionNeeded` (what the engine can’t decide)
  * `suggestedOptions[]` (if any)
* `createdAt`, `dueAt`, `priority`
* `status`, `answeredAt`, `answerPayload`
* `resumeTargets[]` (which nodeIds become unblocked by this answer)

This aligns with the “no typed models” DNA style (store as dictionaries) and supports your “show me exactly what variables came in” requirement.

---

## 3) Dependency execution model: keep working while some nodes wait

### 3.1 Readiness rule (generic DAG scheduler)

A node becomes **READY** when:

* all `dependsOn.required[]` are in `succeeded` (or `degraded_ok` if policy allows),
* and any `dependsOn.human_required[]` are `answered`.

A node is **BLOCKED** when:

* a required dependency is `waiting_for_user` or `running` or `failed` (no degrade path).

A node is **SKIPPABLE** when:

* its entry condition fails (like the consent-gate branch in FLOW-05) and the template defines “skip without error” semantics. 

### 3.2 Join semantics that make this practical

Keep three join modes in the runtime:

* `all`: fail fast if any required branch fails
* `allSettled`: gather what you have, proceed with partials (already used) 
* `required+optional`: explicit lists where optional branches can be absent/late

### 3.3 What “work won’t be stopped” means in practice

If a HumanInteractionGate blocks **only one branch**, other branches still run (same philosophy as the FLOW-05 allSettled join). 
Only nodes that *transitively depend* on the unanswered human gate remain blocked.

---

## 4) Progress model: what the user sees

### 4.1 Status buckets (simple + truthful)

For a given `runId`, compute:

* **Completed**: steps succeeded (+ “degraded success”)
* **Running**: currently executing
* **Waiting on you**: HumanInteractionGate tasks open
* **Blocked**: waiting on upstream technical tasks (not the user)
* **Failed**: terminal failures (with remediation links)
* **Skipped**: conditional branches intentionally not executed

### 4.2 Progress % (optional but useful)

Compute progress as a weighted sum:

* each node has `progressWeight` (defaults: 1, but “big steps” can be heavier)
* `succeeded/degraded` = 1.0 × weight
* `running` = 0.5 × weight (or 0.2–0.8 depending on step telemetry)
* `waiting_for_user` = 0.0 × weight (but shown as “action required”)

### 4.3 “Explainability” via trace links

Every UI card/row should link to your existing debug surface:

* `GET /api/debug/{traceId}` for full state
* `GET /api/debug/{traceId}/phase/{phaseId}` for the exact inputs/outputs
* `GET /api/debug/{traceId}/judge/{phaseId}` for the decision criteria/verdict 

This is exactly how you satisfy: “show me the incoming variables, what flow ran, and what decision is required.”

---

## 5) Notifications: pop-up questions with exact context

### 5.1 Event-driven notifications (never blocking runtime)

When a HumanInteractionGate enters `waiting_for_user`:

1. Emit `UserTaskCreated` (QUEUE FABRIC)
2. A notification orchestrator resolves **INotificationProvider** (factory-first) and sends:

   * in-app popup + deep link to the task,
   * optional email/Slack/Teams, etc. 

### 5.2 Notification payload (must include)

* `taskId`, `runId`, `traceId`
* `flowId`, `nodeId`, `nodeName`
* `decisionNeeded` (1–3 lines)
* `whyBlocked` (dependency explanation)
* `viewContextUrl` (trace link)
* `answerUrl` (task response endpoint)
* `dueAt` + urgency

### 5.3 Anti-spam + idempotency

* one active notification per `(taskId, channel)`
* updates (“still waiting”) are *state changes*, not new messages
* resend rules only if dueAt is near, or user reopened the project

---

## 6) “Ready system” validation: when can we declare DONE?

Define a universal **Completion Gate** rule:

A system/run is `READY` only if:

* all **required terminal nodes** have succeeded, and
* there are **0 open required HumanInteractionGate tasks**, and
* JudgeService has “Approved” verdicts for all required phase gates (same gating idea used across templates). 

If not ready:

* status becomes one of:

  * `PendingUserInput` (action required)
  * `Running`
  * `BlockedOnDependency`
  * `FailedNeedsRepair`

---

## 7) No-code orchestration view (how it runs end-to-end)

1. **Start run** (user triggers “build my system”)
2. Engine executes all nodes with satisfied dependencies
3. When it hits a HumanInteractionGate:

   * creates a UserTask doc (durable)
   * emits UserTaskCreated event
   * continues executing any other READY nodes (parallelism)
4. User leaves
5. User comes back:

   * dashboard shows progress + “Waiting on you”
   * user opens task → sees trace-linked context and inputs
6. User answers:

   * engine records answer + emits UserTaskAnswered
   * scheduler re-evaluates blocked nodes → unblocks and continues
7. Completion gate passes → system marked READY

This is exactly the “multi-session + human gates + durable state” pattern your catalog already expects for long-running flows. 

---

## 8) Save point / resume commands (engine dev workflow)

**SAVE POINT:** `HIG:P0`
**Delivered:** HumanInteractionGate primitive spec + dependency semantics + progress + notification payload schema.

**Resume commands**

* “Continue HIG from P1 — indices & schemas”
* “Continue HIG from P2 — runtime scheduling rules”
* “Continue HIG from P3 — notification routing + templates”
* “Continue HIG from P4 — UI progress contracts + trace links”

---

If you want the next step fully formalized in your engine style, I can write it as an **engine extension package** (new node type contract, event types, ES index schemas, BFA checks, stress tests: “user doesn’t respond for 7 days”, “duplicate prompts”, “answer arrives after branch timed out”, “two devices answer simultaneously”) using the same “iron rules / quality gates” format you already apply to flows.


Additionally important to visually show on each node what is his status: done, waiting, started, in progress/ Waiting to user decision - press on which will continue the communication with the user
in progress - how much in progress - pressing on the node will show the sub flow execution and so on

Yes — this should be **an engine-level “FlowRun Visual State” layer** that overlays *any* FlowDefinition/NodeDefinition with real-time runtime state, **including HumanApprovalGate + SubFlow drill-down** (both are already first-class node types in the platform). 

Below is the minimal design that gives you:

* **status on every node** (done / started / running / blocked / waiting on user / skipped / failed)
* **% progress** when possible
* **click node ⇒ open inspector** (sub-steps + inputs/outputs + judge gates + child subflows)
* **click “waiting for user” ⇒ open the exact question modal** and continue the conversation

---

## 1) Runtime status model (what the UI renders)

### Node statuses (engine-wide enum)

* `PENDING` (known but not ready)
* `READY` (dependencies satisfied, queued to start)
* `RUNNING` (in progress)
* `WAITING_FOR_USER` (HumanApprovalGate opened)
* `BLOCKED` (waiting on dependencies / resources)
* `SUCCEEDED`
* `FAILED`
* `SKIPPED` (conditional branch bypassed)
* `CANCELLED`

**Dependencies must be explainable** (blockedBy[]), and you already model dependencies in flow JSON with `waitFor` lists. 

### Node progress (%)

You get reliable progress from **sub-steps**. Many nodes already have step lists (example: the learning branch has `analyze-performance → validate → apply → publish`). 

Progress rule (generic):

* If node has `N` subSteps:

  * `progress = (doneCount + 0.5*runningCount) / N`
  * show “Step k/N” + a bar
* If node is an external long job (CI/CD/IaC), progress comes from provider telemetry (poll or push)
* If unknown: show spinner + elapsed time, but still mark RUNNING

---

## 2) Click behavior (the “visuality” contract)

### A) Click any node ⇒ Node Inspector (right panel / modal)

The inspector should have these tabs:

1. **Summary**

   * status + progress + timings
   * “blocked because …” (list dependencies + their status)
2. **Sub-steps**

   * list each sub-step: status, startedAt, endedAt, retryCount
3. **Inputs/Outputs**

   * pull from your **NodeDebugger** capture (“every input/output/verdict captured”). 
4. **Judge / Gates**

   * show gate verdicts + criteria (your debug endpoints already support this) 
5. **Child execution (SubFlow)**

   * if nodeType = `SubFlow`, show nested run(s) with their traceIds and mini-graph

This matches your “pressing on the node will show the sub flow execution and so on”.

### B) Click `WAITING_FOR_USER` node ⇒ “Answer required” modal

If nodeType is **HumanApprovalGate**, clicking it opens the associated UserTask:

* question text
* required decision fields (schema-driven)
* **traceId link + “incoming variables”** snapshot
* submit answer → engine resumes

This is exactly the behavior already defined conceptually: **HumanApprovalGate suspends and resumes on human submit**. 

---

## 3) Subflows drill-down (SubFlow node UX)

You already treat SubFlow as a first-class node type and use it in multi-session flows like migration (“per-system analysis executes code-to-skills as nested child flow”). 

So the UI rule is:

* SubFlow node shows:

  * overall child status + child progress
  * list of childRunIds/traceIds
* Click opens:

  * **the same graph UI**, but scoped to the child run
* Breadcrumb: `ParentRun → Node → ChildRun`

This gives “zoom-in/zoom-out” execution visibility with *no flow-specific UI logic*.

---

## 4) How we keep the UI always accurate (engine events + materialized view)

### Core idea

Store **immutable runtime events**, and build a **materialized “NodeSnapshot”** per run for fast UI.

* **Write path** (orchestrator):

  * emits NodeEvent: `NodeStarted`, `SubStepCompleted`, `NodeProgress`, `NodeWaitingForUser`, `NodeCompleted`, etc.
* **Read path** (query service):

  * compacts events into:

    * RunSnapshot (overall)
    * NodeSnapshots (per node)
    * Edge readiness / blockedBy resolution

This is aligned with your “everything queryable by traceId” surface. 

---

## 5) APIs the UI needs (minimal + universal)

You already have debug endpoints for traceId. 
Add **two** UI-friendly endpoints (thin wrappers over your stored snapshots + debug links):

```http
GET /api/runs/{runId}/graph
  → nodes[] (id, type, status, progress, blockedBy[], taskId?, childRunIds?)
  → edges[] (from, to)
  → summary (done/running/waitingUser/blocked/failed)

GET /api/runs/{runId}/nodes/{nodeId}
  → snapshot + subSteps[] + timings + debugLinks { trace, phase, judge }
```

And for human tasks:

```http
GET  /api/user-tasks/{taskId}
POST /api/user-tasks/{taskId}/answer
```

---

## 6) Progress without blocking (important behavior you asked for)

Your runtime must continue executing other branches even if one node waits for the user. You already use `allSettled` joins for “branches succeed/fail independently”. 

UI should reflect that:

* one branch can be `WAITING_FOR_USER`
* other branches can continue to `RUNNING/SUCCEEDED`
* only nodes that depend on the waiting gate become `BLOCKED`

---

## 7) Why this fits “factory-first + fabrics + work-items”

You already define **Flow → Work Item mapping** (FlowDefinition = epic/story, NodeDefinition = task, implementationStep = subtask). 
So the exact same runtime snapshots can also be synced into PM tools (F64) and notifications (F68) in the **Management + Intelligence fabric**. 

---

## SAVE STATE

**SAVE POINT:** `VISUAL_RUNTIME_STATE:P1`
**Delivered:** node status enum + progress rules + click semantics + SubFlow drilldown + minimal API contract + event→snapshot approach.

If you say “continue VISUAL_RUNTIME_STATE:P2”, I’ll formalize this into an **engine contract spec** (schemas for `RunSnapshot`, `NodeSnapshot`, `NodeEvent`, `UserTask`), plus the **dependency/blockedBy algorithm** and the **UI rendering rules** (what exactly appears on the node chip for each status).


next

please take into account this is a multitenant system - so the tasks may be defined for a group of users and not a specific one

Got it — we’ll make **Human / clarification tasks first-class, multi-tenant, group-assignable work items**, so *any* flow can pause on a node **without stopping other runnable nodes**, while the UI shows **per-node status + % + drilldown**.

Below is the “NEXT” package: **multi-tenant + group tasks + claiming + quorum**, wired into your existing primitives (**HumanApprovalGate**, **SubFlow**, **NodeDebugger**, **waitFor/dependsOn**, **Management fabric notifications/work-items**).   

---

## 1) Multi-tenant rule (non-negotiable)

Every stored artifact for progress/tasks/debug must be scoped by `tenantId` (DNA-5). 
So: `RunSnapshot`, `NodeSnapshot`, `NodeEvents`, `UserTasks` all include `tenantId` and every query filters on it.

---

## 2) Group-assignable “UserTask” model (works for any flow)

### 2.1 Assignment spec (not “userId only”)

Add to `UserTask`:

* `assignee`: who is allowed/required to answer

  * `type`: `user | group | role | anyOf | allOf | quorum`
  * `targets`: array of ids (userIds / groupIds / roleKeys)
  * `quorum`: `{ needed: number, outOf?: number }` (only when type=quorum)
* `visibility`: who can *view* vs *answer*

  * `viewers`: `{ type, targets }` (often broader than assignee)
* `claimPolicy`:

  * `claimMode`: `none | single_claim | multi_claim`
  * `claimTtlSec`
  * `allowReassign`

This is critical because your engine already treats “FlowDefinition is also a unit of work” (it maps into work items)  and you already have Management fabric providers for project management + notifications. 

### 2.2 Claiming (prevents 5 people answering the same gate)

For `single_claim`:

* any eligible member can **claim** the task
* after claim, only the claimer (or admins) can submit
* if TTL expires, claim auto-releases

**Why claim exists:** group tasks are common (“architects approve plan”, “security approves risk”). Without claim, you get conflicting answers and hard-to-debug resumes.

### 2.3 Multi-approver (allOf / quorum)

Support these answer policies:

* `anyOf`: first valid answer completes task
* `allOf`: every target must approve/answer (collect multiple answers)
* `quorum`: collect answers until `needed` reached

This keeps “engine semantics generic” while supporting enterprise workflows.

---

## 3) How node status + dependencies behave (still generic)

### 3.1 Node dependency is already represented

Your flow JSON uses `waitFor` at node level (and `dependsOn` at step level).  

So the scheduler + UI blockedBy computation is deterministic:

* Node is `READY` if all `waitFor` nodes are `SUCCEEDED` (or `SKIPPED` if allowed by join policy)
* Node is `BLOCKED` if any `waitFor` node is not terminal
* Node is `WAITING_FOR_USER` if its type is `HumanApprovalGate` and the generated `UserTask.status=open`

### 3.2 “Waiting for user decision” becomes “Waiting for assignee”

Node status stays `WAITING_FOR_USER`, but the node chip subtitle comes from task assignee:

* “Waiting: **Architects**”
* “Waiting: **Role=SecurityOfficer**”
* “Waiting: **2/3 approvals**” (quorum)
* If claimed: “Claimed by **Dana** (expires in 12m)”

---

## 4) Visual drilldown: node → subflow → substeps (with %)

You already capture “every input/output/verdict” via NodeDebugger and expose trace-based debug for all task types.  

**Click node ⇒ Inspector shows:**

* Status + progress
* `blockedBy[]` (derived from waitFor)
* Sub-steps (from runtime step events; your steps already have IDs and dependencies) 
* Inputs/Outputs/Verdicts (from NodeDebugger)
* If nodeType=`SubFlow`: list child runs + open nested graph (SubFlow is a core node type) 

**Progress % rule:**

* if node has `steps[]`: `done/N`, `running step`, etc.
* if node is `SubFlow`: progress = childRun summary rollup
* if external provider: progress from provider telemetry; otherwise show “RUNNING + elapsed”

---

## 5) Notification fan-out for group tasks (multi-tenant safe)

When a `HumanApprovalGate` opens a task, emit `UserTaskCreated` event and route it through `INotificationProvider` (F68). 
Delivery rules:

* resolve recipients from group/role membership **within tenant**
* dedupe per channel (`taskId + channel + recipient`)
* include deep links: `openTask(taskId)` + `openTrace(traceId)`

Optional but powerful: also create a Jira/AzureDevOps/Monday work item via `IProjectManagementProvider` (F64) so enterprise teams can handle approvals in their native tooling.  

---

## 6) Durable storage (multi-session + multi-tenant)

You already introduced durable multi-session indices like `migration-tasks`. 
Add two more durable collections (same DB fabric pattern):

* `flow-run-snapshots` (one doc per runId, updated)
* `flow-node-snapshots` (one doc per nodeId per runId, updated)
* `user-tasks` (one doc per gate; append answers/claims as events or embedded history)

All are tenant-scoped (DNA-5). 

---

## 7) SAVE STATE

**SAVE POINT:** `VISUAL_RUNTIME_STATE:P2-MULTITENANT_GROUP_TASKS`
**Added:** group/role/quorum assignment, claim semantics, multi-tenant scoping, blockedBy derived from `waitFor/dependsOn`, notification + PM-provider fanout.

If you say **“next”** again, I’ll deliver `P3`: the concrete **document schemas** (RunSnapshot/NodeSnapshot/UserTask/TaskClaim/TaskAnswer events) + the exact **status transition table** (what event moves a node from READY→RUNNING→WAITING_FOR_USER→… including quorum completion) and the **UI chip rules** per status.
