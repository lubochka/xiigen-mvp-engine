// server/src/engine/stack-adapters/python-async-classifier.ts
// NEW FILE — determines which Python functions must be async def.
// Any function body containing I/O calls must use async def.

const IO_PATTERNS = [
  'self.db.',
  'self.queue.',
  'self.rag.',
  'self.ai.',
  'self.secrets.',
  'self.serviceRegistry.',
  'httpx.',
  'aioredis.',
  'AsyncElasticsearch',
];

export function requiresAsync(functionBody: string): boolean {
  return IO_PATTERNS.some((pattern) => functionBody.includes(pattern));
}

export function applyAsyncClassification(pythonCode: string): string {
  // Replace 'def ' with 'async def ' for any function containing I/O calls
  return pythonCode.replace(
    /^(\s*)def (\w+)\(([^)]*)\)([^:]*):(\s*\n(?:(?!\n\S)[\s\S])*)/gm,
    (match, indent, name, params, ret, body) => {
      if (requiresAsync(body as string)) {
        return `${indent as string}async def ${name as string}(${params as string})${ret as string}:${body as string}`;
      }
      return match;
    },
  );
}
