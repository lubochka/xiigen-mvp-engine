<!--
  Source: business flows.zip / 02-business-onboarding.md
  Canonical since: 2026-04-22
  Canonical flow: FLOW-02 profile-enrichment
  Related deep-research: docs/business-flows/_deep-research/profile-enrichment/ (if present)
  Related legacy engine artifacts: docs/business-flows/_legacy-engine-artifacts/profile-enrichment/ (if present)
-->

# Business Onboarding & Personalization

> **Flow ID**: FLOW-02  
> **Drawio Diagram**: onboarding  
> **Version**: 1.0  
> **Last Updated**: 2026-02-25  

---

## Short Description

Processes the user's completed questionnaire to build a business profile, generate a personalized learning program, run AI-powered matching against other businesses, and adapt both the user feed and events feed to the user's industry, goals, and stage.

## Long Description

This flow begins immediately after the user completes the initial questionnaire (triggered by `QuestionnaireCompleted` from FLOW-01). It represents the platform's "intelligence layer" — the series of parallel and sequential processes that transform raw questionnaire answers into a fully personalized experience.

The flow has three concurrent processing branches. First, the Business Service creates a structured business profile from the questionnaire responses (industry, stage, team size, goals, challenges). Second, the Analytics Service analyzes the user's profile to segment them and identify behavioral patterns. Third, the Learning Service generates a customized learning program based on the user's identified skill gaps and business challenges.

Once the business profile is created and categorized, the Matching Service runs compatibility algorithms against all other businesses on the platform, producing ranked match suggestions with scores and match reasons. These matches feed into two personalization endpoints: the Feed Service adapts the user's content feed (posts, articles, updates from matched businesses), and the Events Service adapts the events feed (upcoming events relevant to the user's industry, stage, and learning path). The flow completes with `OnboardingCompleted`, marking the user as fully personalized.

---

## Persona Descriptions

### For AI / Code Generation

```yaml
flow_id: FLOW-02
trigger_event: QuestionnaireCompleted (from FLOW-01)
prerequisite: User must be created and activated (FLOW-01 complete)

services:
  - business-service:     Creates structured business profile from questionnaire
  - analytics-service:    Segments user, identifies patterns, categorizes business
  - learning-service:     Generates personalized curriculum from skill gaps
  - matching-service:     Runs compatibility algorithms, produces ranked matches
  - feed-service:         Adapts user content feed based on profile + matches
  - events-service:       Adapts events feed based on interests + learning path
  - recommendation-engine: Stores learning preferences, coordinates personalization
  - notification-service:  Sends match notifications
  - ui-service:           Receives final personalized feeds for rendering

event_chain:
  parallel_branch_1:  # Business Profile
    1. QuestionnaireCompleted → business-service
    2. BusinessProfileCreated → learning-service, matching-service, feed-service, events-service
    3. BusinessCategorized → feed-service, matching-service
  
  parallel_branch_2:  # Analytics
    1. QuestionnaireCompleted → analytics-service
    2. UserProfileAnalyzed → recommendation-engine
  
  parallel_branch_3:  # Learning
    1. BusinessProfileCreated → learning-service
    2. LearningProgramGenerated → recommendation-engine, feed-service, events-service
    3. LearningPreferencesStored → feed-service
  
  convergence:  # After branches complete
    1. BusinessMatchesFound → feed-service, events-service, notification-service
    2. ConnectionSuggestionsReady → ui-service, notification-service
    3. UserFeedPersonalized → ui-service, analytics-service
    4. EventFeedPersonalized → ui-service, calendar-service
    5. OnboardingCompleted → analytics-service, notification-service

matching_algorithm:
  compatibility_score:
    industry_match: 0.30      # Same/complementary industries score higher
    location_proximity: 0.25  # Closer = higher score
    business_stage: 0.25      # Similar or complementary stages
    interest_overlap: 0.20    # Shared goals and challenges
  
  match_types:
    - complementary:  Different industries that benefit each other
    - peer:          Same industry, similar stage
    - mentor:        Same industry, advanced stage + early stage
    - collaborative: Shared goals, different expertise

caching_strategy:
  user_preferences: 24h
  feed_content: 1h
  event_recommendations: 4h
  business_matches: 12h

data_stores:
  - MongoDB: business profiles, questionnaire responses
  - PostgreSQL: structured business data, match results
  - Redis: match cache, feed cache, recommendation cache
  - Elasticsearch: business search index, categorization
```

### For Product Manager

**Business Value**: This is where the platform delivers its core value proposition — intelligent matching and personalization. The quality of matches and feed relevance directly determines user retention and engagement.

**Key Metrics to Track**:
- Match acceptance rate (how often users connect with suggested matches)
- Feed engagement rate (clicks, time spent on personalized feed vs. generic)
- Learning program start rate and completion rate
- Time from questionnaire completion to first match suggestion
- Net Promoter Score correlation with match quality
- Event attendance rate for recommended vs. non-recommended events

**Feature Dependencies**: Depends on FLOW-01 (registration + questionnaire). Feeds into FLOW-03 (event suggestions), FLOW-04 (post distribution), and FLOW-07 (friend requests from match suggestions).

**A/B Testing Opportunities**:
- Matching algorithm weights (industry 30% vs. 40%)
- Number of match suggestions shown (5 vs. 10 vs. progressive loading)
- Learning program format (structured curriculum vs. ad-hoc recommendations)
- Feed mix ratio (matched content vs. trending content vs. learning content)

**User Journey Context**: User just completed questionnaire → sees "Personalizing your experience..." loading state → receives notification "We found 12 business matches for you!" → Feed shows relevant posts from matched businesses → Events feed shows industry-specific upcoming events → Learning tab shows customized curriculum.

### For IT Security Manager

**Data Sensitivity**:
- Business details: revenue range, team size, target market — classified as Confidential
- Matching results: who matches with whom reveals business strategies — classified as Internal
- Learning preferences: skill gaps could be competitively sensitive — classified as Internal

**Access Control**:
- Match results: only visible to the matched users (bilateral consent model)
- Business profile: configurable privacy levels (public fields vs. connections-only fields)
- Learning data: private to the user, aggregated anonymously for analytics

**Data Flow Security**:
- All inter-service communication over mTLS within Kubernetes cluster
- Business profile data encrypted at rest in MongoDB (field-level encryption for revenue)
- Match scores stored in Redis with TTL (12h) — not persisted long-term
- Analytics data anonymized before storage (no PII in analytics pipeline)

**Privacy Considerations**:
- Users can opt out of matching (reduces platform value but respects privacy)
- Match reasons shown to users must not reveal other users' private business details
- "Similar businesses" feature must use k-anonymity (minimum group size of 5)

**Compliance**: GDPR data portability — all business profile data must be exportable. Right to erasure cascades to match results, feed configurations, and learning programs.

### For DevOps

**Services to Deploy**:
| Service | Tech Stack | Scaling | Critical Path? |
|---------|-----------|---------|---------------|
| business-service | Nest.js | Request-based | Yes |
| analytics-service | Python + pandas | CPU-heavy, batch | No (async) |
| learning-service | Python + ML pipeline | CPU/GPU for generation | No (async) |
| matching-service | Python + scikit-learn | CPU-heavy, batch + real-time | Yes |
| feed-service | Nest.js + Redis | Memory-based (cache) | Yes |
| events-service | Nest.js | Request-based | No |
| recommendation-engine | Python + TensorFlow | GPU for inference | No (async) |

**Infrastructure Dependencies**:
- PostgreSQL: business data (matching-service writes, others read via replicas)
- MongoDB: business profiles (replica set, read preference: secondaryPreferred)
- Redis: caching layer (6 different TTL patterns, Cluster mode for partitioning)
- Elasticsearch: business categorization, full-text search
- Kafka topics: `business-events`, `matching-events`, `activity-events`

**Processing Characteristics**:
- This flow is CPU-intensive (ML matching, analytics, learning generation)
- Matching for a new user scans ~all active businesses (batch operation)
- Initial matching may take 5-30s depending on platform size
- Feed and event personalization should complete within 2s after matches are ready

**Monitoring & Alerting**:
- Alert: matching latency > 30s for new user
- Alert: feed personalization failure rate > 5%
- Alert: learning program generation failure > 10%
- Dashboard: matching quality distribution, feed freshness, cache hit rates
- Trace: correlation ID across all 11 events in the flow

**Failure Modes**: Analytics failure = degraded personalization (fallback to industry defaults). Matching failure = no suggestions (show "Still finding matches, check back soon"). Feed failure = show generic trending content. All are graceful degradation, not hard failures.

---

## User Story

**Primary**: As a newly registered small business owner, I want the platform to analyze my questionnaire answers and automatically show me relevant businesses, content, and events, so that I immediately see value without having to manually search.

**Learning**: As a business owner with skill gaps, I want a personalized learning program generated from my challenges, so that I can improve my business while networking.

**Matching**: As a business owner, I want to see why I was matched with each suggestion (match reasons), so that I can prioritize which connections to pursue.

## Business Flow (Happy Path)

1. `QuestionnaireCompleted` event received by Business Service, Analytics Service, and Learning Service (parallel)
2. Business Service extracts structured business details from responses
3. Business Service creates BusinessProfile document in MongoDB
4. Business Service publishes `BusinessProfileCreated` event
5. Analytics Service analyzes user profile segments and behavior patterns
6. Analytics Service publishes `UserProfileAnalyzed` event
7. Analytics Service categorizes the business (industry tags, maturity level)
8. Analytics Service publishes `BusinessCategorized` event
9. Learning Service receives BusinessProfile, identifies skill gaps
10. Learning Service generates personalized curriculum (modules, duration, difficulty)
11. Learning Service publishes `LearningProgramGenerated` event
12. Recommendation Engine stores learning preferences
13. Recommendation Engine publishes `LearningPreferencesStored` event
14. Matching Service receives BusinessProfile + BusinessCategorized
15. Matching Service runs compatibility algorithm against all active businesses
16. Matching Service produces ranked matches with scores and reasons
17. Matching Service publishes `BusinessMatchesFound` event
18. Matching Service generates connection suggestions
19. Matching Service publishes `ConnectionSuggestionsReady` event
20. Feed Service receives matches + learning preferences + categories
21. Feed Service builds personalized content feed configuration
22. Feed Service publishes `UserFeedPersonalized` event
23. Events Service receives matches + learning program + business profile
24. Events Service builds personalized event recommendations
25. Events Service publishes `EventFeedPersonalized` event
26. Notification Service sends "Your personalized experience is ready!" notification
27. Business Service confirms all steps complete
28. Business Service publishes `OnboardingCompleted` event

## Scenarios

### Scenario 1: Business in Niche Industry
- Questionnaire indicates a very specialized industry (e.g., "marine biotechnology")
- Matching Service finds few exact matches but identifies complementary industries
- System broadens match criteria: adjacent industries, similar challenges, same business stage
- Learning program focuses more on cross-industry skills

### Scenario 2: Serial Entrepreneur (Multiple Businesses)
- User indicates they run multiple businesses
- System creates multiple BusinessProfile records linked to one user
- Matching runs separately for each business, results merged and deduplicated
- Feed combines recommendations from all business profiles

### Scenario 3: Returning User Re-takes Questionnaire
- User's business evolves, they update their questionnaire answers
- System triggers full re-personalization flow
- Old matches are not deleted but rescored
- Feed transitions gradually (not jarring overnight change)

### Scenario 4: Minimal Questionnaire Completion
- User skips optional questions, provides only required fields
- System has limited data for matching — lower confidence scores
- Feed shows broader content, learning program is more generic
- System prompts user to complete optional fields for better matches

## Edge Cases

1. **Zero matches found**: New platform with few users, or extremely niche business. Show "We're growing! Here are trending businesses in your region" with generic recommendations. Queue for re-matching when new businesses register.

2. **Matching Service timeout**: Algorithm takes too long on large dataset. Implement circuit breaker (30s timeout). Return partial results with "More matches coming soon" indicator.

3. **Circular matching dependency**: Business A matches B, B matches C, C matches A. Not a problem — matches are bidirectional but independent. Each user sees their own ranked list.

4. **Stale cache after profile update**: User updates business profile while cached matches exist. Publish cache invalidation event on profile change. Re-run matching async.

5. **Analytics Service produces conflicting categorization**: ML model categorizes business as "Tech" but user self-reported "Healthcare". Trust user input as primary, use ML as secondary signal. Flag for review if divergence is >2 categories.

6. **Learning program references unavailable content**: Module in curriculum points to content that was deleted or restricted. Learning Service validates content availability before publishing program. Replace unavailable modules with alternatives.

7. **High-frequency questionnaire updates**: User changes answers repeatedly within short period. Debounce: only re-process if >5 minutes since last completion. Queue latest answers, discard intermediate.

## Business Logic

### Compatibility Score Algorithm
```
score = (industry_match × 0.30) + (location_proximity × 0.25) + 
        (business_stage_match × 0.25) + (interest_overlap × 0.20)
```

**Industry Match (0-1)**: 1.0 = same industry, 0.7 = complementary (from predefined matrix), 0.3 = same sector, 0.0 = unrelated

**Location Proximity (0-1)**: 1.0 = same city, 0.8 = <50km, 0.5 = same region, 0.3 = same country, 0.1 = international

**Business Stage Match (0-1)**: 1.0 = same stage, 0.8 = adjacent stages (mentor potential), 0.4 = distant stages, 0.0 = incompatible

**Interest Overlap (0-1)**: Jaccard similarity of goals + challenges arrays

### Match Types
- **Peer**: Same industry + similar stage (score > 0.7)
- **Mentor**: Same industry + advanced stage matched with early stage
- **Complementary**: Different industry + high interest overlap
- **Collaborative**: Shared goals + different expertise areas

### Feed Personalization Weights
- Matched business content: 40%
- Industry trending content: 25%
- Learning-related content: 20%
- Platform trending content: 15%

### Caching TTLs
- Business matches: 12 hours
- Feed configuration: 1 hour
- Event recommendations: 4 hours
- User preferences: 24 hours

## Event Definitions

| Event | Publisher | Consumers | Key Payload Fields |
|-------|-----------|-----------|-------------------|
| `QuestionnaireCompleted` | Questionnaire Service | Business, Analytics, Learning | userId, questionnaireId, responses (industryFocus, businessStage, primaryGoals, challenges, teamSize) |
| `UserProfileAnalyzed` | Analytics Service | Recommendation Engine | userId, profileSegments, behaviorPatterns |
| `BusinessProfileCreated` | Business Service | Learning, Matching, Feed, Events | userId, businessId, businessDetails (name, industry, subIndustry, size, location, yearFounded, revenue, targetMarket) |
| `BusinessCategorized` | Analytics Service | Feed, Matching | businessId, categories, tags, maturityLevel |
| `LearningProgramGenerated` | Learning Service | Recommendation Engine, Feed, Events | userId, programId, curriculum (modules, duration, difficulty, skills), learningPath |
| `LearningPreferencesStored` | Recommendation Engine | Feed Service | userId, preferences (topics, formats, pace, timeCommitment) |
| `BusinessMatchesFound` | Matching Service | Feed, Events, Notification | businessId, matches[]{matchedBusinessId, matchScore, matchReasons, matchType}, totalMatches |
| `ConnectionSuggestionsReady` | Matching Service | UI, Notification | userId, suggestions[]{suggestedUserId, businessId, relevanceScore, commonInterests} |
| `UserFeedPersonalized` | Feed Service | UI, Analytics | userId, feedConfiguration (contentTypes, topics, sources, refreshInterval), recommendations |
| `EventFeedPersonalized` | Events Service | UI, Calendar | userId, eventRecommendations[]{eventId, relevanceScore, eventType, scheduledDate} |
| `OnboardingCompleted` | Business Service | Analytics, Notification | userId, businessId, completedSteps, personalizationLevel |

## Services Involved

| Service | Role in Flow | Database | Scales On |
|---------|-------------|----------|-----------|
| Business Service | Creates business profile from questionnaire | MongoDB + PostgreSQL | Request count |
| Analytics Service | Segments user, categorizes business | Elasticsearch | CPU (ML inference) |
| Learning Service | Generates personalized curriculum | MongoDB | CPU (content matching) |
| Matching Service | Runs compatibility algorithms | PostgreSQL + Redis + Elasticsearch | CPU (algorithm runs), memory (cache) |
| Feed Service | Builds personalized content feed | Redis + Elasticsearch | Memory (cache), request count |
| Events Service | Builds personalized event recommendations | PostgreSQL + Redis | Request count |
| Recommendation Engine | Coordinates personalization, stores preferences | Redis + MongoDB | CPU (TensorFlow inference) |
| Notification Service | Sends match and completion notifications | Redis (pub/sub) | Event throughput |
| UI Service | Receives and renders personalized feeds | Redis (cache) | WebSocket connections |

To extend the capabilities of the designed platform with the process described in the business onboarding documentation, we should implement a new core service and update the orchestration logic to handle the multi-branch parallel execution defined in **FLOW-02**.

### 1. New Core Skill: Skill 64 — Business Profile Service

The current **Master Skills Index** (V17/V18) includes 63 skills, but the process described requires a dedicated **Business Service** to handle the transformation of raw questionnaire data into a structured business profile.

* **Role**: Serves as the primary authority for business entities, managing profiles, stages, and team configurations.
* **Infrastructure**: Implements a dual-storage strategy using the **Database Fabric (Skill 05)**, with **PostgreSQL** for relational profile structures and **MongoDB** for unstructured business goals and questionnaire history.
* **Interface**: Implements `IMicroservice` and `IQueryHandler` to integrate with the **API Gateway (Skill 15)**.

### 2. Updated Flow Orchestration (Skill 08 & 09)

The existing **User Onboarding Flow (`02-onboarding-flow.json`)** must be updated to match the parallel processing branches described in the new specification.

* **Parallel Branching**: The **Flow Orchestrator (Skill 09)** should be configured to trigger three concurrent tasks upon the `QuestionnaireCompleted` event:
1. **Profile Creation**: Handled by the new Business Service.
2. **User Segmentation**: Handled by the **Analytics Service (Skill 48)** using **Elasticsearch** for behavioral pattern identification.
3. **Curriculum Generation**: Handled by the **Learning Service (Skill 59)** to produce personalized learning paths.


* **Dependency Management**: The **Matching Service (Skill 47)** must be set as a sequential step that waits for the `BusinessProfileCreated` event before running compatability algorithms against other platform entities.

### 3. Data Flow and Personalization Layer

The platform’s "intelligence layer" is extended by integrating the output of the **Matching Service** and **Analytics Service** directly into the delivery services:

* **Feed Personalization**: The **Feed Service (Skill 46)** consumes `ProfileFeedPersonalized` events to adapt content to the user's industry and goals.
* **Event Recommendations**: The **Events Service (Skill 53)** utilizes the `EventFeedPersonalized` payload to suggest relevant scheduled activities.
* **Real-time Updates**: The **Notification Service (Skill 24)** sends the final `OnboardingCompleted` alert via **Redis Pub/Sub** once all concurrent branches and the matching logic are finalized.

### 4. Integration with Genie DNA

This process aligns with the **Genie DNA Composition Layer** by forming the core of the **Onboarding & CRM Module**.

* **Module Mapping**: The flow utilizes skills across the **Intelligence Layer** (Skills 47, 48, 54) and **Delivery Layer** (Skills 46, 53) to provide the "personalized experience" target of the V18 meta-architecture.
* **Scale Strategy**: Per the documentation, the **Analytics** and **Learning** services should be scaled on **CPU (ML inference)**, while the **Feed** and **Matching** services should prioritize **Memory (Redis cache)** to handle high-frequency personalization requests.