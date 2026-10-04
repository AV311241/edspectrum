const fs = require('fs');
const path = require('path');
const base = path.join(__dirname, 'node_modules', '.pnpm');
const pkg = fs.readdirSync(base).find((d) => d.startsWith('@prisma+client@'));
const lib = path.join(base, pkg, 'node_modules', '@prisma', 'client', 'runtime', 'library.d.ts');
console.log('lib:', lib, fs.existsSync(lib));
const s = fs.readFileSync(lib, 'utf8');
for (const term of ['$allOperations', 'type QueryOptions', 'query?:', 'export type QueryComponent']) {
  const i = s.indexOf(term);
  console.log('\n=== ' + term + ' @ ' + i + ' ===');
  if (i >= 0) console.log(s.slice(Math.max(0, i - 800), i + 700));
}
