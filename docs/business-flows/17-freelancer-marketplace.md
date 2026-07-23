<!--
  Source: business flows.zip / 17 - freelancers platforms.md
  Canonical since: 2026-04-22
  Canonical flow: FLOW-17 freelancer-marketplace
  Related deep-research: docs/business-flows/_deep-research/freelancer-marketplace/ (if present)
  Related legacy engine artifacts: docs/business-flows/_legacy-engine-artifacts/freelancer-marketplace/ (if present)
-->

Can you describe in modules what upwork and freelancers.com contain? Which modules How do they work? What flows they are supporting?
Below is a **modular breakdown** of what **Upwork** and **Freelancer.com** typically contain, **how the modules work**, and the **main user flows** they support. Think of each platform as a “marketplace operating system” made of repeatable building blocks.

---

## Upwork — modules, how they work, and supported flows

### 1) Identity, Profiles, and Reputation

**What it contains**

* Client accounts + freelancer accounts (individuals/agencies)
* Public profiles (skills, portfolio, rate, history)
* Reviews/ratings as the core trust signal

**What it enables**

* “Trust bootstrap”: users rely on profile history + feedback to decide who to hire.

---

### 2) Talent Sourcing and Discovery

**What it contains**

* **Talent Marketplace**: client posts a job → receives proposals; clients can also search/invite talent. ([Upwork][1])
* Invitations/interview pipeline (invite → interview → offer). ([Upwork Support][2])

**What it enables**

* **Demand-side flow**: client describes work → platform helps find relevant supply fast.

---

### 3) Bidding / Proposal Economy (Connects)

**What it contains**

* Proposal submission currency (“Connects”) + optional “boosting” proposals (auction-like). ([Upwork Support][3])
* Guidance/content around bidding and proposals. ([Upwork][4])

**What it enables**

* Controls spam, monetizes attention, and nudges freelancers to be selective.

---

### 4) Packaged Services Marketplace (Project Catalog)

**What it contains**

* Pre-scoped offerings (“buy a service” instead of posting a job).
* Buyer flow: browse clearly-defined services and purchase. ([Upwork][5])

**What it enables**

* **E-commerce-like flow**: “I need X” → choose a service → pay → deliverables.

---

### 5) Consultations (Paid 1:1 Sessions)

**What it contains**

* Scheduled paid sessions; freelancer sets availability + rate per time unit; can include follow-ups. ([Upwork Support][6])

**What it enables**

* **Expert-call flow**: discovery call, advisory, quick audits, etc.

---

### 6) Contracting and Work Engagement

**What it contains**

* Contract creation after hire (hourly and milestone/fixed-price are common patterns). ([Upwork][1])
* Rules around when work can start (esp. enterprise governance). ([Upwork Support][7])

**What it enables**

* Formalizes the “work container” (scope, terms, start/end, billing type).

---

### 7) Time Tracking + Work Evidence (Work Diary)

**What it contains**

* Upwork desktop time tracker that captures activity and sends snapshots to **Work Diary**. ([Upwork][8])

**What it enables**

* **Hourly accountability flow**: logged time ↔ visible proof ↔ billing confidence.

---

### 8) Payments, Escrow, and Payment Protection

**What it contains**

* “Upwork Payment Protection” concepts (especially for hourly via tracked time + diary).
* Dispute mechanism for hours that don’t qualify. ([Upwork Support][9])

**What it enables**

* **Protected payment flow**: track → invoice → client review → payout (or dispute).

---

### 9) Enterprise Layer (Compliance, Reporting, Sourcing Support)

**What it contains**

* Enterprise contracts, IP protection, Upwork Payroll, program management, API access, reporting. ([Upwork Support][10])
* Worker classification / misclassification risk controls (“Compliance services”). ([Upwork Support][11])

**What it enables**

* “Marketplace-as-procurement” for large orgs: governance, auditability, scaling.

---

## Freelancer.com — modules, how they work, and supported flows

### 1) Identity, Verification, and Tiering

**What it contains**

* KYC/verification programs and visible badges (trust signals). ([Freelancer][12])
* “Preferred Freelancer Program” (elite tiering + perks/lead access). ([Freelancer][13])

**What it enables**

* Reputation + tiering boosts conversion in a high-volume bidding environment.

---

### 2) Project Marketplace (Post → Bid → Award)

**What it contains**

* Core flow: post a project → receive competitive bids quickly → choose freelancer. ([Freelancer][14])
* Structured bidding: bid amount, delivery time, proposal, optional milestones/tasks. ([Freelancer][15])

**What it enables**

* **Auction-like hiring flow** optimized for speed + price competition.

---

### 3) Contest Marketplace (Design/Creative Competition)

**What it contains**

* Posting contests, receiving entries, awarding winner(s), then **Contest Handover**. ([Freelancer][16])
* Rules: contest holder should only take an entry after awarding + completing handover. ([Freelancer][17])

**What it enables**

* **Many-to-one ideation flow**: great for logos, creative concepts, UI mockups, etc.

---

### 4) Milestone Payments (Escrow-style)

**What it contains**

* Milestone system: client deposits funds for a milestone; funds are held; client releases when satisfied or dispute is used. ([Freelancer][18])
* Practical “how to pay” guidance: funds held securely when milestone/quote is created/accepted. ([Freelancer][19])

**What it enables**

* **Stage-gated delivery flow**: milestone 1 → review → release → milestone 2…

---

### 5) Time Tracking (Hourly)

**What it contains**

* Hourly projects have time tracking features (including manual time add flows). ([Freelancer][20])

**What it enables**

* Hourly billing, though the platform’s “anchor” is often milestones + fixed price.

---

### 6) Recruiter / Assisted Hiring (Premium)

**What it contains**

* Recruiter upgrade: platform helps refine brief, finds/interviews talent, recommends candidates; client selects. ([Freelancer][21])
* Help docs also direct users to Recruiter Service for selection support. ([Freelancer][22])

**What it enables**

* **Concierge flow**: outsource the sourcing/screening step to the platform.

---

### 7) Platform Monetization (Fees)

**What it contains**

* Client-side project fees for fixed and hourly (platform-defined). ([Freelancer][23])

**What it enables**

* Revenue capture on transactions + optional paid upgrades (visibility, recruiter, etc.).

---

### 8) API / Embedded Workforce

**What it contains**

* Developer API to access Freelancer marketplace from external apps/sites. ([developers.freelancer.com][24])

**What it enables**

* “Workforce inside your product” integrations (programmatic job posting, management, etc.).

---

## The main flows these platforms support (side-by-side)

### Flow A: Classic project hiring (both)

1. **Client posts job/project**
2. **Freelancers apply / bid**

   * Upwork: proposals + Connects (and optional boosting). ([Upwork Support][3])
   * Freelancer: bids include amount + timeline + proposal + optional milestones. ([Freelancer][15])
3. **Client shortlists → interviews/messages → awards**
4. **Contract starts**
5. **Work delivered**
6. **Payment released** (milestones/hourly) + review/reputation update

---

### Flow B: Hourly + evidence-driven billing (Upwork-centered)

1. Hire on hourly
2. Freelancer tracks time with desktop app → Work Diary evidence created (screenshots/activity). ([Upwork][8])
3. Client reviews diary/timesheet
4. Payment protection/dispute window for non-qualifying hours. ([Upwork Support][9])

---

### Flow C: Milestone escrow delivery (Freelancer-centered, also exists on Upwork)

1. Agree milestones
2. Client deposits milestone funds → held until release. ([Freelancer][18])
3. Freelancer delivers milestone
4. Client approves → releases milestone (or dispute path)

---

### Flow D: Packaged “buy-now” work

* **Upwork Project Catalog**: browse pre-scoped service → purchase → deliverables. ([Upwork][5])
  (Comparable concept on many marketplaces; Upwork is explicitly positioned as “pre-scoped services”.)

---

### Flow E: Contest / competitive ideation (Freelancer.com unique core)

1. Client creates contest
2. Many freelancers submit entries
3. Client awards winner
4. Contest handover occurs; entry is taken after award + handover. ([Freelancer][17])

---

### Flow F: Enterprise procurement + compliance (Upwork’s strong suit)

1. Enterprise onboarding/governance
2. Sourcing (with platform support) ([Upwork Support][7])
3. Optional classification/compliance checks ([Upwork Support][11])
4. Reporting + ongoing workforce management ([Upwork Support][10])

---

## If you were to model these as “system modules” in your own architecture

The shared “must-have” components across both platforms are:

* **Users & Orgs** (client, freelancer, agency, enterprise)
* **Profiles & Reputation** (portfolio, reviews, badges)
* **Listings** (jobs/projects, service offerings, contests)
* **Matching** (search, ranking, invites, shortlists)
* **Engagement** (contract container, messaging, attachments)
* **Work Evidence** (time tracking, deliverables, handover)
* **Payments** (escrow/milestones, hourly invoicing, fees)
* **Disputes & Trust/Safety**
* **Monetization** (bids currency, fees, upgrades, subscriptions)
* **Enterprise / API** (governance, reporting, integrations)

If you want, I can turn this into a **clean domain model** (entities + events + workflows) the way you’d design it for a microservices platform (Marketplace, Contracts, Billing, Trust, Messaging, Search/Ranking, etc.).

[1]: https://www.upwork.com/talent-marketplace?utm_source=chatgpt.com "Post a Job - Talent Marketplace"
[2]: https://support.upwork.com/hc/en-us/articles/36053765434387-Job-invitations?utm_source=chatgpt.com "Job invitations"
[3]: https://support.upwork.com/hc/en-us/articles/211062898-Understanding-and-using-Connects?utm_source=chatgpt.com "Understanding and using Connects"
[4]: https://www.upwork.com/resources/how-to-bid?utm_source=chatgpt.com "How To Bid for Jobs on Upwork"
[5]: https://www.upwork.com/services/?utm_source=chatgpt.com "Project Catalog - Freelance Services for Your Business"
[6]: https://support.upwork.com/hc/en-us/articles/4411743730963-How-to-set-up-a-consultation?utm_source=chatgpt.com "How to set up a consultation"
[7]: https://support.upwork.com/hc/en-us/articles/19665257744275--Engage-talent-on-Upwork-Enterprise?utm_source=chatgpt.com "Engage talent on Upwork Enterprise"
[8]: https://www.upwork.com/resources/using-the-upwork-desktop-app-for-payment-protection-and-collaboration?utm_source=chatgpt.com "Using Payment Protection in the Upwork Desktop App"
[9]: https://support.upwork.com/hc/en-us/articles/211062568-How-Upwork-protects-your-payments?utm_source=chatgpt.com "How Upwork protects your payments"
[10]: https://support.upwork.com/hc/en-us/articles/226526507-Upwork-Enterprise?utm_source=chatgpt.com "Upwork Enterprise"
[11]: https://support.upwork.com/hc/en-us/articles/18259156814355--Use-Enterprise-Compliance-services?utm_source=chatgpt.com "Use Enterprise Compliance services"
[12]: https://www.freelancer.com/verified?utm_source=chatgpt.com "Verified by Freelancer"
[13]: https://www.freelancer.com/faq/topic.php?id=50&utm_source=chatgpt.com "Preferred Freelancer Program FAQ"
[14]: https://www.freelancer.com/info/how-it-works?utm_source=chatgpt.com "Freelancer - How It Works"
[15]: https://www.freelancer.com/faq/topic.php?id=5&utm_source=chatgpt.com "Freelancers - Bidding FAQ"
[16]: https://www.freelancer.com/support/contest/awarding-the-contest-prize?utm_source=chatgpt.com "Awarding a contest"
[17]: https://www.freelancer.com/faq/topic.php?id=27&utm_source=chatgpt.com "Contest - Entries FAQ"
[18]: https://www.freelancer.com/faq/question.php?code=milestone-payments&utm_source=chatgpt.com "Milestone Payment ® System"
[19]: https://www.freelancer.com/support/employer/payments/how-do-i-pay-the-freelancer?utm_source=chatgpt.com "Milestone Payments"
[20]: https://www.freelancer.com/support/project/how-do-i-create-an-invoice-for-an-hourly-project?utm_source=chatgpt.com "Manual Time Tracking for hourly projects"
[21]: https://www.freelancer.com/recruiter?utm_source=chatgpt.com "Freelancer Recruiter Upgrade - Find top talent"
[22]: https://www.freelancer.com/support/general/how-to-hire-with-freelancer-com?utm_source=chatgpt.com "Getting work done on Freelancer.com"
[23]: https://www.freelancer.com/feesandcharges?utm_source=chatgpt.com "Freelancer Fees and Charges, Earn And Save More!"
[24]: https://developers.freelancer.com/?utm_source=chatgpt.com "Freelancer API for Developers"


To describe **Upwork** and **Freelancer.com** in terms of system modules, we can map their high-level business logic directly to the **Xiigen/Genie DNA architecture** found in your files. This architecture uses "Skills" (microservices) and "DNA" (declarative configurations) to support complex marketplace flows.

### 1. Identity, Profiles, and Reputation

* **What it contains:** Client/Freelancer accounts, public profiles (skills, portfolio), and review-based trust signals.
* **System Modules & Skills:**
* **Skill 20 (Auth Service):** Handles the core login and session management.
* **Skill 21 (Permissions Service):** Manages the "Client" vs. "Freelancer" role differentiation and access levels.
* **DNA Module 05 (Profile Definitions):** Uses `profile_definitions.schema.json` to define what fields a freelancer can show (portfolio, hourly rate, skill badges) without changing core code.


* **How it works:** Users are authenticated via the **Auth Service**, while their visible profile is a dynamic view rendered by the **Design System Service (Skill 19)** based on the **Profile DNA** configuration.

### 2. Talent Sourcing and Discovery (Search & Matching)

* **What it contains:** Job boards, talent search, and recommendation engines.
* **System Modules & Skills:**
* **Skill 03 (Elasticsearch Datastore):** Provides the high-performance search backend for millions of jobs and profiles.
* **Skill 47 (Matching Service):** Uses AI to rank freelancers against specific job requirements.
* **DNA Module 01 (Category Definitions):** Defines the "Skills" taxonomy (e.g., "React", "Copywriting") used for filtering.


* **Supported Flows:** **Classic Discovery Flow**—A client searches (Skill 03), the system recommends (Skill 47), and the client invites (Skill 24 - Notification).

### 3. Bidding and Proposal Economy

* **What it contains:** Proposal submission (Connects), bid amounts, and delivery timelines.
* **System Modules & Skills:**
* **Skill 09 (Flow Orchestrator):** Manages the state machine of a bid (Draft → Submitted → Interview → Awarded).
* **Skill 51 (Questionnaire Service):** Handles custom screening questions included in proposals.
* **DNA Module 06 (Form Definitions):** Dynamically builds the proposal submission form based on `form_definitions.json`.


* **How it works:** When a freelancer bids, the **Flow Orchestrator** validates the "Connects" cost via the **Weight/Price Calculator (Skill 57)** and updates the **Project State**.

### 4. Contracting and Milestone Escrow

* **What it contains:** Fixed-price milestones, hourly contracts, and fund holding (Escrow).
* **System Modules & Skills:**
* **Skill 08 (Flow Definition):** Stores the JSON blueprints for how a contract progresses.
* **Skill 56 (Payment Service):** Manages the transactional logic for depositing and releasing funds.
* **DNA Module 04 (Cart/Checkout Rules):** Defines milestone-gated payment rules (e.g., "Release on Approval").


* **Supported Flows:** **Milestone Escrow Flow**—Client funds Milestone 1 (Skill 56), Freelancer delivers (Skill 02 - Object Processor), and Client approves to release payment.

### 5. Engagement and Work Evidence (Chat & Tracking)

* **What it contains:** Messaging, file attachments, and time tracking (Work Diary).
* **System Modules & Skills:**
* **Skill 42 (Chat Service):** Real-time communication between parties.
* **Skill 16 (AI Context Service):** Summarizes long project threads and helps extract "Work Evidence" from messages.
* **Skill 22 (Logger/Monitoring):** Tracks activity logs that serve as the "audit trail" for hourly work protection.


* **How it works:** The **Chat Service** acts as the primary engagement container, while the **AI Context Service** monitors the thread to detect if milestones are actually being met.

### 6. Enterprise Layer (Compliance & Governance)

* **What it contains:** Payroll, worker classification, and API-based workforce management.
* **System Modules & Skills:**
* **Skill 35 (MCP Server):** Allows external tools and enterprise ERPs to interact with the marketplace via standard protocols.
* **Skill 55 (Validation Service):** Runs compliance checks (KYC, tax forms) before a contract starts.
* **DNA Module 09 (Governance):** Sets organizational-level "Hard Stops" (e.g., "Cannot hire without an NDA signature").



### Summary of Shared Flow Architecture

Using your provided architecture, these platforms are modeled as **State-Driven Systems**:

1. **Definitions:** DNA files (`genie-dna/`) define the "what" (forms, views, rules).
2. **Logic:** Skills (`V17-skills/`) execute the "how" (payments, matching, flows).
3. **State:** The **Master State** (JSON) tracks exactly where every project and user is in their respective journey.
To extend the designed platform with the freelancer marketplace processes, the system will leverage the existing **Xiigen architecture**, modeling these features as **State-Driven Flows**. The extension will focus on orchestrating current skills into new business flows such as job bidding, milestone tracking, and reputation management.

### 1. Core Marketplace Modules & Skill Mapping

The processes identified in the proposal map directly to the existing **V17-Skills** and **Genie DNA** modules:

* **Identity & Reputation (DNA Module 01/02):**
* Uses **DNA Profile Definitions** to manage dual-role accounts (Client and Freelancer).
* **Skill 13 (Feedback Service)** handles the trust signals and reviews essential for marketplace integrity.


* **Discovery & Matching:**
* **Skill 47 (Matching Service)** pairs job requirements with freelancer skills.
* **Skill 54 (Ranking Service)** prioritizes search results based on feedback scores and "Connects" usage.


* **Bidding & Proposal Economy:**
* **Skill 61 (Marketplace Service)** manages the auction logic for bidding.
* **Skill 56 (Payment Service)** handles the "Connects" currency and bid boosting.


* **Contract & Milestone Management:**
* **Skill 63 (Ticketing Service)** is used as the **Escrow and Dispute** container.
* **Skill 09 (Flow Orchestrator)** drives the state transitions from *Offer → Active → Milestone Submission → Paid*.



### 2. New State-Driven Flows

To support these processes, new **Flow Definitions (Skill 08)** must be added to the system. These flows define the "Hard Stops" and transitions:

| Flow Process | Orchestrated Skills | Key State Transitions |
| --- | --- | --- |
| **Job Posting** | 10 (Figma Parser), 55 (Validation) | `Draft` → `Parsing` → `Published` |
| **Bidding Flow** | 61 (Marketplace), 54 (Ranking) | `Open` → `Proposal Received` → `Shortlisted` |
| **Milestone Execution** | 42 (Chat), 16 (AI Context), 63 (Ticketing) | `Active` → `Submitted` → `Review` → `Released` |
| **Enterprise Compliance** | 35 (MCP), 55 (Validation), 21 (Permissions) | `KYC_Pending` → `Verified` → `Contract_Ready` |

### 3. Implementation Plan for Extensions

* **AI-Enhanced Monitoring:** **Skill 16 (AI Context Service)** will be extended to act as an automated "Project Manager," monitoring the **Skill 42 (Chat Service)** threads to extract "Work Evidence" and verify if milestones have been met before releasing funds.
* **Governance & Compliance:** **DNA Module 09 (Governance)** will implement "Hard Stops" for compliance, such as preventing a contract from starting until **Skill 55 (Validation Service)** confirms KYC or NDA signatures.
* **Audit Trails:** **Skill 22 (Logger/Monitoring)** will maintain a specialized "Audit Trail" for hourly work, providing protection for both parties during disputes handled by the **Ticketing Service**.
* **External Integration:** Use **Skill 35 (MCP Server)** to allow enterprise ERP systems to interact with the marketplace, enabling external workforce management.

By defining these processes in the **Master State** JSON and creating corresponding **DNA Site Configs**, the platform can dynamically transition into a fully functional freelancer marketplace like Upwork.

To extend the platform's capabilities into a freelancer marketplace, the system integrates a series of modular flows for talent discovery, proposal management, and milestone-based project execution. This expansion transitions the architecture into a "marketplace operating system" supported by specialized services and audit-ready state management.

### **FLOW-05: Freelancer Marketplace & Contract Management**

This new flow builds upon existing identity and content services to manage the lifecycle of a professional contract.

#### **1. Talent Discovery & Job Posting**

The sourcing phase utilizes content generation and matching capabilities to connect clients with qualified talent.

* **Job Posting State:** Transitions from `Draft` → `Parsing` (automated skill extraction) → `Published`.
* **Skill Integration:** **Skill 52 (Post Service)** manages the job listings, while **Skill 51 (Questionnaire Service)** handles mandatory screening questions and intake forms.
* **Discovery:** **Skill 47 (Matching Service)** and **Skill 49 (Connections Service)** enable talent discovery through search and direct invitations.

#### **2. Bidding & Proposal Economy**

A structured bidding system handles the competitive aspect of the marketplace.

* **Bidding State:** Transitions from `Open` → `Proposal Received` → `Shortlisted`.
* **Skill Integration:** **Skill 61 (Marketplace Service)** manages the submission currency (Connects), while **Skill 54 (Ranking Service)** prioritizes bids based on profile history and relevance.
* **Transformation:** **Skill 11 (AI Transform)** can be used to summarize large volumes of proposals for the client.

#### **3. Milestone Execution & AI Governance**

The platform acts as an automated project manager during the active phase of a contract.

* **Execution State:** Transitions from `Active` → `Submitted` → `Review` → `Released`.
* **Skill Integration:** **Skill 42 (Chat Service)** provides the collaboration thread, while **Skill 16 (AI Context Service)** monitors these threads as an automated "Project Manager" to extract work evidence and verify milestone completion.
* **Dispute Management:** **Skill 63 (Ticketing Service)** handles resolution, supported by **Skill 22 (Logger/Monitoring)**, which maintains a specialized "Audit Trail" for hourly work and dispute protection.

#### **4. Enterprise Compliance & Onboarding**

For enterprise-level safety, the system enforces "Hard Stops" via governance modules.

* **Compliance State:** Transitions from `KYC_Pending` → `Verified` → `Contract_Ready`.
* **Skill Integration:** **Skill 55 (Validation Service)** confirms KYC or NDA signatures before allowing contract start dates.
* **External Integration:** **Skill 35 (MCP Server)** allows enterprise ERP systems to interact with the platform for workforce management.

### **Master State Update (JSON Fragment)**

The system state is updated to include the new Freelancer domain and its specific validation rules:

```json
{
  "flows": {
    "FLOW-05": {
      "name": "Freelancer Marketplace",
      "status": "PLANNING",
      "dependencies": ["FLOW-01", "FLOW-04"],
      "modules": ["Identity", "Marketplace", "Governance", "Payments"],
      "hard_stops": [
        { "id": "HS_KYC", "service": "Skill_55", "description": "Block contract until KYC verified" }
      ]
    }
  },
  "domain_configs": {
    "freelancer": {
      "reputation_enabled": true,
      "escrow_service": "Skill_56",
      "audit_trail": "Skill_22"
    }
  }
}

```