/**
 * test-af-station.ts
 *
 * Interactive AF station test harness for FLOW-01.
 * Run a single station in isolation, print the EXACT prompt sent and output received.
 *
 * Usage:
 *   npx ts-node src/scripts/test-af-station.ts <station> <taskType>
 *
 * Station IDs:
 *   AF-3   — Prompt Library (returns prompts for the task type)
 *   AF-4   — RAG Context (returns pattern matches)
 *   AF-2   — Planning (decomposes spec into steps)
 *   AF-1   — Genesis (runs AI generation — shows full prompt sent to model)
 *   AF-6   — Code Review (shows what code was reviewed)
 *   AF-7   — DNA Compliance (shows what code was validated)
 *   AF-8   — Security (shows security scan input)
 *   AF-9   — Score/Judge (shows scoring input and result)
 *
 * Examples:
 *   npx ts-node src/scripts/test-af-station.ts AF-3 T47
 *   npx ts-node src/scripts/test-af-station.ts AF-1 T48
 *   npx ts-node src/scripts/test-af-station.ts AF-7 T49
 */

import { StationInput } from '../af-stations/base';
import { PromptLibrary } from '../af-stations/af3-prompt-library';
import { RagContextStation } from '../af-stations/af4-rag-context';
import { PlanningStation } from '../af-stations/af2-planning';
import { GenesisStation } from '../af-stations/af1-genesis';
import { CodeReviewStation } from '../af-stations/af6-code-review';
import { SecurityStation } from '../af-stations/af8-security';
import { DnaPatternValidator } from '../guardrails/dna-validator';
import { OutputScorer } from '../fabrics/ai-engine/scoring';
import { DataProcessResult } from '../kernel/data-process-result';
import {
  createT47Contract,
  createT48Contract,
  createT49Contract,
} from '../engine-contracts/flow01-user-registration-contracts';
import { EngineContract } from '../engine-contracts/contract-schema';
import { IAiProvider } from '../fabrics/interfaces/ai-provider.interface';

// ── ANSI colours ────────────────────────────────────────────────────────────

const C = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
};

function h1(text: string): void {
  process.stdout.write(`\n${C.bold}${C.cyan}${'═'.repeat(60)}${C.reset}\n`);
  process.stdout.write(`${C.bold}${C.cyan}  ${text}${C.reset}\n`);
  process.stdout.write(`${C.bold}${C.cyan}${'═'.repeat(60)}${C.reset}\n`);
}

function h2(text: string): void {
  process.stdout.write(
    `\n${C.bold}${C.blue}── ${text} ${'─'.repeat(Math.max(0, 56 - text.length))}${C.reset}\n`,
  );
}

function kv(key: string, value: unknown): void {
  const val = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
  process.stdout.write(`${C.dim}${key.padEnd(20)}${C.reset} ${val}\n`);
}

function printPrompt(label: string, text: string): void {
  process.stdout.write(`\n${C.bold}${C.yellow}▶ ${label}${C.reset}\n`);
  process.stdout.write(`${C.dim}${'┄'.repeat(60)}${C.reset}\n`);
  process.stdout.write(text + '\n');
  process.stdout.write(`${C.dim}${'┄'.repeat(60)}${C.reset}\n`);
}

function printCode(label: string, code: string): void {
  process.stdout.write(`\n${C.bold}${C.green}▶ ${label}${C.reset}\n`);
  process.stdout.write(`${C.dim}${'┄'.repeat(60)}${C.reset}\n`);
  process.stdout.write(code + '\n');
  process.stdout.write(`${C.dim}${'┄'.repeat(60)}${C.reset}\n`);
}

function printOk(text: string): void {
  process.stdout.write(`${C.green}✅ ${text}${C.reset}\n`);
}

function printWarn(text: string): void {
  process.stdout.write(`${C.yellow}⚠️  ${text}${C.reset}\n`);
}

function printFail(text: string): void {
  process.stdout.write(`${C.red}❌ ${text}${C.reset}\n`);
}

// ── Stub AI provider ────────────────────────────────────────────────────────

function makeStubProvider(): IAiProvider {
  const { DataProcessResult: DPR } = require('../kernel/data-process-result');
  return {
    generate: async (prompt: string) => {
      const taskType = prompt.includes('T47') ? 'T47' : prompt.includes('T48') ? 'T48' : 'T49';
      const cfg: Record<
        string,
        { name: string; idxName: string; eventType: string; idKey: string }
      > = {
        T47: {
          name: 'UserRegistrationInitiator',
          idxName: 'registrations',
          eventType: 'user.registration.initiated',
          idKey: 'registrationId',
        },
        T48: {
          name: 'EmailVerificationWaitState',
          idxName: 'verification_tokens',
          eventType: 'email.verification.pending',
          idKey: 'tokenId',
        },
        T49: {
          name: 'OnboardingDelivery',
          idxName: 'onboarding_records',
          eventType: 'onboarding.completed',
          idKey: 'userId',
        },
      };
      const c = cfg[taskType];
      const code = `
import { Injectable, Inject } from '@nestjs/common';
import { MicroserviceBase } from '../kernel/microservice-base';
import { TenantContext } from '../kernel/tenant-context';
import { DataProcessResult } from '../kernel/data-process-result';
import { createCloudEvent } from '../kernel/cloud-events';
import { DATABASE_SERVICE, IDatabaseService } from '../fabrics/interfaces/database-service.interface';
import { QUEUE_SERVICE, IQueueService } from '../fabrics/interfaces/queue-service.interface';

/** ${c.name} — FLOW-01 AF-1 Genesis output (stub v1.1.0) */
@Injectable()
export class ${c.name} extends MicroserviceBase {
  constructor(
    @Inject(DATABASE_SERVICE) private readonly db: IDatabaseService,
    @Inject(QUEUE_SERVICE) private readonly queue: IQueueService,
  ) { super(); }

  /**
   * Execute the primary task operation.
   * @param input - Payload (Record<string, unknown> — DNA-1)
   * @returns DataProcessResult with record on success
   */
  async execute(input: Record<string, unknown>): Promise<DataProcessResult<Record<string, unknown>>> {
    const tenantCtx: TenantContext = this.getTenantContext();
    if (!tenantCtx?.tenantId) return DataProcessResult.failure('MISSING_TENANT', 'TenantContext required');
    const scopeId = tenantCtx.tenantId;

    const idempotencyKey = \`${taskType}:\${scopeId}:\${String(input['${c.idKey}'] ?? 'unknown')}\`;
    const existing = await this.db.searchDocuments('${c.idxName}', { idempotency_key: idempotencyKey, scope_id: scopeId });
    if (existing.isSuccess && Array.isArray(existing.data) && existing.data.length > 0)
      return DataProcessResult.success(existing.data[0] as Record<string, unknown>);

    const record = { ...input, idempotency_key: idempotencyKey, scope_id: scopeId, created_at: new Date().toISOString() };
    const stored = await this.db.storeDocument('${c.idxName}', record);
    if (!stored.isSuccess) return DataProcessResult.failure('STORE_FAILED', stored.errorMessage ?? 'store failed');

    const event = createCloudEvent('${c.eventType}', { ${c.idKey}: stored.data });
    await this.queue.enqueue('${taskType.toLowerCase()}-events', event);
    return DataProcessResult.success({ ...record, id: stored.data });
  }
}`.trim();
      return DPR.success({
        text: code,
        model: 'stub-claude-sonnet-4-6',
        tokens_used: { input: (prompt.length / 4) | 0, output: (code.length / 4) | 0 },
        cost: 0.0004,
      });
    },
    generateStructured: async () => {
      const { DataProcessResult: DPR2 } = require('../kernel/data-process-result');
      return DPR2.success({});
    },
    getModelInfo: () => ({ model: 'stub-claude-sonnet-4-6', provider: 'stub' }),
    isAvailable: async () => true,
  } as unknown as IAiProvider;
}

// ── Build StationInput ───────────────────────────────────────────────────────

function buildInput(contract: EngineContract): StationInput {
  return new StationInput({
    tenantId: 'station-test-tenant',
    taskType: contract.taskTypeId,
    spec: contract.toDict(),
    metadata: {
      flow_id: 'FLOW-01',
      runner: 'test-af-station',
      timestamp: new Date().toISOString(),
    },
  });
}

// ── Station runners ──────────────────────────────────────────────────────────

async function runAf3(input: StationInput): Promise<void> {
  h1(`AF-3 PROMPT LIBRARY — ${input.taskType}`);
  kv('Task type:', input.taskType);
  kv('Tenant:', input.tenantId);

  const station = new PromptLibrary();
  const start = Date.now();
  const result = await station.execute(input);
  const elapsed = Date.now() - start;

  if (!result.isSuccess) {
    printFail(`AF-3 failed: ${result.errorMessage}`);
    return;
  }

  const prompts = (result.data!.data['prompts'] as Array<Record<string, unknown>>) ?? [];
  kv('Elapsed:', `${elapsed}ms`);
  kv('Prompts returned:', prompts.length);

  for (const [i, p] of prompts.entries()) {
    printPrompt(`Prompt ${i + 1} [role=${p['role'] ?? 'unknown'}]`, String(p['content'] ?? ''));
  }
  printOk(`AF-3 done — ${prompts.length} prompts loaded`);
}

async function runAf4(input: StationInput): Promise<void> {
  h1(`AF-4 RAG CONTEXT — ${input.taskType}`);

  const station = new RagContextStation();
  const inv = null; // removed — AF pipeline now via GenericNodeExecutor

  // First run AF-3 to get prompts
  const pl = new PromptLibrary();
  const plResult = await pl.execute(input);
  if (plResult.isSuccess) {
    input.prompts = (plResult.data!.data['prompts'] as Array<Record<string, unknown>>) ?? [];
  }

  h2('INPUT to AF-4');
  kv('Task type:', input.taskType);
  kv('Spec keys:', Object.keys(input.spec).join(', '));
  kv('Prompts available:', input.prompts.length);

  const start = Date.now();
  const result = await station.execute(input);
  const elapsed = Date.now() - start;

  if (!result.isSuccess) {
    printFail(`AF-4 failed: ${result.errorMessage}`);
    return;
  }

  const patterns = (result.data!.data['patterns'] as Array<Record<string, unknown>>) ?? [];
  h2('OUTPUT from AF-4');
  kv('Elapsed:', `${elapsed}ms`);
  kv('Patterns found:', patterns.length);
  for (const [i, p] of patterns.entries()) {
    process.stdout.write(
      `  ${C.green}[${i + 1}]${C.reset} ${C.bold}${p['name'] ?? 'unknown'}${C.reset} — ${p['description'] ?? ''}\n`,
    );
    if (p['code_snippet']) {
      process.stdout.write(
        `       ${C.dim}${String(p['code_snippet']).substring(0, 120)}...${C.reset}\n`,
      );
    }
  }
  printOk(`AF-4 done — ${patterns.length} patterns retrieved`);
}

async function runAf2(input: StationInput): Promise<void> {
  h1(`AF-2 PLANNING — ${input.taskType}`);

  const station = new PlanningStation();

  h2('INPUT to AF-2');
  kv('Task type:', input.taskType);
  kv('Spec excerpt:', JSON.stringify(input.spec).substring(0, 200) + '...');

  const start = Date.now();
  const result = await station.execute(input);
  const elapsed = Date.now() - start;

  if (!result.isSuccess) {
    printFail(`AF-2 failed: ${result.errorMessage}`);
    return;
  }

  const steps = (result.data!.data['steps'] as Array<Record<string, unknown>>) ?? [];
  h2('OUTPUT from AF-2');
  kv('Elapsed:', `${elapsed}ms`);
  kv('Steps planned:', steps.length);
  for (const [i, s] of steps.entries()) {
    process.stdout.write(
      `  ${C.blue}Step ${i + 1}:${C.reset} [${s['step_id'] ?? '?'}] ${s['description'] ?? ''}\n`,
    );
    if (s['template']) process.stdout.write(`    ${C.dim}template: ${s['template']}${C.reset}\n`);
    if (s['fabric_type'])
      process.stdout.write(`    ${C.dim}fabric: ${s['fabric_type']}${C.reset}\n`);
    if (s['factory_interfaces'])
      process.stdout.write(
        `    ${C.dim}interfaces: ${JSON.stringify(s['factory_interfaces'])}${C.reset}\n`,
      );
  }
  printOk(`AF-2 done — ${steps.length} steps`);
}

async function runAf1(input: StationInput): Promise<void> {
  h1(`AF-1 GENESIS — ${input.taskType}`);

  const aiProvider = makeStubProvider();

  // Enrich input through AF-3 + AF-4 + AF-2 first
  const pl = new PromptLibrary();
  const rag = new RagContextStation();
  const planning = new PlanningStation();

  const plResult = await pl.execute(input);
  if (plResult.isSuccess)
    input.prompts = (plResult.data!.data['prompts'] as Array<Record<string, unknown>>) ?? [];

  const ragResult = await rag.execute(input);
  if (ragResult.isSuccess)
    input.ragContext = (ragResult.data!.data['patterns'] as Array<Record<string, unknown>>) ?? [];

  const planResult = await planning.execute(input);
  if (planResult.isSuccess)
    input.planSteps = (planResult.data!.data['steps'] as Array<Record<string, unknown>>) ?? [];

  h2('INPUT to AF-1');
  kv('Task type:', input.taskType);
  kv('Prompts:', input.prompts.length);
  kv('RAG patterns:', input.ragContext.length);
  kv('Plan steps:', input.planSteps.length);

  // Show the system prompt that will be sent
  const systemParts = input.prompts
    .filter((p) => p['role'] === 'system')
    .map((p) => String(p['content'] ?? ''));
  if (systemParts.length > 0) {
    printPrompt('SYSTEM PROMPT (sent to model)', systemParts.join('\n\n'));
  }

  // Show generation prompt for first step
  if (input.planSteps.length > 0) {
    const step = input.planSteps[0];
    const genPromptParts = [
      `Task type: ${input.taskType}`,
      input.spec.description ? `Description: ${input.spec.description}` : '',
      `Step: ${step['description'] ?? 'Generate code'}`,
      `Template: ${step['template'] ?? 'generic'}`,
      step['factory_interfaces']
        ? `Factory interfaces: ${JSON.stringify(step['factory_interfaces'])}`
        : '',
    ].filter(Boolean);
    const genPrompts = input.prompts
      .filter((p) => p['role'] === 'generation')
      .map((p) => String(p['content'] ?? ''));
    if (genPrompts.length > 0) genPromptParts.push(...genPrompts);
    printPrompt(`USER PROMPT (step 1: ${step['step_id'] ?? 'init'})`, genPromptParts.join('\n'));
  }

  const station = new GenesisStation(aiProvider);
  const start = Date.now();
  const result = await station.execute(input);
  const elapsed = Date.now() - start;

  if (!result.isSuccess) {
    printFail(`AF-1 failed: ${result.errorMessage}`);
    return;
  }

  const genResults =
    (result.data!.data['generation_results'] as Array<Record<string, unknown>>) ?? [];
  h2('OUTPUT from AF-1');
  kv('Elapsed:', `${elapsed}ms`);
  kv('Steps generated:', genResults.length);
  kv('Total cost:', `$${((result.data!.data['total_cost'] as number) ?? 0).toFixed(4)}`);

  for (const [i, r] of genResults.entries()) {
    const code = String(r['code'] ?? '');
    const tokens = (code.length / 4) | 0;
    process.stdout.write(
      `\n  ${C.green}Step ${i + 1} [${r['step_id'] ?? '?'}]${C.reset} ${tokens} tokens, model=${r['model'] ?? 'stub'}\n`,
    );
    printCode(`Generated code (step ${i + 1})`, code);
  }
  printOk(`AF-1 done — ${genResults.length} steps generated`);
}

async function runAf7(input: StationInput): Promise<void> {
  h1(`AF-7 DNA COMPLIANCE — ${input.taskType}`);

  // Need generated code — run through synthesis first
  const aiProvider = makeStubProvider();
  // removed — AF pipeline now via GenericNodeExecutor
  const pl = new PromptLibrary();
  const rag = new RagContextStation();
  // removed — AF pipeline now via GenericNodeExecutor
  const inv = new InventoryEngine(pl, rag);
  const syn = new SynthesisEngine({ aiProvider, inventory: inv });
  const synResult = await syn.synthesize(input);
  if (!synResult.isSuccess) {
    printFail(`Synthesis required before AF-7 — ${synResult.errorMessage}`);
    return;
  }
  const enriched = synResult.data!;

  const validator = new DnaPatternValidator();

  h2('CODE BEING VALIDATED');
  printCode('Generated code (sent to AF-7)', enriched.code);

  h2('DNA PATTERN CHECKS');
  const patterns = [
    'DNA-1 (ParseDocument — no typed models)',
    'DNA-2 (BuildQueryFilters — empty-field skipping)',
    'DNA-3 (DataProcessResult — no bare throws)',
    'DNA-4 (MicroserviceBase — service extends base)',
    'DNA-5 (ScopeIsolation — TenantContext referenced)',
    'DNA-6 (DynamicController — no entity controllers)',
    'DNA-7 (Idempotency — SETNX pattern present)',
    'DNA-8 (OutboxBeforeQueue — store before enqueue)',
    'DNA-9 (CloudEvents — envelope on all events)',
  ];

  const start = Date.now();
  const result = validator.validate(enriched.code, { isService: true });
  const elapsed = Date.now() - start;

  if (!result.isSuccess) {
    printFail(`Validator failed: ${result.errorMessage}`);
    return;
  }

  const violations = result.data!;
  const errorViolations = violations.filter((v) => v.severity === 'error');
  const warnViolations = violations.filter((v) => v.severity === 'warning');

  kv('Elapsed:', `${elapsed}ms`);
  kv('Errors:', errorViolations.length);
  kv('Warnings:', warnViolations.length);

  process.stdout.write('\n');
  for (const [i, name] of patterns.entries()) {
    const dnaId = `DNA-${i + 1}`;
    const errs = violations.filter((v) => v.patternId === dnaId && v.severity === 'error');
    const warns = violations.filter((v) => v.patternId === dnaId && v.severity === 'warning');
    if (errs.length > 0) {
      printFail(`${name}`);
      for (const e of errs) process.stdout.write(`        ${C.red}${e.message}${C.reset}\n`);
    } else if (warns.length > 0) {
      printWarn(`${name}`);
      for (const w of warns) process.stdout.write(`        ${C.yellow}${w.message}${C.reset}\n`);
    } else {
      printOk(name);
    }
  }

  const summary = validator.summarize(violations);
  process.stdout.write(
    `\n${C.bold}Result: ${summary.errors === 0 ? C.green + 'PASS' : C.red + 'FAIL'}${C.reset} — ${summary.errors} errors, ${summary.warnings} warnings\n`,
  );
}

async function runAf9(input: StationInput): Promise<void> {
  h1(`AF-9 SCORE/JUDGE — ${input.taskType}`);

  // Need generated code
  const aiProvider = makeStubProvider();
  // removed — AF pipeline now via GenericNodeExecutor
  const pl = new PromptLibrary();
  const rag = new RagContextStation();
  // removed — AF pipeline now via GenericNodeExecutor
  const inv = new InventoryEngine(pl, rag);
  const syn = new SynthesisEngine({ aiProvider, inventory: inv });
  const synResult = await syn.synthesize(input);
  if (!synResult.isSuccess) {
    printFail(`Synthesis required before AF-9 — ${synResult.errorMessage}`);
    return;
  }
  const enriched = synResult.data!;

  const scorer = new OutputScorer();

  h2('INPUT to AF-9');
  kv('Code length:', `${enriched.code.length} chars (~${(enriched.code.length / 4) | 0} tokens)`);

  const start = Date.now();
  const scoredOutputs = scorer.scoreOutputs([{ text: enriched.code, model_id: 'generated' }]);
  const elapsed = Date.now() - start;

  h2('OUTPUT from AF-9');
  kv('Elapsed:', `${elapsed}ms`);

  for (const [i, s] of scoredOutputs.entries()) {
    process.stdout.write(`\n  ${C.bold}Output ${i + 1}${C.reset}\n`);
    kv('  model_id:', s['model_id'] ?? 'unknown');
    kv('  total_score:', s['total_score'] ?? 0);
    kv('  components:', JSON.stringify(s['components'] ?? {}));
  }

  const topScore = (scoredOutputs[0]?.['total_score'] as number) ?? 0;
  const pf = topScore >= 70 ? `${C.green}PASS (≥70)${C.reset}` : `${C.red}FAIL (<70)${C.reset}`;
  process.stdout.write(`\n${C.bold}Score: ${topScore}/100 — ${pf}\n`);
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const [, , stationArg, taskArg] = process.argv;

  const station = (stationArg ?? '').toUpperCase().replace('_', '-');
  const taskType = (taskArg ?? 'T47').toUpperCase();

  if (!station) {
    process.stdout.write(`
${C.bold}USAGE:${C.reset}
  npx ts-node src/scripts/test-af-station.ts <STATION> <TASK>

${C.bold}Stations:${C.reset}
  AF-3  — Prompt Library (inputs + outputs)
  AF-4  — RAG Context (patterns retrieved)
  AF-2  — Planning (steps generated)
  AF-1  — Genesis (full prompt sent to model + generated code)
  AF-7  — DNA Compliance (code validated + per-pattern results)
  AF-9  — Score/Judge (scoring breakdown)

${C.bold}Task types:${C.reset}
  T47   — UserRegistrationInitiator
  T48   — EmailVerificationWaitState
  T49   — OnboardingDelivery

${C.bold}Examples:${C.reset}
  npx ts-node src/scripts/test-af-station.ts AF-3 T47
  npx ts-node src/scripts/test-af-station.ts AF-1 T48
  npx ts-node src/scripts/test-af-station.ts AF-7 T49
`);
    process.exit(0);
  }

  const contractMap: Record<string, () => EngineContract> = {
    T47: createT47Contract,
    T48: createT48Contract,
    T49: createT49Contract,
  };

  if (!contractMap[taskType]) {
    process.stderr.write(`Unknown task type: ${taskType}. Use T47, T48, or T49.\n`);
    process.exit(1);
  }

  const contract = contractMap[taskType]();
  const validation = contract.validate();
  if (!validation.isSuccess) {
    process.stderr.write(`Contract invalid: ${validation.errorMessage}\n`);
    process.exit(1);
  }

  const input = buildInput(contract);

  process.stdout.write(`\n${C.bold}${C.magenta}AF Station Test Harness — FLOW-01${C.reset}\n`);
  process.stdout.write(`${C.dim}Station: ${station}  Task: ${taskType}${C.reset}\n`);

  const runners: Record<string, (i: StationInput) => Promise<void>> = {
    'AF-3': runAf3,
    'AF-4': runAf4,
    'AF-2': runAf2,
    'AF-1': runAf1,
    'AF-7': runAf7,
    'AF-9': runAf9,
  };

  const runner = runners[station];
  if (!runner) {
    process.stderr.write(
      `Unknown station: ${station}. Supported: AF-3, AF-4, AF-2, AF-1, AF-7, AF-9\n`,
    );
    process.exit(1);
  }

  try {
    await runner(input);
    process.stdout.write('\n');
  } catch (err) {
    process.stderr.write(`${C.red}FATAL: ${String(err)}${C.reset}\n`);
    process.exit(1);
  }
}

main().catch((err: unknown) => {
  process.stderr.write(`FATAL: ${String(err)}\n`);
  process.exit(2);
});
