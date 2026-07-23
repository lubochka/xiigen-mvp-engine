# Flow UI examination — FLOW-05 completion-gamification

## Date: 2026-04-20 · Run: RUN-58 · Batch: D (Grammar 5 Kiosk celebratory)

## One-sentence spec (F1)
> When a community member completes an activity on the XIIGen platform, record the
> completion, update their gamification ledger, and recalculate their streak logic.

## Roles (F3 — `ROLE-ANALYSIS-BATCH-01.md`)
- **tenant-user** — primary; earns XP / badges / streaks on activity completion
- **tenant-admin** — view cohort completion metrics
- **platform-admin** — cross-tenant gamification policy

## Grammar
**G5 Kiosk celebratory** for lesson-completion moment (the PNG-visible state).
**G6 Dashboard** for admin cohort metrics.
**G3 Card List** for learning-progress history.

**Reference:** **Duolingo** (celebratory completion animation, streak counter, XP reveal), **Khan Academy** (next-lesson dominant CTA), **Codecademy** (badge reveal).

## F4 Business doc
`business_flows.zip / 05-lesson-completion-gamification.md`

## Classification
- **Q1 CRUD?** ❌ NO — 4 dedicated pages (GamificationDashboardPage / LearningProgressPage / LessonCompletionPage / SocialLearningPage). Good page split.
- **Q2 Error/empty?** No-activity empty state: "Complete your first lesson to start a streak".
- **Q3 Engineering leak?** "Gamification ledger", "streak logic" must not appear.
- **Q4 Role-correct?** ✅ 4 pages cover roles.

**Primary finding:** likely 🟡 partial — celebratory animation + streak counter must be prominent.

## 29 existing PNGs

## Planned fixes
- **LessonCompletionPage**: full-screen kiosk, confetti or badge animation, XP reveal ("+50 XP"), streak counter prominent (flame icon + day count), "Next lesson →" primary CTA
- **GamificationDashboardPage**: XP tile + streak tile + badge grid; "Recent achievements" card list
- **LearningProgressPage**: course-progress bars (per enrolled course) + "Continue where you left off" CTA
- **SocialLearningPage**: feed of peer completions (similar to FLOW-07) with cheering / high-five affordances
