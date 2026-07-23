const fs = require('fs');
const path = require('path');

const servicesDir = path.resolve(__dirname, 'src/engine/flows/bfa-conflict-arbitration');

function readService(filename) {
  return fs.readFileSync(path.join(servicesDir, filename), 'utf-8');
}

function stripComments(content) {
  return content
    .split('\n')
    .filter((line) => !line.trim().startsWith('*') && !line.trim().startsWith('//'))
    .join('\n');
}

const src = readService('human-resolution-capture.service.ts');
console.log('Raw contains resolution:', src.includes('resolution'));
console.log('Raw contains Resolution:', src.includes('Resolution'));

const stripped = stripComments(src);
console.log('Stripped contains resolution:', stripped.includes('resolution'));
console.log('Stripped contains Resolution:', stripped.includes('Resolution'));
