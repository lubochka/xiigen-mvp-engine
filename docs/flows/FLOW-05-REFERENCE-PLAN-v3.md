# FLOW-05: LESSON COMPLETION & GAMIFICATION — REFERENCE PLAN v3
## Prerequisites: FLOW-02 ACTIVE + FLOW-35 + FLOW-36 + FLOW-00 + FLOW-00.1 + FLOW-00.2 + FLOW-00.3 complete
## Date: 2026-03-23
## flow-completeness-checker v1.5: 33/33 ✅

---

## SCOPE DISCIPLINE (P13)

```
stackTargets:  ['node-nestjs']
clientTargets: ['react-web']

Content ONLY for declared targets. Non-priority stacks in APPENDIX A.
```

## IMPLEMENTATION MODE (P12)

```
implementationMode: "af-pipeline"
implementationModeReason: "User-facing flow. AF pipeline operational after FLOW-35."

WHO DOES WHAT:
  Claude Code writes:  EngineContracts, AF prompts (genesis/review/compliance/judge),
                       event schemas, topology, test matrix, Grafana dashboard, runbook
  XIIGen generates:    Service code (.service.ts files) via AF-1
  AF-6/7/8/9 judges:  Generated code quality, DNA compliance, security, scoring

Claude Code does NOT create .service.ts files for T44/T45/T46.
Genesis prompts (Section 1–4) are AF-1 INPUT, not Claude Code instructions.
```

---

## WHAT CHANGED FROM v2 → v3

| What v2 had | What v3 changes |
|---|---|
| STATE.json Family/CF: soft "verify from parallel_execution table" | Hardened to ⛔ REQUIRED strings + pre_allocation_gate field + Phase A guard script |
| Phase B gate captures 3 metrics (passed, score, promotionLevel) | Phase B gate captures all 6 P5 metrics: quality, cost, latencyMs, retryCount, dpoTriples, modelUsed |
| "See v1 for full content" — Phase A not self-contained | prerequisite_documents note added to KEY FACTS; LessonCompletionFailed (10th schema, new in v2) flagged as written inline in Session A |
| T46 stackCoupling neutralConcepts: IR-5 (DNA-5) missing | IR-5 added to T46 neutralConcepts: 'DNA-5 tenant isolation (IR-5)' |
| Phase E test delta +35 unexplained vs 3-task-type pattern | Clarified: +25 server tests intentional — gamification services have fewer branches than convergence/fan-in services in FLOW-02 |
| KEY FACTS test baseline: fixed estimate | Replaced with runtime-read instruction (npx jest) |

---

## WHAT CHANGED FROM v1 → v2

| What v1 had | What v2 changes |
|-------------|-----------------|
| No implementationMode | implementationMode: "af-pipeline" (P12 ✅) |
| No stackTargets / clientTargets | stackTargets: ['node-nestjs'], clientTargets: ['react-web'] (P13 ✅) |
| Phases B–D: Claude Code writes per-task-type service files | Phases follow INJECT → GENERATE → JUDGE → INTEGRATE → PROMOTE |
| Genesis prompts in "Mode C" single-text format | HybridGenesisPrompt 4-section format (V8 ✅) |
| No stackCoupling on T44–T46 | Full stackCoupling annotation per task type (V29 ✅) |
| No INCOMPATIBLE flags | T45 php-wordpress INCOMPATIBLE (wp_cron unreliable for streak window) (V30 ✅) |
| No stateNotes on topology nodes | stateNotes on all 3 nodes: react-web:client only (V31 ✅) |
| No service file names declared | lesson-completion-detector.service.ts etc. (SK-430 Rule 1) |
| No lint:naming in gates | npm run lint:naming added |
| No Jira comment template | SK-430 Rule 5 template added |
| Missing LessonCompletionFailed event schema | Added as compensation event (10 schemas total) |
| Prerequisites: FLOW-00 only | Added FLOW-00.1, FLOW-00.2, FLOW-00.3 |
| No flow_name in STATE.json | flow_name: "Lesson Completion & Gamification" |
| SK-418 v1.1: 23/23 | flow-completeness-checker v1.5: 33/33 |

V1–V6 pass content (event contracts, retry, observability, test matrix) unchanged except
LessonCompletionFailed addition. Artifact numbers unchanged.

---

## WHAT THIS FLOW BUILDS

After FLOW-05, tenants can:

1. Track learner progress through lessons and learning paths
2. Detect and certify lesson completion with evidence
3. Award points, badges, and streaks on completion milestones
4. Broadcast achievement events to the social feed and leaderboard

```
[T44] LessonCompletionDetector
  ↓ LessonCompleted (triggers gamification pipeline)
[T45] GamificationRewardEngine
  ↓ PointsAwarded / BadgeEarned / StreakUpdated
[T46] AchievementBroadcaster
  ↓ AchievementBroadcast (feed + leaderboard update)
```

**Gate dependency:** FLOW-05 is Wave 2 — requires FLOW-02 ACTIVE (content
context established, learner profile enriched by T51 MatchingConvergenceGate).
The personalized feed from FLOW-02 is where achievement broadcasts land.

**Downstream:** FLOW-09 (Transactional Event Participation) may reference
achievement data for event gating. FLOW-10 (Social Platform) consumes
AchievementBroadcast for social graph updates.

---

## WAVE ASSIGNMENT (unchanged)

```
FLOW-05: Wave 2 — parallel
  parallel_wave: 2
  wave: 2
  prerequisite: FLOW-02 ACTIVE
  downstream: FLOW-10 (Social Platform — Wave 3), FLOW-09 (Wave 3)
```

---

## STATE.json (v3)

```json
{
  "flow_id": "FLOW-05",
  "flow_name": "Lesson Completion & Gamification",
  "parallel_wave": 2,
  "wave": 2,
  "current_phase": "session-0",
  "completed_phases": [],
  "test_baseline": null,
  "wave_baseline_entry": "__SET_BY_PRE_ALLOCATION_SESSION__",
  "client_test_delta": 12,
  "stackTargets": ["node-nestjs"],
  "clientTargets": ["react-web"],
  "implementationMode": "af-pipeline",
  "implementationModeReason": "User-facing flow. AF pipeline operational after FLOW-35.",
  "pre_allocated_ranges": {
    "T": "T44–T46",
    "F": "F166–F173",
    "Family": "⛔ REQUIRED — confirm from parallel_execution table before Phase A",
    "CF": "⛔ REQUIRED — confirm from parallel_execution table before Phase A"
  },
  "pre_allocation_gate": "SESSION-FLOW-05-A.md MUST NOT execute until Family and CF values above are confirmed. Replace ⛔ strings with actual numbers from the parallel-wave pre-allocation session. NOTE: T44–T46 and F166–F173 are correct pre-allocated numbers — do not renumber."
}
```

**Note on artifact numbering:** T44–T46 and F166–F173 appear lower than
FLOW-01 (T47–T49) and FLOW-02 (T50–T52). This is correct — FLOW-05 ranges
were pre-allocated before the execution order was finalized. They are immutable.
Do NOT renumber. The parallel_execution table is the single source of truth.

---

## ARTIFACT NUMBERS (unchanged)

```
Task types:  T44 LessonCompletionDetector
             T45 GamificationRewardEngine
             T46 AchievementBroadcaster
Factories:   F166–F173 (8 factories — 7 INJECTABLE + 1 PLATFORM-ONLY)
BFA rules:   verify CF range from parallel_execution table (do not re-seed if present)
Family:      verify from parallel_execution table
New archetypes: COMPLETION (T44), GAMIFICATION (T45), BROADCAST-SOCIAL (T46)
  Note: T46 uses BROADCAST-SOCIAL (distinct from BROADCAST in FLOW-02 T52 which
  is onboarding broadcast). Different archetype to allow separate arbiter pool.
New arbiters: completion::evidence-check, completion::idempotent-completion,
              gamification::reward-fairness, gamification::streak-continuity,
              social-broadcast::feed-payload, social-broadcast::leaderboard-sync
```

---

## SERVICE FILE NAMES (naming-conventions-enforcer Rule 1)

These files are GENERATED BY AF-1, not written by Claude Code.
Names declared here so AF-1 output is validated against them.

Pattern: `{verb}-{domain-noun}.service.ts`
Directory: `engine/flows/lesson-completion-gamification/`

| Task Type | ID | Service File | Class Name |
|-----------|----|--------------|-----------| 
| LessonCompletionDetector | T44 | `lesson-completion-detector.service.ts` | `LessonCompletionDetector` |
| GamificationRewardEngine | T45 | `gamification-reward-engine.service.ts` | `GamificationRewardEngine` |
| AchievementBroadcaster | T46 | `achievement-broadcaster.service.ts` | `AchievementBroadcaster` |

---

## FACTORY INTERFACES (F166–F173)

```
F166  ILessonService              INJECTABLE — lesson content, progress, status
F167  ILearnerProgressService     INJECTABLE — per-learner tracking, milestones
F168  IGamificationService        INJECTABLE — points, badges, rules engine
F169  IStreakService               INJECTABLE — streak tracking, break detection
F170  ILeaderboardService         INJECTABLE — rankings, tenant-scoped boards
F171  IAchievementFeedService     INJECTABLE — social feed write for achievements
F172  ILearningPathService        INJECTABLE — path enrollment, completion gates
F173  IAuditTrailService          PLATFORM-ONLY — immutable audit (reuse from FLOW-01)
```

---

## PASSES 1–6 (unchanged from v1 except LessonCompletionFailed addition)

**10 schema files in `contracts/events/FLOW-05/`** (was 9 in v1 — added LessonCompletionFailed)

Server events (6), Compensation events (3 — was 2, added LessonCompletionFailed),
Client events (1). All event contracts, retry/compensation, observability,
E2E test matrix (11 scenarios) identical to v1. See v1 for full content.

**Added in v2:**
```
LessonCompletionFailed.schema.json
  source: "server" | trigger: T44 on evidence validation failure or max retries
  data: { lessonId, tenantId, learnerId, failedAt: ISO, reason: string }
  NOTE: rollback event for LessonCompletionSubmitted optimistic action.
  Referenced in Pass 3 optimistic contract but was missing from Pass 1 in v1.
```

---

## PASS 3 — CLIENT STATE MAP (v2 — react-web only per P13)

### Node: lesson-in-progress (T44 awaiting completion)

```json
{
  "nodeId": "lesson-in-progress",
  "serverTask": "T44",
  "clientState": {
    "screen": "LessonPlayer",
    "humanTimescale": "minutes to hours",
    "slaMs": null,
    "availableActions": ["LessonCompletionSubmitted"],
    "optimisticActions": {
      "LessonCompletionSubmitted": {
        "optimisticState": { "button": "disabled", "label": "Submitting...",
                            "progressBar": "indeterminate" },
        "confirmationEvent": "LessonCompleted",
        "rollbackEvent": "LessonCompletionFailed",
        "rollbackState": { "button": "enabled", "label": "Submit",
                          "error": "Submission failed. Please try again." }
      }
    },
    "appReopenBehavior": "GET /flow/FLOW-05/state?lessonId=... → show in-progress, re-enable Submit"
  },
  "stackCoupling": {
    "react-web:client": {
      "tier": "IMPL_VARIES",
      "stackCategory": "client-spa",
      "dimensions": ["CLIENT_STATE_MODEL"],
      "neutralConcepts": [
        "Submit button: optimistic disable on tap, rollback on LessonCompletionFailed",
        "progress bar: indeterminate while server validates evidence",
        "app reopen: restore in-progress state from FlowStateSnapshot"
      ],
      "implementationNotes": "useState<'idle'|'submitting'|'completed'|'failed'> for button state. On tap: set 'submitting', show indeterminate progress bar. On LessonCompleted: navigate to reward-processing. On LessonCompletionFailed: set 'failed', show error, re-enable. On mount: fetch FlowStateSnapshot to restore state.",
      "stateNotes": {
        "stateHolderType": "useState",
        "stateHolderTypeReason": "Submit button state is local to LessonPlayer screen. No cross-screen propagation needed. Server confirms completion.",
        "stateScope": "feature-scoped",
        "stateScopeReason": "LessonPlayer unmounts on navigation to reward screen.",
        "propagationRisk": "LOW",
        "propagationRiskReason": "Only LessonPlayer reads submit button state.",
        "routeGuardRequired": false,
        "exitGuardRequired": false
      }
    }
  }
}
```

### Node: reward-processing (T45 running)

```json
{
  "nodeId": "reward-processing",
  "serverTask": "T45",
  "clientState": {
    "screen": "LessonComplete",
    "humanTimescale": "< 2 seconds",
    "slaMs": 2000,
    "availableActions": [],
    "appReopenBehavior": "GET /flow/FLOW-05/state → if reward-processing > 5s → show partial completion, retry rewards async"
  },
  "stackCoupling": {
    "react-web:client": {
      "tier": "IMPL_VARIES",
      "stackCategory": "client-spa",
      "dimensions": ["CLIENT_STATE_MODEL"],
      "neutralConcepts": [
        "show 'Calculating rewards...' spinner while T45 processes",
        "< 2s typical — no user action required",
        "app reopen: derive state from FlowStateSnapshot"
      ],
      "implementationNotes": "useState<'processing'|'ready'> on LessonComplete screen. On mount: if FlowStateSnapshot shows rewards settled, skip to celebration. Otherwise show spinner. On PointsAwarded/BadgeEarned push: transition to celebration screen.",
      "stateNotes": {
        "stateHolderType": "useState",
        "stateHolderTypeReason": "Reward processing state is transient — typically <2s. Local to LessonComplete screen. No cross-screen propagation.",
        "stateScope": "feature-scoped",
        "stateScopeReason": "LessonComplete unmounts on transition to celebration.",
        "propagationRisk": "LOW",
        "propagationRiskReason": "Only LessonComplete screen reads this state.",
        "routeGuardRequired": false,
        "exitGuardRequired": false
      }
    }
  }
}
```

### Node: achievement-celebration (T46 broadcast sent)

```json
{
  "nodeId": "achievement-celebration",
  "serverTask": "T46",
  "clientState": {
    "screen": "AchievementCelebration",
    "humanTimescale": "seconds (user dismisses)",
    "slaMs": null,
    "availableActions": ["dismiss", "share"],
    "appReopenBehavior": "AchievementBroadcast already sent — celebration not re-shown on reopen. Redirect to lesson list or dashboard."
  },
  "stackCoupling": {
    "react-web:client": {
      "tier": "IMPL_VARIES",
      "stackCategory": "client-spa",
      "dimensions": ["CLIENT_STATE_MODEL"],
      "neutralConcepts": [
        "display celebration animation with points/badge/streak data",
        "dismiss navigates to lesson list",
        "terminal node — not re-shown on app reopen"
      ],
      "implementationNotes": "No persistent state needed. AchievementBroadcast payload drives the celebration UI (points awarded, badges earned, streak count). On dismiss: navigate away. On app reopen: FlowStateSnapshot shows completed → redirect to dashboard.",
      "stateNotes": {
        "stateHolderType": "useState (transient — derived from AchievementBroadcast payload)",
        "stateHolderTypeReason": "Terminal node. Celebration data is ephemeral — derived from the broadcast event payload. Not persisted. Not re-shown on reopen.",
        "stateScope": "feature-scoped",
        "stateScopeReason": "AchievementCelebration unmounts on dismiss.",
        "propagationRisk": "LOW",
        "propagationRiskReason": "Only AchievementCelebration screen reads this state.",
        "routeGuardRequired": false,
        "exitGuardRequired": false
      }
    }
  }
}
```

### clientArchitecture section

```json
"clientArchitecture": {
  "requiresDraftState": false,
  "draftSteps": null,
  "offlineQueue": {
    "queueable": ["LessonCompletionSubmitted"],
    "notQueueable": [],
    "notQueueableReason": {}
  },
  "backgroundSteps": [
    {
      "serverTask": "T46",
      "runsWhileUserViews": "LessonComplete or AchievementCelebration",
      "signalType": "realtime-push",
      "signalText": null
    }
  ]
}
```

**Note:** LessonCompletionSubmitted IS queueable — evidence is validated server-side,
and idempotency prevents double-completion on retry. Unlike RSVP (capacity race) or
check-in (TTL), lesson completion is safe to queue and replay.

---

## PASS 7 — GENESIS PROMPTS (AF-1 pipeline input — NOT Claude Code instructions)

These prompts are seeded to ES in Phase A (INJECT). AF-3 retrieves them.
AF-1 generates code from them. Claude Code does NOT read these and type
the service code manually.

### T44 LessonCompletionDetector — HybridGenesisPrompt (AF-1 input)

```
TASK TYPE: T44 | FLOW-05 — Lesson Completion & Gamification

SECTION 1 — NEUTRAL IRON RULES (AF-7 validates these)
  IR-1: Idempotency via completionId — same lesson + learnerId = same ID.
        No double-completion on retry. SETNX key = hash(tenantId + lessonId + learnerId).
  IR-2: evidenceType validation MUST run BEFORE LessonCompleted is emitted.
        Valid types: "quiz", "submission", "watch-time". Invalid type → emit
        LessonCompletionFailed with reason 'invalid_evidence_type'.
  IR-3: DNA-5: tenantId isolation — completion never visible across tenants.
  IR-4: DNA-8: storeDocument(LessonCompleted) BEFORE enqueue().
  IR-5: LearningPathCompleted emitted ONLY when all lessons in path are complete.
        pathId: null means standalone lesson — no path check needed.
  IR-6: evidencePayload MUST NOT be logged. Store in database only.
        Logging uses lessonId + learnerId + evidenceType, never payload contents.

SECTION 2 — CONCEPT DESCRIPTION (AF-2 uses for planning)
  LessonCompletionDetector validates learner evidence of lesson completion,
  persists the completion record, and emits LessonCompleted to trigger the
  gamification pipeline. It handles quiz results, submission reviews, and
  watch-time completion. When the completed lesson is the last in a learning
  path, it also emits LearningPathCompleted.

SECTION 3 — EVENT CONTRACTS (AF-6 validates these)
  CONSUMES: LessonCompletionSubmitted (client event)
  EMITS:    LessonCompleted, LearningPathCompleted, LessonCompletionFailed (compensation),
            CompletionRevoked (compensation — admin/fraud trigger)
  INTEGRATION BOUNDARY:
    F166 ILessonService:          INJECTABLE
    F167 ILearnerProgressService: INJECTABLE
    F172 ILearningPathService:    INJECTABLE
    F173 IAuditTrailService:      PLATFORM-ONLY

SECTION 4 — STACK IMPLEMENTATIONS (AF-1 reads per stackTargets)

  node-nestjs:server ← PRIORITY (AF-1 generates from this)
    "Generate a NestJS @Injectable() class named LessonCompletionDetector
    extending MicroserviceBase. Inject F166, F167, F172, F173 via constructor.
    SETNX idempotency (IR-1) before any write.
    Validate evidenceType (IR-2): if invalid → emit LessonCompletionFailed.
    Persist completion via F166. Update progress via F167.
    If pathId !== null: check F172.isPathComplete() → emit LearningPathCompleted.
    storeDocument(LessonCompleted) then enqueue (IR-4).
    Return Promise<DataProcessResult<CompletionResult>>."

  python-fastapi:server  → [Stub — FLOW-37]
  php-laravel:server     → [Stub — FLOW-37]
  php-wordpress:server   → [Stub — degraded: $wpdb, no DI]

  redis:platform — CONCEPT_NEUTRAL
    "SETNX idempotency key (IR-1): {tenantId}:completion:{lessonId}:{learnerId}.
    TTL from FREEDOM config. All stacks via IDatabaseService FABRIC."

  jest:platform — CONCEPT_NEUTRAL
    "T002 idempotency: duplicate LessonCompletionSubmitted → only one LessonCompleted.
    T003 rollback: inject completion_failure → assert LessonCompletionFailed.
    T004 path completion: mock F172.isPathComplete() → true → LearningPathCompleted."
```

### T45 GamificationRewardEngine — HybridGenesisPrompt (AF-1 input)

```
TASK TYPE: T45 | FLOW-05 — Lesson Completion & Gamification

SECTION 1 — NEUTRAL IRON RULES (AF-7 validates these)
  IR-1: Points calculation MUST read from FREEDOM config key
        'flow05_points_per_completion'. Never hardcode point values. Score-0 if hardcoded.
  IR-2: Badge threshold check is idempotent — same completion never awards same badge twice.
        SETNX key = hash(tenantId + learnerId + badgeId).
  IR-3: Streak window MUST come from FREEDOM config key
        'flow05_streak_window_hours'. Default 24. Never hardcode.
  IR-4: DNA-8: storeDocument(PointsAwarded) BEFORE enqueue().
  IR-5: CompletionRevoked MUST trigger PointsRevoked — LIFO compensation.
        Revoke points, revoke badges, reset affected streak.
  IR-6: totalPoints in PointsAwarded is the running balance — denormalized for client.

SECTION 2 — CONCEPT DESCRIPTION (AF-2 uses for planning)
  GamificationRewardEngine processes completed lessons and awards points, badges,
  and streak updates. Points are configurable per tenant. Badge thresholds are
  checked idempotently. Streak continuity uses a configurable time window. On
  CompletionRevoked, it performs LIFO compensation: revoke points, revoke badges.

SECTION 3 — EVENT CONTRACTS (AF-6 validates these)
  CONSUMES: LessonCompleted (QUEUE FABRIC — from T44),
            CompletionRevoked (QUEUE FABRIC — compensation trigger)
  EMITS:    PointsAwarded, BadgeEarned, StreakUpdated, PointsRevoked (compensation)
  INTEGRATION BOUNDARY:
    F167 ILearnerProgressService: INJECTABLE
    F168 IGamificationService:    INJECTABLE — rules engine is tenant-customizable
    F169 IStreakService:          INJECTABLE
    F170 ILeaderboardService:    INJECTABLE

SECTION 4 — STACK IMPLEMENTATIONS (AF-1 reads per stackTargets)

  node-nestjs:server ← PRIORITY (AF-1 generates from this)
    "Generate a NestJS @Injectable() class named GamificationRewardEngine
    extending MicroserviceBase. Inject F167, F168, F169, F170 via constructor.
    On LessonCompleted: read points from FREEDOM config (IR-1). Award via F168.
    Check badge thresholds (F168.checkBadges()) — SETNX per badge (IR-2).
    Update streak via F169 — window from FREEDOM config (IR-3).
    Sync leaderboard via F170 (best-effort — does not block rewards).
    storeDocument(PointsAwarded) then enqueue (IR-4).
    On CompletionRevoked: PointsRevoked chain (IR-5).
    Return Promise<DataProcessResult<RewardResult>>."

  python-fastapi:server  → [Stub — FLOW-37]
  php-laravel:server     → [Stub — FLOW-37]
  php-wordpress:server   → ⛔ INCOMPATIBLE — wp_cron unreliable for streak window expiry detection.
                            Streak continuity requires precise time-window checks that wp_cron
                            cannot guarantee. Use php-laravel with Queue::later().

  redis:platform — CONCEPT_NEUTRAL
    "SETNX badge idempotency (IR-2): {tenantId}:badge:{learnerId}:{badgeId}. TTL 30d.
    Streak tracking: {tenantId}:streak:{learnerId}. TTL from FREEDOM config."

  jest:platform — IMPL_VARIES [TEST_FRAMEWORK]
    "T005 streak continuation: two completions in same day → streak increments.
    T006 virtualClock: jest.useFakeTimers(), advance 49h → streakBroken: true.
    virtualClock: true for T006."
```

### T46 AchievementBroadcaster — HybridGenesisPrompt (AF-1 input)

```
TASK TYPE: T46 | FLOW-05 — Lesson Completion & Gamification

SECTION 1 — NEUTRAL IRON RULES (AF-7 validates these)
  IR-1: Broadcast payload MUST NOT contain raw score data — only delta and total.
        No leaderboard position in payload (eventually consistent).
  IR-2: Leaderboard sync is best-effort (eventually consistent, up to 30s gap).
        F170 failure MUST NOT block AchievementBroadcast emission.
  IR-3: AchievementBroadcast payload shape typed by achievementType field:
        "lesson" | "badge" | "streak" | "path".
  IR-4: DNA-8: storeDocument(AchievementBroadcast) BEFORE enqueue().
  IR-5: DNA-5: tenantId on all writes. Feed entries scoped to tenant.
  IR-6: Idempotency: SETNX key = hash(tenantId + learnerId + achievementType + sourceEventId).

SECTION 2 — CONCEPT DESCRIPTION (AF-2 uses for planning)
  AchievementBroadcaster fans in from multiple reward events (PointsAwarded,
  BadgeEarned, StreakUpdated, LearningPathCompleted) and writes typed broadcasts
  to the social feed. It syncs the leaderboard on a best-effort basis. The
  broadcast payload is typed by the achievement kind.

SECTION 3 — EVENT CONTRACTS (AF-6 validates these)
  CONSUMES: PointsAwarded, BadgeEarned, StreakUpdated, LearningPathCompleted (QUEUE FABRIC)
  EMITS:    AchievementBroadcast
  INTEGRATION BOUNDARY:
    F171 IAchievementFeedService: INJECTABLE — feed write strategy is tenant-configurable
    F170 ILeaderboardService:    INJECTABLE

SECTION 4 — STACK IMPLEMENTATIONS (AF-1 reads per stackTargets)

  node-nestjs:server ← PRIORITY (AF-1 generates from this)
    "Generate a NestJS @Injectable() class named AchievementBroadcaster
    extending MicroserviceBase. Inject F171, F170 via constructor.
    Fan-in: handles PointsAwarded, BadgeEarned, StreakUpdated, LearningPathCompleted.
    Map each to achievementType. Build typed broadcast payload (IR-3).
    SETNX idempotency (IR-6). Write to feed via F171.
    Leaderboard sync via F170 — best-effort: catch + log, do not rethrow (IR-2).
    storeDocument(AchievementBroadcast) then enqueue (IR-4).
    Return Promise<DataProcessResult<BroadcastResult>>."

  python-fastapi:server  → [Stub — FLOW-37]
  php-laravel:server     → [Stub — FLOW-37]
  php-wordpress:server   → [Stub — degraded: blocking wp_remote_post, no async fan-in]

  redis:platform — CONCEPT_NEUTRAL
    "SETNX idempotency (IR-6): {tenantId}:broadcast:{learnerId}:{achievementType}:{sourceEventId}.
    TTL 7 days. All stacks via IDatabaseService FABRIC."

  jest:platform — CONCEPT_NEUTRAL
    "Mock F170 to throw → verify AchievementBroadcast still emits (IR-2).
    Verify payload typed by achievementType (IR-3)."
```

---

## AF PROMPT DEFINITIONS (seeded in Phase A — NEW-A7)

| Task Type | promptId pattern | AF station | Purpose |
|-----------|-----------------|------------|---------|
| T44 | lesson-gamification::T44::genesis | AF-1 | Code generation |
| T44 | lesson-gamification::T44::review | AF-6 | Code review |
| T44 | lesson-gamification::T44::compliance | AF-7 | DNA + P1-P13 validation |
| T44 | lesson-gamification::T44::judge | AF-9 | Scoring |
| T45 | lesson-gamification::T45::genesis | AF-1 | |
| T45 | lesson-gamification::T45::review | AF-6 | |
| T45 | lesson-gamification::T45::compliance | AF-7 | |
| T45 | lesson-gamification::T45::judge | AF-9 | |
| T46 | lesson-gamification::T46::genesis | AF-1 | |
| T46 | lesson-gamification::T46::review | AF-6 | |
| T46 | lesson-gamification::T46::compliance | AF-7 | |
| T46 | lesson-gamification::T46::judge | AF-9 | |

Total: 12 prompts seeded. Domain: `lesson-gamification`. connectionType: `FLOW_SCOPED`.

---

## STACK COUPLING ANNOTATIONS (V29 — priority stack + platforms only)

### T44 LessonCompletionDetector

```typescript
stackCoupling: {
  entries: {
    'node-nestjs:server': {
      tier: 'IMPL_VARIES',
      stackCategory: 'web-framework',
      dimensions: ['SERVER_DI_FRAMEWORK', 'SERVER_LANGUAGE'],
      neutralConcepts: [
        'idempotency via completionId SETNX (IR-1)',
        'evidenceType validation before emit (IR-2)',
        'DNA-5 tenant isolation (IR-3)',
        'DNA-8 store before emit (IR-4)',
        'path completion check (IR-5)',
        'evidencePayload never logged (IR-6)',
      ],
      implementationNotes: 'NestJS @Injectable() extending MicroserviceBase. SETNX → validate → persist → storeDocument → enqueue.',
    },
    'redis:platform': {
      tier: 'CONCEPT_NEUTRAL',
      stackCategory: 'platform-service',
      dimensions: [],
      neutralConcepts: ['SETNX idempotency for completion dedup'],
      implementationNotes: 'key={tenantId}:completion:{lessonId}:{learnerId}. TTL from FREEDOM config.',
    },
    'jest:platform': {
      tier: 'CONCEPT_NEUTRAL',
      stackCategory: 'test-runner',
      dimensions: [],
      neutralConcepts: ['idempotency test (T002)', 'rollback test (T003)', 'path completion test (T004)'],
      implementationNotes: 'Standard Jest. No virtualClock for T44.',
    },
  },
  supportedServerStacks: ['node-nestjs'],
}
```

### T45 GamificationRewardEngine

```typescript
stackCoupling: {
  entries: {
    'node-nestjs:server': {
      tier: 'IMPL_VARIES',
      stackCategory: 'web-framework',
      dimensions: ['SERVER_DI_FRAMEWORK', 'SERVER_ASYNC_MODEL'],
      neutralConcepts: [
        'points from FREEDOM config (IR-1)',
        'badge idempotency SETNX (IR-2)',
        'streak window from FREEDOM config (IR-3)',
        'DNA-8 (IR-4)',
        'LIFO compensation on CompletionRevoked (IR-5)',
        'totalPoints denormalized (IR-6)',
      ],
      implementationNotes: 'NestJS @Injectable(). F168 rules engine. F169 streak. F170 leaderboard (best-effort). FREEDOM config for all thresholds.',
    },
    'php-wordpress:server': {
      tier: 'INCOMPATIBLE',
      incompatible: true,
      incompatibleReason: 'wp_cron unreliable for streak window expiry detection. Streak continuity requires precise time-window checks within flow05_streak_window_hours.',
      mitigation: 'Use php-laravel with Queue::later() for reliable streak window monitoring.',
    },
    'redis:platform': {
      tier: 'CONCEPT_NEUTRAL',
      stackCategory: 'platform-service',
      dimensions: [],
      neutralConcepts: ['badge SETNX idempotency', 'streak tracking with TTL'],
      implementationNotes: 'Badge key: {tenantId}:badge:{learnerId}:{badgeId}. Streak key: {tenantId}:streak:{learnerId}.',
    },
    'jest:platform': {
      tier: 'IMPL_VARIES',
      stackCategory: 'test-runner',
      dimensions: ['TEST_FRAMEWORK'],
      neutralConcepts: ['T005 streak continuation', 'T006 streak break (virtualClock 49h)'],
      implementationNotes: 'T006: jest.useFakeTimers() + advance 49h. virtualClock: true.',
    },
  },
  supportedServerStacks: ['node-nestjs'],
}
```

### T46 AchievementBroadcaster

```typescript
stackCoupling: {
  entries: {
    'node-nestjs:server': {
      tier: 'IMPL_VARIES',
      stackCategory: 'web-framework',
      dimensions: ['SERVER_DI_FRAMEWORK', 'SERVER_LANGUAGE'],
      neutralConcepts: [
        'no raw score in payload (IR-1)',
        'leaderboard best-effort, never blocks (IR-2)',
        'payload typed by achievementType (IR-3)',
        'DNA-8 (IR-4)',
        'DNA-5 tenant isolation (IR-5)',
        'SETNX idempotency (IR-6)',
      ],
      implementationNotes: 'NestJS @Injectable(). Fan-in from 4 event types. F171 feed write. F170 leaderboard (try/catch).',
    },
    'redis:platform': {
      tier: 'CONCEPT_NEUTRAL',
      stackCategory: 'platform-service',
      dimensions: [],
      neutralConcepts: ['SETNX broadcast idempotency'],
      implementationNotes: 'key={tenantId}:broadcast:{learnerId}:{achievementType}:{sourceEventId}. TTL 7d.',
    },
    'jest:platform': {
      tier: 'CONCEPT_NEUTRAL',
      stackCategory: 'test-runner',
      dimensions: [],
      neutralConcepts: ['F170 throw → broadcast still emits (IR-2)', 'achievementType payload shape (IR-3)'],
      implementationNotes: 'Standard Jest. No virtualClock for T46.',
    },
  },
  supportedServerStacks: ['node-nestjs'],
}
```

---

## ARBITER COUPLING ANNOTATIONS

| Arbiter | Business Rule | NestJS Code Check |
|---------|--------------|-------------------|
| completion::evidence-check | evidenceType validated before emit | if (!validTypes.includes(type)) → LessonCompletionFailed |
| completion::idempotent-completion | duplicate = same result | SETNX completionId before write |
| gamification::reward-fairness | points from config, never hardcoded | FREEDOM config literal scan |
| gamification::streak-continuity | streak window from config | FREEDOM config key presence |
| social-broadcast::feed-payload | no raw scores in broadcast payload | DTO type check on broadcast event |
| social-broadcast::leaderboard-sync | F170 failure does not block broadcast | try/catch around F170 call |

---

## PHASE STRUCTURE (af-pipeline mode)

```
Phase A: INJECT
  Claude Code writes: EngineContracts, event schemas (10), topology, test matrix,
    dashboard, runbook. Seeds 12 AF prompts + 3 EngineContracts to ES.
    3 enum entries (COMPLETION, GAMIFICATION, BROADCAST-SOCIAL). 6 arbiters.
  Claude Code does NOT write: .service.ts files

Phase B: GENERATE
  Submit T44/T45/T46 contracts to FlowOrchestrator via afPipeline.run().
  AF-1 generates service code from genesis prompts + RAG context.
  Capture: result.passed, result.score, result.promotionLevel per task type.

Phase C: JUDGE + ITERATE
  AF-6 code review, AF-7 DNA compliance, AF-8 security, AF-9 scoring.
  If score >= 80: proceed to Phase D.
  If 60-79: PromptOps generates PromptPatch, re-run Phase B.
  If < 60: escalate to Luba.

Phase D: INTEGRATE
  Wire generated services into engine module.
  Run npm run lint:naming (exit 0).
  Run npm test — verify generated code compiles and passes.
  Client integration tests (react-web).

Phase E: PROMOTE
  Promote generated services to INJECTED level.
  Capture DPO training data (prompt, chosen output, rejected output, scores).
  BFA governance, cross-flow edge tests, blast radius protocol.
  Final V0-MODE/V0-SCOPE/V29/V30/V31 verification.
  lint:naming regression gate. Bundle version check (B-001, B-002).
  Lifecycle PROMOTED → ACTIVE.
```

---

## PHASE A GATE (INJECT)

```bash
# PRE-ALLOCATION GUARD — must pass before any file creation
node -e "
const state = JSON.parse(require('fs').readFileSync('FLOW-05-STATE.json'));
const { Family, CF } = state.pre_allocated_ranges;
if (Family.startsWith('⛔') || CF.startsWith('⛔'))
  throw new Error('BLOCKED: Family/CF ranges not confirmed. Update STATE.json from pre-allocation session first.');
console.log('✅ Pre-allocation confirmed — Family:', Family, 'CF:', CF);
"

# 3 enum entries, 3 EngineContracts, 6 arbiters, 10 event schemas,
# topology, test matrix, dashboard, runbook
# (same structural checks as v1)

# NEW-A7: AF prompts seeded
node -e "
const es = /* ES client */;
const count = await es.count({ index: 'xiigen-prompts', body: {
  query: { bool: { must: [
    { term: { 'flowId.keyword': 'FLOW-05' }},
    { term: { 'connectionType.keyword': 'FLOW_SCOPED' }}
  ]}}
}});
if (count.body.count !== 12) throw new Error('Expected 12 AF prompts, got ' + count.body.count);
console.log('✅ NEW-A7: 12 AF prompts seeded for FLOW-05');
"

# EngineContracts seeded with stackCoupling
node -e "
const es = /* ES client */;
for (const id of ['T44','T45','T46']) {
  const doc = await es.get({ index: 'xiigen-engine-contracts', id });
  if (!doc.body._source.stackCoupling) throw new Error(id + ' missing stackCoupling');
  console.log('✅', id, 'EngineContract seeded with stackCoupling');
}
"

# V29/V30/V31 verification scripts
# (same pattern as FLOW-01 v11 / FLOW-04 v3)

# SK-434 parallel prerequisite check
node -e "
const status = await fetch('/lifecycle/flows/FLOW-02').then(r => r.json());
if (status.status !== 'ACTIVE') throw new Error('FLOW-02 not ACTIVE: ' + status.status);
console.log('✅ SK-434: FLOW-02 is ACTIVE');
"

# Pre-allocated ranges verified
# T44–T46, F166–F173 from parallel_execution table — do NOT renumber

# D-VIS-2 DRY_RUN
# npm run bootstrap:dry-run -- --flow=FLOW-05

# Addition 1: arbiter replay for 6 new arbiters

# D-VIS-4: lifecycle CAS write NOT_STARTED → GENERATED

npm run lint:naming   # exit 0
```

---

## PHASE B GATE (GENERATE)

```bash
# Submit each task type to AF pipeline — capture all 6 P5 metrics per run
for taskType in T44 T45 T46; do
  node -e "
  const result = await afPipeline.run({
    tenantId: testTenantId,
    taskType: '${taskType}',
    spec: /* load EngineContract for ${taskType} */
  });

  // P5 — 6 metrics captured per run
  const metrics = {
    taskType:       '${taskType}',
    passed:         result.passed,
    quality:        result.score,       // AF-9 quality score 0–100
    cost:           result.costUsd,     // token cost in USD
    latencyMs:      result.latencyMs,   // end-to-end pipeline latency
    retryCount:     result.retryCount,  // AF iteration count before pass
    dpoTriples:     result.dpoTriples ?? 0,
    modelUsed:      result.modelUsed,   // e.g. 'claude-sonnet-4-20250514'
    promotionLevel: result.promotionLevel,
  };

  console.log('${taskType} metrics:', JSON.stringify(metrics, null, 2));
  if (!result.passed) throw new Error('${taskType} AF pipeline FAILED — score: ' + result.score);
  if (!metrics.modelUsed) throw new Error('${taskType} modelUsed not captured');
  "
done

ls server/src/engine/flows/lesson-completion-gamification/*.service.ts
# Expected (AF-1 generated):
#   lesson-completion-detector.service.ts
#   gamification-reward-engine.service.ts
#   achievement-broadcaster.service.ts
```

---

## PHASE C GATE (JUDGE)

```bash
node -e "
for (const id of ['T44','T45','T46']) {
  const result = /* load latest AF-9 judgment for id */;
  console.log(id, 'AF-9 score:', result.score,
    'DNA violations:', result.dnaViolations.length,
    'security issues:', result.securityIssues.length);
  if (result.score < 80) throw new Error(id + ' score below 80: ' + result.score);
  if (result.dnaViolations.length > 0) throw new Error(id + ' has DNA violations');
}
console.log('✅ All task types pass AF-9 judgment');
"
```

---

## PHASE D GATE (INTEGRATE)

```bash
npm run lint:naming   # exit 0

find server/src/engine/flows/lesson-completion-gamification -name "*.service.ts"
find server/src/engine/flows/lesson-completion-gamification -name "t4*.ts" 2>/dev/null
# Expected: no ID-prefixed files

cd server && npm test
cd ../client && npm test
```

---

## PHASE E GATE (PROMOTE)

```bash
# Promote to INJECTED
node -e "
for (const id of ['T44','T45','T46']) {
  await promotionLadder.promote(id, 'INJECTED', testTenantId);
  console.log('✅', id, 'promoted to INJECTED');
}
"

# DPO triples (3)
node -e "
const dpo = await es.search({ index: 'xiigen-training-data', body: {
  query: { term: { 'flowId.keyword': 'FLOW-05' }}
}});
if (dpo.body.hits.total.value < 3) throw new Error('Expected >= 3 DPO triples');
"

# BFA governance, cross-flow edge tests, blast radius (same as v1 Phase E)
# npm run test:flow-matrix -- --flow=FLOW-05
# npm run test:cross-flow (FLOW-02_to_FLOW-05 real, FLOW-05_to_FLOW-10 stub)
# D-VIS-1 blast radius 3-case protocol
# SK-436 bundle version check (B-001, B-002)
# Lifecycle PROMOTED → ACTIVE

npm run lint:naming   # exit 0 (regression)
```

---

## flow-completeness-checker v1.5 — 33/33 ✅

```
V0-MODE ✅ implementationMode: "af-pipeline"
    SESSION files use afPipeline.run(), not create_file for services
    Phase structure: INJECT → GENERATE → JUDGE → INTEGRATE → PROMOTE

V0-SCOPE ✅ stackTargets: ['node-nestjs'], clientTargets: ['react-web']
    Topology stateNotes: react-web:client only
    No Angular/Android/iOS stateNotes in plan body

V1–V28 ✅ (unchanged from v1, plus LessonCompletionFailed schema added)

V29 ✅ stackCoupling on T44, T45, T46:
    T44: IMPL_VARIES, entries: node-nestjs:server + redis:platform + jest:platform
    T45: IMPL_VARIES, entries: node-nestjs:server + php-wordpress:server (INCOMPATIBLE)
         + redis:platform + jest:platform
    T46: IMPL_VARIES, entries: node-nestjs:server + redis:platform + jest:platform
    supportedServerStacks: ['node-nestjs'] on all three

V30 ✅ INCOMPATIBLE stacks flagged:
    T45 php-wordpress:server — INCOMPATIBLE — wp_cron unreliable for streak window
      mitigation: php-laravel Queue::later()

V31 ✅ stateNotes on react-web:client (declared clientTarget):
    lesson-in-progress: useState, feature-scoped, LOW
    reward-processing: useState, feature-scoped, LOW
    achievement-celebration: useState (transient), feature-scoped, LOW
```

---

## SESSION-0 CHECKLIST (FC-1 through FC-21)

```
FC-19: All 3 genesis prompts in HybridGenesisPrompt format (AF-1 input)
       ✓ neutralIronRules[] present, no framework names in Section 1
       ✓ stackImplementations['node-nestjs:server'] present on all three
       ✓ T45 php-wordpress:server: incompatible: true

FC-20: INCOMPATIBLE stacks flagged with reason + mitigation
       ✓ T45 php-wordpress:server: wp_cron streak window + mitigation

FC-21: stateNotes present on react-web:client topology nodes
       ✓ lesson-in-progress: useState, LOW
       ✓ reward-processing: useState, LOW
       ✓ achievement-celebration: useState (transient), LOW
```

---

## JIRA COMMENT TEMPLATE (naming-conventions-enforcer Rule 5)

```
## What was built — Phase A [Flow: FLOW-05 — Lesson Completion & Gamification]

### Business purpose
Seeded the three EngineContracts and 12 AF prompts for the lesson completion
and gamification pipeline. T44 detects and validates lesson completion with
evidence (quiz, submission, watch-time), emitting LessonCompleted and
LearningPathCompleted. T45 awards points (from FREEDOM config), badges
(idempotent threshold check), and streaks (configurable window). T46
broadcasts achievements to the social feed and syncs leaderboards (best-effort).

### Flow context
- **Flow:** FLOW-05 — Lesson Completion & Gamification (Wave 2, parallel_wave: 2)
- **Task types:** T44 LessonCompletionDetector, T45 GamificationRewardEngine,
  T46 AchievementBroadcaster
- **Implementation mode:** af-pipeline — AF-1 generates service code from contracts
- **Will be used by:** FLOW-10 (Social Platform — AchievementBroadcast → social graph).
  FLOW-09 (achievement gating for event participation).

### Technical delivery
- 3 EngineContracts seeded to ES (xiigen-engine-contracts index)
- 12 AF prompts seeded to ES (xiigen-prompts index): 4 per task type
- 10 event schemas in contracts/events/FLOW-05/
- topology.json with react-web:client stateNotes
- test-matrix.json with 11 scenarios (T006 virtualClock for streak break)
- Key factories: F166 ILessonService, F167 ILearnerProgressService,
  F168 IGamificationService, F169 IStreakService, F170 ILeaderboardService,
  F171 IAchievementFeedService, F172 ILearningPathService,
  F173 IAuditTrailService (PLATFORM-ONLY)

### Architecture fit
All contracts enforce DNA-8 (outbox-before-queue), DNA-5 (tenant isolation).
T45 FREEDOM config for all thresholds (points, badges, streak window).
T46 leaderboard sync is best-effort — never blocks broadcasts.
AF-1 will generate the .service.ts files in Phase B.
```

---

## KEY FACTS FOR SESSION FILES

```
Artifact numbers: T44–T46, F166–F173 (PRE-ALLOCATED — lower than FLOW-01. Immutable. Do NOT renumber.)
flow_name: "Lesson Completion & Gamification"
stackTargets: ['node-nestjs']
clientTargets: ['react-web']
implementationMode: af-pipeline

PRE-ALLOCATION GATE: Family + CF ranges must be confirmed in STATE.json
(replace ⛔ strings) before SESSION-FLOW-05-A.md executes.
wave_baseline_entry set by pre-allocation session — do not hardcode.

AF-1 generates these files (Claude Code does NOT create them):
  lesson-completion-detector.service.ts  ← T44
  gamification-reward-engine.service.ts  ← T45
  achievement-broadcaster.service.ts     ← T46
Directory: engine/flows/lesson-completion-gamification/

PREREQUISITE — Passes 1–6 referenced from v1 (not inlined in v3).
SESSION-FLOW-05-A.md MUST read docs/FLOW-05-REFERENCE-PLAN-v1.md before
creating files under contracts/events/FLOW-05/ or contracts/topologies/.
  prerequisite_documents: ["docs/FLOW-05-REFERENCE-PLAN-v1.md"]
  reason: "9 base event schemas + E2E test matrix (11 scenarios) defined in v1.
           LessonCompletionFailed (10th schema, new in v2) — write inline in Session A."

Test baseline (parallel_wave: 2 — read at execution time):
  Entry:           cd server && npx jest --passWithNoTests 2>&1 | tail -1
                   (use wave_baseline_entry from pre-allocation session as anchor)
  After Phase A:   wave_baseline_entry + 10  (schema validation tests for 10 schemas)
  After Phase E:   wave_baseline_entry + 35  (server +25 from AF-generated code, client +10)
                   Note: +25 server tests (not +30) — gamification services have fewer
                   execution branches than convergence/fan-in services. Intentional.
  Client delta:    +12 (C1:3, C2:3, C3:3, C4:0, C5:0, background:+3)

AF pipeline expectations:
  Phase A: 12 prompts + 3 contracts seeded
  Phase B: 3 afPipeline.run() calls — 6 P5 metrics captured per run
           (quality, cost, latencyMs, retryCount, dpoTriples, modelUsed)
  Phase C: AF-9 score >= 80 for all three task types
  Phase E: 3 DPO triples captured, promoted to INJECTED

New archetypes (3): COMPLETION, GAMIFICATION, BROADCAST-SOCIAL
  BROADCAST-SOCIAL ≠ BROADCAST (FLOW-02). Distinct arbiters.
New arbiters (6)

Bundle membership: B-001, B-002
Cross-flow: FLOW-02 → FLOW-05 (real), FLOW-05 → FLOW-10 (stub)
```

---

## SESSION FILES TO PRODUCE

```
FLOW-05-STATE.json               ← implementationMode: "af-pipeline"
                                    ⛔ Family + CF must be confirmed before Phase A

SESSION-FLOW-05-A.md             ← INJECT phase
                                    ⛔ FIRST: assert pre_allocated_ranges Family/CF confirmed
                                    Read prerequisite_documents: ["docs/FLOW-05-REFERENCE-PLAN-v1.md"]
                                      (9 base schemas + test matrix — required for contracts/events/FLOW-05/)
                                    Write LessonCompletionFailed schema inline (10th schema — new in v2)
                                    Write EngineContracts for T44/T45/T46
                                    Write 12 AF prompts (4 per task type)
                                    Seed to ES (contracts + prompts)
                                    3 enum entries + 6 arbiters
                                    SK-434 prerequisite check (FLOW-02 ACTIVE)
                                    Pre-allocated ranges verified (do NOT renumber T44–T46)
                                    V0-MODE + V0-SCOPE + V29/V30/V31 checks

SESSION-FLOW-05-B.md             ← GENERATE phase
                                    Submit T44 to afPipeline.run()
                                    Submit T45 to afPipeline.run()
                                    Submit T46 to afPipeline.run()
                                    Capture 6 P5 metrics per task type
                                    Verify 3 .service.ts files exist (AF-1 output)

SESSION-FLOW-05-C.md             ← JUDGE phase
                                    AF-6/7/8/9 scoring
                                    PromptPatch iteration if score 60–79
                                    Escalate to Luba if score < 60
                                    All task types must reach score >= 80

SESSION-FLOW-05-D.md             ← INTEGRATE phase
                                    Wire generated services into engine module
                                    lint:naming gate (exit 0)
                                    npm test (server + client)

SESSION-FLOW-05-E.md             ← PROMOTE phase
                                    Promote T44/T45/T46 to INJECTED
                                    DPO training data export (3 triples)
                                    BFA governance + cross-flow edge tests
                                    Blast radius 3-case protocol
                                    Bundle version check (B-001, B-002)
                                    Lifecycle PROMOTED → ACTIVE
                                    Final V0-MODE/V0-SCOPE/V29/V30/V31 verification
                                    lint:naming regression gate

docs/FLOW-05-REFERENCE.md        ← this document
```

---

## APPENDIX A — NON-PRIORITY STACKS (for FLOW-37 reference only)

Claude Code executing FLOW-05 phases MUST IGNORE this appendix entirely.

```
SERVER STACKS TO ADD IN FLOW-37:
  T44: python-fastapi, php-laravel — all IMPL_VARIES
       php-wordpress: degraded ($wpdb, no DI)
  T45: python-fastapi, php-laravel (Queue::later for streak) — IMPL_VARIES
       php-wordpress: ⛔ INCOMPATIBLE (already flagged — wp_cron streak)
  T46: python-fastapi, php-laravel — IMPL_VARIES
       php-wordpress: degraded (blocking wp_remote_post, no async)

CLIENT STACKS TO ADD IN FLOW-37:
  angular:client — all 3 topology nodes:
    lesson-in-progress: component-local Subject, feature-scoped, LOW
    reward-processing: component-local variable, feature-scoped, LOW
    achievement-celebration: component-local variable, feature-scoped, LOW
  android-kotlin:client — ViewModel + StateFlow for all 3 nodes
  ios-swift:client — @StateObject + Combine for all 3 nodes
```

---

⛔ STOP — Read PARALLEL-EXECUTION-PLAN.md before Phase A.
Confirm wave_baseline_entry before starting.
Verify FLOW-02 is ACTIVE.
NOTE: T44–T46 and F166–F173 are correct pre-allocated numbers — do not query
live boundaries or renumber.
