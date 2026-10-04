// Generic test/tool runner: node run-tool.js <outFile> <scriptPath> [...args]
// Writes UTF-8 output (PowerShell redirection would produce UTF-16).
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const outFile = args.shift();
const r = spawnSync(process.execPath, args, {
  encoding: 'utf8',
  cwd: process.cwd(),
  maxBuffer: 64 * 1024 * 1024,
});
fs.writeFileSync(
  path.resolve(outFile),
  'EXIT=' + r.status + '\n' + (r.stdout || '') + (r.stderr || ''),
  'utf8'
);
