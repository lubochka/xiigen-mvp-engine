<!--
  Source: business flows.zip / 09-event-participation.md
  Canonical since: 2026-04-22
  Canonical flow: FLOW-09 transactional-event-participation
  Related deep-research: docs/business-flows/_deep-research/transactional-event-participation/ (if present)
  Related legacy engine artifacts: docs/business-flows/_legacy-engine-artifacts/transactional-event-participation/ (if present)
-->

# Event Participation & Social Integration

> **Flow ID**: FLOW-08  
> **Drawio Diagram**: participate in event  
> **Version**: 2.0  
> **Last Updated**: 2026-02-25  
> **Complexity**: High (payment + social + time-based evolution)  
> **Depends On**: FLOW-01 (User Registration), FLOW-02 (Business Onboarding), FLOW-03 (Event Creation)  

---

## Short Description

Handles the complete event participation journey — from payment processing and ticket issuance through calendar integration, intelligent reminder scheduling, participant connection scoring, time-based feed weight evolution (pre/during/post event), and social content integration among co-attendees.

## Long Description

This flow manages what happens after a user decides to attend an event. It is one of the most complex flows in the system, touching payments, ticketing, scheduling, and social integration across 14 microservices with 145 discrete interaction steps.

The flow begins with capacity verification and spot reservation (5-minute hold). For paid events, the Payment Service creates a Stripe PaymentIntent. Upon successful payment (or direct registration for free events), the Ticketing Service generates a ticket with QR code. The Availability Service atomically updates capacity counters using PostgreSQL row-level locks. The Calendar Service adds the event to the user's calendar, and the Reminder Service schedules a progressive notification sequence (T-7 days, T-1 day, T-1 hour, T-15 minutes).

The real sophistication is in the social integration. The Participant Service identifies all other attendees. For each attendee pair, the Matching Service calculates a connection weight based on four equally-weighted components: shared event history (25%), questionnaire similarity (25%), group overlap (25%), and audience/market match (25%). Each component has its own sub-calculation formula with 3-4 internal factors.

These weights evolve over time on a defined timeline: base weight at registration → 1.5× at T-7 days → 2× at T-1 day → 3× on event day (content pinned to top) → gradual exponential decay back to base weight by T+7, with a permanent +0.05 connection bonus for all co-attendees.

Co-attendees' posts are integrated into each other's feeds at positions determined by the time-adjusted weight, with display formats ranging from full cards with participant badges (strong connections >0.7) to compact views (weak connections <0.4). Content diversity rules limit event participant content to 40% of any user's feed, with minimum 3-post spacing between same-participant content.

---

## Persona Descriptions

### For AI / Code Generation

```yaml
flow_id: FLOW-08
entry_point: POST /events/{eventId}/participate
fallback_entry: POST /payments/process (paid events redirect)
prerequisite: User authenticated, event exists and has capacity (FLOW-03)

services:
  - api-gateway:              Route to event-service, auth validation
  - event-service:            Event lookup, participation orchestration
  - availability-service:     Atomic capacity management (PostgreSQL row locks)
  - payment-service:          Stripe integration, payment processing
  - ticketing-service:        Ticket generation with QR codes
  - calendar-service:         User calendar integration
  - reminder-service:         Progressive reminder scheduling (sorted sets)
  - participant-service:      Attendee identification
  - matching-service:         Multi-dimensional connection scoring
  - questionnaire-service:    Answer similarity comparison
  - group-service:            Shared group analysis
  - audience-service:         Business profile / target market matching
  - weight-calculation-service: Time-evolving weight multipliers
  - feed-service:             Participant content integration and positioning
  - notification-service:     Reminders, event updates, social prompts
  - analytics-service:        Metrics tracking, event ROI

sequence_phases:
  phase_1_availability_check:
    1. User clicks "Participate in Event" → Frontend sends POST /events/{eventId}/participate
    2. API Gateway → Event Service → Availability Service
    3. Availability Service checks capacity (DB read + cache check)
    4. If full → return "Event Full" + offer waitlist
    5. If available → reserve spot with 5-minute lock (Redis + DB)
    6. Return reservation confirmation

  phase_2_payment:  # skip for free events
    7. Frontend displays payment form
    8. User enters payment details
    9. POST /payments/process → Payment Service
    10. Payment Service validates data, calls Stripe/PaymentGateway
    11. If declined → release reservation, show error + retry
    12. If confirmed → store transaction, publish PaymentCompleted
    13. Return payment confirmation

  phase_3_ticketing:
    14. Ticketing Service consumes PaymentCompleted (or registration event for free)
    15. Generate ticket: QR code (encrypted: ticketId + userId + eventId), ticket number, type, seat
    16. Store ticket record (PostgreSQL)
    17. Send ticket to user (email PDF + Apple Wallet + in-app)
    18. Publish TicketIssued

  phase_4_capacity_and_calendar:
    19. Availability Service consumes TicketIssued → atomically decrement capacity (row lock)
    20. Update Redis cache with real-time count
    21. Publish CapacityUpdated → UI refreshes availability display
    22. Calendar Service consumes TicketIssued → add event to user calendar
    23. Publish EventAddedToCalendar

  phase_5_reminders:
    24. Reminder Service consumes EventAddedToCalendar
    25. Calculate reminder times in user's local timezone
    26. Schedule: T-7d (week), T-1d (day), T-1h (hour), T-15m (final)
    27. Store in Redis sorted sets (score = scheduled_timestamp)
    28. Publish RemindersScheduled

  phase_6_participant_identification:
    29. Participant Service consumes TicketIssued
    30. Query all current event participants (exclude current user)
    31. Publish ParticipantsIdentified

  phase_7_connection_scoring:
    32. Matching Service consumes ParticipantsIdentified
    33. For each participant pair, fetch parallel sub-scores:
        a. Event Service → query past co-attended events → return event history score
        b. Questionnaire Service → fetch completions, compare responses → return similarity
        c. Group Service → fetch common groups, calculate overlap → return group score
        d. Audience Service → fetch business profiles, match target audiences → return audience overlap
    34. Calculate composite connection score (4 × 0.25)
    35. Classify: strong (>0.7), medium (0.4-0.7), weak (<0.4)
    36. Store connection data
    37. Publish ParticipantConnectionsCalculated

  phase_8_feed_integration:
    38. Feed Service consumes ParticipantConnectionsCalculated
    39. Fetch participants' public posts
    40. Calculate initial feed weights (base_weight × time_multiplier + bonus)
    41. Calculate feed positions based on weighted scores
    42. Insert participant posts into user's feed (respecting diversity rules)
    43. Log feed update to analytics
    44. Publish ParticipantPostsIntegrated
    45. Update feed in real-time via WebSocket

  phase_9_time_evolution:  # triggered by Reminder Service cron
    46. At T-7: Reminder Service fires week-before reminder
    47. Weight Calculation Service increases multiplier to 1.5×
    48. Feed Service reorders participant content to top 30%
    49. Publish FeedWeightsAdjusted
    50. At T-1: Day-before reminder, multiplier → 2×, content → top 10%
    51. At T-0: Event day, multiplier → 3×, content pinned to top, real-time mode
    52. Publish EventFeedPrioritized

  phase_10_post_event:
    53. Publish EventCompleted
    54. Weight Calculation Service begins decay: weight(t) = base × e^(-0.1 × days)
    55. T+1 to T+3: multiplier 1.5×, -0.1/day decay
    56. T+7: return to base weight, apply permanent +0.05 bonus
    57. Analytics Service tracks engagement metrics
    58. Store participation data
    59. Publish EventParticipationAnalyzed

error_handling:
  payment_timeout:
    trigger: "5-minute reservation hold expires"
    action: "Release capacity lock, cancel PaymentIntent, show 'Session expired' with retry"
  payment_declined:
    trigger: "Stripe returns declined"
    action: "Release reservation, show error with alternative methods"
    retry: "Up to 3 attempts with different payment methods"
  double_payment:
    trigger: "Webhook delivered twice"
    action: "Idempotency key on paymentId. Second webhook returns 'already processed'"
  capacity_race:
    trigger: "Two users buy last ticket simultaneously"
    action: "Row-level lock on capacity counter. First lock wins, second gets waitlist"
  reminder_missed:
    trigger: "Reminder Service downtime at scheduled time"
    action: "Catch-up job runs every 15 minutes. Missed → send immediately with adjusted copy"
    fallback: "SMS fallback if push notification fails"

data_stores:
  - PostgreSQL: payments, tickets, capacity counters, participation records (ACID required)
  - MongoDB: participant profiles, event content, connection details
  - Redis: capacity cache (TTL 30s), weight cache (TTL 5min), reminder sorted sets, feed positions
  - Neo4j: participant connection graph (optional, for deep relationship queries)

api_endpoints:
  - POST   /events/{eventId}/participate     # initiate participation
  - POST   /payments/process                 # process payment
  - GET    /events/{eventId}/ticket          # retrieve user's ticket
  - GET    /events/{eventId}/participants    # list participants (paginated)
  - DELETE /events/{eventId}/participation   # cancel participation
  - POST   /events/{eventId}/waitlist        # join waitlist
  - GET    /events/{eventId}/connections     # participant connection scores
```

### For Product Manager

**Business Value**: Events are the highest-value interaction on the platform — they drive real-world connections that translate to business partnerships. Payment processing generates direct revenue via ticket sales and service fees. The social integration before, during, and after events maximizes the relationship-building opportunity, making the platform indispensable for event-based networking.

**User Journey Context**: This flow picks up after FLOW-03 (Event Creation). The user has discovered an event through feed recommendations, search, or direct invitation. This flow covers everything from clicking "Register" to post-event relationship maintenance.

**Key Metrics**:
- **Conversion**: Event view → registration rate, payment completion rate, waitlist → registration conversion
- **Revenue**: Average ticket price, service fee revenue, refund rate
- **Engagement**: Reminder open rate by timing (T-7, T-1, T-1h, T-15m), pre-event content creation rate
- **Social**: Attendee-to-attendee connection rate (% who connect after event), cross-participant engagement rate
- **Retention**: Post-event content creation rate (recaps, highlights, follow-ups), event satisfaction survey scores
- **Network Effects**: New connections per event, post-event message initiation rate

**A/B Testing Opportunities**:
- Reminder timing and messaging copy (e.g., T-2 days vs T-1 day for "preview" reminder)
- Weight evolution multipliers (is 3× on event day optimal?)
- Feed diversity thresholds (40% cap — too high? too low?)
- Participant card display formats (full card vs compact)
- Waitlist position notifications and urgency messaging
- Post-event decay rate (0.1 vs 0.05 — how long should event connections stay boosted?)

**Feature Dependencies**: Requires FLOW-01 (user auth), FLOW-02 (business profile for audience matching), FLOW-03 (event exists), FLOW-04 (post system for feed integration), FLOW-07 (friend request flows if users want to connect post-event).

### For IT Security Manager

**Payment Security**:
- PCI DSS compliance fully delegated to Stripe — no card data touches our servers
- Payment confirmation via Stripe webhook with cryptographic signature verification (HMAC SHA-256)
- Idempotency key on all payment requests prevents double-charging
- 5-minute reservation hold prevents capacity oversell without storing sensitive payment data
- Refund processing requires admin approval for amounts > $500
- All payment-related API calls over HTTPS with TLS 1.3
- Payment logs retain transaction IDs only (no amounts in debug logs)

**Ticket Security**:
- QR codes contain AES-256 encrypted payload: `encrypt(ticketId + userId + eventId + timestamp)`
- Single-scan validation: ticket marked as "used" atomically on first scan, preventing duplication
- Ticket transfer requires both sender and recipient identity verification (OTP or biometric)
- QR code rotation every 15 minutes for unused tickets (prevents screenshot sharing)

**Data Sensitivity Classification**:

| Data | Classification | Retention |
|------|---------------|-----------|
| Payment amounts/methods | PCI Scope — encrypted at rest | 7 years (legal) |
| Transaction IDs | Internal | 7 years |
| Event attendance records | Internal (reveals user location at specific times) | 3 years |
| Participant connection weights | Internal | Active + 1 year |
| QR codes | Confidential (single-use tokens) | Until event end + 24h |
| Calendar data | PII (schedules, locations) | Until user deletion |

**Privacy Controls**:
- User can opt out of participant identification (attend anonymously — visible to organizer only)
- Location data from calendar integration requires explicit consent
- Connection scores never exposed to other users — only feed positioning effects are visible
- GDPR: right to erasure applies to all participation records, connection weights, and ticket history
- Participant list visibility configurable by organizer: public, registered-only, or hidden

**Attack Surface**:
- Payment replay attacks → idempotency keys
- Capacity manipulation → DB-level row locks + cache invalidation
- Ticket forgery → encrypted QR + server-side validation
- Attendee enumeration → rate-limited participant API, auth required
- Weight manipulation → server-calculated only, no client input to weight formulas

**Audit Trail**: All payment events, ticket scans, capacity changes, and refund operations logged with timestamp, actor, IP, and correlation ID.

### For DevOps

**Services Deployed** (14+ services involved in this flow):

| Service | Stack | Critical Path? | Scaling Trigger |
|---------|-------|----------------|-----------------|
| API Gateway | Kong/Nginx | Yes | Request rate |
| Event Service | Nest.js | Yes | Request count |
| Availability Service | Nest.js + PostgreSQL | **Yes (ACID)** | Write throughput (lock contention) |
| Payment Service | Nest.js + Stripe SDK | **Yes (revenue)** | Request count, Stripe API rate limits |
| Ticketing Service | Nest.js | Yes | Request count (burst on popular events) |
| Calendar Service | Nest.js | No | Request count |
| Reminder Service | Nest.js + Cron | **Yes (time-critical)** | Scheduled job throughput |
| Participant Service | Nest.js | No | Event size (n participants) |
| Matching Service | Python + ML | No | CPU (O(n²) pair calculations) |
| Questionnaire Service | Nest.js | No | Query throughput |
| Group Service | Nest.js | No | Query throughput |
| Audience Service | Nest.js | No | Query throughput |
| Weight Calculation Service | Python + Redis | No | Cron frequency × active events |
| Feed Service | Nest.js + Redis Cluster | No (degraded mode OK) | Write throughput |
| Notification Service | Nest.js + Redis pub/sub | No (retry OK) | Burst capacity |
| Analytics Service | Nest.js + InfluxDB | No | Event throughput |

**Critical Path**: `Payment → Ticket → Capacity` is the ACID-critical path. PostgreSQL row-level locks on capacity counter. Stripe webhook retry handling with exponential backoff and idempotency.

**Infrastructure Requirements**:
- PostgreSQL: Primary + 1 synchronous replica for payments/tickets/capacity
- Redis Cluster: 3-node minimum for capacity cache + reminder sorted sets + feed positions
- Message Queue: Redis Streams or RabbitMQ for event bus (guaranteed delivery for payment events)
- Kubernetes CronJob: Reliable scheduler for Reminder Service (or dedicated scheduler like Temporal)
- WebSocket: For real-time feed updates on event day

**Capacity Planning**:
- Max parallel bookings: 1,000/second (queue overflow: 10,000)
- Payment processing timeout: 30 seconds, 3 retry attempts
- Reservation timeout: 5 minutes (auto-release)
- Feed batch updates: 100 users per batch, 30-second refresh cycle
- Cache refresh: capacity (30s TTL), participant list (10min), connection scores (24h), feed positions (5min)

**Key Alerts**:

| Alert | Threshold | Severity |
|-------|-----------|----------|
| Payment failure rate | > 5% over 5 minutes | P1 |
| Ticket issuance latency | > 10 seconds | P2 |
| Capacity counter drift | sold + available ≠ total | **P0** |
| Reminder delivery failure | > 1% missed within window | P1 |
| Weight calculation latency | > 15 seconds per batch | P3 |
| Stripe webhook backlog | > 100 unprocessed | P2 |
| Reservation lock timeout | > 10% expired without payment | P3 |
| Feed update latency | > 60 seconds behind | P3 |

**Deployment Dependencies**: Payment Service requires Stripe API keys in secrets. Calendar Service needs OAuth tokens for Google Calendar / Apple Calendar integration. Reminder Service needs reliable cron (avoid pod restarts during scheduled windows).

**Failover Strategy**:
- Payment: If Stripe primary webhook fails, poll `/payments/events` endpoint as fallback
- Reminders: If push notification fails → SMS fallback → email fallback
- Capacity: If Redis cache fails → direct PostgreSQL read (higher latency, still correct)
- Feed: If feed update fails → queue for retry, user sees stale feed (acceptable degradation)

**Database Queries (optimized)**:
- Indexed on: `(eventId, userId)` composite, `eventId` partition by date
- Read replicas for analytics and participant list queries
- Dead letter queue for failed event processing with exponential backoff

---

## User Stories

**US-08.1 — Event Registration**: As a business owner, I want to register for an event, pay securely, and receive a ticket with QR code, so I never miss a networking opportunity.

**US-08.2 — Calendar Integration**: As a busy professional, I want the event automatically added to my calendar with smart reminders, so I'm prepared without manual effort.

**US-08.3 — Pre-Event Social Discovery**: As an event participant, I want to see posts from other attendees in my feed with increasing prominence as the event approaches, so I can prepare to network and know who to meet.

**US-08.4 — Event Day Experience**: As someone attending an event today, I want co-attendee content pinned to the top of my feed with real-time updates, so I can connect with the right people.

**US-08.5 — Post-Event Relationship Building**: As someone who attended an event, I want connections made at the event to persist in my feed with a bonus weight, so that event networking translates into ongoing relationships.

**US-08.6 — Waitlist**: As a user who found a sold-out event, I want to join a waitlist and be automatically registered if a spot opens up, so I don't have to keep checking back.

---

## Business Flow (Happy Path)

1. User clicks "Participate in Event" on event page
2. API Gateway routes to Event Service
3. Event Service calls Availability Service to check capacity
4. Availability Service reads PostgreSQL + Redis cache → spots available
5. Availability Service reserves spot with 5-minute lock
6. (If paid) Frontend displays payment form
7. User enters payment details and submits
8. Payment Service creates Stripe PaymentIntent
9. Stripe processes transaction → returns confirmed
10. Payment Service stores transaction, publishes `PaymentCompleted`
11. Ticketing Service generates ticket (QR code, ticket number, type, seat)
12. Ticketing Service sends ticket via email + in-app, publishes `TicketIssued`
13. Availability Service atomically decrements capacity (row lock), publishes `CapacityUpdated`
14. Calendar Service adds event to user's calendar, publishes `EventAddedToCalendar`
15. Reminder Service schedules 4 reminders (T-7d, T-1d, T-1h, T-15m), publishes `RemindersScheduled`
16. Participant Service identifies all current attendees, publishes `ParticipantsIdentified`
17. Matching Service calculates connection score for each attendee pair (4 parallel sub-queries)
18. Matching Service publishes `ParticipantConnectionsCalculated`
19. Feed Service integrates co-attendee posts into user's feed at weighted positions
20. Feed Service publishes `ParticipantPostsIntegrated`, updates UI via WebSocket
21. As event approaches: Weight Calculation Service increases multipliers on schedule (T-7, T-1, T-0)
22. Feed Service reorders participant content, publishes `FeedWeightsAdjusted`
23. On event day: participant content pinned to top, real-time updates enabled
24. Feed Service publishes `EventFeedPrioritized`
25. Post-event: gradual exponential decay to base weight with permanent +0.05 bonus
26. Analytics Service records engagement metrics, publishes `EventParticipationAnalyzed`
27. Gamification Service awards event attendance points

---

## Scenarios

### Scenario 1: Free Event Registration
- Skip payment phase entirely (steps 6-10)
- Ticketing Service issues free ticket (paymentId = null, type = "free")
- Availability Service still reserves and decrements capacity
- Rest of flow (calendar, reminders, social integration) identical

### Scenario 2: Waitlist Registration
- Availability Service returns "capacity full"
- User offered waitlist option
- User joins waitlist → Availability Service stores waitlist entry with position
- Publish `AddedToWaitlist` event
- If someone cancels → first waitlister auto-upgraded
- Payment charged only upon upgrade from waitlist
- Notification: "A spot opened up! You have 30 minutes to complete registration."

### Scenario 3: Group Registration
- One user registers multiple attendees (colleagues, team members)
- Separate tickets issued per attendee
- Discount may apply per FLOW-06 pricing tiers
- Social integration activated for all registered users (each gets participant feed)
- Payment: single transaction, multiple ticket records

### Scenario 4: Event Cancellation by Organizer
- All tickets refunded automatically via Stripe batch refund
- Calendar entries removed via Calendar Service
- All scheduled reminders cancelled (delete from Redis sorted sets)
- Feed integration unwound: remove event participant badges, restore original feed positions
- Notification to all registrants: "Event cancelled — full refund processing"
- Waitlisted users also notified

### Scenario 5: Virtual Event
- No physical location / QR scanning at door
- Calendar entry includes virtual meeting link (Zoom, Teams, etc.)
- Real-time social integration during event via WebSocket
- Screen sharing and chat integration surfaces participant connection data
- "Who's in the room" feature shows connection scores for active participants

### Scenario 6: User Self-Cancellation
- User requests cancellation via DELETE /events/{eventId}/participation
- Refund policy applied:
  - 7+ days before → full refund
  - 3-7 days before → 50% refund
  - <3 days before → no refund (transfer option available)
- Ticket invalidated, capacity restored (+1 available)
- Social integration removed (participant posts return to standard weight)
- If waitlist exists → next waitlister auto-upgraded

### Scenario 7: Anonymous Attendance
- User opts in to "attend anonymously"
- Ticket issued but user excluded from participant identification
- No connection scoring for this user
- Co-attendees don't see this user in participant lists
- Organizer can still see attendance (for capacity/fire code purposes)

---

## Edge Cases

1. **Payment timeout (5-minute hold expires)**: Release reserved capacity. Cancel Stripe PaymentIntent. Show "Session expired" with option to retry. If user retries, new reservation created (may fail if capacity changed).

2. **Double-payment (webhook delivered twice)**: Idempotency key on paymentId. Second webhook skipped with "already processed" log. No duplicate ticket issued.

3. **Capacity race condition**: Two users buy last ticket simultaneously. PostgreSQL row-level lock on `events.available_places`. First to acquire lock succeeds (ticket issued), second gets "Sold out" with waitlist offer. Redis cache invalidated immediately.

4. **User cancels after ticket issuance**: Refund processed per policy (full/partial/none). Ticket QR invalidated (marked `status=cancelled`). Capacity atomically incremented. Social integration removed (connection weights cleared). If cancellation within 5 minutes of purchase, always full refund.

5. **Reminder Service downtime at T-1 hour**: Catch-up detection job runs every 15 minutes. If reminder not sent within expected window, mark as missed and send immediately with adjusted copy ("happening now" vs "starting soon"). SMS fallback if push fails.

6. **Participant weight calculation for 1000+ attendees**: O(n²) pair calculations. Optimization: calculate weights only for users with shared context (same groups, similar profiles). Default base weight (0.1) for zero-context pairs. Batch processing in 100-user chunks. Total calculation timeout: 5 minutes per event.

7. **Timezone confusion for international virtual event**: All times stored in UTC. Display converted to user's local timezone. Calendar entry includes IANA timezone identifier. Reminders trigger based on user's local time, not event timezone.

8. **Event date changes after registration**: Re-schedule all reminders (delete old sorted set entries, insert new). Update all calendar entries via Calendar Service. Notify all registered users with old and new dates. Weight evolution timeline resets relative to new date.

9. **Stripe webhook delay (>30 seconds)**: User sees "processing" state. Polling endpoint checks payment status every 5 seconds for 2 minutes. If confirmed via poll, proceed with ticket issuance. If still pending after 2 minutes, show "We'll email your ticket when payment confirms."

10. **User registered for overlapping events**: Calendar Service detects time overlap. User warned but not blocked (their choice). Reminders for both events scheduled independently. Feed integration active for both events' participants simultaneously.

11. **Organizer increases capacity after sellout**: Waitlisted users auto-upgraded in order of waitlist position. Each upgrade triggers full flow (payment if paid, ticket, calendar, social integration).

12. **Feed diversity overflow**: Event has 200 participants all posting. 40% cap means max ~8 out of 20 feed items from event participants. Ranking within the 40% by connection weight. Remaining 60% from non-event sources.

---

## Business Logic

### Participant Connection Weight Formula

```
base_weight = (event_history × 0.25) + (questionnaire_match × 0.25) + 
              (group_overlap × 0.25) + (audience_match × 0.25)
```

Each component normalized to [0.0, 1.0]. Final base_weight range: [0.0, 1.0].

### Sub-Calculation: Event History Score (0.25 weight)

```yaml
event_history_score:
  same_events_count:   log(1 + co_attended_count) × 0.30   # logarithmic dampening
  event_type_similarity: jaccard(types_A, types_B) × 0.25  # networking, workshop, etc.
  interaction_at_events: interaction_count / events × 0.25  # likes, comments, check-ins
  recency_of_shared:   e^(-0.05 × days_since_last) × 0.20 # exponential recency bias
```

### Sub-Calculation: Questionnaire Similarity Score (0.25 weight)

```yaml
questionnaire_score:
  completion_overlap: shared_questions / total_questions × 0.30
  answer_similarity:  cosine_similarity(answers_A, answers_B) × 0.35
  score_proximity:    1 - |score_A - score_B| / max_score × 0.20
  topic_alignment:    jaccard(topics_A, topics_B) × 0.15
```

### Sub-Calculation: Group Overlap Score (0.25 weight)

```yaml
group_score:
  common_groups:     shared_groups / max(groups_A, groups_B) × 0.40
  activity_in_groups: avg_activity_overlap × 0.30  # both active in shared groups
  role_similarity:    role_match_score × 0.30      # both admins, both members, etc.
```

### Sub-Calculation: Audience/Market Match Score (0.25 weight)

```yaml
audience_score:
  target_market_overlap:  jaccard(market_A, market_B) × 0.35
  industry_alignment:     industry_similarity_score × 0.25
  customer_profile_match: cosine(customer_A, customer_B) × 0.25
  geographic_overlap:     geo_intersection_ratio × 0.15
```

### Time-Based Weight Evolution

| Timing | Multiplier | Bonus | Feed Position | Badge | Notifications |
|--------|-----------|-------|---------------|-------|---------------|
| Registration | 1.0× | +0.1 | Standard | No | Welcome only |
| T-7 days | 1.5× | +0.2 | Top 30% | Event context badge | Standard |
| T-1 day | 2.0× | +0.4 | Top 10% | Highlighted | Priority |
| T-0 (event day) | 3.0× | +0.6 | Pinned/Top | Prominent | Real-time |
| T+1 to T+3 | 1.5× | -0.1/day | Decaying | Fading | Post-event recap |
| T+7 | 1.0× | +0.05 permanent | Standard | None | None |

**Effective weight at any time**:
```
effective_weight(t) = base_weight × multiplier(t) + bonus(t)
```

### Post-Event Decay Function

```
weight(t) = base_weight × e^(-0.1 × days_after_event)
```
Where `decay_rate = 0.1` (configurable per event type). After 7 days, weight ≈ base_weight × 0.497 → rounds to base_weight with +0.05 permanent bonus applied.

### Connection Strength Classification

| Strength | Weight Range | Display Format | Feed Behavior |
|----------|-------------|----------------|---------------|
| Strong | > 0.7 | Full card with context, participant badge prominent, mutual connections shown, direct message CTA | Priority positioning, real-time updates |
| Medium | 0.4 – 0.7 | Standard card, participant indicator, common interests highlighted | Standard positioning, batched updates |
| Weak | < 0.4 | Compact view, basic participant tag | Only shown if high engagement, lower priority |

### Feed Diversity Rules

```yaml
feed_diversity:
  max_participant_content: 40%     # of total feed items
  min_posts_between_same_participant: 3
  content_types_balanced: [text, image, video, check-in]
  chronological_relevance: true    # newer content ranks higher within weight class
  participant_content_ranking: by effective_weight DESC, then by post_engagement DESC
```

### Participant Content Types by Phase

```yaml
pre_event:
  - Preparation posts
  - Excitement/anticipation
  - Travel plans
  - Meetup suggestions

during_event:
  - Live updates
  - Photos/videos
  - Check-ins
  - Real-time reactions

post_event:
  - Highlights/recap
  - Connections made
  - Follow-ups
  - Shared memories
```

### Payment Hold Rules

```yaml
payment:
  reservation_hold: 5 minutes
  auto_release_on_timeout: true
  methods: [card, paypal, bank, crypto, apple_pay]
  installment_plans: per organizer configuration

refund_policy:
  within_5_minutes: full_refund_always
  7_plus_days_before: full_refund
  3_to_7_days_before: 50_percent_refund
  under_3_days: no_refund (transfer_option_available)
  event_cancellation: full_refund_always
  admin_approval_required: amount > $500
```

### Ticket Types and Delivery

```yaml
ticket_types:
  - standard: General admission
  - vip: Premium access, priority seating
  - early_bird: Discounted early registration
  - group: Bulk purchase packages
  - student_senior: Discounted tiers

delivery_methods:
  - email: PDF attachment + Apple Wallet pass
  - in_app: Stored in ticket wallet
  - sms: Link to ticket page
  - print: Print-at-home PDF

verification:
  - qr_code_scanning: Primary method
  - ticket_number_lookup: Manual fallback
  - id_verification: For VIP / high-value events
  - transfer_validation: OTP + recipient verification
```

### Reminder Schedule

| Timing | Content | Channels | Send Time |
|--------|---------|----------|-----------|
| T-7 days | Event details, preparation tips | Email + Push | 10 AM user timezone |
| T-1 day | Final details, participant count, highlights | Push + In-app | 6 PM user timezone |
| T-1 hour | "Event starting soon" + directions/link | Push + SMS (if enabled) | T-1h exact |
| T-15 min | "Almost time!" + QR code / virtual link | Push | T-15m exact |

### Smart Notifications (beyond standard reminders)

```yaml
participant_activity:
  - "A connection you know just registered for this event"
  - "3 people from your group [GroupName] are attending"
  - "[Participant] posted about the event"
  
event_updates:
  - "Schedule change: event moved to [new time]"
  - "New information from organizer"
  - "Weather alert for outdoor event"

social_prompts:
  - "Connect with [Name] before the event — you share 3 common interests"
  - "Join the event discussion group"
```

### Notification Fatigue Prevention

```yaml
fatigue_rules:
  max_notifications_per_day: 3      # pre-event period
  batch_similar: true                # combine "3 new participants" into one
  respect_quiet_hours: true          # no notifications 10 PM - 8 AM local
  user_preference_overrides: true    # user can disable specific categories
  progressive_frequency: true        # increase only as event approaches
```

---

## Event Definitions

### PaymentCompleted

| Field | Type | Description |
|-------|------|-------------|
| `paymentId` | string | Unique payment identifier (idempotency key) |
| `userId` | string | Paying user |
| `eventId` | string | Event being paid for |
| `amount.value` | number | Total amount charged |
| `amount.currency` | string | ISO 4217 currency code |
| `amount.breakdown.ticketPrice` | number | Base ticket price |
| `amount.breakdown.serviceFee` | number | Platform fee |
| `amount.breakdown.tax` | number | Applicable tax |
| `paymentMethod` | enum | card, paypal, bank, crypto, apple_pay |
| `transactionId` | string | Stripe transaction ID |
| `completedAt` | timestamp | ISO 8601 |

**Publisher**: Payment Service  
**Consumers**: Ticketing Service, Analytics Service

### TicketIssued

| Field | Type | Description |
|-------|------|-------------|
| `ticketId` | string | Unique ticket ID |
| `userId` | string | Ticket holder |
| `eventId` | string | Event |
| `ticketDetails.ticketNumber` | string | Human-readable ticket number |
| `ticketDetails.qrCode` | string | Encrypted QR payload (base64) |
| `ticketDetails.type` | enum | general, vip, early_bird, group |
| `ticketDetails.seat` | string | Seat assignment (if applicable) |
| `ticketDetails.section` | string | Section (if applicable) |
| `eventInfo.name` | string | Event name |
| `eventInfo.date` | timestamp | Event start time |
| `eventInfo.location` | string | Venue or virtual link |
| `eventInfo.organizer` | string | Organizer name |
| `issuedAt` | timestamp | ISO 8601 |

**Publisher**: Ticketing Service  
**Consumers**: Availability Service, Calendar Service, Participant Service

### CapacityUpdated

| Field | Type | Description |
|-------|------|-------------|
| `eventId` | string | Event ID |
| `capacity.total` | number | Total capacity |
| `capacity.available` | number | Remaining spots |
| `capacity.reserved` | number | Currently in payment flow |
| `capacity.waitlist` | number | Waitlisted users |
| `ticketsSold` | number | Confirmed tickets |
| `updatedAt` | timestamp | ISO 8601 |

**Publisher**: Availability Service  
**Consumers**: Event Service, UI Service (real-time counter)

### EventAddedToCalendar

| Field | Type | Description |
|-------|------|-------------|
| `calendarEntryId` | string | Calendar system entry ID |
| `userId` | string | User |
| `eventId` | string | Event |
| `eventDetails.title` | string | Calendar entry title |
| `eventDetails.startTime` | timestamp | Start (UTC) |
| `eventDetails.endTime` | timestamp | End (UTC) |
| `eventDetails.location` | string | Venue address or virtual link |
| `eventDetails.description` | string | Event summary + ticket reference |
| `eventDetails.ticketReference` | string | Link to ticket |
| `reminderPreferences.week` | boolean | User wants T-7d reminder |
| `reminderPreferences.day` | boolean | User wants T-1d reminder |
| `reminderPreferences.hours` | number | Custom hours-before reminder |
| `addedAt` | timestamp | ISO 8601 |

**Publisher**: Calendar Service  
**Consumers**: Reminder Service

### RemindersScheduled

| Field | Type | Description |
|-------|------|-------------|
| `userId` | string | User |
| `eventId` | string | Event |
| `reminders[].reminderId` | string | Unique reminder ID |
| `reminders[].type` | enum | week_before, day_before, hour_before, final |
| `reminders[].scheduledTime` | timestamp | When to fire (user's local) |
| `reminders[].channel` | enum | push, email, sms, in_app |
| `scheduledAt` | timestamp | ISO 8601 |

**Publisher**: Reminder Service  
**Consumers**: Notification Service, Analytics Service

### ParticipantsIdentified

| Field | Type | Description |
|-------|------|-------------|
| `eventId` | string | Event |
| `currentUserId` | string | Newly registered user (trigger) |
| `participants[].userId` | string | Other attendee |
| `participants[].ticketType` | string | Their ticket type |
| `participants[].registrationDate` | timestamp | When they registered |
| `participants[].profile.name` | string | Display name |
| `participants[].profile.avatar` | string | Avatar URL |
| `participants[].profile.isPublic` | boolean | Non-anonymous |
| `totalParticipants` | number | Total registered |
| `identifiedAt` | timestamp | ISO 8601 |

**Publisher**: Participant Service  
**Consumers**: Matching Service

### ParticipantConnectionsCalculated

| Field | Type | Description |
|-------|------|-------------|
| `eventId` | string | Event |
| `userId` | string | User whose connections were calculated |
| `connections[].participantId` | string | Connected participant |
| `connections[].connectionScore` | number | Composite score [0.0-1.0] |
| `connections[].breakdown.eventHistory` | number | Sub-score |
| `connections[].breakdown.questionnaireMatch` | number | Sub-score |
| `connections[].breakdown.groupOverlap` | number | Sub-score |
| `connections[].breakdown.audienceMatch` | number | Sub-score |
| `connections[].sharedContext.commonEvents` | string[] | Event IDs |
| `connections[].sharedContext.commonGroups` | string[] | Group IDs |
| `connections[].sharedContext.commonInterests` | string[] | Interest tags |
| `connections[].sharedContext.audienceOverlap` | number | Overlap % |
| `connections[].connectionStrength` | enum | strong, medium, weak |
| `averageWeight` | number | Avg across all connections |
| `calculatedAt` | timestamp | ISO 8601 |

**Publisher**: Matching Service  
**Consumers**: Feed Service, Weight Calculation Service, Ranking Service

### ParticipantPostsIntegrated

| Field | Type | Description |
|-------|------|-------------|
| `eventId` | string | Event |
| `userId` | string | User whose feed was updated |
| `integration.postsAdded` | number | Posts inserted into feed |
| `integration.participants` | number | Unique participants represented |
| `integration.averageWeight` | number | Average weight of integrated posts |
| `integration.feedPositions.top10` | number | Posts in top 10% |
| `integration.feedPositions.top50` | number | Posts in top 50% |
| `integration.feedPositions.other` | number | Posts in bottom 50% |
| `integratedAt` | timestamp | ISO 8601 |

**Publisher**: Feed Service  
**Consumers**: Analytics Service

### FeedWeightsAdjusted

| Field | Type | Description |
|-------|------|-------------|
| `eventId` | string | Event |
| `userId` | string | User affected |
| `adjustment.trigger` | enum | week_before, day_before, hour_before, event_day, post_event_decay |
| `adjustment.baseWeight` | number | Pre-adjustment weight |
| `adjustment.boostFactor` | number | Multiplier applied |
| `adjustment.affectedPosts` | number | Posts repositioned |
| `adjustment.newAveragePosition` | number | New avg feed position |
| `adjustedAt` | timestamp | ISO 8601 |

**Publisher**: Weight Calculation Service  
**Consumers**: Feed Service, Analytics Service

### EventFeedPrioritized

| Field | Type | Description |
|-------|------|-------------|
| `eventId` | string | Event |
| `userId` | string | User |
| `prioritization.pinnedPosts` | number | Posts pinned to top |
| `prioritization.boostedPosts` | number | Posts moved up |
| `prioritization.participantHighlights` | number | Highlighted profiles |
| `prioritization.interactionPrompts` | number | Social prompts shown |
| `prioritizedAt` | timestamp | ISO 8601 |

**Publisher**: Feed Service  
**Consumers**: UI Service, Analytics Service

### EventParticipationAnalyzed

| Field | Type | Description |
|-------|------|-------------|
| `userId` | string | User |
| `eventId` | string | Event |
| `participationType` | enum | in_person, virtual, anonymous |
| `socialMetrics.connectionsViewed` | number | Participant profiles viewed |
| `socialMetrics.connectionsRequested` | number | Friend requests sent |
| `socialMetrics.postsCreated` | number | Event-related posts |
| `socialMetrics.engagement` | number | Likes/comments on participant content |
| `analyzedAt` | timestamp | ISO 8601 |

**Publisher**: Analytics Service  
**Consumers**: Gamification Service, ML Service

---

## Services Involved

| Service | Role in Flow | Database | Scales On | SLA |
|---------|-------------|----------|-----------|-----|
| API Gateway | Route requests, auth validation | — | Request rate | 99.99% |
| Event Service | Event lookup, orchestration | PostgreSQL | Request count | 99.9% |
| Availability Service | Atomic capacity management | PostgreSQL (row locks) + Redis | Write throughput (contention) | 99.99% |
| Payment Service | Stripe integration, refunds | PostgreSQL (PCI) | Request count, Stripe rate | 99.99% |
| Ticketing Service | Ticket + QR generation | PostgreSQL | Request count (burst) | 99.9% |
| Calendar Service | External calendar integration | PostgreSQL | Request count | 99.5% |
| Reminder Service | Scheduled notification delivery | Redis (sorted sets) | Scheduled job throughput | 99.9% |
| Participant Service | Attendee identification | PostgreSQL + MongoDB | Event size (n) | 99.5% |
| Matching Service | Multi-dimensional scoring | PostgreSQL + MongoDB + Redis | CPU (O(n²) pairs) | 99.5% |
| Questionnaire Service | Answer similarity | MongoDB | Query throughput | 99.5% |
| Group Service | Shared group analysis | MongoDB + Neo4j | Query throughput | 99.5% |
| Audience Service | Business profile matching | MongoDB | Query throughput | 99.5% |
| Weight Calculation Service | Time-evolving weight adjustments | Redis + Python ML | Cron × active events | 99.5% |
| Feed Service | Participant content integration | Redis Cluster | Write throughput | 99.5% |
| Notification Service | Reminders, updates, social prompts | Redis pub/sub | Burst capacity | 99.5% |
| Analytics Service | Metrics, event ROI tracking | InfluxDB + Redis | Event throughput | 99.0% |
| Gamification Service | Attendance points | InfluxDB + Redis | Event throughput | 99.0% |

---

## Sequence Diagram Reference (from drawio)

**Diagram**: `participate in event`  
**Lifelines** (23): User, Frontend/UI, API Gateway, Event Service, Availability Service, Payment Service, Payment Gateway, Ticketing Service, Calendar Service, Reminder Service, Participant Service, Matching Service, Feed Service, Weight Calculation Service, Notification Service, Questionnaire Service, Group Service, Audience Service, Analytics Service, Event Bus, Database, Cache Layer, Message Queue  
**Total Messages**: 145  
**Key Interaction Groups**:
- Availability check + waitlist (messages 1-14)
- Reservation + payment (messages 15-33)
- Ticketing + capacity (messages 34-68)
- Calendar + reminders (messages 69-78)
- Participant identification + scoring (messages 79-103)
- Feed integration + positioning (messages 104-112)
- Time-evolution reminders + weight adjustments (messages 113-133)
- Post-event decay + analytics (messages 134-145)

---

## Performance & Scaling Reference

```yaml
system_capacity:
  concurrent_bookings: 1000/second (queue overflow: 10000)
  feed_updates: batch 100 users / 30 second cycle
  payment_timeout: 30 seconds / 3 retries / fallback gateway
  reservation_timeout: 5 minutes

caching_strategy:
  event_details: 1 hour TTL
  participant_list: 10 minutes TTL
  connection_scores: 24 hours TTL (invalidated on new registration)
  feed_positions: 5 minutes TTL
  capacity_counter: 30 seconds TTL (write-through on change)

database_optimization:
  indexes: (eventId, userId) composite, eventId partition by date
  read_replicas: analytics queries, participant list reads
  partitioning: events by date, tickets by event

queue_management:
  priority_queues: payment events > ticket events > feed events
  dead_letter_queue: failed events with exponential backoff
  retry_policy: 3 attempts, 1s/5s/30s delays
```

---

## Analytics & Monitoring

```yaml
conversion_metrics:
  - event_view_to_registration_rate
  - payment_completion_rate
  - waitlist_conversion_rate
  - registration_to_attendance_rate

engagement_metrics:
  - participant_post_interaction_rate
  - connection_request_rate_per_event
  - feed_engagement_increase (vs baseline)
  - pre_event_content_creation_rate

social_impact_metrics:
  - new_connections_per_event
  - cross_participant_engagement_rate
  - post_event_retention (30/60/90 day)
  - message_initiation_between_co_attendees

revenue_metrics:
  - ticket_sales_revenue_per_event
  - average_service_fee
  - refund_rate
  - repeat_attendee_rate

system_performance:
  - booking_latency_p50_p95_p99
  - payment_success_rate
  - feed_update_speed
  - notification_delivery_rate
  - weight_calculation_batch_time

event_roi:
  - social_reach_generated
  - user_engagement_lift
  - network_effects_created
  - platform_stickiness_impact
```
To extend the capabilities of the XIIGen platform with the event participation process, the **FLOW-08** system can be integrated into the existing **Master Skills Index**. This integration leverages 14 microservices and involves approximately 145 discrete interaction steps to manage the journey from registration to post-event social engagement.

### Architectural Integration Plan

The implementation follows the **Unified Flow System** architecture and maps to the following core skills:

* **Availability & Spot Reservation**: The flow begins with capacity verification using the **Event Management Service (Skill 53)**. It utilizes PostgreSQL row-level locks for atomic counter updates to prevent overbooking during the 5-minute reservation hold.
* **Payment & Ticketing**: For paid events, the **Payment Service (Skill 56)** manages Stripe PaymentIntents. Upon success, the **Ticketing Service (Skill 63)** generates a unique ticket with a QR code.
* **Scheduling & Reminders**: The **Calendar Service (Skill 62)** handles synchronization with the user's personal calendar. A progressive notification sequence is executed by the **Notification Service (Skill 24)** at T-7 days, T-1 day, T-1 hour, and T-15 minutes.
* **Social & Feed Evolution**: This phase uses the **Connections Service (Skill 49)** for participant scoring and the **Feed Service (Skill 46)** to manage time-based weight evolution (pre, during, and post-event). The **Weight Calculator Service (Skill 57)** determines the relevance of social content among co-attendees.
* **Orchestration**: The entire Directed Acyclic Graph (DAG) is managed by the **Flow Orchestrator (Skill 09)**, ensuring state checkpointing and parallel execution of non-dependent steps.

### Monitoring & Analytics

The following conversion and engagement metrics will be tracked via the **Analytics Service (Skill 48)**:

* **Conversion**: Event view-to-registration rate, payment completion rate, and waitlist-to-attendance conversion.
* **Engagement**: Participant post-interaction rates and connection request frequency per event.
* **Social Impact**: New connections established per event and post-event retention (30/60/90 days).

### Next Steps for Implementation

1. **Register JSON Flow**: Upload the `08-event-participation-flow.json` definition to the **Flow Definition Service (Skill 08)**.
2. **Service Configuration**: Configure the **Redis Queue Service (Skill 04)** to handle high-priority payment and ticket event events.
3. **Deployment**: Deploy updated manifests for the **Event Management** and **Ticketing** services within the Kubernetes cluster.
Based on the provided documentation, integrating the **Event Participation & Social Integration (FLOW-08)** process into the **XIIGen** platform requires a multi-layered extension of the existing microservices architecture. This flow manages the journey from capacity verification to post-event social engagement.

### Integration Strategy for FLOW-08

The implementation of FLOW-08 leverages the platform's **Unified Flow System** and **Flow Orchestrator (Skill 09)** to coordinate 14 discrete microservices. The process is structured into three primary phases:

#### 1. Registration & Payment (The Gateway)

* **Capacity Verification**: The **Event Management Service (Skill 53)** performs atomic capacity checks using row-level locks in the database.
* **Payment Processing**: For paid events, the **Payment Service (Skill 56)** manages Stripe transactions, including the creation of `PaymentIntent`.
* **Ticketing**: Upon successful payment, the **Ticketing Service (Skill 63)** issues a secure ticket with a unique QR code.

#### 2. Scheduling & Notifications (The Operational Layer)

* **Calendar Integration**: The **Calendar Service (Skill 62)** adds the event to the user's schedule.
* **Progressive Reminders**: The **Notification Service (Skill 24)** executes a reminder sequence at specific intervals: T-7 days, T-1 day, T-1 hour, and T-15 minutes.
* **Queue Management**: High-priority ticketing and payment events are handled by the **Redis Queue Service (Skill 04)** to ensure reliability.

#### 3. Social Integration & Feed Evolution (The Engagement Layer)

* **Participant Matching**: The **Connections Service (Skill 49)** scores co-attendees to facilitate networking.
* **Time-Based Weighting**: The **Feed Service (Skill 46)** and **Weight Calculator Service (Skill 57)** adjust the relevance of event-related content dynamically through pre-event, during-event, and post-event stages.
* **Analytics**: Engagement metrics, such as view-to-registration conversion and post-event retention, are tracked via the **Analytics Service (Skill 48)**.

### Implementation Roadmap

To successfully extend the platform, follow these steps:

1. **Flow Registration**: Upload the `08-event-participation-flow.json` definition to the **Flow Definition Service (Skill 08)**.
2. **Service Configuration**: Deploy or update the manifests for the **Ticketing (Skill 63)** and **Event Management (Skill 53)** services within the Kubernetes cluster.
3. **Prerequisites**: Ensure that **FLOW-01 (User Registration)**, **FLOW-02 (Business Onboarding)**, and **FLOW-03 (Event Creation)** are fully operational, as FLOW-08 depends on their underlying data structures.
4. **Monitoring Setup**: Configure the **Analytics Service (Skill 48)** to track the specific KPIs defined for participant impact and social retention.