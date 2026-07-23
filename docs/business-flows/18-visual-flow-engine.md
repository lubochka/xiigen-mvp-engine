<!--
  Source: business flows.zip / 22 - visual editor.md
  Canonical since: 2026-04-22
  Canonical flow: FLOW-18 visual-flow-engine
  Related deep-research: docs/business-flows/_deep-research/visual-flow-engine/ (if present)
  Related legacy engine artifacts: docs/business-flows/_legacy-engine-artifacts/visual-flow-engine/ (if present)
-->

Below is a **modular breakdown** of what a modern **blog system inside a site builder** (Wix / Webflow / Squarespace-style) typically contains — and how the modules connect into **flows**.

I’ll also note where a **Figma-like** product differs (design-first, not publishing-first), and how the same “blog system” idea maps there.

---

## 1) Core modules (what it “contains”)

### A. Workspace, Projects, Permissions

**Purpose:** who can do what, on which site/blog.

* Workspaces / Sites / Projects
* Roles: Owner, Admin, Editor, Author, Viewer
* Team invites, audit log, activity history

**Key flows supported**

* Invite collaborator → assign role → limit access (content vs design vs settings)
* Approval workflows (optional): Author → Editor → Publisher

---

### B. Visual Editor (Page Builder)

**Purpose:** build pages visually and place blog elements.

* Drag/drop layout, sections, grids
* “Blocks” / “Widgets”: Post list, Post page, Featured posts, Author box, Categories, Subscribe form
* Responsive variants (desktop/tablet/mobile)

**How it works**

* Stores a **page tree** (components + props) + layout constraints
* Uses reusable blocks that are wired to CMS data

**Key flows**

* Add “Blog feed” to homepage → configure query (latest / category / tag) → style it
* Create a “Post template” page → define how a post renders

---

### C. Theme / Design System

**Purpose:** consistent look & feel.

* Typography scale, colors, spacing tokens
* Global components (buttons, cards)
* Template styles for blog blocks (post card, header, etc.)

**Key flows**

* Change theme → propagates to all blog pages & post templates
* Per-block overrides (with guardrails so editors don’t break design)

---

### D. CMS Data Modeling (Collections)

**Purpose:** structured content and relationships.
Typical collections:

* **Posts** (title, slug, content, excerpt, coverImage, authorId, status, publishAt, seo)
* **Authors**
* **Categories**
* **Tags**
* Optional: “Pages”, “Site Settings”, “Redirects”

**How it works**

* Provides a schema editor + validation rules
* Stores references (post → author, post → tags)
* Exposes query API to the renderer/editor blocks

**Key flows**

* Add field “Reading time” or “Series” → update templates to display it
* Relate “Posts” to “Products” (commerce blog use case)

---

### E. Content Authoring (Rich Editor)

**Purpose:** create post content.

* Rich text + structured blocks (images, galleries, embeds, code blocks, callouts)
* Drafts, autosave, version history
* Collaboration: comments, suggestions, cursor presence (more Figma-like)

**Key flows**

* Draft → preview → request review → revise → publish
* Duplicate post as template (campaign posts)

---

### F. Media Library / Assets

**Purpose:** manage images, video, files.

* Upload, organize folders, tags
* Transforms: resize/crop, WebP/AVIF, thumbnails
* CDN delivery + caching

**Key flows**

* Upload cover image → auto-generate responsive sizes → embed in post + social cards
* Replace image → update all posts using it (optional)

---

### G. Routing, URLs, Navigation

**Purpose:** stable links and site structure.

* Slugs, permalink rules (`/blog/:slug`, `/category/:slug`)
* Redirect manager (301/302)
* Sitemaps, RSS/Atom feeds

**Key flows**

* Change slug → auto-create redirect
* Category pages auto-generated from CMS

---

### H. Rendering Runtime (Website “Engine”)

**Purpose:** convert content + templates into real pages users visit.
Common modes:

* **SSR** (server-side render on request)
* **SSG** (static generation on publish)
* **Hybrid** (static posts + dynamic personalization)

**How it works**

* Takes: Page template tree + CMS data query → produces HTML/CSS/JS
* Handles caching, edge/CDN, localization

**Key flows**

* Visitor opens post → engine resolves slug → fetch post data → render template → cache

---

### I. Publishing Pipeline

**Purpose:** “make it live” reliably.

* Statuses: Draft / Scheduled / Published / Archived
* Scheduling queue
* Rollback/version restore
* Environments: staging vs production (advanced builders)

**Key flows**

* Schedule post for Friday 09:00 → job runs → invalidate CDN → update sitemap/RSS
* Unpublish → keep redirect / show 404 / show “archived” page

---

### J. SEO & Social Sharing

**Purpose:** discoverability.

* Meta title/description, canonical URL
* OpenGraph/Twitter cards
* Structured data (JSON-LD for Article)
* Robots, sitemap, noindex rules

**Key flows**

* Edit SEO fields per post → preview snippet → publish → search engines pick up
* Auto-generate OG image from template (advanced)

---

### K. Engagement: Comments, Reactions, Forms

**Purpose:** audience interaction.

* Comments with moderation, spam protection
* Contact/subscribe forms
* Notifications: “new comment”, “new subscriber”

**Key flows**

* Comment posted → spam check → pending moderation → approve → notify author
* Subscribe form → email automation pipeline

---

### L. Search & Discovery

**Purpose:** find content.

* Site search (by title/content/tags)
* Filters: category/tag/author
* Related posts (basic rules or ML)

**Key flows**

* Visitor searches “X” → results ranked → click → track analytics
* “Related posts” widget uses tags/category similarity

---

### M. Analytics & Experimentation

**Purpose:** measure and improve.

* Page views, referrers, conversions (subscribe, click)
* Content performance dashboards
* A/B testing (advanced)

**Key flows**

* Track UTM → attribute subscriber conversions → report by post/category

---

### N. Integrations / Marketplace

**Purpose:** extend the system.

* Embeds (YouTube, Instagram, etc.)
* Email providers, CRM, analytics pixels
* App/plugin marketplace (Wix is big here)

**Key flows**

* Install “Newsletter” app → it registers a new block + backend webhook handlers

---

### O. Billing / Plans / Limits (builder products)

**Purpose:** monetize the platform.

* Free vs paid: custom domain, storage, collaborators, scheduled posts, advanced SEO
* Usage metering (bandwidth, build minutes, API calls)

---

## 2) The main end-to-end flows (what it “supports”)

### Flow 1: Create a blog + connect it to a site

1. Create site (workspace)
2. Enable Blog feature → creates CMS collections + default templates
3. Add blog feed to homepage → style it in editor
4. Configure `/blog` route + SEO defaults
5. Publish site

### Flow 2: Write → review → publish a post

1. Author creates draft (autosave + versions)
2. Adds media (cover, inline images)
3. Sets category/tags, SEO, slug
4. Preview in template (mobile/desktop)
5. Submit for approval (optional)
6. Publish or schedule → pipeline invalidates cache + updates RSS/sitemap

### Flow 3: Visitors discover → engage → convert

1. Visitor lands from Google/social → renders post
2. Related posts / category navigation increases session depth
3. Subscribe form conversion → email automation
4. Comments/reactions → moderation + notifications

### Flow 4: Change design without breaking content

1. Update theme tokens / post template layout
2. All posts re-render automatically (SSG rebuild or SSR live)
3. Regression protection: preview diff + rollback option

---

## 3) Where “Figma-like” differs (and how blog fits there)

Figma itself is mainly:

* **Design editor**
* **Component library/design system**
* **Collaboration**
* **Prototyping**
* Plugins (extensions)

A “blog system” in a **Figma-like** product usually means one of these:

1. **Designing** the blog UI (templates, components, responsive variants)
2. Connecting designs to **real CMS content** via plugin/export
3. Generating a site/blog in another runtime (Next.js/Webflow/Wix-like)

So in Figma-world, you often have strong **Editor + Components + Collaboration**, but you **don’t inherently have** the Publishing Pipeline, Hosting, Routing, SEO runtime — those live in the “builder/hosting” product.

---

## 4) If you’re modularizing this for implementation

A clean implementation split (service boundaries) often looks like:

* **Design Service** (editor, page tree, components)
* **CMS Service** (schemas + content records)
* **Render/Build Service** (SSR/SSG, caching)
* **Publishing Service** (workflow, scheduling, invalidation)
* **Assets Service** (media transforms + CDN)
* **SEO/Discovery Service** (sitemap, RSS, search index)
* **Identity/Billing/Integrations** as shared platform services

If you tell me which direction you mean:

* **(A)** “blog feature inside a Wix-like builder”, or
* **(B)** “Figma designs → auto-generate a working blog site”
  …I can map the exact module boundaries + APIs + data models for that path.

  Based on the **XIIGen (Multimodel Orchestrator)** architectural standards found in your files, here is the implementation mapping for a modern blog system. This mapping follows the **Skills-based modularity** and **Genie DNA** rules defined in your documentation.

### 1. Modular Implementation Split (The Service Boundaries)

In the XIIGen ecosystem, your "Core Modules" map to specific **Micro-Skills** (services). This allows for a clean separation between the design intent (Figma-like) and the publishing runtime (Wix-like).

| User Blog Module | XIIGen Skill / Service | Primary Responsibility |
| --- | --- | --- |
| **A. Workspace & Roles** | `20-auth-service` & `21-permissions-service` | Identity management and RBAC (Role-Based Access Control). |
| **B. Visual Editor** | `26-web-flow-editor` | Drag-and-drop UI for building page trees and post templates. |
| **C. Theme / Tokens** | `19-design-system-service` | Management of typography scales, color palettes, and global spacing tokens. |
| **D. CMS Modeling** | `52-post-service` | CRUD for structured post content and relationships. |
| **E. Rich Editor** | `40-content-generation-pipeline` | AI-assisted content creation and structured block handling. |
| **F. Assets/Media** | `02-object-processor` | Image transformations, folder organization, and CDN delivery. |
| **G. Routing / URLs** | `08-flow-definition` | Mapping slugs to flow executions and managing 301/302 redirects. |
| **H/I. Pipeline** | `09-flow-orchestrator` | Handling the lifecycle of a post from `Draft` to `Scheduled` to `Live`. |
| **L. Search** | `03-elasticsearch-datastore` | Full-text indexing of posts, categories, and tags. |

---

### 2. Core APIs & Data Models (Genie DNA)

Following the **Genie DNA Rules**, data models must be schema-validated and support cross-collection referencing.

#### **A. Post Collection Schema** (`post_definitions.schema.json`)

The `52-post-service` manages this model:

```json
{
  "postId": "uuid",
  "title": "string",
  "slug": "string",
  "content": {
    "type": "blocks",
    "data": [] 
  },
  "metadata": {
    "authorId": "uuid",
    "categoryId": "uuid",
    "tags": ["string"]
  },
  "status": "enum(draft, scheduled, published, archived)",
  "publishAt": "datetime",
  "seo": {
    "metaTitle": "string",
    "ogImage": "url"
  }
}

```

#### **B. Feed API** (`46-feed-service`)

This service handles the "Discovery" layer:

* **GET** `/feed/latest`: Returns a paginated list of published posts.
* **GET** `/feed/category/{slug}`: Filters posts by category relationship.
* **POST** `/feed/related`: Uses the **Ranking Service (Skill 54)** to find similar posts based on tags and content embeddings.

---

### 3. Directional Implementation Paths

#### **Path A: The "Wix-like" Builder Integration**

In this scenario, the **Web Flow Editor (Skill 26)** is the master.

* **Logic**: The editor fetches the **Design System (Skill 19)** tokens and the **Post Service (Skill 52)** schema to provide a "Live Preview".
* **Flow**: When a user drags a "Blog List" widget, the editor calls the **Feed Service (Skill 46)** with specific query parameters (e.g., `limit=5`, `category='tech'`).

#### **Path B: The "Figma -> Auto-Generated Blog" Path**

This leverages the **Figma Parser (Skill 10)** and **Code Generator (Skill 17)**.

* **Logic**: The system treats Figma as the "Source of Truth" for the `Post Template`.
* **Flow**:
1. **Skill 10** extracts the layer structure from Figma.
2. **Skill 19** identifies color/text styles and maps them to **Design System tokens**.
3. **Skill 17 (Code Gen)** produces a React/Next.js template that is wired to the **Post Service API**.
4. **Skill 27 (K8s Deployment)** pushes the generated static site to the production environment.



### 4. Critical Implementation Flows

* **Publishing Flow**: The `09-flow-orchestrator` coordinates with the `24-notification-service` to alert subscribers and the `03-elasticsearch-datastore` to re-index the new post content immediately upon publication.
* **Design Update Flow**: Changing a "Global Card Component" in the **Design System Service** triggers a "Re-render Job" in the **Flow Orchestrator**, which updates the cached HTML for all existing blog posts across the CDN.

The integration of the Visual Editor and Blog System processes into the existing architecture involves aligning the "Skills" mentioned in the document with the established microservices framework. The extension focuses on two primary operational paths: a dynamic visual building experience and an automated design-to-code pipeline.

### 1. Architectural Mapping of the Extension

The proposed expansion utilizes the existing Skill library to create a unified publishing and design environment.

* **Skill 26 (Web Flow Editor):** Functions as the primary interface for "Path A". It must be configured to consume the API of **Skill 52 (Post Service)** to fetch content schemas and **Skill 46 (Feed Service)** for dynamic content rendering.
* **Skill 10 (Figma Parser):** Serves as the entry point for "Path B". It extracts structured design data to be processed by the transformation layer.
* **Skill 17 (Code Generator):** Receives the parsed Figma data and design tokens from **Skill 19 (Design System Service)** to output production-ready React or Next.js components.
* **Skill 09 (Flow Orchestrator):** Acts as the central coordinator, managing the transition from design to deployment and ensuring that publishing events trigger secondary actions like search indexing.

### 2. Implementation of Path A: The Visual Site Builder Integration

This path enables real-time interaction between the visual editor and the CMS.

* **Live Preview Logic:** The Web Flow Editor incorporates a "Data Binding" layer. When a user adds a blog widget, the editor queries the Post Service for the available metadata (title, author, date). It uses the Design System tokens to render these elements according to global styles.
* **CMS-Editor Handshake:** The Editor sends query parameters (e.g., category filtering or post limits) to the Feed Service. The Feed Service returns the specific JSON content, which the Editor then injects into the visual components for an immediate "What You See Is What You Get" (WYSIWYG) experience.

### 3. Implementation of Path B: The Figma-to-Blog Pipeline

This is an automated workflow that treats design files as the source of truth for code generation.

1. **Extraction:** Skill 10 identifies the structural layers in a Figma "Post Template" file.
2. **Tokenization:** Skill 19 maps Figma's local styles (colors, typography) to the platform’s Design System tokens, ensuring that the generated site remains consistent with other project assets.
3. **Generation:** Skill 17 synthesizes the layout structure and the tokens into a functional template. This template is automatically wired to the Post Service API endpoints.
4. **Deployment:** Once the code is generated, Skill 09 triggers **Skill 27 (K8s Deployment)** to containerize the new static or dynamic site and push it to the production cluster.

### 4. Critical Orchestration Flows

To ensure the platform remains responsive and accurate, the Flow Orchestrator manages several high-priority sequences:

* **The Publishing Sequence:** When a post is finalized, the Orchestrator coordinates a multi-step completion:
* **Notification:** Triggers **Skill 24** to alert registered subscribers via email or push notification.
* **Indexing:** Sends the new content to **Skill 03 (Elasticsearch Datastore)** for immediate update of the site’s search index.


* **The Design Update Sequence:** When a global style is changed in Skill 19, the Orchestrator identifies all pages using those tokens and initiates a partial re-deployment through Skill 27 to update the visual appearance across the entire platform without manual intervention.

### 5. Schema Requirements

To support these extensions, the **Post Service (Skill 52)** and **Figma Parser (Skill 10)** require synchronized definitions.

* The Post Service should provide a JSON schema for "Post Types" that the Web Flow Editor can use to generate input forms dynamically.
* The Figma Parser requires a mapping file that translates Figma layer naming conventions (e.g., `#post-title`) into the platform’s internal component props.
* To extend the capabilities of the **XIIGen Unified Flow System** with the processes described in the visual editor documentation, the integration should focus on formalizing the **CMS/Visual Editor** layer and updating the **Flow Orchestrator (Skill 09)** to handle new high-priority sequences.

### 1. Integration of Core Modules

The blog system requirements introduce four core functional modules that must be mapped to the existing Skill-based architecture:

* **Workspace & Permissions (Skill 21/Existing Auth)**: Formalize the "Approval Workflow" (Author → Editor → Publisher) within the existing project management structure to control state transitions of content.
* **Visual Editor (Page Builder)**: This acts as the "Web Flow Editor" interface. It must store a **page tree** (components + props) and layout constraints, which the **Code Generator (Skill 17)** will use to build the site variants (desktop/tablet/mobile).
* **CMS / Content Management (Skill 52)**: The **Post Service** must be expanded to provide a JSON schema for "Post Types". This allows the Web Flow Editor to generate dynamic input forms for authors without manual frontend coding.
* **Design System (Skill 19)**: This service will manage global style tokens. A change in these tokens will now trigger an automated **Design Update Sequence** across the platform.

### 2. Critical Orchestration Flows (Skill 09)

The **Flow Orchestrator** must be configured with two new specialized sequences to ensure the platform remains responsive:

#### The Publishing Sequence

When a post is finalized in the CMS, the Orchestrator (Skill 09) coordinates the following multi-skill completion:

1. **Notification (Skill 24)**: Alerts registered subscribers via email or push notifications.
2. **Indexing (Skill 03)**: Sends new content to the **Elasticsearch Datastore** to update the site's search index immediately.
3. **Deployment (Skill 27)**: Triggers a containerized build to push the new static or dynamic site to the production cluster.

#### The Design Update Sequence

When global styles change in **Skill 19**, the Orchestrator initiates a "partial re-deployment":

* Identify all pages utilizing the modified design tokens.
* Trigger **Skill 27** to update the visual appearance platform-wide without manual intervention.

### 3. Skill-Specific Extensions

To support these extensions, specific existing skills require technical updates:

* **Figma Parser (Skill 10)**: Update the mapping protocol to translate Figma layer naming conventions (e.g., `#post-title`, `#author-box`) directly into internal component props used by the CMS widgets.
* **Code Generator (Skill 17)**: Enhance to support "Reusable Blocks" wired to CMS data, allowing the generator to inject dynamic content into static templates.
* **Elasticsearch Datastore (Skill 03)**: Ensure the schema supports immediate indexing of post metadata (Categories, Tags, Featured status) for real-time feed updates.

### 4. Schema Synchronisation

The extension requires strict synchronization between the **Post Service (Skill 52)** and the **Figma Parser (Skill 10)**:

* **Skill 52** provides the "Post Types" schema.
* **Skill 10** uses a mapping file to translate design-first elements into these schema-compliant components.