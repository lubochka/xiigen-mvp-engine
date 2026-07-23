<!--
  Source: business flows.zip / 06-marketplace-publishing.md
  Canonical since: 2026-04-22
  Canonical flow: FLOW-08 marketplace
  Related deep-research: docs/business-flows/_deep-research/marketplace/ (if present)
  Related legacy engine artifacts: docs/business-flows/_legacy-engine-artifacts/marketplace/ (if present)
-->

# Marketplace Publishing & Distribution

> **Flow ID**: FLOW-06  
> **Drawio Diagram**: list on market  
> **Version**: 1.0  
> **Last Updated**: 2026-02-25  

---

## Short Description

Handles listing a product/service on the business marketplace — from item creation and inventory setup through automated social post generation, multi-audience targeting (friends, groups, business cooperators), synergy-based cooperator matching, and multi-format feed distribution.

## Long Description

This flow enables business owners to list products or services on the platform marketplace and have those listings automatically promoted to the most relevant audiences. It combines e-commerce functionality with social distribution and a unique "cooperator matching" system.

When a seller creates a marketplace item (with details, pricing tiers, inventory, and target audience), three parallel processes activate. First, the Analytics Service profiles the target audience — identifying buyer personas, industries, and geographic regions. Second, the Post Service auto-generates a social marketplace post from the listing (with headline, highlights, media, and special offers). Third, the Cooperator Service identifies potential business partners whose products complement the listing, using a synergy score based on audience overlap (30%), product complementarity (25%), market presence (20%), reputation (15%), and collaboration history (10%).

The post is then distributed to friends (with purchase affinity scoring), relevant groups (marketplace-enabled groups get auto-posts), and cooperators (who see special "Partnership Opportunity" cards with audience overlap data). The flow also manages inventory sync, dynamic pricing adjustments, and special discount tiers (friend discount 5-10%, group member discount 10-15%, cooperator bundle pricing).

---

## Persona Descriptions

### For AI / Code Generation

```yaml
flow_id: FLOW-06
entry_point: POST /marketplace/items
prerequisite: User has business profile (FLOW-02), verified seller status

services:
  - inventory-service:    Manages item details, stock, availability
  - marketplace-service:  Handles listing lifecycle, pricing, visibility
  - analytics-service:    Audience profiling, buyer persona analysis
  - post-service:         Auto-generates social marketplace post
  - cooperator-service:   Identifies partnership opportunities via synergy scoring
  - connection-service:   Friend audience with purchase affinity
  - group-service:        Group marketplace sections
  - feed-service:         Multi-format distribution (product cards, partnership cards)
  - notification-service: Cooperator partnership notifications

event_chain:
  1. MarketplaceItemCreated → analytics-service, post-service, cooperator-service
  2. ListingPublished → post-service, analytics-service
  3. TargetAudienceAnalyzed → cooperator-service, matching-service
  4. MarketplacePostCreated → connection-service, group-service, feed-service
  5. FriendAudienceIdentified → feed-service
  6. GroupAudienceIdentified → feed-service
  7. CooperatorsIdentified → feed-service, notification-service
  8. MarketplaceFeedDistributed → analytics-service
  9. MarketplacePostRanked → feed-service
  10. MarketplacePostDistributed → analytics-service
  11. CooperatorNotificationsSent → analytics-service

cooperator_algorithm:
  synergy_score:
    audience_overlap: 0.30
    product_complement: 0.25
    market_presence: 0.20
    reputation_score: 0.15
    collaboration_history: 0.10
  
  product_complementarity:
    perfect_complement: 1.0   # Different category, same use case, bundle opportunity
    good_complement: 0.7      # Related category, cross-sell opportunity
    neutral: 0.4              # Same market, different segment
    competing: 0.0            # Same category and use case
  
  cooperation_types:
    cross_promotion: {min_synergy: 0.5, desc: "mutual product promotion"}
    bundle_partner: {min_synergy: 0.7, desc: "product bundling opportunity"}
    referral_partner: {min_synergy: 0.4, desc: "customer referrals"}
    distribution_channel: {min_synergy: 0.6, desc: "reseller opportunity"}

pricing:
  friend_discount: "5-10%"
  group_member_discount: "10-15%"
  cooperator_bundle: "custom negotiated"

data_stores:
  - PostgreSQL: listings, transactions, inventory
  - MongoDB: item details, marketplace posts
  - Redis: inventory cache, pricing cache
  - Elasticsearch: marketplace search index
```

### For Product Manager

**Business Value**: The marketplace transforms the platform from networking-only into a commerce-enabled ecosystem. Cooperator matching is the unique differentiator — helping small businesses find complementary partners for bundles, referrals, and cross-promotions automatically.

**Key Metrics**:
- Listings created per week, active listings count
- Listing-to-inquiry conversion rate
- Cooperator match acceptance rate
- Revenue from marketplace transactions (platform fee)
- Friend discount redemption rate
- Bundle partnership creation rate

**Feature Dependencies**: Depends on FLOW-02 (business profiles for cooperator matching), FLOW-07 (friend connections). Revenue processing links to Payments microservice.

**A/B Testing**: Auto-post format variations, cooperator card design, discount tier values, synergy score thresholds.

### For IT Security Manager

**Data Sensitivity**: Pricing data, inventory levels, and buyer behavior are Confidential. Cooperator matching reveals competitive intelligence (who complements whom). Transaction data requires PCI DSS compliance.

**Attack Surface**:
- Fake listings: content moderation + seller verification required
- Price manipulation: admin-auditable pricing changes with change history
- Inventory fraud: real-time stock validation before purchase confirmation
- Cooperator spam: rate limit partnership requests (5/day)
- Scraping: rate limit marketplace search API, require auth for detailed pricing

**Compliance**: Consumer protection laws apply to marketplace transactions. Clear seller/buyer terms, return policy display, tax calculation transparency.

### For DevOps

**Services**: Inventory Service (Nest.js + PostgreSQL), Marketplace Service (Nest.js), Cooperator Service (Python + ML), Post Service (Nest.js + MongoDB), Feed pipeline services, Notification Service.

**Scaling**: Inventory Service needs strong consistency (stock counts). Cooperator matching is batch-heavy per new listing (scans active businesses). Feed distribution follows FLOW-04 pattern.

**Key Alerts**: Inventory out-of-sync > 30s, listing creation failure > 3%, cooperator matching > 20s, marketplace search latency > 2s.

**Infrastructure**: Requires separate Elasticsearch index for marketplace search (faceted search on category, price range, location, availability).

---

## User Story

**Seller**: As a business owner, I want to list my product and have it automatically promoted to interested businesses, friends, and potential partnership opportunities, so I maximize visibility without manual marketing.

**Cooperator**: As a complementary business, I want to be notified when a product that could create a bundle opportunity with mine is listed, so I can propose partnerships.

**Buyer**: As a platform user, I want to see marketplace listings from my connections with special friend discounts, so I can support businesses in my network.

## Business Flow (Happy Path)

1. Seller creates marketplace item (title, description, pricing, inventory, target audience)
2. Inventory Service stores item details and publishes `MarketplaceItemCreated`
3. Marketplace Service creates listing, sets status to "active"
4. Marketplace Service publishes `ListingPublished`
5. Analytics Service profiles target audience (segments, buyer personas)
6. Analytics Service publishes `TargetAudienceAnalyzed`
7. Post Service auto-generates social marketplace post (headline, highlights, CTA)
8. Post Service publishes `MarketplacePostCreated`
9. Cooperator Service calculates synergy scores against active businesses
10. Cooperator Service identifies cross-promotion, bundle, referral, and distribution partners
11. Cooperator Service publishes `CooperatorsIdentified`
12. Connection Service identifies friends with purchase affinity scores
13. Connection Service publishes `FriendAudienceIdentified`
14. Group Service identifies marketplace-enabled groups
15. Group Service publishes `GroupAudienceIdentified`
16. Feed Service distributes marketplace post to:
    - Friends: product card format with friend discount
    - Groups: auto-post to marketplace section with member discount
    - Cooperators: "Partnership Opportunity" card with synergy data
17. Feed Service publishes `MarketplaceFeedDistributed`
18. Notification Service sends partnership opportunity notifications to high-synergy cooperators
19. Notification Service publishes `CooperatorNotificationsSent`

## Scenarios

### Scenario 1: Limited-Time Offer
- Special offer has expiry timestamp
- Notifications marked as time-sensitive
- Feed cards show countdown timer
- Auto-remove from feeds after expiry

### Scenario 2: Pre-Order Item
- Availability = "pre_order" with restock date
- Social post shows "Coming Soon" badge
- Cooperator matching still runs for partnership discussions
- Convert to regular listing when stock arrives

### Scenario 3: Service Listing (Not Physical Product)
- No inventory tracking (unlimited availability)
- Different feed card format (service description + booking CTA)
- Cooperator matching focuses on service complement (e.g., web designer + copywriter)

### Scenario 4: Bulk/Wholesale Pricing
- Multiple pricing tiers based on quantity
- Cooperator feed shows wholesale pricing specifically
- "Volume Discount" badge on group marketplace posts

## Edge Cases

1. **Competing product listed to cooperator**: Synergy score = 0 for competing products. Never show as partnership opportunity. Show as regular marketplace post if otherwise relevant.

2. **Inventory reaches zero during promotion**: Publish `InventoryDepleted` event. Remove from active feeds. Show "Sold Out" badge on existing feed entries. Cooperator partnerships remain active for restock.

3. **Seller deactivates account mid-listing**: Cancel all active listings. Remove from feeds. Notify pending cooperator discussions. Refund any pre-orders.

4. **Price change after cooperator agreement**: Notify cooperators of price change. Give 48-hour grace period for existing bundle agreements.

5. **Cross-currency pricing**: Store base price in seller's currency. Display in buyer's currency using daily exchange rates. Cooperator bundles require agreed settlement currency.

6. **Duplicate listing detection**: NLP similarity check against seller's existing listings. Block duplicates (>90% similarity). Suggest "update existing listing" instead.

## Business Logic

### Cooperator Synergy Score
```
synergy = (audience_overlap × 0.30) + (product_complement × 0.25) + 
          (market_presence × 0.20) + (reputation × 0.15) + 
          (collaboration_history × 0.10)
```

### Cooperation Type Thresholds
- Cross-Promotion: synergy ≥ 0.5
- Bundle Partner: synergy ≥ 0.7
- Referral Partner: synergy ≥ 0.4
- Distribution Channel: synergy ≥ 0.6

### Discount Tiers
- Friend discount: 5-10% (configurable by seller)
- Group member discount: 10-15%
- Cooperator bundle: custom negotiated per partnership

### Feed Card Formats
- High synergy (>0.75): "Partnership Opportunity" card with audience overlap %, collaboration suggestions, direct message CTA
- Medium synergy (0.5-0.75): "Potential Partner" badge, complementary aspects, connect button
- Low synergy (<0.5): standard marketplace post, no special formatting

## Event Definitions

| Event | Publisher | Consumers | Key Payload Fields |
|-------|-----------|-----------|-------------------|
| `MarketplaceItemCreated` | Inventory Service | Analytics, Post, Cooperator | itemId, sellerId, itemDetails, pricing (base, bulk, negotiable), inventory, targetAudience, media |
| `ListingPublished` | Marketplace Service | Post, Analytics | listingId, itemId, sellerId, status, visibility, listingUrl |
| `TargetAudienceAnalyzed` | Analytics | Cooperator, Matching | itemId, audienceProfile (segments, estimatedSize, characteristics, buyerPersonas) |
| `MarketplacePostCreated` | Post Service | Connection, Group, Feed | postId, itemId, sellerId, postContent (headline, highlights, media, CTA, specialOffer) |
| `FriendAudienceIdentified` | Connection | Feed | postId, friends[]{userId, relevanceScore, purchaseAffinity, previousPurchases} |
| `GroupAudienceIdentified` | Group Service | Feed | postId, groups[]{groupId, memberCount, marketplaceEnabled, groupRelevance} |
| `CooperatorsIdentified` | Cooperator Service | Feed, Notification | itemId, cooperators[]{userId, businessId, synergyScore, cooperationType, complementaryProducts} |
| `MarketplaceFeedDistributed` | Feed Service | Analytics | postId, distribution (friendFeeds, groupFeeds, cooperatorFeeds) |
| `CooperatorNotificationsSent` | Notification | Analytics | itemId, notifications[]{cooperatorId, channel, synergyScore, cooperationType} |

## Services Involved

| Service | Role in Flow | Database | Scales On |
|---------|-------------|----------|-----------|
| Inventory Service | Item CRUD, stock management | PostgreSQL | Request count, strong consistency |
| Marketplace Service | Listing lifecycle, pricing rules | PostgreSQL + Redis | Request count |
| Analytics Service | Audience profiling | Elasticsearch | CPU (ML inference) |
| Post Service | Auto-generates social marketplace post | MongoDB | Request count |
| Cooperator Service | Synergy scoring, partnership identification | PostgreSQL + Redis | CPU (algorithm, batch per listing) |
| Connection Service | Friend audience with purchase affinity | Neo4j + PostgreSQL | Graph queries |
| Group Service | Group marketplace sections | PostgreSQL + MongoDB | Request count |
| Feed Service | Multi-format card distribution | Redis Cluster | Write throughput |
| Notification Service | Partnership opportunity notifications | Redis pub/sub | Event throughput |

The process described in the `06-marketplace-publishing.md` file introduces a sophisticated, multi-stage marketplace flow that integrates e-commerce, social networking, and automated business-to-business (B2B) matching.

To extend the current platform architecture to support this "Marketplace Publishing & Distribution" flow (FLOW-06), the following technical integration plan is proposed:

### 1. New Service Orchestration

The flow requires several specialized services. While some likely exist (Post, Feed, Notification), new specialized logic is required for the marketplace components:

* **Marketplace & Inventory Services:** These should be implemented as .NET Core microservices (per the established backend standards). They will handle the CRUD operations for items and the state management of listing lifecycles.
* **Cooperator Service (Logic Engine):** This is a critical addition. Given the synergy scoring algorithm (Audience overlap, Product complementarity, etc.), this service is a prime candidate for a Python-based microservice to leverage libraries better suited for scoring and matching calculations, or a specialized .NET service utilizing the existing AI Dispatcher.
* **Analytics Service (Profiling):** This service will interface with Elasticsearch to profile target audiences and identify buyer personas.

### 2. Event-Driven Workflow Integration

Following the established architecture, the `FlowOrchestrator` should manage the transition between the three parallel processes that activate after a listing is created:

1. **Parallel Branch A (Profiling):** `ItemCreated` → **Analytics Service** (Generates `AudienceProfiled`).
2. **Parallel Branch B (Content):** `ItemCreated` → **Post Service** (Generates `MarketplacePostCreated`).
3. **Parallel Branch C (Synergy):** `ItemCreated` → **Cooperator Service** (Calculates scores and generates `CooperatorsIdentified`).

Once all three parallel branches complete, the **Feed Service** and **Notification Service** are triggered to distribute the content to the relevant social and business segments.

### 3. Database Fabric Extensions

The flow necessitates a diverse data layer. The integration should update the `DatabaseFabric` to include:

* **Neo4j (Graph):** Required for the **Connection Service** to perform high-performance graph queries identifying friends with specific "purchase affinity" and analyzing relationship depths.
* **PostgreSQL:** For strong consistency in the **Inventory** and **Marketplace** services.
* **MongoDB:** To store the flexible schema of the auto-generated **Marketplace Posts**.
* **Redis Cluster:** To handle the high write throughput required for **Feed Distribution**.

### 4. Implementation of the Synergy Scoring Algorithm

The **Cooperator Service** should implement the scoring logic as defined:

* **Audience Overlap (30%):** Cross-referencing user groups and interests via the Connection/Group services.
* **Product Complementarity (25%):** Using the **AiDispatcher** and an LLM to determine if two products (e.g., "Camping Tents" and "Solar Lanterns") are complementary.
* **Market Presence & Reputation (20% + 15%):** Aggregated metrics from the Analytics service.
* **Collaboration History (10%):** Historical data from the Marketplace database.

### 5. API Gateway & Client Updates

* **Aggregator Patterns:** The API Gateway (using the `Ocelot` or `YARP` patterns seen in the architecture) must be updated to aggregate marketplace item data with synergy scores and social post previews for the seller's dashboard.
* **Frontend (React Native/Web):** New UI components are required for the "Marketplace Listing" wizard, including a "Target Audience" selector and a "Cooperator Discovery" dashboard where sellers can see their synergy matches.

### 6. Security and Permissions

The **Permissions Service** must be extended to handle marketplace-specific roles:

* `Seller`: Can manage inventory and publishing.
* `Cooperator`: Can receive partnership notifications.
* `Moderator`: Can review marketplace posts via the **Moderation Service**.

By utilizing the existing **RAG Planner** and **AiDispatcher**, the system can also provide "Marketplace Intelligence" to sellers, suggesting optimal pricing tiers or audience targets based on current marketplace trends retrieved from the Elasticsearch datastore.

To integrate the **Marketplace Publishing & Distribution (FLOW-06)** process into the platform, the existing microservices architecture requires extensions in data modeling, matching logic, and cross-service orchestration.

### 1. Enhanced Domain Logic & Services

The primary addition is the implementation of the **Synergy Score** logic within the **Matching Service** (Skill 47). This service must be extended to calculate scores based on the weighted criteria defined in the publishing process:

* **Audience Overlap (30%)**: Integrates with the **Connection Service** (Skill 49) and **Groups Service** (Skill 50) to analyze shared demographics and interests between the seller and potential cooperators.
* **Product Complementarity (25%)**: Utilizes the **AiDispatcher** (Skill 07) to perform LLM-based semantic analysis. This determines if products are logically paired (e.g., matching a "Camping Tent" with "Solar Lanterns").
* **Market Presence & Reputation (35%)**: Aggregates performance and trust metrics from the **Analytics Service** (Skill 48).
* **Collaboration History (10%)**: Pulls historical partnership data from the **Marketplace Service** (Skill 61).

### 2. Service Orchestration (The Flow Definition)

A new entry in the **Flow Definition** (Skill 08) repository for **FLOW-06** is required to coordinate the following sequence:

1. **Item Initiation**: The **Marketplace Service** (Skill 61) creates the listing and stores audience targeting metadata.
2. **Parallel Execution**:
* **Audience Profiling**: The **Analytics Service** (Skill 48) identifies relevant buyer personas and industries.
* **Content Generation**: The **Post Service** (Skill 52) auto-generates social media assets, including headlines and promotional media.
* **Match Discovery**: The **Matching Service** (Skill 47) runs the synergy calculation to identify top-tier business partners.


3. **Distribution**: The **Post Service** (Skill 52) distributes the content across the identified channels (friends, groups, and matched cooperators).

### 3. API & Infrastructure Updates

* **API Gateway (Aggregation Layer)**: The gateway must implement an aggregator pattern to provide the "Seller Dashboard" with a unified view of marketplace items, their associated synergy matches, and generated post previews.
* **Permissions Service (Skill 37)**: The role-based access control (RBAC) needs to be extended to support three new roles:
* `Seller`: Permissions for inventory and listing management.
* `Cooperator`: Permissions to receive and respond to partnership synergy notifications.
* `Moderator`: Permissions to review marketplace content through the **Moderation Service** (Skill 44).



### 4. Database & Storage

The **Elasticsearch Datastore** (Skill 03) should be utilized to store and index marketplace intelligence trends. This allows the **RAG Planner** (Skill 00b) to provide real-time suggestions to sellers regarding optimal pricing and audience targeting based on current marketplace data.
