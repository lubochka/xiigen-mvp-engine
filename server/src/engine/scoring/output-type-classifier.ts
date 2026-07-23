// server/src/engine/scoring/output-type-classifier.ts
// NEW FILE — classify output type for rubric selection (CN-04 DNA sweep).
// Prevents Python DPO corpus contamination (TypeScript criteria applied to Python output).

export type OutputCategory =
  | 'typescript-code'
  | 'python-code'
  | 'vue-component'
  | 'document'
  | 'json-config';

export function classifyOutput(outputType: string, targetStack: string): OutputCategory {
  const docTypes = ['DESIGN_BRIEF', 'ARCH_DOC', 'SESSION_FILE', 'PHASE_PLAN', 'KNOWLEDGE_DOC'];
  const configTypes = ['TOKEN_FILE', 'STYLE_GUIDE', 'WHATSAPP_MSG', 'JSON_CONFIG'];

  if (docTypes.includes(outputType)) return 'document';
  if (configTypes.includes(outputType)) return 'json-config';
  if (targetStack === 'FastAPI' || targetStack === 'Flask' || targetStack === 'Django')
    return 'python-code';
  if (targetStack === 'Vue3' || targetStack === 'Angular') return 'vue-component';
  return 'typescript-code'; // default: NestJS, React, Express
}
