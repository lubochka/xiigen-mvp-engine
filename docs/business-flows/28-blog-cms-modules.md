<!--
  Source: business flows.zip / 04-post-publishing.md
  Canonical since: 2026-04-22
  Canonical flow: FLOW-28 blog-cms-modules
  Naming note: Resolved 2026-04-22 — zip-04 post-publishing describes content authoring (sanitization, public publishing); maps to today's blog-cms-modules. Today's FLOW-04 event-attendance grew independently from FLOW-03+FLOW-09 and has no dedicated zip spec.
  Related deep-research: docs/business-flows/_deep-research/blog-cms-modules/ (if present)
  Related legacy engine artifacts: docs/business-flows/_legacy-engine-artifacts/blog-cms-modules/ (if present)
-->

# Post Publishing & Feed Distribution

> **Flow ID**: FLOW-04  
> **Drawio Diagram**: post create  
> **Version**: 1.0  
> **Last Updated**: 2026-02-25  

---

## Short Description

Handles the complete pipeline from a user publishing a post through NLP analysis, multi-dimensional audience matching (business, friends, groups), composite ranking score calculation, feed injection with diversity controls, and distribution analytics.

## Long Description

This flow governs how content created by one user reaches the feeds of relevant users across the platform. When a user publishes a post (text, image, video, article, or poll), it enters a sophisticated processing pipeline that determines who should see it and at what priority.

The pipeline starts with the NLP Service analyzing the post content to extract topics, keywords, entities, sentiment, and categories. Three parallel matching processes then run simultaneously: the Matching Service finds businesses whose profiles align with the post content; the Connection Service identifies the poster's friend network (direct friends, second-degree connections, followers); and the Group Service identifies group memberships where the post is relevant.

These three audience lists are compiled into a single recipient list with composite ranking scores. The ranking algorithm weighs six factors: match score (25%), friend score (20%), group score (15%), activity score (20%), recency score (10%), and engagement prediction (10%). The Feed Service then distributes the post into feeds across five tiers (premium/high/medium/low/minimal), applies diversity controls (max 2 posts per author in top 10, 60% topic diversity), and reorders existing feeds using chronological decay and engagement boost algorithms.

---

## Persona Descriptions

### For AI / Code Generation

```yaml
flow_id: FLOW-04
entry_point: POST /posts
prerequisite: User authenticated, profile complete

services:
  - post-service:        Stores post, manages content types, handles media
  - nlp-service:         Analyzes content (topics, keywords, sentiment, entities)
  - matching-service:    Finds business-level audience matches
  - connection-service:  Identifies friend/follower graph
  - group-service:       Identifies relevant group memberships
  - ranking-service:     Calculates composite scores, compiles recipient list
  - feed-service:        Distributes to feeds, applies diversity, reorders
  - analytics-service:   Tracks distribution metrics

event_chain:
  1. PostCreated → nlp-service, connection-service, group-service, analytics-service
  2. PostAnalyzed → matching-service, ranking-service  (after NLP)
  3. BusinessMatchesFound → ranking-service            (parallel)
  4. FriendConnectionsFound → ranking-service           (parallel)
  5. GroupConnectionsFound → ranking-service             (parallel)
  6. RecipientListCompiled → feed-service               (join point)
  7. RankingScoresCalculated → feed-service
  8. FeedsUpdated → analytics-service
  9. FeedsReordered → analytics-service
  10. PostDistributionCompleted → post-service, notification-service

composite_ranking:
  weights:
    match_score: 0.25        # Business/topic relevance
    friend_score: 0.20       # Social connection strength
    group_score: 0.15        # Group membership relevance
    activity_score: 0.20     # Historical engagement with poster
    recency_score: 0.10      # Time-based decay
    engagement_score: 0.10   # Predicted engagement probability
  
  sub_factors:
    business_match:
      questionnaire_alignment: 0.40
      industry_relevance: 0.30
      size_compatibility: 0.15
      location_proximity: 0.15
    friend_connection:
      direct_friend: 1.0
      second_degree: 0.5
      follower: 0.3
      following: 0.4
    activity_score:
      view_rate: 0.25
      like_rate: 0.25
      comment_rate: 0.30
      share_rate: 0.20

feed_tiers:
  premium: "composite > 0.8 → positions 1-3"
  high: "composite > 0.6 → positions 4-10"
  medium: "composite > 0.4 → positions 11-25"
  low: "composite > 0.2 → positions 26-50"
  minimal: "composite > 0.0 → positions 50+"

diversity_controls:
  max_posts_per_author_in_top_10: 2
  topic_diversity_requirement: 0.60
  reorder_formula: "position = base × (1 - composite) + time_decay × 0.2 + diversity_penalty × 0.1"
  chronological_decay: "boost = e^(-hours_old / 24), decay_rate = 0.95/day"
  engagement_boost: "boost = log(1 + engagements) × 0.1"

batching:
  recipient_matching: 5000_users_per_batch
  ranking_calculation: 1000_users_per_batch
  feed_updates: 500_feeds_per_batch
  cache_updates: 100_feeds_per_transaction

caching:
  L1_user_feed: "Redis, 5 min TTL"
  L2_ranking_scores: "30 min TTL"
  L3_connection_graph: "6 hour TTL"
```

### For Product Manager

**Business Value**: The feed is the product's "homepage" — it's what users see every time they open the app. Feed quality = engagement = retention. A well-ranked feed shows the right content to the right person, driving connections and conversations.

**Key Metrics**:
- Post distribution reach (how many feeds a post appears in)
- Feed engagement rate (likes + comments + shares / impressions)
- Time to first engagement after posting
- Feed scroll depth (how far users scroll before leaving)
- Content type engagement breakdown (text vs. image vs. video vs. poll)
- Author diversity in top 10 feed positions

**Feature Dependencies**: Depends on FLOW-02 (business profiles for matching), FLOW-07 (friend connections). Feeds into all social interactions.

**A/B Testing**: Ranking weight variations, diversity threshold (60% vs. 70%), engagement boost formula, number of tiers, chronological vs. ranked feed modes.

### For IT Security Manager

**Data Sensitivity**: Post content is user-generated — ranges from public to connections-only. NLP analysis results could reveal business strategies (classified Internal). Connection graph is highly sensitive (social graph data).

**Content Safety**: NLP Service includes content moderation — flag posts with harmful content, spam detection, profanity filtering. Posts with visibility "private" must never appear in other users' feeds regardless of matching score.

**Attack Surface**:
- Post spam: rate limit 10 posts/hour per user
- Content injection: sanitize all HTML/script in post content
- Privacy leak: visibility settings must be enforced at feed-service level (not just UI)
- Graph enumeration: connection-service must not expose full friend list via API
- Ranking manipulation: detect coordinated engagement patterns (bot networks)

### For DevOps

**Services**: Post Service (Nest.js), NLP Service (Python + spaCy/BERT), Matching Service (Python), Connection Service (Nest.js + Neo4j), Group Service (Nest.js), Ranking Service (Python), Feed Service (Nest.js + Redis), Analytics Service (Python + Elasticsearch).

**Processing Profile**: Write-heavy flow — one post triggers N feed updates where N = matched audience size. A popular user's post could trigger 10K+ feed writes. NLP analysis is CPU-heavy (0.5-2s per post). Matching is parallelized across three dimensions.

**Scaling**: Feed Service needs highest write throughput. Redis Cluster with write-behind to Elasticsearch. Connection Service scales on Neo4j read replicas. NLP Service scales on CPU/GPU pods.

**Key Alerts**: Post creation > 3s, NLP analysis > 5s, total distribution > 30s, feed update backlog > 5000, ranking service error rate > 3%.

**Failure Modes**: NLP failure = skip analysis, distribute to friends/groups only. Matching failure = distribute to friends/groups only. Feed Service failure = posts created but invisible (critical — auto-restart + queue replay).

---

## User Story

**Publisher**: As a business owner, I want to publish a post about my latest product and have it automatically reach the most relevant businesses, my connections, and my group members, ranked by relevance.

**Consumer**: As a platform user, I want my feed to show a diverse, relevant mix of content from my connections and matched businesses, with the most valuable content at the top.

## Business Flow (Happy Path)

1. User creates a post (text + optional media, selects visibility)
2. Post Service validates content, stores in MongoDB
3. Post Service publishes `PostCreated` event
4. NLP Service analyzes content (topics, keywords, sentiment, entities)
5. NLP Service publishes `PostAnalyzed` event
6. Connection Service queries Neo4j for poster's friend graph (parallel)
7. Connection Service publishes `FriendConnectionsFound` event
8. Group Service queries PostgreSQL for poster's group memberships (parallel)
9. Group Service publishes `GroupConnectionsFound` event
10. Matching Service uses NLP results to find business-level matches (parallel)
11. Matching Service publishes `BusinessMatchesFound` event
12. Ranking Service waits for all three match lists (join point)
13. Ranking Service compiles unified recipient list
14. Ranking Service publishes `RecipientListCompiled` event
15. Ranking Service calculates composite scores for each recipient
16. Ranking Service publishes `RankingScoresCalculated` event
17. Feed Service distributes post to recipient feeds in batches (500/batch)
18. Feed Service applies diversity controls and position calculations
19. Feed Service publishes `FeedsUpdated` event
20. Feed Service reorders existing feed content around new post
21. Feed Service publishes `FeedsReordered` event
22. Analytics Service aggregates distribution metrics
23. Analytics Service publishes `PostDistributionCompleted` event

## Scenarios

### Scenario 1: Visibility = Connections Only
- Skip business matching, use only friend connections
- Group posting rules: only if post visibility allows

### Scenario 2: Post with Poll
- Additional poll metadata stored
- Engagement prediction higher (polls drive interaction)
- Ranking boost for poll-type content

### Scenario 3: Post Mentioning Other Users
- Mentioned users get direct notification regardless of matching score
- Mentioned users' feeds show post at premium tier

### Scenario 4: High-Follower User Posts
- Audience size could be 50K+
- Distribution uses progressive batching (close connections first, then broader)
- Rate limit feed updates to prevent Redis overload

## Edge Cases

1. **Post with no text, only image**: NLP cannot analyze. Use image recognition if available, otherwise distribute to friends/groups only with no business matching.

2. **All three matching services timeout**: Ranking Service receives zero results at join point. Fallback: distribute to poster's direct connections only.

3. **User posts in an unsupported language**: NLP Service detects language, falls back to basic keyword extraction. Matching quality reduced.

4. **Feed cache eviction during distribution**: Redis evicts old feed entries. Feed Service writes are idempotent — re-execution safe. Background job refills evicted caches.

5. **Post edited after distribution**: Re-run NLP and re-rank. Don't re-inject into feeds that already saw the post. Update existing feed entries in-place.

6. **Deleted post**: Remove from all feeds immediately. Publish `PostDeleted` event. Feed Service batch-removes from Redis. Eventual consistency: some feeds may show deleted post for up to 5 minutes.

7. **Concurrent posts by same author**: Diversity controls limit to 2 in top 10. If author posts 5 times in 10 minutes, later posts get lower positions.

## Business Logic

### Composite Ranking Formula
```
composite = (match × 0.25) + (friend × 0.20) + (group × 0.15) + 
            (activity × 0.20) + (recency × 0.10) + (engagement × 0.10)
```

### Feed Position Calculation
```
position = base_position × (1 - composite_score) + time_decay × 0.2 + diversity_penalty × 0.1
```

### Chronological Decay
```
boost = e^(-hours_old / 24)
decay_rate = 0.95 per day
```

### Engagement Boost
```
boost = log(1 + total_engagements) × 0.1
```

### Diversity Rules
- Maximum 2 posts per author in top 10
- Minimum 60% topic diversity in top 10
- Mix: top 3 = 1 fresh + 2 engaging; top 10 = 3 fresh + 7 engaging

### Feed Update Timing
- Direct connections: real-time (within 5s)
- Business matches (score > 0.6): within 5 minutes
- Weak matches: batched hourly
- New users: next feed refresh

## Event Definitions

| Event | Publisher | Consumers | Key Payload Fields |
|-------|-----------|-----------|-------------------|
| `PostCreated` | Post Service | NLP, Connection, Group, Analytics | postId, userId, content (text, media, type, mentions, hashtags), visibility, metadata |
| `PostAnalyzed` | NLP Service | Matching, Ranking | postId, analysis (topics, keywords, entities, sentiment, categories, language) |
| `BusinessMatchesFound` | Matching | Ranking | postId, matches[]{businessId, userId, matchScore, matchFactors, matchReason} |
| `FriendConnectionsFound` | Connection | Ranking | postId, connections[]{userId, connectionType, connectionStrength, mutualConnections} |
| `GroupConnectionsFound` | Group Service | Ranking | postId, groupMembers[]{groupId, userId, memberRole, groupRelevanceScore} |
| `RecipientListCompiled` | Ranking | Feed Service | postId, recipients[]{userId, source, rawScore}, totalRecipients |
| `RankingScoresCalculated` | Ranking | Feed Service | postId, rankedRecipients[]{userId, compositeScore, tier, position} |
| `FeedsUpdated` | Feed Service | Analytics | postId, updateSummary (totalUpdated, byTier, averagePosition, latency) |
| `FeedsReordered` | Feed Service | Analytics | postId, reorderSummary (feedsReordered, averageDisplacement, algorithmsApplied) |
| `PostDistributionCompleted` | Analytics | Post Service, Notification | postId, distributionMetrics (reach, impressions, distributionTime, tierBreakdown) |

## Services Involved

| Service | Role in Flow | Database | Scales On |
|---------|-------------|----------|-----------|
| Post Service | Content storage, media handling | MongoDB | Request count, S3 for media |
| NLP Service | Content analysis and classification | — (stateless) | CPU/GPU (model inference) |
| Matching Service | Business-level audience matching | PostgreSQL + Elasticsearch | CPU (algorithm) |
| Connection Service | Social graph queries | Neo4j + PostgreSQL | Read replicas (graph queries) |
| Group Service | Group membership resolution | PostgreSQL + MongoDB | Request count |
| Ranking Service | Score calculation and compilation | Redis (temporary) | CPU (computation) |
| Feed Service | Feed distribution and reordering | Redis Cluster + Elasticsearch | Write throughput (thousands/s) |
| Analytics Service | Distribution metrics | Elasticsearch + InfluxDB | Event throughput |


To extend the capabilities of the platform with the post publishing and feed distribution process, the following integration strategy maps the new requirements to the existing modular architecture and the Business Flow Arbiter (BFA) validation framework.

### 1. Service-to-Skill Mapping

The process described in the new specification involves eight distinct service roles. These map directly to the existing planned and implemented skills in the master index:

* **Post Service**: Utilizes **52-post-service** for content storage and media handling.
* **NLP Service**: Implemented via **11-ai-transform-executor** and **06-ai-providers** to perform content analysis and category extraction.
* **Matching Service**: Utilizes **47-matching-service** for parallel business-level audience alignment.
* **Connection Service**: Utilizes **49-connections-service** to resolve social graphs (friends, followers, second-degree connections).
* **Group Service**: Utilizes **50-groups-service** to identify relevant group memberships.
* **Ranking Service**: Utilizes **54-ranking-service** to calculate composite scores based on specific weights.
* **Feed Service**: Utilizes **46-feed-service** for distribution and reordering across Redis and Elasticsearch.
* **Analytics Service**: Utilizes **48-analytics-service** to track reach and impressions.

### 2. Event Orchestration & Data Contracts

The extension requires the implementation of an event-driven pipeline where each stage depends on the successful completion and contract validation of the previous step:

* **Ingestion Phase**: The `PostPublished` event triggers the `CONTENT_NLP_ANALYSER` task, which must output a dictionary of topics and categories.
* **Matching Phase**: The `ContentAnalyzed` event initiates three parallel tasks: business matching, connection resolution, and group membership identification.
* **Ranking Phase**: The `PotentialRecipientsIdentified` event feeds into the Ranking Service, which must apply the following weighted algorithm:
* **Match Score**: 25%
* **Friend Score**: 20%
* **Group Score**: 15%
* **Activity Score**: 20%
* **Recency Score**: 10%
* **Engagement Prediction**: 10%


* **Distribution Phase**: The `RankingScoresCalculated` event triggers the `FeedsUpdated` and `FeedsReordered` tasks within the Feed Service.

### 3. Business Flow Arbiter (BFA) Integration

In the V62 architecture, the **Business Flow Arbiter** must be updated to include FLOW-04 in its validation library to prevent regressions during future code changes.

* **Contract Enforcement**: The BFA will validate that any changes to the `Ranking Service` preserve the mandatory output schema required by the `Feed Service`.
* **Impact Analysis**: The BFA must monitor for conflicts between the `Matching Service` (FLOW-04) and existing processes like `Event Promotion` (FLOW-03) to ensure feed diversity controls are not bypassed.
* **Invariant Testing**: New invariants should be defined to ensure that a post never reaches the "Distribution Completed" state without an accompanying NLP analysis payload.

### 4. Implementation Priorities

To achieve this extension, the current execution plan should be adjusted to prioritize the following tasks:

* Update the **Task Types Catalog** with specific definitions for `RANKING_COMPOSITE_CALCULATOR` and `FEED_REORDER_EXECUTOR`.
* Configure the **54-ranking-service** to support the custom weighted scoring model defined in the publishing specification.
* Integrate the `04-redis-queue-service` to manage the high-throughput write requirements of the Feed Service distribution phase.
To extend the platform with the **Post Publishing & Feed Distribution (FLOW-04)** process, the architecture must be updated to support a multi-dimensional matching and ranking pipeline. This extension integrates several specialized microservices and infrastructure components into the existing V64 framework.

### 1. FLOW-04 Pipeline Implementation

The extension requires implementing a sequential and parallel processing pipeline to move content from creation to distribution:

* **Content Analysis Phase**: Upon publishing, the **NLP Service** extracts metadata including topics, keywords, entities, sentiment, and categories from the post.
* **Parallel Audience Matching**: Three services run simultaneously to identify potential recipients:
* **Matching Service**: Identifies business profile alignments.
* **Connection Service**: Identifies the user's friend network (1st and 2nd degree) and followers.
* **Group Service**: Identifies relevant group memberships.


* **Composite Ranking**: The **Ranking Service (54-ranking-service)** must be configured to calculate a priority score based on the following weighted algorithm:
* **Match Score**: 25%
* **Friend Score**: 20%
* **Activity & Recency Scores**: 20% and 10% respectively
* **Group Score**: 15%
* **Engagement Prediction**: 10%



### 2. Business Flow Arbiter (BFA) Integration

To prevent architectural regressions, FLOW-04 must be registered within the BFA's validation library with the following constraints:

* **Contract Enforcement**: The BFA will validate that the **Ranking Service** output matches the mandatory schema required by the **Feed Service**.
* **Conflict Monitoring**: The BFA must check for conflicts between the **Matching Service** (FLOW-04) and existing processes like **Event Promotion** (FLOW-03) to maintain feed diversity.
* **Invariants**: A post state cannot reach "Distribution Completed" without a confirmed NLP analysis payload.

### 3. Implementation Priorities

To achieve this extension, the current execution plan should prioritize these technical tasks:

* **Task Types Catalog Update**: Add `RANKING_COMPOSITE_CALCULATOR` and `FEED_REORDER_EXECUTOR` to the unified flow system.
* **Ranking Service Configuration**: Update service **54-ranking-service** to handle the custom weighted scoring model.
* **Infrastructure Extension**: Integrate the **04-redis-queue-service** to manage high-throughput write requirements during the feed injection phase.
* **Elasticsearch Integration**: Utilize existing datastore capabilities for high-performance audience matching and topic extraction.