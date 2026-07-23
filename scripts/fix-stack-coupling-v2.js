/**
 * Converts v1 TaskTypeStackCoupling objects to v2 format across all contract files.
 * 
 * v1: { server: { tier, dimensions, neutralIronRules, stackImplementations }, supportedStacks }
 * v2: { entries: { 'node-nestjs:server': { tier, stackCategory, dimensions, neutralConcepts, implementationNotes } }, supportedServerStacks }
 */

const fs = require('fs');
const path = require('path');

const contractsDir = path.join(__dirname, '../server/src/engine-contracts');

const files = fs.readdirSync(contractsDir).filter(f => f.endsWith('-contracts.ts'));

let totalFixed = 0;

for (const file of files) {
  const filePath = path.join(contractsDir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  
  if (!content.includes('server: {') || !content.includes('neutralIronRules')) {
    continue;
  }

  // Transform each STACK_COUPLING const block
  // The pattern:
  //   const X: TaskTypeStackCoupling = {
  //     server: {
  //       tier: '...',
  //       dimensions: [...],
  //       neutralIronRules: [...],
  //       stackImplementations: { 'node-nestjs': { generationFrame: '...' } }
  //     },
  //     supportedStacks: ['node-nestjs']
  //   }
  //
  // Becomes:
  //   const X: TaskTypeStackCoupling = {
  //     entries: {
  //       'node-nestjs:server': {
  //         tier: '...',
  //         stackCategory: 'web-framework',
  //         dimensions: [...],
  //         neutralConcepts: [...],
  //         implementationNotes: '...',
  //       },
  //     },
  //     supportedServerStacks: ['node-nestjs'],
  //   }

  // Step 1: Find all TaskTypeStackCoupling object blocks and transform them
  // We use a stateful parser approach

  let newContent = content;

  // Replace: server: { → entries: {\n    'node-nestjs:server': {
  newContent = newContent.replace(/(\s*)server: \{/g, (match, indent) => {
    return `${indent}entries: {\n${indent}  'node-nestjs:server': {`;
  });

  // Replace: neutralIronRules: [ → neutralConcepts: [
  newContent = newContent.replace(/neutralIronRules:/g, 'neutralConcepts:');

  // Add stackCategory: 'web-framework' after tier line
  newContent = newContent.replace(/(tier: '(?:CONCEPT_NEUTRAL|IMPL_VARIES|STACK_COUPLED|INCOMPATIBLE)',)/g, (match) => {
    return `${match}\n      stackCategory: 'web-framework',`;
  });

  // Replace stackImplementations block with implementationNotes
  // Pattern: stackImplementations: { 'node-nestjs': { generationFrame: '...' } }
  // Need to handle multiline generationFrame values

  newContent = newContent.replace(
    /stackImplementations:\s*\{\s*'node-nestjs':\s*\{\s*generationFrame:\s*('(?:[^'\]|\.)*'|"(?:[^"\]|\.)*"),?\s*(?:additionalIronRules:\s*\[[^\]]*\],?\s*)?(?:architectureNotes:\s*'[^']*',?\s*)?\},?\s*(?:'[^']*':\s*\{[^}]*\},?\s*)*\}/g,
    (match, genFrame) => {
      return `implementationNotes: ${genFrame},`;
    }
  );

  // Replace supportedStacks: → supportedServerStacks:
  newContent = newContent.replace(/supportedStacks:/g, 'supportedServerStacks:');

  // Close the 'node-nestjs:server' entry and entries block
  // We need to add a closing `},` for the entry before `},` for the old server block
  // Actually the old server: { ... } already has its closing brace included in the stackImplementations replacement
  // We need to add the extra closing brace for the entries map

  // Find patterns like: (after implementationNotes or neutralConcepts block)
  //     }, ← close of old 'server: {'
  //   supportedServerStacks: ['node-nestjs'],
  // And replace with:
  //       }, ← close of 'node-nestjs:server' entry
  //     }, ← close of entries map
  //   supportedServerStacks: ['node-nestjs'],

  newContent = newContent.replace(
    /([ \t]+)\},\n(\s+)supportedServerStacks:/g,
    (match, indent1, indent2) => {
      return `${indent1}  },\n${indent1}},\n${indent2}supportedServerStacks:`;
    }
  );

  if (newContent !== content) {
    fs.writeFileSync(filePath, newContent, 'utf8');
    console.log(`✅ Fixed: ${file}`);
    totalFixed++;
  } else {
    console.log(`⚠️  No change: ${file}`);
  }
}

console.log(`\nTotal fixed: ${totalFixed} files`);
