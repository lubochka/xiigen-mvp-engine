# GEO / Off-site Checklist (AI-search discoverability)

> **This is a PLAN / TODO document, not a record of completed work.**
> Nothing in it has been executed. It exists so that off-site and
> AI-search work is captured honestly and can be picked up the day the
> project has a public surface to optimize.

## 1. Status

**Not applicable yet — no public domain and no GitHub Pages site exist.**

The repository is being prepared for release on the `PrepareToGPL` branch.
There is no owned web property to publish `robots.txt`, `llms.txt`, schema,
or server-rendered HTML against. On `github.com` the crawler policy, page
rendering, and robots rules are GitHub's, not ours — so almost everything
below is deliberately deferred as a **domain-launch TODO** rather than done
today. This file is the only concrete artifact produced now; it commits us
to nothing beyond planning.

- **Created:** 2026-07-23
- **Owner:** Luba
- **Trigger to act:** a public domain and/or GitHub Pages site goes live
- **Source of GEO facts:** the `seo-geo` skill (which itself attributes to
  Google's AI optimization guide, Ahrefs, SE Ranking, OpenAI, Perplexity).
  All figures below carry their attribution inline; no numbers are invented
  beyond what that skill states.

---

## 2. Domain-launch technical TODOs

Each item is blocked until a public domain / GitHub Pages site exists.
Format: `[ ] (recorded YYYY-MM-DD, owner) — action`.

- [ ] **(recorded 2026-07-23, owner: Luba) — Serve static or server-rendered
  HTML only.** AI crawlers do **not** execute JavaScript (per the seo-geo
  skill), so any content that matters for AI-search visibility must be present
  in the initial HTML. If the launch site is a client-only SPA, the key
  pages ("What is XIIGen?", FAQ) must be pre-rendered or server-rendered.

- [ ] **(recorded 2026-07-23, owner: Luba) — Publish `robots.txt` at the
  domain root** allowing the AI-search crawlers we want citing us:
  `GPTBot`, `OAI-SearchBot`, `ClaudeBot`, `PerplexityBot` (all obey
  `robots.txt`, per the seo-geo skill).
  - [ ] **(recorded 2026-07-23, owner: Luba) — Decide separately about
    training crawlers** `CCBot` (Common Crawl) and `Google-Extended`
    (Gemini/Vertex training & grounding opt-out). These are a distinct
    allow/block choice from the AI-search crawlers above; make it a
    conscious decision, not a default.
  - Note: user-triggered fetchers (e.g. `ChatGPT-User`, `Google-Agent`,
    `Google-NotebookLM`) ignore `robots.txt` by design; `robots.txt` cannot
    gate them — server-side access controls would be the lever if ever needed.

- [ ] **(recorded 2026-07-23, owner: Luba) — Optionally publish `/llms.txt`
  at the domain root** listing the key pages. **Honesty flag:** Google
  Search **officially ignores `llms.txt`** — per the seo-geo skill, Google's
  AI optimization guide states it "won't harm (nor help) your visibility or
  rankings in Google Search." Keep it, if at all, **only** as a courtesy to
  non-Google AI crawlers. **Never present or treat `/llms.txt` as a Google
  ranking or citation lever** — that is a myth the skill explicitly rejects.

- [ ] **(recorded 2026-07-23, owner: Luba) — Add JSON-LD structured data:**
  `Organization` schema and `SoftwareSourceCode` schema for the project,
  plus `canonical` URLs on every page to keep the repository the single
  source of truth and avoid duplicate-content ambiguity.

> **Do NOT add `llms.txt` or `robots.txt` to this repository.** In the repo
> root they are not served as a domain root and do nothing (already decided).
> They belong on the future public domain only — captured here as TODOs, not
> committed as files.

---

## 3. Content mirroring TODO

- [ ] **(recorded 2026-07-23, owner: Luba) — When the public site exists,
  mirror 1:1** the README "What is XIIGen?" block (`README.md`, section
  `## What is XIIGen?`) and the FAQ pages under `faq/` onto the site.
  - **Single canonical source:** this repository. The site is a mirror, not
    a fork of the wording. No diverging copies — if the README or a `faq/`
    page changes, the site copy is updated from it, never edited independently.
  - This keeps the same code-anchored, honest phrasing across every surface
    and gives AI crawlers one consistent, non-contradictory answer.

---

## 4. Launch-mentions plan (checklist only — do NOT execute here)

This is a plan for **organic** brand presence once there is something public
to point at. It is not to be executed from this task.

Rationale (per the seo-geo skill):
- Brand mentions correlate **~3x** more strongly with AI visibility than
  backlinks (Ahrefs, December 2025 study of 75,000 brands).
- ChatGPT leans on **Wikipedia (~47.9%)** and Reddit as citation sources.
- Perplexity leans on **Reddit (~46.7%)** and Wikipedia.

Candidate organic channels (each a `[ ]` to be done deliberately, honestly):
- [ ] Show HN post, when there is a real, runnable thing to show.
- [ ] Relevant subreddits — genuine participation, not drops.
- [ ] A dev.to / Hashnode write-up of the actual architecture.
- [ ] A YouTube walkthrough / screencast of the engine.

**Hard rule — organic only.** No fake, paid, or inflated mentions. No
mention-farming, sockpuppets, or coordinated posting. The seo-geo skill
explicitly rejects mention-farming as both ineffective and against Google's
guidelines. Every mention must be a real person's genuine post about a real
capability. If it is not honest, it does not go on this list.

---

## 5. Honesty note

- **GEO is regular SEO.** Google's official position (per the seo-geo skill)
  is that optimizing for generative AI search is still SEO — "AEO" and "GEO"
  are rebranded labels for the same fundamentals. We treat GEO findings as
  SEO fundamentals applied to AI-search surfaces, not a separate discipline.
- **Myths we will not use** (all rejected by Google / the seo-geo skill):
  - `llms.txt` as a Google ranking or citation lever,
  - inflated / farmed brand mentions,
  - keyword stuffing and AI-rephrasing tricks.
- **No traffic promises.** Nothing here guarantees rankings, citations, or
  visitors. It is a plan to make honest content discoverable, not a claim
  that it will be discovered.
- **Same standard as README/FAQ.** All future site content must stay as
  code-anchored and honest as the README and the `faq/` pages — no marketing
  claims the code does not back, no metrics beyond what a cited source states.
