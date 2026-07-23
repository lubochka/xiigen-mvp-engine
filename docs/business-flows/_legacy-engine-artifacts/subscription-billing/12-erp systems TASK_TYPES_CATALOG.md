# XIIGen Unified Flow System — Task Types & Expectations Catalog
## All Flow Categories, Input Contracts, Phase Gates, and Acceptance Criteria
## Date: 2026-02-22 | Source: Unified Flow Plan + Figma Plan + Coaching Plan

---

## HOW TO READ THIS DOCUMENT

Each task type defines:
- **Entry**: what the user provides to trigger it
- **Loop 1 families**: what SkillDiscoveryService must find
- **Flow template**: which pre-built DAG executes it
- **Phases**: what each step does
- **Judge gates**: what ArtifactReview checks at each gate
- **Outputs**: what the user receives
- **FREEDOM config**: what the user can tune without code
- **Gap trigger**: what missing capability sends Loop 2 into genesis

---

# TASK TYPE 1: MEDIA TRANSFORMATION
## "Turn audio/text/image into video"

### Entry
```
Chat: "turn my podcast into a short video clip"
      "create a video from this image and voiceover"
      "generate a video from this script"
TaskRequest.intent: media_transformation
TaskRequest.domain: audio_to_video | image_to_video | text_to_video
```

### Loop 1 Families Required
| Family | Interface | Implementation | Status |
|--------|-----------|---------------|--------|
| SPEECH_TO_TEXT (8) | ISpeechToTextProvider | Whisper | L1 DISCOVERABLE |
| AUDIO_GENERATION (7) | IAudioGenerationProvider | ElevenLabs | L2 DISCOVERABLE |
| VIDEO_GENERATION (6) | IVideoGenerationProvider | Kling, Runway | L2 DISCOVERABLE |

### Flow Template: `voice-to-video-v1.json`
```
Phase 1: enhance_audio (ElevenLabs via F7)
Phase 2: generate_video (Kling audio2video via F6) — async submit→poll→download
Phase 3: download + SHA256 verify
```

### Judge Points
| Gate | Mode | Checks | Verdict Options |
|------|------|--------|----------------|
| Pre-execution | TaskPlanning | Plan feasibility, cost estimate, provider availability | Ready / Iterate / Genesis |
| Post-download | ArtifactReview | File downloaded? SHA256 valid? Duration matches request? | Approved / Retry |

### Outputs
- `output.mp4` — final video file
- Cost estimate (emitted BEFORE Kling submit)
- NodeDebugger trace: audio → enhanced audio → video URL → downloaded file

### FREEDOM Config
```
videoProvider: dropdown (kling | runway)
audioProvider: dropdown (elevenlabs)
duration: number (1–10s)
aspectRatio: dropdown (16:9 | 9:16 | 1:1)
mode: dropdown (master | pro | std) — cost tiers
```

### Gap Trigger → Loop 2
- No VIDEO_GENERATION provider → genesis for IVideoGenerationProvider
- Request includes "3D" → gap: 3D_SCENE (Family 10), genesis for I3DSceneProvider

---

# TASK TYPE 2: CONTENT PIPELINE
## "Generate social media content from source material"

### Entry
```
Chat: "make TikTok videos from my blog posts"
      "create Instagram content from this article"
      "generate a YouTube short from this text"
TaskRequest.intent: content_generation
TaskRequest.domain: tiktok | instagram | youtube | threads
```

### Loop 1 Families Required
| Family | Interface | Implementation | Status |
|--------|-----------|---------------|--------|
| AI_TEXT (4) | IAiProvider | Claude, GPT, Gemini | L2 DISCOVERABLE |
| IMAGE_GENERATION (9) | IImageGenerationProvider | DALL-E, Stability AI | L2 DISCOVERABLE |
| AUDIO_GENERATION (7) | IAudioGenerationProvider | ElevenLabs, Murf | L2 DISCOVERABLE |
| VIDEO_GENERATION (6) | IVideoGenerationProvider | Kling | L2 DISCOVERABLE |

### Flow Template: `content-pipeline-v1.json` (Skill 40)
```
Phase 1: generate_script — AI writes platform-optimized script
Phase 2: [PARALLEL] generate_images + generate_audio
Phase 3: compose_video — assemble images + audio → video
Phase 4: publish (optional) — schedule/post to platform
```

### Judge Points
| Gate | Mode | Checks | Verdict Options |
|------|------|--------|----------------|
| Pre-execution | TaskPlanning | Platform template exists? provider coverage? | Ready / Iterate |
| Post-script | ArtifactReview | Script fits platform duration/tone? no prohibited content? | Approved / Retry |
| Post-compose | ArtifactReview | Video duration correct? audio synced? aspect ratio matches platform? | Approved / Retry |

### Outputs
- Platform-formatted video file
- Script document
- Hashtag recommendations
- Scheduled publish confirmation (if configured)

### FREEDOM Config
```
platform: dropdown (TikTok | Instagram | YouTube | Threads)
toneGuide: text (casual | professional | dramatic)
maxDuration: number (seconds)
aspectRatio: auto-set from platform template
hashtagStrategy: text (3-5 trending + 2 niche)
scriptModel: dropdown (claude | gpt | gemini)
voiceId: text (ElevenLabs voice ID)
```

### Gap Trigger → Loop 2
- Platform template not in ES → not a genesis trigger, user creates config doc (FREEDOM)
- No IMAGE_GENERATION provider → genesis for IImageGenerationProvider

---

# TASK TYPE 3: FIGMA TO SYSTEM
## "Generate a complete system from my Figma design"

### Entry
```
Chat: "generate a system from my Figma design"
      "build this app from my Figma file"
      "create code from this design"
TaskRequest.intent: figma_to_system
TaskRequest.domain: web_app | mobile_app | dashboard | marketplace | ...
Attachment: Figma file key OR exported JSON OR plugin Element[]
```

### Loop 1 Families Required
| Family | Interface | Implementation | Status |
|--------|-----------|---------------|--------|
| AI_TEXT (4) | IAiProvider | Claude, GPT, Gemini | L2 DISCOVERABLE |
| VISUAL_COMPARATOR (13) | IVisualComparatorProvider | Playwright+diff | L2 DISCOVERABLE |
| MODULE_RESOLVER (14) | IModuleResolverProvider | ModuleResolverService | L2 DISCOVERABLE |
| Skill 10 (direct) | FigmaParserExecutor | Internal | L2 |
| Skill 17 (direct) | CodeGeneratorService | Internal | L2 |
| Skill 31 (direct) | UITestExecutor | Internal | L2 |

### Flow Template: `figma-to-system-v1.json` — 8 PHASE-GATED STEPS

| Phase | Executor(s) | What It Does |
|-------|-------------|-------------|
| 1 | FigmaParserExecutor (S10) | Parse Figma → components[], tree, patterns[], designTokens, screenMap |
| 2 | AiTransformExecutor (S11) + AiReviewExecutor (S12) + CodeGeneratorService (S17) | Generate responsive HTML + CSS per screen |
| 3 | UITestExecutor (S31) + VisualComparatorExecutor (F13) | Screenshot at N breakpoints, pixel diff vs Figma baseline |
| 4 | AiTransformExecutor (S11) × screens | Functional description per screen: purpose, userActions[], dataFlow |
| 5 | AiTransformExecutor (S11) — holistic | Synthesize: system_type, entity_map, suggested_modules[], user_flows[] |
| 6 | ModuleResolverExecutor (F14) + AiTransformExecutor (S11) + CodeGeneratorService (S17) | Map screens → Genie DNA modules → generate DNA-compliant code per screen |
| 7 | ScreenGapDetectorExecutor (F14) | Cross-reference entity_map × screens_generated → missing_screens[], completeness_score |
| 8 | FinalAssemblyExecutor (F14) | Merge all code → project structure + README + extension guide + TODO list |

### Judge Gates (ArtifactReview mode at every phase)

| Gate | Phase | Acceptance Criteria | Fail Action |
|------|-------|--------------------|-----------  |
| Gate 1 | Figma Parse | All screens parsed? Design tokens complete? No truncated nodes? | Retry (re-parse) / Escalate (re-upload file) |
| Gate 2 | HTML+CSS | All screens have output? CSS uses design tokens? Breakpoints cover mobile+tablet+desktop? No hardcoded colors? | Retry (regenerate failing screens) |
| Gate 3 | Visual Test | Pixel diff < threshold for all screens at all breakpoints? No layout breaks in anomalies[]? | Retry Phase 2 for failing screens only |
| Gate 4 | Functional Desc | Every screen described? userActions non-empty? No contradictions between screens? | Retry (re-describe low-score screens) |
| Gate 5 | System Model | system_type plausible given screens? entity_map non-empty? suggested_modules maps to Genie DNA registry? | Retry (add more context, re-synthesize) |
| Gate 6 | Code Gen | Each screen has code? Config docs valid against schema? Genie DNA 4-law pass? No site-type names? No new controllers? | Retry non-compliant screens / Genesis if module missing |
| Gate 7 | Gap Detection | completeness_score > threshold? All critical screens present? | LOOP BACK to Phase 6 (generate stubs for missing) |
| Gate 8 | Final Assembly | All files present? Imports resolved? No duplicates? Extension guide covers all gaps? | Targeted repair |

### Outputs
- Complete project structure (HTML/CSS + backend scaffolding)
- Module wiring: which Genie DNA modules activated
- Config documents pre-populated for each module
- Visual regression baseline (for future regression testing)
- README + extension guide
- Open TODO list (screens marked STUB, missing features flagged)
- NodeDebugger trace: every phase input/output/verdict queryable by traceId

### FREEDOM Config
```
targetFramework: dropdown (React | Vue | Angular | Svelte | Vanilla)
targetStack: dropdown (.NET | Node.js | Python | Java)
breakpoints: list (default: [320, 768, 1440])
pixelDiffThreshold: number (default: 0.05 = 5%)
completenessThreshold: number (default: 0.80)
maxRetriesPerGate: number (default: 2)
phase7LoopBack: boolean (default: true)
stubMissingScreens: dropdown (stub | skip | escalate)
genieDnaStrictMode: boolean (default: true)
phase6ComplianceCriteriaDocId: text (ES doc ID — admin edits criteria)
```

### Gap Trigger → Loop 2
- No VISUAL_COMPARATOR → genesis for IVisualComparatorProvider (Playwright wrapper)
- No MODULE_RESOLVER → genesis for IModuleResolverProvider
- Phase 6 detects a Genie DNA module with no skill implementation → genesis for that skill

---

# TASK TYPE 4: COACHING & PROGRESS TRACKING
## "Help my clients manage [diet / fitness / finance / sleep / any plan]"

### Entry
```
Chat: "I want to help my clients manage their diet"
      "build a fitness coaching plan for my clients"
      "help me track client budgets and spending habits"
      "I want to run a sleep improvement program"
TaskRequest.intent: coaching_plan_creation
TaskRequest.domain: diet | fitness | finance | sleep | custom
```
ChatToTaskGateway runs a clarification loop before producing TaskRequest:
- "What metrics should we track?"
- "How often should clients check in? (per meal / daily / weekly)"
- "What channel? (WhatsApp / push / email)"
- "How many weeks should the program run?"

### Loop 1 Families Required
| Family | Interface | Implementation | Status |
|--------|-----------|---------------|--------|
| AI_TEXT (4) | IAiProvider | Claude, GPT, Gemini | L2 DISCOVERABLE |
| COACHING_PLAN (11) | ICoachingPlanProvider | CoachingEngineService (S64) | L2 DISCOVERABLE |
| INPUT_PARSER (12) | IInputParserProvider | TextInputParserProvider (S64) | L2 DISCOVERABLE |
| Skill 51 (direct) | QuestionnaireService | Internal | L2 |
| Skill 24 (direct) | NotificationService | Internal | L2 |

### Flow Template: `coaching-plan-v1.json`

| Phase | Executor | What It Does |
|-------|----------|-------------|
| 1 | QuestionnaireNode (S51) | Deliver intake questionnaire to client, collect answers |
| 2 | PlanGeneratorExecutor (S64/F11) | questionnaire answers → personalized plan with daily targets |
| 3 | ScheduleSetupExecutor (S64) | Register recurring tracking triggers in ISchedulerService (#18) |
| 4 (recurring) | NotificationNode (S24) | "What did you [eat/do/spend] for [meal/session]?" |
| 5 (recurring) | InputParserExecutor (S64/F12) | Free text → structured metrics (calories / steps / $amount) |
| 6 (recurring) | AggregatorExecutor (S64) — MACHINE | Sum daily/weekly metrics, compute gap vs plan targets |
| 7 (conditional) | SuggestionEngineExecutor (S64/F11) | gap analysis → AI coaching message → Skill 24 dispatch |

### Judge Points
| Gate | Mode | Checks | Verdict Options |
|------|------|--------|----------------|
| Pre-execution | TaskPlanning | Questionnaire template exists? notification channel configured? | Ready / Iterate |
| Post-plan-gen | ArtifactReview | Plan has all required metrics? Targets realistic? Restrictions applied? | Approved / Retry |
| Post-input-parse | ArtifactReview | confidence > threshold? All expected metrics found? | Approved (→ aggregate) / Clarification loop |
| Post-suggestion | ArtifactReview | Message coherent? Not contradicting plan rules? Channel sent? | Approved / Retry |

### Outputs
- Personalized coaching plan document (stored in `coaching-plans` ES index)
- Recurring schedule activated (meal slots, daily summary times)
- Per-session: structured metrics logged, coaching message delivered
- Weekly/monthly progress report (on aggregation period boundary)

### FREEDOM Config
```
planType: text (diet | fitness | finance | sleep | custom)
trackingFrequency: dropdown (per_session | daily | weekly)
sessionSlots: list (e.g. ["breakfast:08:00", "lunch:12:30", "dinner:19:00"])
metrics: list (e.g. ["calories", "proteinG", "carbsG", "fatG"])
aggregationPeriod: dropdown (daily | weekly)
confidenceThreshold: number (0.3–0.95, default 0.6)
gapThreshold: number (0.05–0.5, default 0.2)
notificationChannel: dropdown (whatsapp | push | email | sms)
planGenerationPromptId: text (ES doc key — admin edits prompt)
inputParserPromptId: text (ES doc key — domain-specific parse instructions)
coachingPromptId: text (ES doc key — tone, style, cultural preferences)
clarificationPromptId: text (ES doc key — what to ask when confidence low)
```

### Gap Trigger → Loop 2
- Photo meal input requested → genesis for ImageMealRecognitionProvider (extends F12)
- Wearable data integration requested → genesis for WearableDataProvider (F12 variant)
- Medical nutrition assessment requested → genesis for MedicalNutritionProvider (F11 variant)

### Generalization (same executors, different config doc)

| Plan Type | planType | metrics | promptIds |
|-----------|----------|---------|-----------|
| Diet | diet | calories, proteinG, carbsG, fatG | plan-gen-diet-v1, meal-parser-v1, diet-coaching-v1 |
| Fitness | fitness | steps, activeMinutes, workoutMinutes | plan-gen-fitness-v1, activity-parser-v1, fitness-coaching-v1 |
| Finance | finance | daily_spend, category_spend, savings | plan-gen-budget-v1, expense-parser-v1, budget-coaching-v1 |
| Sleep | sleep | sleep_hours, sleep_quality, wake_ups | plan-gen-sleep-v1, sleep-parser-v1, sleep-coaching-v1 |
| Custom | [any string] | [any metrics] | [admin-created prompts] |

---

# TASK TYPE 5: CODE GENERATION (Figma-less)
## "Build a system from a description, no design"

### Entry
```
Chat: "build me a hotel booking system"
      "generate a marketplace for freelancers"
      "create a community platform for musicians"
TaskRequest.intent: system_generation
TaskRequest.domain: [described system type]
```

### Loop 1 Families Required
| Family | Interface |
|--------|-----------|
| AI_TEXT (4) | IAiProvider |
| MODULE_RESOLVER (14) | IModuleResolverProvider |
| RAG (5) | IRagService (for existing system patterns) |

### Flow Template: `text-to-system-v1.json`
```
Phase 1: SystemAnalysisExecutor — AI extracts entities, modules, user flows from description
Phase 2: ModuleResolverExecutor — maps entities → Genie DNA modules → skills
Phase 3: CodeGeneratorService — generates DNA-compliant code + config docs
Phase 4: GapDetectorExecutor — checks entity coverage, generates stubs for gaps
Phase 5: FinalAssembly — project structure + README + extension guide
```

### Judge Points
| Gate | Mode | Checks |
|------|------|--------|
| Post-analysis | ArtifactReview | Entity map non-empty? Module mapping covers all entities? System type plausible? |
| Post-code-gen | ArtifactReview | Genie DNA 4-law compliance? Config docs valid? No site-type names in code? |
| Post-gap-detect | ArtifactReview | Completeness score > threshold? Critical entities covered? |

### FREEDOM Config
```
targetFramework, targetStack (same as Figma flow)
systemType: text (hint for module selection — "marketplace" / "booking" / "social")
preferredModules: list (override auto-selection)
completenessThreshold: number
```

---

# TASK TYPE 6: DESIGN SYSTEM INTEGRATION
## "Apply this Figma design to an existing system"

### Entry
```
Chat: "apply this Figma design to my existing app"
      "update my system's UI with this new design"
TaskRequest.intent: design_integration
Attachment: Figma file key + existing_project reference
```

### Loop 1 Families Required
Same as Figma-to-System (F13, F14) plus:
- Existing codebase analysis (reads project structure via Skill 17 reverse)

### Flow Template: `design-integration-v1.json`
```
Phase 1: FigmaParser — extract design tokens + component specs
Phase 2: DesignSystemService (S19) — generate design tokens, CSS variables, theme config
Phase 3: AiTransformExecutor — map new components to existing component library
Phase 4: UITestExecutor + VisualComparatorExecutor — verify integration
Phase 5: CodeGeneratorService — output updated files only (diff, not full project)
```

### Judge Points
Same pattern as Figma-to-System gates 1, 2, 3, adapted to diff output (not full project).

---

# CROSS-CUTTING: WHAT EVERY TASK TYPE SHARES

## The 3-Loop Guarantee

Every task type above enters the same machine:

```
Chat message
    ↓ ChatToTaskGateway (S65) — intent + clarification + TaskRequest
    ↓ Loop 1: SkillDiscoveryService → PlanOrchestrator → JudgeService (TaskPlanning)
    ↓ Approved plan → FlowOrchestrator (S09)
    ↓ Phase execution → PhaseGate nodes → JudgeService (ArtifactReview per phase)
    ↓ Skill 14 NodeDebugger — every input/output/verdict captured
    ↓ Loop 2 fires automatically if any family missing
    ↓ Loop 3 runs in background — promotes mature sandbox tools
    ↓ Delivered to user
```

## Per-Task Judge Mode Usage

| Task Type | TaskPlanning | ArtifactReview | SkillSpecification |
|-----------|-------------|---------------|-------------------|
| Media Transformation | ✅ pre-execution | ✅ post-download | ✅ if new provider needed |
| Content Pipeline | ✅ pre-execution | ✅ post-script, post-compose | ✅ if new provider needed |
| Figma to System | ✅ pre-execution | ✅ 8 gates (one per phase) | ✅ if visual/module provider missing |
| Coaching | ✅ pre-execution | ✅ post-plan, post-parse, post-suggest | ✅ if image/wearable parser needed |
| Text to System | ✅ pre-execution | ✅ post-analysis, post-codegen, post-gap | ✅ if module provider missing |

## Feedback Injection — All AI Nodes

Every executor that calls IAiProvider injects Skill 11/12 feedback before the call:
- Query `feedback` ES index: top-rated past outputs for similar inputs
- Inject as XML context: `<positive_examples>`, `<negative_examples>`
- Result: 20-30% first-try improvement over time (V12 documented metric)

## Debug Surface — All Task Types

Every phase of every flow is queryable via:
```
GET /api/debug/{traceId}                    → full execution state
GET /api/debug/{traceId}/phase/{phaseId}    → specific phase input + output
GET /api/debug/{traceId}/judge/{phaseId}    → judge verdict + criteria results
GET /api/debug/{traceId}/gaps               → missing providers detected
```

---

# FAMILY REGISTRY — COMPLETE (14 Families)

| # | Family | Interface | Used By Task Types |
|---|--------|-----------|-------------------|
| 1 | DATABASE | IDatabaseService | All |
| 2 | QUEUE | IQueueService | All |
| 3 | CACHE | ICacheService | All |
| 4 | AI_TEXT | IAiProvider | All |
| 5 | RAG | IRagService | Figma, Text-to-System |
| 6 | VIDEO_GENERATION | IVideoGenerationProvider | Media, Content Pipeline |
| 7 | AUDIO_GENERATION | IAudioGenerationProvider | Media, Content Pipeline |
| 8 | SPEECH_TO_TEXT | ISpeechToTextProvider | Media |
| 9 | IMAGE_GENERATION | IImageGenerationProvider | Content Pipeline |
| 10 | 3D_SCENE | I3DSceneProvider | Media (future) |
| 11 | COACHING_PLAN | ICoachingPlanProvider | Coaching |
| 12 | INPUT_PARSER | IInputParserProvider | Coaching |
| 13 | VISUAL_COMPARATOR | IVisualComparatorProvider | Figma, Design Integration |
| 14 | MODULE_RESOLVER | IModuleResolverProvider | Figma, Text-to-System |

---

# FLOW TEMPLATE REGISTRY

| Template ID | Task Type | Phases | Phase-Gated | Loop-Back |
|-------------|-----------|--------|-------------|-----------|
| `voice-to-video-v1` | Media Transformation | 3 | Light (1 gate) | No |
| `content-pipeline-v1` | Content Pipeline | 4 | Yes (2 gates) | No |
| `figma-to-system-v1` | Figma to System | 8 | Yes (8 gates) | Phase 7→6 |
| `coaching-plan-v1` | Coaching | 7 (2 recurring) | Yes (3 gates) | No |
| `text-to-system-v1` | Text to System | 5 | Yes (3 gates) | No |
| `design-integration-v1` | Design Integration | 5 | Yes (3 gates) | No |

---

# FLOW CATEGORY CONFIG — INDEX #22

| categoryId | displayName | defaultTemplate | requiredFamilies |
|-----------|------------|----------------|-----------------|
| media_generation | Media Generation | voice-to-video-v1 | VIDEO_GENERATION |
| content_pipeline | Content Pipeline | content-pipeline-v1 | AI_TEXT, VIDEO_GENERATION |
| figma_to_system | Figma to System | figma-to-system-v1 | VISUAL_COMPARATOR, MODULE_RESOLVER |
| coaching_tracking | Coaching & Tracking | coaching-plan-v1 | COACHING_PLAN, INPUT_PARSER |
| text_to_system | System Generation | text-to-system-v1 | AI_TEXT, MODULE_RESOLVER |
| design_integration | Design Integration | design-integration-v1 | VISUAL_COMPARATOR |

---

# GAPS THAT WOULD TRIGGER LOOP 2

| User Request Variant | Missing | Genesis Target |
|---------------------|---------|---------------|
| "Photo of my meal" (coaching) | IInputParserProvider + vision capability | Extend F12 with image input |
| "From my wearable data" (coaching) | WearableDataProvider | New F12 variant |
| "Generate a 3D scene from my concept" | I3DSceneProvider | F10, Meshy/Shap-E |
| "Run visual tests against live site" | ILiveSiteComparatorProvider | F13 variant |
| "Generate a medical nutrition plan" | IMedicalNutritionProvider | F11 variant (clinical domain) |
| "Post directly to TikTok API" | ISocialPublisherProvider | New family F15 |
| "Integrate with my Stripe account" | IPaymentIntegrationProvider | Existing S56, may need F16 |

---

## SAVE POINT

```
TASK_CATALOG_STATE.md
DATE: 2026-02-22
STATUS: Complete ✅

TASK TYPES DEFINED: 6
  1. Media Transformation (voice-to-video, image-to-video, text-to-video)
  2. Content Pipeline (blog→TikTok, text→social media)
  3. Figma to System (8-phase, phase-gated, loop-back capable)
  4. Coaching & Tracking (diet, fitness, finance, sleep, custom)
  5. Text to System (description → full system, no Figma)
  6. Design Integration (Figma → existing system update)

FAMILIES DEFINED: 14 (10 V12 original + 4 added)
FLOW TEMPLATES: 6
JUDGE MODES: 3 (TaskPlanning, SkillSpecification, ArtifactReview)
JUDGE VERDICTS: 5 (Ready, RequiresIteration, RequiresSkillGenesis, RequiresHumanReview, LoopBack)

NEXT: Implementation of Phase A — JudgmentMode.ArtifactReview in JudgeService
RESUME KEY: "Continue from Task Catalog — implement JudgmentMode.ArtifactReview"
```

---

# TASK TYPE 7: LEGACY SYSTEM MIGRATION & ARCHITECTURE ANALYSIS
## "Analyze my existing systems and upgrade them to XIIGen"

### Entry
```
Chat: "I want to migrate my existing systems to XIIGen"
      "Help me analyze and upgrade my codebase"
      "Turn my legacy services into XIIGen skills"
Attachment: series of zip/directory uploads (one per system, across multiple sessions)
TaskRequest.intent: legacy_migration
```

### New Structural Requirements (not in previous task types)
- Multi-session: task spans days/weeks between architect uploads
- Sub-flow: code-to-skills 7-step runs as nested child flow per uploaded system
- Accumulation: each upload adds to architecture_model across sessions
- Human gates: Steps 2 (naming) and 3 (architecture plan) require mandatory human approval

### New Node Types Required
| Node Type | When Used | Semantics |
|-----------|-----------|-----------|
| SubFlow | Per-system analysis | Executes code-to-skills-v1 as nested child |
| HumanApprovalGate | Gates 2, 3, B | Suspends flow; resumes on human submit |
| UserUpload | Between systems | Upload event advances migration task |

### New Families (16 total after this)
| Family 15 | ICodeAnalysisProvider | Read code, extract patterns, COPY/ADAPT/REWRITE classify |
| Family 16 | IMigrationPlannerProvider | Map patterns → XIIGen modules, build migration roadmap |

### New ES Indices
- `migration-tasks` — durable multi-session task state
- `architecture-models` — accumulating cross-system model

---

# UPDATED FAMILY REGISTRY (18 Families)

| # | Family | Interface | Used By |
|---|--------|-----------|---------|
| 1-14 | (as before) | ... | ... |
| **15** | **CODE_ANALYSIS** | **ICodeAnalysisProvider** | Legacy Migration |
| **16** | **MIGRATION_PLANNER** | **IMigrationPlannerProvider** | Legacy Migration |
| **17** | **GAMIFICATION** | **IGamificationProvider** | FLOW-05 |
| **18** | **USER_REGISTRATION** | **IUserRegistrationProvider** | FLOW-01 |

---

# UPDATED FLOW TEMPLATE REGISTRY

| Template ID | Task Type | Sessions | Phase-Gated | Human Gates | Sub-Flows |
|-------------|-----------|----------|-------------|-------------|-----------|
| voice-to-video-v1 | Media | Single | Light | 0 | 0 |
| content-pipeline-v1 | Content | Single | Yes | 0 | 0 |
| figma-to-system-v1 | Figma | Single | 8 gates | 0 | 0 |
| coaching-plan-v1 | Coaching | Multi (scheduled) | 3 gates | 0 | 0 |
| text-to-system-v1 | Text-to-System | Single | 3 gates | 0 | 0 |
| design-integration-v1 | Design | Single | 3 gates | 0 | 0 |
| **migration-v1** | **Legacy** | **Multi (upload-driven)** | **Variable** | **3** | **1** |
| **code-to-skills-v1** | *(sub-flow)* | *Per system* | *7 steps* | *2* | *0* |
| **lesson-gamification-v1** | **Gamification** | **Single** | **3 branch gates** | **0** | **0** |
| **user-registration-v1** | **User Registration** | **Single** | **2 path gates** | **0** | **0 (3 wait states)** |

---

# TASK TYPE 8: FAN-OUT SCORING ENGINE (FLOW-05)
## T44 — Gamification scoring after lesson completion

### Entry
```
Event: QuestionnaireAnswered from QUEUE FABRIC (Questionnaire Service)
TaskRequest.intent: gamification_scoring
```

### Archetype
PROCESSING (parallel fan-out with conditional join)

### Factory Dependencies
| Factory | Interface | Fabric Resolution |
|---------|-----------|-------------------|
| F166 | IGamificationService | DATABASE FABRIC (InfluxDB+Redis) + QUEUE FABRIC (Redis Streams) |
| F168 | IAchievementRegistryService | DATABASE FABRIC (Elasticsearch+MongoDB) |
| F169 | IStreakTrackingService | DATABASE FABRIC (Redis+MongoDB) |
| F170 | IPointLedgerService | DATABASE FABRIC (InfluxDB) |

### Iron Rules
| IR | Rule | Violation = |
|----|------|------------|
| IR-1 | Point values MUST be calculated server-side. Client-submitted = REJECTED | BUILD FAILURE |
| IR-2 | Level formula is MACHINE. Making it configurable = FAIL | BUILD FAILURE |
| IR-3 | Streak calculations MUST use user's timezone (userTimezone required) | BUILD FAILURE |
| IR-4 | Achievement unlocks MUST cross-reference actual event history | BUILD FAILURE |
| IR-5 | Every mutation MUST return DataProcessResult<T>. No throws | BUILD FAILURE |
| IR-6 | Every point write MUST use idempotency key | BUILD FAILURE |
| IR-7 | PointLedger write MUST complete BEFORE events fire | BUILD FAILURE |
| IR-8 | T44 fires IN PARALLEL with T45/T46. Sequential dependency = FAIL | BUILD FAILURE |

### Quality Gates
| QG | Gate | SLA |
|----|------|-----|
| QG-1 | Generated code extends MicroserviceBase (DNA-4) | Mandatory |
| QG-2 | No direct DB/provider imports (all through fabric) | Mandatory |
| QG-3 | Point formula matches MACHINE spec EXACTLY | Mandatory |
| QG-4 | All event payloads match registered BFA schema | Mandatory |
| QG-5 | Rate limiting implemented server-side | Mandatory |
| QG-6 | GamificationPointsAwarded fires within 1s of QuestionnaireAnswered | p99 SLA |

### MACHINE / FREEDOM
- **MACHINE:** Point formula (base+correct+allCorrect+time+streak+quality), level formula (level_n = level_(n-1) × 1.5 + 100), server-side only, idempotency key, BigInt storage, persistence-before-event
- **FREEDOM:** Point values per action, streak thresholds (3/7/30), quality bonus criteria, achievement definitions, rate limit value

### BFA Validation
- ENTITIES: GamificationProfile, PointLedgerEntry, AchievementRecord, StreakRecord
- EVENTS: GamificationPointsAwarded, UserLeveledUp, AchievementUnlocked
- CROSS-FLOW: Points must not conflict with FLOW-01 state; UserLeveledUp consumable by FLOW-02

---

# TASK TYPE 9: ML ADAPTATION GATE (FLOW-05)
## T45 — Learning plan adaptation with validation

### Entry
```
Event: QuestionnaireAnswered from QUEUE FABRIC (parallel with T44)
TaskRequest.intent: learning_adaptation
```

### Archetype
INTELLIGENCE (AI-driven decision with validation gate)

### Factory Dependencies
| Factory | Interface | Fabric Resolution |
|---------|-----------|-------------------|
| F167 | ILearningPlanService | AI ENGINE FABRIC (ML inference) + DATABASE FABRIC (MongoDB) + QUEUE FABRIC (Redis Streams) |

### Iron Rules
| IR | Rule | Violation = |
|----|------|------------|
| IR-1 | Max 3 adaptation changes per event | BUILD FAILURE |
| IR-2 | Min 2 completed lessons since last adaptation | BUILD FAILURE |
| IR-3 | Required onboarding/prerequisite modules CANNOT be removed | BUILD FAILURE |
| IR-4 | ML failure MUST produce safe default (plan unchanged, event with no_change=true) | BUILD FAILURE |
| IR-5 | T45 fires IN PARALLEL with T44. Sequential dependency = FAIL | BUILD FAILURE |
| IR-6 | LearningPlanService is the ONLY writer to LearningPlan entity (BFA enforces) | BUILD FAILURE |
| IR-7 | AdaptationRecord MUST be written BEFORE LearningPlanAdapted fires | BUILD FAILURE |
| IR-8 | All methods MUST return DataProcessResult<T> | BUILD FAILURE |

### Quality Gates
| QG | Gate | SLA |
|----|------|-----|
| QG-1 | Generated code extends MicroserviceBase (DNA-4) | Mandatory |
| QG-2 | No direct AI provider import (IAiProvider through fabric only) | Mandatory |
| QG-3 | Safe default path verifiably present in generated code | Mandatory |
| QG-4 | Validation step occurs between AnalyzePerformance and ApplyAdaptation | Mandatory |
| QG-5 | Max-3-changes enforcement is deterministic, not ML self-limit | Mandatory |
| QG-6 | LearningPlanAdapted payload matches registered BFA schema | Mandatory |
| QG-7 | Circuit breaker wraps AI ENGINE FABRIC call (timeout 10s) | SLA |

### MACHINE / FREEDOM
- **MACHINE:** Max 3 changes, min 2 lessons, required modules protected, safe default, validation gate mandatory, persist-before-event
- **FREEDOM:** Score thresholds (60%/90%), pace multipliers, ML model selection, adaptation type weights, ML timeout (10s)

### BFA Validation
- ENTITIES: LearningPlan, AdaptationRecord, PerformanceHistory
- EVENTS: LearningPlanAdapted
- CROSS-FLOW: Must not conflict with FLOW-02 matching; must not remove FLOW-01 onboarding modules

### Implementation Notes (from Appendix F)
- T45 generates as Python/FastAPI service (extending MicroserviceBase patterns)
- ML inference budget: LearningPlanAdapted must fire within 10s of QuestionnaireAnswered

---

# TASK TYPE 10: SOCIAL LEARNING DISTRIBUTION (FLOW-05)
## T46 — Social sharing with privacy and peer grading

### Entry
```
Event: QuestionnaireAnswered from QUEUE FABRIC (parallel with T44/T45)
PRECONDITION: user.learningActivityPrivate = false AND shareConsent on ≥1 answer
Fail → BRANCH SKIPPED entirely. No error. No event.
TaskRequest.intent: social_distribution
```

### Archetype
DISTRIBUTION (conditional entry, content creation, audience targeting, engagement feedback loop)

### Factory Dependencies
| Factory | Interface | Fabric Resolution |
|---------|-----------|-------------------|
| F171 | IQuestionnairePostService | DATABASE FABRIC (MongoDB) + AI ENGINE FABRIC (LLM) + QUEUE FABRIC |
| F172 | IGradeCalculationService | DATABASE FABRIC (MongoDB) + QUEUE FABRIC |
| F173 | ILearningAudienceService | RAG FABRIC + DATABASE FABRIC (ES/MongoDB) + QUEUE FABRIC |
| FLOW-04 | Reused (Connection, Group, Matching, Ranking, Feed) | Inherited fabric resolutions (unchanged) |

### Iron Rules
| IR | Rule | Violation = |
|----|------|------------|
| IR-1 | Per-question consent MUST be checked. No opt-in = answer excluded | BUILD FAILURE |
| IR-2 | Private mode MUST skip entire social branch. No override | BUILD FAILURE |
| IR-3 | Grading pseudonymity enforced until 3+ unique graders | BUILD FAILURE |
| IR-4 | Rate limit on grading enforced server-side (20/hr). No client bypass | BUILD FAILURE |
| IR-5 | All methods return DataProcessResult<T> | BUILD FAILURE |
| IR-6 | FLOW-04 pipeline reused via CreateAsync(). No reimplementation | BUILD FAILURE |
| IR-7 | Grading spam detection: anomaly flagging on >20/hr patterns | BUILD FAILURE |
| IR-8 | Consent-bypassed answers MUST NOT appear in any downstream event payload | BUILD FAILURE |

### Quality Gates
| QG | Gate | SLA |
|----|------|-----|
| QG-1 | Generated code extends MicroserviceBase (DNA-4) | Mandatory |
| QG-2 | Consent gate is FIRST step in post creation (code path analysis) | Mandatory |
| QG-3 | Private mode check BEFORE any post creation logic | Mandatory |
| QG-4 | Grade anonymization verified (no grader ID until threshold) | Mandatory |
| QG-5 | Rate limit response returns 429 with retry-after header | Mandatory |
| QG-6 | FLOW-04 factories called via CreateAsync(), not imported directly | Mandatory |
| QG-7 | Engagement loop events (AnswerGraded) correctly route to T44 via QUEUE FABRIC | Mandatory |

### MACHINE / FREEDOM
- **MACHINE:** Consent gate (per-question opt-in), private mode skip, pseudonymous grading (3 threshold), rate limit (20/hr), 4 grading criteria (accuracy/depth/clarity/creativity), 1-5 scale, 4 comment types (support/question/challenge/insight), struggling learner protection (<60% → "In Progress"), FLOW-04 reuse via CreateAsync
- **FREEDOM:** Audience weights (30/20/30/20), audience caps, similarity threshold, recency window, post template, default sharing preference

### BFA Validation
- ENTITIES: QuestionnairePost, AnswerGrade, AnswerComment, AudienceRecord
- EVENTS: QuestionnairePostCreated, QuestionnaireAudienceIdentified, QuestionnairePostRanked, QuestionnairePostDistributed, AnswerGraded, AnswerCommented
- CROSS-FLOW: PostCreated must not conflict with FLOW-04 schema; must respect FLOW-01 privacy; grading → T44 via F166 (T46 MUST NOT award points directly)

---

# TASK TYPE 11: MULTI-PATH AUTHENTICATION GATE (FLOW-01)
## T47 — SSO and Email authentication with account resolution

### Entry
```
HTTP: POST /auth/sso/{provider}  — SSO path (Google, Facebook, LinkedIn, Figma)
HTTP: POST /auth/register         — Email/password registration path
Routed through API Gateway which injects tenantId context.
TaskRequest.intent: user_registration
TaskRequest.domain: sso | email
```

### Archetype
ROUTING (conditional path selection with account resolution and merge)

### Factory Dependencies
| Factory | Interface | Fabric Resolution |
|---------|-----------|-------------------|
| F174 | IAuthenticationService | DATABASE FABRIC (PostgreSQL + Redis) + QUEUE FABRIC (Redis Streams) |
| F175 | IUserProfileService | DATABASE FABRIC (MongoDB + PostgreSQL) + QUEUE FABRIC (Redis Streams) |
| F181 | ITokenManagementService | DATABASE FABRIC (Redis + PostgreSQL) |

### Iron Rules
| IR | Rule | Violation = |
|----|------|------------|
| IR-1 | No plaintext password storage — bcrypt(cost=12) ONLY | BUILD FAILURE |
| IR-2 | OAuth redirect URI strict whitelist — NO open redirects | BUILD FAILURE |
| IR-3 | Account merge ALWAYS preserves older userId (FK stability) | BUILD FAILURE |
| IR-4 | Rate limit: 5 registrations per IP per 15 min — server-side | BUILD FAILURE |
| IR-5 | Same response for "email exists" and "email not found" | BUILD FAILURE |
| IR-6 | No PII in JWT payload — only userId, tenantId, role, exp | BUILD FAILURE |
| IR-7 | SSO tokens NEVER stored long-term — exchanged immediately | BUILD FAILURE |

### Quality Gates
| QG | Gate | SLA |
|----|------|-----|
| QG-1 | JWT issued within 2s of successful SSO auth | p99 |
| QG-2 | All auth events published to QUEUE FABRIC before HTTP response | Mandatory |
| QG-3 | Account merge produces zero orphaned foreign keys | Mandatory |
| QG-4 | Rate limiter checked BEFORE any database write | Mandatory |
| QG-5 | CSRF protection on ALL auth endpoints | Mandatory |
| QG-6 | All event handlers idempotent (userId+eventType dedup key) | Mandatory |

### MACHINE / FREEDOM
- **MACHINE:** OAuth2 protocol, bcrypt-12, RS256 JWT, merge-preserves-older-userId, email normalization, enumeration prevention, redirect whitelist, refresh token rotation
- **FREEDOM:** Enabled SSO providers, JWT expiry durations, rate limit values, OAuth client credentials, password complexity rules

### BFA Validation
- ENTITIES: User, AuthCredential, SSOLink, Session
- EVENTS: UserSSOAuthenticated, UserRegistrationInitiated, UserCreated
- APIS: POST /auth/sso/{provider}, POST /auth/register
- CROSS-FLOW: CF-1 (UserCreated.onboardingSteps required by FLOW-02), CF-2 (userId format), CF-3 (event ordering)

---

# TASK TYPE 12: DEFERRED VERIFICATION PIPELINE (FLOW-01)
## T48 — Email verification with durable wait state

### Entry
```
Event: UserRegistrationInitiated from QUEUE FABRIC (published by T47 email path)
TaskRequest.intent: email_verification
```

### Archetype
PROCESSING (linear with WAIT STATE and timer-based expiry)

### Factory Dependencies
| Factory | Interface | Fabric Resolution |
|---------|-----------|-------------------|
| F174 | IAuthenticationService | DATABASE FABRIC (PostgreSQL) + QUEUE FABRIC (Redis Streams) |
| F176 | IEmailDeliveryService | QUEUE FABRIC (Redis Streams) |
| F181 | ITokenManagementService | DATABASE FABRIC (Redis + PostgreSQL) |

### Iron Rules
| IR | Rule | Violation = |
|----|------|------------|
| IR-1 | Token must be 256-bit cryptographically random | BUILD FAILURE |
| IR-2 | Single-use enforcement (delete-on-verify) | BUILD FAILURE |
| IR-3 | Token reuse returns "Already verified" + redirect | BUILD FAILURE |
| IR-4 | Expired token returns "Link expired" + resend (no user data revealed) | BUILD FAILURE |
| IR-5 | All SMTP failures route to DLQ (never silently dropped) | BUILD FAILURE |
| IR-6 | Verification link MUST be HTTPS with no open redirect params | BUILD FAILURE |

### Quality Gates
| QG | Gate | SLA |
|----|------|-----|
| QG-1 | Verification email delivered within 60s of registration | SLA |
| QG-2 | Token validation completes within 500ms | p99 |
| QG-3 | DLQ depth monitored — alert at >10 messages | Alert |
| QG-4 | Concurrent token requests for same email: only newest valid | Mandatory |
| QG-5 | All token operations idempotent (token+action dedup key) | Mandatory |
| QG-6 | Reminder emails DO NOT fire if user already verified | Mandatory |

### MACHINE / FREEDOM
- **MACHINE:** 256-bit random tokens, single-use, one active per email, server-side expiry, status: pending→verified, exponential backoff 1s/2s/4s, max 3 SMTP retries then DLQ
- **FREEDOM:** Token expiry (24hr), reminder schedule (24hr+72hr), dormancy timeout (30d), email templates, SMTP provider

### BFA Validation
- ENTITIES: VerificationToken, User (status field)
- EVENTS: UserRegistrationInitiated, VerificationEmailSent, EmailVerified, UserActivated
- APIS: GET /auth/verify?token=
- CROSS-FLOW: CF-4 (EmailVerified before UserActivated), CF-5 (UserActivated triggers T49)

---

# TASK TYPE 13: ONBOARDING DELIVERY ORCHESTRATION (FLOW-01)
## T49 — Questionnaire generation, delivery, and completion tracking

### Entry
```
Event: UserCreated (SSO path) or UserActivated (email path) from QUEUE FABRIC
TaskRequest.intent: onboarding_delivery
```

### Archetype
ORCHESTRATION (sequential pipeline with completion tracking and downstream fan-out)

### Factory Dependencies
| Factory | Interface | Fabric Resolution |
|---------|-----------|-------------------|
| F175 | IUserProfileService | DATABASE FABRIC (MongoDB + PostgreSQL) + QUEUE FABRIC (Redis Streams) |
| F177 | IQuestionnaireService | DATABASE FABRIC (MongoDB) + AI ENGINE FABRIC (LLM) + QUEUE FABRIC (Redis Streams) |
| F178 | IChatDeliveryService | DATABASE FABRIC (MongoDB + Redis) + QUEUE FABRIC (Redis Streams) |
| F179 | IRegistrationAnalyticsService | DATABASE FABRIC (Elasticsearch) + QUEUE FABRIC (Redis Streams) |
| F180 | IAuditTrailService | DATABASE FABRIC (Elasticsearch) + QUEUE FABRIC (Redis Streams) |

### Iron Rules
| IR | Rule | Violation = |
|----|------|------------|
| IR-1 | UserOnboardingCompleted fires ONLY when ALL 3 criteria met (profile+questionnaire+business) | BUILD FAILURE |
| IR-2 | Questionnaire Service down → registration still succeeds; DLQ → retry on recovery | BUILD FAILURE |
| IR-3 | Questionnaire handler MUST be idempotent (userId+questionnaireId dedup) | BUILD FAILURE |
| IR-4 | Responses validated server-side (types match question definitions) | BUILD FAILURE |
| IR-5 | UserOnboardingCompleted payload MUST include onboardingSteps array | BUILD FAILURE |

### Quality Gates
| QG | Gate | SLA |
|----|------|-----|
| QG-1 | Questionnaire generated within 5s of UserCreated/UserActivated | SLA |
| QG-2 | Chat delivery confirmed within 5s of questionnaire generation | SLA |
| QG-3 | UserOnboardingCompleted fires within 2s of QuestionnaireCompleted | SLA |
| QG-4 | All funnel events tracked in analytics (F179) with <100ms overhead | Performance |
| QG-5 | All compliance events logged in audit (F180) with PII redaction | Mandatory |
| QG-6 | Questionnaire Service failure does NOT block registration flow | Resilience |

### MACHINE / FREEDOM
- **MACHINE:** Completion criteria (3 steps ALL required), completedAt immutable, idempotent handler, server-side validation, delivery within 5s SLA
- **FREEDOM:** Number of questions (5/10/progressive), delivery method (chat/modal/email), skip option (with reduced matching flag), AI model for personalization, question definitions per tenant

### BFA Validation
- ENTITIES: Questionnaire, QuestionnaireResponse, OnboardingState
- EVENTS: QuestionnaireRequired, QuestionnaireSent, QuestionnaireCompleted, UserOnboardingCompleted
- CROSS-FLOW: CF-6 (UserOnboardingCompleted payload contract), CF-7 (GATE for FLOW-02/03/04/05), CF-8 (responses queryable by FLOW-05)

### CRITICAL: Foundation Flow
T49 publishes `UserOnboardingCompleted` which is the GATE EVENT for:
- FLOW-02 (Matching) — cannot match users without onboarding data
- FLOW-03 (Events) — cannot recommend events without user profile
- FLOW-04 (Feed Distribution) — cannot personalize feed without preferences
- FLOW-05 (Lesson Gamification) — cannot start learning without active user

If this event doesn't fire, NO downstream flow can activate.


---

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# TASK TYPE 14: PARALLEL PROFILE ENRICHMENT GATE (FLOW-02)
# T50 — Parallel Profile Enrichment Gate
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Entry
```
Event: QuestionnaireCompleted (from T49/FLOW-01 — UserOnboardingCompleted gate)
TaskRequest.intent: business_onboarding_enrichment
Prerequisite: UserOnboardingCompleted MUST have fired (CF-1 gate check)
```

## Archetype
ORCHESTRATION — Fork into 3 parallel branches with shared correlation context

## Purpose
Receives QuestionnaireCompleted, forks into 3 concurrent branches (Business Profile
Creation, Analytics Segmentation, Learning Program Generation), enforces debounce
(5-minute window, latest_wins per userId), and handles multi-business sub-runs.
All branches share parent correlationId via DNA-7 trace propagation.

## Distinct From
- T44 (Fan-Out Scoring): single gamification branch, not parallel intelligence enrichment
- T49 (Onboarding Orchestration): sequential questionnaire delivery, not parallel enrichment
- T40 (Three-Way Join Gate): joins 3 audience STREAMS; T50 forks then joins 3 enrichment BRANCHES

## Factory Dependencies
| Factory | Interface | Resolved Via |
|---------|-----------|-------------|
| F182 | IBusinessProfileService | CreateAsync() |
| F183 | IMatchingService | CreateAsync() |
| F184 | IAnalyticsSegmentService | CreateAsync() |
| F185 | ILearningProgramService | CreateAsync() |

## Fabric Resolution
| Factory | Fabric | Provider |
|---------|--------|---------|
| F182 CreateProfile | DATABASE FABRIC (IDatabaseService) | MongoDB — StoreDocument |
| F182 GetProfile | DATABASE FABRIC (IDatabaseService) | MongoDB — SearchDocuments |
| F183 FindMatches | DATABASE FABRIC (IDatabaseService) | PostgreSQL — SearchDocuments |
| F183 ScoreCompatibility | DATABASE FABRIC (IDatabaseService) | PostgreSQL — SearchDocuments |
| F184 SegmentUser | DATABASE FABRIC (IDatabaseService) | Elasticsearch — StoreDocument |
| F184 AnalyzePatterns | DATABASE FABRIC (IDatabaseService) | Elasticsearch — SearchDocuments |
| F185 GenerateProgram | AI ENGINE FABRIC (IAiProvider) | GenerateAsync() — multi-model |
| F185 GetProgram | DATABASE FABRIC (IDatabaseService) | MongoDB — SearchDocuments |
| ALL events | QUEUE FABRIC (IQueueService) | Redis Streams — EnqueueAsync |

## AF Configuration
| Station | Role for T50 |
|---------|-------------|
| AF-1 Genesis | Generates 4 fabric-backed services extending MicroserviceBase |
| AF-2 Planning | Decomposes into fork node + 3 branch nodes + debounce policy |
| AF-4 RAG | Retrieves FLOW-01 F175/F177 patterns for profile structure reuse |
| AF-5 Multi-model | Runs Claude + GPT for LearningProgram generation (F185) |
| AF-7 Compliance | Checks DNA-1 through DNA-7 on all 4 generated services |
| AF-8 Security | Validates mTLS, MongoDB field-level encryption (revenue), scope isolation |
| AF-9 Judge | Validates IR-1 through IR-4 + QG-1 through QG-5 |
| AF-11 Feedback | Stores branch timing metrics for future parallel tuning |

## BFA Validation
```
ENTITIES: BusinessProfile, AnalyticsSegment, LearningProgram, MatchResult
EVENTS (consumed): QuestionnaireCompleted
EVENTS (published): BusinessProfileCreated, UserProfileAnalyzed, BusinessCategorized,
                    LearningProgramGenerated, LearningPreferencesStored
CROSS-FLOW RULES:
  CF-1: UserOnboardingCompleted MUST precede QuestionnaireCompleted trigger
  CF-2: LearningProgramGenerated → consumed by FLOW-05 (T45 ML Adaptation Gate)
  CF-3: BusinessProfileCreated → consumed by T51 (Matching Convergence Gate)
CONFLICT CHECKS: Against FLOW-01 (UserProfile entity), FLOW-05 (LearningProgram entity)
```

## Machine / Freedom
```
MACHINE (fixed by engine):
  - All 3 branches share identical correlationId from trigger
  - DNA-7: traceparent forwarded to every downstream service call
  - BusinessProfileCreated MUST fire before Matching branch starts (dependency)
  - Debounce: 300s window, latest_wins policy (discard intermediate, never reprocess)
  - Multi-business: matching runs per businessId, results merged + deduplicated

FREEDOM (admin-configurable via ES config document):
  - Branch timeout thresholds (default 30s each, per-branch configurable)
  - Degraded vs hard-fail on branch timeout (default: degraded_ok=true)
  - Matching algorithm weights (industry:0.30, location:0.25, stage:0.25, interest:0.20)
  - LearningProgram AI model selection (default: Claude primary, GPT fallback)
  - Cache TTLs: userPrefs:24h, feedContent:1h, eventRecs:4h, businessMatches:12h
```

## Iron Rules
| IR | Rule | Violation = |
|----|------|------------|
| IR-1 | All 3 branches MUST emit events with correlationId = trigger's userId | BUILD FAILURE |
| IR-2 | BusinessProfileCreated MUST emit before Matching branch starts | BUILD FAILURE |
| IR-3 | Multi-business: per-business sub-run, results merged before OnboardingCompleted | BUILD FAILURE |
| IR-4 | Debounce window active: discard intermediate QuestionnaireCompleted, never double-process | BUILD FAILURE |
| IR-5 | Privacy: match reasons MUST NOT expose other users' private business details | BUILD FAILURE |

## Quality Gates (AF-9 validates)
| QG | Check | SLA |
|----|-------|-----|
| QG-1 | All 3 branches initialized within 500ms of QuestionnaireCompleted | Performance |
| QG-2 | BusinessProfileCreated emitted within 3s of branch start | SLA |
| QG-3 | LearningProgramGenerated emitted within 10s (AI generation budget) | SLA |
| QG-4 | AnalyticsSegmentService failure → fallback to industry defaults, NOT flow failure | Resilience |
| QG-5 | Redis cache populated for all 4 TTL patterns before OnboardingCompleted fires | Mandatory |

## Flow Template Reference
`business-onboarding-v1.json` (nodes: trigger → fork → 3 branches → T51 convergence gate)


---

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# TASK TYPE 15: MATCHING CONVERGENCE GATE (FLOW-02)
# T51 — Matching Convergence Gate
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Entry
```
Event: BusinessProfileCreated + BusinessCategorized (both required — wait-for-event join)
TaskRequest.intent: matching_convergence
Prerequisite: T50 branches 1 and analytics must have completed (CF-3 gate)
```

## Archetype
CONVERGENCE — Wait-for-event join on 2 events, then parallel matching + personalization
with explicit 30s timeout policy producing degraded (not failed) completion

## Purpose
Waits for both BusinessProfileCreated and BusinessCategorized events to arrive for the
same correlationId, then initiates the Matching Service's compatibility scan against all
active businesses, and in parallel begins Feed and Events personalization. Enforces
30s hard timeout on matching — degraded completion (partial/no matches shown) rather
than flow failure.

## Distinct From
- T40 (Three-Way Join Gate): merges audience streams; T51 waits on 2 signals then fans out
- T50 (Parallel Profile Enrichment): fork gate; T51 is the convergence + matching gate
- T49 (Onboarding Orchestration): sequential delivery; T51 is parallel convergence

## Factory Dependencies
| Factory | Interface | Resolved Via |
|---------|-----------|-------------|
| F183 | IMatchingService | CreateAsync() |
| F186 | IRecommendationEngineService | CreateAsync() |
| F187 | IBusinessCategoryService | CreateAsync() |
| F188 | IFeedPersonalizationService | CreateAsync() |
| F189 | IEventsPersonalizationService | CreateAsync() |

## Fabric Resolution
| Factory | Fabric | Provider |
|---------|--------|---------|
| F183 FindMatches | DATABASE FABRIC (IDatabaseService) | PostgreSQL — SearchDocuments (scan active businesses) |
| F183 ScoreCompatibility | DATABASE FABRIC (IDatabaseService) | PostgreSQL — SearchDocuments |
| F183 GetMatchReasons | DATABASE FABRIC (IDatabaseService) | PostgreSQL — SearchDocuments |
| F186 StorePreferences | DATABASE FABRIC (IDatabaseService) | MongoDB — StoreDocument + Redis — StoreDocument (cache) |
| F186 GetRecommendations | AI ENGINE FABRIC (IAiProvider) | GenerateAsync() — recommendation scoring |
| F187 CategorizeAsync | DATABASE FABRIC (IDatabaseService) | Elasticsearch — StoreDocument |
| F188 PersonalizeFeed | DATABASE FABRIC (IDatabaseService) | Redis (cache) + PostgreSQL (config) |
| F189 PersonalizeEvents | DATABASE FABRIC (IDatabaseService) | Elasticsearch — SearchDocuments |
| ALL events | QUEUE FABRIC (IQueueService) | Redis Streams — EnqueueAsync |

## AF Configuration
| Station | Role for T51 |
|---------|-------------|
| AF-1 Genesis | Generates wait-for-event join node + 5 factory-backed services |
| AF-2 Planning | Decomposes wait logic, timeout policy, parallel fan-out after join |
| AF-4 RAG | Retrieves FLOW-04 (Feed Distribution) patterns for F188 reuse |
| AF-5 Multi-model | F186 recommendation scoring: Claude vs GPT vs Gemini |
| AF-6 Code Review | Reviews timeout handling, race conditions in wait-for-event join |
| AF-7 Compliance | DNA-1 through DNA-7; special check: no typed match result models |
| AF-8 Security | k-anonymity (min group 5 for "similar businesses"), match score TTL |
| AF-9 Judge | Validates IR-1 through IR-5 + QG-1 through QG-6 |
| AF-10 Merge | Best recommendation model result for F186 |
| AF-11 Feedback | Stores matching quality metrics for algorithm improvement |

## BFA Validation
```
ENTITIES: MatchResult, BusinessCategory, FeedConfiguration, EventsConfiguration
EVENTS (consumed): BusinessProfileCreated, BusinessCategorized, LearningProgramGenerated
EVENTS (published): BusinessMatchesFound, ConnectionSuggestionsReady,
                    UserFeedPersonalized, EventFeedPersonalized
CROSS-FLOW RULES:
  CF-4: BusinessMatchesFound → consumed by FLOW-07 (Friend Requests from match suggestions)
  CF-5: UserFeedPersonalized → consumed by FLOW-04 (Feed Distribution baseline config)
  CF-6: EventFeedPersonalized → consumed by FLOW-03 (Event Suggestions)
CONFLICT CHECKS: FLOW-03, FLOW-04, FLOW-07 entity/event intersection
```

## Machine / Freedom
```
MACHINE (fixed by engine):
  - Wait-for-event join: BOTH BusinessProfileCreated AND BusinessCategorized required
  - Matching hard timeout: 30s maximum (configurable threshold but timeout enforcement not optional)
  - Degraded completion: timeout → emit OnboardingCompleted with matchStatus="pending"
  - Privacy: match reasons MUST NOT expose private business details of matched users
  - k-anonymity: "similar businesses" groups minimum size = 5

FREEDOM (admin-configurable):
  - Match timeout value (default 30s, range 10s–120s)
  - Max matches returned (default 10, configurable 5–50)
  - Match type weights (complementary / peer / mentor / collaborative ratios)
  - Feed personalization mix (matched content % vs trending % vs learning content %)
```

## Iron Rules
| IR | Rule | Violation = |
|----|------|------------|
| IR-1 | Wait-for-event join MUST wait for BOTH events before proceeding | BUILD FAILURE |
| IR-2 | Matching timeout (30s) MUST produce degraded result, NOT flow failure | BUILD FAILURE |
| IR-3 | Match scores stored in Redis with TTL=12h — MUST NOT persist indefinitely | BUILD FAILURE |
| IR-4 | Match reasons MUST pass privacy filter before inclusion in ConnectionSuggestionsReady | BUILD FAILURE |
| IR-5 | k-anonymity: "similar businesses" groupings require minimum 5 members | BUILD FAILURE |

## Quality Gates (AF-9 validates)
| QG | Check | SLA |
|----|-------|-----|
| QG-1 | Wait-for-event join completes within 500ms of second event arrival | Performance |
| QG-2 | Matching scan returns within 30s (timeout policy enforced) | SLA |
| QG-3 | Feed personalization completes within 2s after matches are ready | SLA |
| QG-4 | Events personalization completes within 2s after matches are ready | SLA |
| QG-5 | Degraded completion path tested: matching timeout → OnboardingCompleted still emits | Mandatory |
| QG-6 | Privacy filter tested: match reason contains no PII from matched user | Security |

## Flow Template Reference
`business-onboarding-v1.json` (nodes: join gate → matching → parallel personalization → T52 completion)


---

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# TASK TYPE 16: ONBOARDING COMPLETION BROADCAST (FLOW-02)
# T52 — Onboarding Completion Broadcast
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Entry
```
Event: UserFeedPersonalized + EventFeedPersonalized (both completed)
       OR: T51 degraded completion (matchStatus="pending")
TaskRequest.intent: onboarding_completion_broadcast
Prerequisite: T51 must have emitted at least one of: BusinessMatchesFound or degraded timeout
```

## Archetype
TERMINAL + BROADCAST — Final gate that validates completion criteria, emits
OnboardingCompleted with full status payload, and broadcasts to all downstream consumers

## Purpose
Acts as the terminal gate for FLOW-02. Validates that both feed and events personalization
have completed (or gracefully degraded), assembles the OnboardingCompleted event with full
status payload (including matchStatus, feedStatus, learningStatus), and broadcasts to all
downstream flows. This is the GATE EVENT for FLOW-03, FLOW-04, FLOW-05.

## Distinct From
- T49 (Onboarding Orchestration): T49 fires UserOnboardingCompleted (FLOW-01 gate);
  T52 fires OnboardingCompleted (FLOW-02 gate — personalization complete)
- T51 (Matching Convergence): T51 runs matching; T52 verifies + broadcasts result

## Factory Dependencies
| Factory | Interface | Resolved Via |
|---------|-----------|-------------|
| F188 | IFeedPersonalizationService | CreateAsync() |
| F189 | IEventsPersonalizationService | CreateAsync() |

Note: T52 primarily validates + publishes; consumes F188/F189 status checks only.

## Fabric Resolution
| Factory | Fabric | Provider |
|---------|--------|---------|
| F188 GetFeed | DATABASE FABRIC (IDatabaseService) | Redis — SearchDocuments (verify cache populated) |
| F189 GetEvents | DATABASE FABRIC (IDatabaseService) | Elasticsearch — SearchDocuments (verify indexed) |
| OnboardingCompleted event | QUEUE FABRIC (IQueueService) | Redis Streams — EnqueueAsync |
| ConnectionSuggestionsReady | QUEUE FABRIC (IQueueService) | Redis Streams — EnqueueAsync |

## AF Configuration
| Station | Role for T52 |
|---------|-------------|
| AF-1 Genesis | Generates terminal broadcast node with status assembly logic |
| AF-7 Compliance | Validates OnboardingCompleted payload includes all required fields |
| AF-8 Security | Verifies GDPR: all business profile data exportable, erasure cascade registered |
| AF-9 Judge | Validates IR-1 through IR-4 + QG-1 through QG-4 |
| AF-11 Feedback | Stores overall FLOW-02 completion metrics |

## BFA Validation
```
ENTITIES: OnboardingCompletion, PersonalizationStatus
EVENTS (consumed): UserFeedPersonalized, EventFeedPersonalized
EVENTS (published): OnboardingCompleted (CRITICAL — gate for downstream flows)
CROSS-FLOW RULES:
  CF-7: OnboardingCompleted.payload MUST include:
        {userId, completedAt, matchStatus, feedStatus, learningStatus, matchCount,
         feedReady, eventsReady, onboardingVersion}
  CF-8: OnboardingCompleted is the GATE EVENT for:
        FLOW-03 (Event Suggestions), FLOW-04 (Feed Distribution),
        FLOW-05 (Lesson Gamification), FLOW-07 (Friend Requests)
  CF-9: If OnboardingCompleted doesn't fire, ALL 4 downstream flows are blocked
CONFLICT DETECTION: If payload schema changes → BFA G5 fires for all 4 consuming flows
```

## Machine / Freedom
```
MACHINE (fixed by engine):
  - OnboardingCompleted FIRES even on degraded completion (matchStatus="pending" is valid)
  - Payload MUST include matchStatus, feedStatus, learningStatus (never omit)
  - completedAt is immutable once set (DNA-5: tenantId + userId + completedAt indexed)
  - GDPR erasure cascade registered: deletion of user cascades to all FLOW-02 outputs

FREEDOM (admin-configurable):
  - Notification content for "We found X matches" message
  - Whether to show "Still finding matches" UI state (vs hide matches section)
  - Analytics events to emit alongside completion (configurable per tenant)
```

## Iron Rules
| IR | Rule | Violation = |
|----|------|------------|
| IR-1 | OnboardingCompleted MUST fire regardless of partial failures (degraded is valid) | BUILD FAILURE |
| IR-2 | Payload MUST include: matchStatus, feedStatus, learningStatus, matchCount | BUILD FAILURE |
| IR-3 | completedAt MUST be set once and immutable | BUILD FAILURE |
| IR-4 | GDPR: all FLOW-02 outputs MUST be registered in erasure cascade registry | BUILD FAILURE |

## Quality Gates (AF-9 validates)
| QG | Check | SLA |
|----|-------|-----|
| QG-1 | OnboardingCompleted fires within 1s of both personalization services completing | SLA |
| QG-2 | Payload includes all required fields (CF-7 payload contract) | Mandatory |
| QG-3 | Degraded path tested: OnboardingCompleted fires with matchStatus="pending" | Mandatory |
| QG-4 | GDPR erasure: test user deletion cascades to BusinessProfile + Matches + FeedConfig | Security |

## Flow Template Reference
`business-onboarding-v1.json` (final node — terminal broadcast)


---

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# FAMILY 19 REGISTRATION
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

```
FAMILY 19: BUSINESS ONBOARDING INTELLIGENCE
Source: FLOW-02 (business-onboarding.md)
Task Types: T50, T51, T52
Factories: F182, F183, F184, F185, F186, F187, F188, F189
Flow Template: business-onboarding-v1.json
Trigger: QuestionnaireCompleted (from FLOW-01, Family 18)
Terminal Event: OnboardingCompleted (gate for FLOW-03/04/05/07)

CORE CAPABILITY:
  3-branch parallel enrichment (profile + analytics + learning)
  → compatibility matching with timeout/degraded path
  → feed + events personalization
  → broadcast completion to all downstream flows

DOWNSTREAM DEPENDENCIES:
  FLOW-03: EventSuggestions (consumes OnboardingCompleted)
  FLOW-04: FeedDistribution (consumes UserFeedPersonalized + OnboardingCompleted)
  FLOW-05: LessonGamification (consumes LearningProgramGenerated + OnboardingCompleted)
  FLOW-07: FriendRequests (consumes ConnectionSuggestionsReady)
```

---

# FLOW TEMPLATE: business-onboarding-v1.json (structural outline)

```json
{
  "flowId": "FLOW-02",
  "name": "business-onboarding-v1",
  "version": 1,
  "trigger": {
    "eventType": "QuestionnaireCompleted",
    "correlationKey": "$.data.userId",
    "debounce": { "windowSeconds": 300, "policy": "latest_wins" }
  },
  "nodes": [
    {
      "id": "bfa_pre_check",
      "type": "bfa_validation",
      "checks": ["CF-1_user_onboarded", "CF-9_no_duplicate_run"],
      "onFail": "abort"
    },
    {
      "id": "fork_three_branches",
      "type": "fork",
      "taskType": "T50",
      "branches": ["branch_business_profile", "branch_analytics", "branch_learning"],
      "policy": { "required": ["branch_business_profile"], "optional": ["branch_analytics", "branch_learning"], "degradedOk": true }
    },
    {
      "id": "branch_business_profile",
      "type": "command",
      "factory": "F182:IBusinessProfileService",
      "method": "CreateProfile",
      "outputEvent": "BusinessProfileCreated"
    },
    {
      "id": "branch_analytics",
      "type": "command",
      "factory": "F184:IAnalyticsSegmentService",
      "method": "SegmentUser",
      "outputEvent": "UserProfileAnalyzed",
      "onFailure": "degrade_to_defaults"
    },
    {
      "id": "branch_categorize",
      "type": "command",
      "factory": "F187:IBusinessCategoryService",
      "method": "CategorizeAsync",
      "dependsOn": ["branch_business_profile"],
      "outputEvent": "BusinessCategorized"
    },
    {
      "id": "branch_learning",
      "type": "command",
      "factory": "F185:ILearningProgramService",
      "method": "GenerateProgram",
      "dependsOn": ["branch_business_profile"],
      "outputEvent": "LearningProgramGenerated",
      "timeout": { "seconds": 15, "onTimeout": "degrade" }
    },
    {
      "id": "wait_for_matching_inputs",
      "type": "wait_event",
      "taskType": "T51",
      "waitFor": ["BusinessProfileCreated", "BusinessCategorized"],
      "correlationKey": "$.data.userId"
    },
    {
      "id": "run_matching",
      "type": "command",
      "factory": "F183:IMatchingService",
      "method": "FindMatches",
      "timeout": { "seconds": 30, "onTimeout": "degrade", "degradedPayload": { "matchStatus": "pending" } },
      "outputEvent": "BusinessMatchesFound"
    },
    {
      "id": "fork_personalization",
      "type": "fork",
      "branches": ["personalize_feed", "personalize_events"],
      "policy": { "required": [], "optional": ["personalize_feed", "personalize_events"], "degradedOk": true }
    },
    {
      "id": "personalize_feed",
      "type": "command",
      "factory": "F188:IFeedPersonalizationService",
      "method": "PersonalizeFeed",
      "timeout": { "seconds": 2, "onTimeout": "degrade_to_trending" },
      "outputEvent": "UserFeedPersonalized"
    },
    {
      "id": "personalize_events",
      "type": "command",
      "factory": "F189:IEventsPersonalizationService",
      "method": "PersonalizeEvents",
      "timeout": { "seconds": 2, "onTimeout": "degrade" },
      "outputEvent": "EventFeedPersonalized"
    },
    {
      "id": "broadcast_completion",
      "type": "terminal",
      "taskType": "T52",
      "factory": null,
      "emits": ["OnboardingCompleted", "ConnectionSuggestionsReady"],
      "payloadAssembly": {
        "userId": "$.correlationKey",
        "matchStatus": "$.nodes.run_matching.status",
        "feedStatus": "$.nodes.personalize_feed.status",
        "learningStatus": "$.nodes.branch_learning.status",
        "matchCount": "$.nodes.run_matching.output.matchCount",
        "completedAt": "$.now()"
      }
    }
  ]
}
```

---


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# TASK TYPE 17: FLOW DSL COMPILATION GATE
# T53 — Flow DSL Compilation Gate
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Entry
```
Event: FlowDefinitionSubmitted (from visual designer F195 or API)
TaskRequest.intent: flow_compilation
Input: JSON flow DSL document (trigger, nodes, policies, data mappings)
```

## Archetype
GOVERNANCE — Draft → validate → compile → version → publish pipeline with RBAC

## Purpose
Receives a flow DSL document, validates its schema (CloudEvents envelope compliance,
factory reference integrity, correlation key validity, policy completeness), compiles
it into a runtime DAG with explicit nodes/edges and validated correlation keys,
assigns a semantic version, and publishes to the flow registry in Elasticsearch.
Immutable once published — new changes create a new version.

## Distinct From
- T57 (AI Composition Gate): AI generates the DSL from intent; T53 compiles it
- T54 (DAG Runtime Execution): executes a compiled flow; T53 compiles it

## Factory Dependencies
| Factory | Interface | Resolved Via |
|---------|-----------|-------------|
| F190 | IFlowDefinitionService | CreateAsync() |
| F191 | IFlowValidationService | CreateAsync() |
| F194 | ISchemaRegistryService | CreateAsync() |

## Fabric Resolution
| Factory | Fabric | Provider |
|---------|--------|---------|
| F190 StoreDefinition | DATABASE FABRIC | IDatabaseService → Elasticsearch (flow registry index) |
| F190 GetDefinition | DATABASE FABRIC | IDatabaseService → Elasticsearch |
| F191 ValidateDefinition | AI ENGINE FABRIC | IAiProvider → GenerateAsync() (semantic validation) |
| F191 CompileToDAG | DATABASE FABRIC | IDatabaseService → Elasticsearch (compiled DAG) |
| F194 RegisterSchema | DATABASE FABRIC | IDatabaseService → Elasticsearch (schema index) |
| F194 ValidatePayload | DATABASE FABRIC | IDatabaseService → Elasticsearch (schema lookup) |
| Compilation events | QUEUE FABRIC | IQueueService → Redis Streams |

## AF Configuration
| Station | Role |
|---------|------|
| AF-2 Planning | Validates DSL structure: all required sections present |
| AF-4 RAG | Retrieves existing factory + task type patterns for reuse check |
| AF-7 Compliance | Validates all 7 DNA patterns in DSL-referenced factories |
| AF-9 Judge | Validates IR-1 through IR-5 + QG-1 through QG-4 |

## Iron Rules
| IR | Rule | Violation = |
|----|------|------------|
| IR-1 | All factory references in DSL MUST exist in factory registry | BUILD FAILURE |
| IR-2 | All node correlation keys MUST be extractable from event payloads | BUILD FAILURE |
| IR-3 | Published flows are immutable — changes require new version | BUILD FAILURE |
| IR-4 | DSL MUST declare criticality (required/optional) for every branch | BUILD FAILURE |
| IR-5 | CloudEvents envelope required on all trigger/step event types | BUILD FAILURE |

## Quality Gates
| QG | Check | SLA |
|----|-------|-----|
| QG-1 | Validation completes within 5s | Performance |
| QG-2 | Compilation produces valid DAG with no orphan nodes | Mandatory |
| QG-3 | Version assigned using semantic versioning (major.minor.patch) | Mandatory |
| QG-4 | RBAC audit log entry created for every publish | Security |


---

# TASK TYPE 18: DAG RUNTIME EXECUTION GATE
# T54 — DAG Runtime Execution Gate

## Archetype
RUNTIME — Durable step-by-step execution of compiled DAG with crash recovery

## Entry
```
Event: FlowRunRequested OR external trigger event matching flow's trigger.eventType
TaskRequest.intent: flow_run_execution
Input: flowId, flowVersion, correlationKey, triggerPayload
```

## Purpose
Loads compiled flow DAG from Elasticsearch, initializes a FlowRun record with
PENDING state, then executes step by step. Persists run state after every step
(enabling crash recovery). Handles fork/join, wait-for-event, timeouts, debounce,
and sub-run iteration. Each step resolves its factory via CreateAsync().

## Factory Dependencies
| Factory | Interface | Resolved Via |
|---------|-----------|-------------|
| F190 | IFlowDefinitionService | CreateAsync() (load DAG) |
| F192 | IFlowRuntimeService | CreateAsync() |
| F193 | IFlowStepExecutor | CreateAsync() |

## Fabric Resolution
| Factory | Fabric | Provider |
|---------|--------|---------|
| F192 StartRun | DATABASE FABRIC | IDatabaseService → Elasticsearch (flow runs index) |
| F192 PersistState | DATABASE FABRIC | IDatabaseService → Elasticsearch (step state) |
| F192 RecoverRun | DATABASE FABRIC | IDatabaseService → Elasticsearch (load last state) |
| F193 ExecuteStep | RESOLVED AT RUNTIME | Each step's factory resolves via CreateAsync() |
| F193 HandleTimeout | QUEUE FABRIC | IQueueService → Redis Streams (timeout event) |
| Run events | QUEUE FABRIC | IQueueService → Redis Streams |

## Iron Rules
| IR | Rule | Violation = |
|----|------|------------|
| IR-1 | Run state persisted after EVERY step (crash-recoverable) | BUILD FAILURE |
| IR-2 | Running instances stay pinned to the version they started with | BUILD FAILURE |
| IR-3 | Debounce: supersede in-flight run if new trigger arrives within window | BUILD FAILURE |
| IR-4 | Sub-run iteration: per-business runs merge results before terminal step | BUILD FAILURE |
| IR-5 | All step factory resolutions use CreateAsync() — NEVER direct instantiation | BUILD FAILURE |

## Quality Gates
| QG | Check | SLA |
|----|-------|-----|
| QG-1 | Run state written within 100ms of step completion | Performance |
| QG-2 | Crash recovery resumes from last persisted state within 5s | Resilience |
| QG-3 | Fork initializes all branches within 500ms | Performance |
| QG-4 | Wait-for-event resolves within 100ms of matching event arrival | Performance |
| QG-5 | Sub-run results merged correctly (no duplicates) | Mandatory |


---

# TASK TYPE 19: EVENT RELIABILITY GATE
# T55 — Event Reliability Gate

## Archetype
RELIABILITY — CloudEvents envelope enforcement + outbox pattern + trace propagation

## Entry
```
Event: Any inter-service event published through the system
TaskRequest.intent: event_reliability_enforcement
Applied to: ALL flow events (not a distinct flow step — a cross-cutting concern)
```

## Purpose
Enforces CloudEvents-aligned envelopes on all events, maintains a schema registry
for event payload validation, implements transactional outbox for reliable publication
(atomic write + relay), and propagates W3C Trace Context (DNA-7) across all event
boundaries. This is the implementation home for DNA-7.

## Factory Dependencies
| Factory | Interface | Resolved Via |
|---------|-----------|-------------|
| F194 | ISchemaRegistryService | CreateAsync() |
| Queue Fabric | IQueueService (extended) | OutboxWriteAsync, OutboxRelayAsync, SupersedeAsync |

## Fabric Resolution
| Component | Fabric | Provider |
|-----------|--------|---------|
| F194 RegisterSchema | DATABASE FABRIC | IDatabaseService → Elasticsearch (schema index) |
| F194 ValidatePayload | DATABASE FABRIC | IDatabaseService → Elasticsearch (schema lookup) |
| OutboxWriteAsync | DATABASE FABRIC + QUEUE FABRIC | IDatabaseService (atomic write) + IQueueService (relay) |
| OutboxRelayAsync | QUEUE FABRIC | IQueueService → Redis Streams |
| SupersedeAsync | QUEUE FABRIC | IQueueService → Redis Streams (cancel + replace) |

## Iron Rules
| IR | Rule | Violation = |
|----|------|------------|
| IR-1 | ALL events MUST include CloudEvents fields: specversion, id, source, type | BUILD FAILURE |
| IR-2 | ALL events MUST include W3C traceparent (DNA-7) | BUILD FAILURE |
| IR-3 | Transactional writes use OutboxWriteAsync (atomic) not direct queue publish | BUILD FAILURE |
| IR-4 | Event payload MUST validate against registered schema before publication | BUILD FAILURE |
| IR-5 | Schema changes to existing events trigger BFA G1 conflict detection | BUILD FAILURE |

## Quality Gates
| QG | Check | SLA |
|----|-------|-----|
| QG-1 | Outbox relay: event delivered within 500ms of transaction commit | SLA |
| QG-2 | Schema validation overhead < 10ms per event | Performance |
| QG-3 | traceparent propagation verified across 3-hop trace | Mandatory |
| QG-4 | Idempotency: duplicate event delivery handled by consumer | Mandatory |


---

# TASK TYPE 20: FABRIC-FIRST VISUAL BUILDER GATE
# T56 — Fabric-First Visual Builder Gate

## Archetype
UI — Platform-agnostic visual flow designer + live run monitor (zero platform-specific values)

## Entry
```
Event: DesignerSessionRequested (user opens flow builder)
TaskRequest.intent: flow_visual_design
Platform: Resolved at runtime via config — React / Angular / React Native
```

## Purpose
Provides a visual DAG editor for authoring flow definitions. Zero platform-specific
values — all component models, node types, and layout definitions stored as config
documents. Resolves to platform-appropriate renderer via fabric. Includes live run
monitoring view (active runs, step states, error traces).

## Factory Dependencies
| Factory | Interface | Resolved Via |
|---------|-----------|-------------|
| F195 | IFlowDesignerService | CreateAsync() |
| F196 | IFlowMonitorService | CreateAsync() |

## Fabric Resolution
| Factory | Fabric | Provider |
|---------|--------|---------|
| F195 GetPalette | DATABASE FABRIC | IDatabaseService → Elasticsearch (node palette config) |
| F195 SaveDraft | DATABASE FABRIC | IDatabaseService → Elasticsearch (draft index) |
| F195 PublishFlow | QUEUE FABRIC | IQueueService (→ T53 FlowDefinitionSubmitted event) |
| F196 GetRunStatus | DATABASE FABRIC | IDatabaseService → Elasticsearch (runs index) |
| F196 GetStepHistory | DATABASE FABRIC | IDatabaseService → Elasticsearch (step state) |
| F196 GetActiveRuns | DATABASE FABRIC | IDatabaseService → Elasticsearch (filter: status=running) |
| Platform render | RESOLVED AT RUNTIME | Config: "ui.platform" → React/Angular/RN/Web |

## Component Model (platform-agnostic)
```json
{
  "nodeTypes": ["trigger", "fork", "join", "command", "wait_event", "timer", "decision", "terminal"],
  "edgeTypes": ["data_flow", "event_trigger", "timeout_branch", "error_branch"],
  "palette": {
    "resolved_at_runtime": true,
    "config_key": "ui.designer.palette",
    "source": "elasticsearch://flow-node-palette-config"
  },
  "layout": {
    "dagDirection": "top-to-bottom",
    "nodeSpacing": { "config_key": "ui.designer.nodeSpacing" },
    "theme": { "config_key": "ui.designer.theme" }
  }
}
```

## Iron Rules
| IR | Rule | Violation = |
|----|------|------------|
| IR-1 | ZERO platform-specific values in component model (all in ES config docs) | BUILD FAILURE |
| IR-2 | Node palette loaded from ES config — not hardcoded | BUILD FAILURE |
| IR-3 | Designer resolves factory via CreateAsync() — never imports React/Angular directly | BUILD FAILURE |

## Quality Gates
| QG | Check | SLA |
|----|-------|-----|
| QG-1 | Palette loads within 2s | Performance |
| QG-2 | Draft save within 500ms | Performance |
| QG-3 | Live run status updates within 1s of step state change | Real-time |
| QG-4 | Same component model renders on React + Angular (verified by AF-9) | Portability |


---

# TASK TYPE 21: AI FLOW COMPOSITION GATE
# T57 — AI Flow Composition Gate

## Archetype
AI COMPOSITION — Natural language intent → validated flow DSL

## Entry
```
Event: FlowCompositionRequested (user describes flow in natural language)
TaskRequest.intent: ai_flow_composition
Input: { intent: "When X happens, do Y then Z", context: { existingFlows, availableFactories } }
```

## Purpose
Receives a natural language flow description, uses multi-model AI (AF-5) to decompose
it into a flow DSL structure, validates against existing factory registry and task type
catalog, and submits to T53 for compilation. AF-4 RAG retrieves similar existing flows
as examples to ground the AI composition.

## Factory Dependencies
| Factory | Interface | Resolved Via |
|---------|-----------|-------------|
| F190 | IFlowDefinitionService | CreateAsync() (read existing flows for context) |
| F191 | IFlowValidationService | CreateAsync() (validate composed DSL) |
| AI ENGINE FABRIC | IAiProvider | GenerateAsync() via AiDispatcher |
| RAG FABRIC | IRagService | SearchAsync() (find similar flows) |

## AF Configuration
| Station | Role for T57 |
|---------|-------------|
| AF-3 Prompt Library | Domain-specific flow composition prompts |
| AF-4 RAG | Finds similar existing flows as composition examples |
| AF-5 Multi-model | Claude + GPT + Gemini compose concurrently; AF-10 merges best |
| AF-9 Judge | Validates composed DSL against factory registry and iron rules |
| AF-11 Feedback | Stores successful compositions to improve future attempts |

## Iron Rules
| IR | Rule | Violation = |
|----|------|------------|
| IR-1 | AI-composed DSL MUST reference only existing factory interfaces | BUILD FAILURE |
| IR-2 | Composed DSL submitted to T53 for validation — not deployed directly | BUILD FAILURE |
| IR-3 | Composition result includes confidence score + factory provenance | BUILD FAILURE |

## Quality Gates
| QG | Check | SLA |
|----|-------|-----|
| QG-1 | Composition returns valid DSL draft within 30s | SLA |
| QG-2 | AF-4 RAG retrieves ≥3 similar flows as examples | Mandatory |
| QG-3 | Composed DSL references no non-existent factories | Mandatory |


---

# TASK TYPE 22: SELF-EXTENSION META GATE
# T58 — Self-Extension Meta Gate (META archetype)

## Archetype
META — Engine self-extension: gap detection → interface specification → factory registration

## Entry
```
Event: CapabilityGapDetected (from AF-1 Genesis when no factory matches requirement)
       OR: AdminGapRegistration (explicit admin-driven capability request)
TaskRequest.intent: engine_self_extension
Input: { gapDescription, requiredCapability, suggestedFactory }
```

## Purpose
The engine's governance gate for extending itself. When AF-1 Genesis cannot resolve a
required capability to an existing factory, it emits CapabilityGapDetected. T58 receives
this, uses AF-5 to specify the new interface, submits to BFA for cross-flow conflict
check, generates the factory stub via AF-1, and registers it in the factory registry.
This is how the engine grows: gap → specify → validate → register → available.

## Distinct From
- T57 (AI Flow Composition): composes a flow from existing factories; T58 creates new factories
- T53 (Flow DSL Compilation): validates/compiles flows; T58 extends the factory registry itself

## Factory Dependencies
| Factory | Interface | Resolved Via |
|---------|-----------|-------------|
| F191 | IFlowValidationService | CreateAsync() (validate new interface spec) |
| F194 | ISchemaRegistryService | CreateAsync() (register new event schemas) |
| AI ENGINE FABRIC | IAiProvider | GenerateAsync() (interface specification) |

## AF Configuration (full pipeline)
| Station | Role for T58 |
|---------|-------------|
| AF-1 Genesis | Generates factory stub + interface definition |
| AF-2 Planning | Decomposes gap into interface methods |
| AF-4 RAG | Checks if gap partially covered by existing factories |
| AF-5 Multi-model | Competing interface specs from Claude + GPT |
| AF-7 Compliance | New factory MUST satisfy all 7 DNA patterns |
| AF-8 Security | Security review of new capability |
| AF-9 Judge | Validates: gap → interface → BFA check → register pipeline completeness |
| AF-10 Merge | Best interface spec selected |
| AF-11 Feedback | Logs successful extension for future gap detection improvement |

## Iron Rules
| IR | Rule | Violation = |
|----|------|------------|
| IR-1 | New factory MUST declare WHICH FABRIC it resolves through | BUILD FAILURE |
| IR-2 | New interface MUST be BFA-validated before registration | BUILD FAILURE |
| IR-3 | Factory ID assigned sequentially (no gaps in numbering) | BUILD FAILURE |
| IR-4 | New factory MUST satisfy DNA-1 through DNA-7 | BUILD FAILURE |
| IR-5 | Registration creates audit trail (who, when, what gap, AF confidence score) | BUILD FAILURE |
| IR-6 | New factory starts at GENERATED promotion tier; cannot self-promote to CORE | BUILD FAILURE |
| IR-7 | Self-extension of self-extension pipeline (T58 extending T58) requires human approval | BUILD FAILURE |
| IR-8 | Backward compatibility: existing factories F1–(N-1) unchanged by new FN | BUILD FAILURE |

## Quality Gates
| QG | Check | SLA |
|----|-------|-----|
| QG-1 | Gap analysis returns within 10s (RAG + registry check) | Performance |
| QG-2 | Interface specification generated within 30s | SLA |
| QG-3 | BFA cross-flow validation completed before registration | Mandatory |
| QG-4 | New factory skeleton includes all 7 DNA pattern stubs | Mandatory |
| QG-5 | Factory registered and resolvable via CreateAsync() within 5s of approval | SLA |
| QG-6 | Promotion ladder initialized at GENERATED with measurable milestone defined | Mandatory |
| QG-7 | Audit trail entry includes: factoryId, interfaceName, gapDescription, afConfidence | Security |


---

# TASK TYPE 23: FLOW MIGRATION GATE
# T59 — Flow Migration Gate

## Archetype
MIGRATION — Run version migration for in-flight runs + v1→v2 contract upgrade

## Entry
```
Event: FlowVersionUpgradeRequested (admin triggers migration)
TaskRequest.intent: flow_version_migration
Input: { flowId, fromVersion, toVersion, migrationStrategy }
```

## Purpose
Governs the migration of flow definitions from one version to another. Handles:
in-flight runs (pin to v1 until complete, or migrate mid-run), historical run data
migration, BFA re-validation against new version's contracts, and terminal event
emission proving migration success. FLOW-02 v1→v2 is the reference migration.

## Iron Rules
| IR | Rule | Violation = |
|----|------|------------|
| IR-1 | In-flight runs default to pin-to-version (complete on v1) | BUILD FAILURE |
| IR-2 | New runs use new version immediately after publish | BUILD FAILURE |
| IR-3 | Migration MUST re-run BFA validation for all downstream consumers | BUILD FAILURE |
| IR-4 | Migration terminal event MUST include: fromVersion, toVersion, migratedRunCount | BUILD FAILURE |
| IR-5 | Backward-incompatible changes require major version bump | BUILD FAILURE |

## Quality Gates
| QG | Check | SLA |
|----|-------|-----|
| QG-1 | Migration plan generated before execution (preview mode) | Mandatory |
| QG-2 | All consuming flows re-validated against new payload contracts | Mandatory |
| QG-3 | Zero in-flight run data loss | Mandatory |
| QG-4 | Migration terminal event emitted within 5s of completion | SLA |
| QG-5 | Rollback path tested (revert to fromVersion if migration fails) | Resilience |


---

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# FAMILY 20 REGISTRATION
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

```
FAMILY: 20
NAME: Flow Creation Engine (FCE)
TASK TYPES: T53, T54, T55, T56, T57, T58, T59
FACTORIES: F190–F196 (7 factories — outbox absorbed into Queue Fabric)
QUEUE FABRIC EXTENSIONS: OutboxWriteAsync, OutboxRelayAsync, SupersedeAsync (+3 methods)
DNA-7: W3C Trace Context — enforced on ALL generated services
BFA ENFORCEMENT INDEXES: G1–G7 (7 new indexes, see P4)
TRIGGER: FlowDefinitionSubmitted / FlowRunRequested / FlowCompositionRequested / CapabilityGapDetected
BACKWARD COMPAT: ✅ T1–T52 and F1–F189 unchanged; additive only
```

---

# AF STATION MAPPING — 11×7 TABLE (T53–T59)

| Station | T53 DSL Compile | T54 DAG Runtime | T55 Event Reliability | T56 Visual Builder | T57 AI Compose | T58 Self-Extend | T59 Migration |
|---------|----------------|----------------|----------------------|-------------------|---------------|----------------|--------------|
| AF-1 Genesis | Generates F190–F191 services on fabrics | Generates F192–F193 services | Generates Queue Fabric extension methods | Generates F195–F196 on fabrics | Generates composition prompt pipeline | Generates new factory stub from spec | Generates migration DAG |
| AF-2 Planning | Validates DSL structure completeness | Decomposes fork/join/wait semantics | Plans outbox relay + supersede logic | Plans node palette + dashboard layout | Decomposes intent into DSL shape | Decomposes gap into interface methods | Plans pin/migrate/rollback strategy |
| AF-3 Prompt Library | Flow DSL validation prompts | Runtime execution prompts | CloudEvents compliance prompts | UI component model prompts | Flow composition prompts | Interface specification prompts | Migration strategy prompts |
| AF-4 RAG | Checks factory registry for referenced interfaces | Retrieves existing flow patterns | Retrieves CloudEvents + outbox patterns | Retrieves UI component patterns | Finds similar existing flows (≥3) | Checks if gap partially covered | Finds prior migration patterns |
| AF-5 Multi-model | — | — | — | — | Claude+GPT+Gemini compose competing DSLs | Claude+GPT competing interface specs | — |
| AF-6 Code Review | Reviews validation logic | Reviews timeout + recovery logic | Reviews outbox atomicity | Reviews component model contracts | Reviews composed DSL validity | Reviews generated factory stub | Reviews migration state handling |
| AF-7 Compliance | DNA-1–7 on F190–F191 | DNA-1–7 on F192–F193 | DNA-7 enforcement mechanism | DNA-1–7 on F195–F196 | DNA-1–7 on composition output | DNA-1–7 on new factory stub | DNA-1–7 on migration service |
| AF-8 Security | RBAC + audit log | Run isolation per tenant | Payload encryption in transit | Session + RBAC | Composed factory provenance | Security review of new capability | Data integrity during migration |
| AF-9 Judge | IR-1–5 + QG-1–4 for T53 | IR-1–5 + QG-1–5 for T54 | IR-1–5 + QG-1–4 for T55 | IR-1–3 + QG-1–4 for T56 | IR-1–3 + QG-1–3 for T57 | IR-1–8 + QG-1–7 for T58 | IR-1–5 + QG-1–5 for T59 |
| AF-10 Merge | — | — | — | — | Best DSL from competing models | Best interface spec selected | — |
| AF-11 Feedback | Stores compilation success rate | Stores run performance + recovery stats | Stores reliability metrics | Stores UX interaction patterns | Stores successful compositions | Logs extension quality + confidence | Stores migration success rate |

---


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# FINAL FAMILY REGISTRY — COMPLETE (20 Families)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

| # | Family | Interfaces | Flow Source |
|---|--------|-----------|-------------|
| 1 | Media Transformation | F1–F5 | T1 |
| 2 | Content Pipeline | F6–F11 | T2 |
| 3 | System Generation | F12–F23 | T3 |
| 4 | Coaching & Tracking | F24–F35 | T4 |
| 5 | Code Generation | F36–F42 | T5 |
| 6 | Design Integration | F43–F49 | T6 |
| 7 | Execution Fabric | F54–F58 | V43 EXT |
| 8 | Infrastructure Fabric | F59–F63 | V43 EXT |
| 9 | Management + Intelligence | F64–F68 | V43 EXT |
| 10 | Workflow Management | F69–F85 | V40 |
| 11 | Communication | F86–F100 | V40 |
| 12 | Data & Analytics | F101–F120 | V40 |
| 13 | Security & Compliance | F121–F135 | V40 |
| 14 | Platform Services | F136–F153 | V40 |
| 15 | CODE_ANALYSIS | F154–F158 | T7 |
| 16 | MIGRATION_PLANNER | F159–F165 | T7 |
| 17 | Lesson Gamification Intelligence | F166–F173 | FLOW-05 (T44-T46) |
| 18 | User Registration Intelligence | F174–F181 | FLOW-01 (T47-T49) |
| 19 | Business Onboarding Intelligence | F182–F189 | FLOW-02 (T50-T52) |
| 20 | Flow Creation Engine | F190–F196 | FCE (T53-T58) |

TOTAL: 196 factory interfaces across 20 families

---

# FINAL FLOW TEMPLATE REGISTRY

| # | Template | Source | Key Shape |
|---|----------|--------|-----------|
| 1 | voice-to-video-v1 | T1 | linear → parallel render → merge |
| 2 | blog-to-tiktok-v1 | T2 | pipeline → multi-platform-fan-out |
| 3 | figma-to-system-v1 | T3 | 8-phase gated → parallel components |
| 4 | coaching-tracker-v1 | T4 | multi-session → scheduled triggers |
| 5 | code-gen-v1 | T5 | NLP → generation → validation |
| 6 | design-integration-v1 | T6 | extract → transform → verify |
| 7 | legacy-migration-v1 | T7 | assessment → plan → parallel migrate |
| 8 | event-registration-v1 | Pre-engine | trigger → validate → register → notify |
| 9 | lesson-gamification-v1 | FLOW-05 | 3-branch parallel (score + learn + social) → join |
| 10 | user-registration-v1 | FLOW-01 | SSO/Email fork → verify → onboard → gate |
| 11 | business-onboarding-v1 | FLOW-02 | 3-branch parallel (profile + analytics + learning) → match → complete → gate |
| 12 | flow-creation-v1 | FCE | compose → validate → compile → deploy → monitor |
| 13 | event-promotion-v1 | FLOW-03 | store→moderate→BFA→fork(index+analyze+status)→join→score→segment→fork(feed+impressions)→join→notify→async(aggregate+bill) |

TOTAL: 13 flow templates

---

## SAVE POINT (FINAL — POST FLOW-02 + FCE MERGE)
```
CATALOG_STATE.md
DATE: 2026-02-25
STATUS: MERGED (FLOW-02 + FCE content integrated)

TASK TYPES: 22 (7 original + 3 FLOW-05 + 3 FLOW-01 + 3 FLOW-02 + 6 FCE)
  T1-T7: Original catalog
  T8-T43: V40/V43 expansion
  T44-T46: FLOW-05 (Lesson Gamification)
  T47-T49: FLOW-01 (User Registration)
  T50-T52: FLOW-02 (Business Onboarding) ← NEW
  T53-T58: FCE (Flow Creation Engine) ← NEW

FAMILIES: 20
  1-18: Pre-existing
  19: Business Onboarding Intelligence (F182-F189) ← NEW
  20: Flow Creation Engine (F190-F196) ← NEW

FLOW TEMPLATES: 12
  1-10: Pre-existing
  11: business-onboarding-v1 ← NEW
  12: flow-creation-v1 ← NEW

NUMBERING CHAIN (continuous):
  T1...T43 → T44-T46 → T47-T49 → T50-T52 → T53-T58
  Next: T59

SOURCE DOCUMENTS:
  FLOW-02: FCE_EXEC_P1_P5.md Phase 1 (T50-T52, Family 19)
  FCE: FCE_EXEC_P1_P5.md Phase 3 (T53-T58, Family 20)
  Master Plan: XIIGEN_FCE_MASTER_PLAN_v2.md (authoritative)

RESUME KEY: "Continue from FLOW-02 + FCE Integration — all task types current"
```

---

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# FLOW-03 ENGINE EXTENSION — Event Creation & Promotion
# Merged: 2026-02-25 | Source: FLOW03_ENGINE_EXTENSION_COMBINED.md
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

# FAMILY 21: Event Promotion (F197–F204)

| ID | Interface | Primary Fabric | Secondary Fabric | Purpose |
|----|-----------|---------------|-----------------|---------|
| F197 | IEventService | DATABASE→PG | DATABASE→Redis (cache) | Event CRUD, 6-state machine, outbox |
| F198 | IEventMatchingService | AI ENGINE→Multi-model | RAG→Vector, DATABASE→ES | 5-factor scoring, checkpointed |
| F199 | IAudienceSegmentationService | DATABASE→Redis | — | 3-tier segmentation cache |
| F200 | ISearchIndexService | DATABASE→ES | — | Event search indexing (write) |
| F201 | IFeedInjectionService | DATABASE→Redis (ZADD) | — | CQRS write path (F188/F189=read) |
| F202 | INotificationOrchestrationService | QUEUE→Redis Streams | — | Priority lanes, backpressure |
| F203 | IPaymentIntegrationService | DATABASE→PG | — | Billing records, Stripe webhook |
| F204 | ICampaignAnalyticsService | DATABASE→ES | AI ENGINE→IAiProvider | Metrics, predictions, ROI |

**CQRS Note:** F201 is WRITE (1 event → 10K+ ZADD). F188/F189 are READ. Different scaling profiles. Reusing = CQRS violation.

---

## T59 — Event Processing Pipeline

```
TASK TYPE: T59 — Event Processing Pipeline
ARCHETYPE: ORCHESTRATION (fork-join)
ENTRY: POST /events validated, F197 StoreWithOutboxAsync committed
PURPOSE: Orchestrate parallel initial processing: indexing (F200), analytics (F204),
         status update (F197) in parallel; join before scoring pipeline.
DISTINCT FROM:
  T40 (Three-Way Join) — merges audience streams; T59 merges service outputs
  T47 (Multi-Path Auth) — authentication routing; T59 is event promotion

FACTORY DEPENDENCIES: F197, F200, F204
FABRIC RESOLUTION:
  F197 → DATABASE FABRIC → PostgreSQL + Redis
  F200 → DATABASE FABRIC → Elasticsearch
  F204 → DATABASE FABRIC → Elasticsearch + AI ENGINE FABRIC → IAiProvider

AF CONFIGURATION:
  AF-1 Genesis:     Generate event processing microservice on MicroserviceBase
  AF-2 Planning:    S1(store+outbox) → S2(moderate) → S3(BFA) → fork B1/B2/B3 → join J1
  AF-3 Prompt Lib:  Event pipeline domain prompts
  AF-4 RAG:         Skill 08/09 (flow patterns), T40 (fork-join reuse)
  AF-6 Code Review: Parallel safety; outbox retry on transient failure
  AF-7 Compliance:  DNA-1 through DNA-7
  AF-9 Judge:       Validates all IRON RULES

BFA VALIDATION:
  Gate: UserOnboardingCompleted (FLOW-01 E10) for organizerId
  Gate: BusinessProfileCompleted (FLOW-02) for organizerId
  Gate: Rate limit (5 events/day/organizer) before StoreWithOutboxAsync
  Cross-check: EventCreated ≠ FLOW-05 EventMatchesCalculated (different domains — PASS)

MACHINE:
  Status after B1/B2/B3 join: → promoted
  Past date → REJECT (validation error)
  Draft with past date → ArchiveStaleDraftAsync auto-fires
  Content moderation BEFORE BFA pre-validation

FREEDOM:
  Event category taxonomy, pricing tier structures, moderation sensitivity level

IRON RULES:
  IR-1: StoreWithOutboxAsync MUST be atomic. DB fail = no event published.
  IR-2: Duplicate eventId = no-op. Key = eventId+schemaVersion.
  IR-3: Moderation BEFORE BFA pre-validation. Rejected events never reach BFA.
  IR-4: BFA pre-validation BEFORE B1/B2/B3. Cannot index conflicting event.
  IR-5: B1(index) required for J1. B2(analytics) optional with retry_once. B3(status) required.
  IR-6: Rate limit 5/day/organizer = MACHINE. No admin override. Attempt = BUILD FAILURE.
  IR-7: All factory calls via CreateAsync(). No direct instantiation.
  IR-8: All returns DataProcessResult<T>. Throwing for business logic = BUILD FAILURE.

QUALITY GATES:
  QG-1: Outbox atomicity — DB success + bus failure → event NOT published
  QG-2: Idempotency — same eventId twice → second = no-op
  QG-3: BFA runs before parallel branches (integration test)
  QG-4: Stale draft → ArchiveStaleDraft without promotion
  QG-5: Rate limit → DataProcessResult(Error="RATE_LIMIT_EXCEEDED") on 6th event
```

---

## T60 — Multi-Factor Audience Scoring

```
TASK TYPE: T60 — Multi-Factor Audience Scoring
ARCHETYPE: SCORING
ENTRY: Fires after join J1 (EventIndexed confirmed + EventAnalyzed available/retried)
PURPOSE: Score ALL active users against event using 5-factor weighted algorithm,
         segment into strong/medium/weak tiers for delivery routing.
         Handles zero-match fallback and GDPR-compliant location exclusion.
DISTINCT FROM:
  T44 (Fan-Out Scoring) — gamification points; T60 scores event-user fit
  T33 (2-way convergence) — T60 fans out to N users; T33 joins 2 streams

FACTORY DEPENDENCIES: F198, F199, F182 (reused from FLOW-02)
FABRIC RESOLUTION:
  F198 → AI ENGINE FABRIC (Skill 07) → AiDispatcher multi-model consensus
  F198 → RAG FABRIC (Skill 00b)      → IRagService Vector strategy
  F198 → DATABASE FABRIC (Skill 05)  → Elasticsearch (user profiles)
  F199 → DATABASE FABRIC (Skill 05)  → Redis (segment cache)
  F182 → DATABASE FABRIC (Skill 05)  → Elasticsearch (REUSE from FLOW-02)

AF CONFIGURATION:
  AF-1 Genesis:     Generate matching microservice on MicroserviceBase
  AF-2 Planning:    Fetch profiles → parallel score batches → aggregate → segment → fallback
  AF-3 Prompt Lib:  Matching domain prompts (5-factor, interest taxonomy)
  AF-4 RAG:         Skill 00b (vector), T44 (fan-out reuse)
  AF-5 Multi-model: Claude (interest + social) vs GPT (location + time) → consensus
  AF-6 Code Review: Memory for 100k+ scans; pagination; GDPR exclusion path
  AF-8 Security:    Check location_consent BEFORE proximity factor
  AF-9 Judge:       Validates all IRON RULES

BFA VALIDATION:
  CF-10: EventMatchesCalculated ≠ FLOW-02 UserMatchingCompleted (different domains — PASS)
  CF-11: Match cache key: event:{tenantId}:{eventId}:match:{userId} — tenantId scoped
  CF-12: Scores bounded [0.0, 1.0] — out-of-range = BFA ALERT

MACHINE:
  Formula: score = (interest×0.35) + (location×0.25) + (time×0.20) + (price×0.10) + (social×0.10)
  Tier assignment: strong ≥0.75, medium ≥0.50, weak ≥0.25
  Zero-match fallback: broaden to same region/industry, confidence=low
  UTC enforcement: all datetime comparisons in UTC

FREEDOM:
  Factor weights (must sum to 1.0 — validation MACHINE, values FREEDOM)
  Tier thresholds (admin-configurable via ES config doc)
  Fallback broadening radius (region → country → global)

IRON RULES:
  IR-1: Score ∈ [0.0, 1.0]. Out-of-range = BUILD FAILURE.
  IR-2: Weights must sum to 1.0. Violation = VALIDATION ERROR before execution.
  IR-3: Duplicate eventId = no-op. Idempotency key = eventId+version.
  IR-4: GDPR: if user.location_consent = false → set proximity factor = 0, NOT exclude user.
  IR-5: Batch processing: max 1000 users/batch. Checkpoint after each batch.
  IR-6: Zero-match check: if strong=0 AND medium=0 → trigger FallbackBroadenAsync.
  IR-7: All calls pass traceparent (DNA-7). Missing = BUILD FAILURE.
  IR-8: All results use DataProcessResult<T>. Throwing for business logic = BUILD FAILURE.

QUALITY GATES (AF-9):
  QG-1: Score range test — 100 synthetic users → all scores ∈ [0.0, 1.0]
  QG-2: Weight sum validation — submit weights summing to 0.99 → VALIDATION ERROR
  QG-3: GDPR exclusion test — user without consent → score calculated without proximity
  QG-4: Zero-match fallback fires — niche event → fallback broadens correctly
  QG-5: Idempotency — submit same eventId twice → second call = no-op
  QG-6: Checkpoint recovery — kill mid-batch → resume from last checkpoint
```

---

## T61 — Multi-Channel Delivery Orchestration

```
TASK TYPE: T61 — Multi-Channel Delivery Orchestration
ARCHETYPE: DELIVERY
ENTRY: Fires after TargetAudienceIdentified event
PURPOSE: Orchestrate parallel feed injection (F201) and notification dispatch (F202)
         with tier-based channel routing, backpressure, and SLA enforcement.
DISTINCT FROM:
  T46 (Social Learning Dist) — content distribution; T61 is event notification
  T61 handles multiple channels; T46 is single-channel (feed only)

FACTORY DEPENDENCIES: F201, F202, F199, F204
FABRIC RESOLUTION:
  F201 → DATABASE FABRIC → Redis (sorted sets for feed write)
  F202 → QUEUE FABRIC → Redis Streams (priority consumer groups)
  F199 → DATABASE FABRIC → Redis (read segments)
  F204 → DATABASE FABRIC → Elasticsearch (record impressions)

AF CONFIGURATION:
  AF-1 Genesis:     Generate delivery microservice on MicroserviceBase
  AF-2 Planning:    Fork B4(feed)+B5(impressions) → join J2 → S6(notify)
  AF-4 RAG:         T46 (distribution patterns), Skill 04 (queue patterns)
  AF-6 Code Review: Redis memory under 10K+ ZADD; queue depth monitoring
  AF-8 Security:    Organizer cannot directly message; channel prefs respected
  AF-9 Judge:       Validates all IRON RULES

BFA VALIDATION:
  CF-13: FeedsUpdated must not conflict with FLOW-02 UserFeedPersonalized (write vs read — PASS)
  CF-14: NotificationsSent must not duplicate FLOW-01 WelcomeEmailSent (different triggers — PASS)
  CF-15: Feed key: feed:{tenantId}:{userId}:events — tenantId scoped

MACHINE:
  Channel rules: in-app=always, push=enabled+>0.6, email=digest+>0.4, SMS=urgent+>0.8+50km
  SLA: strong ≤5min, medium ≤30min, weak ≤1hr
  Priority order: strong → medium → weak
  Feed placement: >0.8→top3, >0.6→top10, >0.4→inView, else→belowFold

FREEDOM:
  Notification copy templates, email digest schedule, SMS distance threshold,
  feed position boost for new events, timing rules (immediate/1hr/daily)

IRON RULES:
  IR-1: Feed injection MUST complete before notifications fire. Users must see event in feed.
  IR-2: Backpressure: queue depth > configurable threshold → degrade to in-app only.
  IR-3: Organizer cannot bypass F202 to message attendees. Violation = BUILD FAILURE.
  IR-4: Checkpointed fanout: batch failure → checkpoint + retry from last successful batch.
  IR-5: Duplicate notification = no-op. Key = eventId+userId+channel.
  IR-6: Organizer suspended → CancelCampaignNotificationsAsync fires immediately.
  IR-7: All calls pass traceparent (DNA-7).
  IR-8: All returns DataProcessResult<T>.

QUALITY GATES:
  QG-1: Feed injection for 1K users completes in < 5s (p95)
  QG-2: Backpressure test — 10K+ queue → only in-app delivered
  QG-3: Organizer direct message attempt → BUILD FAILURE
  QG-4: Checkpoint recovery — kill mid-batch → resume correctly
  QG-5: Channel routing test — score 0.9 user → all 4 channels queued
  QG-6: Organizer suspension → pending notifications cancelled
  QG-7: Dedup test — same notification submitted twice → single delivery
```

---

## T62 — Promotion Campaign Aggregation

```
TASK TYPE: T62 — Promotion Campaign Aggregation
ARCHETYPE: AGGREGATION (time-decoupled, async window)
ENTRY: NotificationsSent event opens the attribution window (up to 7 days)
PURPOSE: Track campaign metrics (reach, impressions, CTR, conversions) over
         configurable window, then calculate ROI and trigger billing.
         TIME-DECOUPLED: This is NOT part of T59 pipeline. It runs independently.
DISTINCT FROM:
  T59 (pipeline) — T59 completes in minutes; T62 runs for 7+ days
  T44 (scoring) — T44 is synchronous; T62 is async aggregation

FACTORY DEPENDENCIES: F204, F203, F197
FABRIC RESOLUTION:
  F204 → DATABASE FABRIC → Elasticsearch (metrics storage + aggregation)
  F204 → AI ENGINE FABRIC → IAiProvider (prediction accuracy comparison)
  F203 → DATABASE FABRIC → PostgreSQL (billing records)
  F197 → DATABASE FABRIC → PostgreSQL (event status → completed)

AF CONFIGURATION:
  AF-1 Genesis:     Generate aggregation microservice on MicroserviceBase
  AF-2 Planning:    Open window → collect impressions → aggregate → ROI → billing → close
  AF-4 RAG:         T52 (onboarding aggregation patterns)
  AF-6 Code Review: Partial write protection; idempotent aggregation
  AF-9 Judge:       Validates all IRON RULES

BFA VALIDATION:
  CF-16: PromotionCampaignCompleted MUST fire AFTER billing recorded (CF-17 sequence)
  CF-17: Billing cannot fire before window closes — partial ROI = invalid

MACHINE:
  ROI formula: roi = (conversions × avg_ticket_price) / campaign_cost
  Billing sequence: aggregate → validate → bill → PromotionCampaignCompleted
  Window close: after configurable period OR when event starts (whichever first)

FREEDOM:
  Attribution window duration (default: 7 days), prediction model weights,
  campaign metric labels (ES config doc)

IRON RULES:
  IR-1: Partial aggregation writes are idempotent. Re-aggregate = same result.
  IR-2: Billing MUST NOT fire before window closes. Early billing = BUILD FAILURE.
  IR-3: ROI formula is MACHINE. Admin cannot change calculation. Display is FREEDOM.
  IR-4: PromotionCampaignCompleted fires ONLY after billing recorded.
  IR-5: Prediction accuracy comparison: log predicted vs actual attendance for AF-11 feedback.
  IR-6: All calls pass traceparent (DNA-7).
  IR-7: All returns DataProcessResult<T>.

QUALITY GATES:
  QG-1: Window open/close — verify window opens on NotificationsSent, closes on schedule
  QG-2: Partial write recovery — crash during aggregation → resume produces same result
  QG-3: ROI calculation accuracy — known inputs → expected output
  QG-4: Billing sequence — billing before window close → BUILD FAILURE
  QG-5: Prediction feedback — predicted vs actual logged to AF-11
  QG-6: Event starts before window → window closes early with partial metrics
```

---

## FLOW-03 Flow Template

| # | Template ID | Task Types | Shape |
|---|------------|------------|-------|
| 13 | event-promotion-v1 | T59, T60, T61, T62 | Store→moderate→BFA→fork(index+analyze+status)→join→score→segment→fork(feed+impressions)→join→notify→async(aggregate+bill) |

---

## SAVE POINT (FINAL — POST FLOW-03 MERGE)
```
CATALOG_STATE.md
DATE: 2026-02-25
STATUS: MERGED (FLOW-03 content integrated)

TASK TYPES: 26 (7 original + 3 FLOW-05 + 3 FLOW-01 + 3 FLOW-02 + 6 FCE + 4 FLOW-03)
  T1-T7: Original catalog
  T8-T43: V40/V43 expansion
  T44-T46: FLOW-05 (Lesson Gamification)
  T47-T49: FLOW-01 (User Registration)
  T50-T52: FLOW-02 (Business Onboarding)
  T53-T58: FCE (Flow Creation Engine)
  T59-T62: FLOW-03 (Event Creation & Promotion) ← NEW

FAMILIES: 21
  1-18: Pre-existing
  19: Business Onboarding Intelligence (F182-F189)
  20: Flow Creation Engine (F190-F196)
  21: Event Promotion (F197-F204) ← NEW

FLOW TEMPLATES: 13
  1-10: Pre-existing
  11: business-onboarding-v1
  12: flow-creation-v1
  13: event-promotion-v1 ← NEW

NUMBERING CHAIN (continuous):
  T1...T43 → T44-T46 → T47-T49 → T50-T52 → T53-T58 → T59-T62
  Next: T63

SOURCE DOCUMENTS:
  FLOW-02: FCE_EXEC_P1_P5.md Phase 1 (T50-T52, Family 19)
  FCE: FCE_EXEC_P1_P5.md Phase 3 (T53-T58, Family 20)
  FLOW-03: FLOW03_ENGINE_EXTENSION_COMBINED.md (T59-T62, Family 21)

RESUME KEY: "Continue from FLOW-03 Integration — all task types current"
```

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# FLOW-04 EXTENSION — POST PUBLISHING & FEED DISTRIBUTION
# Merged: 2026-02-25 | Source: FLOW04_ENGINE_EXTENSION_v2.md
# Adds: Family 22, T63-T66, Flow Template 14
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Family 22: Post Publishing & Feed Distribution

| Property | Value |
|----------|-------|
| Family ID | 22 |
| Name | POST_PUBLISHING_DISTRIBUTION |
| Flow | FLOW-04 |
| Factory Range | F205-F212 |
| Task Types | T63-T66 |
| Flow Template | 14 (post-publishing-v1) |
| Total Methods | 34 |
| Fabric Layers Used | DATABASE, QUEUE, AI ENGINE, RAG |

---

## T63 — Post Content Analysis Pipeline

```
TASK TYPE: T63 — Post Content Analysis Pipeline
ARCHETYPE: SEQUENTIAL + FAN-OUT
ENTRY: POST /posts validated, F205 CreatePost committed with OutboxWriteAsync
PURPOSE: Process new post content through NLP analysis, publish PostAnalyzed event,
         and fan out PostCreated to Connection, Group, and Analytics services for
         parallel processing.
DISTINCT FROM:
  T59 (Event Processing Pipeline) — processes events, not posts; different NLP focus
  T53 (Flow DSL Compilation) — compiles flow definitions; T63 processes user content
  T47 (Multi-Path Auth) — auth routing; T63 is content analysis

FACTORY DEPENDENCIES: F205, F206 — resolved via CreateAsync()
FABRIC RESOLUTION:
  F205 → DATABASE FABRIC(MongoDB) + QUEUE FABRIC(Redis Streams)
  F206 → AI ENGINE FABRIC(Claude/Gemini) + DATABASE FABRIC(Redis, Elasticsearch)

AF CONFIGURATION:
  AF-1 Genesis:     Generate post analysis microservice on MicroserviceBase
  AF-2 Planning:    S1(validate+store+outbox) → S2(NLP analyze) → S3(fan-out PostCreated)
  AF-3 Prompt Lib:  NLP content analysis prompts (topic extraction, entity recognition)
  AF-4 RAG:         Skill 06/07 (AI providers), T59 (pipeline reuse), Skill 04 (outbox)
  AF-5 Multi-model: Claude for entities + Gemini for topics + DeepSeek for sentiment
  AF-6 Code Review: NLP timeout handling, graceful degradation path, sanitization
  AF-7 Compliance:  DNA-1 through DNA-7
  AF-8 Security:    Input sanitization (HTML/script injection), rate limit enforcement
  AF-9 Judge:       Validates all IRON RULES

BFA VALIDATION:
  Gate: User must be authenticated + profile complete (FLOW-01 prerequisite)
  Gate: Rate limit 10 posts/hour/user checked BEFORE OutboxWriteAsync
  Cross-check: PostCreated ≠ EventCreated (FLOW-03) — different domains (PASS)
  Cross-check: NLP analysis results cached separately from FLOW-03 event analysis

MACHINE:
  Rate limit: 10 posts/hour/user = MACHINE (no admin override; attempt = BUILD FAILURE)
  Content sanitization: strip HTML/script BEFORE storage (MACHINE)
  OutboxWriteAsync MUST be atomic: DB success + bus failure → event NOT published
  NLP failure mode: publish PostAnalyzed with { degraded: true } — never block pipeline
  Image-only posts: skip NLP text analysis, set type: "media_only"
  Unsupported language: fallback to basic keyword extraction

FREEDOM:
  Max post sizes (text chars, media MB), supported media types
  NLP model selection per content type
  Topic taxonomy categories, content type boost factors (poll boost)
  Configurable via ES: post-publishing-config/{tenantId}

IRON RULES:
  IR-1: OutboxWriteAsync MUST be atomic. DB fail = no event published.
  IR-2: Rate limit 10/hour/user = MACHINE. Making configurable = BUILD FAILURE.
  IR-3: Content sanitization BEFORE storage. Raw user input NEVER stored.
  IR-4: Duplicate postId = no-op. Idempotency key = postId+version.
  IR-5: PostAnalyzed MUST publish even when degraded. Blocking downstream = BUILD FAILURE.
  IR-6: Visibility = "private" → PostCreated event MUST NOT fan out to matching services.
  IR-7: All factory calls via CreateAsync(). No direct instantiation.
  IR-8: All returns DataProcessResult<T>. Throwing for business logic = BUILD FAILURE.

QUALITY GATES (AF-9):
  QG-1: Outbox atomicity — DB success + bus failure → event NOT published
  QG-2: Rate limit — 11th post in 1 hour → DataProcessResult(Error="RATE_LIMIT_EXCEEDED")
  QG-3: Sanitization — post with <script> → stored text has no <script>
  QG-4: NLP degradation — NLP service down → PostAnalyzed(degraded:true) published
  QG-5: Image-only — post with no text → PostAnalyzed(type:"media_only") published
  QG-6: Private visibility — private post → no fan-out to matching (integration test)
  QG-7: Idempotency — same postId twice → second = no-op
```

---

## T64 — Three-Way Audience Discovery

```
TASK TYPE: T64 — Three-Way Audience Discovery
ARCHETYPE: ORCHESTRATION (fork-join with timeout fallback)
ENTRY: PostCreated event triggers Connection + Group services immediately;
       PostAnalyzed event triggers Matching service. Join at Ranking Service.
PURPOSE: Run 3 parallel audience identification streams (business matching,
         social graph, group membership), join results with timeout fallback,
         and compile unified recipient list.
DISTINCT FROM:
  T40 (Three-Way Join Gate) — merges audience STREAMS; T64 DISCOVERS audiences then joins
  T60 (Multi-Factor Audience Scoring) — scores EVENT-user fit; T64 scores POST-user fit
  T44 (Fan-Out Scoring) — gamification points; T64 audience discovery
  T50 (Parallel Profile Enrichment) — enriches profiles; T64 discovers recipients

FACTORY DEPENDENCIES: F207, F208, F209, F210 — resolved via CreateAsync()
FABRIC RESOLUTION:
  F207 → DATABASE FABRIC(PostgreSQL + Elasticsearch) + AI ENGINE FABRIC(Claude)
  F208 → DATABASE FABRIC(Neo4j + PostgreSQL) + DATABASE FABRIC(Redis, cache)
  F209 → DATABASE FABRIC(PostgreSQL + MongoDB) + DATABASE FABRIC(Redis, cache)
  F210 → DATABASE FABRIC(Redis) + AI ENGINE FABRIC(Claude/Gemini)

AF CONFIGURATION:
  AF-1 Genesis:     Generate audience discovery services on MicroserviceBase
  AF-2 Planning:    PostCreated → fork(B1:Connections, B2:Groups) | PostAnalyzed → B3:Matching
                    → Join J1 (wait B1+B2+B3, 10s timeout) → Compile → Score
  AF-3 Prompt Lib:  Matching domain prompts (content-business alignment)
  AF-4 RAG:         T40 (3-way join reuse), T60 (scoring reuse), Skill 00b (vector)
  AF-5 Multi-model: Claude (semantic matching) vs Gemini (graph analysis)
  AF-6 Code Review: Join timeout handling, memory for 50K+ audiences, batch pagination
  AF-7 Compliance:  DNA-1 through DNA-7
  AF-8 Security:    Graph enumeration protection, privacy on connection graph
  AF-9 Judge:       Validates all IRON RULES

BFA VALIDATION:
  CF-18: ContentMatchingService (F207) ≠ EventMatchingService (FLOW-03 F198)
    Domain: FLOW-04 matches POST content to business profiles.
    Domain: FLOW-03 matches EVENT attributes to user preferences.
    Index isolation: FLOW-04 reads match_scores_posts, FLOW-03 reads match_scores_events. PASS.
  CF-19: SocialGraphService (F208) is READ-ONLY on graph data. No write conflicts. PASS.
  CF-20: CompositeRankingService (F210) ≠ FLOW-03 T60 AudienceScoring
    FLOW-04: 6-factor post-user scoring → ranking-post:{postId}
    FLOW-03: 5-factor event-user scoring → ranking-event:{eventId}. PASS.

MACHINE:
  Join semantics: TIMEOUT_THEN_FALLBACK
    Wait for ALL 3 streams. Per-stream timeout: 10s.
    If B3 (business) times out → proceed with B1+B2 only
    If ALL 3 timeout → GetFallbackRecipients (direct connections only)
  Correlation key: postId (all 3 streams keyed on postId)
  Connection types: direct_friend=1.0, second_degree=0.5, follower=0.3, following=0.4
  Match sub-factors: questionnaire=0.40, industry=0.30, size=0.15, location=0.15
  Batch sizes: matching=5000/batch, graph=5000/batch, groups=5000/batch
  visibility=connections_only → skip business matching entirely (MACHINE gate)

FREEDOM:
  Join timeout durations per stream, connection strength multipliers
  Group relevance thresholds, match sub-factor weights (if admin-override enabled)
  Configurable via ES: audience-discovery-config/{tenantId}

IRON RULES:
  IR-1: Join MUST have matching fork. 3 forks → 1 join (J1). Missing join = BUILD FAILURE.
  IR-2: Timeout fallback MUST exist. Join without timeout config = BUILD FAILURE.
  IR-3: Graph queries MUST NOT expose full friend list. Raw adjacency = BUILD FAILURE.
  IR-4: Batch size ≤ 5000. Unbounded queries = BUILD FAILURE.
  IR-5: visibility=connections_only → skip business matching. Bypass = BUILD FAILURE.
  IR-6: All factory calls via CreateAsync(). No direct instantiation.
  IR-7: All results DataProcessResult<T>. Throwing = BUILD FAILURE.
  IR-8: All calls pass traceparent (DNA-7). Missing = BUILD FAILURE.

QUALITY GATES (AF-9):
  QG-1: Join wait — 3 streams arrive within 10s → CompileRecipientList fires
  QG-2: Partial timeout — B3 times out → proceed with B1+B2, no business matches
  QG-3: Full timeout — all 3 timeout → fallback to direct connections only
  QG-4: Graph privacy — connection query → no full friend list in response
  QG-5: Connections-only — visibility=connections_only → no BusinessMatchesFound event
  QG-6: Batch compliance — 60K audience → ≤12 batches of 5000
  QG-7: Idempotency — same postId discovery twice → second = no-op
```

---

## T65 — Tiered Feed Distribution & Reordering

```
TASK TYPE: T65 — Tiered Feed Distribution & Reordering
ARCHETYPE: BATCH PROCESSING + WRITE-HEAVY DISTRIBUTION
ENTRY: Fires after RankingScoresCalculated event (T64 output)
PURPOSE: Distribute post into recipient feeds across 5 tiers with batch processing,
         apply diversity controls, reorder existing feeds, handle high-follower
         progressive batching, and support post edit/delete operations.
DISTINCT FROM:
  T61 (Multi-Channel Delivery) — delivers notifications; T65 writes to FEEDS
  T46 (Social Distribution) — distributes answers to learners; T65 distributes posts
  T65 adds DIVERSITY + REORDERING which T61/T46 do not.

FACTORY DEPENDENCIES: F211 — resolved via CreateAsync()
  Also consumes: F188 (FeedPersonalization, FLOW-02 read path — REUSE)
FABRIC RESOLUTION:
  F211 → DATABASE FABRIC(Redis Cluster) + DATABASE FABRIC(Elasticsearch) + QUEUE FABRIC(Redis Streams)
  F188 → DATABASE FABRIC(Redis) — REUSE from FLOW-02 (read path only)

AF CONFIGURATION:
  AF-1 Genesis:     Generate feed distribution microservice on MicroserviceBase
  AF-2 Planning:    S1(tier sort) → S2(batch distribute 500/batch) → S3(diversity check)
                    → S4(reorder feeds) → S5(publish events)
  AF-3 Prompt Lib:  Feed ranking, diversity optimization prompts
  AF-4 RAG:         T61 (delivery reuse), F201 (FLOW-03 ZADD pattern), Skill 04 (queue)
  AF-5 Multi-model: Not primary (no AI generation in distribution)
  AF-6 Code Review: Redis write throughput, batch atomicity, race conditions
  AF-7 Compliance:  DNA-1 through DNA-7
  AF-8 Security:    Visibility enforcement at feed level, idempotent writes
  AF-9 Judge:       Validates all IRON RULES

BFA VALIDATION:
  CF-21: PostFeedDistribution (F211) ≠ FeedInjection (FLOW-03 F201)
    F211: post distribution with diversity/reorder → feed:post:{userId}
    F201: event injection (simple ZADD) → feed:event:{userId}. PASS.
  CF-22: FeedReorder (F211.ReorderFeed) vs F188 read-path
    F211 = WRITE. F188 = READ. No conflict. PASS.
  CF-23: Concurrent posts same author → diversity controls limit to 2 in top 10. PASS.

MACHINE:
  Batch sizes: 500 feeds/batch distribution, 100 feeds/transaction cache
  Diversity controls: Max 2 posts/author in top 10 (MACHINE — non-negotiable)
                      Minimum 60% topic diversity in top 10
                      Mix: top 3 = 1 fresh + 2 engaging; top 10 = 3 fresh + 7 engaging
  Position formula: position = base × (1 - composite) + time_decay × 0.2 + diversity_penalty × 0.1
  Engagement boost: boost = log(1 + total_engagements) × 0.1
  Chronological decay: boost = e^(-hours_old / 24), decay_rate = 0.95/day
  Delivery timing: Direct connections=5s | Business matches (>0.6)=5min | Weak matches=hourly
  Idempotency: postId + feedId = update existing, never duplicate
  Post deletion: batch-remove from Redis, eventual consistency ≤ 5 min
  Post edit: update feed entries in-place, do NOT re-inject
  Mentioned users: premium tier regardless of composite score (MACHINE)
  High-follower (50K+): progressive batching (close connections first)
  Private visibility: MUST NOT appear in other users' feeds (MACHINE — non-negotiable)

FREEDOM:
  Diversity thresholds (A/B testable), engagement boost multiplier
  Batch sizes (within MACHINE maximums), delivery timing windows
  Cache TTLs (L1: 5min, L2: 30min, L3: 6h)
  Progressive batching thresholds, chronological vs ranked feed mode (A/B toggle)
  Configurable via ES: feed-distribution-config/{tenantId}

IRON RULES:
  IR-1: Visibility = private → NEVER in other feeds. Bypass = BUILD FAILURE.
  IR-2: Max 2 per author in top 10. Override attempt = BUILD FAILURE.
  IR-3: Batch size ≤ 500 feeds. Unbounded distribution = BUILD FAILURE.
  IR-4: Idempotent writes: same postId+feedId = update. Duplicate = BUILD FAILURE.
  IR-5: Post deletion → batch-remove. Feed showing deleted post > 5 min = SLA VIOLATION.
  IR-6: Post edit → in-place update only. Re-injection = BUILD FAILURE.
  IR-7: Mentioned users → premium tier. Missing mention handling = BUILD FAILURE.
  IR-8: All factory calls via CreateAsync(). Direct Redis = BUILD FAILURE.
  IR-9: All returns DataProcessResult<T>. Throwing = BUILD FAILURE.
  IR-10: All calls pass traceparent (DNA-7). Missing = BUILD FAILURE.
  IR-11: Feed update backlog > 5000 → emit backpressure alert. Missing = BUILD FAILURE.

QUALITY GATES (AF-9):
  QG-1: Privacy — private post → ZERO feed entries for other users
  QG-2: Diversity — 5 posts by same author → only 2 in top 10
  QG-3: Batch compliance — 3000 recipients → 6 batches of 500
  QG-4: Idempotency — distribute same post twice → same entries (count unchanged)
  QG-5: Deletion — delete post → removed from all feeds within 5 min
  QG-6: Edit — edit post → existing entries updated in-place, no new entries
  QG-7: Mentions — mentioned user → premium tier regardless of composite score
  QG-8: High-follower — 50K+ audience → progressive batching (close connections first)
  QG-9: Backpressure — backlog > 5000 → alert emitted
```

---

## T66 — Distribution Analytics & Completion

```
TASK TYPE: T66 — Distribution Analytics & Completion
ARCHETYPE: AGGREGATION
ENTRY: Fires after FeedsUpdated + FeedsReordered events confirmed
PURPOSE: Aggregate distribution metrics (reach, impressions, tier breakdown,
         latency), track SLA compliance, publish PostDistributionCompleted,
         and notify post creator.
DISTINCT FROM:
  T62 (Promotion Campaign Aggregation) — aggregates event promotion over 7+ days;
       T66 aggregates single post distribution in seconds/minutes
  T46 (Social Distribution) — distributes content; T66 only MEASURES distribution

FACTORY DEPENDENCIES: F212 — resolved via CreateAsync()
FABRIC RESOLUTION:
  F212 → DATABASE FABRIC(Elasticsearch) + QUEUE FABRIC(Redis Streams)

AF CONFIGURATION:
  AF-1 Genesis:     Generate analytics microservice on MicroserviceBase
  AF-2 Planning:    S1(track updates) → S2(track reorders) → S3(aggregate) → S4(completion)
  AF-3 Prompt Lib:  Analytics aggregation prompts
  AF-4 RAG:         T62 (aggregation reuse), Skill 04 (event patterns)
  AF-5 Multi-model: Not used (pure aggregation, no AI)
  AF-6 Code Review: Time-series index performance, metric cardinality
  AF-7 Compliance:  DNA-1 through DNA-7
  AF-8 Security:    No PII in metrics (userId hashed in analytics)
  AF-9 Judge:       Validates all IRON RULES

BFA VALIDATION:
  CF-24: DistributionAnalytics (F212) ≠ CampaignAnalytics (FLOW-03 F204)
    F212: single post metrics → distribution-metrics-posts (seconds lifecycle)
    F204: campaign aggregation → campaign-metrics-events (7+ day lifecycle). PASS.
  CF-25: PostDistributionCompleted ≠ FLOW-03 EventPromotionCompleted
    Different event domains, different payload schemas. PASS.

MACHINE:
  Metrics: reach, impressions, distributionTime, tierBreakdown,
           averagePosition, latency, feedsUpdated, feedsReordered
  Completion gate: PostDistributionCompleted fires ONLY after BOTH
    FeedsUpdated AND FeedsReordered confirmed. Missing either = WAIT.
  SLA alert: total distribution > 30s → SLA_BREACH alert (MACHINE threshold)
  NLP time > 5s → NLP_SLA_BREACH | Post creation > 3s → POST_CREATE_SLA_BREACH

FREEDOM:
  Metric retention periods, alert thresholds (beyond MACHINE minimums)
  Aggregation intervals, report formats, notification templates
  Configurable via ES: analytics-config/{tenantId}

IRON RULES:
  IR-1: PostDistributionCompleted MUST NOT fire without BOTH FeedsUpdated and FeedsReordered.
  IR-2: SLA 30s threshold = MACHINE. Making configurable below 30s = BUILD FAILURE.
  IR-3: No PII in analytics. userId must be hashed. Plain userId in metrics = BUILD FAILURE.
  IR-4: Idempotency: same postId metrics twice → update, not duplicate.
  IR-5: All factory calls via CreateAsync(). No direct Elasticsearch = BUILD FAILURE.
  IR-6: All returns DataProcessResult<T>. Throwing = BUILD FAILURE.
  IR-7: All calls pass traceparent (DNA-7). Missing = BUILD FAILURE.

QUALITY GATES (AF-9):
  QG-1: Completion gate — FeedsUpdated but no FeedsReordered → NO completion event
  QG-2: SLA tracking — distribution takes 35s → SLA_BREACH alert emitted
  QG-3: PII check — analytics index → no plain userId anywhere
  QG-4: Idempotency — same metrics submitted twice → single entry (updated)
  QG-5: Metric completeness — completion event has all 8 required metrics
```

---

## FLOW-04 AF Station Map (11 Stations × 4 Contracts)

| Station | T63 (Content Analysis) | T64 (Audience Discovery) | T65 (Feed Distribution) | T66 (Analytics) |
|---------|----------------------|------------------------|----------------------|----------------|
| AF-1 Genesis | Post analysis service on MSBase | Audience discovery services on MSBase | Feed distribution service on MSBase | Analytics service on MSBase |
| AF-2 Planning | validate→store→outbox→NLP→fan-out | fork(B1:conn,B2:groups)+B3:matching→J1→compile→score | tier-sort→batch(500)→diversity→reorder→events | track-updates→track-reorders→aggregate→completion |
| AF-3 Prompt Lib | NLP analysis, topic extraction | Content-business alignment, graph queries | Feed ranking, diversity optimization | Analytics aggregation |
| AF-4 RAG | Skill 06/07 (AI), T59 (pipeline), Skill 04 (outbox) | T40 (3-way join), T60 (scoring), Skill 00b (vector) | T61 (delivery), F201 (ZADD), Skill 04 (queue) | T62 (aggregation), Skill 04 (events) |
| AF-5 Multi-model | Claude(entities)+Gemini(topics)+DeepSeek(sentiment) | Claude(semantic) vs Gemini(graph) | — (no AI) | — (pure aggregation) |
| AF-6 Code Review | NLP timeout, degradation, sanitization | Join timeout, 50K+ memory, pagination | Redis write throughput, batch atomicity | Time-series index, metric cardinality |
| AF-7 Compliance | DNA-1→DNA-7 | DNA-1→DNA-7 | DNA-1→DNA-7 | DNA-1→DNA-7 |
| AF-8 Security | Input sanitization, rate limit, injection | Graph enumeration, privacy, connection hiding | Visibility enforcement, idempotent writes | No PII in metrics (userId hashed) |
| AF-9 Judge | IR-1→IR-8, QG-1→QG-7 | IR-1→IR-8, QG-1→QG-7 | IR-1→IR-11, QG-1→QG-9 | IR-1→IR-7, QG-1→QG-5 |
| AF-10 Merge | Best NLP model output | Best matching algorithm output | N/A | N/A |
| AF-11 Feedback | NLP accuracy → improve analysis | Match quality → improve weights | Distribution speed → optimize batching | SLA compliance → refine thresholds |

---

## Flow Template 14: post-publishing-v1

```json
{
  "flowId": "FLOW-04",
  "templateId": "post-publishing-v1",
  "templateNumber": 14,
  "version": "1.0",
  "name": "Post Publishing & Feed Distribution",
  "entryPoint": "POST /posts",
  "prerequisites": ["UserAuthenticated", "ProfileComplete", "FLOW-01:UserOnboardingCompleted"],
  "nodes": [
    { "id": "post_create", "type": "trigger", "factoryRef": "F205:IPostContentService",
      "fabricResolution": "DATABASE_FABRIC(MongoDB)+QUEUE_FABRIC(Redis_Streams)",
      "operation": "CreatePost", "outputs": ["PostCreated"] },
    { "id": "nlp_analysis", "type": "task", "factoryRef": "F206:INlpAnalysisService",
      "fabricResolution": "AI_ENGINE_FABRIC(Claude/Gemini)+DATABASE_FABRIC(Redis,ES)",
      "operation": "AnalyzeContent", "inputs": ["PostCreated"], "outputs": ["PostAnalyzed"],
      "failureMode": "DEGRADE", "degradedOutput": { "degraded": true, "topics": [] } },
    { "id": "business_matching", "type": "task", "factoryRef": "F207:IContentMatchingService",
      "fabricResolution": "DATABASE_FABRIC(PG+ES)+AI_ENGINE_FABRIC(Claude)",
      "operation": "FindBusinessMatches", "inputs": ["PostAnalyzed"],
      "outputs": ["BusinessMatchesFound"], "skipCondition": "post.visibility=='connections_only'" },
    { "id": "connection_graph", "type": "task", "factoryRef": "F208:ISocialGraphService",
      "fabricResolution": "DATABASE_FABRIC(Neo4j+PG)+DATABASE_FABRIC(Redis)",
      "operation": "GetFriendGraph", "inputs": ["PostCreated"], "outputs": ["FriendConnectionsFound"] },
    { "id": "group_membership", "type": "task", "factoryRef": "F209:IGroupMembershipService",
      "fabricResolution": "DATABASE_FABRIC(PG+MongoDB)+DATABASE_FABRIC(Redis)",
      "operation": "BatchGroupMatch", "inputs": ["PostCreated"], "outputs": ["GroupConnectionsFound"] },
    { "id": "ranking_join", "type": "join", "factoryRef": "F210:ICompositeRankingService",
      "fabricResolution": "DATABASE_FABRIC(Redis)+AI_ENGINE_FABRIC(Claude/Gemini)",
      "operation": "CompileRecipientList", "joinStrategy": "TIMEOUT_THEN_FALLBACK",
      "joinTimeout": "10s", "requiredInputs": ["FriendConnectionsFound","GroupConnectionsFound"],
      "optionalInputs": ["BusinessMatchesFound"], "fallbackOperation": "GetFallbackRecipients",
      "outputs": ["RecipientListCompiled"] },
    { "id": "scoring", "type": "task", "factoryRef": "F210:ICompositeRankingService",
      "operation": "CalculateCompositeScores", "inputs": ["RecipientListCompiled"],
      "outputs": ["RankingScoresCalculated"] },
    { "id": "feed_distribution", "type": "task", "factoryRef": "F211:IPostFeedDistributionService",
      "fabricResolution": "DATABASE_FABRIC(Redis_Cluster+ES)+QUEUE_FABRIC(Redis_Streams)",
      "operation": "DistributeToFeeds", "inputs": ["RankingScoresCalculated"],
      "outputs": ["FeedsUpdated"], "batchConfig": { "size": 500, "parallelism": 4 } },
    { "id": "feed_reorder", "type": "task", "factoryRef": "F211:IPostFeedDistributionService",
      "operation": "ReorderFeed", "inputs": ["FeedsUpdated"], "outputs": ["FeedsReordered"] },
    { "id": "analytics_completion", "type": "terminal", "factoryRef": "F212:IDistributionAnalyticsService",
      "fabricResolution": "DATABASE_FABRIC(ES)+QUEUE_FABRIC(Redis_Streams)",
      "operation": "AggregateMetrics", "inputs": ["FeedsUpdated","FeedsReordered"],
      "outputs": ["PostDistributionCompleted"], "completionGate": "BOTH_REQUIRED" }
  ],
  "edges": [
    { "from": "post_create", "to": "nlp_analysis", "trigger": "PostCreated" },
    { "from": "post_create", "to": "connection_graph", "trigger": "PostCreated" },
    { "from": "post_create", "to": "group_membership", "trigger": "PostCreated" },
    { "from": "nlp_analysis", "to": "business_matching", "trigger": "PostAnalyzed" },
    { "from": "business_matching", "to": "ranking_join", "trigger": "BusinessMatchesFound" },
    { "from": "connection_graph", "to": "ranking_join", "trigger": "FriendConnectionsFound" },
    { "from": "group_membership", "to": "ranking_join", "trigger": "GroupConnectionsFound" },
    { "from": "ranking_join", "to": "scoring", "trigger": "RecipientListCompiled" },
    { "from": "scoring", "to": "feed_distribution", "trigger": "RankingScoresCalculated" },
    { "from": "feed_distribution", "to": "feed_reorder", "trigger": "FeedsUpdated" },
    { "from": "feed_distribution", "to": "analytics_completion", "trigger": "FeedsUpdated" },
    { "from": "feed_reorder", "to": "analytics_completion", "trigger": "FeedsReordered" }
  ],
  "correlationKey": "postId",
  "machineConfig": {
    "rateLimitPerHour": 10, "joinTimeoutSeconds": 10, "maxBatchSize": 500,
    "diversityMaxPerAuthor": 2, "diversityTopicMin": 0.60, "slaMaxDistributionSeconds": 30
  }
}
```

---

## MERGE04:P1 STATE SAVE
```
MERGE04:P1 = COMPLETE
Target: TASK_TYPES_CATALOG_MERGED.md
Added: T63, T64, T65, T66 (4 full-format contracts)
Added: Family 22 header, Flow Template 14
System: 22 families, T1-T66, 14 flow templates
Next: MERGE04:P2 → ENGINE_ARCHITECTURE_MERGED.md
```


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# FLOW-05 EXTENSION — TASK TYPES: FAMILY 23 + FAMILY 24
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Family 23: T67-T69 (Gamification Hardening — integrity/governance/experimentation)
# Family 24: T70-T71 (Engagement Service Layer — peer review/sync compute)
# Flow Template 15: lesson-gamification-v2
# AF Station Map: 11×5 = 55 cells

---

# ═══════════════════════════════════════════════════════
# FAMILY 23: GAMIFICATION HARDENING (T67-T69)
# ═══════════════════════════════════════════════════════

## TASK TYPE: T67 — Gamification Integrity Gate

**ARCHETYPE:** VALIDATION (periodic audit + anomaly detection + DLQ recovery)

**ENTRY:**
```
CRON: daily 03:00 UTC (reconciliation scheduled run)
EVENT: anomaly.detected (from F214 telemetry — triggered integrity check)
EVENT: gamification.*.dlq (DLQ threshold exceeded — triggers recovery)
TaskRequest.intent: gamification_integrity_audit
```

**PURPOSE:**
Audit gamification data integrity through three complementary mechanisms:
(1) F213 periodic reconciliation of points/streaks/achievements across InfluxDB and MongoDB,
(2) F214 anomaly detection analyzing behavioral telemetry for point farming and grading spam,
(3) F217 dead-letter queue recovery replaying failed gamification events with retry limits.
This task type ensures FLOW-05 gamification data remains trustworthy over time.

**DISTINCT FROM:**
- T44 (Fan-Out Scoring, Family 17) — T44 AWARDS points on the happy path; T67 AUDITS them after the fact
- T71 (Sync Compute, Family 24) — T71 GATES requests before action (real-time); T67 VALIDATES after action (batch)
- T68 (Event Governance) — T68 validates event SCHEMAS; T67 validates gamification DATA integrity

**FACTORY DEPENDENCIES:**

| Factory | Interface | Fabric Resolution |
|---------|-----------|-------------------|
| F213 | IReconciliationService | DATABASE FABRIC (InfluxDB+MongoDB+Redis+ES) + QUEUE FABRIC (Redis Streams) |
| F214 | IAnomalyDetectionService | AI ENGINE FABRIC (Claude/Gemini) + DATABASE FABRIC (ES+Redis) + QUEUE FABRIC |
| F217 | IGamificationRecoveryService | QUEUE FABRIC (DLQ) + DATABASE FABRIC (MongoDB+ES) |

All resolved via `_factory.CreateAsync<T>()` with config-first routing.

**AF CONFIGURATION:**

| Station | T67 Mapping |
|---------|-------------|
| AF-1 Genesis | Generate integrity orchestrator combining reconciliation, anomaly, and recovery on DB+QUEUE+AI fabrics |
| AF-2 Planning | Decompose: reconciliation-audit → anomaly-scan → dlq-recovery → report-generation |
| AF-3 Prompt Library | Integrity domain: reconciliation patterns, anomaly detection thresholds, DLQ replay strategies |
| AF-4 RAG | T44 (gamification scoring patterns), Skill 05 (multi-DB read patterns), Skill 04 (DLQ consumer), Skill 07 (AI anomaly) |
| AF-5 Multi-model | Used for F214 anomaly detection — competing Claude/Gemini pattern analysis |
| AF-6 Code Review | Read-only enforcement verification, retry limit correctness, log-before-replay ordering |
| AF-7 Compliance | DNA-1 through DNA-7; verify read-only capability flag on F213 |
| AF-8 Security | Verify F213 cannot write to production indices; verify DLQ replay cannot bypass anti-abuse |
| AF-9 Judge | 10 Iron Rules + 8 Quality Gates (see below) |
| AF-10 Merge | Used if F214 runs multi-model anomaly detection (consensus result) |
| AF-11 Feedback | Discrepancy rates, anomaly false-positive rate, DLQ recovery success rate, audit duration |

**IRON RULES:**

| IR | Rule | Violation = |
|----|------|------------|
| IR-1 | F213 MUST access production data stores as READ-ONLY. No StoreDocument on production indices | BUILD FAILURE |
| IR-2 | Discrepancies are LOGGED and ALERTED, NEVER auto-corrected | BUILD FAILURE |
| IR-3 | Reconciliation audit log (reconciliation_audit) is append-only — no update or delete | BUILD FAILURE |
| IR-4 | F214 anomaly detection MUST be async — NEVER block user-facing operations | BUILD FAILURE |
| IR-5 | F214 → F219/F221 telemetry flow is ONE-DIRECTIONAL. F214 never writes back to gates (DR-7) | BUILD FAILURE |
| IR-6 | F217 DLQ retry max = 3 (MACHINE ceiling). Unrecoverable events escalated, NEVER dropped silently | BUILD FAILURE |
| IR-7 | F217 log-before-replay: every replay attempt logged BEFORE re-enqueue to main queue | BUILD FAILURE |
| IR-8 | DLQ replay preserves original correlationId + adds recovery metadata (traceability) | BUILD FAILURE |
| IR-9 | Reconciliation lock: distributed Redis lock prevents concurrent audits per tenant | BUILD FAILURE |
| IR-10 | All methods return DataProcessResult\<T\> — no exceptions thrown for business logic | BUILD FAILURE |

**QUALITY GATES (AF-9):**

| QG | Gate | Level |
|----|------|-------|
| QG-1 | Generated orchestrator extends MicroserviceBase (DNA-4) | Mandatory |
| QG-2 | F213 FactoryResolutionContext includes "read_only" capability flag | Mandatory |
| QG-3 | F213 method signatures contain no write methods (no StoreDocument) | Mandatory |
| QG-4 | F214 consumes from telemetry stream only — producer/consumer registry verified | Mandatory |
| QG-5 | F217 retry counter persisted (survives service restart) | Mandatory |
| QG-6 | F217 escalation path verified for unrecoverable events | Mandatory |
| QG-7 | Reconciliation report includes: total audited, discrepancies found, resolution status | Mandatory |
| QG-8 | All three mechanisms (reconciliation + anomaly + recovery) independently testable | Mandatory |

**MACHINE / FREEDOM:**

```
MACHINE (non-negotiable):
  - Read-only access for F213 (never auto-correct)
  - Max 3 DLQ retries for F217 (prevents infinite loops)
  - Log-before-replay ordering (audit trail)
  - One-directional telemetry flow (DR-7)
  - Append-only reconciliation audit log
  - Distributed lock for concurrent audit prevention

FREEDOM (ES config, admin-configurable):
  - Reconciliation schedule (cron expression)
  - Anomaly detection sensitivity (low/medium/high)
  - DLQ processing interval
  - Discrepancy tolerance threshold
  - Alert routing channels
  - Recovery batch size (up to 100 ceiling)
```

**BFA VALIDATION:**
- ENTITIES: ReconciliationAudit, AnomalyEvent, DlqRecoveryLog
- EVENTS: ReconciliationComplete, AnomalyDetected, DlqEventReplayed, DlqEventEscalated
- CROSS-FLOW CHECKS:
  - CF-26 (F213 read-only vs F166 write)
  - CF-27 (F214 anomaly → telemetry, complementary not duplicate)
  - CF-28 (F217 DLQ replay goes through anti-abuse gate)

---

## TASK TYPE: T68 — Event Governance Gate

**ARCHETYPE:** GOVERNANCE (schema validation + backward compatibility enforcement)

**ENTRY:**
```
EVENT: Any FLOW-05 domain event requiring schema validation
PIPELINE: CI/CD gate — validates new event schemas before deployment
TaskRequest.intent: event_schema_governance
```

**PURPOSE:**
Enforce CloudEvents JSON envelope standard and schema versioning on all FLOW-05 domain
events. Validates event payloads at runtime against registered schemas, checks backward
compatibility of schema changes at deployment time, and rejects non-conforming events
with logging. This prevents contract drift across the many services in FLOW-05.

**DISTINCT FROM:**
- T67 (Gamification Integrity) — T67 validates gamification DATA correctness; T68 validates event SCHEMA correctness
- T70 (Peer Review, Family 24) — T70 orchestrates engagement flow; T68 validates the EVENTS that T70 produces
- T55 (Event Reliability, FCE) — T55 provides event infrastructure; T68 provides schema governance ON TOP of T55

**FACTORY DEPENDENCIES:**

| Factory | Interface | Fabric Resolution |
|---------|-----------|-------------------|
| F215 | IEventSchemaRegistryService | DATABASE FABRIC (ES+Redis) + QUEUE FABRIC (Redis Streams) |

Resolved via `_factory.CreateAsync<T>()` with config-first routing.

**AF CONFIGURATION:**

| Station | T68 Mapping |
|---------|-------------|
| AF-1 Genesis | Generate schema validation middleware on DB+QUEUE fabrics (F215 wired) |
| AF-2 Planning | Decompose: schema-lookup → cache-check → validate-payload → log-result → reject-or-pass |
| AF-3 Prompt Library | Schema governance domain: CloudEvents patterns, semver versioning, compatibility checks |
| AF-4 RAG | T55 (event reliability, FCE), Skill 05 (ES index patterns), Skill 04 (queue consumer patterns) |
| AF-5 Multi-model | Not used — deterministic schema validation logic |
| AF-6 Code Review | Schema validation completeness, cache invalidation correctness, backward compat logic |
| AF-7 Compliance | DNA-1 through DNA-7; verify CloudEvents envelope mandatory |
| AF-8 Security | Schema injection prevention, validator bypass prevention |
| AF-9 Judge | 8 Iron Rules + 6 Quality Gates (see below) |
| AF-10 Merge | Not used — single model generation |
| AF-11 Feedback | Validation pass rate, schema cache hit rate, backward compat rejection rate |

**IRON RULES:**

| IR | Rule | Violation = |
|----|------|------------|
| IR-1 | CloudEvents JSON envelope mandatory for ALL FLOW-05 events | BUILD FAILURE |
| IR-2 | Schema versioning follows semver: major=breaking, minor=additive, patch=fix | BUILD FAILURE |
| IR-3 | New schemas MUST pass backward compatibility check (additive only for minor versions) | BUILD FAILURE |
| IR-4 | Failed validation = event REJECTED + logged to schema.validation.failed stream | BUILD FAILURE |
| IR-5 | Schema cache invalidation: on schema update, Redis cache entry deleted (not stale) | BUILD FAILURE |
| IR-6 | Validation in strict mode blocks non-conforming events; warn mode logs without blocking | BUILD FAILURE |
| IR-7 | All FLOW-05 events must include: specversion, type, source, id, time (CloudEvents required) | BUILD FAILURE |
| IR-8 | All methods return DataProcessResult\<T\> — no exceptions thrown for business logic | BUILD FAILURE |

**QUALITY GATES (AF-9):**

| QG | Gate | Level |
|----|------|-------|
| QG-1 | Generated service extends MicroserviceBase (DNA-4) | Mandatory |
| QG-2 | CloudEvents envelope validation covers all 5 required attributes | Mandatory |
| QG-3 | Schema cache invalidation tested (update → subsequent lookup returns new schema) | Mandatory |
| QG-4 | Backward compatibility check correctly identifies breaking changes | Mandatory |
| QG-5 | Failed validation events routed to schema.validation.failed stream | Mandatory |
| QG-6 | Schema registration includes version metadata and is idempotent | Mandatory |

**MACHINE / FREEDOM:**

```
MACHINE:
  - CloudEvents envelope mandatory (specversion, type, source, id, time)
  - Semver schema versioning
  - Backward compatibility enforcement (additive only for minor)
  - Rejected events logged to failure stream

FREEDOM (ES config):
  - schema_validation_mode (strict/warn/disabled)
  - schema_cache_ttl_seconds (default: 300)
  - backward_compat_check_enabled (default: true)
```

**BFA VALIDATION:**
- ENTITIES: EventSchema, SchemaVersion, ValidationResult
- EVENTS: SchemaValidationFailed, SchemaRegistered, SchemaVersionConflict
- CROSS-FLOW CHECKS:
  - CF-29 (schema changes must be backward compatible — additive only)
  - CF-30 (schema validation applies to ALL FLOW-05 events, including T70/T71)

---

## TASK TYPE: T69 — Adaptive Experimentation Gate

**ARCHETYPE:** EXPERIMENTATION (A/B testing + adaptive difficulty + outcome tracking)

**ENTRY:**
```
EVENT: QuestionnaireAnswered (triggers difficulty recalculation)
EVENT: ExperimentOutcomeRecorded (triggers variant evaluation)
CRON: weekly experiment report generation
TaskRequest.intent: adaptive_experimentation
```

**PURPOSE:**
Manage A/B experiments on FLOW-05 gamification parameters (point values, streak bonuses,
grading rules) through F216 feature flags, and adapt lesson difficulty through F218 ML-based
analysis. Ensures experiments only target FREEDOM parameters (never MACHINE constraints)
and enforces safety guardrails (control group minimum, sample size).

**DISTINCT FROM:**
- T67 (Gamification Integrity) — T67 audits data AFTER the fact; T69 configures experiments BEFORE
- T44 (Fan-Out Scoring, Family 17) — T44 uses current point values; T69 determines WHICH point values via A/B
- T70 (Peer Review, Family 24) — T70 executes engagement; T69 experiments with engagement parameters

**FACTORY DEPENDENCIES:**

| Factory | Interface | Fabric Resolution |
|---------|-----------|-------------------|
| F216 | IFeatureFlagService | DATABASE FABRIC (ES+Redis) |
| F218 | IAdaptiveDifficultyService | AI ENGINE FABRIC (Claude/Gemini) + DATABASE FABRIC (MongoDB+ES+Redis) |

All resolved via `_factory.CreateAsync<T>()` with config-first routing.

**AF CONFIGURATION:**

| Station | T69 Mapping |
|---------|-------------|
| AF-1 Genesis | Generate experimentation orchestrator on DB+AI fabrics (F216/F218 wired) |
| AF-2 Planning | Decompose: variant-assignment → parameter-resolution → difficulty-calc → outcome-tracking |
| AF-3 Prompt Library | Experimentation domain: A/B testing patterns, multi-armed bandit, difficulty scaling |
| AF-4 RAG | T44 (gamification scoring), Skill 07 (AI provider patterns), Skill 05 (ES config patterns) |
| AF-5 Multi-model | Used for F218 difficulty analysis — competing model assessment |
| AF-6 Code Review | Deterministic variant assignment, control group enforcement, difficulty bounds |
| AF-7 Compliance | DNA-1 through DNA-7; verify experiments target FREEDOM only |
| AF-8 Security | Experiment cannot modify MACHINE constraints; difficulty cannot drop required modules |
| AF-9 Judge | 8 Iron Rules + 6 Quality Gates (see below) |
| AF-10 Merge | Used if F218 runs multi-model difficulty analysis (consensus) |
| AF-11 Feedback | Experiment lift metrics, difficulty adjustment impact on completion rates |

**IRON RULES:**

| IR | Rule | Violation = |
|----|------|------------|
| IR-1 | Experiments MUST target FREEDOM parameters only. Targeting MACHINE params → rejected (DR-8) | BUILD FAILURE |
| IR-2 | Control group minimum: 20% of experiment population (meaningful baseline required) | BUILD FAILURE |
| IR-3 | Variant assignment is deterministic: hash(userId + experimentId) % 100 → same bucket always | BUILD FAILURE |
| IR-4 | Max 3 difficulty changes per adaptation, min 2 lessons between adaptations (spec constraint) | BUILD FAILURE |
| IR-5 | Difficulty adaptation MUST validate safety (F218.ValidateAdaptationSafetyAsync) before applying | BUILD FAILURE |
| IR-6 | Required curriculum modules can NEVER be skipped by difficulty adaptation | BUILD FAILURE |
| IR-7 | Safe defaults on ML failure: maintain current difficulty, log error, continue without change | BUILD FAILURE |
| IR-8 | All methods return DataProcessResult\<T\> — no exceptions thrown for business logic | BUILD FAILURE |

**QUALITY GATES (AF-9):**

| QG | Gate | Level |
|----|------|-------|
| QG-1 | Generated service extends MicroserviceBase (DNA-4) | Mandatory |
| QG-2 | Experiment registration rejects MACHINE parameter targets | Mandatory |
| QG-3 | Control group ≥ 20% verified in experiment creation | Mandatory |
| QG-4 | Variant assignment deterministic (same user → same variant across calls) | Mandatory |
| QG-5 | F218 safe defaults: ML failure does not change difficulty | Mandatory |
| QG-6 | Required module protection: adaptation cannot skip required modules | Mandatory |

**MACHINE / FREEDOM:**

```
MACHINE:
  - Experiments target FREEDOM only (DR-8)
  - Control group ≥ 20%
  - Deterministic variant assignment (hash-based)
  - Max 3 changes per adaptation, min 2 lessons between
  - Required module protection
  - Safe defaults on ML failure

FREEDOM (ES config):
  - Experiment definitions (parameters to test, variant percentages)
  - Experiment duration (default: 14 days)
  - Minimum sample size (default: 1000)
  - Difficulty levels (default: 5)
  - Adaptation sensitivity (low/medium/high)
  - Score thresholds for difficulty adjustment
```

**BFA VALIDATION:**
- ENTITIES: Experiment, ExperimentVariant, DifficultyLevel, AdaptationRecord
- EVENTS: ExperimentStarted, VariantAssigned, OutcomeRecorded, DifficultyAdjusted
- CROSS-FLOW CHECKS:
  - CF-31 (experiments cannot modify MACHINE constraints)
  - CF-32 (variant assignment must be consistent across services)
  - CF-33 (difficulty adaptation ≠ curriculum adaptation — different scopes)

---

# ═══════════════════════════════════════════════════════
# AF STATION MAP — FAMILY 23 (T67+T68+T69) — 11×3 = 33 CELLS
# ═══════════════════════════════════════════════════════

| AF Station | T67 — Integrity | T68 — Event Governance | T69 — Experimentation |
|------------|----------------|----------------------|----------------------|
| **AF-1 Genesis** | Integrity orchestrator on DB+QUEUE+AI | Schema middleware on DB+QUEUE | Experimentation orchestrator on DB+AI |
| **AF-2 Planning** | reconcile → anomaly → recovery → report | lookup → cache → validate → log | assign → resolve → difficulty → track |
| **AF-3 Prompt** | Reconciliation, anomaly, DLQ replay | CloudEvents, semver, compat | A/B testing, multi-arm bandit, difficulty |
| **AF-4 RAG** | T44, Skill 05 multi-DB, Skill 04 DLQ, Skill 07 | T55, Skill 05 ES, Skill 04 queue | T44, Skill 07 AI, Skill 05 ES |
| **AF-5 Multi-model** | F214 anomaly (competing) | NOT USED | F218 difficulty (competing) |
| **AF-6 Code Review** | Read-only, retry limits, log ordering | Schema completeness, cache invalidation | Deterministic assignment, bounds |
| **AF-7 Compliance** | DNA-1..7; read_only cap flag | DNA-1..7; CloudEvents mandatory | DNA-1..7; FREEDOM-only targeting |
| **AF-8 Security** | No prod writes; DLQ no abuse bypass | Schema injection; validator bypass | No MACHINE experiment; no module skip |
| **AF-9 Judge** | 10 IRs + 8 QGs | 8 IRs + 6 QGs | 8 IRs + 6 QGs |
| **AF-10 Merge** | F214 multi-model consensus | NOT USED | F218 multi-model consensus |
| **AF-11 Feedback** | Discrepancy rate, FP rate, DLQ success | Validation pass %, cache hit % | Experiment lift, difficulty impact |

# ═══════════════════════════════════════════════════════
# FAMILY 24: ENGAGEMENT SERVICE LAYER (T70-T71)
# ═══════════════════════════════════════════════════════

# ═══════════════════════════════════════════════════════
# TASK TYPE: T70 — Peer Review & Engagement Gate
# ═══════════════════════════════════════════════════════

**ARCHETYPE:** ORCHESTRATION (event-driven engagement loop with aggregation)

**ENTRY:**
```
EVENT: QuestionnairePostDistributed  (from T46 social branch output)
EVENT: AnswerGraded                  (from F219 → engagement stream)
EVENT: AnswerCommented               (from F220 → engagement stream)
TaskRequest.intent: peer_review_engagement
```

**PURPOSE:**
Orchestrate peer grading submission, pseudonymity enforcement, categorized comment
management, social points aggregation via tumbling window, and engagement feedback
routing back to gamification — completing the "learn and share" community loop
described in the FLOW-05 specification.

**DISTINCT FROM:**
- T46 (Social Distribution) — T46 distributes questionnaire posts to feeds; T70 manages ENGAGEMENT after distribution
- T44 (Fan-Out Scoring) — T44 awards completion points; T70 awards SOCIAL engagement points (CF-34, DR-11)
- T68 (Event Governance, Family 23) — T68 validates event schemas; T70 orchestrates the engagement flow
- T69 (Adaptive Experimentation, Family 23) — T69 evaluates A/B variants; T70 uses those variants via F216

**FACTORY DEPENDENCIES:**

| Factory | Interface | Fabric Resolution |
|---------|-----------|-------------------|
| F219 | IGradingService | DATABASE FABRIC (MongoDB+Redis) + QUEUE FABRIC (Redis Streams) |
| F220 | ICommentService | DATABASE FABRIC (MongoDB+Redis) + QUEUE FABRIC (Redis Streams) |
| F221 | IAntiAbuseGateService | DATABASE FABRIC (Redis+ES) + QUEUE FABRIC (Redis Streams) |
| F223 | IEngagementFeedbackService | DATABASE FABRIC (Redis+ES) + QUEUE FABRIC (Redis Streams) |

All resolved via `_factory.CreateAsync<T>()` with config-first routing.

**AF CONFIGURATION:**

| Station | T70 Mapping |
|---------|-------------|
| AF-1 Genesis | Generate engagement orchestrator service on DB+QUEUE fabrics; uses F219/F220/F221/F223 via CreateAsync |
| AF-2 Planning | Decompose: anti-abuse-check → grade/comment-submit → aggregate-in-window → route-to-gamification |
| AF-3 Prompt Library | Engagement domain prompts: grading patterns, comment moderation, social points tumbling window |
| AF-4 RAG | T46 (social distribution reuse), Skill 04 (queue consumer patterns), T44 (gamification routing), Skill 05 (MongoDB unique index patterns) |
| AF-5 Multi-model | Not used — deterministic aggregation logic |
| AF-6 Code Review | Rate limit implementation correctness, pseudonymity gate logic, tumbling window flush accuracy |
| AF-7 Compliance | DNA-1 through DNA-7 check; no typed models, all DataProcessResult\<T\> |
| AF-8 Security | Pseudonymity verification (never expose below threshold), grade manipulation prevention, comment injection/XSS |
| AF-9 Judge | 10 Iron Rules + 8 Quality Gates (see below) |
| AF-10 Merge | Not used — single model generation |
| AF-11 Feedback | Grade quality metrics, comment moderation rates, social point conversion rate per engagement event |

**IRON RULES:**

| IR | Rule | Violation = |
|----|------|------------|
| IR-1 | Grade scale: integer 1–5 per criterion. Non-integer = REJECT | BUILD FAILURE |
| IR-2 | Pseudonymity floor ≥ 2 (EVEN IF admin sets FREEDOM value to 1 via ES config) | BUILD FAILURE |
| IR-3 | One grade per grader per answer — enforced at MongoDB unique index level (not app layer) | BUILD FAILURE |
| IR-4 | Grading rate limit enforced server-side (Redis ZSET sliding window) — never client-side | BUILD FAILURE |
| IR-5 | GamificationSocialPointsAwarded ≠ GamificationPointsAwarded (DR-11 event type isolation) | BUILD FAILURE |
| IR-6 | Tumbling window: idempotent on replay — window key prevents double-aggregation | BUILD FAILURE |
| IR-7 | Comment types: fixed set (support/question/challenge/insight) — extension requires schema change review | BUILD FAILURE |
| IR-8 | Persist-before-event: data stored BEFORE AnswerGraded or AnswerCommented event emitted | BUILD FAILURE |
| IR-9 | F221 anti-abuse check MUST run BEFORE F219/F220 operations (ordering enforced, DR-9) | BUILD FAILURE |
| IR-10 | All methods return DataProcessResult\<T\> — no exceptions thrown for business logic | BUILD FAILURE |

**QUALITY GATES (AF-9):**

| QG | Gate | Level |
|----|------|-------|
| QG-1 | Generated orchestrator extends MicroserviceBase (DNA-4) | Mandatory |
| QG-2 | Pseudonymity threshold enforced — grades hidden below threshold N, floor ≥ 2 | Mandatory |
| QG-3 | Rate limiting verified for both grading (20/hr) and commenting (10/hr) | Mandatory |
| QG-4 | Tumbling window aggregation produces correct social point totals (FREEDOM caps applied) | Mandatory |
| QG-5 | Social points route to F166 via QUEUE FABRIC EnqueueAsync — no direct HTTP | Mandatory |
| QG-6 | GamificationSocialPointsAwarded event type verified distinct from completion event type | Mandatory |
| QG-7 | Anti-abuse gate (F221) runs before grade/comment submission — verified in step ordering | Mandatory |
| QG-8 | Engagement summary includes: grade counts, avg grade, comment counts, social points awarded | Mandatory |

**MACHINE / FREEDOM:**

```
MACHINE (non-negotiable in generated code):
  - Grade criteria: accuracy, depth, clarity, creativity (exactly 4, no extension without schema change)
  - Grade scale: 1–5 integer per criterion
  - Comment types: support, question, challenge, insight (exactly 4)
  - Pseudonymity floor: ≥ 2 (absolute minimum, overrides FREEDOM config)
  - Event isolation: social ≠ completion (DR-11)
  - Persist-before-event ordering (IR-8)
  - Anti-abuse ordering before any write (IR-9)

FREEDOM (ES config documents, admin-configurable without code deploy):
  - Pseudonymity threshold value (grading_pseudonymity_threshold, default 3, min 2)
  - Grade rate limit per hour (default 20)
  - Comment rate limit per hour (default 10)
  - Tumbling window duration (engagement_window_duration_minutes, default 15)
  - Tumbling window flush count (engagement_window_flush_count, default 10)
  - Social point values per event type (default: grade received = 5, comment received = 2)
  - Social point daily cap per user (default 100)
  - Comment max character limit (default 500)
  - A/B variant configuration for point values (via F216)
```

**BFA VALIDATION:**
- ENTITIES: Grade, Comment, SocialPointAward, EngagementWindow
- EVENTS: AnswerGraded, AnswerCommented, GamificationSocialPointsAwarded, EngagementWindowFlushed
- APIs: /api/engagement/grade (via F219), /api/engagement/comment (via F220)
- CROSS-FLOW CHECKS:
  - CF-34 (social points ≠ completion points — stream isolation)
  - CF-35 (F219 spam telemetry → F214, complementary not duplicate)
  - CF-36 (engagement writes ≠ reconciliation reads — different ES indices)
  - CF-40 (moderation events ≠ notifications — separate streams)
  - CF-41 (F223 routes to F166 via QUEUE, never HTTP)

---

# ═══════════════════════════════════════════════════════
# TASK TYPE: T71 — Sync Compute & Anti-Abuse Gate
# ═══════════════════════════════════════════════════════

**ARCHETYPE:** COMPUTE (synchronous HTTP path + durable async emit)

**ENTRY:**
```
HTTP: POST /api/flow/questionnaire-complete  (synchronous — 1s SLA path)
EVENT: QuestionnaireAnswered                  (from Questionnaire Service)
TaskRequest.intent: gamification_sync_compute
```

**PURPOSE:**
Compute gamification points synchronously within an 800ms budget (DR-5), enforce
anti-abuse checks BEFORE any gamification write, calculate timezone-aware streaks,
return result immediately to the UI for instant feedback, AND emit a durable event
for downstream persistence — implementing the hybrid sync+async pattern (DR-5, G1).

**DISTINCT FROM:**
- T44 (Fan-Out Scoring) — T44 is pure async fan-out; T71 adds a sync HTTP path with circuit breaker and dedup via idempotency key
- T67 (Gamification Integrity, Family 23) — T67 audits AFTER the fact (periodic); T71 gates BEFORE the action (real-time)
- T40 (Three-Way Join) — T40 merges streams; T71 computes and emits a single result on the sync path

**FACTORY DEPENDENCIES:**

| Factory | Interface | Fabric Resolution |
|---------|-----------|-------------------|
| F221 | IAntiAbuseGateService | DATABASE FABRIC (Redis+ES) |
| F222 | IStreakTimezoneService | DATABASE FABRIC (Redis+PG+MongoDB) + QUEUE FABRIC |
| F224 | ISyncComputeGatewayService | DATABASE FABRIC (Redis) + QUEUE FABRIC (Redis Streams) |
| F166 | IGamificationService (Family 17) | DATABASE FABRIC (InfluxDB+Redis) |

All resolved via `_factory.CreateAsync<T>()` with config-first routing.
F166 is a DEPENDENCY on Family 17 — called via CreateAsync, never imported.

**AF CONFIGURATION:**

| Station | T71 Mapping |
|---------|-------------|
| AF-1 Genesis | Generate sync-compute gateway service on DATABASE+QUEUE fabrics; wires F221→F222→F166→F224 ordering |
| AF-2 Planning | Decompose: anti-abuse-check → streak-timezone-calc → gamification-compute → cache-result → durable-emit → return-to-UI |
| AF-3 Prompt Library | Sync-compute domain: circuit breaker patterns, timeout handling, durable emit ordering |
| AF-4 RAG | T44 (scoring patterns for F166 calls), Skill 04 (queue emit patterns), DR-5 (hybrid sync+async design rule) |
| AF-5 Multi-model | Not used — deterministic compute |
| AF-6 Code Review | Circuit breaker implementation, anti-abuse gate ordering, timezone conversion correctness, idempotency key placement |
| AF-7 Compliance | DNA-1 through DNA-7 check; no typed models, all DataProcessResult\<T\> |
| AF-8 Security | Anti-tampering on point values (server-side only), rate limit verification, replay prevention via idempotency key |
| AF-9 Judge | 10 Iron Rules + 8 Quality Gates (see below) |
| AF-10 Merge | Not used — single model generation |
| AF-11 Feedback | Compute latency distribution (p50/p95/p99), circuit breaker trip rate, fallback frequency, dedup hit rate |

**IRON RULES:**

| IR | Rule | Violation = |
|----|------|------------|
| IR-1 | Circuit breaker timeout: 800ms (non-negotiable UX ceiling). Exceeding → fallback path | BUILD FAILURE |
| IR-2 | F221 anti-abuse check ALWAYS runs before F166 gamification compute — ordering IRON RULE (DR-9) | BUILD FAILURE |
| IR-3 | F222 streak timezone update BEFORE F166 compute — streak must be current before points calculated | BUILD FAILURE |
| IR-4 | Timeout fallback returns {status: "pending"} to UI — NOT an error. T44 async path completes later | BUILD FAILURE |
| IR-5 | Durable emit: after sync compute, enqueue GamificationPointsAwarded to QUEUE FABRIC BEFORE returning | BUILD FAILURE |
| IR-6 | Idempotency key format: {tenantId}:{questionnaireId}:{userId}:{attempt} — Redis SET atomic | BUILD FAILURE |
| IR-7 | Sync result cached in Redis (TTL from FREEDOM config) for dedup check by T44 async consumer | BUILD FAILURE |
| IR-8 | Point farming: max 1 scored completion per lesson per hour (enforced by F221, not F166) | BUILD FAILURE |
| IR-9 | All methods return DataProcessResult\<T\> — no exceptions thrown for business logic | BUILD FAILURE |
| IR-10 | Server-side computation only — client CANNOT submit point values. All math in F166 via fabric | BUILD FAILURE |

**QUALITY GATES (AF-9):**

| QG | Gate | Level |
|----|------|-------|
| QG-1 | Generated service extends MicroserviceBase (DNA-4) | Mandatory |
| QG-2 | Anti-abuse gate (F221) verified to run before any gamification compute (F166) | Mandatory |
| QG-3 | Circuit breaker implementation with configurable timeout (reads from ES config) | Mandatory |
| QG-4 | Fallback path returns {status: "pending"} — not HTTP 500 or error response | Mandatory |
| QG-5 | Durable event (GamificationPointsAwarded) emitted to QUEUE FABRIC before UI response returns | Mandatory |
| QG-6 | Idempotency key verified: set before emit, prevents T44 double-count (CF-37) | Mandatory |
| QG-7 | Streak timezone conversion: local date boundary used (not UTC) for streak increment | Mandatory |
| QG-8 | Total response time < 1000ms at p95 under nominal load | SLA |

**MACHINE / FREEDOM:**

```
MACHINE (non-negotiable in generated code):
  - 800ms circuit breaker (hard ceiling — no FREEDOM override above 2000ms)
  - Anti-abuse BEFORE compute ordering (IR-2, DR-9)
  - Streak BEFORE compute ordering (IR-3)
  - Server-side computation only (IR-10)
  - Persist-then-emit sequence (IR-5)
  - Idempotency key format (IR-6)

FREEDOM (ES config documents, admin-configurable without code deploy):
  - sync_circuit_breaker_timeout_ms (default: 800, max: 2000)
  - sync_result_cache_ttl_seconds (default: 60)
  - sync_fallback_message_key (ES localization config)
  - farm_rate_limit_per_hour / farm_rate_limit_per_day (via F221 config)
  - Streak grace period hours (via F222 config)
```

**BFA VALIDATION:**
- ENTITIES: SyncComputeResult, IdempotencyKey, CircuitBreakerState
- EVENTS: GamificationPointsAwarded (same type as T44 — deduplicated via idempotency key, CF-37)
- APIs: POST /api/flow/questionnaire-complete (sync HTTP path)
- CROSS-FLOW CHECKS:
  - CF-37 (sync compute ≠ async fan-out — idempotency key prevents double-counting, CRITICAL)
  - CF-38 (anti-abuse before gamification ordering, CRITICAL)
  - CF-39 (streak timezone wraps F169 — no parallel writes, backward compat)

---

# ═══════════════════════════════════════════════════════
# AF STATION MAP — FAMILY 24 (T70 + T71) — 11 × 2 = 22 CELLS
# ═══════════════════════════════════════════════════════

| AF Station | T70 — Peer Review & Engagement | T71 — Sync Compute & Anti-Abuse |
|------------|-------------------------------|--------------------------------|
| **AF-1 Genesis** | Generate engagement orchestrator on DB+QUEUE fabrics (F219/F220/F221/F223 wired) | Generate sync-compute gateway (F221→F222→F166→F224 step ordering) |
| **AF-2 Planning** | anti-abuse → grade-or-comment → accumulate-window → flush → route-to-gamification | anti-abuse → streak-update → compute → cache → emit → return-to-UI |
| **AF-3 Prompt** | Engagement domain: grading patterns, comment moderation, tumbling window | Sync-compute domain: circuit breaker, timeout handling, durable emit |
| **AF-4 RAG** | T46 (social distribution), Skill 04 (queue consumer), T44 (gamification routing), Skill 05 (MongoDB unique index) | T44 (F166 scoring patterns), Skill 04 (queue emit), DR-5 (hybrid sync+async) |
| **AF-5 Multi-model** | NOT USED — deterministic aggregation | NOT USED — deterministic compute |
| **AF-6 Code Review** | Rate limit implementation, pseudonymity gate, tumbling window flush | Circuit breaker implementation, anti-abuse ordering, timezone conversion |
| **AF-7 Compliance** | DNA-1..7: Dictionary models, DataProcessResult, MicroserviceBase, tenantId, DynamicController, traceparent | DNA-1..7: same checks; verify no typed models in circuit breaker result |
| **AF-8 Security** | Pseudonymity threshold never bypassed; grade manipulation prevention; XSS in comment content | Server-side point computation verified; replay prevention via idempotency key; anti-tampering |
| **AF-9 Judge** | 10 IRs + 8 QGs (IR-2: pseudonymity floor ≥ 2; IR-5: event type isolation; IR-9: anti-abuse ordering) | 10 IRs + 8 QGs (IR-1: 800ms budget; IR-2: anti-abuse ordering; IR-6: idempotency format) |
| **AF-10 Merge** | NOT USED — single model | NOT USED — single model |
| **AF-11 Feedback** | Grade quality metrics; comment moderation rate; social point conversion; engagement loop close rate | Compute latency p50/p95/p99; circuit breaker trip rate; fallback frequency; dedup hit rate |

---

# FAMILY 24 FLOW TEMPLATE — Template 15 Extension

Template 15 (lesson-gamification-v2, established in Family 23 / V3) is extended
with Family 24 nodes. The template JSON additions below INSERT into the existing
Template 15 DAG at the sync-compute entry point and engagement loop steps:

```json
{
  "templateExtension": "lesson-gamification-v2-family24",
  "extendsTemplate": "lesson-gamification-v2",
  "insertionPoint": "BEFORE:step_fan_out_t44",
  "newSteps": [
    {
      "stepId": "sync_compute_gate",
      "taskType": "T71",
      "factories": ["F221", "F222", "F224", "F166"],
      "entry": "HTTP:POST:/api/flow/questionnaire-complete",
      "machineConfig": {
        "circuitBreakerMs": 800,
        "ordering": ["F221", "F222", "F166", "F224"],
        "idempotencyKeyFormat": "{tenantId}:{questionnaireId}:{userId}:{attempt}"
      },
      "freedomConfigDoc": "sync_compute_config",
      "onTimeout": "return_pending_then_t44_completes"
    },
    {
      "stepId": "engagement_loop",
      "taskType": "T70",
      "factories": ["F221", "F219", "F220", "F223"],
      "entry": "EVENT:AnswerGraded|AnswerCommented",
      "machineConfig": {
        "gradeCriteria": ["accuracy", "depth", "clarity", "creativity"],
        "commentTypes": ["support", "question", "challenge", "insight"],
        "pseudonymityFloor": 2,
        "antiAbuseOrdering": "F221_FIRST"
      },
      "freedomConfigDoc": "engagement_config",
      "correlationKey": "answerId"
    }
  ],
  "correlationKey": "questionnaireId",
  "engagementLoopKey": "answerId",
  "backwardCompatible": true
}
```

---

## MERGE:P3+P4 STATE SAVE
```
MERGE:P3+P4 = COMPLETE
Target: TASK_TYPES_CATALOG_MERGED.md
Added: T67-T69 (Family 23, 3 full-format contracts), T70-T71 (Family 24, 2 full-format contracts)
Added: AF Station Map 11×5 = 55 cells (Family 23 + 24)
Added: Flow Template 15 extension (lesson-gamification-v2)
System: 24 families, T1-T71, 15 flow templates
Next: MERGE:P5 → V62_BFA_STRESS_TEST_MERGED.md
```

---

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# FLOW-06 MERGE — T72-T76 + AF Station Map + Flow Template 16
# Merged from: FLOW06_P2_TASK_TYPES_v2.md
# Date: 2026-02-26 | Save Point: MERGE:P2
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


---

## TASK TYPE: T72 — Marketplace Item & Listing Lifecycle Gate

**ARCHETYPE:** ORCHESTRATION
**ENTRY:** POST /marketplace/items — seller submits new listing; OR state transition event from admin/system
**PURPOSE:** Validate listing data, create inventory record, initialise listing state machine (Draft), publish listing (Draft→Active), schedule expiry timer if limited-time offer, emit MarketplaceItemCreated + ListingPublished events, compensate on failure (deactivate inventory, rollback listing)
**DISTINCT FROM:**
- T63 (ListingLifecycle, FLOW-04): T63 manages CONTENT post lifecycle (social post states). T72 manages COMMERCE listing lifecycle (inventory + pricing + legal state). Different state machines, different compensation logic, different domain.
- T44 (Fan-Out Scoring, FLOW-05): T44 fans out gamification events. T72 is a sequential gate that initialises two parallel records (inventory + listing) before forking.

**FACTORY DEPENDENCIES:** F225, F226
**FABRIC RESOLUTION:**
- F225 → DATABASE FABRIC(PG) + QUEUE FABRIC(Redis Streams)
- F226 → DATABASE FABRIC(PG) + DATABASE FABRIC(Redis) + DATABASE FABRIC(ES) + FLOW ENGINE FABRIC

**AF CONFIGURATION:**
- AF-1 Genesis: Generate lifecycle orchestrator extending MicroserviceBase; state machine code from T72 contract
- AF-2 Planning: Decompose into: validate → createInventory → createListing → publishListing → scheduleTimer → emitEvents
- AF-3 Prompt Library: Retrieve marketplace-lifecycle-v1 prompt for state machine generation
- AF-4 RAG: Search Skill 09 (IFlowOrchestrator) for durable timer patterns; Skill 05 for PG transaction patterns
- AF-5 Multi-model: N/A — no AI generation in this gate (pure orchestration)
- AF-6 Code review: Verify state machine transitions match diagram; transactional outbox for events
- AF-7 Compliance: DNA-1 through DNA-7; no typed ItemModel; DataProcessResult on all branches
- AF-8 Security: Seller verification check; rate limit (10 listings/hour/seller); BOLA check (seller can only modify own listings)
- AF-9 Judge: 10 quality gates (see below)
- AF-10 Merge: N/A
- AF-11 Feedback: Store listing creation success rate, timer reliability, compensating action frequency

**BFA VALIDATION:** CF-45 (inventory ≠ content streams), CF-47 (listing state ≠ post state), CF-50 (discount bounds)

**MACHINE:**
- Listing state machine transitions FIXED (Draft→Active, Active→SoldOut, Active→Deactivated, SoldOut→Active)
- Invalid state transition = BUILD FAILURE (no custom transitions via config)
- Rate limit: 10 listings/hour/seller (non-negotiable)
- Expiry timer MUST use FLOW ENGINE FABRIC (Skill 09), not cron (DR-14)
- Inventory record MUST be created before listing record (referential integrity)
- Compensating actions MUST execute on any failure after inventory created

**FREEDOM:**
- Listing visibility options (public / connections-only / groups-only)
- Pre-order badge text (default: "Coming Soon")
- Limited-time offer duration options (24h / 48h / 72h / 7d)
- Seller verification method (default: profile-verified flag)

**IRON RULES:**
- IR-1: Listing state machine MUST follow EXACTLY the defined transitions (no additions/removals)
- IR-2: InventoryRecord MUST be created before ListingRecord (enforced by T72 step ordering)
- IR-3: MarketplaceItemCreated event MUST carry: itemId, sellerId, itemDetails, pricing, inventory, targetAudience, media
- IR-4: ListingPublished event MUST carry: listingId, itemId, sellerId, status=Active, visibility, listingUrl
- IR-5: Rate limit check (10/hr) MUST precede any DB writes
- IR-6: Seller can only create listings for their own businessId (BOLA enforcement)
- IR-7: Limited-time offer expiry MUST use durable timer (FLOW ENGINE FABRIC) — cron = BUILD FAILURE
- IR-8: On failure after inventory created, compensating DeactivateInventory MUST be triggered
- IR-9: All writes MUST include tenantId scope (DNA-5)
- IR-10: No typed models for listing or inventory data (DNA-1 — Dictionary only)

**QUALITY GATES (AF-9):**
- QG-1: State machine diagram compliance — all transitions tested
- QG-2: Transactional outbox implemented — inventory write + event in same DB transaction
- QG-3: Rate limit bypass test — 11 listings in 1hr returns HTTP 429
- QG-4: Compensation path test — force DB failure after inventory created, verify rollback
- QG-5: Event schema validation — MarketplaceItemCreated + ListingPublished payloads complete
- QG-6: BOLA test — seller A cannot publish listing with seller B's businessId
- QG-7: Timer reliability — listing expiry fires within 60s of scheduled time
- QG-8: Concurrent listing creation — no duplicate inventory records under parallel requests
- QG-9: Tenant isolation — listing data not visible cross-tenant
- QG-10: Draft→Active only (not Draft→SoldOut direct) enforced

---

## TASK TYPE: T73 — Three-Way Marketplace Enrichment Fork

**ARCHETYPE:** ORCHESTRATION
**ENTRY:** ListingPublished event confirms listing is Active
**PURPOSE:** Fan out to THREE parallel enrichment branches: (A) Audience Profiling via F227, (B) Marketplace Post Generation via F228, (C) Cooperator Matching Prep via F229; join with allSettled semantics — partial results acceptable; emit enrichment completion events for each branch
**DISTINCT FROM:**
- T40 (Three-Way Join Gate, FLOW-05): T40 JOINS three audience streams after they've already been enriched. T73 INITIATES three concurrent enrichment processes from a single listing event. Different direction of orchestration.
- T66 (Multi-Audience Distribution, FLOW-04): T66 distributes to audiences. T73 BUILDS the data needed before distribution can happen.

**FACTORY DEPENDENCIES:** F227, F228, F229
**FABRIC RESOLUTION:**
- F227 → DATABASE FABRIC(ES) + AI ENGINE FABRIC + RAG FABRIC
- F228 → DATABASE FABRIC(MongoDB) + AI ENGINE FABRIC(multi-model) + QUEUE FABRIC
- F229 → DATABASE FABRIC(PG) + DATABASE FABRIC(Redis) + AI ENGINE FABRIC + RAG FABRIC

**AF CONFIGURATION:**
- AF-1 Genesis: Generate fork orchestrator with allSettled parallel execution pattern
- AF-2 Planning: Decompose into: fork(A+B+C) → wait(allSettled, timeout=30s) → collect results → emit per-branch events
- AF-3 Prompt Library: audience-profiling-v1, marketplace-post-gen-v1, product-complementarity-v1
- AF-4 RAG: Search T40 pattern for allSettled join; Skill 07 for multi-model parallel dispatch; Skill 09 for fork step definition
- AF-5 Multi-model: Branch B (F228) uses AiDispatcher multi-model internally for post variants
- AF-6 Code review: Verify allSettled semantics — branch failure doesn't block other branches
- AF-7 Compliance: DNA-1 through DNA-7; no typed models for enrichment results
- AF-8 Security: Verify post generation cannot leak other tenants' listing data into prompts
- AF-9 Judge: 8 quality gates
- AF-10 Merge: AF-10 runs inside Branch B for multi-model post variant selection
- AF-11 Feedback: Store branch success rates, latencies; feed into model selection tuning

**BFA VALIDATION:** CF-42 (marketplace post ≠ social post), CF-43 (marketplace feed ≠ lesson feed), CF-44 (synergy ≠ gamification)

**MACHINE:**
- Fork MUST use allSettled (not allResolved) — one branch failure cannot block the others
- Join timeout: 30s (if branch exceeds 30s, proceed with available results)
- Partial results are acceptable — distribution adapts to available enrichment data
- Branch B (post gen) MUST include duplicate detection (>90% = block, no partial workaround)

**FREEDOM:**
- Fork timeout value (default: 30s — within spec-defined SLO range)
- Minimum enrichment completion threshold (default: 2/3 branches must succeed for distribution to proceed)
- LLM prompt versions for each branch (default: v1)

**IRON RULES:**
- IR-1: Fork MUST be allSettled — any branch using allResolved semantics = BUILD FAILURE
- IR-2: Post generation (Branch B) MUST run duplicate detection BEFORE emitting MarketplacePostCreated
- IR-3: Each branch emits its own completion event (TargetAudienceAnalyzed / MarketplacePostCreated / CooperatorsIdentified)
- IR-4: Branch failure MUST be logged with traceparent + itemId for debugging
- IR-5: Enrichment results MUST include tenantId scope in every sub-call
- IR-6: No branch result may be typed — all returned as Dictionary<string,object>
- IR-7: Fork timeout MUST be enforced by FLOW ENGINE FABRIC timer (not Thread.Sleep)
- IR-8: Competing cooperators (synergy=0 from Branch C) MUST be filtered before emitting CooperatorsIdentified

**QUALITY GATES (AF-9):**
- QG-1: allSettled verified — kill Branch A, verify B+C complete and events emitted
- QG-2: 30s timeout test — simulate Branch C slowness, verify fork resolves with partial data
- QG-3: Duplicate detection test — reuse existing seller post text → DuplicateDetected emitted, no MarketplacePostCreated
- QG-4: Multi-model post generation — AF-5 + AF-10 run, merged post stored in MongoDB
- QG-5: Competing cooperator exclusion — synergy=0 cooperators absent from CooperatorsIdentified event
- QG-6: Tenant isolation in prompts — Branch B cannot include other tenant's listings in context
- QG-7: Enrichment event schema validation — all 3 completion events carry required fields
- QG-8: Parallel execution verified — all 3 branches start within 100ms of fork trigger

---

## TASK TYPE: T74 — Synergy-Based Cooperator Matching Gate

**ARCHETYPE:** DATA PROCESSING
**ENTRY:** TargetAudienceAnalyzed event confirms audience profile is ready
**PURPOSE:** Compute 5-factor weighted synergy scores for all active businesses against the new listing; classify cooperation types; filter competing products to synergy=0; rank cooperators; emit CooperatorsIdentified with top N results
**DISTINCT FROM:**
- T44 (Fan-Out Scoring, FLOW-05): T44 scores LESSON ENGAGEMENT points — additive integer accumulation. T74 scores BUSINESS SYNERGY — 5-factor weighted decimal formula with AI-assisted complementarity.
- T40 (Three-Way Join, FLOW-05): T40 JOINS streams that are already computed. T74 COMPUTES the scores that T73's Branch C produces.
- T62 (Aggregation, FLOW-03): T62 aggregates promotion metrics over time. T74 computes point-in-time synergy for a specific listing-business pair.

**FACTORY DEPENDENCIES:** F229, F227, F230
**FABRIC RESOLUTION:**
- F229 → DATABASE FABRIC(PG) + DATABASE FABRIC(Redis) + AI ENGINE FABRIC + RAG FABRIC
- F227 → DATABASE FABRIC(ES) + AI ENGINE FABRIC + RAG FABRIC
- F230 → DATABASE FABRIC(Neo4j) + DATABASE FABRIC(PG)

**AF CONFIGURATION:**
- AF-1 Genesis: Generate synergy scoring service from weighted formula spec (MACHINE formula, FREEDOM weights)
- AF-2 Planning: Decompose into: fetchCandidates → computeFactors(parallel) → weightedSum → classify → rank → cache → emit
- AF-3 Prompt Library: product-complementarity-v1 (for AI complementarity factor)
- AF-4 RAG: Search Skills 05+07+00b for DB+AI+RAG patterns; search existing T44 for fan-out template
- AF-5 Multi-model: Run complementarity check on claude + gpt, take consensus (reduces hallucination on product categories)
- AF-6 Code review: Verify formula weights sum to 1.0; competing exclusion logic; cache key format
- AF-7 Compliance: DNA-1 (no SynergyScore type), DNA-3 (DataProcessResult), DNA-5 (tenantId)
- AF-8 Security: Verify competitive intelligence not leaked (seller A can't see synergy scores for seller B)
- AF-9 Judge: 10 quality gates
- AF-10 Merge: Consensus merge for complementarity factor from multiple models
- AF-11 Feedback: Store synergy accuracy vs actual cooperator acceptance rate (reinforcement signal)

**BFA VALIDATION:** CF-44 (synergy ≠ gamification scoring), CF-48 (marketplace analytics ≠ lesson analytics)

**MACHINE:**
- Synergy formula: (audienceOverlap×w1) + (productComplement×w2) + (marketPresence×w3) + (reputation×w4) + (collabHistory×w5) — EXACTLY 5 factors
- Factor weights MUST sum to 1.0 (±0.001 tolerance)
- Competing products (complementarity=0.0) → synergy=0.0 ALWAYS regardless of other factors
- Product complementarity MUST use AI ENGINE FABRIC (never hardcoded rules)

**FREEDOM:**
- Factor weight values w1-w5 (default: 0.30/0.25/0.20/0.15/0.10, must sum to 1.0)
- Cooperation type thresholds (default: cross_promo≥0.5, bundle≥0.7, referral≥0.4, dist≥0.6)
- Max cooperators returned per listing (default: 20)
- LLM model for complementarity (default: claude-sonnet + gpt-4o consensus)
- Synergy cache TTL (default: 3600s)

**IRON RULES:**
- IR-1: Synergy formula MUST use exactly 5 weighted factors (different count = BUILD FAILURE)
- IR-2: Weights MUST sum to 1.0 ± 0.001
- IR-3: Competing products (complementarity=0.0) MUST produce synergy=0 regardless of other factors
- IR-4: All synergy computations MUST include tenantId scope isolation (DNA-5)
- IR-5: Product complementarity MUST route through AI ENGINE FABRIC (direct rule table = BUILD FAILURE)
- IR-6: No typed SynergyScore model — Dictionary<string,object> only (DNA-1)
- IR-7: All methods MUST return DataProcessResult<T> (DNA-3)
- IR-8: Synergy scores MUST be cached in Redis with configurable TTL
- IR-9: Candidate pool retrieval MUST use BuildSearchFilter (DNA-2)
- IR-10: Every computation MUST forward traceparent (DNA-7)

**QUALITY GATES (AF-9):**
- QG-1: Formula output range [0.0, 1.0] — out of range = FAIL
- QG-2: Factor weights sum validation (must be 1.0 ± 0.001) — auto-validated at engine boot
- QG-3: Competing product exclusion — complementarity=0 → synergy=0 proven via test
- QG-4: AI complementarity response parsed to Dictionary, no typed model
- QG-5: Cache hit/miss ratio logged; Redis key format: cache:synergy:{tenantId}:{itemId}:{businessId}
- QG-6: Synergy computation latency < 20s (spec SLO)
- QG-7: Tenant isolation — Business A's synergy data invisible to Business B
- QG-8: Cooperation type classification matches threshold rules exactly
- QG-9: Multi-model consensus for complementarity — both models queried, AF-10 merges
- QG-10: Feedback stored — synergyScore + cooperationType + listing context persisted for AF-11

---

## TASK TYPE: T75 — Multi-Audience Marketplace Distribution Gate

**ARCHETYPE:** ORCHESTRATION
**ENTRY:** CooperatorsIdentified event (joins with FriendAudienceIdentified + GroupAudienceIdentified — allSettled)
**PURPOSE:** Distribute marketplace post to three audience channels concurrently: (A) friends feed with PRODUCT_CARDs + friend discount, (B) group feeds with PRODUCT_CARDs + group discount + auto-post, (C) cooperator feeds with PARTNERSHIP_CARDs by synergy band + cooperator notifications; emit MarketplaceFeedDistributed; respect InventoryDepleted override signal
**DISTINCT FROM:**
- T66 (Multi-Audience Feed Distribution, FLOW-04): T66 distributes SOCIAL CONTENT to tiered feed audiences. T75 distributes COMMERCE CONTENT with card-type differentiation, discount pricing, and partnership intelligence — fundamentally different card schemas and audience logic.
- T40 (Three-Way Join, FLOW-05): T40 joins audience streams for a social post. T75 distributes commerce content to audiences with commercial card variants.

**FACTORY DEPENDENCIES:** F230, F231, F232, F233
**FABRIC RESOLUTION:**
- F230 → DATABASE FABRIC(Neo4j) + DATABASE FABRIC(PG)
- F231 → DATABASE FABRIC(PG) + DATABASE FABRIC(MongoDB)
- F232 → QUEUE FABRIC(Redis Streams) + DATABASE FABRIC(Redis Cluster+ES)
- F233 → QUEUE FABRIC(Redis Streams) + DATABASE FABRIC(Redis)

**AF CONFIGURATION:**
- AF-1 Genesis: Generate multi-channel distribution orchestrator; channel A+B+C concurrent pattern
- AF-2 Planning: Decompose into: checkInventorySignal → fork(A+B+C) → batchWrite → notify → emitCompletion
- AF-3 Prompt Library: N/A (no AI generation in distribution step)
- AF-4 RAG: Search T66 for multi-audience pattern; F173 for feed card distribution approach (adapt for marketplace)
- AF-5 Multi-model: N/A — pure orchestration
- AF-6 Code review: Verify InventoryDepleted override pre-empts distribution; verify card type selection logic
- AF-7 Compliance: DNA-1 through DNA-7; no typed FeedCard model
- AF-8 Security: Verify discount applied server-side only; verify cooperator rate limit enforced; PARTNERSHIP_CARD only to non-competing cooperators
- AF-9 Judge: 8 quality gates
- AF-10 Merge: N/A
- AF-11 Feedback: Store distribution reach metrics per channel; cooperator notification open rates

**BFA VALIDATION:** CF-43 (marketplace feed ≠ lesson feed), CF-46 (marketplace notifications ≠ social notifications), CF-49 (marketplace groups ≠ social groups), CF-51 (cooperator rate limit)

**MACHINE:**
- InventoryDepleted override: if received, HALT distribution and call MarkSoldOutAsync instead
- Channel C (cooperators): competing cooperators (synergy=0) NEVER receive PARTNERSHIP_CARD
- Channel B (groups): auto-post only to marketplace_enabled groups where seller is member
- Partner notification rate limit: 5/day/cooperator — enforced at F233 (MACHINE, not configurable)
- Feed batch ceiling: 500 per batch (MACHINE — prevents queue overwhelm, DR-16)

**FREEDOM:**
- Friend audience minimum affinity threshold (default: 0.3)
- Max groups for auto-post (default: 5)
- Synergy band thresholds for card variant selection (default: >0.75=HIGH, 0.5-0.75=MEDIUM, <0.5=LOW)
- Cooperator notification channel (default: in-app + email)
- Feed batch size (default: 500)

**IRON RULES:**
- IR-1: InventoryDepleted signal MUST be checked BEFORE any distribution write begins
- IR-2: Competing cooperators (synergy=0) MUST be excluded from Channel C (no PARTNERSHIP_CARD)
- IR-3: Channel B auto-post requires marketplace_enabled=true AND seller membership in group
- IR-4: Discount application MUST be server-side (F226.ApplyPricingRulesAsync) — client-side = BUILD FAILURE
- IR-5: Cooperator rate limit (5/day) MUST be enforced by F233 before each notification send
- IR-6: MarketplaceFeedDistributed event MUST include: postId, friendFeeds count, groupFeeds count, cooperatorFeeds count
- IR-7: Channel C: send PARTNERSHIP_CARD with synergyScore, cooperationType, complementaryProducts
- IR-8: No typed FeedCard model — all card data as Dictionary<string,object> (DNA-1)

**QUALITY GATES (AF-9):**
- QG-1: InventoryDepleted override test — depleted event pre-empts distribution, MarkSoldOutAsync called
- QG-2: Competing cooperator exclusion — synergy=0 cooperators receive no feed entry
- QG-3: Group auto-post eligibility — non-marketplace-enabled group receives no auto-post
- QG-4: Discount server-side validation — correct discount applied, client cannot override
- QG-5: Rate limit enforcement — 6th notification to same cooperator in a day is silently dropped
- QG-6: Batch ceiling test — 501 friends distributes in 2 batches, not 1
- QG-7: MarketplaceFeedDistributed event schema validated
- QG-8: Card type selection — HIGH/MEDIUM/LOW PARTNERSHIP_CARD correctly selected by synergyBand

---

## TASK TYPE: T76 — Marketplace Intelligence & Optimization Gate

**ARCHETYPE:** ANALYTICS
**ENTRY:** MarketplacePostDistributed + CooperatorNotificationsSent events (joins with allSettled; fires asynchronously after distribution completes)
**PURPOSE:** Aggregate distribution analytics (reach by audience segment), store marketplace intelligence for RAG retrieval, generate optimization insights (pricing, audience targeting, cooperator acceptance rates), update seller dashboard; enable feedback loop for future synergy calibration
**DISTINCT FROM:**
- T62 (Aggregation Gate, FLOW-03): T62 aggregates event PROMOTION analytics over time. T76 aggregates MARKETPLACE COMMERCE analytics — reach, conversion, cooperator acceptance — and feeds them back into the RAG FABRIC for future listings.
- T66 (FLOW-04 distribution analytics): T66 analytics focuses on CONTENT feed metrics. T76 focuses on COMMERCE outcome metrics (inquiries, purchases, cooperator responses).

**FACTORY DEPENDENCIES:** F227, F232, F229
**FABRIC RESOLUTION:**
- F227 → DATABASE FABRIC(ES) + AI ENGINE FABRIC + RAG FABRIC
- F232 → QUEUE FABRIC(Redis Streams) + DATABASE FABRIC(Redis Cluster+ES)
- F229 → DATABASE FABRIC(PG) + DATABASE FABRIC(Redis) + AI ENGINE FABRIC + RAG FABRIC

**AF CONFIGURATION:**
- AF-1 Genesis: Generate analytics aggregator with RAG feedback write-back
- AF-2 Planning: Decompose into: collectMetrics → aggregateBySegment → writeToES → updateRAG → generateInsights → storeDashboard
- AF-3 Prompt Library: marketplace-insights-v1 for LLM-assisted optimization suggestions
- AF-4 RAG: Search existing marketplace-intelligence index for trend context; write back new data
- AF-5 Multi-model: N/A — single model for insights generation
- AF-6 Code review: Verify RAG write-back uses correct ES index; verify no cross-tenant data in aggregations
- AF-7 Compliance: DNA-1 through DNA-7; tenantId on every aggregation query
- AF-8 Security: Verify seller only sees their own listing analytics (no cross-seller exposure)
- AF-9 Judge: 6 quality gates
- AF-10 Merge: N/A
- AF-11 Feedback: Store insight quality scores for prompt library improvement

**BFA VALIDATION:** CF-48 (marketplace analytics ≠ lesson analytics), CF-44 (marketplace intelligence index ≠ gamification index)

**MACHINE:**
- Analytics data MUST be stored in `marketplace-analytics-{tenantId}` ES index (never lesson-* or social-*)
- RAG write-back MUST include: itemId, category, synergy acceptance rates, distribution reach metrics
- Seller dashboard update MUST be idempotent (same marketingId = overwrite, not append)

**FREEDOM:**
- Trend aggregation window (default: 30 days)
- Number of optimization insights to generate (default: 3)
- LLM model for insights (default: claude-haiku — lightweight, analytics summary)
- Dashboard refresh frequency (default: real-time on event trigger)

**IRON RULES:**
- IR-1: Analytics ES index MUST be `marketplace-analytics-{tenantId}` (cross-index = BUILD FAILURE)
- IR-2: Synergy acceptance rates MUST feed back to F229's collaboration history factor
- IR-3: Seller analytics MUST be scoped to tenantId + sellerId (no cross-seller leakage)
- IR-4: RAG write-back MUST complete before insights are generated (ordering enforced by flow step)
- IR-5: Optimization insights MUST be generated via AI ENGINE FABRIC (not hardcoded heuristics)
- IR-6: All aggregation results returned as Dictionary<string,object> (DNA-1)

**QUALITY GATES (AF-9):**
- QG-1: Analytics stored in correct ES index namespace
- QG-2: RAG write-back verified — next listing by same seller retrieves updated marketplace intelligence
- QG-3: Cross-seller isolation — seller A cannot see seller B's reach metrics
- QG-4: Collaboration history update — F229 cooperation history factor reflects new acceptance data
- QG-5: Insights generated by AI ENGINE FABRIC — direct heuristic bypass = FAIL
- QG-6: Idempotency test — duplicate MarketplaceFeedDistributed event does not double-count metrics

---

## AF STATION MAP — FLOW-06 (11 × 5 = 55 cells)

| AF Station | T72 Lifecycle Gate | T73 Enrichment Fork | T74 Synergy Matching | T75 Distribution Gate | T76 Intelligence Gate |
|------------|-------------------|--------------------|--------------------|----------------------|----------------------|
| **AF-1 Genesis** | Lifecycle orchestrator + state machine code | Fork orchestrator with allSettled pattern | Synergy scoring service from formula spec | Multi-channel distributor with card-type selection | Analytics aggregator with RAG write-back |
| **AF-2 Planning** | validate → createInventory → createListing → publish → scheduleTimer → emitEvents | fork(A+B+C) → allSettled(30s) → collect → emit per-branch | fetchCandidates → computeFactors → weightedSum → classify → rank → cache → emit | checkInventory → fork(A+B+C) → batchWrite → notify → emitCompletion | collectMetrics → aggregate → writeES → updateRAG → generateInsights → storeDashboard |
| **AF-3 Prompt Library** | marketplace-lifecycle-v1 | audience-profiling-v1, marketplace-post-gen-v1, product-complementarity-v1 | product-complementarity-v1 | (none — pure orchestration) | marketplace-insights-v1 |
| **AF-4 RAG** | Skill 09 durable timer patterns; Skill 05 PG transaction patterns | T40 allSettled pattern; Skill 07 multi-model dispatch | T44 fan-out pattern; Skills 05+07+00b combined fabric | T66 multi-audience pattern; F173 feed card template | marketplace-intelligence ES index; existing analytics patterns |
| **AF-5 Multi-model** | N/A | Branch B (F228): claude + gpt post variants | claude + gpt complementarity consensus | N/A | N/A |
| **AF-6 Code Review** | State machine transitions; transactional outbox | allSettled semantics; duplicate detection gate | Formula weight sum; competing exclusion logic; cache key | InventoryDepleted override check; card type selection | RAG write-back index; cross-tenant isolation in aggregations |
| **AF-7 Compliance** | DNA 1-7; no typed models | DNA 1-7; multi-model DNA-7 traceparent | DNA 1-7; formula weights in config not code | DNA 1-7; discount server-side | DNA 1-7; tenantId on all ES queries |
| **AF-8 Security** | Seller verification; rate limit 10/hr; BOLA check | Prompt injection: no cross-tenant listing data in LLM context | Competitive intelligence protection; synergy not shared cross-tenant | Discount server-side; cooperator rate limit; PARTNERSHIP_CARD eligibility | Seller analytics isolation; no cross-seller reach data |
| **AF-9 Judge** | 10 quality gates (see T72) | 8 quality gates (see T73) | 10 quality gates (see T74) | 8 quality gates (see T75) | 6 quality gates (see T76) |
| **AF-10 Merge** | N/A | Branch B: multi-model post variant selection | complementarity factor: multi-model consensus | N/A | N/A |
| **AF-11 Feedback** | Listing creation success rate; timer reliability | Branch success rates + latencies; model selection tuning | Synergy accuracy vs cooperator acceptance rate | Distribution reach per channel; cooperator notification open rates | Insight quality scores; prompt library improvement |

---

## FLOW TEMPLATE 16 — marketplace-publishing-v1

```json
{
  "id": "marketplace-publishing-v1",
  "version": "1.0",
  "flowId": "FLOW-06",
  "description": "Marketplace Publishing & Distribution — From listing creation to multi-audience commerce distribution",
  "correlationKey": "itemId",
  "secondaryCorrelationKey": "listingId",
  "entryEvent": "POST /marketplace/items",
  "exitEvents": ["MarketplaceFeedDistributed", "CooperatorNotificationsSent"],

  "machineConfig": {
    "maxListingsPerHour": 10,
    "maxCooperatorNotificationsPerDay": 5,
    "enrichmentForkTimeoutSeconds": 30,
    "inventoryEventPriorityChannel": "marketplace.inventory.events",
    "feedDistributionBatchCeiling": 500,
    "duplicateSimilarityThreshold": 0.90,
    "inventoryDepletedSLASeconds": 30,
    "stateTransitions": ["Draft→Active", "Active→SoldOut", "Active→Deactivated", "SoldOut→Active", "Deactivated→Deleted"],
    "discountBounds": {
      "friend": {"min": 0.05, "max": 0.10},
      "group": {"min": 0.10, "max": 0.15}
    },
    "synergyFormula": {
      "factorCount": 5,
      "factors": ["audienceOverlap", "productComplement", "marketPresence", "reputation", "collabHistory"],
      "competingProductSynergy": 0.0
    }
  },

  "freedomConfigIndex": "marketplace-config-{tenantId}",

  "steps": [
    {
      "id": "step-1",
      "name": "Marketplace Item & Listing Lifecycle Gate",
      "taskType": "T72",
      "factories": [
        {"id": "F225", "interface": "IMarketplaceInventoryService", "createVia": "CreateAsync", "fabricHint": "database:pg+redis,queue:redis-streams"},
        {"id": "F226", "interface": "IMarketplaceListingService", "createVia": "CreateAsync", "fabricHint": "database:pg+redis+es,flow-engine:orchestrator"}
      ],
      "entry": {"event": "HTTP:POST /marketplace/items"},
      "exit": {"events": ["MarketplaceItemCreated", "ListingPublished"]},
      "onFailure": "compensate:DeactivateInventory"
    },
    {
      "id": "step-2",
      "name": "Three-Way Marketplace Enrichment Fork",
      "taskType": "T73",
      "parallel": true,
      "joinStrategy": "allSettled",
      "joinTimeoutSeconds": 30,
      "branches": [
        {
          "id": "branch-A",
          "name": "Audience Profiling",
          "factories": [{"id": "F227", "interface": "IMarketplaceAnalyticsService", "createVia": "CreateAsync", "fabricHint": "database:es,ai:llm,rag:tiered"}],
          "entry": {"event": "ListingPublished"},
          "exit": {"event": "TargetAudienceAnalyzed"}
        },
        {
          "id": "branch-B",
          "name": "Marketplace Post Generation",
          "factories": [{"id": "F228", "interface": "IMarketplacePostGeneratorService", "createVia": "CreateAsync", "fabricHint": "database:mongodb,ai:multi-model,queue:redis-streams"}],
          "entry": {"event": "ListingPublished"},
          "exit": {"event": "MarketplacePostCreated"},
          "gate": "duplicateCheck:block-if-similarity>0.90"
        },
        {
          "id": "branch-C",
          "name": "Cooperator Matching",
          "factories": [{"id": "F229", "interface": "ICooperatorMatchingService", "createVia": "CreateAsync", "fabricHint": "database:pg+redis,ai:llm,rag:hybrid"}],
          "entry": {"event": "TargetAudienceAnalyzed"},
          "exit": {"event": "CooperatorsIdentified"},
          "dependsOn": "branch-A"
        }
      ]
    },
    {
      "id": "step-3",
      "name": "Synergy-Based Cooperator Matching Gate",
      "taskType": "T74",
      "factories": [
        {"id": "F229", "interface": "ICooperatorMatchingService", "createVia": "CreateAsync"},
        {"id": "F227", "interface": "IMarketplaceAnalyticsService", "createVia": "CreateAsync"},
        {"id": "F230", "interface": "IMarketplaceConnectionService", "createVia": "CreateAsync", "fabricHint": "database:neo4j+pg"}
      ],
      "entry": {"event": "TargetAudienceAnalyzed"},
      "exit": {"event": "CooperatorsIdentified"},
      "note": "Internal to branch-C; shown as explicit step for AF station mapping clarity"
    },
    {
      "id": "step-4",
      "name": "Multi-Audience Marketplace Distribution Gate",
      "taskType": "T75",
      "factories": [
        {"id": "F230", "interface": "IMarketplaceConnectionService", "createVia": "CreateAsync"},
        {"id": "F231", "interface": "IMarketplaceGroupService", "createVia": "CreateAsync", "fabricHint": "database:pg+mongodb"},
        {"id": "F232", "interface": "IMarketplaceFeedService", "createVia": "CreateAsync", "fabricHint": "queue:redis-streams,database:redis-cluster+es"},
        {"id": "F233", "interface": "ICooperatorNotificationService", "createVia": "CreateAsync", "fabricHint": "queue:redis-streams,database:redis"}
      ],
      "entry": {"events": ["MarketplacePostCreated", "FriendAudienceIdentified", "GroupAudienceIdentified", "CooperatorsIdentified"], "joinStrategy": "allSettled"},
      "exit": {"events": ["MarketplaceFeedDistributed", "CooperatorNotificationsSent"]},
      "inventoryOverride": {"event": "InventoryDepleted", "action": "halt-distribution,call:F232.MarkSoldOutAsync"}
    },
    {
      "id": "step-5",
      "name": "Marketplace Intelligence & Optimization Gate",
      "taskType": "T76",
      "factories": [
        {"id": "F227", "interface": "IMarketplaceAnalyticsService", "createVia": "CreateAsync"},
        {"id": "F232", "interface": "IMarketplaceFeedService", "createVia": "CreateAsync"},
        {"id": "F229", "interface": "ICooperatorMatchingService", "createVia": "CreateAsync"}
      ],
      "entry": {"events": ["MarketplaceFeedDistributed", "CooperatorNotificationsSent"], "joinStrategy": "allSettled"},
      "exit": {"event": "MarketplaceIntelligenceUpdated"},
      "async": true,
      "note": "Runs asynchronously after distribution — does not block seller feedback"
    }
  ],

  "bfaRegistration": {
    "entities": ["MarketplaceItem", "MarketplaceListing", "MarketplacePost", "CooperatorMatch", "SynergyScore"],
    "events": ["MarketplaceItemCreated", "ListingPublished", "TargetAudienceAnalyzed", "MarketplacePostCreated", "FriendAudienceIdentified", "GroupAudienceIdentified", "CooperatorsIdentified", "MarketplaceFeedDistributed", "MarketplacePostRanked", "MarketplacePostDistributed", "CooperatorNotificationsSent"],
    "apis": ["/marketplace/items", "/marketplace/listings", "/marketplace/cooperators", "/marketplace/feed", "/marketplace/analytics"],
    "conflictRules": ["CF-42", "CF-43", "CF-44", "CF-45", "CF-46", "CF-47", "CF-48", "CF-49", "CF-50", "CF-51"]
  }
}
```

---

## SAVE POINT: MERGE:P2 ✅
## Next: Phase 3 — CF-42-CF-51 BFA Conflict Rules + ST-19-ST-24 Stress Tests
## Recovery: "Continue FLOW-06 Phase 3" → generate FLOW06_P3_BFA.md

---

## MERGE:P2 STATE SAVE
```
MERGE:P2 = COMPLETE
Target: TASK_TYPES_CATALOG_MERGED.md
Added: T72-T76 (Family 25 / FLOW-06, 5 full-format engine contracts)
Added: AF Station Map 11x5 = 55 cells (FLOW-06)
Added: Flow Template 16 (marketplace-publishing-v1 JSON with fabricHint)
System: 25 families, T1-T76, 16 flow templates
Next: MERGE:P3 -> V62_BFA_STRESS_TEST_MERGED.md
```

# FLOW-07 MERGE — T77-T82 + AF Station Map + Flow Template 17
# Merged from: FLOW07_UNIFIED_EXECUTION_PLAN.md Phase 2
# Date: 2026-02-26 | Save Point: MERGE:P2
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


## TASK TYPE: T77 — Connection Lifecycle Gate

**ARCHETYPE:** LIFECYCLE
**ENTRY:** POST /relations/connect — user sends friend request; OR FriendRequestAccepted event for mutual-pending auto-accept
**PURPOSE:** Manage the full friend request lifecycle state machine (Pending→Accepted→Active→Weakening→Dormant), detect and enforce block-list before creation (generic failure, never reveal block), detect mutual-pending requests and auto-accept, create bidirectional graph edges in Neo4j via DATABASE FABRIC, enforce rate limiting, emit FriendRequestSent and FriendRequestAccepted events via transactional outbox
**DISTINCT FROM:**
- T47 (User Registration Lifecycle, FLOW-01): T47 manages single-user onboarding state machine. T77 manages TWO-USER relationship lifecycle with graph database, mutual-pending detection, and block-list enforcement. Different cardinality (1-user vs 2-user), different DB (relational vs graph).
- T72 (Marketplace Listing Lifecycle, FLOW-06): T72 manages commerce listing states (Draft→Active→SoldOut). T77 manages social connection states. Different domain, different state machines, different compensation logic.

**FACTORY DEPENDENCIES:** F234, F236
**FABRIC RESOLUTION:**
- F234 → DATABASE FABRIC(Neo4j) + DATABASE FABRIC(PG) + DATABASE FABRIC(Redis) + QUEUE FABRIC(Redis Streams)
- F236 → QUEUE FABRIC(Redis Streams) + DATABASE FABRIC(Redis+PG) + FLOW ENGINE FABRIC

**AF CONFIGURATION:**
- AF-1 Genesis: Generate connection lifecycle service extending MicroserviceBase; state machine from T77 contract; bidirectional graph edge creation
- AF-2 Planning: Decompose into: checkBlock → checkRateLimit → checkMutualPending → createRequest → storeGraph → emitEvent → [onAccept: createBidirectionalEdge → initiateIntegration]
- AF-3 Prompt Library: connection-lifecycle-v1 prompt for state machine generation
- AF-4 RAG: Search SK-23 (Graph Edge Lifecycle) for Neo4j patterns via DATABASE FABRIC; Skill 09 for state machine registry (EP-1); Skill 04 for queue event patterns
- AF-5 Multi-model: N/A — pure lifecycle orchestration, no AI generation
- AF-6 Code Review: Verify block check precedes creation; mutual-pending detection atomicity; bidirectional edge creation; transactional outbox for events
- AF-7 Compliance: DNA-1 through DNA-8; no typed FriendRequest model; DataProcessResult on all paths; transactional outbox on event-publishing paths
- AF-8 Security: Block-list check BEFORE request creation; generic failure on block (no block enumeration); BOLA check (only sender/recipient can act); rate limit enforcement (configurable/day); request deduplication (same pair within 24h)
- AF-9 Judge: 10 quality gates (see below)
- AF-10 Merge: N/A
- AF-11 Feedback: Store request acceptance rate, mutual-pending frequency, block-check hit rate, rate limit trigger frequency

**BFA VALIDATION:** CF-52 (connection graph ≠ cooperator graph), CF-56 (connection stream ≠ integration stream), CF-59 (notification channel isolation)

**MACHINE:**
- Block check MUST execute BEFORE request creation — if blocked, return generic DataProcessResult(IsSuccess=false), NEVER reveal block existence
- Mutual-pending auto-accept: if A→B pending exists and B→A arrives, auto-accept BOTH, emit FriendRequestAccepted for BOTH
- All connections MUST be bidirectional (A↔B stored as FRIEND_OF edge in both directions)
- State transitions FIXED: Pending→Accepted, Pending→Rejected, Pending→Withdrawn, Accepted→Active, Active→Weakening, Weakening→Dormant, Dormant→Active
- Events MUST use transactional outbox (DNA-8)
- Request deduplication: same sender+recipient within 24h = reject

**FREEDOM:**
- Friend request rate limit per day (default: 20, range: 5-50)
- Request expiry duration (default: 30 days, range: 7-90 days)
- Connection cache TTL (default: 1h, range: 15min-24h)
- Graph query timeout (default: 2s, range: 1s-10s)

**IRON RULES:**
- IR-77-1: CheckBlockStatusAsync MUST be the FIRST operation — any code path that creates a request without block check = BUILD FAILURE
- IR-77-2: Block detection MUST return generic DataProcessResult(IsSuccess=false, Message="Request could not be sent") — NEVER include block reason, blocker identity, or block timestamp
- IR-77-3: FriendRequestSent event MUST be idempotent — duplicate sends for same pair within 24h rejected
- IR-77-4: Rate limit MUST be enforced via Redis ZSET sliding window BEFORE any DB writes
- IR-77-5: Mutual-pending detection MUST be atomic — use Redis distributed lock on sorted(userId1,userId2) during the check-and-accept window
- IR-77-6: All graph edges MUST be bidirectional — A→B AND B→A created in single transaction
- IR-77-7: integrationId MUST be generated and returned on acceptance (feeds into T79)
- IR-77-8: State transitions MUST use EP-1 State Machine Registry — invalid transition = BUILD FAILURE
- IR-77-9: All writes MUST include tenantId scope (DNA-5)
- IR-77-10: No typed FriendRequest or Connection model — Dictionary<string,object> only (DNA-1)

**QUALITY GATES (AF-9):**
- QG-77-1: Block check test — blocked user pair returns generic failure, no block information leaked
- QG-77-2: Mutual-pending auto-accept test — A→B + B→A (50ms gap) results in single bidirectional connection, no duplicates
- QG-77-3: Rate limit test — (limit+1) requests in 24h → last one returns HTTP 429
- QG-77-4: State machine compliance — all valid transitions succeed, all invalid transitions fail
- QG-77-5: Bidirectional edge test — after acceptance, both A→B and B→A edges exist in Neo4j
- QG-77-6: Transactional outbox test — DB write + event in same transaction, event visible on stream after commit
- QG-77-7: Deduplication test — same sender+recipient within 24h returns "already pending"
- QG-77-8: integrationId generation — acceptance returns valid integrationId used by T79
- QG-77-9: Tenant isolation — connection data invisible cross-tenant in Neo4j
- QG-77-10: EP-1 state machine — invalid Pending→Dormant transition rejected

---

## TASK TYPE: T78 — Initial Match Scoring

**ARCHETYPE:** COMPUTATION
**ENTRY:** FriendRequestSent event — triggers immediate background scoring
**PURPOSE:** Pre-compute AI-powered pairwise compatibility score between sender and recipient profiles as soon as request is sent; cache result for instant availability when acceptance triggers weight calculation; store in ES for batch analytics
**DISTINCT FROM:**
- T73 (Three-Way Enrichment Fork, FLOW-06): T73 forks three enrichment branches for a listing. T78 computes a single pairwise compatibility score between two users — different cardinality, different data domain.
- T74 (Synergy Scoring, FLOW-06): T74 computes 5-factor business synergy for marketplace cooperation. T78 computes personal profile compatibility for social connection — different formula, different inputs, different output semantics.

**FACTORY DEPENDENCIES:** F235
**FABRIC RESOLUTION:**
- F235 → DATABASE FABRIC(PG+ES+Redis) + AI ENGINE FABRIC(AiDispatcher)

**AF CONFIGURATION:**
- AF-1 Genesis: Generate scoring service extending MicroserviceBase; symmetric pairwise computation with AI ENGINE FABRIC
- AF-2 Planning: Decompose into: fetchProfiles(both users) → computeFactors → callAiEngine → normalizeScore → cacheResult → storeES → emitEvent
- AF-3 Prompt Library: profile-compatibility-v1 prompt for AI-assisted profile analysis
- AF-4 RAG: Search SK-6 (AI Engine patterns); F229 synergy pattern for weighted formula structure
- AF-5 Multi-model: Run compatibility analysis on 2 models, take average for robustness
- AF-6 Code Review: Verify symmetry (score(A,B) == score(B,A)); cache key uses sorted IDs; timeout on AI call
- AF-7 Compliance: DNA-1 through DNA-7; no typed MatchScore model
- AF-8 Security: Profile data access restricted to match scoring context; no cross-tenant profile leakage in prompts
- AF-9 Judge: 6 quality gates (see below)
- AF-10 Merge: Average of multi-model scores with confidence weighting
- AF-11 Feedback: Store match score vs eventual connection strength correlation (reinforcement signal for model tuning)

**BFA VALIDATION:** CF-54 (matching/scoring ≠ cooperator scoring)

**MACHINE:**
- Score MUST be symmetrical: score(A,B) = score(B,A) — enforced by sorting userId pair before computation
- Score range clamped [0.0, 1.0]
- AI ENGINE FABRIC call MUST have configurable timeout (default: 5s)
- Score MUST be computed asynchronously on FriendRequestSent — MUST NOT block request creation
- If AI ENGINE is unavailable, default score = 0.5 (graceful degrade)

**FREEDOM:**
- AI model for compatibility (default: claude-sonnet)
- Score cache TTL (default: 3600s, range: 600s-86400s)
- Scoring factor weights (default: industry=0.30, experience=0.25, interests=0.25, location=0.20)
- AI call timeout (default: 5s, range: 2s-15s)

**IRON RULES:**
- IR-78-1: Cache key MUST use sorted(userId1, userId2) — unsorted key = BUILD FAILURE (symmetry violation)
- IR-78-2: Match scoring MUST be asynchronous — blocking the request response = BUILD FAILURE
- IR-78-3: All scoring data MUST be Dictionary<string,object> — no typed MatchResult (DNA-1)
- IR-78-4: AI ENGINE FABRIC timeout MUST be enforced — no unbounded waits
- IR-78-5: AI model unavailability MUST default to 0.5, MUST NOT throw
- IR-78-6: tenantId MUST be on all PG/ES/Redis queries (DNA-5)

**QUALITY GATES (AF-9):**
- QG-78-1: Symmetry test — score(A,B) == score(B,A) for 10 random pairs
- QG-78-2: Async execution — request returns before scoring completes
- QG-78-3: AI timeout — 6s AI response returns default 0.5, no error
- QG-78-4: Cache hit — second call for same pair returns cached result within 10ms
- QG-78-5: Score range — all outputs within [0.0, 1.0]
- QG-78-6: Multi-model merge — both model scores averaged, confidence stored

---

## TASK TYPE: T79 — Four-Way Weight Analysis Fork

**ARCHETYPE:** ORCHESTRATION
**ENTRY:** FriendRequestAccepted event → FeedIntegrationStarted emission
**PURPOSE:** Fork into 4 parallel weight analysis branches (group, event, purchase, questionnaire) with allSettled semantics and EP-2 durable timer deadline; collect sub-weights; apply default 0.5 for timed-out branches; queue async retries for missing branches; enforce privacy mask on F239/F240 outputs; pass collected weights to T80 (weight convergence)
**DISTINCT FROM:**
- T40 (Three-Way Join Gate, V39/V40): T40 joins 3 audience streams. T79 forks AND joins 4 analysis branches with allSettled, default weights, and privacy mask enforcement. Extra branch, different semantics (default vs fail), privacy constraint.
- T73 (Three-Way Enrichment Fork, FLOW-06): T73 forks 3 enrichment processes for a listing. T79 forks 4 ANALYSIS processes for a user pair with strict privacy masking on 2 of 4 branches.

**FACTORY DEPENDENCIES:** F236, F237, F238, F239, F240
**FABRIC RESOLUTION:**
- F236 → QUEUE FABRIC(Redis Streams) + DATABASE FABRIC(Redis+PG) + FLOW ENGINE FABRIC(EP-2)
- F237 → DATABASE FABRIC(PG+MongoDB)
- F238 → DATABASE FABRIC(PG)
- F239 → DATABASE FABRIC(PG)
- F240 → DATABASE FABRIC(MongoDB)

**AF CONFIGURATION:**
- AF-1 Genesis: Generate fork orchestrator with allSettled pattern, EP-2 deadline timer, default weight injection, privacy mask validation
- AF-2 Planning: Decompose into: emitFeedIntegrationStarted → fork(group+event+purchase+questionnaire) → startTimer(EP-2, 10s) → collectWeights(allSettled) → applyDefaults → validatePrivacy → passToWeightCalc
- AF-3 Prompt Library: weight-analysis-fork-v1 prompt for parallel orchestration generation
- AF-4 RAG: Search SK-24 (Four-Way AllSettled Fork); SK-28 (Privacy-Masked Analyzer); T40/T73 allSettled patterns; EP-2 timer patterns
- AF-5 Multi-model: N/A — pure orchestration, no AI content generation
- AF-6 Code Review: Verify allSettled semantics (not allResolved); EP-2 timer registration; default 0.5 injection; privacy mask enforcement on F239/F240 responses; async retry queue for missing branches
- AF-7 Compliance: DNA-1 through DNA-8; transactional outbox on FeedIntegrationStarted
- AF-8 Security: Privacy mask validation — raw purchase/questionnaire data in F239/F240 response = BUILD FAILURE; integrationId correlation on all events
- AF-9 Judge: 8 quality gates (see below)
- AF-10 Merge: N/A (each branch returns independently)
- AF-11 Feedback: Store branch completion rates, timeout frequency, default weight usage, retry success rates

**BFA VALIDATION:** CF-52, CF-53, CF-54, CF-55, CF-56, CF-57

**MACHINE:**
- Fork MUST use allSettled semantics — one branch failure/timeout does NOT block others
- Deadline MUST use EP-2 Durable Timer (survives pod restarts)
- Timed-out branch default weight = configurable value (MACHINE: default MUST be applied; FREEDOM: value)
- integrationId MUST be present on ALL emitted events (correlationKey)
- F239 and F240 MUST return ONLY aggregate float + opaque weightFactors (raw data = BUILD FAILURE)
- All 4 branches MUST execute in parallel (never sequential)
- Retry MUST NOT re-trigger already-completed branches

**FREEDOM:**
- Weight timeout deadline (default: 10s, range: 5s-30s)
- Default missing weight value (default: 0.5, range: 0.3-0.7)
- Retry delay for missing branches (default: 30s, range: 10s-5min)
- Max retry attempts (default: 3, range: 1-10)

**IRON RULES:**
- IR-79-1: allSettled timeout MUST use EP-2 Durable Timer — Thread.Sleep or non-durable timeout = BUILD FAILURE
- IR-79-2: Missing branch MUST default to configured value (default 0.5), MUST NOT block other branches
- IR-79-3: integrationId MUST be present on ALL emitted events — missing correlation = BUILD FAILURE
- IR-79-4: Each branch MUST be independently idempotent (replay produces same result)
- IR-79-5: F239/F240 MUST return ONLY aggregate float (0.0-1.0) + opaque weightFactors — raw purchase/questionnaire data in response = BUILD FAILURE
- IR-79-6: Retry MUST NOT re-trigger completed branches — only retrigger failed/timed-out branches
- IR-79-7: All 4 branches MUST start in parallel (sequential execution = BUILD FAILURE, verified by QG-79-4)
- IR-79-8: Individual branch failure MUST NOT crash the orchestrator — caught, logged, defaulted

**QUALITY GATES (AF-9):**
- QG-79-1: Timeout test — 3/4 branches respond in 3s, 1 branch hangs; after 10s, orchestrator proceeds with 3 real + 1 default (0.5)
- QG-79-2: Privacy mask test — inject raw purchase data into F239 response → BUILD FAILURE detected by AF-8
- QG-79-3: Idempotency test — replay FeedIntegrationStarted for same integrationId → no duplicate branch executions
- QG-79-4: Parallel execution — all 4 branches start within 100ms of fork trigger (timestamp verification)
- QG-79-5: integrationId propagation — all 4 sub-weight events carry the same integrationId
- QG-79-6: Partial completion — 2/4 branches succeed → 2 real weights + 2 defaults (0.5) passed to T80
- QG-79-7: EP-2 timer persistence — kill pod during wait, restart, timer fires at original deadline
- QG-79-8: Retry isolation — retrigger failed branch only, verify completed branches not re-executed

---

## TASK TYPE: T80 — ML Weight Convergence Gate

**ARCHETYPE:** COMPUTATION
**ENTRY:** All sub-weights collected (from T79 orchestrator) → weight calculation triggered
**PURPOSE:** Combine 5 weight components (base match + 4 sub-weights) using fixed-coefficient formula, apply bounded ML adjustment (±0.2 clamped), produce final connection strength (0.0-1.0) with confidence score, emit FinalWeightCalculated event
**DISTINCT FROM:**
- T74 (Synergy Scoring, FLOW-06): T74 computes 5-factor business synergy WITHOUT ML adjustment — pure weighted sum. T80 computes 5-factor connection weight WITH ML adjustment bounded ±0.2 — different formula structure, ML component is new.
- T60 (Multi-Factor Audience Scoring, FLOW-03): T60 scores audience relevance for event promotion. T80 scores interpersonal connection strength — different domain, different formula, ML adjustment.

**FACTORY DEPENDENCIES:** F241
**FABRIC RESOLUTION:**
- F241 → DATABASE FABRIC(Redis) + AI ENGINE FABRIC(ML inference)

**AF CONFIGURATION:**
- AF-1 Genesis: Generate weight calculation service with fixed-coefficient formula + ML adjustment layer
- AF-2 Planning: Decompose into: validateInputs → computeRawWeight → callMLModel → clampAdjustment → computeFinalWeight → computeConfidence → cacheResult → emitEvent
- AF-3 Prompt Library: N/A — formula is deterministic; ML model is inference-only
- AF-4 RAG: Search SK-25 (ML-Bounded Weight Formula); F229 synergy formula pattern (adapt for ML)
- AF-5 Multi-model: ML model selection is FREEDOM; single model per request (not consensus)
- AF-6 Code Review: Verify coefficient sum = 1.0; ML adjustment clamped [-0.2, +0.2]; final weight clamped [0.0, 1.0]; graceful degrade if ML unavailable
- AF-7 Compliance: DNA-1 through DNA-7; no typed WeightResult model
- AF-8 Security: ML model input MUST NOT include raw user data — only aggregate scores + anonymized features
- AF-9 Judge: 8 quality gates (see below)
- AF-10 Merge: N/A
- AF-11 Feedback: Store finalWeight + componentWeights + mlAdjustment → training pipeline for ML model improvement

**BFA VALIDATION:** CF-57 (weight calc ≠ synergy calc)

**MACHINE:**
- Formula coefficients: baseMatch×0.25 + groups×0.20 + events×0.20 + purchases×0.15 + questionnaires×0.20 — FIXED (not admin-configurable)
- ML adjustment MUST be clamped to [-0.2, +0.2]
- Final weight MUST be clamped to [0.0, 1.0]
- ML model MUST be called through AI ENGINE FABRIC — never direct model import
- If ML model unavailable, mlAdjustment = 0.0 (graceful degrade, never fail)
- Confidence score = 1.0 - (defaultedBranchCount × 0.15) — reflects degraded input quality

**FREEDOM:**
- ML model selection (default: gradient-boost-v1, enum of registered models)
- ML inference timeout (default: 2s, range: 1s-5s)
- Weight history retention (default: 365 days)

**IRON RULES:**
- IR-80-1: Formula coefficients MUST be exactly 0.25/0.20/0.20/0.15/0.20 — different coefficients = BUILD FAILURE
- IR-80-2: ML adjustment MUST be clamped to [-0.2, +0.2] — unclamped adjustment = BUILD FAILURE
- IR-80-3: Final weight MUST be clamped to [0.0, 1.0] — out-of-range = BUILD FAILURE
- IR-80-4: ML model MUST route through AI ENGINE FABRIC — direct Python/TF import = BUILD FAILURE
- IR-80-5: ML unavailability MUST produce mlAdjustment=0.0, MUST NOT throw
- IR-80-6: FinalWeightCalculated event MUST carry: integrationId, finalWeight, componentWeights, mlAdjustment, confidenceScore
- IR-80-7: All weight data as Dictionary<string,object> — no typed WeightResult (DNA-1)
- IR-80-8: Weight history MUST be stored for ML training pipeline (Redis ZSET)

**QUALITY GATES (AF-9):**
- QG-80-1: Coefficient validation — formula uses exactly 0.25/0.20/0.20/0.15/0.20 (sum=1.0)
- QG-80-2: ML clamping — ML returns +0.35 → clamped to +0.2; ML returns -0.5 → clamped to -0.2
- QG-80-3: Final weight clamping — rawWeight=0.95 + mlAdjust=+0.15 → finalWeight=1.0 (not 1.10)
- QG-80-4: ML degrade — ML service down → mlAdjustment=0.0, computation completes successfully
- QG-80-5: Confidence score — 0 defaults → confidence=1.0; 2 defaults → confidence=0.7; 4 defaults → confidence=0.4
- QG-80-6: Event payload completeness — FinalWeightCalculated has all 5 required fields
- QG-80-7: Weight history persistence — after computation, entry exists in Redis ZSET with timestamp
- QG-80-8: Deterministic formula — same inputs always produce same rawWeight (ML may vary)

---

## TASK TYPE: T81 — Tiered Historical Feed Backfill

**ARCHETYPE:** DISTRIBUTION
**ENTRY:** FinalWeightCalculated event — triggers bidirectional feed injection based on computed connection strength tier
**PURPOSE:** Retrieve last-30-days historical posts from BOTH newly connected users (cross-flow read from F208), determine tier (strong/medium/weak) from finalWeight, inject posts bidirectionally into BOTH feeds with zone placement (top 20%/middle 40%/bottom 40%), enforce diversity rules (max consecutive, high-engagement filters), emit HistoricalPostsIntegrated and FeedIntegrationCompleted events, store injection metadata for rollback capability
**DISTINCT FROM:**
- T64 (Feed Distribution Gate, FLOW-04): T64 distributes posts FROM one author TO their audience — unidirectional, score-ranked. T81 injects historical posts INTO BOTH users' feeds bidirectionally with tiered zone placement — different direction, zone-based placement vs score-based ranking, rollback capability.
- T75 (Multi-Audience Marketplace Distribution, FLOW-06): T75 distributes marketplace cards to 3 audience channels. T81 injects social connection posts to exactly 2 users with zone constraints. Different cardinality (3 channels vs 2 users), different placement logic.

**FACTORY DEPENDENCIES:** F242, F234, F208 (cross-flow read from FLOW-04)
**FABRIC RESOLUTION:**
- F242 → DATABASE FABRIC(Redis Cluster) + DATABASE FABRIC(PG+Redis) + QUEUE FABRIC(Redis Streams)
- F234 → DATABASE FABRIC(Neo4j) — read connection strength
- F208 → DATABASE FABRIC(PG) — cross-flow read: historical posts (last 30 days)

**AF CONFIGURATION:**
- AF-1 Genesis: Generate bidirectional feed injection service with tiered zone placement, diversity enforcement, rollback support
- AF-2 Planning: Decompose into: readFinalWeight → determineTier → fetchHistoricalPosts(both users, F208) → filterByTierRules → calculateZonePositions → enforceDiversity → injectBidirectional → storeInjectionMeta → emitEvents
- AF-3 Prompt Library: N/A — rule-based zone placement, no AI generation
- AF-4 RAG: Search SK-26 (Tiered Zone Feed Injection); F173 feed write patterns (adapt for bidirectional); F208 post retrieval patterns (cross-flow read)
- AF-5 Multi-model: N/A — pure distribution logic
- AF-6 Code Review: Verify bidirectional injection (BOTH feeds modified); zone placement within tier boundaries; diversity rules (max consecutive); 30-day window enforcement; idempotency (same integrationId = no duplicate posts); rollback mechanism
- AF-7 Compliance: DNA-1 through DNA-8; transactional outbox on HistoricalPostsIntegrated and FeedIntegrationCompleted
- AF-8 Security: Post visibility check — private posts MUST NOT be injected; user privacy settings (FREEDOM FR12/FR13) respected; max 30% friend content cap enforced at injection time
- AF-9 Judge: 8 quality gates (see below)
- AF-10 Merge: N/A
- AF-11 Feedback: Store injection counts per tier, zone placement accuracy, diversity rule trigger frequency, rollback frequency

**BFA VALIDATION:** CF-53 (feed injection ≠ feed distribution), CF-58 (Redis key namespace), CF-60 (analytics event isolation)

**MACHINE:**
- Injection MUST be bidirectional — BOTH User A and User B feeds modified in single operation
- Historical window: last 30 days ONLY — no older posts eligible
- Strong (>0.8): 20 posts per user, top 20% zone, max 3 consecutive from same author
- Medium (0.5-0.8): 10 posts per user, middle 40% zone, diversity rules enforced
- Weak (<0.5): 5 posts per user, bottom 40% zone, high-engagement posts only
- Max 30% friend content cap enforced at injection time
- Private posts MUST NEVER be injected into the other user's feed
- Injection MUST be idempotent — same integrationId + same users = no duplicate posts
- Rollback MUST remove ALL injected posts (for block/unfriend scenarios)
- HistoricalPostsIntegrated and FeedIntegrationCompleted MUST use transactional outbox (DNA-8)

**FREEDOM:**
- Feed integration level per user (Full/Selective/Minimal) — `freedom_privacy_{tenantId}`
- Post types to share per user (All/Public/Selected) — `freedom_privacy_{tenantId}`
- Time decay coefficient in position formula (default: 0.3)
- Engagement coefficient in position formula (default: 0.2)

**IRON RULES:**
- IR-81-1: Historical window MUST be exactly 30 days — posts older than 30 days = excluded, no exceptions
- IR-81-2: Tier post counts MUST match spec — Strong:20, Medium:10, Weak:5 — off-by-one = BUILD FAILURE
- IR-81-3: Zone placement MUST stay within tier boundaries — Strong post in bottom 40% = BUILD FAILURE
- IR-81-4: Injection MUST be idempotent — duplicate integrationId MUST NOT produce duplicate feed items
- IR-81-5: Private posts MUST NOT be injected — post visibility check BEFORE injection
- IR-81-6: Max 3 consecutive posts from same author in strong tier — diversity rule enforced
- IR-81-7: Weak tier: ONLY high-engagement posts (above median engagement score for that user)
- IR-81-8: Max 30% friend content cap MUST be verified before injection — if over, reduce injection count proportionally

**QUALITY GATES (AF-9):**
- QG-81-1: Bidirectional test — after injection, both User A and User B feeds contain the other's posts
- QG-81-2: Tier compliance — finalWeight=0.9 produces 20 posts in top 20%; finalWeight=0.6 produces 10 in middle 40%; finalWeight=0.3 produces 5 in bottom 40%
- QG-81-3: 30-day window — post from 31 days ago excluded, post from 29 days ago included
- QG-81-4: Diversity rule — inject 20 posts from 3 authors → max 3 consecutive from any author
- QG-81-5: Private post exclusion — private post skipped, next eligible post selected
- QG-81-6: Idempotency — replay FinalWeightCalculated for same integrationId → zero new feed items
- QG-81-7: Rollback — after RollbackInjectionAsync, ALL injected posts removed from BOTH feeds
- QG-81-8: 30% cap — user already at 28% friend content, injection reduces to fit within 30% ceiling

---

## TASK TYPE: T82 — Connection Strength Rebalancer

**ARCHETYPE:** SCHEDULED
**ENTRY:** EP-2 Durable Timer fires every configurable interval (default: 6h) — no human trigger
**PURPOSE:** Recalculate connection strength for all active connections in a tenant based on recent interaction frequency, engagement quality, and reciprocal actions; re-position friend content in feeds based on updated strength; enforce 30% friend content cap; apply 24-hour new-friend visibility boost; detect dormant connections (below threshold) and queue reconnection prompts; emit ConnectionStrengthUpdated events
**DISTINCT FROM:**
- All prior task types (T1-T81): T82 is the FIRST SCHEDULED archetype in the engine — all prior task types are triggered by events or HTTP calls. T82 runs on a durable timer only.
- T76 (Marketplace Intelligence, FLOW-06): T76 runs asynchronously after distribution but is still event-triggered. T82 has NO trigger event — only EP-2 timer.
- T64 (Feed Distribution, FLOW-04): T64 distributes at content creation time. T82 REBALANCES existing feed positions over time.

**FACTORY DEPENDENCIES:** F243, F234, F242
**FABRIC RESOLUTION:**
- F243 → DATABASE FABRIC(PG+Redis) + FLOW ENGINE FABRIC(EP-2) + QUEUE FABRIC(Redis Streams)
- F234 → DATABASE FABRIC(Neo4j) — read connection graph + update strength
- F242 → DATABASE FABRIC(Redis Cluster) — reposition feed items based on new strength

**AF CONFIGURATION:**
- AF-1 Genesis: Generate scheduled rebalancer service with EP-2 timer registration, batch processing, dormancy detection, reconnection prompt queuing — FIRST scheduled archetype
- AF-2 Planning: Decompose into: acquireDistributedLock → batchLoadConnections → forEachBatch(calculateEvolution → updateStrength → detectDormancy → repositionFeed) → applyNewFriendBoost → enforce30pctCap → queueReconnectionPrompts → releaseLock → emitEvents
- AF-3 Prompt Library: N/A — rule-based rebalancing, no AI generation
- AF-4 RAG: Search SK-27 (Connection Strength Evolution); EP-2 durable timer patterns; F243 factory spec; batch processing patterns from SK-9 (Flow Engine)
- AF-5 Multi-model: N/A — pure computation and rule application
- AF-6 Code Review: Verify EP-2 timer registration (not cron); distributed lock prevents overlapping runs; batch size respects backpressure limit; dormancy threshold from FREEDOM config; 30% cap enforcement; new-friend boost 24h window
- AF-7 Compliance: DNA-1 through DNA-8; transactional outbox on ConnectionStrengthUpdated
- AF-8 Security: Rebalancer MUST NOT expose raw interaction data between users — only aggregate strength value propagated; tenant isolation in batch processing
- AF-9 Judge: 8 quality gates (see below)
- AF-10 Merge: N/A
- AF-11 Feedback: Store rebalance run duration, connections updated count, dormancy transition count, reconnection prompt queue size, new-friend boost applications

**BFA VALIDATION:** CF-63 (rebalancer timing ≠ FLOW-04 feed refresh), CF-60 (analytics event isolation)

**MACHINE:**
- Timer MUST use EP-2 Durable Timer — cron or Thread.Sleep = BUILD FAILURE
- Max 30% friend content in any user's feed enforced during rebalance
- Dormancy detection MUST apply configurable threshold
- New friend boost: 24h window from connection acceptance, then normal ranking
- Distributed lock MUST prevent overlapping rebalance runs
- Batch processing: max configurable connections per batch (backpressure)
- ConnectionStrengthUpdated MUST use transactional outbox (DNA-8)
- Rebalancer MUST be tenant-scoped (never cross-tenant in a single run)

**FREEDOM:**
- Rebalance interval (default: 6h, range: 1h-24h)
- New friend boost duration (default: 24h, range: 6h-72h)
- Dormancy threshold (default: 0.2, range: 0.1-0.3)
- Reconnection prompt threshold (default: 0.15, range: 0.1-0.2)
- Rebalance batch size (default: 500, range: 100-1000)
- Strength evolution factor weights (default: interaction=0.40, engagement=0.35, reciprocal=0.25)

**IRON RULES:**
- IR-82-1: Max 30% friend content MUST be enforced during every rebalance run — exceeding 30% = adjust positions until compliant
- IR-82-2: EP-2 Durable Timer MUST be the ONLY trigger — no HTTP endpoint or manual trigger for rebalance
- IR-82-3: Distributed lock MUST be acquired BEFORE processing — overlapping runs = data inconsistency
- IR-82-4: Batch size MUST NOT exceed configured maximum — unbounded batch = memory risk, BUILD FAILURE
- IR-82-5: Dormancy transitions MUST update Neo4j edge property AND Redis cache atomically
- IR-82-6: New-friend boost MUST expire exactly at configured duration — no permanent boost
- IR-82-7: Reconnection prompts MUST be queued, not sent synchronously — no notification during rebalance
- IR-82-8: All strength data as Dictionary<string,object> — no typed ConnectionStrength model (DNA-1)

**QUALITY GATES (AF-9):**
- QG-82-1: EP-2 timer test — timer registered, fires at configured interval, survives pod restart
- QG-82-2: Distributed lock — two concurrent rebalance attempts → only one executes, other backs off
- QG-82-3: Dormancy detection — connection with zero interactions in 30 days → strength below threshold → marked dormant
- QG-82-4: 30% cap enforcement — user at 35% friend content after rebalance → positions adjusted to 30%
- QG-82-5: New-friend boost — connection at 22h since acceptance has boost; at 26h boost removed
- QG-82-6: Batch isolation — batch of 500 processed, next batch loads correctly from offset
- QG-82-7: Reconnection prompt — dormant connection queues prompt, prompt delivered via notification service (not inline)
- QG-82-8: Tenant isolation — rebalance for tenant A does not read/modify tenant B connections

---

## AF STATION MAP — FLOW-07 (11 × 6 = 66 cells)

| AF Station | T77 Connection Lifecycle | T78 Match Scoring | T79 Four-Way Fork | T80 ML Weight Convergence | T81 Feed Backfill | T82 Rebalancer |
|------------|------------------------|--------------------|-------------------|--------------------------|-------------------|----------------|
| **AF-1 Genesis** | Lifecycle orchestrator + state machine + bidirectional graph edge creation | Pairwise scoring service with AI ENGINE FABRIC + symmetric caching | Fork orchestrator with allSettled + EP-2 deadline timer + privacy mask | Weight calculation with fixed-coefficient formula + ML adjustment layer | Bidirectional feed injection with tiered zone placement + rollback | Scheduled rebalancer with EP-2 timer + batch processing + dormancy |
| **AF-2 Planning** | checkBlock → checkRate → checkMutual → createReq → storeGraph → emit → [accept: biEdge → initIntegration] | fetchProfiles → computeFactors → callAI → normalize → cache → storeES → emit | emitStarted → fork(G+E+P+Q) → timer(EP-2,10s) → collect(allSettled) → defaults → validate → pass | validate → rawWeight → callML → clampAdj → finalWeight → confidence → cache → emit | readWeight → tier → fetchPosts(F208) → filter → zones → diversity → injectBi → meta → emit | lock → batchLoad → forEach(evolve → update → dormancy → reposition) → boost → cap → prompts → release |
| **AF-3 Prompt Library** | connection-lifecycle-v1 | profile-compatibility-v1 | weight-analysis-fork-v1 | N/A (deterministic formula + ML inference) | N/A (rule-based zone placement) | N/A (rule-based rebalancing) |
| **AF-4 RAG** | SK-23 (Graph Edge Lifecycle); Skill 09 EP-1 state machine; Skill 04 queue patterns | SK-6 (AI Engine); F229 synergy pattern structure | SK-24 (AllSettled Fork); SK-28 (Privacy Mask); T40/T73 patterns; EP-2 timer | SK-25 (ML-Bounded Weight); F229 synergy adapt | SK-26 (Tiered Zone Injection); F173 feed write; F208 post retrieval | SK-27 (Strength Evolution); EP-2 timer; SK-9 Flow Engine batch |
| **AF-5 Multi-model** | N/A | 2-model average with confidence weighting | N/A (pure orchestration) | ML model via FREEDOM config (single per request) | N/A (pure distribution) | N/A (pure computation) |
| **AF-6 Code Review** | Block precedes creation; mutual-pending atomicity; bidirectional edges; transactional outbox | Symmetry score(A,B)==score(B,A); sorted cache key; AI timeout | allSettled not allResolved; EP-2 timer; default 0.5; privacy mask on F239/F240; async retry | Coefficient sum=1.0; ML clamp [-0.2,+0.2]; final clamp [0,1]; ML degrade | Bidirectional both feeds; zone boundaries; diversity; 30-day window; idempotency; rollback | EP-2 not cron; distributed lock; batch limit; dormancy threshold; 30% cap; boost expiry |
| **AF-7 Compliance** | DNA-1 through DNA-8; no typed FriendRequest; outbox on events | DNA-1 through DNA-7; no typed MatchScore | DNA-1 through DNA-8; outbox on FeedIntegrationStarted | DNA-1 through DNA-7; no typed WeightResult | DNA-1 through DNA-8; outbox on completion events | DNA-1 through DNA-8; outbox on ConnectionStrengthUpdated |
| **AF-8 Security** | Block generic failure (no enumeration); BOLA check; rate limit; dedup 24h | Profile access in scoring context only; no cross-tenant in prompts | Privacy mask on F239/F240 = BUILD FAILURE if raw data; integrationId on all events | ML input: aggregate scores only, no raw user data | Private posts excluded; privacy settings FR12/FR13; 30% cap | No raw interaction data exposed; tenant isolation in batch |
| **AF-9 Judge** | 10 QGs (QG-77-1 through QG-77-10) | 6 QGs (QG-78-1 through QG-78-6) | 8 QGs (QG-79-1 through QG-79-8) | 8 QGs (QG-80-1 through QG-80-8) | 8 QGs (QG-81-1 through QG-81-8) | 8 QGs (QG-82-1 through QG-82-8) |
| **AF-10 Merge** | N/A | Average of multi-model scores | N/A (branches return independently) | N/A | N/A | N/A |
| **AF-11 Feedback** | Acceptance rate, mutual-pending freq, block-check rate, rate-limit freq | Score vs eventual strength correlation (reinforcement) | Branch completion rates, timeout freq, default usage, retry success | finalWeight + components + mlAdj → ML training pipeline | Injection counts/tier, zone accuracy, diversity triggers, rollback freq | Run duration, connections updated, dormancy count, prompt queue size |

---

## FLOW TEMPLATE 17 — friend-request-feed-integration-v1

```json
{
  "id": "friend-request-feed-integration-v1",
  "version": "1.0",
  "flowId": "FLOW-07",
  "description": "Friend Request & Feed Integration — From connection request through multi-factor weight calculation to bidirectional historical feed merge and ongoing strength evolution",
  "correlationKey": "integrationId",
  "secondaryCorrelationKey": "connectionId",
  "entryEvent": "POST /relations/connect",
  "exitEvents": ["FeedIntegrationCompleted", "ConnectionStrengthUpdated"],

  "machineConfig": {
    "blockCheck": "BEFORE_REQUEST_CREATION",
    "mutualPending": "AUTO_ACCEPT",
    "connectionDirection": "BIDIRECTIONAL",
    "stateTransitions": ["Pending→Accepted", "Pending→Rejected", "Pending→Withdrawn", "Accepted→Active", "Active→Weakening", "Weakening→Dormant", "Dormant→Active"],
    "weightFormula": {
      "coefficients": {"baseMatch": 0.25, "groups": 0.20, "events": 0.20, "purchases": 0.15, "questionnaires": 0.20},
      "coefficientSum": 1.0,
      "mlAdjustmentBound": 0.2,
      "finalWeightRange": [0.0, 1.0]
    },
    "feedTiers": {
      "strong": {"threshold": 0.8, "posts": 20, "zone": "top_20_pct", "maxConsecutive": 3},
      "medium": {"thresholdMin": 0.5, "thresholdMax": 0.8, "posts": 10, "zone": "middle_40_pct", "diversityRules": true},
      "weak": {"thresholdMax": 0.5, "posts": 5, "zone": "bottom_40_pct", "highEngagementOnly": true}
    },
    "historicalWindow": "30d",
    "maxFriendContentPct": 0.30,
    "privacyMask": {
      "enforced": ["F239:IPurchaseWeightAnalyzerService", "F240:IQuestionnaireWeightAnalyzerService"],
      "rule": "AGGREGATE_ONLY",
      "violation": "BUILD_FAILURE"
    },
    "forkStrategy": "ALL_SETTLED",
    "forkTimeoutSeconds": 10,
    "defaultMissingWeight": 0.5
  },

  "freedomConfigIndices": [
    "freedom_connection_{tenantId}",
    "freedom_weight_{tenantId}",
    "freedom_match_{tenantId}",
    "freedom_feed_{tenantId}",
    "freedom_privacy_{tenantId}"
  ],

  "steps": [
    {
      "id": "step-1",
      "name": "Connection Lifecycle Gate",
      "taskType": "T77",
      "factories": [
        {"id": "F234", "interface": "IConnectionGraphService", "createVia": "CreateAsync", "fabricHint": "database:neo4j+pg+redis,queue:redis-streams"},
        {"id": "F236", "interface": "IFeedIntegrationOrchestratorService", "createVia": "CreateAsync", "fabricHint": "database:redis+pg,queue:redis-streams,flow-engine:orchestrator"}
      ],
      "entry": {"event": "HTTP:POST /relations/connect"},
      "exit": {"events": ["FriendRequestSent", "FriendRequestAccepted"]},
      "preChecks": ["blockCheck:F234.CheckBlockStatusAsync", "rateLimit:F234.Redis.ZSET"],
      "onFailure": "compensate:RevertGraphEdge"
    },
    {
      "id": "step-2",
      "name": "Initial Match Scoring",
      "taskType": "T78",
      "factories": [
        {"id": "F235", "interface": "IMatchScoringService", "createVia": "CreateAsync", "fabricHint": "database:pg+es+redis,ai:dispatcher"}
      ],
      "entry": {"event": "FriendRequestSent"},
      "exit": {"event": "InitialMatchCalculated"},
      "async": true,
      "note": "Runs in background — does not block request flow"
    },
    {
      "id": "step-3",
      "name": "Four-Way Weight Analysis Fork",
      "taskType": "T79",
      "parallel": true,
      "joinStrategy": "allSettled",
      "joinTimeoutSeconds": 10,
      "onTimeout": "DEFAULT_0.5_CONTINUE",
      "timerEngine": "EP-2",
      "branches": [
        {
          "id": "branch-group",
          "name": "Group Weight Analysis",
          "factories": [{"id": "F237", "interface": "IGroupWeightAnalyzerService", "createVia": "CreateAsync", "fabricHint": "database:pg+mongodb"}],
          "entry": {"event": "FeedIntegrationStarted"},
          "exit": {"event": "GroupWeightCalculated"}
        },
        {
          "id": "branch-event",
          "name": "Event Weight Analysis",
          "factories": [{"id": "F238", "interface": "IEventWeightAnalyzerService", "createVia": "CreateAsync", "fabricHint": "database:pg"}],
          "entry": {"event": "FeedIntegrationStarted"},
          "exit": {"event": "EventWeightCalculated"}
        },
        {
          "id": "branch-purchase",
          "name": "Purchase Weight Analysis (Privacy-Masked)",
          "factories": [{"id": "F239", "interface": "IPurchaseWeightAnalyzerService", "createVia": "CreateAsync", "fabricHint": "database:pg"}],
          "entry": {"event": "FeedIntegrationStarted"},
          "exit": {"event": "PurchaseWeightCalculated"},
          "privacyMask": "AGGREGATE_ONLY"
        },
        {
          "id": "branch-questionnaire",
          "name": "Questionnaire Weight Analysis (Privacy-Masked)",
          "factories": [{"id": "F240", "interface": "IQuestionnaireWeightAnalyzerService", "createVia": "CreateAsync", "fabricHint": "database:mongodb"}],
          "entry": {"event": "FeedIntegrationStarted"},
          "exit": {"event": "QuestionnaireWeightCalculated"},
          "privacyMask": "AGGREGATE_ONLY"
        }
      ],
      "orchestrator": {"id": "F236", "interface": "IFeedIntegrationOrchestratorService", "createVia": "CreateAsync"},
      "entry": {"event": "FriendRequestAccepted"},
      "exit": {"events": ["GroupWeightCalculated", "EventWeightCalculated", "PurchaseWeightCalculated", "QuestionnaireWeightCalculated"]}
    },
    {
      "id": "step-4",
      "name": "ML Weight Convergence",
      "taskType": "T80",
      "factories": [
        {"id": "F241", "interface": "IWeightCalculationService", "createVia": "CreateAsync", "fabricHint": "database:redis,ai:ml-model"}
      ],
      "entry": {"event": "ALL_SETTLED:step-3"},
      "exit": {"event": "FinalWeightCalculated"},
      "formula": "baseMatch*0.25 + groups*0.20 + events*0.20 + purchases*0.15 + questionnaires*0.20 + clamp(ML,-0.2,+0.2)"
    },
    {
      "id": "step-5",
      "name": "Tiered Historical Feed Backfill",
      "taskType": "T81",
      "factories": [
        {"id": "F242", "interface": "IFeedInjectionService", "createVia": "CreateAsync", "fabricHint": "database:redis-cluster+redis+pg,queue:redis-streams"},
        {"id": "F234", "interface": "IConnectionGraphService", "note": "read connection strength"},
        {"id": "F208", "interface": "ISocialPostService", "note": "cross-flow read: historical posts (FLOW-04)", "fabricHint": "database:pg"}
      ],
      "entry": {"event": "FinalWeightCalculated"},
      "exit": {"events": ["HistoricalPostsIntegrated", "FeedIntegrationCompleted"]},
      "bidirectional": true,
      "onFailure": "compensate:RollbackInjection:F242.RollbackInjectionAsync"
    },
    {
      "id": "step-6",
      "name": "Connection Strength Rebalancer",
      "taskType": "T82",
      "factories": [
        {"id": "F243", "interface": "IConnectionEvolutionService", "createVia": "CreateAsync", "fabricHint": "database:pg+redis,flow-engine:ep-2,queue:redis-streams"},
        {"id": "F234", "interface": "IConnectionGraphService", "note": "read/update connection strength"},
        {"id": "F242", "interface": "IFeedInjectionService", "note": "reposition feed items"}
      ],
      "entry": {"trigger": "DURABLE_TIMER", "engine": "EP-2", "interval": "6h", "configKey": "freedom_feed_{tenantId}.rebalanceInterval"},
      "exit": {"event": "ConnectionStrengthUpdated"},
      "scheduled": true,
      "note": "FIRST scheduled-only step in XIIGen — no event or HTTP trigger"
    }
  ],

  "bfaRegistration": {
    "entities": ["FriendRequest", "Connection", "IntegrationRun", "ConnectionStrength", "FeedInjection"],
    "events": [
      "FriendRequestSent",
      "InitialMatchCalculated",
      "FriendRequestAccepted",
      "FeedIntegrationStarted",
      "GroupWeightCalculated",
      "EventWeightCalculated",
      "PurchaseWeightCalculated",
      "QuestionnaireWeightCalculated",
      "FinalWeightCalculated",
      "HistoricalPostsIntegrated",
      "FeedIntegrationCompleted",
      "ConnectionStrengthUpdated"
    ],
    "apis": [
      "/relations/connect",
      "/relations/accept",
      "/relations/reject",
      "/relations/withdraw",
      "/relations/block",
      "/relations/strength"
    ],
    "conflictRules": ["CF-52", "CF-53", "CF-54", "CF-55", "CF-56", "CF-57", "CF-58", "CF-59", "CF-60", "CF-61", "CF-62", "CF-63"]
  }
}
```

---

## FLOW-07 TASK TYPE SUMMARY

| Task | Name | Archetype | IRs | QGs | Factories |
|------|------|-----------|-----|-----|-----------|
| T77 | Connection Lifecycle Gate | LIFECYCLE | 10 | 10 | F234, F236 |
| T78 | Initial Match Scoring | COMPUTATION | 6 | 6 | F235 |
| T79 | Four-Way Weight Analysis Fork | ORCHESTRATION | 8 | 8 | F236, F237, F238, F239, F240 |
| T80 | ML Weight Convergence Gate | COMPUTATION | 8 | 8 | F241 |
| T81 | Tiered Historical Feed Backfill | DISTRIBUTION | 8 | 8 | F242, F234, F208 |
| T82 | Connection Strength Rebalancer | SCHEDULED | 8 | 8 | F243, F234, F242 |

**Totals: 6 task types, 48 iron rules, 48 quality gates, 66 AF cells, 1 flow template**

---

## SAVE POINT: MERGE:P2 ✅
## Next: Phase 3 — CF-52-CF-63 BFA Conflict Rules + ST-25-ST-30 Stress Tests
## Recovery: "Continue FLOW-07 Phase 3" → generate CF-52-63 + ST-25-30

---

## MERGE:P2 STATE SAVE
```
MERGE:P2 = COMPLETE
Target: TASK_TYPES_CATALOG_MERGED.md
Added: T77-T82 (Family 26 / FLOW-07, 6 full-format engine contracts)
Added: AF Station Map 11x6 = 66 cells (FLOW-07)
Added: Flow Template 17 (friend-request-feed-integration-v1 JSON with fabricHint)
Added: Task Type Summary Table (48 IRs, 48 QGs)
System: 26 families, T1-T82, 17 flow templates
Next: MERGE:P3 -> V62_BFA_STRESS_TEST_MERGED.md
```

---

# ═══════════════════════════════════════════════════════
# FLOW-08 MERGE — Task Types T83-T92 + AF Station Map + Flow Template 18
# Merged from: FLOW08_P2a_TASK_TYPES.md + FLOW08_P2b_TASK_TYPES.md
# ═══════════════════════════════════════════════════════

## T83 — Tenant Lifecycle Orchestration

```
TASK TYPE: T83 — Tenant Lifecycle Orchestration
ARCHETYPE: ORCHESTRATION
ENTRY: Fires on tenant registration API call (POST /api/tenants)
       or admin-initiated onboarding retry after failure
PURPOSE: Orchestrate the full 8-state tenant onboarding lifecycle from registration
         through domain verification, isolation provisioning, identity configuration,
         authorization setup, payment binding, webhook verification, to final activation.
         Uses EP-1 (State Machine Registry) for transition validation.
DISTINCT FROM:
  T84 (Isolation Binding — resolves WHERE data lives at runtime; T83 PROVISIONS the binding)
  T85 (Provider Strategy — selects WHICH providers; T83 orchestrates the SEQUENCE of all config steps)
  T91 (Pool→Silo Migration — changes an EXISTING binding; T83 creates the INITIAL binding)
FACTORY DEPENDENCIES:
  F244:ITenantRegistryService — resolved via CreateAsync()
  F245:ITenantConfigService — resolved via CreateAsync()
  F246:ITenantIsolationBindingService — resolved via CreateAsync()
  F248:ITenantOnboardingOrchestratorService — resolved via CreateAsync()
  F250:ITenantAuditService — resolved via CreateAsync()
  F252:IIdentityProviderAdapterService — resolved via CreateAsync()
  F254:IAuthorizationPolicyService — resolved via CreateAsync()
  F256:IPaymentProviderAdapterService — resolved via CreateAsync()
  F259:IEncryptionKeyManagementService — resolved via CreateAsync()
  F266:IComplianceLabelEnforcementService — resolved via CreateAsync()
FABRIC RESOLUTION:
  F244 → DATABASE FABRIC(ES+PG) — tenant master record + state table
  F245 → DATABASE FABRIC(ES) — versioned tenant config
  F246 → DATABASE FABRIC(ES+PG+Multi-PG) — isolation binding + RLS/schema/shard
  F248 → FLOW ENGINE FABRIC — onboarding flow definition in FlowOrchestrator
  F250 → QUEUE FABRIC(Redis Streams) + DATABASE FABRIC(ES) — audit stream + audit log
  F252 → DATABASE FABRIC(PG) + DATABASE FABRIC(ES) — local auth + JWKS cache
  F254 → DATABASE FABRIC(ES+PG) — authZ policies + object ACLs
  F256 → QUEUE FABRIC(Redis Streams) + DATABASE FABRIC(PG) — payment events + intents
  F259 → DATABASE FABRIC(ES) + External KMS — CMK metadata + key material
  F266 → DATABASE FABRIC(ES) — compliance constraint matrix
AF CONFIGURATION:
  AF-1 (Genesis): generates TenantLifecycleOrchestrator service on fabric adapters
  AF-2 (Planning): decomposes into: register → verify-domain → provision-isolation → configure-idp →
                    configure-authz → bind-payment → verify-webhooks → activate
  AF-3 (Prompt Library): retrieves state-machine-pattern prompts from skill library
  AF-4 (RAG): finds EP-1 State Machine Registry as closest pattern; adapts for 8-state lifecycle
  AF-5 (Multi-model): Claude + GPT generate competing orchestration logic
  AF-6 (Code Review): verifies all factory calls use CreateAsync(); no hardcoded providers
  AF-7 (Compliance): verifies DNA-1-8; especially DNA-8 (state transition + audit atomic via outbox)
  AF-8 (Security): checks CMK readiness validation before activation; no plaintext secrets
  AF-9 (Judge): validates all 8 Iron Rules below
  AF-10 (Merge): combines best of multi-model outputs
  AF-11 (Feedback): stores generation quality; feeds into future orchestration generation
MACHINE (fixed):
  8-state sequence is FIXED — states cannot be reordered or skipped
  Activation requires ALL prior states COMPLETED — no partial activation
  AbortOnboardingAsync rolls back in REVERSE ORDER (saga pattern via DNA-8 outbox)
  CMK-labeled tenants MUST pass F259.ValidateCmkReadinessAsync before activation
  Compliance gate (F266) runs BEFORE isolation provisioning — violations block progression
FREEDOM (configurable):
  stateTimeoutMinutesPerStep (default 1440min = 24h per step)
  requiredStepsByTier (free: skip PaymentConfigured+WebhookVerified; enterprise: all)
  onboardingWebhookUrl (tenant-provided notification endpoint)
  defaultIsolationMode per tier (free: shared_schema, pro: separate_schema, enterprise: hybrid)
IRON RULES:
  IR-83-1: F266 compliance gate MUST execute before F246 isolation provisioning. No exceptions.
  IR-83-2: F259 CMK readiness check MUST pass before activation for [cmk]-labeled tenants.
  IR-83-3: F250 audit event MUST be emitted on EVERY state transition (atomic via DNA-8 outbox).
  IR-83-4: F244 tenant registration MUST be idempotent on tenantId (duplicate returns existing).
  IR-83-5: Abort MUST roll back all completed states in reverse order — no orphaned resources.
  IR-83-6: All factory resolutions MUST use CreateAsync() with TenantId in FactoryResolutionContext.
  IR-83-7: F246 provisioning MUST complete before any identity/authZ/payment steps execute.
  IR-83-8: BuildSearchFilter MUST skip empty fields in all config-loading operations.
QUALITY GATES (AF-9):
  QG-83-1: Generated service orchestrates all 8 states in correct sequence. PASS/FAIL.
  QG-83-2: No provider SDK import in generated orchestration code. Fabric-only. PASS/FAIL.
  QG-83-3: All 8 DNA patterns present in generated service. PASS/FAIL.
  QG-83-4: Compliance gate called before isolation provisioning in generated code. PASS/FAIL.
  QG-83-5: Audit event emitted for every state transition in generated code. PASS/FAIL.
  QG-83-6: Abort path rolls back in reverse order in generated code. PASS/FAIL.
BFA VALIDATION:
  CF-64: Tenant registration must not conflict with FLOW-02 user registration (F105).
         RESOLUTION: Tenant is platform-level entity; user is tenant-scoped entity. No overlap.
  CF-65: Isolation provisioning must not conflict with FLOW-02 cached DB connections (F105).
         RESOLUTION: F246 emits TENANT_MIGRATION_STARTED; F105 consumer group acknowledges.
  CF-66: CloudEvents envelope (F247) must not break FLOW-01-07 existing event consumers.
         RESOLUTION: data.legacyPayload carries original structure for backward compatibility.
```

---

## T84 — Isolation Binding Resolution

```
TASK TYPE: T84 — Isolation Binding Resolution
ARCHETYPE: ROUTING
ENTRY: Fires on EVERY inbound request after F255 access enforcement passes
       (request pipeline middleware — zero-latency requirement)
PURPOSE: Resolve the correct database binding for a tenant request at runtime.
         Routes to shared_schema (RLS), separate_schema (search_path), separate_db (shard),
         or hybrid mode based on tenant's binding document. Cache-first for hot path.
DISTINCT FROM:
  T83 (Tenant Lifecycle — PROVISIONS the binding during onboarding; T84 RESOLVES it at runtime)
  T91 (Pool→Silo Migration — CHANGES the binding live; T84 READS the current binding)
  T85 (Provider Strategy — selects identity/payment PROVIDER; T84 selects DATABASE binding)
FACTORY DEPENDENCIES:
  F246:ITenantIsolationBindingService — resolved via CreateAsync()
  F255:IAccessEnforcementTopologyService — resolved via CreateAsync()
  F250:ITenantAuditService — resolved via CreateAsync()
FABRIC RESOLUTION:
  F246 → DATABASE FABRIC(ES) — binding index (cache-first: L1 60s, L2 ES)
       → DATABASE FABRIC(PG) — RLS session variable / schema search_path / shard routing
       → DATABASE FABRIC(Multi-PG+ES) — shard registry for separate_db
  F255 → CORE FABRIC — middleware pipeline (enforcement before binding)
  F250 → QUEUE FABRIC(Redis Streams) — audit trail for binding resolution anomalies
AF CONFIGURATION:
  AF-1 (Genesis): generates IsolationBindingMiddleware on fabric adapters
  AF-2 (Planning): decomposes into: enforce-access → resolve-binding → cache-check →
                    set-session → propagate-context
  AF-3 (Prompt Library): retrieves database-routing prompts from skill library
  AF-4 (RAG): finds SK-5 (Database Fabric) as closest pattern; adapts for multi-binding
  AF-5 (Multi-model): Claude + GPT generate competing routing logic
  AF-6 (Code Review): verifies no direct PG connection imports; all through F246
  AF-7 (Compliance): verifies DNA-5 (scope isolation via RLS/schema/shard); DNA-7 (traceparent)
  AF-8 (Security): checks RLS policy validation runs before every shared_schema query
  AF-9 (Judge): validates all 8 Iron Rules below
  AF-10 (Merge): combines best of multi-model outputs
  AF-11 (Feedback): stores quality; feeds into future routing generation
MACHINE (fixed):
  F255 enforcement MUST complete before F246 binding resolution (middleware ordering)
  Binding result is IMMUTABLE within a single request/FlowRun — no mid-execution changes
  RLS enforcement is NON-OPTIONAL for shared_schema mode — no bypass path exists
  PCI + shared_schema → BLOCKED at F266 (defense-in-depth: F246 also validates)
FREEDOM (configurable):
  bindingCacheTtlSeconds L1 (default 60), L2 (default 300)
  rlsEnforcementMode [strict | audit_only] (audit_only for migration testing only)
  defaultDataModeByTier (free: shared_schema, pro: separate_schema, enterprise: hybrid)
IRON RULES:
  IR-84-1: F255 access enforcement MUST execute before F246 binding resolution. Always.
  IR-84-2: F246.SetTenantSessionAsync MUST be called before ANY PG query in shared_schema mode.
  IR-84-3: Binding result MUST be immutable within a FlowRun — no mid-execution rebinding.
  IR-84-4: PCI-labeled tenant + shared_schema MUST return DataProcessResult.Failure(COMPLIANCE_VIOLATION).
  IR-84-5: RLS policy MUST exist on target table before any write operation (defense-in-depth).
  IR-84-6: data_residency_eu label MUST route to EU-region shard/schema — non-EU = BLOCKED.
  IR-84-7: Cache invalidation after F249 graduation MUST propagate to ALL nodes (outbox relay).
  IR-84-8: BuildSearchFilter MUST skip empty fields in binding resolution queries.
QUALITY GATES (AF-9):
  QG-84-1: Generated middleware resolves all 4 isolation modes correctly. PASS/FAIL.
  QG-84-2: No direct PG connection import in generated routing code. Fabric-only. PASS/FAIL.
  QG-84-3: All 8 DNA patterns present in generated service. PASS/FAIL.
  QG-84-4: RLS session set before every shared_schema query in generated code. PASS/FAIL.
  QG-84-5: Binding immutability enforced within FlowRun scope in generated code. PASS/FAIL.
  QG-84-6: Compliance label check present for PCI+shared_schema in generated code. PASS/FAIL.
BFA VALIDATION:
  CF-65: Isolation binding change (from T91 graduation) must notify FLOW-02 user registration (F105).
         RESOLUTION: F246 emits TENANT_MIGRATION_STARTED event; F105 consumer acknowledges before proceeding.
  CF-67: OIDC config in binding must be consistent with FLOW-03 session cache (F197).
         RESOLUTION: F245 config change invalidates F197 permission cache via CloudEvents.
```

---

## T85 — Provider Strategy Selection

```
TASK TYPE: T85 — Provider Strategy Selection
ARCHETYPE: CONFIGURATION
ENTRY: Fires when tenant config changes (F245.SaveConfigAsync) or
       tenant onboarding reaches IdPConfigured/PaymentConfigured state (F248)
PURPOSE: Dynamically select and bind identity, authorization, payment, and encryption
         providers per tenant configuration document. Strategy pattern dispatches to the
         correct provider adapter based on config fields.
DISTINCT FROM:
  T83 (Tenant Lifecycle — orchestrates the SEQUENCE of all steps; T85 handles PROVIDER SELECTION logic)
  T84 (Isolation Binding — routes DATABASE access; T85 routes PROVIDER selection)
  T86 (Payment Charge — EXECUTES a payment; T85 SELECTS which PSP to use)
FACTORY DEPENDENCIES:
  F245:ITenantConfigService — resolved via CreateAsync()
  F252:IIdentityProviderAdapterService — resolved via CreateAsync()
  F254:IAuthorizationPolicyService — resolved via CreateAsync()
  F256:IPaymentProviderAdapterService — resolved via CreateAsync()
  F259:IEncryptionKeyManagementService — resolved via CreateAsync()
  F266:IComplianceLabelEnforcementService — resolved via CreateAsync()
  F250:ITenantAuditService — resolved via CreateAsync()
FABRIC RESOLUTION:
  F245 → DATABASE FABRIC(ES) — tenant config + provider registry (cache-first)
  F252 → DATABASE FABRIC(PG) + DATABASE FABRIC(ES) + QUEUE FABRIC — identity adapter (strategy-driven)
  F254 → DATABASE FABRIC(ES+PG) — authZ policies (RBAC/ABAC/hybrid)
  F256 → QUEUE FABRIC(Redis Streams) + DATABASE FABRIC(PG) — payment adapter
  F259 → DATABASE FABRIC(ES) + External KMS — encryption key management
  F266 → DATABASE FABRIC(ES) — compliance constraint matrix
  F250 → QUEUE FABRIC(Redis Streams) + DATABASE FABRIC(ES) — audit trail
AF CONFIGURATION:
  AF-1 (Genesis): generates ProviderStrategySelector service on fabric adapters
  AF-2 (Planning): decomposes into: load-config → validate-labels → select-identity →
                    select-authz-model → select-payment → select-encryption → bind → audit
  AF-3 (Prompt Library): retrieves strategy-pattern prompts from skill library
  AF-4 (RAG): finds F229 (AI provider selection from FLOW-04) as closest pattern; adapts for multi-provider
  AF-5 (Multi-model): Claude + GPT generate competing provider selection logic
  AF-6 (Code Review): verifies no provider SDK imports; all through CreateAsync()
  AF-7 (Compliance): verifies DNA-1-8; especially DNA-5 (tenantId on provider binding)
  AF-8 (Security): checks secrets stored as vault references, not plaintext
  AF-9 (Judge): validates all 8 Iron Rules below
  AF-10 (Merge): combines best of multi-model outputs
  AF-11 (Feedback): stores quality; feeds into future strategy generation
MACHINE (fixed):
  Provider selection MUST read from tenant config document (F245). Never hardcoded.
  Compliance label constraint validation (F266) ALWAYS runs before binding.
  [pci] label + shared_schema → BUILD FAILURE
  [cmk] label MUST pair with F259 encryption key management. No exceptions.
  Webhook secret MUST be stored as vaultRef — never plaintext in config.
FREEDOM (configurable):
  Available provider list per tier (which PSPs, which IdPs)
  Fallback provider chain if primary health check fails
  Strategy cache TTL (default 5min in Redis via F245 cache layer)
  policyModel per tenant [rbac | abac | rbac_abac_hybrid]
IRON RULES:
  IR-85-1: F266 compliance gate MUST execute before any provider binding. No exceptions.
  IR-85-2: F256 payment provider MUST call F260 idempotency check before any charge operation.
  IR-85-3: Identity provider binding MUST validate issuer URL format before storing.
  IR-85-4: OIDC token validation MUST go through F252 adapter — never direct JWT library.
  IR-85-5: Webhook/PSP secrets MUST be vaultRef strings. Never plaintext in config or ES.
  IR-85-6: F250 audit event MUST be emitted for every provider binding change (immutable record).
  IR-85-7: [cmk] label MUST pair with F259. System rejects activation without CMK readiness.
  IR-85-8: BuildSearchFilter MUST skip empty provider config fields. Partial config is valid.
QUALITY GATES (AF-9):
  QG-85-1: Generated service handles ≥3 provider types (identity, payment, encryption). PASS/FAIL.
  QG-85-2: No provider SDK import in generated strategy code. Fabric-only. PASS/FAIL.
  QG-85-3: All 8 DNA patterns present in generated service. PASS/FAIL.
  QG-85-4: Compliance gate called before binding in generated code. PASS/FAIL.
  QG-85-5: tenantId present in every factory resolution context. PASS/FAIL.
  QG-85-6: Audit event emitted for every provider binding in generated code. PASS/FAIL.
BFA VALIDATION:
  CF-67: OIDC config changes must invalidate FLOW-03 session cache (F197:IPermissionService).
         RESOLUTION: F247 CloudEvents propagator emits config.changed; F197 consumer invalidates.
  CF-71: Payment provider change must emit event consumed by FLOW-06 marketplace (F225:IBillingService).
         RESOLUTION: F247 emits payment.provider-changed CloudEvent to xiigen-events-main stream.
```

---

## T86 — Payment Idempotent Charge

```
TASK TYPE: T86 — Payment Idempotent Charge
ARCHETYPE: TRANSACTION
ENTRY: Fires on payment intent creation (POST /api/payments/intents) or
       FLOW-06 marketplace purchase completion event
PURPOSE: Execute a payment charge through tenant's configured PSP with full idempotency
         guarantee, transactional outbox for event emission, and double-entry ledger recording.
         Saga pattern with compensation on PSP failure.
DISTINCT FROM:
  T85 (Provider Strategy — SELECTS which PSP; T86 EXECUTES the charge through the selected PSP)
  T87 (Webhook Fan-In — handles INBOUND PSP events; T86 handles OUTBOUND charge operations)
  T40 (Three-Way Join Gate — generic merge; T86 is payment-specific with idempotency+ledger)
FACTORY DEPENDENCIES:
  F256:IPaymentProviderAdapterService — resolved via CreateAsync()
  F257:IPaymentWebhookService — resolved via CreateAsync()
  F258:IPaymentLedgerService — resolved via CreateAsync()
  F260:IIdempotencyKeyService — resolved via CreateAsync()
  F250:ITenantAuditService — resolved via CreateAsync()
  F247:ITenantContextPropagatorService — resolved via CreateAsync()
FABRIC RESOLUTION:
  F256 → QUEUE FABRIC(Redis Streams) + DATABASE FABRIC(PG) — payment events + intent state
  F257 → QUEUE FABRIC(Redis Streams) — webhook ingestion (for async PSP callbacks)
  F258 → DATABASE FABRIC(PG) — double-entry ledger (ACID)
  F260 → DATABASE FABRIC(PG) — idempotency keys (unique constraint)
  F250 → QUEUE FABRIC(Redis Streams) + DATABASE FABRIC(ES) — audit trail
  F247 → QUEUE FABRIC(Redis Streams) + CORE FABRIC — CloudEvents + traceparent
AF CONFIGURATION:
  AF-1 (Genesis): generates PaymentChargeOrchestrator service on fabric adapters
  AF-2 (Planning): decomposes into: check-idempotency → create-intent → call-PSP →
                    record-ledger → emit-event → update-status
  AF-3 (Prompt Library): retrieves saga-pattern + outbox prompts from skill library
  AF-4 (RAG): finds DNA-8 (transactional outbox) as closest pattern; extends for payment saga
  AF-5 (Multi-model): Claude + GPT generate competing payment orchestration
  AF-6 (Code Review): verifies idempotency check before PSP call; no direct PSP SDK
  AF-7 (Compliance): verifies DNA-8 (outbox for payment events); DNA-5 (tenantId scoping)
  AF-8 (Security): checks PCI-labeled tenants route to isolated PG schema; no card data in logs
  AF-9 (Judge): validates all 8 Iron Rules below
  AF-10 (Merge): combines best of multi-model outputs
  AF-11 (Feedback): stores quality; feeds into future payment generation
MACHINE (fixed):
  F260 idempotency check MUST execute BEFORE any PSP call — no exceptions
  Amount MUST be positive integer in minor currency units — float amounts = BUILD FAILURE
  Double-entry ledger record MUST be written in same PG transaction as intent state update
  PSP API keys NEVER in payload, logs, or ES — resolved from vault via F245
  PCI-labeled tenants: payment data in PCI-isolated PG schema
FREEDOM (configurable):
  payments.provider per tenant [stripe | adyen | braintree]
  paymentTimeoutMs (default 30000)
  maxRetryAttemptsOnTransient (default 3 with exponential backoff)
  supportedCurrencies (ISO 4217)
  reconciliationScheduleCron (default daily at 02:00)
IRON RULES:
  IR-86-1: F260 CheckOrReserveAsync MUST execute before any PSP call. No bypass path.
  IR-86-2: Amount MUST be positive integer in minor currency units. Float = BUILD_FAILURE.
  IR-86-3: F258 ledger record MUST be in same PG transaction as intent state update (ACID).
  IR-86-4: PSP API keys MUST resolve from vault (F245 provider binding). Never in payload or log.
  IR-86-5: F250 audit event MUST be emitted for every payment state transition.
  IR-86-6: PCI-labeled tenants MUST route to PCI-isolated PG schema for payment data.
  IR-86-7: Refund amount MUST NOT exceed original capture amount.
  IR-86-8: F247 CloudEvents envelope MUST wrap every payment event (backward compat via legacyPayload).
QUALITY GATES (AF-9):
  QG-86-1: Generated service checks idempotency before PSP call. PASS/FAIL.
  QG-86-2: Ledger write in same PG transaction as intent update. PASS/FAIL.
  QG-86-3: All 8 DNA patterns present in generated service. PASS/FAIL.
  QG-86-4: No PSP SDK import in generated code. Fabric-only. PASS/FAIL.
  QG-86-5: PCI-label routing to isolated schema in generated code. PASS/FAIL.
  QG-86-6: Audit event emitted for every state transition in generated code. PASS/FAIL.
BFA VALIDATION:
  CF-68: Payment event must not conflict with FLOW-06 marketplace billing (F225:IBillingService).
         RESOLUTION: Payment events emitted to xiigen-payment-events stream; F225 has registered consumer.
  CF-69: Payment refund must update FLOW-06 marketplace order status.
         RESOLUTION: payment.refunded CloudEvent consumed by F225 marketplace billing consumer.
```

---

## T87 — Webhook Fan-In Normalization

```
TASK TYPE: T87 — Webhook Fan-In Normalization
ARCHETYPE: AGGREGATION
ENTRY: Fires on inbound webhook from any PSP (POST /api/payments/webhooks/:providerHint)
       or from tenant-registered external service webhook endpoints
PURPOSE: Normalize webhooks from multiple providers (Stripe, Adyen, Braintree) into a
         unified CloudEvents envelope. Verify signatures, deduplicate, and fan-in to a
         single processing stream. Each provider has different payload formats — this task
         normalizes them all through F247 CloudEvents wrapping.
DISTINCT FROM:
  T86 (Payment Charge — OUTBOUND to PSP; T87 handles INBOUND from PSP)
  T85 (Provider Strategy — selects provider; T87 PROCESSES events FROM providers)
  T33 (2-way convergence — generic merge; T87 is multi-provider webhook normalization)
FACTORY DEPENDENCIES:
  F257:IPaymentWebhookService — resolved via CreateAsync()
  F247:ITenantContextPropagatorService — resolved via CreateAsync()
  F260:IIdempotencyKeyService — resolved via CreateAsync()
  F250:ITenantAuditService — resolved via CreateAsync()
  F245:ITenantConfigService — resolved via CreateAsync()
FABRIC RESOLUTION:
  F257 → QUEUE FABRIC(Redis Streams) — webhook ingestion main + DLQ
  F247 → QUEUE FABRIC(Redis Streams) + CORE FABRIC — CloudEvents wrapping + OTel
  F260 → DATABASE FABRIC(PG) — idempotency keys for deduplication
  F250 → QUEUE FABRIC(Redis Streams) + DATABASE FABRIC(ES) — audit trail
  F245 → DATABASE FABRIC(ES) — tenant config (provider binding + signing secret ref)
AF CONFIGURATION:
  AF-1 (Genesis): generates WebhookFanInNormalizer service on fabric adapters
  AF-2 (Planning): decomposes into: receive-raw → identify-provider → verify-signature →
                    deduplicate → parse-payload → normalize-to-cloudEvent → enqueue → audit
  AF-3 (Prompt Library): retrieves webhook-processing prompts from skill library
  AF-4 (RAG): finds DNA-8 (outbox) + SK-4 (Queue Fabric) as closest patterns
  AF-5 (Multi-model): Claude + GPT generate competing normalization logic
  AF-6 (Code Review): verifies signature verification before processing; no raw logging
  AF-7 (Compliance): verifies DNA-8 (outbox for webhook events); DNA-5 (tenantId in every event)
  AF-8 (Security): checks signing secret from vault; rawPayload never logged; HMAC before process
  AF-9 (Judge): validates all 8 Iron Rules below
  AF-10 (Merge): combines best of multi-model outputs
  AF-11 (Feedback): stores quality; feeds into future webhook generation
MACHINE (fixed):
  Signature verification is MANDATORY — unverified webhooks = SIGNATURE_INVALID (200 OK to PSP)
  rawPayload is NEVER logged (may contain card data in some PSP formats)
  F260 deduplication runs BEFORE enqueueing — duplicate events return 200 OK (PSP compliance)
  Signing secret resolved from vault via F245 — never hardcoded or in config ES doc
  Output is ALWAYS a CloudEvents 1.0 envelope via F247 — no raw PSP format passes through
FREEDOM (configurable):
  webhookSignatureAlgorithm per provider [hmac_sha256 | hmac_sha512]
  dlqMaxRetries (default 3)
  dlqBackoffMs (default 5000)
  eventTypesAllowlist (optional filter per tenant)
  normalizedEventTypeMapping (PSP-specific event type → canonical event type)
IRON RULES:
  IR-87-1: Signature verification (HMAC) MUST execute before any payload processing. Always.
  IR-87-2: rawPayload MUST NOT appear in any log, ES index, or audit record.
  IR-87-3: F260 deduplication MUST execute before enqueueing (idempotency_key = PSP event.id).
  IR-87-4: Output MUST be CloudEvents 1.0 envelope via F247. No raw PSP format in output stream.
  IR-87-5: Duplicate webhook MUST return HTTP 200 OK (PSP compliance — not 409 or 4xx).
  IR-87-6: F250 audit event MUST be emitted for every accepted webhook (not duplicates).
  IR-87-7: Signing secret MUST resolve from vault (F245 provider binding). Never from config doc.
  IR-87-8: tenantId MUST be present in every normalized CloudEvent data field (DNA-5).
QUALITY GATES (AF-9):
  QG-87-1: Generated service verifies signature before processing for all 3 PSPs. PASS/FAIL.
  QG-87-2: No rawPayload in logs or audit records in generated code. PASS/FAIL.
  QG-87-3: All 8 DNA patterns present in generated service. PASS/FAIL.
  QG-87-4: Deduplication check before enqueue in generated code. PASS/FAIL.
  QG-87-5: Output is CloudEvents envelope in generated code. PASS/FAIL.
  QG-87-6: Duplicate returns 200 OK (not 409) in generated code. PASS/FAIL.
BFA VALIDATION:
  CF-68: Normalized webhook events must align with FLOW-06 marketplace billing consumer format.
         RESOLUTION: CloudEvents envelope (F247) uses canonical event types; F225 consumer parses data field.
  CF-70: Webhook-triggered payment status update must be consistent with T86 charge state.
         RESOLUTION: Normalized events carry intentId; T86 state machine validates transition.
```

---

## Phase 2a Summary

| Task Type | Archetype | Factories | Iron Rules | Quality Gates |
|-----------|-----------|-----------|-----------|--------------|
| T83 | ORCHESTRATION | 10 | IR-83-1 to IR-83-8 | QG-83-1 to QG-83-6 |
| T84 | ROUTING | 3 | IR-84-1 to IR-84-8 | QG-84-1 to QG-84-6 |
| T85 | CONFIGURATION | 7 | IR-85-1 to IR-85-8 | QG-85-1 to QG-85-6 |
| T86 | TRANSACTION | 6 | IR-86-1 to IR-86-8 | QG-86-1 to QG-86-6 |
| T87 | AGGREGATION | 5 | IR-87-1 to IR-87-8 | QG-87-1 to QG-87-6 |
| **TOTAL** | **5 archetypes** | | **40 iron rules** | **30 quality gates** |

## BFA Conflict Rules Referenced

| Rule | Flows | Summary |
|------|-------|---------|
| CF-64 | FLOW-08 ↔ FLOW-02 | Tenant registration vs user registration entity scoping |
| CF-65 | FLOW-08 ↔ FLOW-02 | Isolation binding change vs cached DB connections |
| CF-66 | FLOW-08 ↔ FLOW-01-07 | CloudEvents envelope backward compatibility |
| CF-67 | FLOW-08 ↔ FLOW-03 | OIDC config change vs session cache invalidation |
| CF-68 | FLOW-08 ↔ FLOW-06 | Payment events vs marketplace billing consumer |
| CF-69 | FLOW-08 ↔ FLOW-06 | Payment refund vs marketplace order status |
| CF-70 | FLOW-08 ↔ FLOW-08 | Webhook status update vs charge state consistency |

---

## SAVE POINT: PHASE2a ✅
## Phase 2a COMPLETE: T83-T87, 5 task types, 40 iron rules, 30 quality gates
## Next: Phase 2b — T88-T92 + AF Station Map 11×10 + Flow Template 18
## Recovery: "Continue FLOW-08 from Phase 2b"

## T88 — GDPR Data Lifecycle

```
TASK TYPE: T88 — GDPR Data Lifecycle
ARCHETYPE: COMPLIANCE
ENTRY: Fires on GDPR deletion request (POST /api/gdpr/deletion),
       GDPR export request (POST /api/gdpr/export),
       or scheduled retention policy evaluation (EP-2 Durable Timer)
PURPOSE: Orchestrate tenant-boundary data export (Right of Access), deletion (Right to Erasure),
         and retention policy enforcement across ALL flow data stores. Cascades deletion across
         FLOW-01 through FLOW-08 indices scoped by tenantId. Maintains legal hold for audit data.
DISTINCT FROM:
  T83 (Tenant Lifecycle — creates/deactivates tenant ENTITY; T88 manages tenant DATA lifecycle)
  T86 (Payment Charge — payment OPERATIONS; T88 may DELETE payment data as part of GDPR cascade)
  T91 (Pool→Silo Migration — moves data LOCATION; T88 DELETES data entirely)
FACTORY DEPENDENCIES:
  F267:ITenantDataExportService — resolved via CreateAsync()
  F259:IEncryptionKeyManagementService — resolved via CreateAsync()
  F266:IComplianceLabelEnforcementService — resolved via CreateAsync()
  F250:ITenantAuditService — resolved via CreateAsync()
  F247:ITenantContextPropagatorService — resolved via CreateAsync()
  F246:ITenantIsolationBindingService — resolved via CreateAsync()
FABRIC RESOLUTION:
  F267 → QUEUE FABRIC(Redis Streams) + DATABASE FABRIC(ES+PG) — GDPR lifecycle stream + request tracking + data scan
  F259 → DATABASE FABRIC(ES) + External KMS — key revocation for crypto-shredding
  F266 → DATABASE FABRIC(ES) — compliance constraint matrix (retention minimums by label)
  F250 → QUEUE FABRIC(Redis Streams) + DATABASE FABRIC(ES) — audit trail (retained under legal hold)
  F247 → QUEUE FABRIC(Redis Streams) + CORE FABRIC — CloudEvents for cascade coordination
  F246 → DATABASE FABRIC(ES+PG+Multi-PG) — isolation binding (determines WHERE data lives)
AF CONFIGURATION:
  AF-1 (Genesis): generates GdprLifecycleOrchestrator service on fabric adapters
  AF-2 (Planning): decomposes into: validate-request → inventory-data → check-retention-hold →
                    cascade-deletion → verify-completeness → emit-confirmation → audit
  AF-3 (Prompt Library): retrieves GDPR-compliance prompts from skill library
  AF-4 (RAG): finds DNA-8 (outbox) for reliable cascade; EP-2 (timer) for scheduled retention
  AF-5 (Multi-model): Claude + GPT generate competing deletion cascade logic
  AF-6 (Code Review): verifies deletion scoped by tenantId; no cross-tenant data access
  AF-7 (Compliance): verifies DNA-5 (tenantId scoping on EVERY delete); DNA-8 (cascade atomicity)
  AF-8 (Security): checks audit data retained under legal hold; crypto-shredding for CMK tenants
  AF-9 (Judge): validates all 8 Iron Rules below
  AF-10 (Merge): combines best of multi-model outputs
  AF-11 (Feedback): stores quality; feeds into future compliance generation
MACHINE (fixed):
  Deletion MUST cascade to ALL flow data stores (FLOW-01 through FLOW-08)
  Audit log entries retained under legal hold — NEVER deleted by GDPR cascade
  Export downloadUrlRef expires after 24h — no persistent download links
  CMK-labeled tenants: deletion includes key revocation (crypto-shredding) via F259
  Retention minimum by compliance label: GDPR=90 days, PCI=365 days
FREEDOM (configurable):
  retentionDaysByDataClass (workflow_history: 90, audit_log: 365 for PCI)
  deletionCascadeTargets list (which data stores included)
  exportFormatType [json | csv | parquet]
  deletionSlaHours (GDPR default 720h = 30 days)
IRON RULES:
  IR-88-1: Deletion MUST cascade to ALL flow data stores scoped by tenantId. No store may be skipped.
  IR-88-2: Audit log entries MUST be retained under legal hold — GDPR cascade NEVER deletes audit data.
  IR-88-3: F266 compliance gate MUST validate retention minimums before deletion executes.
  IR-88-4: CMK-labeled tenants MUST include F259 key revocation in deletion cascade.
  IR-88-5: Export downloadUrlRef MUST expire within 24 hours. No persistent links.
  IR-88-6: F246 isolation binding MUST be used to locate data (shared_schema=row filter, separate_schema=schema drop).
  IR-88-7: F250 audit event MUST be emitted at every cascade step (deletion progress tracking).
  IR-88-8: GetDataInventoryAsync MUST scan ALL indices before deletion — no data missed.
QUALITY GATES (AF-9):
  QG-88-1: Generated service cascades deletion to all flow data stores. PASS/FAIL.
  QG-88-2: Audit data preserved under legal hold in generated code. PASS/FAIL.
  QG-88-3: All 8 DNA patterns present in generated service. PASS/FAIL.
  QG-88-4: Retention minimum validation before deletion in generated code. PASS/FAIL.
  QG-88-5: Crypto-shredding path for CMK tenants in generated code. PASS/FAIL.
  QG-88-6: Data inventory scan before deletion in generated code. PASS/FAIL.
BFA VALIDATION:
  CF-72: GDPR deletion must cascade to FLOW-02 user data (F105:IUserRegistrationService).
         RESOLUTION: F247 emits gdpr.deletion-cascade CloudEvent; F105 consumer deletes scoped rows.
  CF-73: GDPR deletion must cascade to FLOW-04 content data (F166:IInventoryService).
         RESOLUTION: F247 emits gdpr.deletion-cascade; F166 consumer deletes tenant-scoped content.
  CF-74: GDPR deletion of payment data must coordinate with FLOW-06 billing (F225).
         RESOLUTION: F225 marks billing records as GDPR_DELETED (soft) while retaining ledger references for PCI.
```

---

## T89 — Tenant Rate Control

```
TASK TYPE: T89 — Tenant Rate Control
ARCHETYPE: POLICY
ENTRY: Fires on EVERY inbound API request (middleware pipeline, after T84 isolation binding)
       and on scheduled quota evaluation (EP-2 Durable Timer for SLA breach detection)
PURPOSE: Enforce per-tenant rate limits and quota policies. Sliding window rate limiting via
         Redis sorted sets. Returns HTTP 429 with Retry-After header on limit exceeded.
         Feeds SLA breach detection for alerting and tier enforcement.
DISTINCT FROM:
  T84 (Isolation Binding — routes WHERE data goes; T89 controls HOW MUCH traffic is allowed)
  T85 (Provider Strategy — selects WHICH provider; T89 throttles ALL operations regardless of provider)
  T90 (Metering — RECORDS usage; T89 ENFORCES limits based on entitlements)
FACTORY DEPENDENCIES:
  F261:ITenantRateLimitingService — resolved via CreateAsync()
  F251:ITenantEntitlementService — resolved via CreateAsync()
  F262:ITenantMetricsService — resolved via CreateAsync()
  F250:ITenantAuditService — resolved via CreateAsync()
  F270:ITenantNotificationRouterService — resolved via CreateAsync()
FABRIC RESOLUTION:
  F261 → DATABASE FABRIC(Redis) — sliding window counters (sorted sets per tenant+operation)
  F251 → DATABASE FABRIC(ES+Redis) — entitlement policies + live quota tracking
  F262 → DATABASE FABRIC(ES) + CORE FABRIC(OTel) — metrics recording + alerting
  F250 → QUEUE FABRIC(Redis Streams) + DATABASE FABRIC(ES) — audit trail
  F270 → QUEUE FABRIC(Redis Streams) — notification dispatch for SLA breach alerts
AF CONFIGURATION:
  AF-1 (Genesis): generates TenantRateControlMiddleware on fabric adapters
  AF-2 (Planning): decomposes into: extract-tenant → load-entitlement → check-rate-limit →
                    increment-counter → evaluate-sla → alert-if-breach → emit-metrics
  AF-3 (Prompt Library): retrieves rate-limiting-pattern prompts from skill library
  AF-4 (RAG): finds F234 (rate limit from FLOW-07) as closest pattern; adapts for per-tenant
  AF-5 (Multi-model): Claude + GPT generate competing rate control logic
  AF-6 (Code Review): verifies atomic Redis operations; no race conditions in counter increment
  AF-7 (Compliance): verifies DNA-5 (tenantId in every Redis key); DNA-3 (Failure not exception for 429)
  AF-8 (Security): checks no rate limit bypass path; no escalation through config manipulation
  AF-9 (Judge): validates all 8 Iron Rules below
  AF-10 (Merge): combines best of multi-model outputs
  AF-11 (Feedback): stores quality; feeds into future rate limiting generation
MACHINE (fixed):
  Rate limiting applies to ALL flows (FLOW-01 through FLOW-08 ingress)
  free tier: hard cap (no burst), pro: soft cap (burst 2×), enterprise: configurable burst
  Sliding window minimum: 60 seconds — no sub-minute windows
  SLA breach notifications (F270) are ALWAYS routed — cannot be suppressed
FREEDOM (configurable):
  maxRequestsPerWindowByTier (free: 100, pro: 1000, enterprise: configurable)
  burstMultiplierByTier (pro: 2.0, enterprise: configurable)
  operationTypeWeights (AI generation = 10 units, standard API = 1 unit)
  rateLimitWindowSeconds (default 60)
IRON RULES:
  IR-89-1: F261 rate check MUST execute on EVERY inbound API request. No bypass path.
  IR-89-2: Rate limit exceeded MUST return HTTP 429 with Retry-After header — never 500 or 200.
  IR-89-3: F251 entitlement MUST be loaded to determine correct limit per tier. Never hardcoded.
  IR-89-4: Redis counter increment MUST be atomic (ZADD + ZCOUNT in single pipeline). No race.
  IR-89-5: SLA breach detection MUST trigger F270 notification — non-suppressible for breach events.
  IR-89-6: free tier burst MUST be zero (hard cap). No burst configuration for free tier.
  IR-89-7: F262 metric MUST be recorded for every rate limit check (allowed + denied).
  IR-89-8: tenantId MUST be in every Redis key and every metric dimension (DNA-5).
QUALITY GATES (AF-9):
  QG-89-1: Generated middleware executes on every request in pipeline. PASS/FAIL.
  QG-89-2: 429 with Retry-After returned on limit exceeded. PASS/FAIL.
  QG-89-3: All 8 DNA patterns present in generated service. PASS/FAIL.
  QG-89-4: Atomic Redis pipeline for counter increment in generated code. PASS/FAIL.
  QG-89-5: SLA breach triggers notification in generated code. PASS/FAIL.
  QG-89-6: Metrics recorded for both allowed and denied requests. PASS/FAIL.
BFA VALIDATION:
  CF-75: Rate limiting must apply to ALL existing flows (FLOW-01 through FLOW-07).
         RESOLUTION: F261 middleware in MicroserviceBase pipeline — all services inherit it.
```

---

## T90 — Metering & Billing Event

```
TASK TYPE: T90 — Metering & Billing Event
ARCHETYPE: TELEMETRY
ENTRY: Fires on flow execution completion, AI token consumption, storage write,
       or any billable operation event via F247 CloudEvents stream
PURPOSE: Capture per-tenant usage events for billing and operational metrics.
         Dual pipeline: F263 (billing metering) for cost attribution and F262 (operational metrics)
         for performance dashboards. Never blocks the main execution path.
DISTINCT FROM:
  T89 (Rate Control — ENFORCES limits; T90 RECORDS usage without enforcement)
  T87 (Webhook Fan-In — normalizes INBOUND events; T90 emits INTERNAL usage events)
  T86 (Payment Charge — executes PAYMENT; T90 meters the USAGE that generates the bill)
FACTORY DEPENDENCIES:
  F263:ITenantBillingMeteringService — resolved via CreateAsync()
  F262:ITenantMetricsService — resolved via CreateAsync()
  F247:ITenantContextPropagatorService — resolved via CreateAsync()
  F251:ITenantEntitlementService — resolved via CreateAsync()
  F250:ITenantAuditService — resolved via CreateAsync()
FABRIC RESOLUTION:
  F263 → QUEUE FABRIC(Redis Streams) + DATABASE FABRIC(ES) — metering events + billing usage index
  F262 → DATABASE FABRIC(ES) + CORE FABRIC(OTel) — time-series metrics + OTel collector
  F247 → QUEUE FABRIC(Redis Streams) + CORE FABRIC — CloudEvents envelope + traceparent
  F251 → DATABASE FABRIC(ES+Redis) — entitlement lookup for quota comparison
  F250 → QUEUE FABRIC(Redis Streams) + DATABASE FABRIC(ES) — audit trail
AF CONFIGURATION:
  AF-1 (Genesis): generates MeteringEventCollector service on fabric adapters
  AF-2 (Planning): decomposes into: receive-completion-event → extract-metrics → emit-billing-event →
                    record-operational-metric → check-quota-proximity → alert-if-near-limit
  AF-3 (Prompt Library): retrieves telemetry-pattern prompts from skill library
  AF-4 (RAG): finds DNA-7 (traceparent) for metric correlation; DNA-8 (outbox) for reliable emission
  AF-5 (Multi-model): Claude + GPT generate competing metering logic
  AF-6 (Code Review): verifies fire-and-forget pattern; no blocking on main execution path
  AF-7 (Compliance): verifies DNA-5 (tenantId in every metric); bounded cardinality dimensions
  AF-8 (Security): checks no PII in metric dimensions; no per-user labels (high-cardinality)
  AF-9 (Judge): validates all 8 Iron Rules below
  AF-10 (Merge): combines best of multi-model outputs
  AF-11 (Feedback): stores quality; feeds into future telemetry generation
MACHINE (fixed):
  Metering events NEVER block the main flow execution path (fire-and-forget)
  dimensions MUST use bounded-cardinality labels — per-user labels FORBIDDEN
  tenantId, metricName, value, unit are REQUIRED fields
  ES index monthly rollover with ILM policy (hot→warm→cold→delete)
FREEDOM (configurable):
  enabledMetricNames per tenant (default: all)
  billingPeriodType [monthly | weekly | daily]
  metricsRetentionDays (hot: 7, warm: 30, cold: 90)
  alertEvaluationIntervalSeconds (default 60)
IRON RULES:
  IR-90-1: Metering MUST NOT block the main flow execution path. Fire-and-forget only.
  IR-90-2: dimensions MUST be bounded cardinality. Per-user labels = BUILD_FAILURE.
  IR-90-3: tenantId, metricName, value, unit MUST all be present in every metering event.
  IR-90-4: F247 CloudEvents envelope MUST wrap every metering event for correlation.
  IR-90-5: F251 entitlement quota proximity MUST be checked on every metering emit.
  IR-90-6: ES index MUST use monthly rollover with ILM policy. No unbounded index growth.
  IR-90-7: F262 operational metrics MUST dual-write to OTel collector + ES (real-time + query).
  IR-90-8: No PII in any metric dimension or metering event payload.
QUALITY GATES (AF-9):
  QG-90-1: Generated service emits metering without blocking execution. PASS/FAIL.
  QG-90-2: Bounded cardinality enforced on dimensions in generated code. PASS/FAIL.
  QG-90-3: All 8 DNA patterns present in generated service. PASS/FAIL.
  QG-90-4: CloudEvents envelope on every metering event. PASS/FAIL.
  QG-90-5: Quota proximity check triggers near-limit alert. PASS/FAIL.
  QG-90-6: No PII in metric dimensions in generated code. PASS/FAIL.
BFA VALIDATION:
  CF-76: Metering events from FLOW-01-07 operations must use CloudEvents envelope (F247).
         RESOLUTION: data.legacyPayload carries original format; new metering fields in CloudEvents data.
```

---

## T91 — Pool→Silo Migration (FIRST TIME)

```
TASK TYPE: T91 — Pool→Silo Migration
ARCHETYPE: MIGRATION
ENTRY: Fires on graduation request (POST /api/tenant-graduation) after admin approval
       or automated tier upgrade triggering isolation mode change
PURPOSE: Live migration of a tenant from one isolation mode to another (e.g., shared_schema pool
         to separate_db silo) WITHOUT downtime. Drains in-flight FlowRuns, migrates data,
         updates binding, replays pending events. Saga pattern with full rollback capability.
         THIS IS A FIRST TIME CAPABILITY — no prior flow had live isolation migration.
DISTINCT FROM:
  T83 (Tenant Lifecycle — PROVISIONS initial binding; T91 CHANGES existing binding live)
  T84 (Isolation Binding — READS current binding; T91 WRITES new binding after migration)
  T88 (GDPR Lifecycle — DELETES data; T91 MOVES data to new isolation mode)
FACTORY DEPENDENCIES:
  F249:ITenantGraduationService — resolved via CreateAsync()
  F246:ITenantIsolationBindingService — resolved via CreateAsync()
  F244:ITenantRegistryService — resolved via CreateAsync()
  F266:IComplianceLabelEnforcementService — resolved via CreateAsync()
  F259:IEncryptionKeyManagementService — resolved via CreateAsync()
  F250:ITenantAuditService — resolved via CreateAsync()
  F247:ITenantContextPropagatorService — resolved via CreateAsync()
  F268:ITenantScopedFlowRunnerService — resolved via CreateAsync()
FABRIC RESOLUTION:
  F249 → DATABASE FABRIC(ES+PG) + QUEUE FABRIC(Redis Streams) — migration state + graduation events
  F246 → DATABASE FABRIC(ES+PG+Multi-PG) — source + target isolation bindings
  F244 → DATABASE FABRIC(ES+PG) — tenant master record (tier update)
  F266 → DATABASE FABRIC(ES) — compliance gate (validate target mode allowed)
  F259 → DATABASE FABRIC(ES) + External KMS — key rotation for PCI graduation
  F250 → QUEUE FABRIC(Redis Streams) + DATABASE FABRIC(ES) — audit trail
  F247 → QUEUE FABRIC(Redis Streams) + CORE FABRIC — TENANT_MIGRATION_STARTED event propagation
  F268 → FLOW ENGINE FABRIC + QUEUE FABRIC — drain/replay in-flight FlowRuns
AF CONFIGURATION:
  AF-1 (Genesis): generates TenantGraduationOrchestrator service on fabric adapters
  AF-2 (Planning): decomposes into: plan → validate-compliance → drain-flows → snapshot-data →
                    provision-target → migrate-data → update-binding → replay-events → verify → activate
  AF-3 (Prompt Library): retrieves migration-pattern + saga prompts from skill library
  AF-4 (RAG): finds EP-2 (Durable Timer) for cooldown; DNA-8 (outbox) for saga compensation
  AF-5 (Multi-model): Claude + GPT generate competing migration orchestration
  AF-6 (Code Review): verifies saga compensation at every step; no data loss path
  AF-7 (Compliance): verifies DNA-5 (tenantId scoped migration); DNA-8 (compensation points atomic)
  AF-8 (Security): checks PCI graduation includes key rotation (F259); no plaintext data in transit
  AF-9 (Judge): validates all 8 Iron Rules below
  AF-10 (Merge): combines best of multi-model outputs
  AF-11 (Feedback): stores quality; feeds into future migration generation
MACHINE (fixed):
  Graduation plan MUST be created and approved BEFORE execution
  Saga compensation registered BEFORE each migration step (DNA-8 outbox)
  In-flight FlowRuns are DRAINED or REPLAYED — never silently dropped
  PCI graduation requires CMK key rotation (F259.RotateKeyAsync)
  F247 emits TENANT_MIGRATION_STARTED before any data movement
  Binding change is the LAST step — only after all data verified at target
FREEDOM (configurable):
  allowedGraduationPaths (which source→target transitions supported)
  migrationWorkerConcurrency (default 1 — serialized per tenant)
  drainTimeoutSeconds (default 300 — how long to wait for in-flight FlowRuns)
  graduationApprovalRequired (default true for enterprise; pro can self-approve)
IRON RULES:
  IR-91-1: F249 plan MUST be created and approved BEFORE ExecuteGraduationAsync. No ad-hoc migration.
  IR-91-2: Saga compensation MUST be registered BEFORE each migration step via DNA-8 outbox.
  IR-91-3: In-flight FlowRuns MUST be drained or replayed. Silent drop = BUILD_FAILURE.
  IR-91-4: F247 MUST emit TENANT_MIGRATION_STARTED event BEFORE any data movement begins.
  IR-91-5: F266 compliance gate MUST validate target mode is allowed for tenant's labels.
  IR-91-6: PCI-labeled graduation MUST include F259 key rotation. Missing rotation = BLOCKED.
  IR-91-7: Binding update (F246) MUST be the LAST step — only after data verified at target.
  IR-91-8: F250 audit event MUST be emitted at every migration step (progress tracking).
QUALITY GATES (AF-9):
  QG-91-1: Generated service creates plan before execution. PASS/FAIL.
  QG-91-2: Saga compensation at every step in generated code. PASS/FAIL.
  QG-91-3: All 8 DNA patterns present in generated service. PASS/FAIL.
  QG-91-4: FlowRun drain/replay logic present in generated code. PASS/FAIL.
  QG-91-5: TENANT_MIGRATION_STARTED event emitted before data movement. PASS/FAIL.
  QG-91-6: Binding update is last step in generated migration sequence. PASS/FAIL.
BFA VALIDATION:
  CF-65: Migration binding change must notify FLOW-02 user registration (F105) to refresh connections.
         RESOLUTION: TENANT_MIGRATION_STARTED event via F247; F105 consumer group acknowledges.
  CF-77: Migration with in-flight FLOW-04 content generation must not lose partial results.
         RESOLUTION: F268 drains FLOW-04 FlowRuns (300s timeout); completed steps preserved.
  CF-78: Migration audit trail must be immutable — FLOW-08 audit (F250) append-only invariant.
         RESOLUTION: F250 append-only enforcement; no UpdateAuditEventAsync method exists.
  CF-79: Migration saga compensation must register BEFORE step execution (defense-in-depth).
         RESOLUTION: DNA-8 outbox writes compensation point atomically with step start.
```

---

## T92 — Canary Cohort Rollout (FIRST TIME)

```
TASK TYPE: T92 — Canary Cohort Rollout
ARCHETYPE: DEPLOYMENT
ENTRY: Fires on canary cohort creation (POST /api/canary/cohorts) or
       scheduled cohort evaluation (EP-2 Durable Timer for error rate monitoring)
PURPOSE: Tenant-scoped canary deployment of new flow-definition versions. Creates cohorts of
         tenants, assigns canary version, monitors error rate and p95 latency against baseline,
         auto-rolls back if error rate exceeds threshold, promotes to stable if metrics pass.
         THIS IS A FIRST TIME CAPABILITY — no prior flow had deployment awareness.
DISTINCT FROM:
  T85 (Provider Strategy — selects WHICH PROVIDER; T92 selects WHICH FLOW VERSION)
  T91 (Pool→Silo Migration — changes DATA LOCATION; T92 changes CODE VERSION)
  T83 (Tenant Lifecycle — onboards NEW tenants; T92 rolls out changes to EXISTING tenants)
FACTORY DEPENDENCIES:
  F265:ITenantCanaryDeploymentService — resolved via CreateAsync()
  F245:ITenantConfigService — resolved via CreateAsync()
  F262:ITenantMetricsService — resolved via CreateAsync()
  F268:ITenantScopedFlowRunnerService — resolved via CreateAsync()
  F250:ITenantAuditService — resolved via CreateAsync()
  F270:ITenantNotificationRouterService — resolved via CreateAsync()
FABRIC RESOLUTION:
  F265 → DATABASE FABRIC(ES) + FLOW ENGINE FABRIC — canary cohorts + version resolution
  F245 → DATABASE FABRIC(ES) — tenant config (canary assignment stored as config extension)
  F262 → DATABASE FABRIC(ES) + CORE FABRIC(OTel) — error rate, p95 latency baseline comparison
  F268 → FLOW ENGINE FABRIC + QUEUE FABRIC — tenant-scoped flow execution with canary version
  F250 → QUEUE FABRIC(Redis Streams) + DATABASE FABRIC(ES) — audit trail
  F270 → QUEUE FABRIC(Redis Streams) — notifications for promotion/rollback events
AF CONFIGURATION:
  AF-1 (Genesis): generates CanaryCohortManager service on fabric adapters
  AF-2 (Planning): decomposes into: create-cohort → assign-tenants → deploy-version →
                    monitor-metrics → evaluate-threshold → decide-promote-or-rollback → notify
  AF-3 (Prompt Library): retrieves deployment-pattern prompts from skill library
  AF-4 (RAG): finds EP-2 (Durable Timer) for scheduled evaluation; F262 (metrics) for comparison
  AF-5 (Multi-model): Claude + GPT generate competing canary orchestration
  AF-6 (Code Review): verifies auto-rollback path exists; no promotion without metrics check
  AF-7 (Compliance): verifies DNA-5 (tenant scoping in cohort); DNA-7 (traceparent for canary FlowRuns)
  AF-8 (Security): checks no escalation through cohort manipulation; platform admin only for cohort creation
  AF-9 (Judge): validates all 8 Iron Rules below
  AF-10 (Merge): combines best of multi-model outputs
  AF-11 (Feedback): stores quality; feeds into future deployment generation
MACHINE (fixed):
  Canary cohort maximum: 20% of tenants on initial deploy
  Rollback is ALWAYS available — no canary promotion is irreversible until stable
  Auto-rollback if error rate > 5× baseline
  F262 metrics feed canary decision (p95 latency + error rate comparison)
  Minimum canary bake time before promotion (configurable, default 60min)
FREEDOM (configurable):
  maxCanaryPercentage (default 20%)
  autoRollbackErrorRateMultiplier (default 5.0)
  cohortEvaluationIntervalSeconds (default 300)
  canaryDurationMinutes (minimum bake time; default 60)
  promotionTargets [expand | stable | rollback]
IRON RULES:
  IR-92-1: Initial canary MUST NOT exceed 20% of tenants. Higher percentage = BUILD_FAILURE.
  IR-92-2: Auto-rollback MUST trigger when error rate exceeds 5× baseline. Non-overridable.
  IR-92-3: F262 metrics MUST be the source for canary decision. No manual override of metrics.
  IR-92-4: Minimum canary bake time MUST elapse before promotion is allowed.
  IR-92-5: F250 audit event MUST be emitted for every cohort state change (create, promote, rollback).
  IR-92-6: F270 notification MUST be sent on every promotion and every rollback event.
  IR-92-7: F268 FlowRuns for canary tenants MUST use canary version (resolved by F265). No mixing.
  IR-92-8: Rollback to stable version MUST be instantaneous — no migration required.
QUALITY GATES (AF-9):
  QG-92-1: Generated service limits initial cohort to 20% of tenants. PASS/FAIL.
  QG-92-2: Auto-rollback path present in generated code. PASS/FAIL.
  QG-92-3: All 8 DNA patterns present in generated service. PASS/FAIL.
  QG-92-4: Metrics-driven decision (not manual) in generated code. PASS/FAIL.
  QG-92-5: Minimum bake time enforced before promotion in generated code. PASS/FAIL.
  QG-92-6: Notification on promotion and rollback in generated code. PASS/FAIL.
BFA VALIDATION:
  CF-76: Canary version of flow must still emit CloudEvents-compatible events for FLOW-01-07 consumers.
         RESOLUTION: F247 CloudEvents envelope used by all versions; data.legacyPayload for backward compat.
```

---

# ═══════════════════════════════════════════════════════
# AF STATION MAP — 11 STATIONS × 10 TASK TYPES
# ═══════════════════════════════════════════════════════

```
AF STATION MAP: FLOW-08 Multi-Tenant Support (T83-T92)

             | T83        | T84       | T85         | T86         | T87        | T88        | T89       | T90        | T91         | T92
             | Lifecycle  | Isolation | Provider    | Payment     | Webhook    | GDPR       | Rate      | Metering   | Migration   | Canary
             | ORCH       | ROUTING   | CONFIG      | TRANSACT    | AGGREG     | COMPLIANCE | POLICY    | TELEMETRY  | MIGRATION   | DEPLOY
─────────────┼────────────┼───────────┼─────────────┼─────────────┼────────────┼────────────┼───────────┼────────────┼─────────────┼────────────
AF-1 Genesis | 8-state    | Middleware| Strategy    | Saga+idem   | Fan-in     | Cascade    | Sliding   | Dual-pipe  | Live-migr   | Cohort
             | orchestr   | resolver  | selector    | pmt orch    | normalizer | deletion   | window    | collector  | orchestr    | manager
─────────────┼────────────┼───────────┼─────────────┼─────────────┼────────────┼────────────┼───────────┼────────────┼─────────────┼────────────
AF-2 Plan    | 8 steps    | 5 steps   | 8 steps     | 6 steps     | 8 steps    | 7 steps    | 7 steps   | 6 steps    | 10 steps    | 7 steps
             | register→  | enforce→  | load-cfg→   | check-idem→ | receive→   | validate→  | extract→  | receive→   | plan→       | create→
             | activate   | propagate | bind        | update-st   | enqueue    | audit      | emit-metr | alert      | activate    | notify
─────────────┼────────────┼───────────┼─────────────┼─────────────┼────────────┼────────────┼───────────┼────────────┼─────────────┼────────────
AF-3 Prompts | state-mach | db-routing| strategy    | saga+outbox | webhook    | GDPR       | rate-limit| telemetry  | migration   | deployment
             | patterns   | patterns  | patterns    | patterns    | patterns   | patterns   | patterns  | patterns   | patterns    | patterns
─────────────┼────────────┼───────────┼─────────────┼─────────────┼────────────┼────────────┼───────────┼────────────┼─────────────┼────────────
AF-4 RAG     | EP-1 state | SK-5 DB   | F229 AI     | DNA-8       | DNA-8+     | DNA-8+     | F234 rate | DNA-7      | EP-2 timer  | EP-2 timer
             | machine    | fabric    | provider    | outbox      | SK-4 queue | EP-2 timer | limit     | traceparent| DNA-8 outbox| F262 metrics
─────────────┼────────────┼───────────┼─────────────┼─────────────┼────────────┼────────────┼───────────┼────────────┼─────────────┼────────────
AF-5 Multi   | Claude+GPT | Claude+GPT| Claude+GPT  | Claude+GPT  | Claude+GPT | Claude+GPT | Claude+GPT| Claude+GPT | Claude+GPT  | Claude+GPT
   model     | orchestr   | routing   | strategy    | payment     | normalize  | compliance | rate-ctrl | metering   | migration   | canary
─────────────┼────────────┼───────────┼─────────────┼─────────────┼────────────┼────────────┼───────────┼────────────┼─────────────┼────────────
AF-6 Review  | CreateAsync| No direct | No SDK      | Idem before | Sig before | Scoped by  | Atomic    | Fire-and-  | Saga comp   | Auto-roll
             | all calls  | PG import | imports     | PSP call    | process    | tenantId   | Redis ops | forget     | every step  | back path
─────────────┼────────────┼───────────┼─────────────┼─────────────┼────────────┼────────────┼───────────┼────────────┼─────────────┼────────────
AF-7 Comply  | DNA-8      | DNA-5     | DNA-5       | DNA-8       | DNA-8+     | DNA-5+     | DNA-5+    | DNA-5+     | DNA-5+      | DNA-5+
             | outbox     | isolation | tenantId    | outbox      | DNA-5      | DNA-8      | DNA-3     | DNA-7      | DNA-8       | DNA-7
─────────────┼────────────┼───────────┼─────────────┼─────────────┼────────────┼────────────┼───────────┼────────────┼─────────────┼────────────
AF-8 Secur   | CMK check  | RLS valid | Vault refs  | PCI schema  | No raw log | Legal hold | No bypass | No PII     | Key rotate  | Admin only
             | before act | before qry| for secrets | isolation   | HMAC first | audit ret  | no escal  | in metrics | for PCI     | for cohort
─────────────┼────────────┼───────────┼─────────────┼─────────────┼────────────┼────────────┼───────────┼────────────┼─────────────┼────────────
AF-9 Judge   | 8 IR       | 8 IR      | 8 IR        | 8 IR        | 8 IR       | 8 IR       | 8 IR      | 8 IR       | 8 IR        | 8 IR
             | 6 QG       | 6 QG      | 6 QG        | 6 QG        | 6 QG       | 6 QG       | 6 QG      | 6 QG       | 6 QG        | 6 QG
─────────────┼────────────┼───────────┼─────────────┼─────────────┼────────────┼────────────┼───────────┼────────────┼─────────────┼────────────
AF-10 Merge  | Best orch  | Best rout | Best strat  | Best saga   | Best norm  | Best casc  | Best rate | Best meter | Best migr   | Best canary
─────────────┼────────────┼───────────┼─────────────┼─────────────┼────────────┼────────────┼───────────┼────────────┼─────────────┼────────────
AF-11 Feedbk | Orch qual  | Route qual| Strat qual  | Pmt qual    | Whook qual | GDPR qual  | Rate qual | Meter qual | Migr qual   | Canary qual

TOTAL: 11 stations × 10 task types = 110 AF station cells
```

---

# ═══════════════════════════════════════════════════════
# FLOW TEMPLATE 18 — multi-tenant-support-v1
# ═══════════════════════════════════════════════════════

```json
{
  "flowDefinition": {
    "name": "multi-tenant-support-v1",
    "version": "1.0.0",
    "templateId": 18,
    "description": "FLOW-08: Multi-tenant support — tenant lifecycle, isolation, provider adapters, payments, compliance, metering, migration, canary",
    "families": [27, 28, 29],
    "factoryRange": "F244-F271",
    "taskTypeRange": "T83-T92",
    "entryPoints": [
      {
        "taskType": "T83",
        "trigger": "HTTP POST /api/tenants",
        "description": "Tenant registration → 8-state onboarding lifecycle"
      },
      {
        "taskType": "T84",
        "trigger": "MIDDLEWARE pipeline (every request)",
        "description": "Isolation binding resolution → DB routing"
      },
      {
        "taskType": "T85",
        "trigger": "EVENT config.changed",
        "description": "Provider strategy selection → identity/payment/encryption binding"
      },
      {
        "taskType": "T86",
        "trigger": "HTTP POST /api/payments/intents",
        "description": "Payment charge → idempotent saga with ledger"
      },
      {
        "taskType": "T87",
        "trigger": "HTTP POST /api/payments/webhooks/:providerHint",
        "description": "Webhook fan-in → normalize to CloudEvents"
      },
      {
        "taskType": "T88",
        "trigger": "HTTP POST /api/gdpr/deletion | SCHEDULED retention",
        "description": "GDPR data lifecycle → cascade deletion/export"
      },
      {
        "taskType": "T89",
        "trigger": "MIDDLEWARE pipeline (every request, after T84)",
        "description": "Rate control → sliding window throttle + 429"
      },
      {
        "taskType": "T90",
        "trigger": "EVENT flow.completed | ai.tokens_used",
        "description": "Metering → billing events + operational metrics"
      },
      {
        "taskType": "T91",
        "trigger": "HTTP POST /api/tenant-graduation (admin-approved)",
        "description": "Pool→silo migration → live isolation graduation"
      },
      {
        "taskType": "T92",
        "trigger": "HTTP POST /api/canary/cohorts",
        "description": "Canary cohort rollout → % deployment with auto-rollback"
      }
    ],
    "dag": {
      "nodes": [
        {"id": "T83", "type": "ORCHESTRATION",  "dependencies": []},
        {"id": "T84", "type": "ROUTING",         "dependencies": ["T83"]},
        {"id": "T85", "type": "CONFIGURATION",   "dependencies": ["T83"]},
        {"id": "T86", "type": "TRANSACTION",     "dependencies": ["T84", "T85"]},
        {"id": "T87", "type": "AGGREGATION",     "dependencies": ["T85"]},
        {"id": "T88", "type": "COMPLIANCE",      "dependencies": ["T83"]},
        {"id": "T89", "type": "POLICY",          "dependencies": ["T84"]},
        {"id": "T90", "type": "TELEMETRY",       "dependencies": ["T84", "T89"]},
        {"id": "T91", "type": "MIGRATION",       "dependencies": ["T83", "T84"]},
        {"id": "T92", "type": "DEPLOYMENT",      "dependencies": ["T90"]}
      ],
      "edges": [
        {"from": "T83", "to": "T84", "label": "tenant.activated → binding resolution available"},
        {"from": "T83", "to": "T85", "label": "tenant.activated → provider selection available"},
        {"from": "T83", "to": "T88", "label": "tenant.registered → GDPR lifecycle available"},
        {"from": "T83", "to": "T91", "label": "tenant.activated → graduation eligible"},
        {"from": "T84", "to": "T86", "label": "binding.resolved → payment path available"},
        {"from": "T84", "to": "T89", "label": "binding.resolved → rate limiting active"},
        {"from": "T84", "to": "T90", "label": "binding.resolved → metering active"},
        {"from": "T84", "to": "T91", "label": "binding.resolved → migration source identified"},
        {"from": "T85", "to": "T86", "label": "provider.bound → PSP available for charges"},
        {"from": "T85", "to": "T87", "label": "provider.bound → webhook ingestion configured"},
        {"from": "T89", "to": "T90", "label": "rate.checked → usage metered"},
        {"from": "T90", "to": "T92", "label": "metrics.available → canary decision data ready"}
      ]
    },
    "enginePrimitivesUsed": ["EP-1 State Machine Registry (T83 onboarding)", "EP-2 Durable Timer (T88 retention, T91 cooldown, T92 canary eval)"],
    "dnaPatterns": ["DNA-1 through DNA-8 (all 8 reused, no new patterns)"],
    "bfaRegistration": {
      "entities": ["Tenant", "TenantConfig", "TenantBinding", "Identity", "AuthZPolicy", "PaymentIntent", "AuditEvent", "MeteringEvent", "CanaryCohort"],
      "events": ["tenant.registered", "tenant.activated", "tenant.deactivated", "config.changed", "binding.updated", "provider.bound", "payment.captured", "payment.refunded", "gdpr.deletion-requested", "rate.limit-exceeded", "sla.breach-detected", "migration.started", "migration.completed", "canary.promoted", "canary.rolled-back"],
      "apis": ["/api/tenants", "/api/tenant-config", "/api/isolation/bindings", "/api/identity", "/api/auth/policies", "/api/authz/policies", "/api/payments", "/api/payments/webhooks", "/api/payments/ledger", "/api/cmk", "/api/idempotency", "/api/quota", "/api/metrics", "/api/billing/metering", "/api/backup", "/api/canary", "/api/compliance/gates", "/api/gdpr", "/api/flows/runs", "/api/webhooks", "/api/notifications", "/api/config/promotion", "/api/onboarding", "/api/tenant-graduation", "/api/entitlements", "/api/audit-log"]
    },
    "backwardCompatibility": {
      "existingFlows": "FLOW-01 through FLOW-07 unchanged",
      "existingFactories": "F1-F243 unchanged",
      "existingTaskTypes": "T1-T82 unchanged",
      "cloudEventsRetrofit": "CF-66: data.legacyPayload for FLOW-01-07 events",
      "rateLimitRetrofit": "CF-75: F261 middleware in MicroserviceBase — all services inherit"
    }
  }
}
```

---

## Phase 2b Summary

| Artifact | Count | Details |
|----------|-------|---------|
| Task types | 5 | T88-T92 (COMPLIANCE, POLICY, TELEMETRY, MIGRATION, DEPLOYMENT) |
| Iron rules | 40 | IR-88-1 through IR-92-8 |
| Quality gates | 30 | QG-88-1 through QG-92-6 |
| AF station cells | 110 | 11 stations × 10 task types |
| Flow template | 1 | Template 18: multi-tenant-support-v1 |
| BFA rules referenced | 5 new | CF-72 through CF-79 (partial — full specs in Phase 3) |

### FIRST TIME Capabilities

| Task | Capability | Why First |
|------|-----------|-----------|
| T91 | Pool→Silo live migration | No prior flow had live isolation mode change |
| T92 | Canary cohort rollout | No prior flow had deployment awareness or version routing |

### Combined Phase 2 Totals (T83-T92)

| Item | Phase 2a | Phase 2b | Total |
|------|----------|----------|-------|
| Task types | 5 (T83-T87) | 5 (T88-T92) | 10 |
| Iron rules | 40 | 40 | 80 |
| Quality gates | 30 | 30 | 60 |
| AF station cells | — | 110 | 110 |
| Flow templates | — | 1 | 1 |

---

## SAVE POINT: PHASE2b ✅
## Phase 2 COMPLETE: T83-T92, 10 task types, 80 IR, 60 QG, 110 AF cells, Template 18
## Next: Phase 3a — BFA Conflict Rules CF-64-CF-71 + Stress Tests ST-31-ST-34
## Recovery: "Continue FLOW-08 from Phase 3a"

---

## MERGE:P2-F08 STATE SAVE
```
MERGE:P2-F08 = COMPLETE
Target: TASK_TYPES_CATALOG_MERGED.md
Added: T83-T87 (ORCHESTRATION, ROUTING, CONFIGURATION, TRANSACTION, AGGREGATION)
Added: T88-T92 (COMPLIANCE, POLICY, TELEMETRY, MIGRATION, DEPLOYMENT)
Added: AF Station Map 11×10 = 110 cells
Added: Flow Template 18 (multi-tenant-support-v1 JSON with DAG)
Added: Task Type Summary (80 IRs, 60 QGs)
FIRST TIME: T91 (Pool→Silo Migration), T92 (Canary Cohort Rollout)
System: 29 families, T1-T92, 18 flow templates
Next: FLOW-09 (when spec is ready)
```

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# FLOW-09: TASK TYPE ENGINE CONTRACTS
# T93 through T102 + AF Station Map + Template 19
# Date: 2026-02-26 | Save Point: MERGE:P2
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

---

## TASK TYPE: T93 — Reservation Hold Gate

```
TASK TYPE: T93
NAME: Reservation Hold Gate
ARCHETYPE: ORCHESTRATION
ENTRY: API Gateway receives POST /events/{eventId}/participate
PURPOSE: Check availability, create reservation hold with TTL, start saga
DISTINCT FROM: T83 (generic orchestration) — T93 is Redis+PG dual-write with TTL

FACTORY DEPENDENCIES:
  F272 — IReservationHoldService
  F277 — ICapacityManagementService
  F279 — ISagaCoordinatorService

FABRIC RESOLUTION:
  F272 → DATABASE FABRIC (Redis + PostgreSQL)
  F277 → DATABASE FABRIC (PostgreSQL row locks)
  F279 → DATABASE FABRIC (PostgreSQL saga state)

AF CONFIGURATION:
  AF-1 Genesis: Generate reservation service extending MicroserviceBase
  AF-4 RAG: Retrieve SK-37 (Redis TTL hold pattern)
  AF-7 Compliance: Verify DNA-1 (no typed models), DNA-5 (tenantId), DNA-9 (compensation)
  AF-9 Judge: Validate IR-93-1 through IR-93-8

BFA VALIDATION:
  CF-80: Payment-reservation race detection
  CF-86: Authentication required (FLOW-01 cross-check)
  CF-88: Event must exist (FLOW-03 cross-check)

IRON RULES:
  IR-93-1: Reservation TTL MUST be Redis-enforced (not application timer)
  IR-93-2: Duplicate reservation for same user+event MUST return existing (idempotent)
  IR-93-3: Reservation status MUST use state machine (ACTIVE→COMPLETED|EXPIRED|CANCELLED)
  IR-93-4: EP-5 dedup on ReserveSpotAsync (key: tenantId+eventId+userId)
  IR-93-5: Capacity check MUST use F277 (never read raw counter)
  IR-93-6: tenantId MUST be present on every database operation
  IR-93-7: Saga started via F279 before any state mutation
  IR-93-8: Free events skip payment → direct to ticket issuance

QUALITY GATES:
  QG-93-1: Reservation latency < 200ms (p99)
  QG-93-2: Concurrent reservation attempts for same user → exactly 1 hold
  QG-93-3: Expired reservation releases capacity within 60s
  QG-93-4: Redis down → fallback to PG TTL check (degraded but correct)
  QG-93-5: Capacity never goes negative
  QG-93-6: BuildSearchFilter used for all queries (DNA-2)

MACHINE: State machine, TTL enforcement mechanism, idempotency key formula
FREEDOM: TTL duration, max concurrent reservations per user, capacity threshold for waitlist
```

## TASK TYPE: T94 — Payment Saga Step

```
TASK TYPE: T94
NAME: Payment Saga Step
ARCHETYPE: TRANSACTION
ENTRY: SpotReserved event consumed from queue
PURPOSE: Create Stripe PaymentIntent, handle webhook confirmation, emit PaymentCompleted
DISTINCT FROM: T87 (generic transaction) — T94 is PSP-specific with webhook dedup

FACTORY DEPENDENCIES:
  F273 — IPaymentGatewayService
  F272 — IReservationHoldService (validation)
  F279 — ISagaCoordinatorService (step tracking)
  FLOW-08 F252 — IPaymentProviderAdapter (Stripe resolution)

FABRIC RESOLUTION:
  F273 → QUEUE FABRIC (Redis Streams for events) + FLOW-08 F252 (Stripe)
  F272 → DATABASE FABRIC (reservation validation)
  F279 → DATABASE FABRIC (saga state)
  F252 → External via FLOW-08 factory registry

AF CONFIGURATION:
  AF-1 Genesis: Generate payment handler with webhook endpoint
  AF-4 RAG: Retrieve SK-38 (webhook dedup pattern)
  AF-7 Compliance: Verify DNA-9 (compensation), EP-5 (dedup)
  AF-8 Security: Webhook signature verification, no plaintext keys
  AF-9 Judge: Validate IR-94-1 through IR-94-8

BFA VALIDATION:
  CF-80: Payment after reservation expiry
  CF-83: Duplicate Stripe webhook handling
  CF-90: Tenant isolation on payment keys (FLOW-08 cross-check)

IRON RULES:
  IR-94-1: Webhook signature verified BEFORE any processing
  IR-94-2: EP-5 dedup on stripe_event_id BEFORE emitting events
  IR-94-3: Reservation validated BEFORE PaymentIntent creation (CF-80)
  IR-94-4: Idempotency key on PaymentIntent creation
  IR-94-5: Stripe API key resolved per tenant via F252 (CF-90)
  IR-94-6: CancelPaymentIntentAsync registered as EP-4 compensation
  IR-94-7: RefundPaymentAsync registered as EP-4 compensation
  IR-94-8: No Stripe SDK imported directly — always through F252

QUALITY GATES:
  QG-94-1: Webhook processing < 500ms (p99)
  QG-94-2: 10 duplicate webhooks → exactly 1 PaymentCompleted event
  QG-94-3: Expired reservation + payment → automatic refund within 30s
  QG-94-4: Payment audit trail complete (every state transition logged)
  QG-94-5: Zero money lost on any failure path
  QG-94-6: Dedup store TTL > 72h (Stripe 3-day retry window)
```

## TASK TYPE: T95 — Ticket Issuance with QR

```
TASK TYPE: T95
NAME: Ticket Issuance with Encrypted QR
ARCHETYPE: TRANSFORM
ENTRY: PaymentCompleted event (or SpotReserved for free events)
PURPOSE: Generate ticket with AES-256-GCM encrypted QR, sequence number, delivery
DISTINCT FROM: T93 (reservation) — T95 produces a durable artifact (ticket + QR)

FACTORY DEPENDENCIES:
  F274 — ITicketingService
  F277 — ICapacityManagementService
  F279 — ISagaCoordinatorService

FABRIC RESOLUTION:
  F274 → DATABASE FABRIC (PostgreSQL for tickets)
  F277 → DATABASE FABRIC (PostgreSQL for capacity decrement)
  F279 → DATABASE FABRIC (PostgreSQL for saga tracking)

AF CONFIGURATION:
  AF-1 Genesis: Generate ticketing service with QR encryption
  AF-4 RAG: Retrieve SK-39 (encrypted QR pattern)
  AF-7 Compliance: DNA-1, DNA-9
  AF-8 Security: AES-256-GCM validation, KMS key reference (no hardcoded keys)
  AF-9 Judge: Validate IR-95-1 through IR-95-8

BFA VALIDATION:
  CF-81: Capacity double-decrement prevention
  CF-82: Duplicate ticket issuance prevention

IRON RULES:
  IR-95-1: EP-5 dedup BEFORE ticket generation (CF-82)
  IR-95-2: QR payload encrypted with AES-256-GCM (not CBC)
  IR-95-3: Encryption key from KMS (never hardcoded or in config file)
  IR-95-4: Ticket number via PostgreSQL sequence (no gaps on dedup)
  IR-95-5: Capacity decremented atomically via F277 (row lock)
  IR-95-6: CancelTicketAsync registered as EP-4 compensation
  IR-95-7: TicketIssued event carries ticketId + eventId + tenantId
  IR-95-8: Free event: SpotReserved triggers ticket (skip payment step)

QUALITY GATES:
  QG-95-1: Ticket generation < 300ms (p99) including QR encryption
  QG-95-2: Duplicate PaymentCompleted → same ticketId returned
  QG-95-3: QR payload decryptable only with correct key
  QG-95-4: Capacity invariant maintained after ticket issuance
  QG-95-5: Ticket delivery attempted via at least 1 channel within 60s
```

## TASK TYPE: T96 — Calendar + Reminder Scheduling

```
TASK TYPE: T96
NAME: Calendar Entry + Progressive Reminder Schedule
ARCHETYPE: SCHEDULING
ENTRY: TicketIssued event consumed from queue
PURPOSE: Create calendar entry, schedule reminders at T-7d/T-1d/T-1h/T-15m
DISTINCT FROM: T93 (reservation) — T96 is time-based with durable timer semantics

FACTORY DEPENDENCIES:
  F275 — ICalendarIntegrationService
  F276 — IReminderScheduleService
  F279 — ISagaCoordinatorService

FABRIC RESOLUTION:
  F275 → DATABASE FABRIC (PostgreSQL for calendar entries)
  F276 → DATABASE FABRIC (Redis sorted sets + PostgreSQL for reminders)
  F279 → DATABASE FABRIC (PostgreSQL for saga tracking)

AF CONFIGURATION:
  AF-1 Genesis: Generate calendar + reminder services
  AF-4 RAG: Retrieve SK-40 (Redis sorted set scheduling pattern)
  AF-7 Compliance: DNA-9 (compensation on cancellation)
  AF-9 Judge: Validate IR-96-1 through IR-96-8

BFA VALIDATION:
  CF-85: Timer drift / reminder missed (catch-up)
  CF-95: Calendar overlap with FLOW-06

IRON RULES:
  IR-96-1: Reminders stored in Redis sorted set with score=epoch timestamp
  IR-96-2: Catch-up job runs every 15min (FREEDOM configurable)
  IR-96-3: Late reminders (>15min) use adjusted messaging template
  IR-96-4: Reminder dedup by reminder_schedule_id
  IR-96-5: All times stored as UTC, converted to user TZ at dispatch
  IR-96-6: Calendar overlap check calls FLOW-06 F225 (CF-95)
  IR-96-7: CancelRemindersAsync registered as EP-4 compensation
  IR-96-8: RemoveCalendarEntryAsync registered as EP-4 compensation

QUALITY GATES:
  QG-96-1: Reminder dispatch within 1min of scheduled time (normal operation)
  QG-96-2: Catch-up processes all due reminders within 60s of restart
  QG-96-3: No duplicate reminders after catch-up
  QG-96-4: Calendar entry created within 5s of TicketIssued
```

## TASK TYPE: T97 — Participant Connection Scoring (O(n²) Bounded)

```
TASK TYPE: T97
NAME: Four-Component Connection Scoring with Bounded Fan-Out
ARCHETYPE: AGGREGATION
ENTRY: ParticipantsIdentified event consumed from queue
PURPOSE: Compute composite connection scores for all participant pairs
DISTINCT FROM: T40 (three-way join) — T97 is four-component with O(n²) backpressure

FACTORY DEPENDENCIES:
  F280 — IParticipantIdentificationService
  F281 — IHistoryScoringService
  F282 — IAudienceMatchScoringService
  F283 — IGroupOverlapScoringService
  F286 — IQuestionnaireSimilarityScoringService

FABRIC RESOLUTION:
  F280 → DATABASE FABRIC (PostgreSQL)
  F281 → DATABASE FABRIC (PostgreSQL)
  F282 → DATABASE FABRIC (MongoDB) + AI ENGINE FABRIC (embeddings)
  F283 → DATABASE FABRIC (PostgreSQL) + RAG FABRIC (optional Neo4j)
  F286 → DATABASE FABRIC (MongoDB) + AI ENGINE FABRIC (embeddings)

AF CONFIGURATION:
  AF-1 Genesis: Generate scoring pipeline with parallel sub-component execution
  AF-4 RAG: Retrieve SK-41 (bounded fan-out pattern)
  AF-5 Multi-model: Embedding generation across providers
  AF-9 Judge: Validate IR-97-1 through IR-97-8

BFA VALIDATION:
  CF-87: Missing business profile graceful degradation (FLOW-02)
  CF-92: Queue overflow backpressure for large events

IRON RULES:
  IR-97-1: Four components equally weighted: (history + questionnaire + group + audience) / 4
  IR-97-2: Missing sub-score → 0.0 (not failure) — DataProcessResult.Ok with partial flag
  IR-97-3: Queue depth checked BEFORE each batch emission (CF-92)
  IR-97-4: Events >2000 attendees → sampling mode (FREEDOM toggle)
  IR-97-5: Per-tenant queue ceiling prevents starvation
  IR-97-6: Scoring batch size = FREEDOM (default 500 pairs)
  IR-97-7: DLQ for poison messages (malformed pair data)
  IR-97-8: All sub-scores normalized to [0.0, 1.0] range

QUALITY GATES:
  QG-97-1: 100-person event scored within 30s
  QG-97-2: 5000-person event (sampling) scored within 10min
  QG-97-3: Queue depth never exceeds configured threshold
  QG-97-4: Scoring quality (sampling) within 5% of full cartesian
  QG-97-5: Partial scores computed correctly (3/4 components + 0.0)
  QG-97-6: All pairs eventually scored (no data loss)
```

## TASK TYPE: T98 — Feed Integration with Diversity Enforcement

```
TASK TYPE: T98
NAME: Cross-Flow Feed Integration with Diversity Caps
ARCHETYPE: DISTRIBUTION
ENTRY: ParticipantConnectionsCalculated event consumed from queue
PURPOSE: Inject participant posts into user feeds with diversity enforcement
DISTINCT FROM: T82 (FLOW-07 feed) — T98 enforces cross-flow combined caps

FACTORY DEPENDENCIES:
  F284 — IFeedIntegrationService

FABRIC RESOLUTION:
  F284 → DATABASE FABRIC (Redis for feed positions) + QUEUE FABRIC (events)

AF CONFIGURATION:
  AF-1 Genesis: Generate feed integration with diversity enforcement
  AF-4 RAG: Retrieve SK-42 (feed diversity cap pattern)
  AF-9 Judge: Validate IR-98-1 through IR-98-6

BFA VALIDATION:
  CF-84: Feed diversity cap (40% participant content)
  CF-89: Shared feed namespace with FLOW-07

IRON RULES:
  IR-98-1: Each post tagged with source_flow_id (FLOW-09)
  IR-98-2: 40% cap enforced across ALL sources combined (CF-84)
  IR-98-3: Same participant not within 3-post window (spacing rule)
  IR-98-4: No flow can evict another flow's posts — only demote
  IR-98-5: Feed namespace: feed:{tenantId}:{userId}:{sourceFlow}
  IR-98-6: RemoveParticipantPostsAsync is EP-4 compensation step

QUALITY GATES:
  QG-98-1: Feed injection < 5s for 100 participants
  QG-98-2: Diversity cap never exceeded after enforcement
  QG-98-3: FLOW-07 posts unaffected by FLOW-09 injection
```

## TASK TYPE: T99 — Time-Based Weight Evolution

```
TASK TYPE: T99
NAME: Durable Timer Weight Multipliers and Exponential Decay
ARCHETYPE: SCHEDULING
ENTRY: Durable timer fires at milestone (T-7d, T-1d, T-0, T+1d through T+7d)
PURPOSE: Apply weight multipliers and decay to event_participation_weight dimension
DISTINCT FROM: T96 (reminders) — T99 is weight math, not user notifications

FACTORY DEPENDENCIES:
  F285 — IWeightEvolutionService
  F276 — IReminderScheduleService (timer infrastructure)

FABRIC RESOLUTION:
  F285 → DATABASE FABRIC (Redis cache + PostgreSQL weight records)
  F276 → DATABASE FABRIC (Redis sorted sets for timer scheduling)

AF CONFIGURATION:
  AF-1 Genesis: Generate weight evolution with exponential decay
  AF-4 RAG: Retrieve SK-43 (exponential decay pattern)
  AF-9 Judge: Validate IR-99-1 through IR-99-8

BFA VALIDATION:
  CF-85: Timer drift / catch-up for weight milestones
  CF-93: Weight dimension isolation (FLOW-04 unaffected)

IRON RULES:
  IR-99-1: Writes to event_participation_weight ONLY (never connection_weight)
  IR-99-2: Multiplier milestones: T-7d=1.5×, T-1d=2.0×, T-0=3.0× (FREEDOM configurable)
  IR-99-3: Post-event decay: exponential with tau=2.0 (FREEDOM)
  IR-99-4: Permanent bonus: +0.05 applied after decay completes (FREEDOM)
  IR-99-5: Missed milestones applied in sequence on catch-up (not multiplied)
  IR-99-6: Timer catch-up aligned with F276 catch-up job (CF-85)
  IR-99-7: Weight dimension stored as nested JSON in connection document (DNA-1)
  IR-99-8: DecayCompleted emitted when weight within 1% of base + bonus

QUALITY GATES:
  QG-99-1: Multiplier applied within 1min of milestone time
  QG-99-2: Decay calculation correct to 3 decimal places
  QG-99-3: Catch-up applies all missed milestones within 60s
  QG-99-4: FLOW-04 ranking scores unchanged after weight evolution (CF-93)
```

## TASK TYPE: T100 — Waitlist Management + Upgrade Flow

```
TASK TYPE: T100
NAME: FIFO Waitlist with Automatic Upgrade
ARCHETYPE: ORCHESTRATION
ENTRY: CapacityUpdated event (when capacity increases) or direct waitlist join
PURPOSE: Manage waitlist queue, offer upgrades when spots open
DISTINCT FROM: T93 (reservation) — T100 is a secondary entry path for full events

FACTORY DEPENDENCIES:
  F278 — IWaitlistService
  F272 — IReservationHoldService (for upgrade)
  F279 — ISagaCoordinatorService

FABRIC RESOLUTION:
  F278 → DATABASE FABRIC (PostgreSQL for waitlist)
  F272 → DATABASE FABRIC (Redis + PostgreSQL for reservation)
  F279 → DATABASE FABRIC (PostgreSQL for saga)

AF CONFIGURATION:
  AF-1 Genesis: Generate waitlist service with upgrade trigger
  AF-9 Judge: Validate IR-100-1 through IR-100-6

BFA VALIDATION: Internal only (no cross-flow conflicts)

IRON RULES:
  IR-100-1: FIFO ordering strictly maintained (position column, no reordering)
  IR-100-2: Upgrade offer has TTL (FREEDOM: default 10min)
  IR-100-3: Expired upgrade offer → next in line (automatic)
  IR-100-4: AcceptUpgrade creates new reservation via F272 (reuses T93 path)
  IR-100-5: XP metadata: participation_type="waitlist_upgrade" (for CF-94)
  IR-100-6: Concurrent upgrade acceptance → only first succeeds (optimistic lock)

QUALITY GATES:
  QG-100-1: Upgrade offered within 5s of capacity increase
  QG-100-2: FIFO order never violated
  QG-100-3: Expired upgrade → next offer within 30s
```

## TASK TYPE: T101 — Participation Cancellation Saga

```
TASK TYPE: T101
NAME: Participant Cancellation with Full Compensation
ARCHETYPE: COMPENSATION
ENTRY: DELETE /events/{eventId}/participation
PURPOSE: Execute full saga compensation: refund → cancel ticket → restore capacity → cleanup
DISTINCT FROM: T94 (payment step) — T101 is full LIFO unwind of the entire saga

FACTORY DEPENDENCIES:
  F279 — ISagaCoordinatorService
  F273 — IPaymentGatewayService (refund)
  F274 — ITicketingService (cancel)
  F277 — ICapacityManagementService (restore)
  F275 — ICalendarIntegrationService (remove)
  F276 — IReminderScheduleService (cancel)
  F284 — IFeedIntegrationService (remove posts)

FABRIC RESOLUTION:
  All factories resolve through DATABASE FABRIC (PostgreSQL) + QUEUE FABRIC (Redis Streams)

AF CONFIGURATION:
  AF-1 Genesis: Generate cancellation handler with LIFO compensation
  AF-7 Compliance: DNA-9 (every step has compensation, all idempotent)
  AF-9 Judge: Validate IR-101-1 through IR-101-6

BFA VALIDATION:
  CF-91: Saga compensation race (concurrent triggers)

IRON RULES:
  IR-101-1: Compensation executes in LIFO order (reverse of completion)
  IR-101-2: Each compensation step idempotent (EP-5 dedup)
  IR-101-3: Saga status uses optimistic lock (CF-91)
  IR-101-4: Refund initiated BEFORE capacity restore (money first)
  IR-101-5: All compensation steps logged to saga audit trail
  IR-101-6: Partial compensation (some steps fail) → retry with DLQ escalation

QUALITY GATES:
  QG-101-1: Full cancellation completes within 30s
  QG-101-2: Refund amount matches original payment exactly
  QG-101-3: Capacity restored (capacity_available incremented by 1)
  QG-101-4: All feed entries removed
  QG-101-5: All reminders cancelled
```

## TASK TYPE: T102 — Participation Analytics Emission

```
TASK TYPE: T102
NAME: Participation Analytics with Cross-Flow XP Delegation
ARCHETYPE: ANALYTICS
ENTRY: All saga steps completed (TicketIssued + CalendarEntry + RemindersScheduled)
PURPOSE: Record analytics, emit EventParticipationAnalyzed for FLOW-05 gamification
DISTINCT FROM: T92 (deployment) — T102 is domain analytics with cross-flow delegation

FACTORY DEPENDENCIES:
  F287 — IParticipationAnalyticsService

FABRIC RESOLUTION:
  F287 → DATABASE FABRIC (Elasticsearch for analytics) + QUEUE FABRIC (events)

AF CONFIGURATION:
  AF-1 Genesis: Generate analytics emitter with XP metadata
  AF-9 Judge: Validate IR-102-1 through IR-102-6

BFA VALIDATION:
  CF-94: XP delegation to FLOW-05 (no direct XP award)

IRON RULES:
  IR-102-1: EventParticipationAnalyzed carries xp_eligible + participation_type
  IR-102-2: No XP awarded in FLOW-09 services (CF-94 — FLOW-05 owns gamification)
  IR-102-3: participation_type = "paid" | "free" | "waitlist_upgrade"
  IR-102-4: Analytics indexed in Elasticsearch (not PostgreSQL)
  IR-102-5: Metrics: participants, capacity_pct, payment_sum, avg_match_score, segments
  IR-102-6: tenantId on every analytics document (DNA-5)

QUALITY GATES:
  QG-102-1: Analytics recorded within 10s of participation completion
  QG-102-2: EventParticipationAnalyzed emitted exactly once (EP-5 dedup)
  QG-102-3: FLOW-05 receives event and awards correct XP amount
```

---

## AF STATION MAP — FLOW-09 (11 Stations × 10 Task Types)

| Station | T93 Reservation | T94 Payment | T95 Ticket | T96 Calendar | T97 Scoring | T98 Feed | T99 Weight | T100 Waitlist | T101 Cancel | T102 Analytics |
|---------|----------------|-------------|------------|--------------|-------------|----------|------------|---------------|-------------|----------------|
| AF-1 Genesis | Reservation svc | Payment handler | Ticketing svc | Calendar+Reminder | Scoring pipeline | Feed injector | Weight evolver | Waitlist svc | Cancellation handler | Analytics emitter |
| AF-2 Planning | 3 steps (check→reserve→saga) | 4 steps (validate→intent→webhook→emit) | 3 steps (dedup→generate→capacity) | 4 steps (calendar→overlap→remind→schedule) | 5 steps (identify→4×score→composite) | 3 steps (inject→cap→enforce) | 3 steps (milestone→multiply→decay) | 3 steps (join→offer→accept) | 7 steps (LIFO chain) | 2 steps (record→emit) |
| AF-3 Prompts | Reservation patterns | PSP webhook patterns | QR encryption patterns | Calendar API patterns | Cosine similarity patterns | Feed diversity patterns | Exponential decay patterns | Queue management patterns | Saga compensation patterns | Analytics aggregation patterns |
| AF-4 RAG | SK-37 Redis hold | SK-38 webhook dedup | SK-39 encrypted QR | SK-40 sorted set | SK-41 bounded fan-out | SK-42 diversity cap | SK-43 exp decay | SK-37 (reuse) | SK-38+SK-39 (reuse) | Elasticsearch agg |
| AF-5 Multi-model | — | — | — | — | Embedding gen (Claude+OpenAI) | — | — | — | — | — |
| AF-6 Code review | Redis TTL correctness | Webhook sig order | AES-GCM usage | TZ handling | O(n²) bounds | Cap math | Decay formula | FIFO integrity | LIFO order | ES index mapping |
| AF-7 Compliance | DNA-1,2,3,4,5,6,9 | DNA-1,2,3,4,5,6,9 | DNA-1,2,3,4,5,6,9 | DNA-1,2,3,4,5,6,9 | DNA-1,2,3,4,5,6 | DNA-1,2,3,4,5,6,9 | DNA-1,2,3,4,5,6 | DNA-1,2,3,4,5,6,9 | DNA-1,2,3,4,5,6,9 | DNA-1,2,3,4,5,6 |
| AF-8 Security | — | Sig verify, no plaintext keys | KMS key ref, AES-GCM | OAuth token storage | — | — | — | — | — | — |
| AF-9 Judge | IR-93-1..8, QG-93-1..6 | IR-94-1..8, QG-94-1..6 | IR-95-1..8, QG-95-1..5 | IR-96-1..8, QG-96-1..4 | IR-97-1..8, QG-97-1..6 | IR-98-1..6, QG-98-1..3 | IR-99-1..8, QG-99-1..4 | IR-100-1..6, QG-100-1..3 | IR-101-1..6, QG-101-1..5 | IR-102-1..6, QG-102-1..3 |
| AF-10 Merge | Standard | Standard | Standard | Standard | 4-component merge | Standard | Standard | Standard | Standard | Standard |
| AF-11 Feedback | Reservation latency | Payment success rate | Ticket gen time | Calendar sync rate | Scoring quality | Feed diversity | Weight accuracy | Upgrade conversion | Compensation time | Analytics freshness |

**Total AF cells: 110 (11 × 10)**

---

## FLOW TEMPLATE 19: event-participation-v1

```json
{
  "templateId": "event-participation-v1",
  "flowId": "FLOW-09",
  "version": "1.0.0",
  "name": "Event Participation & Social Integration",
  "description": "Saga-based event participation: reservation → payment → ticket → calendar → reminders → social scoring → feed integration → weight evolution",
  "metadata": {
    "taskTypes": ["T93","T94","T95","T96","T97","T98","T99","T100","T101","T102"],
    "factories": ["F272","F273","F274","F275","F276","F277","F278","F279","F280","F281","F282","F283","F284","F285","F286","F287"],
    "families": [30, 31],
    "enginePrimitives": ["EP-4","EP-5"],
    "dnaPatterns": ["DNA-1","DNA-2","DNA-3","DNA-4","DNA-5","DNA-6","DNA-9"],
    "events": 18,
    "endpoints": 12,
    "entities": 11
  },
  "dag": {
    "nodes": [
      {
        "nodeId": "start",
        "taskType": "T93",
        "factory": "F272",
        "fabric": "DATABASE_FABRIC",
        "next": {"available": "payment-or-ticket", "full": "waitlist", "error": "reject"}
      },
      {
        "nodeId": "waitlist",
        "taskType": "T100",
        "factory": "F278",
        "fabric": "DATABASE_FABRIC",
        "next": {"upgrade_accepted": "payment-or-ticket", "timeout": "end"}
      },
      {
        "nodeId": "payment-or-ticket",
        "type": "condition",
        "expression": "event.price > 0",
        "true": "payment",
        "false": "ticket"
      },
      {
        "nodeId": "payment",
        "taskType": "T94",
        "factory": "F273",
        "fabric": "QUEUE_FABRIC",
        "next": {"completed": "ticket", "failed": "compensate"}
      },
      {
        "nodeId": "ticket",
        "taskType": "T95",
        "factory": "F274",
        "fabric": "DATABASE_FABRIC",
        "next": {"issued": "parallel-post-ticket"}
      },
      {
        "nodeId": "parallel-post-ticket",
        "type": "parallel",
        "branches": ["calendar-remind", "social-scoring"],
        "joinMode": "allSettled"
      },
      {
        "nodeId": "calendar-remind",
        "taskType": "T96",
        "factory": ["F275", "F276"],
        "fabric": "DATABASE_FABRIC",
        "next": "join"
      },
      {
        "nodeId": "social-scoring",
        "taskType": "T97",
        "factory": ["F280","F281","F282","F283","F286"],
        "fabric": "DATABASE_FABRIC + AI_ENGINE_FABRIC + RAG_FABRIC",
        "next": "feed-integration"
      },
      {
        "nodeId": "feed-integration",
        "taskType": "T98",
        "factory": "F284",
        "fabric": "DATABASE_FABRIC",
        "next": "join"
      },
      {
        "nodeId": "join",
        "type": "join",
        "requires": ["calendar-remind", "feed-integration"],
        "next": "analytics"
      },
      {
        "nodeId": "analytics",
        "taskType": "T102",
        "factory": "F287",
        "fabric": "DATABASE_FABRIC",
        "next": "end"
      },
      {
        "nodeId": "weight-evolution",
        "taskType": "T99",
        "factory": "F285",
        "trigger": "durable_timer",
        "milestones": ["T-7d", "T-1d", "T-0", "T+1d..T+7d"],
        "independent": true
      },
      {
        "nodeId": "compensate",
        "taskType": "T101",
        "factory": "F279",
        "fabric": "DATABASE_FABRIC",
        "trigger": "saga_failure",
        "next": "end"
      }
    ],
    "compensationPolicy": {
      "mode": "automatic",
      "order": "LIFO",
      "maxRetries": 3,
      "deadLetterQueue": "flow09-compensation-dlq"
    }
  },
  "backwardCompatibility": {
    "existingFlows": "FLOW-01 through FLOW-08 unchanged",
    "existingTaskTypes": "T1-T92 unchanged",
    "existingFactories": "F1-F271 unchanged",
    "cloudEventsCompat": "All FLOW-09 events use CloudEvents v1.0 envelope"
  }
}
```

---

## Phase 2 Summary

| Artifact | Count | Details |
|----------|-------|---------|
| Task types | 10 | T93-T102 |
| Iron rules | 72 | IR-93-1 through IR-102-6 |
| Quality gates | 45 | QG-93-1 through QG-102-3 |
| AF station cells | 110 | 11 stations × 10 task types |
| Flow template | 1 | Template 19: event-participation-v1 |

### FIRST TIME Capabilities

| Task | Capability | Why First |
|------|-----------|-----------|-
| T94 | Webhook dedup with EP-5 | First flow with external PSP webhook handling |
| T97 | O(n²) bounded fan-out with sampling | First flow with >1000-entity cartesian scoring |
| T99 | Durable timer weight evolution | First flow with multi-milestone time-based weight math |
| T101 | Full LIFO saga compensation | First flow with 7-step compensation chain |

---

## SAVE POINT: FLOW-09:MERGE:P2 ✅
## Phase 2 COMPLETE: T93-T102, 72 IR, 45 QG, 110 AF cells, Template 19

---

# ═══════════════════════════════════════════════════════
# FLOW-11 — ERP SYSTEMS ENGINE EXTENSION
# Task Types T103–T110 | Template 20
# ═══════════════════════════════════════════════════════

---

## TASK TYPE: T103 — ERP Document Chain Step

```
ARCHETYPE: STATEFUL_ORCHESTRATION
ENTRY: Fires when ISagaCoordinatorService (F293) advances saga to a document-creation step
PURPOSE: Creates a single document in the ERP chain with idempotency guarantee and
         compensation path. Covers all docTypes: QUOTE, SALES_ORDER, DELIVERY,
         AR_INVOICE, INCOMING_PAYMENT, PURCHASE_REQUISITION, PURCHASE_ORDER,
         GOODS_RECEIPT, AP_INVOICE, OUTGOING_PAYMENT
DISTINCT FROM:
  T40 (Three-Way Join Gate) — T103 is a linear chain step, not parallel convergence
  T33 (2-way convergence) — T103 creates new documents, does not merge streams
  T104 (Three-Way Match Gate) — T103 creates documents; T104 validates them
FACTORY DEPENDENCIES:
  F288:IERPConnectorService — resolved via CreateAsync()
  F290:IDocumentChainService — resolved via CreateAsync()
  F294:IIdempotencyService — resolved via CreateAsync()
  F296:IOutboxPublisherService — resolved via CreateAsync()
  F301:IAuditLedgerService — resolved via CreateAsync()
FABRIC RESOLUTION:
  F288 → DATABASE FABRIC (Skill 05) → provider per tenant config (ES/PG/Mongo)
  F290 → DATABASE FABRIC (Skill 05) → PostgreSQL (append-only chain)
  F294 → DATABASE FABRIC (Skill 05) → Redis + PostgreSQL fallback
  F296 → QUEUE FABRIC (Skill 04) → Redis Streams
  F301 → DATABASE FABRIC (Skill 05) → Elasticsearch (audit index)
AF CONFIGURATION:
  AF-1 Genesis: generates IDocumentChainService impl on DATABASE FABRIC;
                always includes idempotency check as first operation
  AF-4 RAG: retrieves idempotency key pattern (F294), outbox pattern (F296),
            DR-30 co-design pattern; DNA-1/3/5 enforcement examples
  AF-7 Compliance: validates no typed ERP models (DNA-1), DataProcessResult on all
                   paths (DNA-3), tenantId in every DB call (DNA-5)
  AF-9 Judge: idempotencyKey present; auditLog written before return;
              no direct provider import; outbox in same logical unit as mutation
BFA VALIDATION:
  CF-96: Parent document must exist in chain before child document creation
  CF-97: idempotencyKey must be unique for (tenantId, correlationId, stepName)
  CF-98: tenantId must match across all factories resolved in same step
MACHINE (fixed):
  - idempotencyKey format: "{docType}:{correlationId}:{stepName}"
  - Retry policy: 5 attempts, exponential backoff, max 30 minutes
  - On permanent failure: ISagaCoordinatorService.CompensateAsync → T107
  - Audit entry written synchronously before returning result
  - Outbox write in same DB transaction as document creation (DR-30)
FREEDOM (configurable via ES config index):
  - DB provider for F288 (Elasticsearch / PostgreSQL / MongoDB)
  - Timeout per step (default 300s, max 3600s, per-tenant)
  - Approval required before POSTED status (enable/disable per docType per tenant)
  - approver_role mapping (default: finance_admin for invoices, sales_ops for orders)
IRON RULES:
  IR-103-1: idempotencyKey MUST be present on CreateDocumentAsync/PostDocumentAsync → BUILD FAILURE
  IR-103-2: tenantId MUST be in FactoryResolutionContext → BUILD FAILURE
  IR-103-3: DataProcessResult<T> on ALL code paths — never throw for business logic → BUILD FAILURE
  IR-103-4: No direct import of SAP SDK, monday SDK, or any ERP provider → BUILD FAILURE
  IR-103-5: Original document NEVER deleted — compensation uses T107 (reversal only) → BUILD FAILURE
  IR-103-6: Audit (F301.WriteAuditAsync) written BEFORE returning success → BUILD FAILURE
QUALITY GATES (AF-9 Judge):
  QG-103-1: PostDocument only executes after ValidateChainIntegrityAsync passes
  QG-103-2: Status POSTED requires approvalToken in context (if approval enabled in FREEDOM)
  QG-103-3: Outbox write (F296) present in same logical unit as document mutation
  QG-103-4: Audit log entry present for every POSTED transition
  QG-103-5: idempotent: calling with same key twice returns first result without side effects
```

---

## TASK TYPE: T104 — Three-Way Match Gate

```
ARCHETYPE: VALIDATION_GATE
ENTRY: Fires automatically after GoodsReceipt (GR) created in P2P chain;
       blocks APInvoice posting until match status is resolved
PURPOSE: Validates PurchaseOrder ↔ GoodsReceipt ↔ VendorInvoice alignment.
         Routes to exception workflow (T109) on variance; blocks saga on MISMATCH.
DISTINCT FROM:
  T40 (Three-Way Join Gate) — T104 is a validation gate, not a parallel convergence merge
  T103 (ERP Document Chain Step) — T104 reads documents, does not create them
  T109 (ERP Approval Gate) — T104 triggers T109 as sub-step on variance
FACTORY DEPENDENCIES:
  F298:IThreeWayMatchService — resolved via CreateAsync()
  F290:IDocumentChainService — resolved via CreateAsync()
  F293:ISagaCoordinatorService — resolved via CreateAsync()
  F301:IAuditLedgerService — resolved via CreateAsync()
FABRIC RESOLUTION:
  F298 → DATABASE FABRIC (Skill 05) → Elasticsearch (match analysis index)
  F290 → DATABASE FABRIC (Skill 05) → PostgreSQL (chain validation)
  F293 → QUEUE FABRIC (Skill 04) → Redis Streams (saga routing)
  F301 → DATABASE FABRIC (Skill 05) → Elasticsearch (audit)
AF CONFIGURATION:
  AF-2 Planning: decomposes into steps:
                 1. Fetch PO from F290
                 2. Fetch GR from F290 (validate link_type=CHILD → PO exists)
                 3. Fetch Vendor Invoice from F290
                 4. Run F298.MatchAsync
                 5. Branch on result: FULL_MATCH / VARIANCE / MISMATCH
  AF-4 RAG: retrieves branching/decision step patterns from T31/T32 in skill library
  AF-9 Judge: validates MISMATCH path routes to ALERT_AND_BLOCK; VARIANCE routes to T109;
              neither path silently advances to APInvoice posting
BFA VALIDATION:
  CF-99: PO, GR, Invoice must all belong to same tenantId (cross-tenant prevention)
  CF-100: GR must reference PO via chain link before match can run
  CF-101: Amount variance checked against tenant-configurable tolerance (FREEDOM config)
MACHINE (fixed):
  - FULL_MATCH → F293.AdvanceStepAsync to AP_INVOICE step
  - QUANTITY_VARIANCE or PRICE_VARIANCE → route to T109 (exception approval)
  - MISMATCH → F293 saga blocked; alert event emitted; manual resolution required
  - Match result always stored in F298 and audited via F301
FREEDOM (configurable):
  - Variance tolerance % (per tenant, per item category, via ES config index)
  - Auto-approve variances under threshold (per tenant toggle)
  - Exception assignee role (default: ap_clerk)
IRON RULES:
  IR-104-1: MISMATCH must NEVER silently advance saga to AP invoice posting → BUILD FAILURE
  IR-104-2: APInvoice posting blocked until match status = FULL_MATCH or manually
            overridden with approvalToken (role=finance_admin) → BUILD FAILURE
  IR-104-3: Override of MISMATCH without finance_admin approvalToken → BUILD FAILURE
QUALITY GATES (AF-9 Judge):
  QG-104-1: Match result stored (F298) and auditable (F301) for every invocation
  QG-104-2: Variance amounts captured numerically in match record
  QG-104-3: tenantId sourced from FactoryResolutionContext — never inferred from payload
```

---

## TASK TYPE: T105 — Master Data Sync Step

```
ARCHETYPE: INTEGRATION_SYNC
ENTRY: Triggered by schedule event OR connection setup event from T108
PURPOSE: Incremental sync of ERP master data (partners, items, warehouses) into
         canonical store using watermark-based OData pagination with deduplication
DISTINCT FROM:
  T103 (ERP Document Chain Step) — T105 syncs reference/master data, not transactional docs
  T108 (Connection Bootstrap) — T108 calls T105 as sub-step during initial setup
FACTORY DEPENDENCIES:
  F288:IERPConnectorService — resolved via CreateAsync()
  F289:IMasterDataService — resolved via CreateAsync()
  F294:IIdempotencyService — resolved via CreateAsync()
  F300:IERPTenantConnectionRegistry — resolved via CreateAsync()
  F303:ITenantQuotaEnforcerService — resolved via CreateAsync()
FABRIC RESOLUTION:
  F288 → DATABASE FABRIC (Skill 05) → per-tenant ERP provider
  F289 → DATABASE FABRIC (Skill 05) → Elasticsearch (master data index)
  F294 → DATABASE FABRIC (Skill 05) → Redis (dedup fast path)
  F300 → DATABASE FABRIC (Skill 05) → Elasticsearch (connection config)
  F303 → DATABASE FABRIC (Skill 05) → Redis (quota counters)
AF CONFIGURATION:
  AF-1 Genesis: generates sync service using OData watermark ($skiptoken/$orderby)
                on F288; transparent B1SESSION renewal on 401
  AF-4 RAG: retrieves incremental sync + watermark checkpoint patterns from skill library
  AF-7 Compliance: validates BuildSearchFilter used (DNA-2), no typed partner/item models (DNA-1)
MACHINE (fixed):
  - OData pagination: $filter + $orderby + $skiptoken per page
  - B1SESSION renewal on 401 — transparent retry, NEVER logs session token
  - Watermark persisted as checkpoint after every page success
  - Deduplication key: "sync_job:{tenantId}:{entitySet}:{watermark}"
  - F303.CheckQuotaAsync called BEFORE each page fetch
FREEDOM (configurable):
  - Sync frequency (default: 60 min; enterprise: event-driven via F297 webhook)
  - Entities to sync (partners / items / warehouses — toggleable per tenant)
  - ERP provider type (SAP_B1_ODATA, GENERIC_REST — via FREEDOM config)
  - Page size (default: 100 records, max: 1000)
IRON RULES:
  IR-105-1: F303.CheckQuotaAsync BEFORE each page fetch → BUILD FAILURE if skipped
  IR-105-2: B1SESSION renewal never stores/logs session token → BUILD FAILURE if logged
  IR-105-3: PII fields (tax_id, addresses) encrypted via tenant KEK on upsert → BUILD FAILURE if not
QUALITY GATES (AF-9 Judge):
  QG-105-1: Watermark checkpoint saved before returning from each page
  QG-105-2: Sync job idempotent — re-running same sync window produces same canonical state
  QG-105-3: F294 dedup prevents duplicate upserts on retry
```

---

## TASK TYPE: T106 — Period-End Close Routine

```
ARCHETYPE: SCHEDULED_WORKFLOW
ENTRY: Triggered by schedule event OR manual initiation with periodId + approvalToken
PURPOSE: Automates Record-to-Report close activities:
         revaluation → accruals → balance validation → period seal
DISTINCT FROM:
  T103 (single document step) — T106 is a multi-step coordinated accounting workflow
  T107 (compensation) — T106 seals periods; T107 reverses documents
FACTORY DEPENDENCIES:
  F299:IPeriodCloseService — resolved via CreateAsync()
  F291:ILedgerService — resolved via CreateAsync()
  F293:ISagaCoordinatorService — resolved via CreateAsync()
  F301:IAuditLedgerService — resolved via CreateAsync()
  F302:IERPReportingService — resolved via CreateAsync()
FABRIC RESOLUTION:
  F299 → DATABASE FABRIC (Skill 05) → PostgreSQL (ledger, append-only)
  F291 → DATABASE FABRIC (Skill 05) → PostgreSQL (journal entries)
  F293 → QUEUE FABRIC (Skill 04) → Redis Streams (saga coordination)
  F301 → DATABASE FABRIC (Skill 05) → Elasticsearch (audit)
  F302 → RAG FABRIC (Skill 00b) → Hybrid (analytics/reporting index)
AF CONFIGURATION:
  AF-1 Genesis: generates PeriodCloseService as saga steps across F299 + F291;
                each step is individually idempotent and restartable
  AF-2 Planning: decomposes into: INIT → REVALUE → ACCRUE → VALIDATE → SEAL
  AF-9 Judge: FinalizeCloseAsync requires approvalToken + balance_check=PASSED;
              period seal path validated as irreversible
BFA VALIDATION:
  CF-102: All O2C/P2P docs for period must be in terminal state (POSTED/CANCELLED) before seal
  CF-103: Journal debit totals must equal credit totals for period before FinalizeCloseAsync
  CF-104: F296 outbox pending count for period must be zero before FinalizeCloseAsync
MACHINE (fixed):
  - Sequence: INIT → REVALUE → ACCRUE → VALIDATE → SEAL
  - FinalizeCloseAsync requires: approvalToken(role=finance_admin) + balance_check=PASSED
  - Sealed period creates immutable snapshot in PostgreSQL + analytics index
  - Re-open creates reversal period (new periodId referencing original) — never modifies closed
FREEDOM (configurable):
  - Exchange rate source for revaluation (per tenant, from FREEDOM config)
  - Accrual rule definitions (stored in FREEDOM config ES index)
  - Auto-close toggle if balance check passes (enterprise tier only)
IRON RULES:
  IR-106-1: Period cannot be sealed if unresolved P2P match exceptions exist → BUILD FAILURE
  IR-106-2: Closed period NEVER modified or deleted → re-open = new reversal period → BUILD FAILURE
  IR-106-3: FinalizeCloseAsync without approvalToken(role=finance_admin) → BUILD FAILURE
  IR-106-4: Each REVALUE and ACCRUE step requires idempotencyKey → BUILD FAILURE if absent
QUALITY GATES (AF-9 Judge):
  QG-106-1: All close steps individually idempotent and replayable
  QG-106-2: Balance validation (CF-103 check) produces audit-grade report before seal
  QG-106-3: Sealed period returns period_status=CLOSED on all subsequent reads
  QG-106-4: F302 analytics index updated from outbox relay (not direct write) after seal
```

---

## TASK TYPE: T107 — Reversal / Compensation Step

```
ARCHETYPE: COMPENSATION
ENTRY: Fires when F293:ISagaCoordinatorService calls CompensateAsync,
       OR when manual reversal is initiated with required approvalToken
PURPOSE: Creates cancellation/reversal artifact for any previously posted document.
         Preserves full audit trail; reverses chain links; posts balancing journal entry.
DISTINCT FROM:
  T103 (document creation) — T107 creates reversal documents as compensation for T103
  T106 (period close) — T106 seals periods; T107 reverses individual documents
FACTORY DEPENDENCIES:
  F295:IReversalService — resolved via CreateAsync()
  F291:ILedgerService — resolved via CreateAsync()
  F290:IDocumentChainService — resolved via CreateAsync()
  F301:IAuditLedgerService — resolved via CreateAsync()
  F294:IIdempotencyService — resolved via CreateAsync()
FABRIC RESOLUTION:
  F295 → DATABASE FABRIC (Skill 05) → PostgreSQL (same fabric as F290)
  F291 → DATABASE FABRIC (Skill 05) → PostgreSQL (journal entries)
  F290 → DATABASE FABRIC (Skill 05) → PostgreSQL (chain validation)
  F301 → DATABASE FABRIC (Skill 05) → Elasticsearch (audit)
  F294 → DATABASE FABRIC (Skill 05) → Redis (idempotency)
AF CONFIGURATION:
  AF-1 Genesis: generates ReversalService on F295 + F291; DELETE never appears in generated code
  AF-9 Judge: original doc status=CANCELLED confirmed; reversal doc created with reference;
              journal entry reversed with balanced debit/credit; audit present
MACHINE (fixed):
  - F295.ReverseDocumentAsync creates atomically:
      (1) Cancellation doc with link_type=REVERSAL referencing original doc_id
      (2) Reversal journal entry (debit/credit of original swapped) via F291
  - Original doc status → CANCELLED (immutable); cancellation doc → POSTED
  - idempotencyKey: "reversal:{originalDocId}:{tenantId}:{reason}"
  - Chain links from original cascaded to CANCELLED state
IRON RULES:
  IR-107-1: NEVER call IDatabaseService.DeleteDocument on any posted ERP doc → BUILD FAILURE
  IR-107-2: Reversal doc MUST store reference to original doc_id → BUILD FAILURE if absent
  IR-107-3: Reversal journal entry MUST balance: sum(debits) == sum(credits original) → BUILD FAILURE
  IR-107-4: Idempotent: reversing same doc twice returns existing reversal → BUILD FAILURE if not
QUALITY GATES (AF-9 Judge):
  QG-107-1: Both original and reversal documents remain queryable and reportable
  QG-107-2: Audit trail shows: original→CANCELLED, reversal doc POSTED, journal entry reversed
  QG-107-3: Chain integrity maintained: all downstream docs from original also CANCELLED
```

---

## TASK TYPE: T108 — Multi-Tenant ERP Connection Bootstrap

```
ARCHETYPE: SETUP_WORKFLOW
ENTRY: Fires when admin creates new ERP connection (tenant onboarding / integration setup event)
PURPOSE: Establishes tenant-specific ERP + work platform connections end-to-end:
         register config → verify webhook → authenticate ERP → initial sync → register BFA entities
DISTINCT FROM:
  T103 (document chain step) — T108 sets up infrastructure; T103 transacts on it
  T105 (master data sync) — T108 calls T105 as a sub-step during initial setup
FACTORY DEPENDENCIES:
  F300:IERPTenantConnectionRegistry — resolved via CreateAsync()
  F292:IWorkPlatformConnectorService — resolved via CreateAsync()
  F288:IERPConnectorService — resolved via CreateAsync()
  F289:IMasterDataService — resolved via CreateAsync()
  F297:IWebhookGatewayService — resolved via CreateAsync()
FABRIC RESOLUTION:
  F300 → DATABASE FABRIC (Skill 05) → Elasticsearch (tenant config index)
  F292 → AI ENGINE FABRIC (Skill 07) → GraphQL provider abstraction
  F288 → DATABASE FABRIC (Skill 05) → per-tenant ERP provider
  F289 → DATABASE FABRIC (Skill 05) → Elasticsearch (master data)
  F297 → QUEUE FABRIC (Skill 04) → Redis Streams (inbound webhooks)
AF CONFIGURATION:
  AF-2 Planning: decomposes into ordered steps:
                 1. F300.RegisterConnectionAsync (store config + secret_ref)
                 2. F297.HandleChallengeAsync via F292 (BLOCKING webhook verification)
                 3. F288.ConnectAsync (ERP auth test)
                 4. T105 invocation (initial master data sync for partners+items+warehouses)
                 5. BFA entity registration (new ERP entities indexed for conflict detection)
  AF-8 Security: validates OAuth scopes minimized; secrets as vault refs; TLS on all connections;
                 webhook JWT signature verification enabled from step 1
BFA VALIDATION:
  CF-105: New connection must not duplicate (tenantId, systemType, baseUrl) combination
  CF-106: Webhook endpoint challenge-response must succeed before ACTIVE status
MACHINE (fixed):
  - Webhook challenge-response (step 2) is BLOCKING — entire bootstrap halts on failure
  - Connection status = ACTIVE only after ALL steps succeed
  - Initial sync runs T105 for: partners, items, warehouses
  - BFA registers all new FLOW-11 entity types + events for this tenant
FREEDOM (configurable):
  - ERP product type (SAP_B1_ODATA / GENERIC_REST — per tenant)
  - OAuth scopes to request (per tenant capability set)
  - Initial sync scope (all entities / subset)
IRON RULES:
  IR-108-1: Raw OAuth tokens NEVER stored in DB — vault reference only → BUILD FAILURE
  IR-108-2: Webhook challenge-response verification cannot be bypassed → BUILD FAILURE
  IR-108-3: TLS required for all ERP and work platform connections → BUILD FAILURE
  IR-108-4: One tenant's connection config NEVER accessible by another tenant → BUILD FAILURE
QUALITY GATES (AF-9 Judge):
  QG-108-1: All secrets stored as vault refs — never raw values in any persistence
  QG-108-2: Health check passes for both ERP and work platform before status=ACTIVE
  QG-108-3: BFA entity registration complete before bootstrap returns success
```

---

## TASK TYPE: T109 — ERP Approval Gate

```
ARCHETYPE: HUMAN_TASK_GATE
ENTRY: Fires when saga step requires human approval before advancing.
       Triggered by: invoice posting, payment run initiation, period close seal,
       three-way match override request
PURPOSE: Suspends saga execution; routes to appropriate approver role;
         resumes saga on approve / triggers compensation on reject / escalates on timeout.
DISTINCT FROM:
  Previous approval steps in other flows — T109 carries ERP-specific context
  (docType, amount, RBAC role, financial consequence) required for correct routing
FACTORY DEPENDENCIES:
  F293:ISagaCoordinatorService — resolved via CreateAsync()
  F292:IWorkPlatformConnectorService — resolved via CreateAsync()
  F301:IAuditLedgerService — resolved via CreateAsync()
  F294:IIdempotencyService — resolved via CreateAsync()
FABRIC RESOLUTION:
  F293 → QUEUE FABRIC (Skill 04) → Redis Streams (saga state persistence)
  F292 → AI ENGINE FABRIC (Skill 07) → GraphQL (approval task on work platform board)
  F301 → DATABASE FABRIC (Skill 05) → Elasticsearch (audit)
  F294 → DATABASE FABRIC (Skill 05) → Redis (idempotency for approval events)
MACHINE (fixed):
  - Creates approval task on work platform board via F292 (with docType, amount, risk level)
  - Saga process_step.status → AWAITING_APPROVAL (persisted durably in F293)
  - On APPROVE: approvalToken written to saga state; F293.AdvanceStepAsync called
  - On REJECT: F293.CompensateAsync triggered → T107 if document already created
  - On TIMEOUT: escalates to supervisor_role; audit event written; counter incremented
FREEDOM (configurable):
  - Approver role mapping (finance_admin / ap_clerk / ar_clerk / sales_ops — FREEDOM config)
  - Approval timeout (default 24h, max 7 days — per tenant)
  - Auto-approve below amount threshold (per tenant, disabled by default)
  - Escalation path (supervisor role, secondary approver)
IRON RULES:
  IR-109-1: Payment runs and period close seal require approval regardless of auto-approve
            config → BUILD FAILURE if auto-approve applied to these types
  IR-109-2: approvalToken stored in saga state before downstream steps check it → BUILD FAILURE
  IR-109-3: Suspended saga state must survive service restart (durable, not in-memory) → BUILD FAILURE
QUALITY GATES (AF-9 Judge):
  QG-109-1: Audit entry on every approve / reject / timeout / escalation event
  QG-109-2: Timeout without response routes to escalation — never silently advances
  QG-109-3: Compensation (T107) triggered on REJECT if document in DRAFT state
```

---

## TASK TYPE: T110 — ERP Analytics Sync Step

```
ARCHETYPE: DERIVED_DATA_SYNC
ENTRY: Fires on F296:IOutboxPublisherService relay event after any document
       transitions to POSTED or CANCELLED/REVERSED state
PURPOSE: Syncs ERP events to derived analytics index (Elasticsearch) for reporting.
         Labels all analytics data explicitly as derived (non-authoritative).
         Provides reconciliation gap detection vs ERP master records.
DISTINCT FROM:
  T103 (creates documents) — T110 indexes events derived from documents
  T106 (period close) — T110 feeds analytics index; T106 seals the ledger
FACTORY DEPENDENCIES:
  F302:IERPReportingService — resolved via CreateAsync()
  F296:IOutboxPublisherService — resolved via CreateAsync()
  F301:IAuditLedgerService — resolved via CreateAsync()
FABRIC RESOLUTION:
  F302 → RAG FABRIC (Skill 00b) → Hybrid strategy (Elasticsearch analytics index)
  F296 → QUEUE FABRIC (Skill 04) → Redis Streams (outbox relay consumer)
  F301 → DATABASE FABRIC (Skill 05) → Elasticsearch (audit)
MACHINE (fixed):
  - Event-driven: triggered by outbox relay consumer — NOT polling
  - Every analytics record tagged: source="derived", erp_doc_id="{externalId}", tenantId
  - Scheduled reconciliation: F302.GetReconciliationGapsAsync vs ERP reports
  - Reconciliation gaps written as gap_event records (human review required, not auto-corrected)
IRON RULES:
  IR-110-1: Analytics index NEVER used as source for PostJournalEntryAsync (CF-107) → BUILD FAILURE
  IR-110-2: Reconciliation gaps NEVER auto-corrected — human review required → BUILD FAILURE
  IR-110-3: Analytics writes always event-driven (from outbox) — never by direct document mutation → BUILD FAILURE
QUALITY GATES (AF-9 Judge):
  QG-110-1: Every analytics record has source="derived" tag
  QG-110-2: Reconciliation gap events have audit trail entries via F301
  QG-110-3: Gap events route to human reviewer (via F293 exception saga) — never auto-closed
```

---

## FLOW TEMPLATE 20: ERP Integration Master DAG

```
FLOW: FLOW-11
TEMPLATE: 20
VERSION: 1.0.0
DESCRIPTION: ERP Systems Integration — O2C, P2P, R2R value streams
ORCHESTRATOR: IFlowOrchestrator (Skill 09)
ENTRY_EVENT: ERPFlowRequested
TENANT_SCOPED: true
```

```json
{
  "flowId": "flow-11",
  "templateId": 20,
  "version": "1.0.0",
  "description": "ERP Systems Integration — O2C, P2P, R2R value streams",
  "entryEvent": "ERPFlowRequested",
  "tenantScoped": true,
  "steps": [
    {
      "stepId": "step-route",
      "taskType": "ROUTE",
      "description": "Route to value stream sub-DAG based on flowType",
      "conditions": [
        {"if": "event.flowType == 'BOOTSTRAP'", "goto": "step-bootstrap"},
        {"if": "event.flowType == 'SYNC'",      "goto": "step-sync"},
        {"if": "event.flowType == 'O2C'",       "goto": "step-o2c-quote"},
        {"if": "event.flowType == 'P2P'",       "goto": "step-p2p-preq"},
        {"if": "event.flowType == 'R2R'",       "goto": "step-r2r-init"}
      ]
    },
    {
      "stepId": "step-bootstrap",
      "taskType": "T108",
      "description": "Multi-Tenant ERP Connection Bootstrap",
      "factories": ["F300","F292","F288","F289","F297"],
      "onSuccess": "END",
      "onFailure": "DEAD_LETTER"
    },
    {
      "stepId": "step-sync",
      "taskType": "T105",
      "description": "Incremental Master Data Sync",
      "factories": ["F288","F289","F294","F300","F303"],
      "onSuccess": "END",
      "onFailure": "RETRY:3:EXPONENTIAL"
    },
    {
      "stepId": "step-o2c-quote",
      "taskType": "T103",
      "description": "O2C — Create Quote",
      "factories": ["F288","F290","F294","F296","F301"],
      "context": {"docType": "QUOTE"},
      "onSuccess": "step-o2c-so",
      "onFailure": "step-compensate"
    },
    {
      "stepId": "step-o2c-so",
      "taskType": "T103",
      "description": "O2C — Create Sales Order",
      "factories": ["F288","F290","F294","F296","F301"],
      "context": {"docType": "SALES_ORDER"},
      "onSuccess": "step-o2c-approval",
      "onFailure": "step-compensate"
    },
    {
      "stepId": "step-o2c-approval",
      "taskType": "T109",
      "description": "O2C — Sales Order Approval Gate",
      "factories": ["F293","F292","F301","F294"],
      "freedom": {"autoApproveBelow": "${config.flow11.{tenantId}.approval_auto_threshold}"},
      "onApprove": "step-o2c-delivery",
      "onReject": "step-compensate",
      "onTimeout": "step-o2c-approval-escalate"
    },
    {
      "stepId": "step-o2c-delivery",
      "taskType": "T103",
      "description": "O2C — Create Delivery",
      "factories": ["F288","F290","F294","F296","F301"],
      "context": {"docType": "DELIVERY"},
      "onSuccess": "step-o2c-invoice",
      "onFailure": "step-compensate"
    },
    {
      "stepId": "step-o2c-invoice",
      "taskType": "T103",
      "description": "O2C — Create and Post A/R Invoice",
      "factories": ["F288","F290","F294","F296","F301"],
      "context": {"docType": "AR_INVOICE", "requiresApproval": true, "approverRole": "ar_clerk"},
      "onSuccess": "step-o2c-payment",
      "onFailure": "step-compensate"
    },
    {
      "stepId": "step-o2c-payment",
      "taskType": "T103",
      "description": "O2C — Record Incoming Payment",
      "factories": ["F288","F290","F291","F294","F296","F301"],
      "context": {"docType": "INCOMING_PAYMENT"},
      "onSuccess": "step-analytics-sync",
      "onFailure": "step-compensate"
    },
    {
      "stepId": "step-p2p-preq",
      "taskType": "T103",
      "description": "P2P — Create Purchase Requisition",
      "factories": ["F288","F290","F294","F296","F301"],
      "context": {"docType": "PURCHASE_REQUISITION"},
      "onSuccess": "step-p2p-approval",
      "onFailure": "step-compensate"
    },
    {
      "stepId": "step-p2p-approval",
      "taskType": "T109",
      "description": "P2P — Purchase Approval Gate",
      "factories": ["F293","F292","F301","F294"],
      "context": {"approverRole": "sales_ops"},
      "onApprove": "step-p2p-po",
      "onReject": "step-compensate"
    },
    {
      "stepId": "step-p2p-po",
      "taskType": "T103",
      "description": "P2P — Create Purchase Order",
      "factories": ["F288","F290","F294","F296","F301"],
      "context": {"docType": "PURCHASE_ORDER"},
      "onSuccess": "step-p2p-gr",
      "onFailure": "step-compensate"
    },
    {
      "stepId": "step-p2p-gr",
      "taskType": "T103",
      "description": "P2P — Record Goods Receipt",
      "factories": ["F288","F290","F294","F296","F301"],
      "context": {"docType": "GOODS_RECEIPT"},
      "onSuccess": "step-p2p-match",
      "onFailure": "step-compensate"
    },
    {
      "stepId": "step-p2p-match",
      "taskType": "T104",
      "description": "P2P — Three-Way Match Gate",
      "factories": ["F298","F290","F293","F301"],
      "onFullMatch": "step-p2p-invoice",
      "onVariance": "step-p2p-match-approval",
      "onMismatch": "ALERT_AND_BLOCK"
    },
    {
      "stepId": "step-p2p-match-approval",
      "taskType": "T109",
      "description": "P2P — Match Exception Approval Gate",
      "factories": ["F293","F292","F301","F294"],
      "context": {"approverRole": "finance_admin", "reason": "THREE_WAY_MATCH_VARIANCE"},
      "onApprove": "step-p2p-invoice",
      "onReject": "step-compensate"
    },
    {
      "stepId": "step-p2p-invoice",
      "taskType": "T103",
      "description": "P2P — Create and Post AP Invoice",
      "factories": ["F288","F290","F294","F296","F301"],
      "context": {"docType": "AP_INVOICE", "requiresApproval": true, "approverRole": "ap_clerk"},
      "onSuccess": "step-p2p-payment",
      "onFailure": "step-compensate"
    },
    {
      "stepId": "step-p2p-payment",
      "taskType": "T103",
      "description": "P2P — Trigger Outgoing Payment",
      "factories": ["F288","F290","F291","F294","F296","F301"],
      "context": {"docType": "OUTGOING_PAYMENT", "requiresApproval": true, "approverRole": "finance_admin"},
      "onSuccess": "step-analytics-sync",
      "onFailure": "step-compensate"
    },
    {
      "stepId": "step-r2r-init",
      "taskType": "T106",
      "description": "R2R — Period-End Close Routine",
      "factories": ["F299","F291","F293","F301","F302"],
      "onSuccess": "step-analytics-sync",
      "onFailure": "step-compensate"
    },
    {
      "stepId": "step-compensate",
      "taskType": "T107",
      "description": "Reversal/Compensation — restore consistent state",
      "factories": ["F295","F291","F290","F301","F294"],
      "onSuccess": "END_COMPENSATED",
      "onFailure": "DEAD_LETTER"
    },
    {
      "stepId": "step-analytics-sync",
      "taskType": "T110",
      "description": "Sync ERP events to derived analytics index",
      "factories": ["F302","F296","F301"],
      "onSuccess": "END",
      "onFailure": "RETRY:3:EXPONENTIAL"
    }
  ],
  "compensationPolicy": {
    "mode": "automatic",
    "order": "LIFO",
    "maxRetries": 5,
    "backoffStrategy": "EXPONENTIAL",
    "maxBackoffMinutes": 30,
    "deadLetterQueue": "flow11-compensation-dlq"
  },
  "backwardCompatibility": {
    "existingFlows": "FLOW-01 through FLOW-09 unchanged",
    "existingTaskTypes": "T1-T102 unchanged",
    "existingFactories": "F1-F287 unchanged"
  }
}
```

---

## Phase 2 Summary — FLOW-11

| Artifact | Count | Details |
|----------|-------|---------|
| Task types | 8 | T103–T110 |
| Iron rules | 44 | IR-103-1 through IR-110-3 |
| Quality gates | 28 | QG-103-1 through QG-110-3 |
| AF station cells | 88 | 11 stations × 8 task types |
| Flow template | 1 | Template 20: erp-integration-v1 |

### FIRST-TIME Capabilities (FLOW-11)

| Task | Capability | Why First |
|------|-----------|-----------|
| T103 | Idempotency + outbox co-design on document chain | First flow with financial document immutability semantics |
| T104 | Three-way match validation gate blocking AP posting | First flow with multi-document consensus validation |
| T106 | Period-end close with balance enforcement + seal | First flow with period-bound accounting workflow |
| T107 | Saga compensation via reversal-not-delete | First flow where compensation creates documents (not deletes) |
| T108 | Webhook challenge-response as blocking setup step | First flow with external system onboarding bootstrap |
| T109 | RBAC-role-aware approval gate with ERP context | First flow with separation-of-duties enforcement |

## SAVE POINT: FLOW-11:MERGE:P2 ✅
## Phase 2 COMPLETE: T103–T110, 44 IR, 28 QG, 88 AF cells, Template 20
