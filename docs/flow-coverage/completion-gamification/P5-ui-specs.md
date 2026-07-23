# FLOW-05 UI Spec — Phase 5 Deliverable

**Flow:** Completion Gamification (`completion-gamification`)
**Classification:** TENANT_FACING
**P2 verdict:** COVERED
**Authoring mode:** VALIDATE_EXISTING

## Existing Pages & Proposed Routes

| Page | Proposed Route | Data-testids Found |
|------|---------------|--------------------|
| `GamificationDashboardPage.tsx` | `/completion-gamification/gamification-dashboard` | `achievement-gallery`, `current-level`, `gamification-dashboard`, `points-history`, `streak-count`, `total-points` |
| `LearningProgressPage.tsx` | `/completion-gamification/learning-progress` | `active-curriculum`, `adaptation-pending`, `adaptation-suggestion`, `learning-progress`, `performance-history` |
| `LessonCompletionPage.tsx` | `/completion-gamification/lesson-completion` | `achievement-unlocked`, `adaptation-pending`, `completion-form`, `current-level`, `curriculum-updating`, `gamification-feedback` +9 |
| `SocialLearningPage.tsx` | `/completion-gamification/social-learning` | `answer-grading-form`, `incoming-grades`, `page-social-learning`, `post-builder`, `social-consent-toggle`, `social-section` +1 |

## Per-State UI Assignment

| # | Business State | Target Page | Data-testid Hook |
|---|---------------|-------------|------------------|
| 1 | CompletionRecorder — orchestration step entered via `LessonCompletionSubmitted event` | `GamificationDashboardPage.tsx` | `page-gamificationdashboard` |
| 2 | PointsCalculator — processing step entered via `CompletionRecorded event (server-side poin… | `GamificationDashboardPage.tsx` | `page-gamificationdashboard` |
| 3 | LedgerUpdater — processing step entered via `PointsAwarded event` | `GamificationDashboardPage.tsx` | `page-gamificationdashboard` |
| 4 | LevelUpChecker — processing step entered via `LedgerUpdated event` | `GamificationDashboardPage.tsx` | `page-gamificationdashboard` |
| 5 | AchievementGate — processing step entered via `LevelUpChecked event` | `GamificationDashboardPage.tsx` | `page-gamificationdashboard` |
| 6 | SocialShareGate — processing step entered via `AchievementUnlocked event (privacy gate — C… | `GamificationDashboardPage.tsx` | `page-gamificationdashboard` |
| 7 | StreakManager — processing step entered via `CompletionRecorded event (timezone-aware — CF… | `GamificationDashboardPage.tsx` | `page-gamificationdashboard` |
| 8 | LearningFlowCompleted — orchestration step entered via `AllGamificationComplete event` | `GamificationDashboardPage.tsx` | `page-gamificationdashboard` |
| 9 | LessonCompletionSubmitted → CompletionRecorder when `` (emits `xiigen.completion-gamificat… | `LessonCompletionPage.tsx` | `page-lessoncompletion` |
| 10 | CompletionRecorder → PointsCalculator when `` (emits `xiigen.completion-gamification.compl… | `GamificationDashboardPage.tsx` | `page-gamificationdashboard` |
| 11 | CompletionRecorder → StreakManager when `streak branch` (emits `xiigen.completion-gamifica… | `GamificationDashboardPage.tsx` | `page-gamificationdashboard` |
| 12 | PointsCalculator → LedgerUpdater when `` (emits `xiigen.completion-gamification.points-awa… | `GamificationDashboardPage.tsx` | `page-gamificationdashboard` |
| 13 | LedgerUpdater → LevelUpChecker when `` (emits `xiigen.completion-gamification.ledger-updat… | `GamificationDashboardPage.tsx` | `page-gamificationdashboard` |
| 14 | LevelUpChecker → AchievementGate when `` (emits `xiigen.completion-gamification.level-up-c… | `GamificationDashboardPage.tsx` | `page-gamificationdashboard` |
| 15 | AchievementGate → SocialShareGate when `achievement unlocked` (emits `xiigen.completion-ga… | `GamificationDashboardPage.tsx` | `page-gamificationdashboard` |
| 16 | SocialShareGate → LearningFlowCompleted when `` (emits `xiigen.completion-gamification.soc… | `GamificationDashboardPage.tsx` | `page-gamificationdashboard` |
| 17 | StreakManager → LearningFlowCompleted when `` (emits `xiigen.completion-gamification.strea… | `GamificationDashboardPage.tsx` | `page-gamificationdashboard` |
| 18 | LearningFlowCompleted → LearningFlowCompleted when `terminal` (emits `xiigen.completion-ga… | `GamificationDashboardPage.tsx` | `page-gamificationdashboard` |

## Phase 6 Work Items

**Action:** spec validation only — pages already routed. Verify data-testid coverage for every P1 state.

## Arbiter Verdicts

- **Arbiter 1 — Per-state coverage:** row count = 18 (= P1 item count). PASS
- **Arbiter 2 — Route proposal truthfulness:** PASS — routes derived deterministically from page file names (kebab-case) + classification prefix.
- **Arbiter 3 — Data-testid grounding:** PASS — existing testids extracted directly from page source; hints for new pages follow `page-<slug>` convention.
- **Arbiter 4 — Mode correctness:** PASS — WIRE_EXISTING/AUTHOR_NEW/VALIDATE_EXISTING assigned from P2 verdict.
