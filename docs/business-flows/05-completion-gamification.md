<!--
  Source: business flows.zip / 05-lesson-completion-gamification.md
  Canonical since: 2026-04-22
  Canonical flow: FLOW-05 completion-gamification
  Related deep-research: docs/business-flows/_deep-research/completion-gamification/ (if present)
  Related legacy engine artifacts: docs/business-flows/_legacy-engine-artifacts/completion-gamification/ (if present)
-->

# Lesson Completion & Gamification

> **Flow ID**: FLOW-05  
> **Drawio Diagram**: complete lesson  
> **Version**: 1.0  
> **Last Updated**: 2026-02-25  

---

## Short Description

Processes a completed lesson questionnaire through gamification scoring (points, levels, achievements, streaks), adaptive learning plan adjustment, and social distribution — converting answers into shareable content with peer grading and community engagement.

## Long Description

This flow activates when a user completes a lesson questionnaire within their personalized learning program. It connects three core platform pillars: learning, gamification, and social engagement.

First, the Gamification Service calculates a comprehensive point award based on correctness, speed, streaks, and quality of text answers. Points may trigger level-ups and achievement unlocks (common, rare, epic, legendary). Second, the Learning Plan Service adapts the user's curriculum using ML-based analysis — adjusting difficulty, pace, content type, and recommending next modules based on performance patterns across multiple factors.

Third, and uniquely to this flow, the user's answers are converted into social content. The Post Service creates a "questionnaire post" that shows selected answers and scores. This post is distributed via the standard feed pipeline (FLOW-04 pattern) but with learning-specific audience targeting: friends (30%), learning-focused groups (20%), similar learners by similarity threshold (30%), and matched businesses (20%). Peers can grade answers on four criteria (accuracy, depth, clarity, creativity) and leave categorized comments (support, question, challenge, insight), creating a community learning loop.

---

## Persona Descriptions

### For AI / Code Generation

```yaml
flow_id: FLOW-05
trigger_event: QuestionnaireAnswered (from Questionnaire Service)
prerequisite: User has active learning program (FLOW-02)

services:
  - questionnaire-service: Stores answers, calculates raw scores
  - gamification-service:  Awards points, checks level-ups, unlocks achievements
  - learning-plan-service: Adapts curriculum based on performance (ML-based)
  - post-service:          Creates social post from questionnaire answers
  - connection-service:    Identifies friend audience
  - group-service:         Identifies learning-focused groups
  - matching-service:      Finds similar learners + business matches
  - feed-service:          Distributes questionnaire post to feeds
  - notification-service:  Notifies on level-ups, achievements, grades

event_chain:
  gamification_branch:
    1. QuestionnaireAnswered → gamification-service
    2. GamificationPointsAwarded → ui-service, analytics-service
    3. UserLeveledUp (conditional) → notification-service, ui-service
    4. AchievementUnlocked (conditional) → notification-service, social-service
  
  learning_branch:
    1. QuestionnaireAnswered → learning-plan-service
    2. LearningPlanAdapted → notification-service, analytics-service
  
  social_branch:
    1. QuestionnaireAnswered → post-service
    2. QuestionnairePostCreated → connection-service, group-service, matching-service
    3. QuestionnaireAudienceIdentified → ranking-service
    4. QuestionnairePostRanked → feed-service
    5. QuestionnairePostDistributed → analytics-service
  
  engagement_events:  # After distribution
    6. AnswerGraded → gamification-service, analytics-service
    7. AnswerCommented → notification-service, gamification-service

gamification:
  base_points:
    complete_questionnaire: 10
    correct_answer: 5
    all_correct_bonus: 25
  time_bonuses:
    under_5_min: 10
    under_10_min: 5
  streak_bonuses:
    3_days: 5
    7_days: 15
    30_days: 50
  quality_bonuses:
    detailed_text: 5
    insightful_reflection: 10
    case_study_excellence: 15
  social_points:
    answer_liked: 2
    graded_4_plus: 5
    answer_commented: 3
    started_discussion: 10
  level_formula: "level_n = level_(n-1) * 1.5 + 100"

learning_adaptation:
  triggers:
    score_below_60: add_remedial_content
    score_above_90: skip_basic_modules
    time_gt_2x_average: slow_pace
    time_lt_half_average: speed_pace
    wrong_pattern_detected: add_practice
  constraints:
    max_changes_per_adaptation: 3
    min_lessons_between_adaptations: 2

social_distribution:
  audience_weights:
    friends: 0.30 (max 100, active in last 30 days)
    groups: 0.20 (learning-focused, max 10 groups)
    similar_learners: 0.30 (similarity > 0.6, max 200)
    businesses: 0.20 (relevance > 0.7, max 50)
```

### For Product Manager

**Business Value**: This flow is the engagement engine — it combines learning completion with gamification dopamine hits and social validation. The "learn and share" loop drives daily active usage, builds community, and creates network effects through peer grading.

**Key Metrics**:
- Lesson completion rate (started vs. completed)
- Average points per session, streak length distribution
- Level-up celebration engagement (screenshot shares, reactions)
- Questionnaire post engagement rate vs. regular post engagement
- Peer grading participation rate (% of users who grade others)
- Learning plan adaptation impact on completion rates

**A/B Testing**: Point values for different actions, streak bonus thresholds, social post format (full answers vs. summary), grading visibility rules (show after 3 grades vs. 5).

### For IT Security Manager

**Data Sensitivity**: Questionnaire answers may contain business strategies — classified as Confidential. Users must consent to social sharing of answers (opt-in per question). Grading is pseudonymous until 3+ grades (prevents single-grader bias reveal).

**Integrity**: Gamification points must be tamper-proof. Server-side calculation only — client cannot submit point values. Rate limit: max 1 questionnaire completion per lesson per hour (prevents point farming). Achievement unlocks validated server-side against actual event history.

**Privacy**: Users can set their learning activity to private (disables social branch entirely). Grades are aggregated — individual grader identity hidden until public threshold reached.

### For DevOps

**Services**: Questionnaire Service (Nest.js), Gamification Service (Nest.js + InfluxDB), Learning Plan Service (Python + ML), Post Service (Nest.js + MongoDB), Feed pipeline services (same as FLOW-04).

**Processing Profile**: Gamification is low-latency (must respond within 1s for UI dopamine). Learning adaptation is async (ML inference, 2-5s). Social distribution follows FLOW-04 pattern but with smaller audience.

**Key Alerts**: Gamification calculation > 2s, learning adaptation failure > 5%, point inflation anomalies (sudden spikes), achievement unlock rate deviation from expected distribution.

**Failure Modes**: Gamification failure = points delayed (queue and retry, user sees points on next refresh). Learning adaptation failure = plan unchanged (safe default). Social distribution failure = no social post created (non-critical, learning still tracked).

---

## User Story

**Learner**: As a business owner completing a lesson, I want to earn points for my answers and see my progress, so that I stay motivated to continue learning.

**Social Learner**: As a platform user, I want to see what my connections are learning and grade their answers, so that we can learn from each other.

**Achiever**: As a competitive user, I want to unlock achievements and climb the leaderboard, so that I feel recognized for my learning commitment.

## Business Flow (Happy Path)

1. User completes lesson questionnaire (answers all questions)
2. Questionnaire Service validates, scores, and stores answers
3. Questionnaire Service publishes `QuestionnaireAnswered` event
4. **Gamification Branch** (parallel):
   - Gamification Service calculates base + bonus + streak points
   - Publishes `GamificationPointsAwarded`
   - If point threshold crossed: publishes `UserLeveledUp`
   - If achievement criteria met: publishes `AchievementUnlocked`
5. **Learning Branch** (parallel):
   - Learning Plan Service analyzes performance pattern via ML
   - Adjusts curriculum (difficulty, pace, next modules)
   - Publishes `LearningPlanAdapted`
6. **Social Branch** (parallel):
   - Post Service creates questionnaire post from selected answers
   - Publishes `QuestionnairePostCreated`
   - Connection, Group, and Matching services identify audience
   - Ranking Service calculates feed positions
   - Publishes `QuestionnairePostRanked`
   - Feed Service distributes to recipient feeds
   - Publishes `QuestionnairePostDistributed`
7. Peers see the post, can grade (accuracy/depth/clarity/creativity 1-5) and comment
8. Grading events award social points to the original author

## Scenarios

### Scenario 1: Perfect Score with Speed Bonus
- All answers correct + under 5 minutes = 10 + (N×5) + 25 + 10 points
- Triggers "Speed Demon" achievement if first time
- Learning plan skips next basic module

### Scenario 2: Struggling Learner (Score < 60%)
- Fewer points but still completion points (10)
- Learning plan adds remedial content
- Social post shows "In Progress" badge (not full scores)
- System sends encouraging notification

### Scenario 3: 30-Day Streak Achievement
- 50 bonus streak points + "Dedicated Learner" legendary achievement
- Social post auto-generated celebrating the streak
- Notification to all connections

### Scenario 4: User Opts Out of Social Sharing
- Gamification and learning branches execute normally
- Social branch skipped entirely
- Answers remain private to user and analytics

## Edge Cases

1. **Duplicate submission**: User clicks submit twice. Idempotency key on questionnaireId + userId + attemptNumber. Second submission returns cached result.

2. **Streak reset at timezone boundary**: User in UTC+12 completes at 11:59 PM, server in UTC. Streaks calculated in user's local timezone.

3. **Point overflow**: User accumulated 2^31 points (unlikely but handle). Use BigInt for point storage.

4. **Achievement criteria changed after unlock**: Grandfather existing unlocks. New criteria apply only to future unlocks.

5. **ML model returns invalid adaptation**: Validation layer rejects changes that remove required curriculum modules. Max 3 changes per adaptation enforced.

6. **Grading spam**: One user grades 100 answers in 1 minute. Rate limit: 20 grades per hour. Anomaly detection flags patterns.

## Business Logic

### Point Calculation
```
total = base(10) + correct_answers(N × 5) + all_correct_bonus(25) + 
        time_bonus(10|5|0) + streak_bonus(5|15|50) + quality_bonus(5|10|15)
```

### Level Progression
```
Level 1: 0-100 points
Level 2: 101-300 points  
Level 3: 301-600 points
Level N: level_(N-1) × 1.5 + 100
```

### Learning Plan Adaptation Rules
- Score < 60%: add remedial content
- Score > 90%: skip basic modules
- Time > 2× average: slow pace
- Time < 0.5× average: speed pace
- Wrong answer pattern detected: add targeted practice
- Max 3 changes per adaptation, min 2 lessons between adaptations

### Grading System
- Four criteria: accuracy (1-5), depth (1-5), clarity (1-5), creativity (1-5)
- Public grades shown after 3+ unique graders
- Grade others: 1 point; receive grade 4+: 5 points; top answer of day: 20 points

## Event Definitions

| Event | Publisher | Consumers | Key Payload Fields |
|-------|-----------|-----------|-------------------|
| `QuestionnaireAnswered` | Questionnaire Service | Gamification, Learning Plan, Post, Analytics | questionnaireId, userId, lessonId, answers[]{questionId, type, answer, isCorrect, timeSpent, confidence}, score, metadata |
| `GamificationPointsAwarded` | Gamification | UI, Analytics | userId, points (base, correctAnswers, speedBonus, perfectScore, streakBonus, total), currentLevel, streakDays |
| `UserLeveledUp` | Gamification | Notification, UI | userId, previousLevel, newLevel, unlockedFeatures, nextLevelRequirement |
| `AchievementUnlocked` | Gamification | Notification, UI, Social | userId, achievement (id, name, description, badge, rarity), triggerEvent |
| `LearningPlanAdapted` | Learning Plan | Notification, Analytics | userId, adaptations[]{type, details, reason}, nextModules, difficultyChange, paceAdjustment |
| `QuestionnairePostCreated` | Post Service | Connection, Group, Matching | postId, userId, lessonId, selectedAnswers, score, socialSettings |
| `QuestionnaireAudienceIdentified` | Matching | Ranking | postId, audience[]{userId, source, relevanceScore} |
| `QuestionnairePostRanked` | Ranking | Feed Service | postId, rankedRecipients[]{userId, tier, position} |
| `QuestionnairePostDistributed` | Feed Service | Analytics | postId, distributionMetrics |
| `AnswerGraded` | Grading Service | Gamification, Analytics | answerId, graderId, authorId, grades (accuracy, depth, clarity, creativity) |
| `AnswerCommented` | Comment Service | Notification, Gamification | answerId, commenterId, authorId, commentType, content |

## Services Involved

| Service | Role in Flow | Database | Scales On |
|---------|-------------|----------|-----------|
| Questionnaire Service | Answer storage and scoring | MongoDB | Request count |
| Gamification Service | Points, levels, achievements, streaks | InfluxDB + Redis | Event throughput |
| Learning Plan Service | ML-based curriculum adaptation | MongoDB + ML model store | CPU/GPU (inference) |
| Post Service | Creates social post from answers | MongoDB | Request count |
| Feed pipeline (Connection, Group, Matching, Ranking, Feed) | Standard distribution | Same as FLOW-04 | Same as FLOW-04 |
| Notification Service | Level-up, achievement, grade notifications | Redis pub/sub | Event throughput |

To extend the capabilities of the **XIIGen** platform with the **Lesson Completion & Gamification (FLOW-05)** process, the integration will leverage the existing microservices architecture, specifically utilizing the **Business Flow Arbiter (BFA)** to manage the new logic and event chains.

### 1. Process Overview: FLOW-05

The process converts raw learning data (questionnaire answers) into a three-pillar output: adaptive learning, psychological rewards, and social engagement.

* **Trigger**: A `QuestionnaireCompleted` event from the **Questionnaire Service** (#51).
* **Gamification Logic**: The **Gamification Service** (#60) calculates points based on speed, accuracy, and streaks, potentially triggering level-ups or achievement unlocks (Common to Legendary).
* **Adaptive Learning**: The **Learning Plan Service** (#59) analyzes performance patterns via ML models to adjust the difficulty and pace of future modules.
* **Social distribution**: The **Post Service** (#52) generates a "Questionnaire Post" highlighting scores and answers, which is then distributed using the established **FLOW-04 (Feed Distribution)** pattern.

### 2. Technical Integration Strategy

The platform's existing skill set and infrastructure (Kubernetes, .NET Core/Python, Redis, Elasticsearch) will be extended as follows:

* **Service Roles & Databases**:
* **Questionnaire Service (#51)**: Manages answer storage and initial scoring in **MongoDB**.
* **Gamification Service (#60)**: Handles high-throughput point events using **InfluxDB** for time-series tracking and **Redis** for real-time streaks.
* **Learning Service (#59)**: Hosts ML models for curriculum adaptation, scaling on CPU/GPU depending on inference load.
* **Feed Pipeline**: Reuses the **Matching (#47)**, **Ranking (#54)**, and **Feed (#46)** services to target specific social segments (e.g., 30% similar learners, 20% learning groups).


* **Event-Driven Chain**:
1. `QuestionnaireCompleted` → Triggered by User.
2. `PointsAwarded` / `AchievementUnlocked` → Managed by **Notification Service (#24)**.
3. `LearningPlanAdapted` → Updates user profile state.
4. `QuestionnairePostCreated` → Hands off to the Feed distribution pipeline.



### 3. Business Flow Arbiter (BFA) Updates

To ensure this new flow remains stable during future platform updates, the **BFA** must incorporate the following validation rules:

* **Zero-Regression Check**: Any code change to the **Post Service** or **Feed Pipeline** must be validated against the `QuestionnairePostCreated` event to ensure social distribution for learners isn't broken.
* **Cross-Service Consistency**: The BFA will enforce that a `QuestionnaireCompleted` event *must* successfully resolve in both the Gamification and Learning services before the flow is marked complete.
* **UI/UX Guardrails**: Validates that achievement notifications do not overlap or conflict with standard system alerts handled by the **Notification Service**.

### 4. Data Flow & Scaling

* **Analytics**: A dedicated `AnswerGraded` event sends clarity and depth metrics to the **Analytics Service (#48)** to track overall platform education effectiveness.
* **Scaling**: The **Gamification** and **Notification** services will scale based on event throughput (Redis pub/sub), while the **Learning Service** scales based on the complexity of the performance-pattern analysis.
To extend the **XIIGen platform** with the lesson completion and gamification process, the system integrates learning performance with social distribution and automated curriculum adjustments. This new workflow, identified as **FLOW-05**, builds upon existing services to convert educational progress into community-driven social engagement.

### **Core Workflow (FLOW-05)**

The process is triggered when a user completes a lesson questionnaire and follows a multi-service execution path:

* **Gamification Engine (#60)**: Calculates point awards based on correctness, speed, and streaks. It also manages the unlocking of achievements ranging from common to legendary status.
* **Adaptive Learning Plan (#59)**: Uses machine learning to analyze performance patterns and automatically adjust the user’s curriculum, including difficulty levels and content recommendations.
* **Social Distribution Pipeline**: The **Post Service (#52)** converts questionnaire answers into a specialized "questionnaire post". This content is then distributed through the standard feed pipeline (similar to **FLOW-04**) but targeted toward learning-focused audiences, such as peer groups and similar learners.
* **Notification Management (#24)**: Handles the delivery of achievement alerts and point awards to the user interface.

### **Platform Extension & Integration**

The integration relies on an **Event-Driven Chain** using **Redis pub/sub** for high throughput:

1. **QuestionnaireCompleted**: The initial event triggered by the user.
2. **PointsAwarded / AchievementUnlocked**: Managed by the **Notification Service**.
3. **LearningPlanAdapted**: Updates the user’s profile state and future modules.
4. **QuestionnairePostCreated**: Hands off the generated content to the Feed distribution pipeline.

### **Business Flow Arbiter (BFA) Governance**

To ensure stability during platform updates, the **BFA** enforces specific validation rules for this flow:

* **Zero-Regression Check**: Ensures changes to the **Post Service** do not break the social distribution of learning content.
* **Cross-Service Consistency**: Mandates that the `QuestionnaireCompleted` event must successfully resolve in both Gamification and Learning services before the flow is marked as complete.
* **UI/UX Guardrails**: Prevents overlapping notifications or conflicting system alerts.

### **Data & Analytics**

* **Analytics Service (#48)**: Receives a dedicated `AnswerGraded` event to track clarity, depth, and overall educational effectiveness across the platform.
* **Scaling Strategy**: The **Learning Service** scales based on the complexity of performance analysis, while Gamification and Notifications scale based on event volume.