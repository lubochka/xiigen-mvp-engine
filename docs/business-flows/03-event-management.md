<!--
  Source: business flows.zip / 03-event-creation-promotion.md
  Canonical since: 2026-04-22
  Canonical flow: FLOW-03 event-management
  Related deep-research: docs/business-flows/_deep-research/event-management/ (if present)
  Related legacy engine artifacts: docs/business-flows/_legacy-engine-artifacts/event-management/ (if present)
-->

# Event Creation & Promotion

> **Flow ID**: FLOW-03  
> **Drawio Diagram**: event registration  
> **Version**: 1.0  
> **Last Updated**: 2026-02-25  

---

## Short Description

Handles the full lifecycle of creating a business event — from organizer submission through AI-powered audience matching, intelligent feed injection, multi-channel notification delivery, and promotion campaign analytics.

## Long Description

This flow covers the event creation pipeline from the moment an organizer submits event details (title, description, date, location, pricing, capacity) through to the event appearing in matched users' feeds and notifications.

When an event is created, it enters a parallel processing pipeline. The Event Service stores it and indexes it for search. The Analytics Service predicts expected attendance and virality. The Matching Service runs a multi-factor algorithm (interest relevance 35%, location proximity 25%, time availability 20%, price sensitivity 10%, social connections 10%) to identify the target audience, segmenting users into strong/medium/weak match tiers.

Once the audience is identified, the Feed Service injects the event into matched users' event feeds at positions determined by match score (>0.8 = top 3, >0.6 = top 10, >0.4 = within view). The Notification Service orchestrates multi-channel delivery (in-app always, push for high matches, email for medium+, SMS for urgent/nearby). The flow concludes with the Analytics Service publishing promotion campaign metrics (reach, impressions, click-through, conversions).

---

## Persona Descriptions

### For AI / Code Generation

```yaml
flow_id: FLOW-03
entry_point: POST /events
prerequisite: User authenticated, has permission to create events

services:
  - event-service:        Stores event, manages status, indexes for search
  - analytics-service:    Predicts attendance, tracks campaign metrics
  - matching-service:     Identifies target audience via multi-factor scoring
  - feed-service:         Injects event into matched users' feeds
  - notification-service: Orchestrates multi-channel notifications
  - search-index-service: Indexes event for discovery
  - message-queue-service: Batched notification delivery

event_chain:
  1. EventCreated → analytics-service, matching-service, search-index-service
  2. EventIndexed → matching-service, search-service
  3. EventAnalyzed → event-service, recommendation-engine
  4. EventMatchesCalculated → matching-service (aggregation step)
  5. TargetAudienceIdentified → feed-service, message-queue-service, analytics-service
  6. FeedsUpdated → ui-service, analytics-service
  7. NotificationsSent → analytics-service, event-service
  8. PromotionCampaignCompleted → event-service, billing-service

matching_algorithm:
  scoring_weights:
    interest_relevance: 0.35
    location_proximity: 0.25
    time_availability: 0.20
    price_sensitivity: 0.10
    social_connections: 0.10
  thresholds:
    strong_match: ">= 0.75"
    medium_match: ">= 0.50"
    weak_match: ">= 0.25"

feed_injection:
  placement_rules:
    - "score > 0.8: top 3 positions"
    - "score > 0.6: top 10 positions"
    - "score > 0.4: within view"
    - "score < 0.4: below fold"
  update_timing:
    urgent_events: immediate
    this_week: within_1_hour
    future_events: batched_daily

notification_channels:
  in_app: always
  push: "if enabled AND score > 0.6"
  email: "weekly digest for score > 0.4"
  sms: "urgent events only, score > 0.8, within 50km"

data_stores:
  - PostgreSQL: events table (host_id, dates, capacity, pricing, status)
  - Redis: feed cache, event match cache
  - Elasticsearch: event search index
  - Kafka: topics: event-events, notification-events
```

### For Product Manager

**Business Value**: Events are a primary engagement driver and monetization lever. Better event-to-user matching increases attendance, organizer satisfaction, and platform stickiness. Paid events generate direct revenue through payment processing.

**Key Metrics**:
- Event creation rate (events/week)
- Match-to-registration conversion rate by tier (strong/medium/weak)
- Notification open rate by channel (push, email, in-app)
- Event fill rate (registrations / capacity)
- Organizer satisfaction (repeat event creation rate)
- Revenue per event (for paid events)

**Feature Dependencies**: Depends on FLOW-02 (business profiles for matching). Feeds into FLOW-08 (event participation).

**A/B Testing**: Match score threshold for push notifications (0.6 vs. 0.7). Feed position boost for new events vs. popular events. Notification timing (immediate vs. digest).

### For IT Security Manager

**Data Sensitivity**: Event details are semi-public (visible to matched users). Organizer identity and payment details are Confidential. Audience matching data reveals user interests — classified as Internal.

**Attack Surface**:
- Event creation spam: rate limit 5 events/day per user, content moderation for description
- Fake events: approval workflow for paid events, reputation scoring for organizers
- Notification abuse: organizers cannot directly message attendees outside platform channels
- Price manipulation: event price changes require re-notification to registered attendees
- Capacity overflow: atomic counter for registrations to prevent overselling

**Compliance**: Event location data processing requires user consent under GDPR. Payment processing via Stripe (PCI DSS compliance delegated to Stripe). Event cancellation requires full refund within 48 hours.

### For DevOps

**Services**: Event Service (Nest.js), Analytics Service (Python), Matching Service (Python + scikit-learn), Feed Service (Nest.js + Redis), Notification Service (Nest.js), Search Index Service (Elasticsearch).

**Scaling Triggers**: Event creation is bursty (peaks during business hours). Matching is CPU-heavy per event (scans all active users). Notification delivery needs burst capacity (thousands of notifications per event). Feed updates are write-heavy (one event → thousands of feed writes).

**Key Alerts**: Event creation error rate > 2%, matching latency > 15s, notification delivery failure > 5%, feed update backlog > 1000.

**Failure Blast Radius**: Event Service down = no new events. Matching failure = events created but not promoted (manual recovery via re-trigger). Notification failure = events in feeds but no push/email (users still discover via browsing).

---

## User Story

**Organizer**: As a business owner, I want to create an event with details and pricing, so that the platform automatically finds and notifies interested business owners in my area.

**Attendee**: As a platform user, I want relevant events to appear in my feed based on my industry and interests, so that I don't miss networking opportunities that match my goals.

## Business Flow (Happy Path)

1. Organizer fills out event creation form (title, description, date, location, pricing, capacity)
2. Event Service validates input and stores event with status "published"
3. Event Service publishes `EventCreated` event
4. Search Index Service indexes event for searchability
5. Search Index Service publishes `EventIndexed` event
6. Analytics Service analyzes event (predicted attendance, virality, category trends)
7. Analytics Service publishes `EventAnalyzed` event
8. Matching Service receives event + business profiles from Elasticsearch
9. Matching Service calculates match scores for all active users
10. Matching Service publishes `EventMatchesCalculated` event
11. Matching Service segments users into audience tiers (strong/medium/weak)
12. Matching Service publishes `TargetAudienceIdentified` event
13. Feed Service receives audience list with scores
14. Feed Service injects event into matched users' event feeds at ranked positions
15. Feed Service publishes `FeedsUpdated` event
16. Notification Service receives audience segments
17. Notification Service orchestrates channel-appropriate notifications per tier
18. Notification Service publishes `NotificationsSent` event
19. Analytics Service aggregates promotion metrics (reach, impressions, CTR)
20. Analytics Service publishes `PromotionCampaignCompleted` event

## Scenarios

### Scenario 1: Free Virtual Event
- No payment processing, unlimited capacity
- Broader matching (no price sensitivity filter)
- Notification includes virtual link

### Scenario 2: Paid Physical Event with Early Bird Pricing
- Multiple pricing tiers (early bird, regular, VIP)
- Location-based matching weighted higher
- Early bird deadline triggers time-sensitive notifications

### Scenario 3: Recurring Event Series
- Organizer creates template, system auto-generates instances
- Past attendees get priority notification for future instances
- Analytics compares performance across series

### Scenario 4: Event Editing After Publication
- Organizer changes date/location/price
- Re-notification sent to already-registered attendees
- Feed positions re-calculated for new parameters

## Edge Cases

1. **Event created in timezone edge case**: Organizer in UTC+5, event at 11 PM local. Stored in UTC, displayed in each user's local timezone. Matching considers user availability in their local time.

2. **Capacity exactly 1 remaining**: Two users attempt to register simultaneously. Atomic decrement with optimistic locking. Loser gets waitlist position.

3. **Event date in the past**: Validation rejects. If event passes while in "draft" status, auto-archive without promotion.

4. **Organizer account suspended mid-promotion**: Cancel all pending notifications. Mark event as "suspended". Notify registered attendees.

5. **Matching produces zero audience**: Very niche event. Fallback: show to all users in same region/industry with low confidence score.

6. **Notification service overwhelmed**: 10K+ notifications for popular event. Queue with priority (strong matches first). SLA: strong matches within 5 min, others within 1 hour.

## Business Logic

### Event Matching Scoring
```
score = (interest_relevance × 0.35) + (location_proximity × 0.25) + 
        (time_availability × 0.20) + (price_sensitivity × 0.10) + 
        (social_connections × 0.10)
```

### Feed Placement Rules
- Score > 0.8 → Top 3 positions (strong match)
- Score > 0.6 → Top 10 positions (medium match)
- Score > 0.4 → Within first scroll view
- Score < 0.4 → Below fold

### Notification Channel Rules
- In-app: always for all matched users
- Push: enabled AND score > 0.6
- Email: weekly digest for score > 0.4
- SMS: urgent events only, score > 0.8, within 50km

### Event Status Machine
- draft → published → promoted → active → completed → archived
- draft → cancelled (any stage can transition to cancelled)
- published → suspended (if organizer flagged)

## Event Definitions

| Event | Publisher | Consumers | Key Payload Fields |
|-------|-----------|-----------|-------------------|
| `EventCreated` | Event Service | Analytics, Matching, Search Index | eventId, organizerId, eventDetails (title, description, category, tags, dateTime, location, pricing, capacity), status |
| `EventIndexed` | Search Index | Matching, Search | eventId, indexId, searchableFields |
| `EventAnalyzed` | Analytics | Event Service, Recommendation Engine | eventId, predictions (expectedAttendance, viralityScore, categoryTrend) |
| `EventMatchesCalculated` | Matching | Matching (aggregation) | eventId, matchingCriteria, totalMatches |
| `TargetAudienceIdentified` | Matching | Feed, Message Queue, Analytics | eventId, audienceSegments[], matchedUsers[]{userId, matchScore, matchReasons, recommendationType} |
| `FeedsUpdated` | Feed Service | UI, Analytics | eventId, updateBatch (usersUpdated, feedPositions), updateStrategy |
| `NotificationsSent` | Notification | Analytics, Event Service | eventId, campaignId, notifications (total, byChannel, status) |
| `PromotionCampaignCompleted` | Analytics | Event Service, Billing | eventId, campaignMetrics (reach, impressions, clickThrough, conversions, roi) |

## Services Involved

| Service | Role in Flow | Database | Scales On |
|---------|-------------|----------|-----------|
| Event Service | Event CRUD, status management | PostgreSQL + Redis | Request count |
| Analytics Service | Predictions, campaign metrics | Elasticsearch | CPU (ML models) |
| Matching Service | Audience scoring and segmentation | PostgreSQL + Elasticsearch + Redis | CPU (algorithm), memory (user cache) |
| Feed Service | Feed injection and ranking | Redis | Memory (feed cache), write throughput |
| Notification Service | Multi-channel delivery orchestration | Redis (pub/sub) | Queue depth, burst capacity |
| Search Index Service | Full-text search indexing | Elasticsearch | Write throughput |


To extend the capabilities of the **XIIGen Unified Flow System (V62)** with the **Event Creation & Promotion (FLOW-03)** process, the following architectural and functional integrations are proposed:

### 1. New Task Type Definitions (Catalog Expansion)

To support the logic described in the event flow, the **Task Types Catalog** should be updated to include specialized modules for the **Matching** and **Feed** services:

* **`EVENT_MATCHING_SCORER`**: A task that implements the multi-factor audience identification algorithm. It processes user interest relevance (35%), location proximity (25%), time availability (20%), price sensitivity (10%), and social connections (10%) to output matches categorized into strong, medium, and weak tiers.
* **`DYNAMIC_FEED_ORCHESTRATOR`**: A module designed to inject events into user-specific feeds. It handles ranking logic where high match scores (>0.8) are placed in the top 3 positions, medium scores (>0.6) in the top 10, and lower scores (>0.4) within the general view.
* **`MULTI_CHANNEL_DELIVERY`**: A task for the Notification Service to manage tier-based delivery strategies: in-app notifications for all matches, push notifications for high matches, and email/SMS for medium match tiers or urgent alerts.

### 2. Execution Plan Integration (FLOW-03 Pipeline)

The **Business Flow Arbiter (BFA)** introduced in V62 will manage the parallel and sequential execution of the event lifecycle:

1. **Ingestion & Indexing**: Triggered by an organizer submission, the system simultaneously commits data to **PostgreSQL** and triggers the **`SEARCH_INDEX`** task for **Elasticsearch** availability.
2. **Predictive Analytics**: The Analytics Service runs attendance and virality predictions. This task scales based on CPU requirements for ML models.
3. **Audience Identification**: The `EVENT_MATCHING_SCORER` runs after indexing is confirmed, segmenting the user base into the target audience tiers.
4. **Delivery & Engagement**: Once the audience is identified, the system triggers the `DYNAMIC_FEED_ORCHESTRATOR` (scaling on Redis memory/throughput) and the `MULTI_CHANNEL_DELIVERY` task.
5. **Performance Tracking**: The flow concludes with the **`PROMOTION_CAMPAIGN_ANALYTICS`** task, which provides ROI metrics, reach, and conversion data to the organizer.

### 3. Service Scalability & Infrastructure Requirements

The platform extension requires specific infrastructure tuning to handle the burst capacity and memory demands of the new services:

* **Feed Service**: Requires high memory for Redis feed caching and high write throughput for simultaneous user feed updates.
* **Matching Service**: Optimized for CPU-intensive scoring algorithms and high memory for user preference caches.
* **Notification Service**: Scales based on queue depth and multi-channel burst capacity (SMS/Push/Email).
* **Search Index Service**: Optimized for write throughput into Elasticsearch as new events are published.