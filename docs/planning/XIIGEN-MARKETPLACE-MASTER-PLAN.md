# XIIGen Marketplace Master Plan
## 65 Plugins × 14 Platforms × 4 Plugin Families — Unified Reference
*Consolidated: March 19, 2026 — v1.0*

> **This document supersedes and unifies ALL previous marketplace research documents.** It is the single source of truth for platform data, plugin plans, build order, research findings, and competitive analysis. Original source files remain available as detailed reference.

> **Source documents consolidated:** deep-research-report_chat_gpt.md, gemini.md, MARKETPLACE-ORGANIC-TRAFFIC-RESEARCH.md, MARKETPLACE-RESEARCH-ADDENDUM-v2.md, XIIGEN-20-PLUGIN-TRAFFIC-STRATEGY.md, MARKETPLACE-NEW-PLATFORM-DISCOVERIES.md, XIIGEN-PER-PLATFORM-PLUGIN-PLANS.md (v1+v2), XIIGEN-FLOW-TO-SYSTEM-ANALYSIS.md, XIIGEN-AI-WORKFLOW-GENERATOR-ANALYSIS.md, XIIGEN-CONTENT-TO-VIDEO-ANALYSIS.md, STATE-marketplace-research.json

---

## 0. EXECUTIVE SUMMARY

**What we're building:** 65 unique plugin concepts across 14 platforms, organized into 4 plugin families (Utility, FLOW, AUTO, VIDEO), all sharing ~15 core engines and one FastAPI backend. With cross-platform adaptations: 80+ marketplace listings.

**Why:** Plugin marketplaces with built-in search + account gates create compounding organic traffic to xiigen.com — no ad spend. Every plugin is a lead magnet that forces site visits through freemium gates, external dashboards, or mandatory accounts.

**Key numbers:**
- 14 platforms with confirmed plugin plans (34 total evaluated)
- 65 unique plugin concepts (41 Utility + 8 FLOW + 9 AUTO + 7 VIDEO)
- 80+ marketplace listings with cross-platform adaptations from ~10 core concepts
- ~15 core engines sharing one FastAPI backend + one React component library + one @xiigen/plugin-sdk
- 2-3 weeks shared infrastructure (critical path)
- ~30-35 weeks for 20 original plugins, ~42-48 weeks for 40+ including adaptations
- Parallelizing across 2-3 developers cuts calendar time by 50-60%

**The 4 Plugin Families:**

| Family | What It Does | Count | Core Engine |
|---|---|---|---|
| **Utility** | AI-powered specific tools (QR, alt-text, SEO, translations, descriptions) | 41 originals | Per-tool, sharing AI Gateway |
| **FLOW** | Diagram → Full Working System (boxes on whiteboard → deployed microservices) | 8 | Diagram Parser + AF Pipeline |
| **AUTO** | AI Workflow Generator (describe automation → n8n/Zapier/Make/Python) | 9 | Cross-platform workflow gen + Template Library |
| **VIDEO** | Content → Branded Video (blog/product/design → video with voiceover) | 7 | Video Engine (parser + script + visual + voiceover + assembler) |

**Combined story per platform (Miro example):**
1. **M1** (Utility): "Describe your system → AI draws the architecture diagram"
2. **M-FLOW**: "Take that diagram → generate the complete system code"
3. **M-AUTO**: "Draw the workflow between services → generate the automation"
= Text → Diagram → System → Automation. The entire lifecycle from idea to deployed, automated system.

---

## 1. STRATEGIC FRAMEWORK

### Downloads ≠ Traffic

A VS Code extension with 100K installs may send ZERO people to xiigen.com. The user installs it, uses it inside VS Code, and never thinks about the developer again. Same for Obsidian plugins, Chrome extensions, and most "utility" tools.

**The only plugins worth building for our purpose have a traffic conversion mechanism:**

| Mechanism | Conversion Strength | Example |
|---|---|---|
| **Account required** — Plugin requires free XIIGen account to unlock core features | 🔴 STRONGEST | Shopify apps, SaaS tools with dashboards |
| **Dashboard on site** — Plugin settings/analytics live on xiigen.com | 🔴 STRONGEST | Any plugin with external config panel |
| **Freemium gate** — Free version works, but "Upgrade at xiigen.com" for more | 🟡 STRONG | Figma plugins with limited free AI calls |
| **"Powered by XIIGen"** — Visible branding + link in plugin UI | 🟡 MEDIUM | Every plugin should have this minimum |
| **Docs on site only** — All documentation/tutorials on xiigen.com | 🟡 MEDIUM | Forces visit for learning |
| **Export to XIIGen** — Plugin creates output that opens on xiigen.com | 🟡 MEDIUM | "Open full version on xiigen.com" |
| **Nothing** — Standalone utility, no connection to site | ⚪ ZERO | Clean Keyboard, JSON formatter |

**Rule: Every plugin we build MUST have at least 2 of the top 4 mechanisms.**

### Traffic Math

```
Real traffic = Platform installs × Plugin visibility × Click-through to site × Account creation rate

Bad:  Obsidian plugin — 50K installs × 100% × 0.5% click-through × 50% account = 125 accounts
Good: Figma plugin   —  5K installs × 100% × 15% click-through × 50% account  = 375 accounts
Best: Shopify app    — 500 installs × 100% × 100% forced       × 100%          = 500 accounts
```

### FLOW Plugins: Dramatically Better Traffic-per-Install

| Metric | Regular Plugin (Alt-Text) | FLOW Plugin (Diagram→System) |
|---|---|---|
| Downloads | Higher | Lower (niche) |
| Traffic per install | Low-Medium | **VERY HIGH** |
| Time on site | 1-2 minutes | **30+ minutes** |
| Account creation | ~15% of installs | **~80%+** |
| Return visits | Low | **HIGH** (iterate, version) |
| Virality | Low | **HIGH** (team shares → team creates accounts) |
| Upsell potential | Limited | **VERY HIGH** |

---

## 2. SHARED INFRASTRUCTURE (Build First — 2-3 weeks)

Every plugin across all platforms needs this backend. **This is the critical path. Nothing ships without it.**

| Component | What It Does | Tech |
|---|---|---|
| **xiigen.com/plugins** | Landing page showing all plugins with "Get Started Free" | React/Next.js |
| **Auth service** | Free account creation, OAuth (Google, GitHub, Figma, etc.) | FastAPI + JWT (auth-jwt skill) |
| **AI Gateway** | Rate-limited proxy to Claude/OpenAI/Gemini. Freemium: X calls/day free | FastAPI + AI Engine Fabric |
| **Usage tracker** | Per-user, per-plugin usage counts. Enforces freemium limits | Redis + Elasticsearch |
| **Dashboard** | User sees all their plugins, usage, saved outputs | React + dynamic-documents |
| **Plugin SDK (JS)** | Shared npm package each plugin imports for auth + API calls | TypeScript, npm as `@xiigen/plugin-sdk` |
| **Template Library** | Searchable templates on xiigen.com (workflows, videos, diagrams) — SEO engine | React + Elasticsearch |
| **Brand Kit Manager** | Stores logo, colors, fonts, voiceover preferences per user | Dashboard + auth-jwt |

### SDK Commonalities — What We Reuse

| SDK Pattern | Platforms | Our Advantage |
|---|---|---|
| **React + TypeScript** | Canva, Miro, Shopify (Polaris), Stripe, monday.com, Framer | One shared component library |
| **TypeScript/JS plugin API** | Figma, Chrome, Webflow | Lighter — no React framework |
| **Google Apps Script** | Google Workspace | JavaScript-based, quick port |
| **Node.js backend** | Atlassian (Forge), n8n, all external backends | FastAPI/Node skills transfer |
| **OAuth 2.0** | ALL platforms | Build once in SDK, reuse everywhere |
| **External API gateway** | ALL plugins call our AI Engine | Single FastAPI backend serves all plugins |

**Key insight:** 10 of 14 platforms use React. Our shared component library covers 70%+ of the UI work. The AI backend is identical for all.

---

## 3. PLATFORM REGISTRY — All 34 Evaluated Platforms

### 14 Platforms WITH Plugin Plans

| # | Platform | Users | Apps | SDK | Review | Traffic Score | Status |
|---|---|---|---|---|---|---|---|
| 1 | **Figma** ✅ | 13M+ | 5,000+ | TS Plugin API | 1-3 days | ⭐⭐⭐⭐⭐ | Active |
| 2 | **Canva** | 260M | ~1,000 | React + webpack | ~2 weeks | ⭐⭐⭐⭐⭐ | Planned |
| 3 | **Miro** | 100M+ | 250+ | TS/JS Web SDK | 1-3 weeks | ⭐⭐⭐⭐⭐ | Planned |
| 4 | **Shopify** | 5.5M merchants | 16,000+ | React + Polaris + GraphQL | 2-4 weeks (100-checkpoint) | ⭐⭐⭐⭐ | Planned |
| 5 | **Wix** | 278M+ | 500+ | React + Wix Blocks | ~15 days | ⭐⭐⭐⭐ | Planned |
| 6 | **Webflow** | 3.5M | 300+ | JS Designer API + REST | Low-medium | ⭐⭐⭐⭐ | Planned |
| 7 | **monday.com** | 225K+ companies | 650 | React + monday SDK | monday review | ⭐⭐⭐⭐ | NEW |
| 8 | **Google WS** | 400M+ | 5,000+ | Apps Script / Node.js | 2-14 days | ⭐⭐⭐ | Planned |
| 9 | **Framer** | <1M | ~100 | TS/React Plugin API | ~7+14 days | ⭐⭐⭐ | Planned |
| 10 | **Atlassian** | 300K+ companies | 6,000+ | Forge (Node.js) or Connect | 5-10 days | ⭐⭐⭐ | Planned |
| 11 | **n8n** | 230K+ | ~2,000 | Node.js npm package | None (npm publish) | ⭐⭐⭐ | Planned |
| 12 | **Chrome** | 3.45B | 137,000+ | Manifest V3 JS/TS | Hours-3 weeks | ⭐⭐ | Planned |
| 13 | **Stripe** | 2M+ websites | 250 | React + TS | Stripe review | ⭐⭐⭐ | NEW |
| 14 | **Salesforce** | 150K+ companies | 6,500+ | Lightning Web Components | 🔴 Weeks-months | ⭐⭐⭐⭐ | Phase 5+ |

### Key Platform Intel

| Platform | Our Edge | Revenue Share | Special Notes |
|---|---|---|---|
| **Figma** | Figma-to-Code pipeline ALREADY BUILT | Standard | AI category fastest growing |
| **Canva** | React skills match. Innovation Fund pays us | Standard | 260M users, 59% non-English |
| **Miro** | 100M users / 250 apps = most underserved | Standard | Diagramming = our core |
| **Shopify** | 100% forced account creation | Standard | $120/mo average app spend. Strictest review |
| **Wix** | 278M users, platform promotes AI tools | Standard | Developer dashboard with analytics |
| **Webflow** | 3.5M users, indie-friendly, 300 apps | Standard | Revenue +66% YoY |
| **monday.com** | 225K / 650 apps, marketplace born 2022 | Standard | Very young = low competition |
| **Atlassian** | draw.io = #1 app in entire marketplace | **0% Forge rev share to $1M** | B2B, entire teams. Diagramming proven winner |
| **Framer** | Small but engaged design audience | **100% earnings to creator** | Active promotion of new plugins |
| **n8n** | Technical audience, API key = forced account | Free (npm) | Cloud users opened to community nodes Jul 2025 |
| **Stripe** | 2M sites / 250 apps = 8,000:1 ratio | Standard | Dashboard-visible on every payment |
| **Salesforce** | 150K enterprise companies. Highest B2B LTV | Standard | Heavy AppExchange review |

### 20 Platforms EVALUATED but NOT in Plans

| # | Platform | Users | Why Not in Plans | Status |
|---|---|---|---|---|
| 15 | HubSpot | 238K+ companies | Crowded (1,700 apps). Lower priority than monday.com | Watch |
| 16 | Zoom | 300M+ | Apps run inside meetings — limited branding window | Watch |
| 17 | Zendesk | 160K+ companies | Customer service niche only | Watch |
| 18 | Zoho | 250K+ companies | SMB, lower ARPU, competitive | Watch |
| 19 | Pipedrive | 100K+ | Sales-only niche | Watch |
| 20 | Penpot | Growing | Open-source Figma alt. No marketplace yet | Watch |
| 21 | Lucid | 100M+ | Enterprise integration-focused | Watch |
| 22 | BigCommerce | Smaller | Only after Shopify established | Phase 5+ |
| 23 | VS Code | 73% devs | Downloads ≠ Traffic. Invisible after install | Research only |
| 24 | Obsidian | 1.5M | Community-first, no site visits | Research only |
| 25 | Raycast | 500K+ | Utility only, weak traffic to site | Research only |
| 26 | JetBrains | 12M devs | Opaque data, heavy review | Research only |
| 27 | MS AppSource | 430M+ | 4-6 week review. Heavy entry | Research only |
| 28 | Freshdesk | 60K+ | Too small, too niche | Low |
| 29 | ServiceNow | 8,100+ | Enterprise IT only | Enterprise only |
| 30 | Magento | 167K+ | Enterprise e-commerce | After Shopify |
| 31 | WordPress | 585M sites | Algorithmic wall — new plugins get <10 installs | 🔴 Avoid |
| 32 | WooCommerce | 3.6M stores | Same WordPress discovery problem | 🔴 Avoid |
| 33 | Notion | 100M+ | Invite-only, no code plugins | 🔴 Closed |
| 34 | Bubble | 7,000+ plugins | Zeroqode monopoly (60% revenue) | 🔴 Avoid |

*Additional platforms confirmed not viable: Squarespace (~40 apps), Sketch (declining), Lunacy (plugins discontinued), Make.com (closed), Excalidraw/Creately/Whimsical (no marketplaces), Joomla/Drupal (tiny ecosystems).*

---

## 4. PER-PLATFORM PLUGIN PLANS — All 4 Families

### PLATFORM 1: FIGMA ✅ (Already Active)

**Platform Data:**
| Attribute | Value |
|---|---|
| Users | 13M+ (40.65% of UI/UX design market) |
| Apps | 5,000+ |
| SDK | Figma Plugin API (TypeScript). HTML/CSS/JS in iframe |
| Auth | `figma.currentUser` + external OAuth for xiigen.com |
| Review | 1-3 days. Updates without re-review |
| Revenue | Standard marketplace |
| Our edge | Figma-to-Code pipeline ALREADY BUILT and tested |

**Utility Plugins:**

| ID | Name | What | Effort | Traffic Score | Traffic Mechanism | Adaptations |
|---|---|---|---|---|---|---|
| F1 | **Figma → Full Site Generator** | Select frame → generate responsive HTML/CSS/React | 1 wk | ⭐⭐⭐⭐⭐ | Freemium gate (3/day) + AI backend | → FR2 🟡 2wk, → WF3 🟡 2wk, → C6* 🔴 3wk, → W4* 🔴 3wk |
| F2 | **Multilingual Design Translator** | Select text → AI translates preserving layout. RTL | 1 wk | ⭐⭐⭐⭐ | Freemium (1 lang free) | → C5 🟢 3d, → FR3* 🟢 3d, → M5* 🟢 3d, → WF4* 🟡 1wk |
| F3 | **Design System Auditor** | Scan file → AI reports inconsistencies, accessibility | 2 wk | ⭐⭐⭐ | Report on xiigen.com | → C7* 🟡 2wk, → WF5* 🟡 2wk, → FR4* 🟡 1.5wk |
| F4 | **AI Component Variant Gen** | Select component → AI generates dark mode/RTL/mobile variants | 2 wk | ⭐⭐⭐ | Freemium (3 free) | → FR5* 🟡 1.5wk |
| F5 | **Email Template Exporter** | Design email → export as MJML/HTML email template | 1.5 wk | ⭐⭐ | Template library on site | → C8* 🟡 1.5wk, → FR6* 🟡 1.5wk |

**FLOW Plugin:**

| ID | Name | What | Effort | Traffic Mechanism |
|---|---|---|---|---|
| F-FLOW | **FigJam → Full System** | Draw system architecture in FigJam → XIIGen generates complete codebase (services, APIs, DB schemas, queue configs, tests, deployment manifests) | 3 wk | Account + generated system on xiigen.com |

> Combines with F1: F1 handles UI→frontend, F-FLOW handles architecture→backend. Together = complete app from Figma.

**AUTO Plugin:**

| ID | Name | What | Effort | Traffic Mechanism |
|---|---|---|---|---|
| F-AUTO | **User Journey → Automation** | Draw user journey in FigJam (signup→onboarding→purchase→referral) → XIIGen generates automation workflow behind each step | 2 wk | Account + workflow on xiigen.com |

**VIDEO Plugin:** Not applicable (design platform, not content platform)

**Total Figma plugins: 7** (5 utility + 1 FLOW + 1 AUTO)

---

### PLATFORM 2: CANVA

**Platform Data:**
| Attribute | Value |
|---|---|
| Users | 260M (21M paying). Only 41% English-speaking |
| Apps | ~1,000 (was 100 in late 2023, 430 by end 2024 — 300% growth) |
| SDK | Canva Apps SDK — TypeScript + React + webpack. Node.js v20.10.0 |
| Auth | Canva user context + external OAuth |
| Review | ~2 weeks. Must be free with no mandatory login for free features |
| Revenue | Standard. **Innovation Fund pays developers cash grants + App Adoption Awards** |
| Our edge | React skills match. 260M users. >50% of apps are AI-powered |

**Utility Plugins:**

| ID | Name | What | Effort | Traffic Score | Traffic Mechanism | Adaptations |
|---|---|---|---|---|---|---|
| C1 | **AI Infographic Table Designer** | Paste JSON/CSV → AI generates beautiful table/chart in Canva | 2 wk | ⭐⭐⭐⭐⭐ | Freemium (5/day) + "Powered by XIIGen" | → M6* 🟡 1.5wk, → G3 🟡 2wk, → F6* 🟡 1.5wk |
| C2 | **AI Background Scene Gen** | Describe scene or upload product photo → AI generates background | 2 wk | ⭐⭐⭐⭐ | Freemium (3/day) + style presets on site | → F7* 🟢 3d, → W5* 🟢 5d, → S4* 🟡 1wk |
| C3 | **AI QR Code Designer** | Generate styled QR codes with brand colors/logos | 1 wk | ⭐⭐⭐ | Freemium (basic free) | → F8* 🟢 2d, → M7* 🟢 2d, → W6* 🟢 3d, → CH3* 🟢 3d, → S5* 🟡 1wk |
| C4 | **AI Social Post Generator** | Describe topic → complete social post + layout for IG/LinkedIn/X | 2 wk | ⭐⭐⭐ | Account for templates on site | → W7* 🟡 1.5wk, → S6* 🟡 1.5wk, → G4* 🟡 1wk |
| C5 | **Multilingual Design Adapter** | Translate designs preserving layout. RTL. (Adapted from F2) | 1.5 wk | ⭐⭐ | Freemium (1 lang free) | See F2 chain |

**FLOW Plugin:** Not applicable (design platform, users don't draw system architectures)

**AUTO Plugin:** Not applicable (Canva users think about design, not automation workflows)

**VIDEO Plugin:**

| ID | Name | What | Effort | Traffic Mechanism |
|---|---|---|---|---|
| C-VIDEO | **Design → Branded Video** | Finish designing in Canva → AI creates video with animations, voiceover, music from the design | 3 wk | Freemium (3/week + watermark). Brand kit + video editor on xiigen.com |

> Canva's native "Animate" is basic. No AI voiceover, no script generation, no multi-scene video. 260M users need video versions for social media.

**Total Canva plugins: 6** (5 utility + 1 VIDEO)

---

### PLATFORM 3: MIRO

**Platform Data:**
| Attribute | Value |
|---|---|
| Users | 100M+ worldwide |
| Apps | 250+ (collections: AI Workflows, MCP Clients, Google Workspace, Atlassian) |
| SDK | Miro Web SDK — TypeScript/JavaScript. React or vanilla JS |
| Auth | Miro OAuth 2.0. User context from SDK |
| Review | 1-3 weeks |
| Revenue | Standard |
| Our edge | 100M users / 250 apps = most underserved marketplace. Diagramming = our core |

**Utility Plugins:**

| ID | Name | What | Effort | Traffic Score | Traffic Mechanism | Adaptations |
|---|---|---|---|---|---|---|
| M1 | **AI Architecture Visualizer** | Describe system in text → AI generates architecture diagram on board | 2 wk | ⭐⭐⭐⭐⭐ | Account + Dashboard on xiigen.com | → MON1 🟡 1.5wk, → F9* 🟡 1.5wk, → G5* 🟡 2wk, → CH4* 🟡 1.5wk |
| M2 | **Jira Flow Diagram Sync** | Connect Jira → AI generates dependency/flow diagram. Auto-updates | 3 wk | ⭐⭐⭐⭐ | Account + Jira OAuth + Dashboard | → A1 🟡 2wk, → MON3* 🟡 2wk, → F10* 🟡 1.5wk |
| M3 | **Meeting-to-Action-Items** | Paste meeting notes → AI extracts action items → Miro cards | 1 wk | ⭐⭐⭐ | Freemium (3/week) + tracking on site | → MON2 🟢 3d, → A4* 🟡 1wk, → G2 🟢 3d, → SL1* 🟡 1wk |
| M4 | **AI Process Flow Mapper** | Describe business process → BPMN-style flow on board | 2 wk | ⭐⭐⭐ | Account + process library on site | → MON4* 🟡 2wk, → A5* 🟡 2wk, → SF1 🔴 4wk, → N3* 🟡 1.5wk |

**FLOW Plugin:**

| ID | Name | What | Effort | Traffic Mechanism |
|---|---|---|---|---|
| M-FLOW | **Board → Full System** | Draw boxes (services) + arrows (connections) on Miro → XIIGen parses shapes/connectors → AF pipeline → complete codebase on xiigen.com | 3-4 wk | Account mandatory + generated system on xiigen.com (download, API docs, tests, deploy) |

> Parser complexity: 🟡 Medium — freeform shapes need heuristic mapping. No other Miro app turns diagrams INTO working systems.

**AUTO Plugin:**

| ID | Name | What | Effort | Traffic Mechanism |
|---|---|---|---|---|
| M-AUTO | **Drawn Workflow → Automation** | Draw workflow on Miro board (trigger→steps→outputs) → generates n8n/Zapier/Make workflow OR production Python code | 3 wk | Account + generated workflow on xiigen.com |

> Miro has NO plugin that turns drawn workflows into executable automations. M1 is diagram generation — M-AUTO is the REVERSE.

**VIDEO Plugin:** Not applicable (collaboration platform, not content)

**Total Miro plugins: 6** (4 utility + 1 FLOW + 1 AUTO)

---

### PLATFORM 4: SHOPIFY

**Platform Data:**
| Attribute | Value |
|---|---|
| Users | 5.5M merchants |
| Apps | 16,000+ |
| SDK | Shopify App Bridge + Polaris (React) + Admin API (GraphQL) |
| Auth | Shopify OAuth + session tokens. EVERY app requires merchant account |
| Review | 🔴 2-4 weeks, 100-checkpoint review. Strictest of all platforms |
| Revenue | Standard. $120/mo average merchant app spend |
| Our edge | 100% forced account creation. Highest LTV per install |

**Utility Plugins:**

| ID | Name | What | Effort | Traffic Score | Traffic Mechanism | Adaptations |
|---|---|---|---|---|---|---|
| S1 | **AI Product Description Gen** | Upload product photo → AI generates SEO title, description, tags | 3-4 wk | ⭐⭐⭐⭐⭐ | Account MANDATORY + batch on xiigen.com | → W8* 🟡 2wk, → BC1* 🟡 1.5wk, → WC1* 🟡 1.5wk, → WF7* 🟡 1.5wk |
| S2 | **AI Collection Page Builder** | Select collection → AI generates themed landing page | 3-4 wk | ⭐⭐⭐⭐ | Account + more pages on xiigen.com | → W1 variant 🟡 2wk, → WF1 variant 🟡 2wk, → BC2* 🟡 2wk |
| S3 | **AI Customer Segment Analyzer** | Connect store → AI analyzes purchase patterns → visual segments on xiigen.com | 4 wk | ⭐⭐⭐ | Dashboard on xiigen.com (mandatory) | → ST1 variant 🟡 1.5wk, → WC2* 🟡 2wk, → HS1* 🟡 2wk |

**FLOW Plugin:** Not applicable (merchants don't draw system architectures)

**AUTO Plugin:**

| ID | Name | What | Effort | Traffic Mechanism |
|---|---|---|---|---|
| S-AUTO | **Merchant Workflow → Automation** | Describe: "When VIP orders >$500, skip queue, add gift, notify shopper" → generates Shopify Flow + external automation | 3 wk | Account + workflow editor on xiigen.com |

**VIDEO Plugin:**

| ID | Name | What | Effort | Traffic Mechanism |
|---|---|---|---|---|
| S-VIDEO | **Product → Video Ad** | Select product → AI creates video showcasing product with pricing, features, CTA, branded with store colors | 4 wk (incl. review) | Account MANDATORY + video editor on xiigen.com. Batch for full catalog |

**Total Shopify plugins: 5** (3 utility + 1 AUTO + 1 VIDEO)

---

### PLATFORM 5: WIX

**Platform Data:**
| Attribute | Value |
|---|---|
| Users | 278M+ total, 6M+ premium sites |
| Apps | 500+ |
| SDK | Wix Blocks (React) or Wix CLI. Wix Velo (serverless) backend |
| Auth | Wix OAuth + Members API |
| Review | ~15 business days. Developer dashboard shows: page views, installs, upgrades, uninstalls |
| Our edge | 278M users, 500 apps. Platform promotes AI tools. Active developer analytics |

**Utility Plugins:**

| ID | Name | What | Effort | Traffic Score | Traffic Mechanism | Adaptations |
|---|---|---|---|---|---|---|
| W1 | **AI Page Section Builder** | Describe section → AI generates as Wix element | 2-3 wk | ⭐⭐⭐⭐ | Freemium (5 free) + templates on site | → WF1 🟡 1.5wk, → S2 variant 🟡 2wk, → FR1 variant 🟡 1.5wk |
| W2 | **AI Alt-Text Generator** | Scan all site images → AI generates alt text | 1 wk | ⭐⭐⭐ | Freemium (10 images free) | → S7* 🟢 3d, → WF8* 🟢 3d, → WP2* 🟢 5d, → CH1 variant 🟡 1wk, → BC3* 🟢 3d |
| W3 | **AI SEO Content Optimizer** | Analyze page → AI suggests title, meta, headings, content | 2 wk | ⭐⭐⭐ | Freemium (1 page/day) + full audit on site | → S8* 🟡 1.5wk, → WF2 variant 🟡 1wk, → CH1 🟡 1wk |

**FLOW Plugin:** Not applicable

**AUTO Plugin:**

| ID | Name | What | Effort | Traffic Mechanism |
|---|---|---|---|---|
| W-AUTO | **Site Automation → Velo Code** | Describe: "When form submitted, email + CRM + task" → generates Wix Velo backend code | 2 wk | Account + workflow on xiigen.com |

**VIDEO Plugin:**

| ID | Name | What | Effort | Traffic Mechanism |
|---|---|---|---|---|
| W-VIDEO | **Blog Post → Branded Video** | Open any Wix blog post → AI reads content, creates script, generates visuals, adds voiceover → video in Wix Media Library | 3 wk | Freemium (3/month). Brand kit + video dashboard on xiigen.com |

> No Wix app does blog-to-video. 500-app marketplace has ZERO blog-to-video tools. Wix > WordPress for this because Wix actively promotes AI tools.

**Total Wix plugins: 5** (3 utility + 1 AUTO + 1 VIDEO)

---

### PLATFORM 6: WEBFLOW

**Platform Data:**
| Attribute | Value |
|---|---|
| Users | 3.5M designers/teams. Revenue $213M (2024, +66% YoY) |
| Apps | 300+ |
| SDK | Webflow Designer API (JS) + Data API (REST) |
| Auth | Webflow OAuth 2.0 |
| Review | Low-medium (guidelines review) |
| Our edge | 3.5M users, 300 apps, explicitly inviting indie developers |

**Utility Plugins:**

| ID | Name | What | Effort | Traffic Score | Traffic Mechanism | Adaptations |
|---|---|---|---|---|---|---|
| WF1 | **AI CMS Content Populator** | Connect CMS collection → AI fills with SEO content based on brand voice | 2 wk | ⭐⭐⭐⭐ | Account + brand voice storage on site | → W variant 🟡 1.5wk, → S9* 🟡 1.5wk |
| WF2 | **Schema Markup Generator** | AI analyzes site → generates schema.org JSON-LD | 1 wk | ⭐⭐⭐ | Preview on xiigen.com | — |
| WF3 | **Figma-to-Webflow Converter** | Import Figma design → AI converts to Webflow components | 3 wk | ⭐⭐⭐ | Freemium (1 page free) | Adapted FROM F1 |

**FLOW Plugin:**

| ID | Name | What | Effort | Traffic Mechanism |
|---|---|---|---|---|
| WF-FLOW | **Site Flow → Webflow Site** | Sketch site map as flow diagram → XIIGen generates Webflow site structure + CMS + page content | 3-4 wk | Account + site preview on xiigen.com |

**AUTO Plugin:** Not applicable (Webflow Logic is too new, watch)

**VIDEO Plugin:**

| ID | Name | What | Effort | Traffic Mechanism |
|---|---|---|---|---|
| WF-VIDEO | **Article → Video Summary** | Open CMS item → AI creates video summary → embed in Webflow page | 2-3 wk | Account + video management on xiigen.com |

**Total Webflow plugins: 5** (3 utility + 1 FLOW + 1 VIDEO)

---

### PLATFORM 7: MONDAY.COM (NEW)

**Platform Data:**
| Attribute | Value |
|---|---|
| Users | 225,000+ companies across 200+ countries |
| Apps | 650 (marketplace founded 2022 — very young) |
| SDK | monday.com Apps Framework — React + monday SDK |
| Auth | monday.com OAuth 2.0. Session token from SDK |
| Review | monday.com app review |
| Our edge | 225K / 650 apps = massively underserved. Developer hub available. Young marketplace |

**Utility Plugins:**

| ID | Name | What | Effort | Traffic Score | Traffic Mechanism | Adaptations |
|---|---|---|---|---|---|---|
| MON1 | **AI Board Visualizer** | Select board → AI generates process flow / dependency map / Gantt | 2 wk | ⭐⭐⭐⭐ | Account + saved diagrams on xiigen.com | Adapted FROM M1 |
| MON2 | **AI Status Report Generator** | Select board/group → AI generates executive summary with progress, blockers, risks | 1.5 wk | ⭐⭐⭐ | Freemium (1/week) + report history on site | Adapted FROM M3 |

**FLOW Plugin:**

| ID | Name | What | Effort | Traffic Mechanism |
|---|---|---|---|---|
| MON-FLOW | **Board → Full System** | Structure system as monday board (groups=services, items=endpoints) → "Generate System" → full codebase | 3 wk | Account + generated code on xiigen.com |

> "Your sprint board IS your architecture." Turn project management board INTO the system it describes.

**AUTO Plugin:**

| ID | Name | What | Effort | Traffic Mechanism |
|---|---|---|---|---|
| MON-AUTO | **Board Workflow → Real Automation** | Describe complex workflow → generates monday.com automation recipe OR external n8n/Zapier workflow | 2 wk | Account + workflow on xiigen.com |

> monday.com native automations are simple (if-then). XIIGen generates COMPLEX multi-step logic.

**VIDEO Plugin:**

| ID | Name | What | Effort | Traffic Mechanism |
|---|---|---|---|---|
| MON-VIDEO | **Project Update → Video Status Report** | Turn board status into narrated video update for stakeholders | 2 wk | Account + video on xiigen.com |

**Total monday.com plugins: 5** (2 utility + 1 FLOW + 1 AUTO + 1 VIDEO)

---

### PLATFORM 8: GOOGLE WORKSPACE

**Platform Data:**
| Attribute | Value |
|---|---|
| Users | 400M+ (6M+ paying organizations) |
| Apps | 5,000+ |
| SDK | Google Apps Script (JS) or Workspace Add-ons (Node.js/Python). Card-based UI |
| Auth | Google OAuth 2.0. Scopes reviewed during submission |
| Review | 2-14 days (OAuth + UX/branding check) |
| Our edge | 400M+ users. Business auth = low-friction account creation |

**Utility Plugins:**

| ID | Name | What | Effort | Traffic Score | Traffic Mechanism | Adaptations |
|---|---|---|---|---|---|---|
| G1 | **Dynamic Form Builder for Sheets** | Build form visually → responses write back. AI suggests fields | 2 wk | ⭐⭐⭐ | Freemium (3 free) + custom styling on site | → W10* 🟡 2wk, → MON5* 🟡 1.5wk |
| G2 | **AI Meeting Summary for Docs** | Paste transcript → structured summary with decisions/actions/owners | 1 wk | ⭐⭐⭐ | Freemium (3/week) + templates on site | → M3 🟢 3d, → MON2 🟢 3d |
| G3 | **AI Slide Deck Generator** | Describe topic → complete Google Slides deck | 2 wk | ⭐⭐ | Freemium (1 free) + themes on site | — |

**FLOW Plugin:**

| ID | Name | What | Effort | Traffic Mechanism |
|---|---|---|---|---|
| G-FLOW | **Slides Diagram → System** | Draw system diagram in Google Slides/Drawings → XIIGen reads shapes → generates system | 3 wk | Account + generated system on xiigen.com |

**AUTO Plugin:**

| ID | Name | What | Effort | Traffic Mechanism |
|---|---|---|---|---|
| G-AUTO | **Describe → Apps Script** | "When form submitted, create event, send email, add to Sheets" → complete Apps Script | 1.5 wk | Account + code on xiigen.com |

**VIDEO Plugin:**

| ID | Name | What | Effort | Traffic Mechanism |
|---|---|---|---|---|
| G-VIDEO | **Doc/Slides → Video Presentation** | Turn Doc or Slides into narrated video with voiceover | 2 wk | Account + video on xiigen.com |

**Total Google WS plugins: 6** (3 utility + 1 FLOW + 1 AUTO + 1 VIDEO)

---

### PLATFORM 9: FRAMER

**Platform Data:**
| Attribute | Value |
|---|---|
| Users | <1M (growing — "new Webflow" for landing pages) |
| Apps | ~100 |
| SDK | Framer Plugin API — TypeScript/React |
| Auth | Framer user context. External OAuth for xiigen.com |
| Review | ~7 days initial + ~14 days design review |
| Revenue | **100% earnings to creator** (no platform cut) |
| Our edge | Small but engaged design audience. Active promotion of new plugins |

**Utility Plugins:**

| ID | Name | What | Effort | Traffic Score | Traffic Mechanism | Adaptations |
|---|---|---|---|---|---|---|
| FR1 | **AI Component Library Gen** | Describe component → AI generates with variants + responsive | 2 wk | ⭐⭐⭐ | Freemium (5 free) + library on site | → F4 🟡 1.5wk |
| FR2 | **Framer-to-Code Exporter** | Export Framer design as clean React/Next.js code | 2 wk | ⭐⭐⭐ | Freemium (1 page free) + full export on site | Adapted FROM F1 |

**FLOW/AUTO/VIDEO:** Not applicable (too small, wrong audience)

**Total Framer plugins: 2** (2 utility)

---

### PLATFORM 10: ATLASSIAN / JIRA

**Platform Data:**
| Attribute | Value |
|---|---|
| Users | 300,000+ companies |
| Apps | 6,000+ |
| SDK | Atlassian Forge (Node.js runtime) or Connect (external hosting). Forge UI Kit (React-like) or Custom UI (full React) |
| Auth | Atlassian OAuth 2.0 + Forge auth context |
| Review | 5-10 business days |
| Revenue | **0% revenue share for Forge apps up to $1M lifetime** (Jan 2026) |
| Our edge | B2B = high LTV. Diagramming is proven #1 category (draw.io = #1 app in entire marketplace) |

**Utility Plugins:**

| ID | Name | What | Effort | Traffic Score | Traffic Mechanism | Adaptations |
|---|---|---|---|---|---|---|
| A1 | **AI Ticket-to-Diagram** | Select tickets → AI generates flow showing dependencies/blockers/critical path | 3 wk | ⭐⭐⭐⭐ | Account + Dashboard on xiigen.com | → LN1* (Linear) 🟡 1.5wk |
| A2 | **AI Release Notes Generator** | Select Jira version → AI generates formatted release notes | 2 wk | ⭐⭐⭐ | Freemium (1/month) + templates on site | — |
| A3 | **AI Confluence Doc Generator** | Describe feature → AI generates Confluence page with architecture diagram + API docs | 3 wk | ⭐⭐ | Freemium (1/week) + templates on site | — |

**FLOW Plugin:**

| ID | Name | What | Effort | Traffic Mechanism |
|---|---|---|---|---|
| A-FLOW | **draw.io Diagram → System** | Draw architecture in draw.io (inside Confluence) → XIIGen reads draw.io XML → generates system | 4 wk | Account mandatory + generated system on xiigen.com + team sharing |

> draw.io XML (mxGraph format) is well-structured with explicit node/edge types. Parser complexity: 🟢 Easier than Miro/FigJam.

**AUTO Plugin:**

| ID | Name | What | Effort | Traffic Mechanism |
|---|---|---|---|---|
| A-AUTO | **Jira Workflow → Real Automation** | Define Jira workflow states → XIIGen generates automation: "When ticket moves to QA, run tests, notify channel, schedule review" | 2.5 wk | Account + automation on xiigen.com |

**VIDEO Plugin:** Not applicable

**Total Atlassian plugins: 5** (3 utility + 1 FLOW + 1 AUTO)

---

### PLATFORM 11: CHROME WEB STORE

**Platform Data:**
| Attribute | Value |
|---|---|
| Users | 3.45B Chrome users (67.72% browser market) |
| Extensions | 137,000+ |
| SDK | Chrome Extensions API (Manifest V3) — JS/TS |
| Auth | chrome.identity for OAuth. Or custom flow |
| Review | Hours to 1-3 weeks. One-time $5 fee |
| Our edge | Widest reach. Universal entry point for ALL plugin families |

> Chrome is the UNIVERSAL adapter. It works with ANY platform, even those without plugin marketplaces.

**Utility Plugins:**

| ID | Name | What | Effort | Traffic Score | Traffic Mechanism | Adaptations |
|---|---|---|---|---|---|---|
| CH1 | **AI Page Analyzer** | Right-click any page → AI analyzes SEO, accessibility, UX. Report on xiigen.com | 2 wk | ⭐⭐⭐ | Report ONLY on xiigen.com | Universal version of W3/WF2/S8* |
| CH2 | **AI Web Clipper + Summarizer** | Select text/page → AI summarizes → save to xiigen.com workspace | 1.5 wk | ⭐⭐ | Saves go to xiigen.com dashboard | — |

**FLOW Plugin:**

| ID | Name | What | Effort | Traffic Mechanism |
|---|---|---|---|---|
| CH-FLOW | **Screenshot → System** | Screenshot of ANY architecture diagram → AI vision parses → generates system on xiigen.com | 3 wk | Report/code ONLY on xiigen.com |

> Platform-agnostic. Works with Miro, draw.io standalone, Lucidchart, Excalidraw, even paper sketches photographed. Hardest parser (AI vision) but widest reach.

**AUTO Plugin:**

| ID | Name | What | Effort | Traffic Mechanism |
|---|---|---|---|---|
| CH-AUTO | **Right-Click → Automate** | Browsing any website → right-click → "Automate this" → XIIGen generates workflow on xiigen.com | 2 wk | Generated workflow ONLY on xiigen.com. Every use = site visit |

> User is on Shopify admin, Gmail, Slack, CRM → right-click → "When new order, notify Slack + update inventory" → complete workflow.

**VIDEO Plugin:**

| ID | Name | What | Effort | Traffic Mechanism |
|---|---|---|---|---|
| CH-VIDEO | **Any Page → Video** | Browsing any blog/article → right-click → "Generate Video Summary" → video on xiigen.com | 1.5 wk | Video ONLY on xiigen.com |

> Universal. Works with ANY content platform including Ghost, Substack, Medium — bypasses their closed ecosystems.

**Total Chrome plugins: 5** (2 utility + 1 FLOW + 1 AUTO + 1 VIDEO)

---

### PLATFORM 12: n8n

**Platform Data:**
| Attribute | Value |
|---|---|
| Users | 230K+ (ARR growth 5x/yr, $2.5B valuation) |
| Nodes | ~2,000 community nodes on npm. 8M total downloads |
| SDK | Node.js npm package. Must start with `n8n-nodes-` prefix |
| Auth | API key credential type stored in n8n. API key = forced account on xiigen.com |
| Review | None — publish to npm, appears in n8n search |
| Our edge | Technical audience. July 2025: cloud users opened to community nodes |

**Utility Plugins:**

| ID | Name | What | Effort | Traffic Score | Traffic Mechanism | Adaptations |
|---|---|---|---|---|---|---|
| N1 | **XIIGen AI Code Gen Node** | n8n node for code gen, data transform, AI prompts in workflows | 1 wk | ⭐⭐⭐ | API key = account. 100 calls/day free | → ZP1* (Zapier) 🟡 1.5wk, → PD1* (Pipedream) 🟢 3d |
| N2 | **ElasticSearch Dynamic Query** | Visual query builder for ES inside n8n | 1 wk | ⭐⭐ | API key for advanced features | — |

**FLOW Plugin:**

| ID | Name | What | Effort | Traffic Mechanism |
|---|---|---|---|---|
| N-FLOW | **Workflow → Production Code** | Build n8n workflow → XIIGen interprets as architecture → generates REAL microservices replacing the n8n workflow | 2 wk | API key = account. Generated code on xiigen.com |

> "Graduate from n8n prototype to production microservices." n8n workflow JSON is well-structured = 🟢 Easiest parser.

**AUTO Plugin:**

| ID | Name | What | Effort | Traffic Mechanism |
|---|---|---|---|---|
| N-AUTO | **Describe → Production n8n Workflow** | Describe automation → XIIGen generates production-grade n8n workflow with error handling, retry, DLQ, monitoring, tests | 1.5 wk | API key + Template library on xiigen.com |

> n8n's native AI builder is credit-limited (20-150/month), cloud-only, generates basic flows. XIIGen generates PRODUCTION-GRADE.

**VIDEO Plugin:** Not applicable

**Total n8n plugins: 4** (2 utility + 1 FLOW + 1 AUTO)

---

### PLATFORM 13: STRIPE (NEW)

**Platform Data:**
| Attribute | Value |
|---|---|
| Users | 2M+ websites |
| Apps | 250 (marketplace founded 2022 — very young) |
| SDK | Stripe Apps SDK — React + TypeScript. Stripe UI toolkit |
| Auth | Stripe OAuth. Every app connects to merchant's Stripe account |
| Review | Stripe app review |
| Our edge | 2M / 250 = 8,000:1 user-to-app ratio. Dashboard-visible on every payment |

**Utility Plugins:**

| ID | Name | What | Effort | Traffic Score | Traffic Mechanism | Adaptations |
|---|---|---|---|---|---|---|
| ST1 | **AI Payment Analytics Dashboard** | Connect Stripe → AI generates revenue trends, churn prediction, cohort analysis | 2-3 wk | ⭐⭐⭐⭐ | Account MANDATORY. Dashboard on xiigen.com | → S3 variant 🟡 2wk, → BC4* 🟡 2wk, → PP1* 🟡 2wk |
| ST2 | **AI Dunning Flow Designer** | AI analyzes failed payments → optimal retry schedule + customer communication | 2 wk | ⭐⭐⭐ | Account + custom flows on xiigen.com | Stripe-specific |

**FLOW/AUTO/VIDEO:** Not applicable (payment-specific niche)

**Total Stripe plugins: 2** (2 utility)

---

### PLATFORM 14: SALESFORCE (Phase 5+)

**Platform Data:**
| Attribute | Value |
|---|---|
| Users | 150,000+ companies |
| Apps | 6,500+ |
| SDK | Lightning Web Components (LWC) — JavaScript. Apex (server-side) |
| Auth | Salesforce OAuth 2.0 + Connected App |
| Review | 🔴 Heavy — AppExchange security review (weeks to months) |
| Our edge | 150K enterprise companies. Mandatory external auth. Highest B2B LTV |

**Utility Plugins:**

| ID | Name | What | Effort | Traffic Score | Traffic Mechanism | Adaptations |
|---|---|---|---|---|---|---|
| SF1 | **AI Flow Generator** | Describe business process → AI generates Salesforce Flow. Preview/edit on xiigen.com | 4+ wk | ⭐⭐⭐⭐ | Account + flow editor on xiigen.com | → N3* 🟡 1.5wk, → MON4* 🟡 2wk, → HS2* 🟡 2wk |
| SF2 | **AI Report Narrator** | Select SF report → AI generates executive narrative with insights + action items | 3 wk | ⭐⭐⭐ | Freemium (1/week) + report library on site | See MON2 pattern |

**FLOW/AUTO/VIDEO:** Not applicable (SF already has native Flow Builder)

**Total Salesforce plugins: 2** (2 utility)

---

## 5. ADAPTATION NETWORK — 10 Core Concepts → 80+ Plugins

Build ~10 core engines, get 50+ marketplace listings via light adaptations.

| Core Concept | Original | Adapts To | Total |
|---|---|---|---|
| **Design-to-Code** | F1 (Figma) | Framer, Canva, Webflow, Wix | 5+ |
| **Multilingual Translator** | F2 (Figma) | Canva, Framer, Miro, Webflow, Wix | 6+ |
| **AI Diagram from Text** | M1 (Miro) | monday.com, Atlassian, Figma, Google Slides, Chrome | 6+ |
| **Ticket-to-Diagram** | A1 (Atlassian) | monday.com, Miro, Linear, GitHub | 5+ |
| **AI Content Populator** | WF1 (Webflow) | Wix, Shopify, WordPress, Ghost | 5+ |
| **Product Description Gen** | S1 (Shopify) | Wix, BigCommerce, WooCommerce, Webflow | 5+ |
| **Alt-Text Generator** | W2 (Wix) | Shopify, Webflow, WordPress, Chrome, BigCommerce | 6+ |
| **Meeting Summary** | G2 (Google) | Miro, monday.com, Confluence, Slack, Zoom | 6+ |
| **Payment Analytics** | ST1 (Stripe) | Shopify, BigCommerce, PayPal | 4+ |
| **Status Report Gen** | MON2 (monday) | Atlassian, Miro, Google Sheets, Salesforce | 5+ |

**Adaptation effort key:**
- 🟢 Light (1-3 days) = Same logic, just swap SDK calls + UI kit
- 🟡 Medium (1-2 weeks) = Core logic reused, platform API differs significantly
- 🔴 Heavy (2+ weeks) = Concept transfers but implementation substantially different

---

## 6. BUILD ORDER — All 4 Families Unified

### Shared Infrastructure (Weeks 0-3) — CRITICAL PATH
XIIGen Plugin Backend + SDK + Auth + AI Gateway + Dashboard + Template Library

### Wave 1: Foundation + Quick Wins (Weeks 1-6)

| # | ID | Plugin | Platform | Family | Effort | Immediate Adaptations |
|---|---|---|---|---|---|---|
| 1 | F1 | Full Site Generator | Figma | Utility | 1 wk | → FR2 🟡, → WF3 🟡 |
| 2 | F2 | Multilingual Translator | Figma | Utility | 1 wk | → C5 🟢 3d, → FR3* 🟢 3d |
| 3 | N1 | XIIGen AI Node | n8n | Utility | 1 wk | → ZP1* 🟡, → PD1* 🟢 |
| 4 | C3 | QR Code Designer | Canva | Utility | 1 wk | → F8* 🟢 2d, → M7* 🟢 2d |

### Wave 2: Scale (Weeks 4-10)

| # | ID | Plugin | Platform | Family | Effort | Immediate Adaptations |
|---|---|---|---|---|---|---|
| 5 | C1 | Infographic Table | Canva | Utility | 2 wk | → M6* 🟡, → F6* 🟡 |
| 6 | M1 | Architecture Visualizer | Miro | Utility | 2 wk | → MON1 🟡, → F9* 🟡 |
| 7 | W1 | Page Section Builder | Wix | Utility | 2-3 wk | → WF1 🟡, → FR1 🟡 |
| 8 | WF1 | CMS Content Populator | Webflow | Utility | 2 wk | → W variant 🟡 |
| 9 | MON1 | Board Visualizer | monday.com | Utility | 2 wk | Adapted FROM M1 |

### Wave 3: High-ARPU + FLOW/AUTO Core (Weeks 8-16)

| # | ID | Plugin | Platform | Family | Effort |
|---|---|---|---|---|---|
| 10 | S1 | Product Description Gen | Shopify | Utility | 3-4 wk |
| 11 | M2 | Jira Flow Sync | Miro | Utility | 3 wk |
| 12 | A1 | Ticket-to-Diagram | Atlassian | Utility | 3 wk |
| 13 | ST1 | Payment Analytics | Stripe | Utility | 2-3 wk |
| 14 | G1 | Dynamic Form Builder | Google WS | Utility | 2 wk |
| 15 | — | **FLOW Core Engine** | — | FLOW | 2-3 wk |
| 16 | N-FLOW | Workflow → Production | n8n | FLOW | 1 wk (after core) |
| 17 | — | **AUTO Core Engine** | — | AUTO | 2 wk |

### Wave 4: Long Tail + FLOW/AUTO Expansion (Weeks 12-20)

| # | ID | Plugin | Platform | Family | Effort |
|---|---|---|---|---|---|
| 18 | F3 | Design System Auditor | Figma | Utility | 2 wk |
| 19 | C2 | Background Scene Gen | Canva | Utility | 2 wk |
| 20 | CH1 | AI Page Analyzer | Chrome | Utility | 2 wk |
| 21 | FR1 | Component Library Gen | Framer | Utility | 2 wk |
| 22 | G2 | Meeting Summary | Google WS | Utility | 1 wk |
| 23 | W2 | Alt-Text Generator | Wix | Utility | 1 wk |
| 24 | F-FLOW | FigJam → System | Figma | FLOW | 2-3 wk |
| 25 | M-FLOW | Board → System | Miro | FLOW | 2-3 wk |
| 26 | N-AUTO | Describe → n8n Workflow | n8n | AUTO | 1.5 wk |
| 27 | CH-AUTO | Right-Click → Automate | Chrome | AUTO | 2 wk |

### Wave 5: Adaptation Blitz + VIDEO (Weeks 16-24)

| # | ID | Plugin | Platform | Family | Effort |
|---|---|---|---|---|---|
| 28 | — | **VIDEO Core Engine** | — | VIDEO | 2-3 wk |
| 29 | C-VIDEO | Design → Video | Canva | VIDEO | 1.5 wk (after core) |
| 30 | W-VIDEO | Blog → Video | Wix | VIDEO | 1.5 wk (after core) |
| 31 | CH-VIDEO | Any Page → Video | Chrome | VIDEO | 1 wk (after core) |
| 32-41 | Various | 10 light adaptations | Various | Utility | ~6 wk total |

### Wave 6: Enterprise + Remaining (Weeks 20+)

| # | ID | Plugin | Platform | Family | Effort |
|---|---|---|---|---|---|
| 42 | SF1 | AI Flow Generator | Salesforce | Utility | 4+ wk |
| 43 | A-FLOW | draw.io → System | Atlassian | FLOW | 3-4 wk |
| 44 | MON-FLOW | Board → System | monday.com | FLOW | 3 wk |
| 45 | M-AUTO | Drawn Workflow → Auto | Miro | AUTO | 3 wk |
| 46 | S-VIDEO | Product → Video Ad | Shopify | VIDEO | 4 wk |
| 47+ | Remaining | 10+ medium adaptations | Various | All | 10-15 wk |

### Effort Summary

| Phase | What | Plugins | Weeks | Cumulative |
|---|---|---|---|---|
| Foundation | Backend + SDK | 0 | 2-3 | 0 |
| Wave 1 | 4 originals | 4 | 4 | 4 |
| Wave 2 | 5 originals | 5 | 6 | 9 |
| Wave 3 | 5 utility + FLOW/AUTO cores + N-FLOW | 8 | 8 | 17 |
| Wave 4 | 6 utility + 4 FLOW/AUTO | 10 | 10 | 27 |
| Wave 5 | VIDEO core + 3 VIDEO + 10 adaptations | 14 | 8 | 41 |
| Wave 6 | Enterprise + remaining | 6+ | 10+ | **47+** |

**20 original utility plugins: ~26-29 weeks**
**30 plugins (with adaptations): ~32-35 weeks**
**40+ plugins (all families): ~42-48 weeks**
**Parallelizing across 2-3 developers: -50-60% calendar time**

---

## 7. PRODUCT ARCHITECTURE — 4 Plugin Families

### Family 1: Utility Plugins (41 originals)

Individual AI-powered tools. Each solves a specific problem within a platform. Shared AI Gateway backend.

### Family 2: FLOW — "XIIGen Flow" (8 plugins)

**What:** Diagram → Full Working System. User draws architecture → XIIGen generates complete codebase.

**Core Engine (shared by all FLOW plugins):**
| Component | What |
|---|---|
| Diagram Parser | Converts platform-specific shapes/connections into XIIGen flow definition JSON |
| Flow Validator | Checks parsed flow against XIIGen DNA patterns |
| AF Pipeline Runner | AF-1→AF-11: Genesis → Planning → RAG → Multi-model → Review → Judge → Merge |
| Code Generator | Python 3.12 + FastAPI services, React Native frontends, DB schemas, queue configs |
| Output Packager | Bundles code + docs + tests + deployment manifests |

**Per-Platform Parser (only part that changes):**
| Platform | Input Format | Parser Complexity |
|---|---|---|
| n8n | Workflow JSON | 🟢 Easiest — already structured |
| Confluence/draw.io | draw.io XML (mxGraph) | 🟢 Well-structured explicit types |
| FigJam | Figma nodes + connectors | 🟡 Medium |
| Miro | Shapes + connectors (SDK) | 🟡 Medium — freeform heuristics |
| monday.com | Board structure (groups, items) | 🟡 Medium — interpret semantics |
| Google Slides | Shapes + connectors (API) | 🟡 Medium — generic shapes |
| Webflow | Site map / page flow | 🟡 Medium — custom definition |
| Chrome (screenshot) | Image → AI vision | 🔴 Hardest — visual AI |

**Competitive moat:** 35+ flows, 400+ skills, 9 DNA patterns, 6 fabric layers, 11 AF stations. Nobody else generates COMPLETE fabric-first systems.

### Family 3: AUTO — "XIIGen Automate" (9 plugins)

**What:** Describe automation in text → AI generates complete workflow for any platform.

**3-tier product:**

| Tier | Product | Traffic Driver |
|---|---|---|
| **Template Library** | Hundreds of pre-built templates on xiigen.com (n8n, Zapier, Make) | 🔴 HIGHEST — SEO-driven long-tail keywords |
| **AI Workflow Generator** | Text → complete workflow JSON/code | 🟡 HIGH — generated on xiigen.com |
| **Workflow Upgrade** | Import existing workflow → production version with error handling, retry, DLQ, monitoring, tests | 🟡 HIGH — import/upgrade on site |

**Competitive advantage vs n8n/Zapier/Make native AI builders:**
| Their Builder | XIIGen Automate |
|---|---|
| Generates for ONE platform | Generates for ALL platforms + production code |
| Basic workflow (happy path) | Production-grade (error handling, retry, DLQ, monitoring, tests) |
| Text input only | Text + visual diagram input (Miro/FigJam parsers) |
| Inside walled garden | Open — output to any platform or raw code |
| No template marketplace | Searchable template library = SEO engine |
| Credit-limited (20-150/month) | Freemium with generous free tier |

### Family 4: VIDEO — "XIIGen Video" (7 plugins)

**What:** Content → Branded Video with AI-generated script, visuals, voiceover.

**Core Engine Components:**
| Component | What | Build From |
|---|---|---|
| Content Parser | Extracts text, images, structure | AI Engine + dynamic-documents |
| Script Generator | Content → video script with scenes, timing | AI Engine + prompt builder |
| Visual Generator | Creates scene visuals (AI-generated or stock) | AI Engine (image prompts) |
| Voiceover Engine | TTS with 50+ voices, 30+ languages | ElevenLabs/PlayHT via fabric |
| Brand Kit Manager | Logo, colors, fonts, intro/outro on xiigen.com | Dashboard + auth-jwt |
| Video Assembler | Combines visuals + voiceover + music → final video | FFmpeg or cloud video API |
| Output Optimizer | Formats for YouTube (16:9), Instagram (9:16), TikTok | Config-driven |

**Competitive gap:** Every existing tool (Pictory, InVideo, Synthesia, DeepReel, Fliki) is a standalone website. NONE are embedded in content platforms. XIIGen generates video FROM INSIDE the platform — one click, no context switching.

---

## 8. COMPETITIVE LANDSCAPES

### Automation Space (AUTO family competitors)

| Tool | What | Launched | Limitation |
|---|---|---|---|
| n8n AI Workflow Builder | Text → n8n workflow (native) | Oct 2025 | Cloud-only, 20-150 credits/month, n8n only |
| Zapier Copilot | Text → Zap | Sep 2025 | Zapier Zaps only |
| Make.com Maia | Text → Make scenario | Jan 2026 | Make scenarios only |
| n8n-mcp.com | AI agent builds n8n workflows via MCP | 2025 | n8n-specific, third-party |
| **XIIGen Automate** | Text/visual → ANY platform + production code | Planned | **Cross-platform, production-grade, template library** |

### Video Space (VIDEO family competitors)

| Tool | Type | Price | Our Advantage |
|---|---|---|---|
| Pictory | Standalone SaaS | $23/mo+ | Not embedded in any CMS |
| InVideo AI | Standalone website | Freemium | Not embedded |
| Synthesia | Standalone, enterprise | Premium | Expensive, not embedded |
| DeepReel | Standalone | Mid-range | Not embedded |
| Fliki | Standalone | Freemium | Not embedded |
| **XIIGen Video** | Embedded in 6+ platforms | Freemium | **Only embedded option. One-click inside Canva/Wix/Shopify** |

### Diagramming/System-Generation Space (FLOW family)

| Direction | Examples | Status |
|---|---|---|
| Text → Diagram | Eraser DiagramGPT, Mermaid AI, Cloudairy | Crowded |
| Code → Diagram | SMART TS XL, CodeToFlow, FlowCraft | Well-served |
| Diagram → Code snippets | Visual Paradigm, Qlerify | Generates STUBS, not systems |
| **Diagram → Full Working System** | **NOBODY** | **← XIIGen goes here** |

---

## 9. RESEARCH FOUNDATION

### Verified Indie Plugin Examples (27+ with public data)

#### Obsidian — Gold Standard for Data
| Plugin | Author | Launched | Downloads | Monthly Rate | Keywords |
|---|---|---|---|---|---|
| Datacore | casthack | ~Sep 2025 | 237,915+ | ~38-79K/mo | database, query |
| Notebook Navigator | Johan Sanneblad | mid-Sep 2025 | 206,866-374,546 | ~61-69K/mo | navigation, dual pane |
| TaskNotes | Victor Tao | ~Oct/Nov 2025 | 40,137-117,477 | ~8.5-40K/mo | tasks, kanban |
| Pretty Properties | Marie Chanteur | ~late 2025 | 54,162-100,341 | ~15-33K/mo | frontmatter, metadata |
| Manual Sorting | Jiesheng Chen | ~late 2025 | 39,082-41,524 | ~12-14K/mo | sorting |
| TimeStamper | unknown | ~Nov 2025 | 39,575 | ~20K/mo | timestamp, journal |

*Download ranges reflect different snapshot dates across source documents.*

#### Other Platforms
| Platform | Plugin | Author | Installs | Rate |
|---|---|---|---|---|
| Raycast | Video Downloader | Victor Navarro | ~96,000 | ~4K/mo |
| Raycast | Clean Keyboard | ike | 46,310 | ~2.1K/mo |
| Google WS | Sync2Sheets | Leandro Zubrezki | 181,000+ | ~5K first 2wk. $9K MRR |
| n8n | n8n-nodes-elevenlabs | n8ninja | 555,887/mo npm | directional |
| JetBrains | Plug in Explorer | Sandip Chitale | 5,783 | ~500/mo |
| VS Code | Cline | indie | 5M+ | ~400K/mo |
| Canva | Patterned.AI | indie | doubled in 2 months | organic |
| Canva | DeepReel | indie | 10x registrations month 1 | organic |
| Canva | Krikey | indie | 23x traffic spike launch day | organic |

### 3 Developer Archetypes (from Gemini research)

**"Bridge Builder"** (Leandro / Sync2Sheets) — Bridges two platforms that don't natively connect. Plugin IS the lead magnet.

**"Micro-Utility Master"** (ike / Clean Keyboard) — Wraps existing tool in platform-native UX. One evening → eternal traffic.

**"Open Source Apostle"** (Nevo David / Postiz) — OSS tool → GitHub Awesome lists → community viral loop. $6.5K → $12.6K MRR in one month.

### ASO Ranking Factors 2026

1. **AI Integration** — Platforms boost AI plugins artificially
2. **Update recency** — Last commit within 30 days = 15-20% more search impressions
3. **Localization** — 300% install growth in LATAM/APAC with translations
4. **Keyword-first titles** — [Action]+[Object], [Object]+[Role], [Platform A] to [Platform B]

### Title Keyword Patterns for High Pull

| Pattern | Example | Why Works |
|---|---|---|
| [Object] + [Role] | Notebook Navigator | Maps to search queries |
| [Concept] + [UI attribute] | Pretty Properties | Uses platform-specific terms |
| [Action] + [Noun] | Manual Sorting | Direct intent match |
| [Compound workflow noun] | TaskNotes | Combines two search terms |
| [Platform A] to [Platform B] | Sync2Sheets | Exact user query |

### Organic Potential Formula

```
Potential = (Platform MAU / # plugins in category)
            × search activity coefficient (0.1-1.0)
            × platform growth factor
            × visibility mechanics factor (0-1)
```

### Traffic Math Framework

```
Real traffic = Platform installs × Visibility × Click-through × Account creation rate

Shopify (500 installs × 100% × 100% × 100%)  = 500 accounts  ← BEST
Figma   (5K installs × 100% × 15% × 50%)     = 375 accounts
Obsidian (50K installs × 100% × 0.5% × 50%)  = 125 accounts  ← WORST for site traffic
```

### Economics of Indie Micro-SaaS (2025)

| Metric | Average | Niche Leaders |
|---|---|---|
| MVP dev time | 2-4 weeks | 3 days (NoteForms) |
| CAC | ~$0 (organic) | $0 |
| MRR | $1K-$15K | $220K (Formula Bot) |
| Gross margin | ~76% | 90%+ (Sync2Sheets) |
| Valuation | 30-45x monthly profit | 8-figure exits |

### Risk Analysis

| Risk | Mitigation |
|---|---|
| Supply chain attacks (n8n malicious packages Jan 2026) | Sandbox, minimize permissions, OSS code on GitHub |
| "Algorithmic Wall" (WordPress/Shopify oversaturated) | Start with "quiet harbors" (Miro, Canva, Framer) |
| Opaque metrics (Canva, Google WS, Atlassian, JetBrains) | Use proxy signals + developer dashboard data |
| MCP as new channel | Opportunity: single MCP server → available to Claude Code, Cursor, Copilot |

### XIIGen Codebase → Plugin Capabilities

| Existing Capability | Plugin Enablement |
|---|---|
| Figma-to-Code pipeline (complete) | Any design-to-X plugin on any platform |
| Dynamic documents (ES + schema-free) | JSON/data visualization anywhere |
| Dynamic forms (React, WP, YAML) | Form builders on any platform |
| AI Engine Fabric (Claude, OpenAI, Gemini, DeepSeek) | AI features in ANY plugin |
| i18n/multilingual (RTL support) | Localization features (huge on Canva/Wix) |
| Auth/JWT (multi-tenant) | Account-gated freemium everywhere |
| React components | Direct use in Canva/Miro/Shopify/Stripe/Framer SDKs |
| genie-dynamic-server (REST API) | Backend for any plugin needing external processing |
| Flow engine (DAG orchestration) | Workflow/automation plugins |
| RAG + prompt builder | AI search/generation features |

---

## 10. RESEARCH PROMPT TEMPLATES

### Prompt 1 — Master Discovery (All Platforms)
```
I'm researching solo indie developers or micro-teams (1-3 people, no VC funding)
who published plugins/apps to [PLATFORMS] in 2024-2026 and gained organic installs
WITHOUT paid marketing.

For EACH example: exact name, author, platform, launch date, installs,
monthly growth rate, problem solved, title keywords, revenue model, source.
```

### Prompt 2 — Single Platform Deep Dive
```
Find real indie developer examples on [PLATFORM] in 2024-2025.
What they built, keywords, install count + timeframe, public story, listing URL.
Also: TOP 5 most searched keywords on [PLATFORM] in [CATEGORY].
```

### Prompt 3 — Find NEW Platforms
```
Good criteria: open submission, public counters, keyword search,
"New/Recent" category, active searchers, review <3 weeks, growing platform.
Find 10 platforms meeting 4+ criteria with 100K+ users.
```

### Prompt 4 — Keyword Analysis
```
Analyze TOP 20 most-installed plugins on [PLATFORM] published 2024-2025.
Title structure, first 3 description words, category, installs vs age,
whether title contains: AI, automation, export, sync, convert, generate.
```

### Prompt 5 — Verify Specific Example
```
Verify [PLUGIN] on [PLATFORM] by [AUTHOR]:
Is it real/active? Install numbers? Public story? Keywords? Case studies?
Was growth truly organic or externally promoted?
```

---

## 11. GRAND TOTAL SUMMARY

| Category | Count |
|---|---|
| Platforms evaluated | 34 |
| Platforms with confirmed plans | 14 |
| Utility plugins (originals) | 41 |
| FLOW plugins (diagram→system) | 8 |
| AUTO plugins (AI workflow gen) | 9 |
| VIDEO plugins (content→video) | 7 |
| **Total unique concepts** | **65** |
| With cross-platform adaptations | **80+** |
| Core engines needed | ~15 |
| Shared infrastructure | 2-3 weeks |
| Total dev (20 originals) | ~26-29 weeks |
| Total dev (40+ with adaptations) | ~42-48 weeks |

### Per-Platform Plugin Count

| Platform | Utility | FLOW | AUTO | VIDEO | Total |
|---|---|---|---|---|---|
| Figma | 5 | 1 | 1 | — | **7** |
| Canva | 5 | — | — | 1 | **6** |
| Miro | 4 | 1 | 1 | — | **6** |
| Google WS | 3 | 1 | 1 | 1 | **6** |
| Shopify | 3 | — | 1 | 1 | **5** |
| Wix | 3 | — | 1 | 1 | **5** |
| Webflow | 3 | 1 | — | 1 | **5** |
| monday.com | 2 | 1 | 1 | 1 | **5** |
| Atlassian | 3 | 1 | 1 | — | **5** |
| Chrome | 2 | 1 | 1 | 1 | **5** |
| n8n | 2 | 1 | 1 | — | **4** |
| Stripe | 2 | — | — | — | **2** |
| Salesforce | 2 | — | — | — | **2** |
| Framer | 2 | — | — | — | **2** |
| **TOTAL** | **41** | **8** | **9** | **7** | **65** |

---

## 12. SOURCES

### Research Layer
- **ChatGPT Deep Research** (deep-research-report_chat_gpt.md) — Verified indie examples, verification methodology, organic confidence scoring
- **Gemini Deep Research** (gemini.md, Russian) — Developer archetypes, ASO factors, Canva/Obsidian/Zed deep dives, economics, MCP analysis
- **Multi-session brainstorm log** (brainstorm.txt) — Raw platform data, skill-library matching, prompt templates

### Data Sources
- ObsidianStats.com, Obsidian Forum, Raycast Store + GitHub, npm listings
- Canva Developers Blog, Business Wire (Innovation Fund)
- StoreLeads (Shopify), IndieHackers (Sync2Sheets, Postiz)
- JetBrains Platform Forum, Monday.com developer blog
- Reddit: r/ObsidianMD, r/microsaas, r/Entrepreneur, r/chrome_extensions
- DemandSage, TechLila, Highland Europe, The Hacker News

### Analysis Layer
- MARKETPLACE-ORGANIC-TRAFFIC-RESEARCH.md (consolidated reference)
- MARKETPLACE-RESEARCH-ADDENDUM-v2.md (missing ecosystems)
- XIIGEN-20-PLUGIN-TRAFFIC-STRATEGY.md (traffic strategy)
- MARKETPLACE-NEW-PLATFORM-DISCOVERIES.md (14 new platforms)
- XIIGEN-PER-PLATFORM-PLUGIN-PLANS-v2.md (41 utility plugins + adaptations)
- XIIGEN-FLOW-TO-SYSTEM-ANALYSIS.md (FLOW family)
- XIIGEN-AI-WORKFLOW-GENERATOR-ANALYSIS.md (AUTO family)
- XIIGEN-CONTENT-TO-VIDEO-ANALYSIS.md (VIDEO family)

---

*Master Document v1.0 | Consolidated: March 19, 2026*
*65 unique plugin concepts across 14 platforms in 4 families*
*80+ marketplace listings with cross-platform adaptations*
*All from ~15 core engines sharing one FastAPI backend*
*Previous research files remain available as detailed reference*
