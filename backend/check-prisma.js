const fs = require('fs');
const pkg = require('./package.json');
console.log('@prisma/client:', (pkg.dependencies && pkg.dependencies['@prisma/client']) || (pkg.devDependencies && pkg.devDependencies['@prisma/client']));
const p = 'node_modules/.prisma/client/index.d.ts';
if (fs.existsSync(p)) {
  const t = fs.readFileSync(p, 'utf8');
  const i = t.indexOf('$use');
  console.log('$use idx:', i);
  if (i >= 0) console.log(t.slice(Math.max(0, i - 300), i + 300));
} else {
  console.log('no generated client at', p);
}
