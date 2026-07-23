<!--
  Source: business flows.zip / 23 - visual editor extended.md
  Canonical since: 2026-04-22
  Canonical flow: FLOW-23 form-builder-templates
  Related deep-research: docs/business-flows/_deep-research/form-builder-templates/ (if present)
  Related legacy engine artifacts: docs/business-flows/_legacy-engine-artifacts/form-builder-templates/ (if present)
-->

Visual design in a Wix/Webflow-style blog builder is basically a **UI editor + layout engine + theming system + data binding** (to CMS/blog content). Here’s what it usually includes, how it works, and the key blog-specific capabilities.

## 1) Canvas editor capabilities

### Layers & structure

* **Layer tree** (pages → sections → containers → elements)
* **Grouping / nesting** (frames/containers)
* **Lock/hide**, reorder, rename
* **Symbols / reusable sections** (header/footer, blog card, CTA strip)

**How it works:** everything on the canvas is a **node in a component tree** with properties (layout, style, data bindings). Pages and templates are just trees with different “data context.”

---

### Selection, snapping, guides

* Smart guides, snapping to edges/centers
* Rulers, guides, grids
* Distribute/align tools

**Under the hood:** editor calculates bounding boxes and alignment candidates; snapping applies tiny transforms to keep consistent spacing.

---

## 2) Layout system (the heart of visual design)

### Containers + layout modes

Modern builders lean on a few layout primitives:

* **Stack / Flex layout** (vertical/horizontal)
* **Grid layout** (columns/rows, gaps)
* **Absolute positioning** (for overlays/hero compositions)
* **Responsive containers** (max-width, fluid width, constraints)

Capabilities you typically get:

* Padding, margin, gap, alignment
* Min/max width/height
* Sticky elements
* Z-index layering
* Overflow rules (clip/scroll)

**Blog-specific:** post lists are almost always a **repeating grid/stack** with consistent card dimensions and responsive reflow.

---

### Breakpoints & responsive editing

* Define breakpoints (desktop/tablet/mobile or custom)
* Per-breakpoint overrides: font size, spacing, columns, visibility
* “Auto” resizing rules

**How it works:** the builder stores a **base style** + **override patches per breakpoint**. Rendering chooses the right patch at runtime.

---

## 3) Styling & design system features

### Typography system

* Font family, weights, sizes, line height, letter spacing
* Presets / text styles (H1/H2/body/caption)
* Rich text styling rules

**Blog-specific:** controlling:

* Post title style (H1 on post page, H2/H3 on list cards)
* Excerpt truncation (line clamp)
* Content body styles (paragraph spacing, lists, quotes)

---

### Color, effects, and visuals

* Color tokens / palettes
* Backgrounds: solid, gradient, image/video backgrounds
* Shadows, blur, borders, radius
* Hover/focus styles (interactive states)
* Light/dark themes (advanced)

---

### Theme tokens & global styles

* **Global tokens**: colors, spacing scale, radii, shadows
* **Component styles**: “Blog Card”, “Button Primary”
* **Consistency rules** (restrict arbitrary styling for team governance)

**Blog-specific:** once you define “Post Card” style, it applies everywhere (home feed, category page, related posts widget).

---

## 4) Components, variants, and states

### Component library

* Buttons, inputs, cards, nav bars, modals
* “Blog blocks”: Post List, Post Page, Categories, Tags, Author box, Related posts, Share buttons

### Variants & states (crucial for real UI)

* Variants: “Blog card – compact / featured / hero”
* States: default/hover/active/disabled/focus
* Conditional visibility: show/hide based on data (e.g., “show reading time only if exists”)

**How it works:** components are templates with **slots** and **props**. Variants are prop presets; states are style branches.

---

## 5) Dynamic data binding (what makes it a *blog system*)

This is where blog design differs from static pages.

### Data context + bindings

* “This page is a **Post Template**” → context = a single Post record
* “This section is a **Post List**” → context = query results (array)
* Bind element text/image/link to fields:

  * title, coverImage, author.name, publishDate, tags, excerpt
* Formatting options:

  * date formatting
  * fallback values
  * conditional rendering

### Repeaters / loops

* A “repeater” renders the same card layout for each post
* Sorting/pagination controls (latest, popular, by category/tag)

**Under the hood:** blocks compile to something like:

* query(PostCollection, filters/sort/page)
* render(CardTemplate, forEach item)

---

## 6) Template design for blog pages (common patterns)

### Post list page template

* Header section (title + filters)
* Grid of post cards
* Pagination (next/prev or infinite scroll)
* Sidebar (categories, search, subscribe)

Key controls:

* Columns per breakpoint
* Card height rules
* Excerpt length / clamp
* Show/hide metadata (author/date/reading time)

### Post page template

* Hero (cover image, title, meta)
* Content body style rules
* Inline blocks (gallery, embed, quote, code)
* “Next/previous post”
* Related posts (by tag/category)

---

## 7) Interactions & motion (often “lightweight but powerful”)

### Interactions

* Hover effects on cards/buttons
* Scroll animations (fade in, parallax)
* Sticky sidebar / sticky header
* Expand/collapse (FAQ, table of contents)

### Behavior triggers

* On click → open modal / navigate / submit form
* On scroll → reveal animations
* On form submit → show success state / trigger integration

**Blog-specific:** subscribe CTA, share popover, table of contents highlighting.

---

## 8) Collaboration & handoff features inside the design layer

* Comments on elements/sections
* Version history for pages/templates
* Content preview mode (see real posts in the designed template)
* Role-based editing: designers can lock styles; editors can only edit content fields

---

## 9) “Power-user” capabilities (advanced builders)

* Custom CSS per page/component
* Code export / developer mode (structured HTML/CSS/React-ish output)
* Accessibility checks (contrast, heading hierarchy, focus ring)
* Localization: RTL/LTR, per-locale typography, per-locale content layout tweaks

---

## 10) The key flows visual design must support (blog-focused)

### Flow A: Create a blog card once, reuse everywhere

1. Design a “Post Card” component
2. Bind fields (title, cover, excerpt, link)
3. Create variants (featured/compact)
4. Drop into home feed + category pages + related posts

### Flow B: Design template with real content safely

1. Switch page to “Post Template” mode
2. Preview with different posts (short/long titles, missing cover)
3. Add fallbacks & clamps
4. Adjust per breakpoint overrides

### Flow C: Give editors freedom without breaking layout

1. Lock spacing + typography tokens
2. Allow editing only: title/body/cover/tags
3. Prevent arbitrary font/color changes
4. Publish confidently

---

If you want, I can turn this into a **concrete module spec** for your own system (APIs + data models), including:

* `Node` tree schema (layout/style/bindings/overrides)
* Breakpoint override model (patch-based)
* Blog blocks: query + repeater rendering contract
* Permission model (designer vs content editor)
Based on the process described in the attached file, the **XIIGen platform** can be extended to support a high-fidelity visual design experience by integrating the Wix/Webflow-style logic into the existing **Layer 9 (Showroom)** architecture. This extension transforms **Skill 26 (Web Flow Editor)** from a logic-based flow tool into a dual-purpose **UI/UX Composition Engine**.

### 1. Architectural Mapping to XIIGen Skills

The visual editor capabilities map directly to the existing skill tree, requiring specific enhancements to handle UI-specific primitives:

* **Skill 26 (Web Flow Editor) → Composition Engine:** Enhanced to manage a **Node Tree Schema** (Pages → Sections → Containers → Elements) instead of just logic nodes.
* **Skill 10 (Figma Parser) → Structural Seed:** Updated to output the specific `Node` properties required by the new Layout System, such as Flex/Grid constraints and Padding/Margin tokens.
* **Skill 05 (Database Fabric) → Data Binding Source:** The editor links UI fields (Title, Cover, Excerpt) directly to Database Fabric objects or AI-transformed content from Skill 11.
* **Skill 17 (Code Generator) → Frontend Export:** Extended to support "Power-user" capabilities like structured React/Tailwind output and custom CSS injection.

### 2. New Specialized Task Types

To support this "Engine-First" process, the following **Task Types** should be added to the **Task Catalog**:

| Task Type | Purpose | Factory Dependency |
| --- | --- | --- |
| `UI_LAYOUT_COMPOSITION` | Orchestrates the component tree and resolves Flex/Grid constraints. | Skill 26 |
| `CMS_DATA_BINDING` | Maps dynamic content fields (from Skill 05) to UI component props. | Skill 05 + Skill 26 |
| `THEME_TOKEN_APPLY` | Synchronizes global design tokens (Typography, Colors) across the tree. | Skill 19 (Design System) |
| `UI_CODE_EXPORT` | Generates production-ready frontend code from the visual node tree. | Skill 17 |

### 3. Core Logic Extensions (Process Breakdown)

The extension focuses on three primary systems derived from the "Visual Editor Extended" logic:

#### A. The Layout Solver (Skill 26.L)

The editor must implement a sub-engine that calculates bounding boxes and alignment candidates in real-time. This supports:

* **Flex/Stack Layout:** Vertical and horizontal distribution with gap control.
* **Grid Layout:** Column/row management specifically for blog category pages.
* **Responsive Overrides:** Breakpoint-specific changes to typography and spacing.

#### B. The Data Binding Bridge (Skill 26.D)

This layer creates a "safe" preview environment by switching the page to a **Template Mode**.

* It fetches real content (e.g., blog posts) and binds fields like `post.title` to the `Post Card` component.
* It handles fallbacks and clamps for short/long content titles to prevent layout breaks.

#### C. Role-Based Constraint System (Skill 21 Integration)

Utilizing the **Permissions Service (Skill 21)**, the editor allows designers to lock specific style properties (like typography tokens) so that content editors can only modify text or image fields without breaking the design hierarchy.

### 4. Proposed "Node Tree" Schema

To implement this, the platform's flow engine should be updated to handle a new node structure:

```json
{
  "nodeId": "card_post_001",
  "type": "CONTAINER",
  "layoutMode": "FLEX_VERTICAL",
  "style": { "padding": "20px", "gap": "12px", "borderRadius": "8px" },
  "bindings": {
    "title": "$.skill_05.latest_post.title",
    "coverImage": "$.skill_11.processed_media.url"
  },
  "constraints": { "lockLayout": true, "allowContentEdit": true }
}

```

This extension moves the platform toward a **"What You Generate Is What You Edit"** workflow, where the AI initially builds the architecture and the Visual Editor allows for manual, safe refinement before final deployment.

Based on the process described in **23 - visual editor extended.md**, extending the platform's capabilities involves upgrading the **Web Flow Editor (Skill 26)** to function as a professional-grade layout engine with integrated data binding and role-based constraints.

### 1. Enhanced Canvas Editor (Skill 26 Upgrade)

The core editor will be extended to support a node-based component tree structure (Pages → Sections → Containers → Elements). Key upgrades include:

* **Layout Engine Primitives:** Implementation of Flex (Stack) and Grid layout modes, supporting responsive constraints, padding, gaps, and absolute positioning for hero compositions.
* **Symbol System:** Creation of reusable sections such as headers, footers, and blog cards that maintain consistent styling across the platform.
* **Selection & Snapping:** Integration of smart guides and alignment tools to ensure design consistency during the visual editing process.

### 2. The Data Binding Bridge

This layer connects the visual UI to the platform's backend services, specifically utilizing **Database Fabric (Skill 05)** and **AI Transform (Skill 11)**:

* **Template Mode:** A new state for the editor that allows designers to fetch real CMS content (e.g., blog posts) and bind fields directly to UI components.
* **Dynamic Bindings:** Mapping UI elements to specific data paths, such as `$.skill_05.latest_post.title` for text or `$.skill_11.processed_media.url` for optimized images.
* **Content Fallbacks:** Automatic handling of varying content lengths (clamping titles) and missing data to prevent layout breaks.

### 3. Role-Based Constraint System (Skill 21 Integration)

Utilizing the **Permissions Service (Skill 21)**, the platform will implement a constraint layer that locks design hierarchy based on user roles:

* **Property Locking:** Designers can lock specific style properties (like typography tokens or spacing) so that content editors can only modify text or images.
* **Permission Enforcement:** The UI editor will dynamically hide or disable styling panels based on the user's role-based access level defined in Skill 21.

### 4. Updated Node Tree Schema

The platform's flow engine will be updated to handle the following schema for every canvas element:

```json
{
  "nodeId": "card_post_001",
  "type": "CONTAINER",
  "layoutMode": "FLEX_VERTICAL",
  "style": { "padding": "20px", "gap": "12px", "borderRadius": "8px" },
  "bindings": {
    "title": "$.skill_05.latest_post.title",
    "coverImage": "$.skill_11.processed_media.url"
  },
  "constraints": { "lockLayout": true, "allowContentEdit": true }
}

```

This extension transforms the current visual editor into a specialized "Blog Builder" capable of handling dynamic, data-driven layouts while maintaining strict design standards through the integrated permissions system.
