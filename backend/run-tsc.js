const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const tsc = path.join(__dirname, 'node_modules', 'typescript', 'bin', 'tsc');
const started = Date.now();
const r = spawnSync(process.execPath, [tsc, '--noEmit', '--pretty', 'false'], {
  encoding: 'utf8',
  cwd: __dirname,
  maxBuffer: 64 * 1024 * 1024,
});
const out = 'EXIT=' + r.status + ' MS=' + (Date.now() - started) + '\n' + (r.stdout || '') + (r.stderr || '');
fs.writeFileSync(path.join(__dirname, 'tsc-utf8.txt'), out, 'utf8');
console.log('exit=' + r.status + ' len=' + out.length + ' ms=' + (Date.now() - started));
