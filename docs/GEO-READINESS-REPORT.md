# GEO Readiness Report — XIIGen mvp public face

> **Scope.** This is a pre-publication QA gate for the AI-search discoverability
> of the repository's public "face": `README.md`, `faq/README.md`, and the ten
> `faq/*.md` answer pages. It is an **audit only** — nothing in the repository is
> changed by it except the creation of this file.
>
> **Method.** Every criterion, weight, and statistic below comes from the
> `seo-geo` skill (MIT-licensed, used as knowledge only) — sections "GEO Analysis
> Criteria", "Platform-Specific Optimization", and "Output". Skill-sourced figures
> are marked **[skill]**. Every fact about this repository comes from reading the
> actual files on branch `PrepareToGPL` (HEAD `d1aec68e`) and from running the
> read-only `scripts/verify-docs-claims.sh`. No number is invented; nothing is
> promised about rankings or citations.
>
> **Honesty stance.** GEO is regular SEO applied to AI-search surfaces **[skill]**.
> This report frames findings that way, does not inflate the score, and flags every
> deferral and every inaccuracy it found on the public face.

_Report date: 2026-07-23_

---

## GEO Readiness Score: 73 / 100

Scored against the `seo-geo` weight split **[skill]**. Each dimension is scored
honestly from the files, with the reasoning stated so the number is checkable.

| Dimension | Weight | Score | Rationale (evidence) |
|-----------|-------:|------:|----------------------|
| **Citability** | 25 | **21** | "X is…" definition present; direct answer in first 59 words; README "What is XIIGen?" body is a 144-word self-contained block (squarely in the 134–167 optimal **[skill]**); every claim code-anchored. Deduction: most FAQ answers run 185–282 words, above the 167 optimal. |
| **Structure** | 20 | **18** | Valid single-H1 → H2 → H3 hierarchy; question-based headings; 2–4-sentence paragraphs; six-plus comparative tables; Q&A FAQ format. Near-ideal. |
| **Multi-modal** | 15 | **6** | Weakest dimension, and deliberately so. Public face embeds **no images with alt-text** (only a license-badge SVG). e2e/app run screenshots were removed for PII/token safety. Partial credit for the text ASCII architecture diagram (extractable) and comparative tables. Flagged **deferred**, not a quality failure. |
| **Authority & Freshness** | 20 | **15** | Fresh "Last verified: 2026-07-23" dates on README + all 11 FAQ files, tied to a **passing** `verify-docs-claims.sh` run; counters (46 dirs / 14 live) consistent across three docs; claims anchored to files. Deduction: no author byline/Person schema, no Wikipedia/Reddit/YouTube entity presence yet (deferred). |
| **Technical Accessibility** | 20 | **13** | Content is static server-rendered Markdown (GitHub renders it server-side; no JS gate on the core answer) — good for JS-blind AI crawlers **[skill]**. But on `github.com` the robots.txt / rendering / schema policy is GitHub's, not the project's, so this dimension is **platform-capped**. Domain-level items honestly deferred. |
| **Total** | **100** | **73** | |

**Why not higher:** multi-modal has no alt-texted imagery on the face, off-page
authority (Wikipedia/Reddit/mentions) does not exist yet, and Technical is limited
by hosting on `github.com`. **Why not lower:** the on-page citability, structure,
and verifiable freshness are genuinely strong and honest.

---

## 1. Citability (25% weight → 21)

**Pattern definition ("X is…").** The README opens its `## What is XIIGen?`
section with the exact citable pattern **[skill]**: *"XIIGen is a fabric-first AI
code generation engine that generates application flows on demand…"* This is the
single most extractable sentence and it is at the top of the page.

**Direct answer in the first 40–60 words.** The opening paragraph of "What is
XIIGen?" is **59 words** (measured) and is a complete, self-contained definition —
it lands at the top edge of the 40–60-word target **[skill]** and needs no context
to quote.

**Self-contained blocks in the 134–167-word optimal band [skill].** Measured
word counts of the prose bodies:

| Block | Words | In 134–167 band? |
|-------|------:|:----------------:|
| README `## What is XIIGen?` (full section body) | 144 | **Yes** |
| faq/which-coding-agent-does-this-bet-on… | 160 | **Yes** |
| faq/is-this-a-real-system-or-a-demo | 124 | Just under |
| faq/is-this-a-hybrid-architecture… | 185 | Over |
| faq/how-does-this-change-the-developers-role | 195 | Over |
| faq/can-the-ai-invent-the-algorithm… | 199 | Over |
| faq/how-does-this-relate-to-local-llms… | 216 | Over |
| faq/does-this-engine-train-models… | 230 | Over |
| faq/isnt-this-just-vibe-coding… | 251 | Over |
| faq/what-does-agentic-mean-in-this-project | 252 | Over |
| faq/does-the-agent-actually-check-its-own-work | 282 | Over |

So **two** blocks sit squarely in the optimal band (the README definition at 144
and one FAQ at 160). **Eight of ten FAQ answers exceed the 167-word optimum** — a
**deliberate content-over-length compromise**: each answer is densely code-anchored
(it ends with an "In this repo:" list of concrete file paths), and the authors chose
completeness and verifiability over trimming to the citation-optimal length. The
answers remain fully self-contained and extractable, which is the stronger
citability signal **[skill]**; length is the trade.

**Front-loading (≈44% of AI citations come from the first 30% of a page [skill]).**
README is ~1,923 words; the first 30% is ~577 words. The two most citable blocks —
the 144-word definition and the 107-word "What ships working out of the box" intro
— both sit inside that first 30%, above the capability table. The citable content
is front-loaded, matching the skill's guidance.

**Attribution.** Every FAQ answer attributes its claims to specific files, and the
README ties each capability to a concrete path. Specific, quotable data points are
present (46 flow directories, 14 live flows, `score ≥ 8.5` promotion threshold,
nine DNA rules, fourteen host adapters).

---

## 2. Structure (20% weight → 18)

- **Heading hierarchy.** One H1 (`# XIIGen — …`), well-formed H2 sections, and H3
  sub-sections (`Prerequisites`, `Configuration`, `Run Locally`, `Run Tests`, `Run
  with Docker`) correctly nested under the `## Quick Start` H2. No skipped levels.
  (The `# Server` / `# Client` lines a naive scan sees are bash comments inside
  fenced code blocks, not headings.)
- **Question-based headings [skill].** `## What is XIIGen?` plus all ten FAQ page
  titles are natural-language questions that match query patterns.
- **Short paragraphs.** FAQ paragraphs run 2–4 sentences each — the recommended
  shape **[skill]**.
- **Tables for comparative data.** Module-capability table, env-var/provider table,
  Stack table, AI-provider options, Repository Map, and Documentation table — rich,
  scannable, extractable.
- **Lists & Q&A format.** "Searchable Use Cases", "Key Capabilities", the FAQ index,
  and every "In this repo:" anchor list are clean bulleted structures; the FAQ is a
  proper Q&A set.

This dimension is near-ideal; the small deduction is only that the architecture
visual is ASCII inside a code fence rather than a structured, labelled figure.

---

## 3. Multi-modal (15% weight → 6) — deferred, honestly

**Content with multi-modal elements sees ~156% higher selection rates [skill]** —
so this is a real gap, taken with eyes open.

- **No images with alt-text on the public face.** `README.md` and every `faq/*.md`
  embed **zero** raster/vector images except a single license-badge shield
  (`img.shields.io`, line 3). There is nothing an image-reading crawler can index
  on the face.
- **The e2e/app run screenshots were deliberately removed for safety.** Git history
  confirms it: `001ea534` ("remove GitHub-page run screenshots that leak owner email
  and tokens"), `3665f808` ("remove chat-link archives and portability run
  screenshots"), `670266fd` ("remove non-shippable evidence…"). The `snapshots/`
  directory is now an empty `.gitkeep`; the `e2e/` trees contain **0** PNG/JPG.
  This is a correct security decision (PII/token avoidance) that lowers the
  multi-modal score as a side effect.
- **What remains is not on the face.** 20 topology-/page-render PNGs still live under
  `docs/topology-snapshots/**` (e.g. `tvq-09-topology-render.png`). They are render
  diagrams, not e2e app screenshots, they are **not embedded** in the README or FAQ,
  and they carry no alt-text — so they contribute nothing to face-level multi-modal
  signal.
- **Partial credit** is given for the text ASCII "Architecture at a Glance" diagram
  (fully extractable by a text crawler) and the comparative tables.

**Verdict:** genuinely the weakest dimension. It is scored low on purpose and marked
**deferred** — the fix is to curate one or two PII-clean, token-free images (or an
alt-texted architecture figure) for the face, not to undo the safety cleanup.

---

## 4. Authority & Freshness (20% weight → 15)

- **Freshness [skill].** Content under 3 months old is ~3× more likely to be cited;
  6-months-stale pages lose eligibility. Every public file carries
  `_Last verified: 2026-07-23_` — the report date itself — so the face is maximally
  fresh today. (This creates a maintenance obligation: the dates must be re-stamped
  on the next real verification, or they become a liability rather than an asset.)
- **Freshness is tied to a reproducible check, not asserted.** Running
  `scripts/verify-docs-claims.sh` on this HEAD returns **PASS**: 97 cited paths all
  resolve (0 missing), and the headline counters line up —
  `flow directories = 46 (expected 46) OK`, `"Live" verdicts = 14 (expected 14) OK`,
  `PRODUCT-STATE.md live count = 14 (matches) OK`. The "Last verified" date is
  therefore anchored to a real, rerunnable gate.
- **Counter consistency.** The 46-directory / 14-live claims agree across `README.md`,
  `docs/business-flows/FLOW-BY-FLOW-STATUS.md`, and
  `docs/business-flows/PRODUCT-STATE.md` (verified by the script's counter checks).
- **Primary-source attribution.** The "primary sources" here are the code files each
  FAQ answer cites — a strong, checkable form of attribution for a software project.
- **License authority.** AGPL-3.0-only stated, with `LICENSE`, `NOTICE`, and
  `THIRD_PARTY_NOTICES.md`.

**Deductions (off-page authority, deferred):** no author byline or Person schema;
no Wikipedia/Wikidata entity; no Reddit/YouTube/LinkedIn brand presence. Per the
skill these off-page signals correlate ~3× more strongly with AI visibility than
backlinks **[skill]** — their absence is the main authority gap, and it is honestly
captured as a domain-launch TODO in `docs/geo-offsite-checklist.md`.

---

## 5. Technical Accessibility (20% weight → 13) — platform-capped

**AI crawlers do not execute JavaScript; server-side rendering is critical [skill].**

- **Controllable part is done.** The face is static Markdown that GitHub renders to
  HTML **server-side**; the core answers ("What is XIIGen?", the FAQ) are present in
  the initial HTML with no client-side JS gate. That is exactly what a JS-blind AI
  crawler needs.
- **`llms.txt` status: intentionally absent.** No `/llms.txt` exists, and
  `docs/geo-offsite-checklist.md` records the decision **not** to add one to the repo
  root (where it would not be served as a domain root and would do nothing), and
  flags that Google Search officially ignores `llms.txt` — never to be presented as
  a Google ranking lever **[skill]**. This is the correct, honest handling.
- **AI-crawler access / robots.txt: not the project's to set.** On `github.com` the
  robots policy is GitHub's. Allowing `GPTBot`, `OAI-SearchBot`, `ClaudeBot`,
  `PerplexityBot` is captured as a domain-launch TODO, not doable here.
- **Structured data (schema): none, deferred.** `Organization` and
  `SoftwareSourceCode` JSON-LD are planned for the future public domain, not
  applicable inside a GitHub repo.

**Verdict:** the score is capped by the hosting surface. The project did the
controllable things correctly (static, server-rendered, JS-free core content;
honest deferral of the rest). On a self-owned domain this dimension would have real
headroom.

---

## Per-platform notes

Only **~11% of domains are cited by both ChatGPT and Google AI Overviews for the
same query [skill]**, and Google's two engines (AI Overviews vs AI Mode) cite the
same URLs only **~13.7%** of the time **[skill]** — so the surfaces must be scored
separately. The on-page work in this repo helps the Google surfaces more than it
helps ChatGPT/Perplexity, which lean on off-site entity presence this project does
not yet have.

| Surface | Fit today | Why |
|---------|-----------|-----|
| **Google AI Overviews** | Content-ready, distribution-blocked | AIO is strongly ranking-correlated and cites pages that already rank **[skill]**. The README's citable definition and passages are AIO-shaped, but a brand-new repo with no domain authority does not yet rank, so citation is unlikely until classic-search ranking exists. |
| **Google AI Mode** (custom Gemini 2.5) | **Best fit of the Google surfaces** | AI Mode is weakly ranking-correlated and draws from a broader pool (~9 domains/query), rewarding freshness, entity authority, and citable passages beyond position 5 **[skill]**. The fresh 2026-07-23 dates, the clear "XIIGen is…" entity definition, and self-contained passages align well; the remaining gap is entity authority. |
| **ChatGPT** | Low, until off-site entity presence exists | ChatGPT leans on Wikipedia (~47.9%) and Reddit (~11.3%) **[skill]**. XIIGen has no Wikipedia entity and no Reddit presence yet, so the code-anchored README/FAQ — however good — has little to attach to on ChatGPT's preferred sources. |
| **Perplexity** | Low, until community validation exists | Perplexity leans on Reddit (~46.7%) and Wikipedia **[skill]**. No Reddit/community discussion of XIIGen exists yet; community validation is the lever and it is a deferred TODO. |

---

## Known gaps & honest caveats

1. **Multi-modal on the face is empty (deferred).** No alt-texted images in
   README/FAQ; e2e/app run screenshots were removed for PII/token safety
   (`001ea534`, `3665f808`, `670266fd`). The 20 topology-render PNGs under
   `docs/topology-snapshots/**` are not on the public face and have no alt-text.
   Fix = curate PII-clean imagery, do not undo the cleanup.

2. **`## Evidence and Snapshots` is now imprecise / partially stale.** The section
   states: *"End-to-end runs leave screenshot evidence. This public version ships a
   representative subset of it; paths quoted inside internal reports under `docs/`
   may point at the full private archive."* The e2e/portability **run** screenshots
   that sentence describes were deliberately purged for PII/token safety, and
   `snapshots/` is now an empty `.gitkeep`. What still ships is a subset of
   **topology-render diagrams**, not e2e app screenshots — so the wording is
   misleading even though it is not wholly false. **Candidate for correction**
   (rewrite to say the run screenshots were removed for privacy and only
   topology-render diagrams remain, or drop the section).

3. **FAQ answers exceed the 134–167-word optimum** (185–282 words for eight of ten)
   — a conscious content-over-length compromise favouring dense, code-anchored,
   self-contained answers over citation-optimal length.

4. **Off-site / domain work is entirely deferred (honestly).** No public domain, so
   no project-owned `robots.txt`, `llms.txt`, JSON-LD schema, or canonical URLs; no
   Wikipedia/Reddit/YouTube/LinkedIn entity presence. All captured as domain-launch
   TODOs in `docs/geo-offsite-checklist.md`, which explicitly refuses to commit
   `llms.txt`/`robots.txt` to the repo root.

5. **Minor jargon in FAQ bodies (not headings).** Two FAQ answers cite fixture
   filenames `flow-23-…json` and `flow-32-…json` in their "In this repo:" lists.
   These are real, openable paths (permitted for data identifiers), and **all
   headings and prose are jargon-clean** — no `FLOW-XX`, `T-NNN`, `SK-NNN`, or
   state-machine names leak into user-facing headings or sentences (verified by
   grep). A reader unfamiliar with the convention still sees "flow-23"/"flow-32" as
   raw filenames; low severity.

6. **Technical dimension is platform-capped** on `github.com` — robots/rendering/
   schema are GitHub's, not the project's. Not a defect; a ceiling.

### Myth-lever check (all clean [skill])

The `seo-geo` skill rejects a specific set of "levers" as ineffective or against
Google guidance. The repository does **not** use any of them:

- **`llms.txt` as a Google lever** — not created; `docs/geo-offsite-checklist.md`
  marks it honestly as ignored by Google Search and "never a Google ranking or
  citation lever."
- **Artificial chunking / diverging copies** — the off-site plan mandates a single
  canonical source (this repo) and 1:1 mirroring, no independently-edited copies.
- **AI-rephrasing without substance** — explicitly listed as a myth "we will not
  use."
- **Mention-farming / sockpuppets / paid mentions** — a hard "organic only" rule in
  the checklist forbids them outright.
- **Keyword stuffing** — measured densities in the ~1,923-word README are natural:
  `engine` 48 (~2.5%), `flow` 19 (~1.0%), `DNA` 11, `XIIGen`/`provider`/`tenant` 10
  each (~0.5%), `fabric` 7. No term is over-concentrated; no stuffing.

---

## Top 5 highest-impact remaining fixes

1. **Correct the stale/imprecise `## Evidence and Snapshots` section (README).**
   It is the one factual-accuracy issue on the public face — precisely the kind of
   claim the project's own honesty standard protects. Rewrite it to state that e2e
   run screenshots were removed for PII/token safety and only topology-render
   diagrams remain, or remove the section. Highest impact per effort.

2. **Add one or two PII-clean, alt-texted visuals to the face.** Lifts the weakest
   dimension (multi-modal, 6/15) toward the ~156% higher-selection benefit **[skill]**
   without reversing the security cleanup — e.g. an alt-texted architecture SVG beside
   the ASCII diagram, or a token-free product screenshot on "What ships working".

3. **Execute the deferred off-site entity presence** (Wikipedia/Wikidata entity;
   genuine Reddit/Show-HN/dev.to participation). This is the **only** lever that
   reaches ChatGPT (Wikipedia ~47.9%) and Perplexity (Reddit ~46.7%) **[skill]** —
   on-page work cannot. Plan already exists in `docs/geo-offsite-checklist.md`;
   execution is the gap. Highest cross-platform leverage, larger effort.

4. **Extract a ~140-word lead answer above the detail in the three longest FAQ pages**
   (282/252/251 words). Keeps the code anchors but yields a self-contained passage in
   the 134–167 optimal band **[skill]**, improving citability without losing depth.

5. **On public-domain launch, execute the domain-level technical TODOs**
   (`docs/geo-offsite-checklist.md`): server-render/pre-render the "What is XIIGen?"
   and FAQ pages, publish a `robots.txt` allowing `GPTBot`/`OAI-SearchBot`/
   `ClaudeBot`/`PerplexityBot`, add `Organization` + `SoftwareSourceCode` JSON-LD,
   and set canonical URLs. Unlocks the platform-capped Technical dimension once off
   `github.com`.

---

## Traceability appendix

| Claim in this report | Source |
|----------------------|--------|
| Weights 25/20/15/20/20; 134–167 optimal; ~44% first-30%; ~156% multi-modal; 3× freshness; ~11% cross-cite; ~13.7% AIO/AI-Mode overlap; ChatGPT/Perplexity source mixes; llms.txt / mention-farming myths | `seo-geo` SKILL.md **[skill]** |
| 59-word opening; 144-word definition block; FAQ 124–282-word bodies; keyword densities | measured from `README.md`, `faq/*.md` |
| 97 paths resolve, 46 dirs / 14 live consistent | live run of `scripts/verify-docs-claims.sh` (PASS) |
| Screenshot removal for PII/token safety; `snapshots/` = empty `.gitkeep`; 0 e2e PNGs | git commits `001ea534`, `3665f808`, `670266fd`; filesystem listing |
| 20 topology-render PNGs remain, not on face | `docs/topology-snapshots/**` listing |
| llms.txt/robots not committed; mention-farming banned; single canonical source; no traffic promises | `docs/geo-offsite-checklist.md` |
| Freshness dates | `_Last verified: 2026-07-23_` in `README.md` and all `faq/*.md` |

_No rankings or citations are promised anywhere in this report. GEO is treated as
SEO fundamentals applied to AI-search surfaces **[skill]**._
