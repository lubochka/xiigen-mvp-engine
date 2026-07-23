/**
 * SkillFaithfulMockProvider — QA tests verifying skill output contracts.
 *
 * Test coverage:
 *   1-3.  Judge calls: each of 3 model instances returns its fixed score
 *   4.    Score spread ≥ 1.0 between gemini and openai instances (SK-452)
 *   5.    chosen.model ≠ rejected.model (V9-002): gemini score > openai score
 *   6.    SK-520 compliance: planner steps contain no technology names
 *   7.    SK-520 compliance: each step has intClause field
 *   8.    SK-520 compliance: dependency chain declared
 *   9.    SK-521 compliance: LEAF verdict cites at least one signal as not-triggered
 *   10.   SK-521 compliance: EXPAND verdict includes ≥ 2 sub-nodes
 *   11.   NODE spec response: returns well-formed NODE spec JSON
 *   12.   getModelInfo: returns provider='skill-faithful-mock'
 */

import { SkillFaithfulMockProvider } from './skill-faithful-mock.provider';

const PLANNER_SYSTEM =
  'You are an expert abstract flow planner for the XIIGen engine.\nYou produce technology-neutral implementation plans — never mention specific frameworks, databases, libraries, or languages.';
const REVIEWER_SYSTEM = 'You are a rigorous plan reviewer for the XIIGen engine.';
const DEPTH_SYSTEM =
  'You are the Depth Decider for the XIIGen engine.\n' +
  'Evaluate a verified NODE and decide whether it is a LEAF or EXPAND.\n' +
  '5 Complexity Signals (S1-S5):';

const JUDGE_PROMPT_TEMPLATE = (output: string) =>
  `You are evaluating a NODE specification you just produced.\nScore it 0–10 on four criteria:\n...\n\nOUTPUT TO EVALUATE:\n${output}\n\nRespond with a single JSON object and nothing else: { "score": <number 0-10>, "reasoning": "<one sentence>" }`;

const TECH_NAMES = [
  'nestjs',
  'express',
  'typeorm',
  'prisma',
  'sequelize',
  'redis',
  'elasticsearch',
  'postgres',
  'mysql',
  'mongodb',
  'kafka',
  'rabbitmq',
  'bull',
  'react',
  'vue',
  'angular',
  'graphql',
  'grpc',
  'typescript',
  'javascript',
  'python',
  'java',
  'go',
  'rust',
];

describe('SkillFaithfulMockProvider', () => {
  // ── Instances ─────────────────────────────────────────────────────────────
  const gemini = new SkillFaithfulMockProvider('mock-gemini');
  const openai = new SkillFaithfulMockProvider('mock-openai');
  const claude = new SkillFaithfulMockProvider('mock-claude');
  const generic = new SkillFaithfulMockProvider();

  // ── 1-3: Judge call — per-model scores ───────────────────────────────────

  it('judge call: mock-gemini returns score 7.4', async () => {
    const result = await gemini.generate(JUDGE_PROMPT_TEMPLATE('some node output'));
    expect(result.isSuccess).toBe(true);
    const parsed = JSON.parse(String(result.data!['text']));
    expect(parsed.score).toBe(7.4);
  });

  it('judge call: mock-openai returns score 6.0', async () => {
    const result = await openai.generate(JUDGE_PROMPT_TEMPLATE('some node output'));
    expect(result.isSuccess).toBe(true);
    const parsed = JSON.parse(String(result.data!['text']));
    expect(parsed.score).toBe(6.0);
  });

  it('judge call: mock-claude returns score 6.2', async () => {
    const result = await claude.generate(JUDGE_PROMPT_TEMPLATE('some node output'));
    expect(result.isSuccess).toBe(true);
    const parsed = JSON.parse(String(result.data!['text']));
    expect(parsed.score).toBe(6.2);
  });

  // ── 4: Score spread ≥ 1.0 (SK-452) ──────────────────────────────────────

  it('score spread ≥ 1.0 between gemini and openai instances (SK-452)', async () => {
    const [geminiRes, openaiRes] = await Promise.all([
      gemini.generate(JUDGE_PROMPT_TEMPLATE('node output')),
      openai.generate(JUDGE_PROMPT_TEMPLATE('node output')),
    ]);
    const geminiScore = JSON.parse(String(geminiRes.data!['text'])).score as number;
    const openaiScore = JSON.parse(String(openaiRes.data!['text'])).score as number;
    expect(Math.abs(geminiScore - openaiScore)).toBeGreaterThanOrEqual(1.0);
  });

  // ── 5: chosen.model ≠ rejected.model (V9-002) ────────────────────────────

  it('gemini score > openai score → gemini chosen, openai rejected — different models (V9-002)', async () => {
    const [geminiRes, openaiRes] = await Promise.all([
      gemini.generate(JUDGE_PROMPT_TEMPLATE('n')),
      openai.generate(JUDGE_PROMPT_TEMPLATE('n')),
    ]);
    const geminiScore = JSON.parse(String(geminiRes.data!['text'])).score as number;
    const openaiScore = JSON.parse(String(openaiRes.data!['text'])).score as number;
    const chosenModel = 'mock-gemini';
    const rejectedModel = 'mock-openai';
    expect(geminiScore).toBeGreaterThan(openaiScore);
    expect(chosenModel).not.toBe(rejectedModel);
  });

  // ── 6: SK-520 — no technology names in planner step text ─────────────────

  it('SK-520: planner steps contain no technology names', async () => {
    const result = await gemini.generate('Build a user registration flow', {
      systemPrompt: PLANNER_SYSTEM,
    });
    expect(result.isSuccess).toBe(true);
    const parsed = JSON.parse(String(result.data!['text']));
    const allStepText = (parsed.steps as Array<{ text: string }>)
      .map((s) => s.text.toLowerCase())
      .join(' ');
    for (const tech of TECH_NAMES) {
      expect(allStepText).not.toContain(tech);
    }
  });

  // ── 7: SK-520 — each step has intClause ──────────────────────────────────

  it('SK-520: each planner step has a non-empty intClause', async () => {
    const result = await gemini.generate('Register a user', { systemPrompt: PLANNER_SYSTEM });
    expect(result.isSuccess).toBe(true);
    const parsed = JSON.parse(String(result.data!['text']));
    const steps = parsed.steps as Array<{ intClause?: string }>;
    expect(steps.length).toBeGreaterThanOrEqual(1);
    for (const step of steps) {
      expect(typeof step.intClause).toBe('string');
      expect(step.intClause!.length).toBeGreaterThan(0);
    }
  });

  // ── 8: SK-520 — dependency chain declared ────────────────────────────────

  it('SK-520: planner steps declare dependencies array', async () => {
    const result = await gemini.generate('Register a user', { systemPrompt: PLANNER_SYSTEM });
    expect(result.isSuccess).toBe(true);
    const parsed = JSON.parse(String(result.data!['text']));
    const steps = parsed.steps as Array<{ index: number; dependencies: number[] }>;
    expect(steps[0]!.dependencies).toEqual([]); // first step has no deps
    expect(steps[1]!.dependencies).toContain(steps[0]!.index); // second depends on first
  });

  // ── 9: SK-521 — LEAF cites signal as not-triggered ───────────────────────

  it('SK-521: LEAF verdict cites at least one signal as not-triggered', async () => {
    const prompt = 'Validate the submitted credential against the identity store';
    const result = await gemini.generate(prompt, { systemPrompt: DEPTH_SYSTEM });
    expect(result.isSuccess).toBe(true);
    const parsed = JSON.parse(String(result.data!['text']));
    expect(parsed.verdict).toBe('LEAF');
    expect(String(parsed.justification)).toMatch(/not triggered/i);
  });

  // ── 10: SK-521 — EXPAND includes ≥ 2 sub-nodes ──────────────────────────

  it('SK-521: EXPAND verdict includes ≥ 2 sub-nodes', async () => {
    // "and" appears > 1 time → triggers multi-responsibility detection
    const prompt = 'Validate credential and route to the store and emit confirmation';
    const result = await gemini.generate(prompt, { systemPrompt: DEPTH_SYSTEM });
    expect(result.isSuccess).toBe(true);
    const parsed = JSON.parse(String(result.data!['text']));
    expect(parsed.verdict).toBe('EXPAND');
    expect(Array.isArray(parsed.subNodes)).toBe(true);
    expect((parsed.subNodes as unknown[]).length).toBeGreaterThanOrEqual(2);
  });

  // ── 11: Default — NODE spec response ─────────────────────────────────────

  it('default generate() returns well-formed NODE spec JSON', async () => {
    const result = await generic.generate('Generate a node for credential capture');
    expect(result.isSuccess).toBe(true);
    const text = String(result.data!['text']);
    const parsed = JSON.parse(text);
    expect(parsed).toHaveProperty('intent');
    expect(parsed).toHaveProperty('contracts');
    expect(parsed).toHaveProperty('constraints');
    expect(Array.isArray(parsed.constraints)).toBe(true);
    expect((parsed.constraints as unknown[]).length).toBeGreaterThan(0);
  });

  // ── 12: getModelInfo ─────────────────────────────────────────────────────

  it('getModelInfo returns provider=skill-faithful-mock', () => {
    const info = gemini.getModelInfo();
    expect(info['provider']).toBe('skill-faithful-mock');
    expect(info['model_id']).toBe('mock-gemini');
    expect((info['capabilities'] as Record<string, unknown>)['skill_faithful']).toBe(true);
  });
});
