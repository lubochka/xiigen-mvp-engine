# AGENTS.md — V17 Skill Library Reference

## Load This When
- Starting any session that involves existing XIIGen skills
- Before implementing any new service (check if a skill already exists)
- When asked about "which skill does X" or "where is the code for Y"
- When planning a new flow that might reuse existing patterns

## The Single Most Important Rule

**Never assume only C# exists.** Every skill has:
- A `SKILL.md` spec (read this first — stack-agnostic)
- `alternatives/nodejs/*.ts` — TypeScript implementation (USE FOR NESTJS)
- `alternatives/python/*.py`, `java/`, `rust/`, `php/` — other stacks

## Quick Stack Lookup

Current project stack → **Node.js / NestJS / TypeScript**

For any skill NN, the correct file is:
```
V17-skills/[NN]-[skill-name]/alternatives/nodejs/[skill-name].ts
```

Exceptions:
- Skill 26 (web flow editor) → `alternatives/react/FlowEditor.tsx`
- Skill 27 (k8s deployment) → `alternatives/k8s-helm/` or `alternatives/docker-compose/`

## Top 10 Skills Used Most Often

| Skill | What you need it for |
|-------|---------------------|
| 01 | Core interfaces: DataProcessResult, IDatabaseService, MicroserviceBase |
| 02 | ParseDocument, BuildQueryFilters (DNA-1, DNA-2) |
| 05 | Database Fabric — swap ES/Mongo/PG/Redis without code changes |
| 06 | AI Providers — Claude, OpenAI, Gemini implementations |
| 07 | AI Dispatcher — parallel multi-model dispatch |
| 08 | Flow Definition — DAG model |
| 09 | Flow Orchestrator — DAG execution |
| 11 | AI Transform — code generation step |
| 16 | AI Context Service — assemble RAG + feedback for AI calls |
| 28 | Prompt Engineering — versioned prompt templates |

## NestJS Adaptation Gotchas

1. **Remove `prefix`/`tenantId` from DB calls** — current server reads tenant from AsyncLocalStorage
2. **Add `@Injectable()` decorator** to all service classes
3. **Replace constructor injection** with `@Inject(TOKEN)` decorators
4. **Replace direct ES/Redis imports** with `IDatabaseService`/`IQueueService` fabric

## Before Implementing Anything New — Check This List

Could be covered by an existing skill? Check:
- Auth/JWT → Skill 20
- Permissions/RBAC → Skill 21
- Prompt templates → Skill 28
- Code generation → Skill 17
- Testing → Skills 29, 30, 31
- Deployment → Skill 27 (with 5 alternatives)
- RAG → Skills 00a, 00b (with 10 backend alternatives)
- Notifications → Skill 24
- Analytics → Skill 48
- Feed → Skill 46
- Chat → Skill 42
- Payments → Skill 56
