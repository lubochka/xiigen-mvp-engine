<!--
  Source: business flows.zip / 07-friend-request-feed-integration.md
  Canonical since: 2026-04-22
  Canonical flow: FLOW-07 friend-request-social-feed
  Related deep-research: docs/business-flows/_deep-research/friend-request-social-feed/ (if present)
  Related legacy engine artifacts: docs/business-flows/_legacy-engine-artifacts/friend-request-social-feed/ (if present)
-->

# Friend Request & Feed Integration

> **Flow ID**: FLOW-07  
> **Drawio Diagram**: friend request  
> **Version**: 1.0  
> **Last Updated**: 2026-02-25  

---

## Short Description

Handles the full friend request lifecycle — from sending a request through acceptance, multi-dimensional weight calculation (match grade, shared groups, co-attended events, purchase overlap, questionnaire similarity), historical post integration into both users' feeds, and ongoing connection strength evolution.

## Long Description

This flow manages social connections between business owners. Unlike simple "add friend" systems, this platform calculates a rich integration weight that determines how deeply two users' feeds merge after connecting.

When User A sends a friend request to User B, the Matching Service immediately calculates an initial compatibility score. When User B accepts, the Feed Integration Service orchestrates a complex weight calculation process. Four parallel services compute sub-weights: the Group Service analyzes shared group memberships and activity overlap; the Event Service examines co-attended events and shared registrations; the Purchase History Service evaluates marketplace purchase category overlap; and the Questionnaire Service compares answers, scores, and learning paths.

The Weight Calculation Service combines these (base match 25%, groups 20%, events 20%, purchases 15%, questionnaires 20%) with ML optimization adjustments. Based on the final integration weight, the Feed Integration Service pulls historical posts from both users (last 30 days, volume based on connection strength) and inserts them into each other's feeds at positions calculated by the integration weight. Strong connections (>0.8) get 20 posts in top 20% of feed; medium (0.5-0.8) get 10 posts in middle 40%; weak (<0.5) get 5 posts in bottom 40%.

Connection strength evolves over time based on interaction frequency, engagement quality, and reciprocal actions, dynamically adjusting feed integration levels.

---

## Persona Descriptions

### For AI / Code Generation

```yaml
flow_id: FLOW-07
entry_point: POST /relations/connect
prerequisite: Both users registered and onboarded (FLOW-01 + FLOW-02)

services:
  - connection-service:       Manages request lifecycle, stores connections (Neo4j)
  - matching-service:         Calculates initial match score
  - notification-service:     Request and acceptance notifications
  - feed-integration-service: Orchestrates weight calculation and feed merge
  - group-service:            Shared group analysis
  - event-service:            Co-attended event analysis
  - purchase-history-service: Purchase category overlap
  - questionnaire-service:    Answer similarity analysis
  - weight-calculation-service: Combines all weights with ML adjustment
  - feed-service:             Historical post integration and ongoing feed merge

event_chain:
  request_phase:
    1. FriendRequestSent → notification-service, matching-service, analytics-service
    2. InitialMatchCalculated → connection-service, feed-integration-service
  
  acceptance_phase:
    3. FriendRequestAccepted → notification-service, feed-integration-service, analytics-service
    4. FeedIntegrationStarted → group-service, event-service, purchase-history-service, questionnaire-service
  
  weight_calculation (parallel):
    5. GroupWeightCalculated → weight-calculation-service
    6. EventWeightCalculated → weight-calculation-service
    7. PurchaseWeightCalculated → weight-calculation-service
    8. QuestionnaireWeightCalculated → weight-calculation-service
  
  integration_phase (after all weights):
    9. FinalWeightCalculated → feed-integration-service
    10. HistoricalPostsIntegrated → feed-service, analytics-service
    11. FeedIntegrationCompleted → notification-service, analytics-service

weight_formula:
  components:
    base_match: 0.25
    group_weight: 0.20
    event_weight: 0.20
    purchase_weight: 0.15
    questionnaire_weight: 0.20
  
  sub_calculations:
    group: {common_count: 0.30, activity_overlap: 0.30, role_similarity: 0.20, join_date_proximity: 0.20}
    event: {attended_same: 0.35, type_match: 0.25, frequency: 0.20, future_overlap: 0.20}
    purchase: {category_overlap: 0.30, price_range: 0.25, brand_match: 0.25, wishlist_similarity: 0.20}
    questionnaire: {same_questionnaires: 0.25, answer_similarity: 0.35, score_proximity: 0.20, learning_path: 0.20}
  
  ml_adjustment: "-0.2 to +0.2 based on segment clustering, historical engagement success"

feed_integration:
  time_window: "last 30 days"
  post_limits:
    strong_gt_0.8: {posts: 20, zone: "top 20%", max_consecutive: 3}
    medium_0.5_to_0.8: {posts: 10, zone: "middle 40%", diversity_rules: true}
    weak_lt_0.5: {posts: 5, zone: "bottom 40%", high_engagement_only: true}
  
  position_formula: "position = base × (1 - weight) + time_decay × 0.3 + engagement × 0.2"
  
  ongoing:
    rebalance_interval: "6 hours"
    max_friend_content: "30% of total feed"
    new_post_boost: "24 hours"

connection_strength_evolution:
  strong_0.8_to_1.0: "high feed priority, all notifications, collaboration suggestions"
  medium_0.5_to_0.8: "moderate feed, key notifications, occasional suggestions"
  weak_0.2_to_0.5: "limited feed, major notifications only"
  dormant_lt_0.2: "minimal feed, no notifications, reconnection prompts"
```

### For Product Manager

**Business Value**: Friend connections are the social backbone — they drive daily engagement through feed content and create the "stickiness" that keeps users returning. The multi-factor weight calculation means connections feel uniquely relevant, not generic.

**Key Metrics**:
- Friend request send rate, acceptance rate, rejection rate
- Time from request to acceptance
- Post-connection engagement increase (feed interaction rate before vs. after)
- Connection strength distribution over time
- Feed integration satisfaction (do users engage with integrated posts?)
- Dormant connection rate and reconnection success

**A/B Testing**: Weight formula component ratios, historical post integration volume, position calculation variants, connection strength decay rate.

### For IT Security Manager

**Data Sensitivity**: Connection graph is highly sensitive — reveals business relationships and social networks. Purchase history overlap calculation must not expose individual purchase data to the other user. Questionnaire answer similarity must use aggregate scores, not raw answers.

**Privacy Controls**: Users can set feed integration level (Full/Selective/Minimal). Users can choose which post types to share (All/Public/Selected). Block functionality immediately removes all connection data and feed integration.

**Attack Surface**: Friend request spam (rate limit 20 requests/day), connection manipulation (bot networks creating artificial connections), weight gaming (users joining same groups just for weight boost — detect rapid group join patterns).

### For DevOps

**Services**: Connection Service (Nest.js + Neo4j), Matching Service (Python), Feed Integration Service (Nest.js), Weight Calculation Service (Python + ML), Group/Event/Purchase/Questionnaire Services (all read-only for this flow), Feed Service (Redis).

**Processing Profile**: Weight calculation requires querying 4 services in parallel, then combining results. Total latency target: <10s from acceptance to feed integration. Historical post integration is write-heavy (up to 40 feed writes per connection — 20 per user).

**Key Alerts**: Weight calculation > 15s, feed integration failure, Neo4j write latency > 500ms, connection graph query timeout.

**Failure Modes**: Weight calculation partial failure (one service down) = use available weights with default for missing component. Feed integration failure = connection established but feeds not merged (retry queue, manual recovery).

---

## User Story

**Requester**: As a business owner, I want to send a friend request to someone I met at an event, so that we can see each other's posts and stay connected.

**Recipient**: As a platform user, I want to accept a friend request and immediately see relevant historical posts from my new connection in my feed, prioritized by how much we have in common.

## Business Flow (Happy Path)

1. User A clicks "Connect" on User B's profile
2. Connection Service validates request (not blocked, not already connected)
3. Connection Service publishes `FriendRequestSent` event
4. Notification Service sends notification to User B
5. Matching Service calculates initial compatibility score
6. Matching Service publishes `InitialMatchCalculated` event
7. User B accepts the friend request
8. Connection Service creates bidirectional connection in Neo4j
9. Connection Service publishes `FriendRequestAccepted` event
10. Notification Service notifies User A of acceptance
11. Feed Integration Service starts weight calculation
12. Feed Integration Service publishes `FeedIntegrationStarted` event
13. **Group Service** analyzes shared groups (parallel)
14. **Event Service** analyzes co-attended events (parallel)
15. **Purchase History Service** analyzes purchase overlap (parallel)
16. **Questionnaire Service** analyzes answer similarity (parallel)
17. Each service publishes their weight calculation
18. Weight Calculation Service combines all weights + ML adjustment
19. Weight Calculation Service publishes `FinalWeightCalculated` event
20. Feed Integration Service retrieves historical posts from both users
21. Feed Integration Service injects posts into each other's feeds at calculated positions
22. Feed Integration Service publishes `HistoricalPostsIntegrated` event
23. Ongoing: new posts from either user are automatically integrated via FLOW-04

## Scenarios

### Scenario 1: Heavy Shared Context
- Users share 5 groups, attended 3 same events, similar purchase history
- Final weight likely > 0.8 (strong connection)
- 20 historical posts integrated at top positions
- Full notification enabled

### Scenario 2: Cold Connection (No Shared Context)
- Users met externally, no platform overlap
- Weight based on profile similarity alone (base_match only)
- Likely < 0.5 (weak connection)
- 5 historical posts in lower positions
- Strength can grow over time through interaction

### Scenario 3: One-Way High Relevance
- User A's content is highly relevant to User B, but not vice versa
- Integration is still bidirectional but asymmetric in engagement
- Feed rebalancing may reduce User A's posts in User B's feed if no engagement

### Scenario 4: Friend Request from Match Suggestion
- Request originates from FLOW-02 match suggestion
- requestContext.source = "suggestion"
- Initial match score pre-computed, used as base_match component
- Analytics tracks suggestion-to-connection conversion

## Edge Cases

1. **User B already sent request to User A**: Detect mutual pending requests. Auto-accept both and proceed to integration.

2. **User withdraws request before acceptance**: Delete request. If User B hasn't seen notification, remove it. If seen, show "Request withdrawn."

3. **One weight calculation service timeout**: Weight Calculation Service waits max 10s for all four. Uses available weights with default 0.5 for missing component. Async retry for missing component.

4. **User has 5000+ friends**: Historical post integration scales linearly. Cap at 20 posts per new connection regardless. Consider lazy loading (integrate top 5 immediately, rest on scroll).

5. **Blocked user sends request**: Connection Service checks block list before creating request. Return generic "Request could not be sent" (no reveal of block).

6. **Connection established during feed service maintenance**: Connection saved to Neo4j, integration event queued. Feed integration runs when service recovers. User sees friend in connections list but posts integrate with delay.

## Business Logic

### Weight Calculation Formula
```
final_weight = (base_match × 0.25) + (group × 0.20) + (event × 0.20) + 
               (purchase × 0.15) + (questionnaire × 0.20) + ml_adjustment
```
ML adjustment range: -0.2 to +0.2

### Historical Post Integration Rules
- Time window: last 30 days
- Strong connection (>0.8): 20 posts in top 20% of feed, max 3 consecutive
- Medium (0.5-0.8): 10 posts in middle 40%, diversity rules apply
- Weak (<0.5): 5 posts in bottom 40%, high-engagement only

### Connection Strength Tiers
- Strong (0.8-1.0): high feed priority, all notifications, collaboration suggestions
- Medium (0.5-0.8): moderate feed, key notifications, occasional suggestions
- Weak (0.2-0.5): limited feed, major notifications only
- Dormant (<0.2): minimal feed, no notifications, reconnection prompts

### Feed Rebalancing
- Every 6 hours
- Maximum 30% friend content in total feed
- Remove low-performing integrated posts
- New friend posts get 24-hour boost

## Event Definitions

| Event | Publisher | Consumers | Key Payload Fields |
|-------|-----------|-----------|-------------------|
| `FriendRequestSent` | Connection Service | Notification, Matching, Analytics | requestId, senderId, recipientId, message, senderProfile, requestContext |
| `InitialMatchCalculated` | Matching | Connection, Feed Integration | requestId, matchScore, matchFactors (profileSimilarity, interestOverlap, networkDistance, activityAlignment, professionalMatch) |
| `FriendRequestAccepted` | Connection Service | Notification, Feed Integration, Analytics | connectionId, requestId, senderId, recipientId, connectionType, acceptedAt |
| `FeedIntegrationStarted` | Feed Integration | Group, Event, Purchase History, Questionnaire | integrationId, connectionId, user1Id, user2Id |
| `GroupWeightCalculated` | Group Service | Weight Calculation | integrationId, commonGroups[], groupWeight, weightFactors |
| `EventWeightCalculated` | Event Service | Weight Calculation | integrationId, commonEvents[], eventWeight, weightFactors |
| `PurchaseWeightCalculated` | Purchase History | Weight Calculation | integrationId, purchaseOverlap, purchaseWeight, weightFactors |
| `QuestionnaireWeightCalculated` | Questionnaire | Weight Calculation | integrationId, sharedQuestionnaires, questionnaireWeight, weightFactors |
| `FinalWeightCalculated` | Weight Calculation | Feed Integration | integrationId, finalWeight, componentWeights, mlAdjustment, confidenceScore |
| `HistoricalPostsIntegrated` | Feed Integration | Feed, Analytics | integrationId, user1Posts, user2Posts, positionsAssigned |
| `FeedIntegrationCompleted` | Feed Integration | Notification, Analytics | integrationId, connectionStrength, integrationMetrics |

## Services Involved

| Service | Role in Flow | Database | Scales On |
|---------|-------------|----------|-----------|
| Connection Service | Request lifecycle, graph storage | Neo4j + PostgreSQL | Graph write throughput |
| Matching Service | Initial compatibility scoring | PostgreSQL + Elasticsearch | CPU |
| Notification Service | Request/acceptance notifications | Redis pub/sub | Event throughput |
| Feed Integration Service | Orchestrates weight calculation and feed merge | Redis (temporary) | Request count |
| Group Service | Shared group analysis (read-only) | PostgreSQL + MongoDB | Read replicas |
| Event Service | Co-attended event analysis (read-only) | PostgreSQL | Read replicas |
| Purchase History Service | Purchase overlap analysis (read-only) | PostgreSQL | Read replicas |
| Questionnaire Service | Answer similarity analysis (read-only) | MongoDB | Read replicas |
| Weight Calculation Service | Combines weights + ML | Redis + ML model | CPU (inference) |
| Feed Service | Historical post integration, ongoing merge | Redis Cluster | Write throughput |


Integrating the **Friend Request & Feed Integration (FLOW-07)** process into the existing platform architecture involves synchronizing the social graph logic with the multi-dimensional weight calculation system.

Based on the provided documentation, here is the architectural plan to extend the platform’s capabilities to support this flow.

### 1. Service Orchestration Strategy

The platform’s orchestrator must handle the transition from a standard "connection request" to a "deep feed integration." The flow should be divided into three distinct phases:

* **Phase A: Connection Lifecycle:** Handled by the **Connection Service** and **Notification Service**. This manages the state transitions (Pending -> Accepted).
* **Phase B: Parallel Analysis (The Gathering):** Triggered immediately upon acceptance. The **Feed Integration Service** acts as the orchestrator for this phase, calling the specialized analysis services (Group, Event, Purchase, and Questionnaire) to retrieve sub-weights.
* **Phase C: Final Integration:** The **Weight Calculation Service** processes the sub-weights via an ML model to determine the `FinalWeightCalculated` event, which then informs the **Feed Service** on how to merge historical data.

### 2. Skill & Task Type Extensions

To support this in the current **Multimodel Orchestrator** framework, the following "Skills" or Task Types should be registered:

| Skill ID | Skill Name | Responsibility |
| --- | --- | --- |
| **SKILL-57** | `WeightCalculator` | Executes ML inference to combine base match, groups, events, purchases, and questionnaires into a single weight. |
| **SKILL-47** | `MatchingService` | Calculates initial compatibility scores between two business profiles. |
| **SKILL-46** | `FeedService` | Manages the Redis-based historical post integration and ongoing feed merge logic. |
| **SKILL-49** | `ConnectionService` | Manages the Neo4j graph relationships and state (Friendship status/strength). |

### 3. Multi-Dimensional Weight Calculation Logic

The extension requires a specific implementation of the **Weight Calculation Service**. According to the flow description, the logic should follow a weighted average model adjusted by ML:

1. **Base Match (25%):** Profile similarity and industry alignment.
2. **Groups (20%):** Overlap in shared business groups or communities.
3. **Events (20%):** Shared attendance history or upcoming registrations.
4. **Purchases (15%):** Transactional overlap (e.g., buying from the same marketplace categories).
5. **Questionnaires (20%):** Alignment in learning paths, scores, and specific survey answers.

### 4. Data Integration & Storage

To maintain high performance during the feed merge, the architecture should utilize the following storage strategy:

* **Social Graph (Neo4j):** Stores the nodes (Users) and edges (Connections). The edges must now support a property for `connectionStrength` (0.0 to 1.0) which is updated by the Weight Calculation Service.
* **Feed Cache (Redis Cluster):** Used by the **Feed Service** to handle the high-throughput task of injecting historical posts into the timelines of newly connected users based on the calculated weight.
* **Analysis Stores:** The Group (MongoDB), Event (PostgreSQL), and Purchase (PostgreSQL) services remain the sources of truth for sub-weight calculations, accessed via read-only replicas to avoid impacting transactional performance.

### 5. Implementation Steps

1. **Define the JSON Flow:** Create a new flow definition in the orchestrator that maps the `AcceptFriendRequest` event to the parallel execution of the four analysis services.
2. **ML Model Deployment:** Deploy a model (likely a gradient-boosted tree or simple neural network) within the Weight Calculation Service to handle the final integration adjustments.
3. **Event Bus Integration:** Ensure that the `FeedIntegrationCompleted` event is broadcasted so that the **Analytics Service** can track the "Connection Strength Evolution" over time.
4. **UI Extension:** Update the React/React Native clients to display a "Connection Strength" or "Compatibility" badge once the weight calculation is finalized.

This extension transforms the platform from a simple networking tool into an AI-driven discovery engine that prioritizes content based on the depth of the professional relationship.

The integration of the "Friend Request & Feed Integration" process transforms the platform from a standard networking tool into an AI-driven discovery engine by prioritizing content based on the depth of professional relationships. Below is the plan to extend the platform's capabilities with this flow.

### 1. Data Model & Storage Extensions

The foundational connection model must be updated to support the nuanced relationship data required for the new weight calculation logic.

* **Connections Service (Skill 49):** The relationship edges must be updated to store a `connectionStrength` property (ranging from 0.0 to 1.0). This value will be dynamically updated by the Weight Calculation Service as the professional relationship evolves.
* **Feed Cache (Redis Cluster):** A Redis cluster will be utilized by the Feed Service to manage the high-throughput task of injecting historical posts into user timelines during the integration process.
* **Analysis Stores:** The Group (MongoDB), Event (Postgres), and Purchase (Postgres) services will serve as the sources of truth for sub-weight calculations, accessed via read-only replicas to maintain transactional performance.

### 2. Multi-Dimensional Weight Calculation

When a friend request is accepted, the platform will orchestrate a parallel analysis process to determine the initial integration weight.

* **Parallel Sub-Weight Analysis:** Four services will execute in parallel to compute specific compatibility sub-weights:
* **Group Service:** Analyzes shared memberships and activity overlap.
* **Event Service:** Examines co-attended events and shared registrations.
* **Purchase History Service:** Evaluates marketplace purchase category overlap.
* **Questionnaire Service:** Compares questionnaire answers, scores, and learning paths.


* **Weight Calculation Service (Skill 57):** This service will combine the results using a weighted algorithm:
* **Base Match Grade:** 25%.
* **Shared Groups & Events:** 20% each.
* **Questionnaires:** 20%.
* **Purchase Overlap:** 15%.


* **ML Optimization:** A machine learning model (likely a gradient-boosted tree or neural network) will be deployed within this service to handle final integration adjustments based on historical successful connection patterns.

### 3. Workflow Orchestration (FLOW-07)

The platform's orchestrator will be updated with a new JSON flow definition to manage the lifecycle:

1. **AcceptFriendRequest Event:** Triggers the orchestrator to initiate the weight calculation process.
2. **Parallel Execution:** The orchestrator maps the event to the four analysis services simultaneously.
3. **Feed Integration Service:** Using the final calculated weight, this service injects the most relevant historical posts into both users' feeds.
4. **FeedIntegrationCompleted Event:** This event is broadcasted on the bus for the Analytics Service to begin tracking "Connection Strength Evolution" over time.

### 4. Client-Side Enhancements

The React and React Native clients will be extended to reflect the depth of the new connection:

* **Compatibility Badge:** Once the weight calculation is finalized, the UI will display a "Compatibility" or "Connection Strength" badge on the user's profile or feed.
* **Dynamic Feed Prioritization:** The frontend will utilize the `connectionStrength` to prioritize posts from closer professional connections higher in the main feed.