# Flow UI examination — FLOW-02 profile-enrichment

## Date: 2026-04-20 · Run: RUN-58 · Batch: D (Grammar 5 multi-step wizard)

## One-sentence spec (F1)
> When a developer completes registration on the XIIGen community platform, enrich their
> profile with skill data, match them to relevant projects, and broadcast their onboarding
> completion to the community.

## Roles (F3 — `ROLE-ANALYSIS-BATCH-01.md`)
- **tenant-user** — primary; answers questionnaire, sees matches, personalises feed

## Grammar
**G5 Kiosk → multi-step wizard** — step indicator; one question group per screen; progress bar; skip option secondary.
**Reference:** **Typeform, LinkedIn profile setup wizard, Notion onboarding**.

## F4 Business doc
`business_flows.zip / 02-business-onboarding.md`

## Classification
- **Q1 CRUD?** ❌ NO — 3 dedicated pages (QuestionnairePage, MatchingPage, PersonalizationPage).
- **Q2 Error/empty?** No-matches state needs "Tell us more about what you're looking for" CTA.
- **Q3 Engineering leak?** "Skill data", "broadcast onboarding" — should be "Your skills", "Share with your network".
- **Q4 Role-correct?** ✅ tenant-user only.

**Primary finding:** 🟡 partial — needs rendering verification.

## 15 existing PNGs

## Planned fixes
- Step indicator on top (e.g., "2 of 5") + progress bar
- One question group per screen; Next button primary, Back secondary
- MatchingPage: 3-5 suggested projects as cards; "Join" CTA per card
- PersonalizationPage: feed preferences toggles, "Save and continue" primary
- Skip link: "Skip this step" secondary, always available
