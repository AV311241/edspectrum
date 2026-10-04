const { PrismaClient } = require('@prisma/client');
const out = [];
try {
  const p = new PrismaClient({ datasources: { db: { url: 'mysql://user:pass@localhost:3306/db' } } });
  out.push('typeof $use: ' + typeof p.$use);
  out.push('typeof $extends: ' + typeof p.$extends);
  out.push('typeof $transaction: ' + typeof p.$transaction);
  out.push('student createManyAndReturn: ' + typeof p.student.createManyAndReturn);
  out.push('student createMany: ' + typeof p.student.createMany);
  p.$disconnect().catch(() => {});
} catch (e) {
  out.push('constructor error: ' + e.message);
}
require('fs').writeFileSync('prisma-check.txt', out.join('\n'), 'utf8');





