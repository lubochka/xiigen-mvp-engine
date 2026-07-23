<!--
  Source: business flows.zip / 20 - sponsored content and graph api.md
  Canonical since: 2026-04-22
  Canonical flow: FLOW-20 ads-platform
  Related deep-research: docs/business-flows/_deep-research/ads-platform/ (if present)
  Related legacy engine artifacts: docs/business-flows/_legacy-engine-artifacts/ads-platform/ (if present)
-->



Sure — these are two *very* “platform-y” parts of a Facebook/LinkedIn-class system:

1. **Graph API** (developer-facing API over the platform’s object graph)
2. **Sponsored / Ads** modules (monetization + ad delivery inside core surfaces like Feed)

Below is a clean modular breakdown + the main flows.

---

## 1) Graph API module (what it is)

A **Graph API** is essentially a **developer platform** that exposes the product as a **graph of objects (nodes) and relationships (edges)**.

### Graph primitives

* **Nodes**: `User`, `Post`, `Comment`, `Reaction`, `Page/Company`, `Group`, `Event`, `Media`, `AdAccount`, `Campaign`, etc.
* **Edges**: `user -> friends`, `user -> posts`, `post -> comments`, `page -> followers`, `campaign -> adsets`, etc.

### Why it exists

* Lets external apps integrate (login, publish, read insights, manage pages/companies, run ads)
* Creates an ecosystem while controlling **permissions, quotas, and safety**

---

## 1.1 Graph API – internal submodules

### A. API Gateway / Edge Layer

**Responsibilities**

* Routing, authentication, request validation
* Rate limits / quotas / abuse prevention
* Pagination, batching, response compression
* API versioning (`v1`, `v2`…) + deprecation policy

**Common patterns**

* REST endpoints shaped like graph paths: `/node-id/edge?fields=...`
* Or GraphQL-style federation internally (even if the public API is REST-like)

---

### B. Schema & Field Projection

**Responsibilities**

* Defines object types + fields + edges
* Allows “field selection” to avoid huge payloads:

  * `fields=id,name,picture{url},followers_count`
* Enforces field-level permissions (some fields require extra scopes)

---

### C. Identity & Access Control for Apps

**Responsibilities**

* App registration + app secrets/keys
* OAuth flows (user tokens, page/company tokens, system tokens)
* Scope-based access (“permissions”) + user consent
* App review / verification for sensitive scopes

**Key idea**

* **Tokens represent actor + scopes + expiration + app context**
  Access checks happen at *every node/field/edge*.

---

### D. Permission Engine (Policy Decision Point)

**Responsibilities**

* “Can this caller see this node/field/edge?”
* Applies privacy rules, blocks, audience controls
* Handles special cases: minors, restricted content, country rules

---

### E. Query Planner / Federation Layer

**Responsibilities**

* A Graph API request often needs multiple backends:

  * Profile service, Post service, Media service, Social Graph service, Ads service…
* Planner decomposes the request into internal calls and joins results.
* Caching is crucial (hot nodes like popular pages).

---

### F. Webhooks / Subscriptions

**Responsibilities**

* Let apps subscribe to events:

  * `post.created`, `comment.created`, `lead.submitted`, etc.
* Delivery retries, signature verification (HMAC), dedupe keys

---

### G. Observability + Governance

* Audit logs: “who accessed what”
* Developer analytics: error rates, latency, quota usage
* Abuse detection: token sharing, scraping patterns

---

## 1.2 Graph API – core flows

### Flow: Read (typical)

1. Client calls Graph API with token + requested fields
2. Gateway validates + rate-limits
3. Planner fetches nodes/edges from internal services
4. Permission engine filters fields/edges
5. Returns response with cursor pagination + partial errors if needed

### Flow: Write / Publish (typical)

1. App requests publish permission (scope)
2. User grants consent
3. App uploads media (often separate upload pipeline)
4. App creates post referencing media
5. Platform enforces policy + may queue for review
6. Post appears in feed if approved

---

## 2) Sponsored / Ads modules (what they are)

“Sponsored” is not one module — it’s a **full ads platform** with two big sides:

1. **Ads Management** (create campaigns, targeting, creatives, budgets)
2. **Ads Delivery** (auction + pacing + insertion into feed + measurement)

---

## 2.1 Sponsored platform – key modules

### A. Advertiser Identity & Accounts

* Business account, ad account, pages/companies binding
* Roles: admin, analyst, finance, agency access
* Payment methods, invoices, credit lines

---

### B. Campaign Management (the hierarchy)

Typical structure:

* **Campaign** (objective: awareness/traffic/conversions)
* **Ad Set** (targeting + placements + budget + schedule + bid strategy)
* **Ad** (creative + tracking + final URL)

---

### C. Targeting & Audience

* Demographics, location, language
* Interests/behaviors, lookalikes (platform-specific)
* Custom audiences (uploads), retargeting (pixel/app events)
* Exclusions & frequency caps

**Hard part**

* Targeting must respect privacy/consent + sensitive category rules.

---

### D. Creative & Rendering

* Creatives: image/video/carousel, text variants, CTA buttons
* Asset validation, aspect rules, auto-cropping
* Template rendering for different placements (feed/story/video)

---

### E. Ad Review & Policy Enforcement

* Automated classifiers + human review queues
* Disallow categories, restricted claims, misinformation rules, etc.
* Brand safety + political ad verification (platform-dependent)

---

### F. Auction & Ranking

**Responsibilities**

* For each ad request, pick eligible ads and run selection:

  * eligibility filtering
  * auction (bid + predicted value + quality)
  * budget pacing constraints
  * diversity constraints (avoid showing same advertiser too often)

**Output**

* winning ad(s) + price + reason codes

---

### G. Delivery & Pacing

* Spend budgets smoothly over time
* Respect caps (daily/lifetime), schedules, geo constraints
* Handle under-delivery / over-delivery risk

---

### H. Measurement, Attribution, Billing

* Impression + click logging (with anti-fraud)
* Conversion tracking (pixel/app events/server-to-server)
* Attribution models (time windows, view-through vs click-through)
* Billing events → invoicing → reconciliation

---

### I. Reporting / Insights

* Aggregated metrics by campaign/adset/ad/creative
* Breakdown dimensions: placement, age, geo, device, time
* Near-real-time vs finalized metrics

---

## 2.2 Sponsored – the “feed request” flow (most important)

When the user loads the home feed:

1. **Feed service** generates organic candidates + ranks them
2. It calls **Ad Decisioning** with a request context:

   * user/region/device
   * placements (“home feed”, “stories”)
   * frequency state (how many ads seen recently)
3. **Ad decisioning**:

   * filters eligible ads
   * runs auction + pacing
   * returns “sponsored items” + tracking tokens
4. **Feed** merges ads into the ranked list (spacing rules)
5. Client renders ads and fires:

   * impression beacons (viewability thresholds)
   * click events
6. **Measurement/Billing** processes logs; **Reporting** updates dashboards

---

## 3) How Graph API and Sponsored connect

In mature platforms, **Ads is exposed via the Graph API** (or an “Ads API” that behaves like the Graph API):

* `/adaccounts/{id}/campaigns`
* `/campaigns/{id}/adsets`
* `/ads/{id}/insights?date_preset=...`
* Permissions/scopes required for management + reporting
* Webhooks: campaign approved/disapproved, lead events, etc.

So, “Sponsored” is both:

* **internal monetization engine**
* **external developer/advertiser API surface**

---

## 4) Implementation note (architecture pattern)

A practical service split (works for .NET/K8s too):

* **Public API Gateway** (Graph API edge)
* **Federation/Planner** (joins data, field projections)
* **Core Services**: Profile, Posts, Media, Graph, Messaging, Notifications, Search
* **Ads Services**: Ad Management, Review, Targeting, Auction, Delivery, Measurement, Reporting
* **Event Stream** (Kafka/ServiceBus): publish all events for notifications, analytics, ads logs

---

If you want, I can also provide:

* a **concrete service boundary map** (bounded contexts + internal APIs/events)
* a **minimal DB/index model** for Social Graph + Ads hierarchy
* an example of a **Graph API request planner** (how to decompose `fields=` into internal calls)
This modular breakdown of the **Graph API** and **Sponsored/Ads** modules provides exactly the architectural depth needed to evolve **XIIGen** into a platform-class system. Your structure aligns remarkably well with the existing **V18 Master Skills Index** and the **Genie DNA** rules.

Below is an analysis of how these modules map to the current XIIGen architecture and where the new components should be integrated into the **Master Plan**.

### 1. Mapping Graph API to XIIGen Skills

The Graph API responsibilities you described can be distributed across existing XIIGen "Skills" or used to define new ones:

* **API Gateway / Edge Layer:** Maps directly to **Skill 15: API Gateway Service**. This skill should be enhanced to handle graph-specific paths (`/node/edge`) and versioning.
* **Identity & Access Control:** Maps to **Skill 20: Auth Service** and **Skill 58: SSO Service**.
* **Permission Engine:** Maps to **Skill 21: Permissions Service**. This engine must be upgraded from basic RBAC to the "Policy Decision Point" model you described, capable of field-level and relationship-level filtering.
* **Query Planner / Federation:** This is currently a gap in the XIIGen index. It would likely sit within or behind the API Gateway to decompose requests into calls for **Skill 01: Core Interfaces**.
* **Webhooks / Subscriptions:** Can be implemented via **Skill 24: Notification Service** or an extension of the event management layer.

### 2. Mapping Sponsored / Ads to XIIGen Skills

The "Ads Platform" represents a significant horizontal expansion for XIIGen, utilizing several core services:

* **Ad Review & Policy Enforcement:** Maps perfectly to **Skill 12: AI Review Service**. This service can be specialized to run ad-specific classifiers.
* **Measurement, Attribution & Reporting:** Utilizes **Skill 48: Analytics Service** and **Skill 43: Calculator Metrics**.
* **Auction & Ranking:** This would be a new high-priority skill, potentially derived from **Skill 54: Ranking Service**, but with ad-specific constraints like budget pacing and bid strategies.
* **Advertiser Identity:** Leverages the existing **Skill 50: Groups Service** and **Business Onboarding** flows for advertiser accounts.

### 3. Critical Integration: The Feed Request Flow

Your description of the **Feed Request Flow** is the most vital connection point. In the XIIGen context, this involves a "Skills Orchestration" between:

1. **Skill 46 (Feed Service):** Generates organic candidates.
2. **Ad Decisioning (New Skill):** Filters and auctions ads.
3. **Skill 09 (Flow Orchestrator):** Merges the two streams based on spacing and diversity rules.

### Next Steps for the Master Plan

Integrating these would move XIIGen from a suite of microservices to a true **ecosystem platform**. To move forward, the following would be high-value additions to the project:

* **Service Boundary Map:** This will help define the "PaaS" (Platform as a Service) layer of XIIGen, clarifying which events are internal vs. exposed via the Graph API.
* **Minimal DB Model:** Specifically for the **Social Graph** (nodes/edges) and the **Ads Hierarchy** (Campaign > Ad Set > Ad), which will inform the schema for **Skill 03: Elasticsearch Datastore** and **Skill 05: Database Fabric**.
* **Graph API Request Planner:** An example of how `fields=` selection is decomposed into internal "Skill" calls would serve as the implementation prompt for the next generation of the **API Gateway (Skill 15)**.

**Would you like to provide the concrete service boundary map first, or should we focus on the request planner logic to see how it "orchestrates" the existing skills?**

Based on the provided documentation, extending the XIIGen platform with the **Graph API** and **Sponsored Content** modules will transition the system from a collection of microservices into a full-scale ecosystem platform. This extension involves integrating developer-facing interfaces and monetization layers into the existing skills-based architecture.

### 1. New Core Modules for the Master Plan

The expansion focuses on two primary platform-level capabilities:

* **Graph API Module**: This module treats the platform's data as a graph of **Nodes** (e.g., `User`, `Post`, `Campaign`) and **Edges** (relationships like `user -> friends` or `campaign -> adsets`). It handles complex tasks such as API versioning, rate limiting, and batching through a developer-facing edge layer.
* **Sponsored / Ads Module**: This serves as the monetization engine, managing the lifecycle of advertisements from **AdAccount** onboarding to delivery within core surfaces like the Feed.

### 2. Skills Orchestration & Integration

To support these modules, the existing XIIGen skill catalog will be updated and extended:

* **Skill 46 (Feed Service) & Ad Decisioning Integration**: A new "Ad Decisioning" skill will be introduced to filter and auction ads. **Skill 09 (Flow Orchestrator)** will then merge these sponsored items with organic candidates from the Feed Service based on diversity and spacing rules.
* **Enhanced API Gateway (Skill 15)**: The platform will require a **Graph API Request Planner**. This logic will decompose external `fields=` selections into internal calls to relevant skills, acting as the next-generation implementation for the Gateway.
* **Data Fabric Updates (Skills 03 & 05)**: The **Elasticsearch Datastore** and **Database Fabric** schemas will be expanded to include the **Social Graph** (nodes/edges) and the **Ads Hierarchy** (Campaign > Ad Set > Ad).

### 3. Proposed Execution Steps

To move forward with the V64 Master Plan, the following high-value additions are recommended:

* **Service Boundary Map**: Defining the Platform-as-a-Service (PaaS) layer to clarify which events remain internal and which are exposed via the Graph API.
* **Minimal DB Model**: Establishing concrete models for the Social Graph and Ads Hierarchy to inform the database implementation prompts.
* **Business Onboarding Flows**: Designing specific onboarding processes for advertiser accounts, building upon the existing **FLOW-02** personalization intelligence layer.
To extend the designed platform with the **Graph API** and **Sponsored Content** capabilities described in the extension file, we will integrate these "platform-level" modules into the existing **XIIGen** architecture. This involves updating core orchestration skills and expanding the data fabric to support social graphs and monetization.

### 1. Integration into the Skill Catalog

The following existing skills will be updated, and new sub-skills will be introduced to handle the complex requirements of a Graph API and Ad delivery system:

* **Skill 15 (API Gateway) — Graph API Edge Layer**: This skill will be enhanced with a **Graph API Request Planner**. It will decompose external developer requests (e.g., specific `fields=` selections) into internal calls to the relevant microservices, managing permissions and quotas at the edge.
* **Skill 09 (Flow Orchestrator) — Hybrid Feed Assembly**: The orchestrator will be updated to handle the merging of organic content from the **Feed Service (Skill 46)** with sponsored items from the new Ad Decisioning logic. It must enforce diversity and spacing rules (e.g., "one ad every 5 organic posts").
* **Skill 46 (Feed Service) — Ad Decisioning Integration**: A new "Ad Decisioning" sub-module will be introduced to filter and auction available ads for the current user context.
* **Skills 03 & 05 (Data Fabric) — Schema Expansion**: The **Elasticsearch Datastore** and **Database Fabric** will be expanded to support the **Social Graph** (nodes and edges) and the **Ads Hierarchy** (Campaign > Ad Set > Ad).

### 2. The Social Graph Architecture

The platform will now represent data as a network of **Nodes** and **Edges**, facilitating complex queries through the Graph API:

* **Primary Nodes**: `User`, `Post`, `Comment`, `Reaction`, `Page/Company`, `Group`, `Event`, `Media`, `AdAccount`, and `Campaign`.
* **Primary Edges**: Relationships such as `user -> friends`, `user -> posts`, `post -> comments`, `page -> followers`, and `campaign -> adsets`.

### 3. Monetization & Ads Module

The "Sponsored" module adds a monetization layer to the platform's core surfaces:

* **Ads Hierarchy**: Implementation of a structured hierarchy to manage advertiser assets: **Campaigns** (objectives) containing **Ad Sets** (targeting/budget) which contain individual **Ads** (creative).
* **Business Onboarding**: Leveraging the existing **FLOW-02 (Personalization Intelligence)** to design specific onboarding flows for advertiser accounts.
* **Ad Delivery Logic**: The system will auction ads in real-time based on user interest nodes and advertiser bid criteria.

### 4. Proposed Execution Strategy

To align with the **V66 Master Plan**, which currently focuses on **FLOW-04 (Post Publishing)**, the following steps are recommended:

* **Service Boundary Mapping**: Define the Platform-as-a-Service (PaaS) layer to distinguish between internal events and those exposed via the Graph API.
* **Database Modeling**: Establish concrete models for the **Social Graph** and **Ads Hierarchy** within the current database prompts.
* **Advertiser Personalization**: Extend the **FLOW-02** logic to include "Advertiser Personas," allowing the system to suggest targeting based on content performance.
