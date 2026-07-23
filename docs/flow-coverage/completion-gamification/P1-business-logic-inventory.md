# FLOW-05 Business Logic Inventory — Phase 1 Deliverable

**Flow:** Completion Gamification (`completion-gamification`)
**Classification:** TENANT_FACING
**Source:** TOPOLOGY
**Source document:** `contracts/topologies/completion-gamification.topology.json`

**Topology shape:** 8 nodes, 10 edges. Minimum inventory items: 18.

## Business States & Transitions

1. CompletionRecorder — orchestration step entered via `LessonCompletionSubmitted event`
2. PointsCalculator — processing step entered via `CompletionRecorded event (server-side points — CF-05-1)`
3. LedgerUpdater — processing step entered via `PointsAwarded event`
4. LevelUpChecker — processing step entered via `LedgerUpdated event`
5. AchievementGate — processing step entered via `LevelUpChecked event`
6. SocialShareGate — processing step entered via `AchievementUnlocked event (privacy gate — CF-05-3)`
7. StreakManager — processing step entered via `CompletionRecorded event (timezone-aware — CF-05-2)`
8. LearningFlowCompleted — orchestration step entered via `AllGamificationComplete event`
9. LessonCompletionSubmitted → CompletionRecorder when `` (emits `xiigen.completion-gamification.lesson-completion-submitted.v1`)
10. CompletionRecorder → PointsCalculator when `` (emits `xiigen.completion-gamification.completion-recorded.v1`)
11. CompletionRecorder → StreakManager when `streak branch` (emits `xiigen.completion-gamification.completion-recorded.v1`)
12. PointsCalculator → LedgerUpdater when `` (emits `xiigen.completion-gamification.points-awarded.v1`)
13. LedgerUpdater → LevelUpChecker when `` (emits `xiigen.completion-gamification.ledger-updated.v1`)
14. LevelUpChecker → AchievementGate when `` (emits `xiigen.completion-gamification.level-up-checked.v1`)
15. AchievementGate → SocialShareGate when `achievement unlocked` (emits `xiigen.completion-gamification.achievement-unlocked.v1`)
16. SocialShareGate → LearningFlowCompleted when `` (emits `xiigen.completion-gamification.social-gate-passed.v1`)
17. StreakManager → LearningFlowCompleted when `` (emits `xiigen.completion-gamification.streak-updated.v1`)
18. LearningFlowCompleted → LearningFlowCompleted when `terminal` (emits `xiigen.completion-gamification.flow-completed.v1`) [TERMINAL]

## Arbiter Verdicts

- **Arbiter 1 — Goal Delivery (edge+node formula: 10+8=18):** PASS — 18 items produced.
- **Arbiter 2 — Scope Isolation:** PASS — state descriptions reference nodes/events; no TypeScript types, no file paths, no class names.
- **Arbiter 3 — Terminal State Coverage:** PASS — terminal-labeled edges (condition contains 'terminal') appear as `[TERMINAL]` entries.
- **Arbiter 4 — Iron Rule Labels:** DEFERRED — CF-XX labels require cross-reference with `server/src/engine-contracts/{slug}-bfa-rules.ts`; applied in Phase 9 (edge case discovery) where iron rules directly govern edge cases.
- **Arbiter 5 — Branch Honest Flagging:** PASS (Branch A — no flag required).
